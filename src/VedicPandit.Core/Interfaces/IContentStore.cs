using VedicPandit.Core.Models;

namespace VedicPandit.Core.Interfaces;

/// <summary>
/// Read-mostly content: mantras and scripture verses. Loaded from JSON files at startup
/// (SeedData/ plus any imports saved in the data folder), held in memory.
/// </summary>
public interface IContentStore
{
    IReadOnlyList<Mantra> Mantras { get; }
    IReadOnlyList<Scripture> Scriptures { get; }
    IEnumerable<ScriptureVerse> AllVerses { get; }
    Mantra? FindMantra(string slug);
    Scripture? FindScripture(string code);

    /// <summary>Upserts scriptures/verses from JSON (same shape as SeedData/scriptures/*.json), saves them, returns verses written.</summary>
    Task<int> ImportAsync(string json, CancellationToken ct = default);

    /// <summary>Raised after an import so search indexes can rebuild.</summary>
    event Action? Changed;
}

public interface IChatLog
{
    Task AppendAsync(ChatTurn turn, CancellationToken ct = default);
}
