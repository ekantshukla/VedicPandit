using System.Text.Json;
using Microsoft.Extensions.Logging;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;

namespace VedicPandit.Infrastructure.Data;

public class ContentOptions
{
    public const string Section = "Content";
    /// <summary>Folder with mantras.json and scriptures/*.json shipped with the app.</summary>
    public string SeedFolder { get; set; } = Path.Combine(AppContext.BaseDirectory, "SeedData");
    /// <summary>Writable folder for imported texts and the chat log. Mount a volume here in production.</summary>
    public string DataFolder { get; set; } = Path.Combine(AppContext.BaseDirectory, "data");
}

/// <summary>
/// Loads content from JSON files into memory. Scriptures with the same code across files are merged
/// verse by verse (later files fill in or override fields), so imports can add translations to existing texts.
/// </summary>
public sealed class JsonContentStore : IContentStore
{
    public static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private readonly ContentOptions _opt;
    private readonly ILogger<JsonContentStore> _log;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private volatile Snapshot _snap;

    private sealed record Snapshot(List<Mantra> Mantras, List<Scripture> Scriptures, List<ScriptureVerse> Verses,
        Dictionary<string, Mantra> MantraBySlug, Dictionary<string, Scripture> ScriptureByCode);

    public event Action? Changed;

    public JsonContentStore(ContentOptions opt, ILogger<JsonContentStore> log)
    {
        _opt = opt;
        _log = log;
        _snap = Load();
    }

    public IReadOnlyList<Mantra> Mantras => _snap.Mantras;
    public IReadOnlyList<Scripture> Scriptures => _snap.Scriptures;
    public IEnumerable<ScriptureVerse> AllVerses => _snap.Verses;
    public Mantra? FindMantra(string slug) => _snap.MantraBySlug.GetValueOrDefault(slug);
    public Scripture? FindScripture(string code) => _snap.ScriptureByCode.GetValueOrDefault(code);

    private string ImportFolder => Path.Combine(_opt.DataFolder, "imports");

    private Snapshot Load()
    {
        // Mantras
        var mantras = new List<Mantra>();
        // mantras.json, then SeedData/mantras/*.json (stotras, chalisas, aartis) in name order
        var mantraFiles = new List<string> { Path.Combine(_opt.SeedFolder, "mantras.json") };
        var mantraDir = Path.Combine(_opt.SeedFolder, "mantras");
        if (Directory.Exists(mantraDir)) mantraFiles.AddRange(Directory.GetFiles(mantraDir, "*.json").OrderBy(f => f, StringComparer.Ordinal));
        foreach (var f in mantraFiles.Where(File.Exists))
            mantras.AddRange(JsonSerializer.Deserialize<List<Mantra>>(File.ReadAllText(f), Json) ?? new());
        // Karaoke timing for short mantras; long stotras are timed verse by verse in the browser
        foreach (var m in mantras)
            if (m.Kind == "mantra" && (string.IsNullOrWhiteSpace(m.TimingJson) || m.TimingJson == "[]"))
                m.TimingJson = ChantTiming.Generate(m.Sanskrit);

        // Scriptures: seed files first (alphabetical), then imports (oldest first)
        var files = new List<string>();
        var seedDir = Path.Combine(_opt.SeedFolder, "scriptures");
        if (Directory.Exists(seedDir)) files.AddRange(Directory.GetFiles(seedDir, "*.json").OrderBy(f => f, StringComparer.Ordinal));
        if (Directory.Exists(ImportFolder)) files.AddRange(Directory.GetFiles(ImportFolder, "*.json").OrderBy(File.GetLastWriteTimeUtc));

        var byCode = new Dictionary<string, Scripture>(StringComparer.OrdinalIgnoreCase);
        foreach (var f in files)
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<Scripture>>(File.ReadAllText(f), Json) ?? new();
                foreach (var s in list) Merge(byCode, s);
            }
            catch (Exception ex) { _log.LogError(ex, "Could not read {File}", f); }
        }

        var scriptures = byCode.Values.ToList();
        var verses = new List<ScriptureVerse>();
        foreach (var s in scriptures)
        {
            s.Verses = s.Verses.OrderBy(v => v.Chapter).ThenBy(v => VerseSortKey(v.Verse)).ThenBy(v => v.Verse, StringComparer.Ordinal).ToList();
            foreach (var v in s.Verses) { v.Scripture = s; verses.Add(v); }
        }

        _log.LogInformation("Loaded {Mantras} mantras, {Scriptures} scriptures, {Verses} verses", mantras.Count, scriptures.Count, verses.Count);
        return new Snapshot(mantras, scriptures, verses,
            mantras.GroupBy(m => m.Slug).ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase),
            byCode);
    }

    private static int VerseSortKey(string verse)
    {
        var digits = new string(verse.TakeWhile(char.IsDigit).ToArray());
        return int.TryParse(digits, out var n) ? n : int.MaxValue;
    }

    private static void Merge(Dictionary<string, Scripture> byCode, Scripture incoming)
    {
        if (string.IsNullOrWhiteSpace(incoming.Code)) return;
        if (!byCode.TryGetValue(incoming.Code, out var existing))
        {
            byCode[incoming.Code] = incoming;
            return;
        }
        static string Pick(string a, string b) => string.IsNullOrWhiteSpace(b) ? a : b;
        existing.Name = Pick(existing.Name, incoming.Name);
        existing.NameDevanagari = Pick(existing.NameDevanagari, incoming.NameDevanagari);
        existing.Category = Pick(existing.Category, incoming.Category);
        existing.Description = Pick(existing.Description, incoming.Description);
        existing.TranslationCredit = Pick(existing.TranslationCredit, incoming.TranslationCredit);

        var index = existing.Verses.ToDictionary(v => (v.Chapter, v.Verse));
        foreach (var v in incoming.Verses)
        {
            if (index.TryGetValue((v.Chapter, v.Verse), out var ev))
            {
                ev.Sanskrit = Pick(ev.Sanskrit, v.Sanskrit);
                ev.TranslationEn = Pick(ev.TranslationEn, v.TranslationEn);
                ev.TranslationHi = Pick(ev.TranslationHi, v.TranslationHi);
                ev.Keywords = string.Join(' ', new[] { ev.Keywords, v.Keywords }.Where(k => !string.IsNullOrWhiteSpace(k)).Distinct());
            }
            else
            {
                existing.Verses.Add(v);
                index[(v.Chapter, v.Verse)] = v;
            }
        }
    }

    public async Task<int> ImportAsync(string json, CancellationToken ct = default)
    {
        var incoming = JsonSerializer.Deserialize<List<Scripture>>(json, Json)
                       ?? throw new InvalidDataException("Expected a JSON array of scriptures.");
        if (incoming.Count == 0 || incoming.Any(s => string.IsNullOrWhiteSpace(s.Code)))
            throw new InvalidDataException("Every scripture needs a \"code\".");

        await _writeLock.WaitAsync(ct);
        try
        {
            Directory.CreateDirectory(ImportFolder);
            var stamp = DateTime.UtcNow.ToString("yyyyMMddHHmmss");
            var name = $"{stamp}-{string.Join('-', incoming.Select(s => SafeName(s.Code)).Distinct())}.json";
            await File.WriteAllTextAsync(Path.Combine(ImportFolder, name), JsonSerializer.Serialize(incoming, Json), ct);
            _snap = Load();
        }
        finally { _writeLock.Release(); }

        Changed?.Invoke();
        return incoming.Sum(s => s.Verses.Count);
    }

    private static string SafeName(string s) => new(s.Where(c => char.IsLetterOrDigit(c) || c == '-').Take(40).ToArray());
}

