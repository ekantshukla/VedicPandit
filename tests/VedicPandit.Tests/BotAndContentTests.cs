using System.Runtime.CompilerServices;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging.Abstractions;
using VedicPandit.Core.Interfaces;
using VedicPandit.Infrastructure.AI;
using VedicPandit.Infrastructure.Data;
using VedicPandit.Infrastructure.Knowledge;
using VedicPandit.Infrastructure.Muhurat;
using VedicPandit.Infrastructure.Panchang;
using VedicPandit.Infrastructure.Services;
using Xunit;

namespace VedicPandit.Tests;

internal static class Fixture
{
    public static readonly string Seed = Path.Combine(AppContext.BaseDirectory, "SeedData");

    public static JsonContentStore Store(string? dataFolder = null) =>
        new(new ContentOptions { SeedFolder = Seed, DataFolder = dataFolder ?? Path.Combine(Path.GetTempPath(), "vp-test-" + Guid.NewGuid().ToString("N")) },
            NullLogger<JsonContentStore>.Instance);
}

public class ContentAndSearchTests
{
    [Fact]
    public void Loads_full_gita_and_merges_curated_hindi()
    {
        var store = Fixture.Store();
        var gita = store.FindScripture("gita");
        Assert.NotNull(gita);
        Assert.Equal(701, gita!.Verses.Count);
        var v = gita.Verses.First(x => x.Chapter == 2 && x.Verse == "47");
        Assert.Contains("कर्मण्येवाधिकारस्ते", v.Sanskrit);
        Assert.Contains("Your right is only to work", v.TranslationEn);   // Sivananda
        Assert.Contains("कर्म करने में", v.TranslationHi);              // curated Hindi kept
        Assert.Contains("karma", v.Keywords);
        Assert.Equal("Bhagavad Gita 2.47", v.Citation);
        Assert.True(store.Mantras.Count >= 10, "mantras loaded");
        Assert.Equal(7, store.FindScripture("upanishads")!.Verses.Count);
    }

    [Fact]
    public async Task Direct_reference_finds_exact_verse()
    {
        var r = new ScriptureRetriever(Fixture.Store());
        var hits = await r.SearchAsync("What does Gita 18.66 mean?");
        Assert.Equal("Bhagavad Gita 18.66", hits[0].Verse.Citation);
    }

    [Theory]
    [InlineData("how to control anger", "2.63")]
    [InlineData("the mind is restless how to control it", "6.35")]
    [InlineData("rebirth soul changes body like clothes", "2.22")]
    [InlineData("work without attachment to results", "2.47")]
    public async Task Topic_search_ranks_the_right_verse(string query, string expected)
    {
        var r = new ScriptureRetriever(Fixture.Store());
        var hits = await r.SearchAsync(query, topK: 5);
        Assert.Contains(hits, h => h.Verse.Citation.EndsWith(" " + expected));
    }

    [Fact]
    public async Task Import_adds_a_new_scripture_and_reindexes()
    {
        var dir = Path.Combine(Path.GetTempPath(), "vp-import-" + Guid.NewGuid().ToString("N"));
        var store = Fixture.Store(dir);
        var r = new ScriptureRetriever(store);
        await r.RebuildAsync();
        var json = """[{"code":"yoga-sutra","name":"Yoga Sutras","verses":[{"chapter":1,"verse":"2","sanskrit":"योगश्चित्तवृत्तिनिरोधः","translationEn":"Yoga is the stilling of the fluctuations of the mind."}]}]""";
        var n = await store.ImportAsync(json);
        Assert.Equal(1, n);
        var hits = await r.SearchAsync("stilling fluctuations of the mind");
        Assert.Equal("Yoga Sutras 1.2", hits[0].Verse.Citation);
        // survives a restart
        Assert.NotNull(Fixture.Store(dir).FindScripture("yoga-sutra"));
    }
}

/// <summary>Scripted stand-in for the Claude API: returns the given rounds in order and records each request.</summary>
internal sealed class FakeClaude : IClaudeClient
{
    private readonly Queue<List<ClaudeStreamEvent>> _rounds;
    public List<JsonArray> Requests { get; } = new();
    public List<JsonArray?> ToolsSent { get; } = new();
    public FakeClaude(params List<ClaudeStreamEvent>[] rounds) => _rounds = new(rounds);
    public bool IsConfigured => true;

    public async IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string system, JsonArray messages, JsonArray? tools, [EnumeratorCancellation] CancellationToken ct = default)
    {
        Requests.Add((JsonArray)messages.DeepClone());
        ToolsSent.Add(tools);
        foreach (var e in _rounds.Dequeue()) { await Task.Yield(); yield return e; }
    }
}

internal sealed class NullChatLog : IChatLog { public Task AppendAsync(VedicPandit.Core.Models.ChatTurn turn, CancellationToken ct = default) => Task.CompletedTask; }

public class PanditJiTests
{
    private static (PanditJiOrchestrator Bot, ConversationStore Store) Make(IClaudeClient claude)
    {
        var content = Fixture.Store();
        var panchang = new PanchangEngine();
        var store = new ConversationStore();
        var bot = new PanditJiOrchestrator(claude, panchang, new MuhuratEngine(panchang), new ScriptureRetriever(content),
            content, new NullChatLog(), store, NullLogger<PanditJiOrchestrator>.Instance);
        return (bot, store);
    }

