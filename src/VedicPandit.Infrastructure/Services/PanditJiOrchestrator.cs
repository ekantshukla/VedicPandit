using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using VedicPandit.Core.Dtos;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;
using VedicPandit.Infrastructure.AI;

namespace VedicPandit.Infrastructure.Services;

/// <summary>Keeps the last few turns of each conversation in memory (text only) for multi-turn context.</summary>
public sealed class ConversationStore
{
    private readonly ConcurrentDictionary<string, List<(string Role, string Text)>> _turns = new();
    private const int MaxTurns = 12;

    public IReadOnlyList<(string Role, string Text)> Get(string session) =>
        _turns.TryGetValue(session, out var l) ? l.ToList() : new List<(string, string)>();

    public void Add(string session, string role, string text)
    {
        var list = _turns.GetOrAdd(session, _ => new List<(string, string)>());
        lock (list)
        {
            list.Add((role, text));
            if (list.Count > MaxTurns) list.RemoveRange(0, list.Count - MaxTurns);
        }
    }
}

/// <summary>
/// PanditJi core orchestrator. Claude decides which tools to call (panchang, muhurat, mantra, scripture search);
/// tools run locally against the astronomical engine and the verse library, results are fed back, and the
/// final answer streams token by token. Structured "cards" are emitted alongside so the UI can render rich views.
/// </summary>
public sealed class PanditJiOrchestrator : IPanditJiOrchestrator
{
    private const int MaxToolRounds = 4;
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly IClaudeClient _claude;
    private readonly IPanchangEngine _panchang;
    private readonly IMuhuratEngine _muhurat;
    private readonly IScriptureRetriever _scriptures;
    private readonly IContentStore _content;
    private readonly IChatLog _chatLog;
    private readonly ConversationStore _store;
    private readonly ILogger<PanditJiOrchestrator> _log;

    public PanditJiOrchestrator(IClaudeClient claude, IPanchangEngine panchang, IMuhuratEngine muhurat,
        IScriptureRetriever scriptures, IContentStore content, IChatLog chatLog, ConversationStore store, ILogger<PanditJiOrchestrator> log)
    {
        _claude = claude; _panchang = panchang; _muhurat = muhurat; _scriptures = scriptures; _content = content; _chatLog = chatLog; _store = store; _log = log;
    }