/// <summary>Appends chat turns to a JSON Lines file in the data folder (one object per line). Best effort.</summary>
public sealed class FileChatLog : IChatLog
{
    private readonly string _path;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<FileChatLog> _log;

    public FileChatLog(ContentOptions opt, ILogger<FileChatLog> log)
    {
        _path = Path.Combine(opt.DataFolder, "chat-log.jsonl");
        _log = log;
    }

    public async Task AppendAsync(ChatTurn turn, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct);
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_path)!);
            await File.AppendAllTextAsync(_path, JsonSerializer.Serialize(turn, JsonContentStore.Json).Replace("\n", " ").Replace("\r", "") + "\n", ct);
        }
        catch (Exception ex) { _log.LogWarning(ex, "Could not write chat log"); }
        finally { _lock.Release(); }
    }
}

/// <summary>
/// Generates approximate per-word timings for karaoke highlighting when no recorded audio alignment exists.
/// Duration is proportional to the number of aksharas (syllables) in each word, with pauses at line ends.
/// Replace with forced-alignment output (e.g. from a recorded chant) for production audio.
/// </summary>
public static class ChantTiming
{
    private const int MsPerAkshara = 420;
    private const int WordGap = 120;
    private const int LinePause = 700;

    public static string Generate(string devanagari)
    {
        var items = new List<object>();
        int t = 0;
        var lines = devanagari.Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        for (int li = 0; li < lines.Length; li++)
        {
            foreach (var w in lines[li].Split(' ', StringSplitOptions.RemoveEmptyEntries))
            {
                int dur = Math.Max(1, CountAksharas(w)) * MsPerAkshara;
                items.Add(new { w, s = t, e = t + dur, l = li });
                t += dur + WordGap;
            }
            t += LinePause;
        }
        return JsonSerializer.Serialize(items, JsonContentStore.Json).Replace("\n", "").Replace("  ", "");
    }

    /// <summary>Counts syllable nuclei: independent vowels + consonants not followed by virama, plus Om.</summary>
    public static int CountAksharas(string word)
    {
        int n = 0;
        for (int i = 0; i < word.Length; i++)
        {
            char c = word[i];
            bool vowel = c >= 'ऄ' && c <= 'औ';
            bool consonant = c >= 'क' && c <= 'ह';
            bool om = c == 'ॐ';
            if (vowel || om) n++;
            else if (consonant && !(i + 1 < word.Length && word[i + 1] == '्')) n++;
        }
        return n;
    }
}
