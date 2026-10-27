using VedicPandit.Core.Dtos;
using VedicPandit.Core.Models;

namespace VedicPandit.Core.Interfaces;

public interface IPanchangEngine
{
    PanchangResult Compute(DateOnly date, double latitude, double longitude, string timeZoneId, PanchangOptions? options = null);
}

public interface IMuhuratEngine
{
    MuhuratSearchResult Find(MuhuratEvent evt, DateOnly from, DateOnly to, double latitude, double longitude, string timeZoneId, int maxResults = 15);
    IReadOnlyList<(MuhuratEvent Event, string Name, string NameHi)> SupportedEvents { get; }
}

public record VerseHit(ScriptureVerse Verse, double Score);

public interface IScriptureRetriever
{
    Task<IReadOnlyList<VerseHit>> SearchAsync(string query, string? scriptureCode = null, int topK = 6, CancellationToken ct = default);
    /// <summary>Rebuild the in-memory index after an import.</summary>
    Task RebuildAsync(CancellationToken ct = default);
}

/// <summary>Event emitted while PanditJi answers. Text deltas stream to the UI; cards carry structured data (panchang, mantra, verses).</summary>
public abstract record BotEvent;
public record BotTextDelta(string Text) : BotEvent;
public record BotCard(string Type, object Payload) : BotEvent;
public record BotToolStatus(string Tool, string Status) : BotEvent;
public record BotDone(string FullText) : BotEvent;
public record BotError(string Message) : BotEvent;

/// <param name="Tradition">The reader's sampradaya: all, vaishnava, shaiva, shakta or smarta.</param>
public record BotRequest(string SessionId, string Text, string Language, double Latitude, double Longitude, string TimeZone, string Tradition = "all");

public interface IPanditJiOrchestrator
{
    IAsyncEnumerable<BotEvent> AskAsync(BotRequest request, CancellationToken ct = default);
}