    public async IAsyncEnumerable<BotEvent> AskAsync(BotRequest req, [EnumeratorCancellation] CancellationToken ct = default)
    {
        var text = (req.Text ?? string.Empty).Trim();
        if (text.Length == 0) { yield return new BotError("Empty question"); yield break; }
        if (text.Length > 2000) text = text[..2000];

        var tz = Panchang.PanchangEngine.ResolveTimeZone(req.TimeZone);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, tz).DateTime);

        if (!_claude.IsConfigured)
        {
            await foreach (var e in OfflineAnswerAsync(req, text, today, ct)) yield return e;
            yield break;
        }

        // Build message history
        var messages = new JsonArray();
        foreach (var (role, t) in _store.Get(req.SessionId))
            messages.Add(new JsonObject { ["role"] = role, ["content"] = t });
        messages.Add(new JsonObject { ["role"] = "user", ["content"] = text });

        var system = PromptLibrary.System(req.Language, today, req.TimeZone);
        var tools = PromptLibrary.Tools(_muhurat.SupportedEvents.Select(e => e.Event.ToString()));
        var full = new StringBuilder();

        for (int round = 0; round <= MaxToolRounds; round++)
        {
            var roundText = new StringBuilder();
            var toolUses = new List<ClaudeToolUse>();
            string? stop = null;

            var stream = _claude.StreamAsync(system, messages, round < MaxToolRounds ? tools : null, ct);
            await using var e = stream.GetAsyncEnumerator(ct);
            while (true)
            {
                ClaudeStreamEvent? ev;
                string? error = null;
                try { ev = await e.MoveNextAsync() ? e.Current : null; }
                catch (Exception ex) { _log.LogError(ex, "Claude stream failed"); ev = null; error = "PanditJi is temporarily unavailable. Please try again."; }
                if (error != null) { yield return new BotError(error); yield break; }
                if (ev is null) break;

                switch (ev)
                {
                    case ClaudeText t: roundText.Append(t.Text); full.Append(t.Text); yield return new BotTextDelta(t.Text); break;
                    case ClaudeToolUse tu: toolUses.Add(tu); break;
                    case ClaudeStop s: stop = s.StopReason; break;
                }
            }

            if (stop != "tool_use" || toolUses.Count == 0) break;

            // Echo the assistant turn (text + tool_use blocks), then append tool results.
            var assistantContent = new JsonArray();
            if (roundText.Length > 0) assistantContent.Add(new JsonObject { ["type"] = "text", ["text"] = roundText.ToString() });
            foreach (var tu in toolUses)
                assistantContent.Add(new JsonObject { ["type"] = "tool_use", ["id"] = tu.Id, ["name"] = tu.Name, ["input"] = tu.Input.DeepClone() });
            messages.Add(new JsonObject { ["role"] = "assistant", ["content"] = assistantContent });

            var results = new JsonArray();
            foreach (var tu in toolUses)
            {
                yield return new BotToolStatus(tu.Name, "running");
                var (resultText, card, isError) = await RunToolAsync(tu, req, today, ct);
                if (card != null) yield return card;
                results.Add(new JsonObject
                {
                    ["type"] = "tool_result",
                    ["tool_use_id"] = tu.Id,
                    ["content"] = resultText,
                    ["is_error"] = isError
                });
            }
            messages.Add(new JsonObject { ["role"] = "user", ["content"] = results });
            if (full.Length > 0) { full.Append("\n\n"); yield return new BotTextDelta("\n\n"); }
        }

        var answer = full.ToString().Trim();
        _store.Add(req.SessionId, "user", text);
        _store.Add(req.SessionId, "assistant", answer);
        await PersistAsync(req, text, answer, ct);
        yield return new BotDone(answer);
    }

    private async Task<(string Result, BotCard? Card, bool IsError)> RunToolAsync(ClaudeToolUse tu, BotRequest req, DateOnly today, CancellationToken ct)
    {
        try
        {
            switch (tu.Name)
            {
                case "get_panchang":
                {
                    var date = ParseDate(tu.Input["date"]?.GetValue<string>()) ?? today;
                    var ms = tu.Input["month_system"]?.GetValue<string>() == "amanta" ? MonthSystem.Amanta : MonthSystem.Purnimanta;
                    var p = _panchang.Compute(date, req.Latitude, req.Longitude, req.TimeZone, new PanchangOptions(ms));
                    return (p.ToContextString(), new BotCard("panchang", p), false);
                }
                case "find_muhurat":
                {
                    if (!Enum.TryParse<MuhuratEvent>(tu.Input["event"]?.GetValue<string>(), true, out var evt))
                        return ("Unknown event type", null, true);
                    var from = ParseDate(tu.Input["from_date"]?.GetValue<string>()) ?? today;
                    var to = ParseDate(tu.Input["to_date"]?.GetValue<string>()) ?? from.AddDays(60);
                    var r = _muhurat.Find(evt, from, to, req.Latitude, req.Longitude, req.TimeZone, 12);
                    var summary = new StringBuilder($"{r.EventName} muhurats {r.From:yyyy-MM-dd} to {r.To:yyyy-MM-dd}:\n");
                    foreach (var w in r.Windows)
                        summary.AppendLine($"- {w.Date:ddd dd MMM yyyy} {w.Start:HH:mm}-{w.End:HH:mm} | {w.Tithi}, {w.Nakshatra}, {w.Yoga} yoga | score {w.Score} | {string.Join("; ", w.Reasons)}");
                    if (r.Windows.Count == 0) summary.AppendLine("No windows found in this range.");
                    if (r.Notes.Count > 0) summary.AppendLine("Notes: " + string.Join("; ", r.Notes));
                    summary.AppendLine(r.Disclaimer);
                    return (summary.ToString(), new BotCard("muhurat", r), false);
                }
                case "get_mantra":
                {
                    var q = tu.Input["query"]?.GetValue<string>() ?? "";
                    var m = await FindMantraAsync(q, ct);
                    if (m is null) return ($"No mantra matching '{q}' in the library.", null, false);
                    var info = $"{m.Name} ({m.Source})\n{m.Sanskrit}\nMeaning: {m.MeaningEn}\nHindi: {m.MeaningHi}\nPronunciation tips: {m.PronunciationTips}\nRecommended repetitions: {m.RecommendedRepetitions}";
                    return (info, new BotCard("mantra", m), false);
                }
                case "search_scriptures":
                {
                    var q = tu.Input["query"]?.GetValue<string>() ?? "";
                    var code = tu.Input["scripture"]?.GetValue<string>();
                    var hits = await _scriptures.SearchAsync(q, code, 5, ct);
                    if (hits.Count == 0) return ("No matching verses in the library.", null, false);
                    var sb = new StringBuilder();
                    foreach (var h in hits)
                        sb.AppendLine($"[{h.Verse.Citation}]\n{h.Verse.Sanskrit}\nEN: {h.Verse.TranslationEn}\nHI: {h.Verse.TranslationHi}\n");
                    var card = hits.Select(h => new
                    {
                        citation = h.Verse.Citation,
                        scripture = h.Verse.Scripture?.Code,
                        h.Verse.Chapter, h.Verse.Verse, h.Verse.Sanskrit, h.Verse.TranslationEn, h.Verse.TranslationHi
                    }).ToList();
                    return (sb.ToString(), new BotCard("verses", card), false);
                }
                default:
                    return ($"Unknown tool {tu.Name}", null, true);
            }
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Tool {Tool} failed", tu.Name);
            return ($"Tool failed: {ex.Message}", null, true);
        }
    }

    private async Task<Mantra?> FindMantraAsync(string q, CancellationToken ct)
    {
        await Task.CompletedTask;
        var all = _content.Mantras;
        var terms = q.ToLowerInvariant().Split(new[] { ' ', ',', '-' }, StringSplitOptions.RemoveEmptyEntries);
        return all
            .Select(m => new
            {
                m,
                score = terms.Sum(t =>
                    (m.Slug.Contains(t) ? 5 : 0) + (m.Name.ToLowerInvariant().Contains(t) ? 4 : 0) +
                    (m.NameHi.Contains(t) ? 4 : 0) + (m.Deity.ToLowerInvariant().Contains(t) ? 2 : 0) +
                    (m.Tags.Contains(t) ? 2 : 0) + (m.Sanskrit.Contains(t) ? 3 : 0))
            })
            .Where(x => x.score > 0)
            .OrderByDescending(x => x.score)
            .Select(x => x.m)
            .FirstOrDefault();
    }

    private static DateOnly? ParseDate(string? s) => DateOnly.TryParse(s, out var d) ? d : null;

    private async Task PersistAsync(BotRequest req, string q, string a, CancellationToken ct)
    {
        await _chatLog.AppendAsync(new ChatTurn { SessionId = req.SessionId, Role = "user", Content = q, Language = req.Language }, ct);
        await _chatLog.AppendAsync(new ChatTurn { SessionId = req.SessionId, Role = "assistant", Content = a, Language = req.Language }, ct);
    }

    /// <summary>Rule-based answers so the site is usable before a Claude API key is configured.</summary>
    private async IAsyncEnumerable<BotEvent> OfflineAnswerAsync(BotRequest req, string text, DateOnly today, [EnumeratorCancellation] CancellationToken ct)
    {
        var t = text.ToLowerInvariant();
        bool hi = req.Language is "hi" or "mr";
        string answer;

        if (ContainsAny(t, "panchang", "tithi", "rahu", "पंचांग", "तिथि", "राहु", "nakshatra", "नक्षत्र", "choghadiya", "चौघड़िया"))
        {
            var date = t.Contains("kal") || t.Contains("कल") || t.Contains("tomorrow") ? today.AddDays(1) : today;
            var p = _panchang.Compute(date, req.Latitude, req.Longitude, req.TimeZone);
            yield return new BotCard("panchang", p);
            answer = hi
                ? $"{date:dd MMM yyyy} को {p.Tithis[0].NameSanskrit} तिथि है ({p.Tithis[0].Ends:HH:mm} तक), नक्षत्र {p.Nakshatras[0].NameSanskrit}। राहु काल {p.RahuKaal?.Start:HH:mm} से {p.RahuKaal?.End:HH:mm} तक है।"
                : $"On {date:dd MMM yyyy} the tithi is {p.Tithis[0].Name} (until {p.Tithis[0].Ends:HH:mm}) and the nakshatra is {p.Nakshatras[0].Name}. Rahu Kaal is {p.RahuKaal?.Start:HH:mm}-{p.RahuKaal?.End:HH:mm}.";
        }
        else if (ContainsAny(t, "muhurat", "मुहूर्त", "shubh", "शुभ"))
        {
            var evt = ContainsAny(t, "vivah", "shaadi", "शादी", "विवाह", "marriage") ? MuhuratEvent.Vivah
                : ContainsAny(t, "griha", "गृह", "house") ? MuhuratEvent.GrihaPravesh
                : ContainsAny(t, "vahan", "car", "bike", "गाड़ी", "वाहन") ? MuhuratEvent.VahanKharid
                : MuhuratEvent.VyaparAarambh;
            var r = _muhurat.Find(evt, today, today.AddDays(60), req.Latitude, req.Longitude, req.TimeZone, 8);
            yield return new BotCard("muhurat", r);
            answer = hi ? $"अगले 60 दिनों में {r.EventName} के लिए {r.Windows.Count} शुभ समय मिले। विवरण नीचे देखें।"
                        : $"I found {r.Windows.Count} auspicious windows for {r.EventName} in the next 60 days. See the details below.";
        }
        else if (ContainsAny(t, "mantra", "मंत्र", "jaap", "जाप", "uchcharan", "उच्चारण"))
        {
            var m = await FindMantraAsync(text, ct) ?? _content.Mantras.FirstOrDefault();
            if (m != null) yield return new BotCard("mantra", m);
            answer = m is null ? "Mantra library is empty." : (hi ? $"यह रहा {m.NameHi}। नीचे के प्लेयर से साथ-साथ जप करें।" : $"Here is the {m.Name}. Chant along with the player below.");
        }
        else
        {
            var hits = await _scriptures.SearchAsync(text, null, 3, ct);
            if (hits.Count > 0)
            {
                yield return new BotCard("verses", hits.Select(h => new
                {
                    citation = h.Verse.Citation, scripture = h.Verse.Scripture?.Code, h.Verse.Chapter, h.Verse.Verse,
                    h.Verse.Sanskrit, h.Verse.TranslationEn, h.Verse.TranslationHi
                }).ToList());
                var v = hits[0].Verse;
                answer = hi ? $"{v.Citation} में कहा गया है: {v.TranslationHi}" : $"{v.Citation} says: {v.TranslationEn}";
            }
            else answer = hi ? "क्षमा करें, इस प्रश्न के लिए अभी कोई श्लोक नहीं मिला।" : "Sorry, I couldn't find a matching verse yet.";
        }

        answer += hi ? "\n\n(ऑफ़लाइन मोड: पूर्ण उत्तरों के लिए Claude API कुंजी जोड़ें।)" : "\n\n(Offline mode: add a Claude API key for full conversational answers.)";
        yield return new BotTextDelta(answer);
        yield return new BotDone(answer);
    }

    private static bool ContainsAny(string s, params string[] words) => words.Any(s.Contains);
}
