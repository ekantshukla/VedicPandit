using System.Text.Json.Serialization;

namespace VedicPandit.Core.Models;

/// <summary>A sacred text (Bhagavad Gita, an Upanishad, Ramayana...). Verses are the retrieval unit for the bot.</summary>
public class Scripture
{
    /// <summary>Short stable code used in citations and URLs, e.g. "gita", "upanishads".</summary>
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NameDevanagari { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;   // Itihasa, Upanishad, Veda, Purana, Stotra
    public string Description { get; set; } = string.Empty;
    /// <summary>Who wrote the translations shown, e.g. "English: Swami Sivananda".</summary>
    public string TranslationCredit { get; set; } = string.Empty;
    public List<ScriptureVerse> Verses { get; set; } = new();
}

public class ScriptureVerse
{
    /// <summary>Chapter / Kanda / Adhyaya / Mandala number (0 if not applicable).</summary>
    public int Chapter { get; set; }
    /// <summary>Verse label as printed, e.g. "47" or "Isha 1".</summary>
    public string Verse { get; set; } = string.Empty;
    public string Sanskrit { get; set; } = string.Empty;
    public string TranslationEn { get; set; } = string.Empty;
    public string TranslationHi { get; set; } = string.Empty;
    /// <summary>Space-separated topic keywords to help retrieval (karma, duty, soul...).</summary>
    public string Keywords { get; set; } = string.Empty;

    /// <summary>Back-reference set by the content store when loading (not serialised).</summary>
    [JsonIgnore] public Scripture? Scripture { get; set; }

    [JsonIgnore]
    public string Citation => Scripture is null ? $"{Chapter}.{Verse}" :
        (Chapter > 0 ? $"{Scripture.Name} {Chapter}.{Verse}" : $"{Scripture.Name} {Verse}");
}

public class Mantra
{
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NameHi { get; set; } = string.Empty;
    public string Deity { get; set; } = string.Empty;
    /// <summary>Source of the mantra, e.g. "Rigveda 3.62.10".</summary>
    public string Source { get; set; } = string.Empty;
    /// <summary>Devanagari text; lines separated by '\n'. Transliteration to IAST and other scripts is done client-side.</summary>
    public string Sanskrit { get; set; } = string.Empty;
    public string MeaningEn { get; set; } = string.Empty;
    public string MeaningHi { get; set; } = string.Empty;
    public string Benefits { get; set; } = string.Empty;
    public string PronunciationTips { get; set; } = string.Empty;
    public int RecommendedRepetitions { get; set; } = 108;
    /// <summary>Optional URL of a recorded chant (blob storage / CDN).</summary>
    public string? AudioUrl { get; set; }
    /// <summary>JSON array of {"w": word, "s": startMs, "e": endMs, "l": line} used for karaoke-style highlighting.</summary>
    public string TimingJson { get; set; } = "[]";
    public string Tags { get; set; } = string.Empty;
}

public class ChatTurn
{
    public string SessionId { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;    // user | assistant
    public string Content { get; set; } = string.Empty;
    public string Language { get; set; } = "hi";
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
