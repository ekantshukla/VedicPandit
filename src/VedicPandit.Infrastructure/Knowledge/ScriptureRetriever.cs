using System.Globalization;
using System.Text.RegularExpressions;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;

namespace VedicPandit.Infrastructure.Knowledge;

/// <summary>
/// In-memory BM25 retriever over scripture verses (English + Hindi translations, keywords, Sanskrit).
/// Also resolves direct references such as "Gita 2.47" or "गीता 2/47".
/// Swap for a vector store (pgvector, Azure AI Search, Qdrant) behind the same interface when the corpus grows.
/// </summary>
public sealed partial class ScriptureRetriever : IScriptureRetriever
{
    private readonly IContentStore _content;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private List<Doc> _docs = new();
    private Dictionary<string, int> _df = new();
    private double _avgLen;
    private volatile bool _built;

    private const double K1 = 1.4, B = 0.75;

    private static readonly HashSet<string> Stop = new(StringComparer.OrdinalIgnoreCase)
    {
        "the","a","an","of","to","and","or","in","on","is","are","was","what","why","how","does","do","say","says","about","me","my","i","you",
        "your","for","with","it","this","that","be","as","by","at","from","tell","explain","please","which","who","can","should",
        "का","की","के","है","हैं","में","से","को","क्या","कैसे","क्यों","और","या","पर","यह","वह","ने","भी","तो","बताइए","बताओ","बारे"
    };

    public ScriptureRetriever(IContentStore content)
    {
        _content = content;
        _content.Changed += () => _built = false;
    }

    private sealed record Doc(ScriptureVerse Verse, Dictionary<string, int> Tf, int Length);

    public async Task RebuildAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            var verses = _content.AllVerses.ToList();
            await Task.Yield();

            var docs = new List<Doc>();
            var df = new Dictionary<string, int>();
            foreach (var v in verses)
            {
                var tokens = new List<string>();
                tokens.AddRange(Tokenize(v.TranslationEn));
                tokens.AddRange(Tokenize(v.TranslationHi));
                var kw = Tokenize(v.Keywords).ToList();
                tokens.AddRange(kw); tokens.AddRange(kw); // keywords weighted x2
                tokens.AddRange(Tokenize(v.Sanskrit));
                tokens.AddRange(Tokenize(v.Scripture?.Name ?? ""));

                var tf = tokens.GroupBy(t => t).ToDictionary(g => g.Key, g => g.Count());
                foreach (var term in tf.Keys) df[term] = df.TryGetValue(term, out var c) ? c + 1 : 1;
                docs.Add(new Doc(v, tf, tokens.Count));
            }
            _docs = docs;
            _df = df;
            _avgLen = docs.Count == 0 ? 1 : docs.Average(d => d.Length);
            _built = true;
        }
        finally { _lock.Release(); }
    }

    public async Task<IReadOnlyList<VerseHit>> SearchAsync(string query, string? scriptureCode = null, int topK = 6, CancellationToken ct = default)
    {
        if (!_built) await RebuildAsync(ct);
        var docs = _docs;
        if (!string.IsNullOrWhiteSpace(scriptureCode))
            docs = docs.Where(d => string.Equals(d.Verse.Scripture?.Code, scriptureCode, StringComparison.OrdinalIgnoreCase)).ToList();

        // 1) Direct reference: "gita 2.47", "गीता 2/47", "chapter 2 verse 47"
        var m = RefRegex().Match(query);
        if (m.Success)
        {
            int ch = int.Parse(m.Groups["c"].Value);
            string vs = m.Groups["v"].Value;
            var direct = docs.Where(d => d.Verse.Chapter == ch && d.Verse.Verse == vs).ToList();
            if (direct.Count > 0) return direct.Select(d => new VerseHit(d.Verse, 100)).ToList();
        }

        // 2) BM25
        var qTerms = Tokenize(query).Distinct().ToList();
        if (qTerms.Count == 0) return Array.Empty<VerseHit>();
        int n = Math.Max(1, _docs.Count);
        var scored = new List<VerseHit>();
        foreach (var d in docs)
        {
            double score = 0;
            foreach (var q in qTerms)
            {
                if (!d.Tf.TryGetValue(q, out int f)) continue;
                int dfq = _df.TryGetValue(q, out var x) ? x : 0;
                double idf = Math.Log(1 + (n - dfq + 0.5) / (dfq + 0.5));
                score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * d.Length / _avgLen));
            }
            if (score > 0) scored.Add(new VerseHit(d.Verse, Math.Round(score, 3)));
        }
        return scored.OrderByDescending(h => h.Score).Take(topK).ToList();
    }

    public static IEnumerable<string> Tokenize(string text)
    {
        if (string.IsNullOrEmpty(text)) yield break;
        var sb = new System.Text.StringBuilder();
        foreach (char ch in text.ToLowerInvariant())
        {
            var cat = CharUnicodeInfo.GetUnicodeCategory(ch);
            bool keep = char.IsLetterOrDigit(ch) || cat == UnicodeCategory.NonSpacingMark || cat == UnicodeCategory.SpacingCombiningMark;
            if (keep) sb.Append(ch);
            else if (sb.Length > 0) { var t = sb.ToString(); sb.Clear(); if (t.Length > 1 && !Stop.Contains(t)) yield return Stem(t); }
        }
        if (sb.Length > 1 && !Stop.Contains(sb.ToString())) yield return Stem(sb.ToString());
    }

    /// <summary>Tiny English suffix stripper so "actions" matches "action".</summary>
    private static string Stem(string t)
    {
        if (t.Length > 4 && t[0] < 128)
        {
            if (t.EndsWith("ies")) return t[..^3] + "y";
            if (t.EndsWith("ing")) return t[..^3];
            if (t.EndsWith("es") && !t.EndsWith("ses")) return t[..^2];
            if (t.EndsWith('s') && !t.EndsWith("ss")) return t[..^1];
        }
        return t;
    }

    [GeneratedRegex(@"(?:chapter\s*)?(?<c>\d{1,2})\s*(?:[.:/]|\s+verse\s+|\s*श्लोक\s*)\s*(?<v>\d{1,3})", RegexOptions.IgnoreCase)]
    private static partial Regex RefRegex();
}