    private static async Task<List<BotEvent>> Ask(PanditJiOrchestrator bot, string text, string session = "s1")
    {
        var list = new List<BotEvent>();
        await foreach (var e in bot.AskAsync(new BotRequest(session, text, "en", 28.6139, 77.209, "Asia/Kolkata"))) list.Add(e);
        return list;
    }

    [Fact]
    public async Task Tool_loop_searches_scripture_then_answers_with_citation()
    {
        var claude = new FakeClaude(
            new() { new ClaudeText("Let me look that up. "), new ClaudeToolUse("tu_1", "search_scriptures", new JsonObject { ["query"] = "anger control" }), new ClaudeStop("tool_use") },
            new() { new ClaudeText("Krishna explains that anger leads to delusion "), new ClaudeText("(Bhagavad Gita 2.63)."), new ClaudeStop("end_turn") });
        var (bot, store) = Make(claude);

        var events = await Ask(bot, "What does the Gita say about anger?");

        Assert.Contains(events, e => e is BotToolStatus { Tool: "search_scriptures" });
        var card = events.OfType<BotCard>().Single();
        Assert.Equal("verses", card.Type);
        var done = events.OfType<BotDone>().Single();
        Assert.Contains("Bhagavad Gita 2.63", done.FullText);

        // Second request must echo the tool_use and carry its tool_result with real verse text
        Assert.Equal(2, claude.Requests.Count);
        var second = claude.Requests[1];
        Assert.Equal(3, second.Count);
        var assistant = second[1]!.AsObject();
        Assert.Equal("assistant", assistant["role"]!.GetValue<string>());
        Assert.Equal("tool_use", assistant["content"]![1]!["type"]!.GetValue<string>());
        var result = second[2]!["content"]![0]!;
        Assert.Equal("tool_result", result["type"]!.GetValue<string>());
        Assert.Equal("tu_1", result["tool_use_id"]!.GetValue<string>());
        Assert.Contains("[Bhagavad Gita 2.63]", result["content"]!.GetValue<string>());
        Assert.True(claude.ToolsSent[0]!.Count == 5, "5 tools offered");

        // Conversation memory for the next question
        Assert.Equal(2, store.Get("s1").Count);
    }

    [Fact]
    public async Task Panchang_tool_returns_computed_values()
    {
        var claude = new FakeClaude(
            new() { new ClaudeToolUse("tu_p", "get_panchang", new JsonObject { ["date"] = "2026-10-26" }), new ClaudeStop("tool_use") },
            new() { new ClaudeText("Today is Purnima."), new ClaudeStop("end_turn") });
        var (bot, _) = Make(claude);
        var events = await Ask(bot, "aaj ka panchang");
        Assert.Equal("panchang", events.OfType<BotCard>().Single().Type);
        var toolResult = claude.Requests[1][2]!["content"]![0]!["content"]!.GetValue<string>();
        Assert.Contains("Purnima", toolResult);
        Assert.Contains("Rahu Kaal", toolResult);
    }

    [Fact]
    public async Task Muhurat_and_mantra_tools_work_in_one_turn()
    {
        var claude = new FakeClaude(
            new()
            {
                new ClaudeToolUse("a", "find_muhurat", new JsonObject { ["event"] = "VahanKharid", ["from_date"] = "2026-11-01", ["to_date"] = "2026-11-30" }),
                new ClaudeToolUse("b", "get_mantra", new JsonObject { ["query"] = "vakratunda" }),
                new ClaudeStop("tool_use")
            },
            new() { new ClaudeText("Here are the dates and the Ganesha mantra."), new ClaudeStop("end_turn") });
        var (bot, _) = Make(claude);
        var events = await Ask(bot, "Car kab khareedein, aur pehle kaunsa mantra?");
        var cards = events.OfType<BotCard>().Select(c => c.Type).ToList();
        Assert.Contains(cards, c => c == "muhurat");
        Assert.Contains(cards, c => c == "mantra");
        var results = claude.Requests[1][2]!["content"]!.AsArray();
        Assert.Equal(2, results.Count);
        Assert.Contains("Vakratunda", results[1]!["content"]!.GetValue<string>());
    }

    [Fact]
    public async Task Api_failure_returns_a_friendly_error()
    {
        var (bot, _) = Make(new ThrowingClaude());
        var events = await Ask(bot, "hello");
        Assert.Contains(events, e => e is BotError);
    }

    [Fact]
    public async Task Without_api_key_answers_from_built_in_rules()
    {
        var (bot, _) = Make(new UnconfiguredClaude());
        var events = await Ask(bot, "aaj ka panchang batao");
        Assert.Equal("panchang", events.OfType<BotCard>().Single().Type);
        Assert.Contains("Rahu Kaal", events.OfType<BotDone>().Single().FullText);
    }

    private sealed class ThrowingClaude : IClaudeClient
    {
        public bool IsConfigured => true;
        public async IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string s, JsonArray m, JsonArray? t, [EnumeratorCancellation] CancellationToken ct = default)
        {
            await Task.Yield();
            throw new HttpRequestException("boom");
#pragma warning disable CS0162
            yield break;
#pragma warning restore CS0162
        }
    }

    private sealed class UnconfiguredClaude : IClaudeClient
    {
        public bool IsConfigured => false;
        public IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string s, JsonArray m, JsonArray? t, CancellationToken ct = default) => throw new InvalidOperationException();
    }
}
