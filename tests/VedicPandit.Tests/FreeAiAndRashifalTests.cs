using System.Text.Json.Nodes;
using VedicPandit.Infrastructure.AI;
using VedicPandit.Infrastructure.Rashifal;
using Xunit;

namespace VedicPandit.Tests;

public class FreeAiAndRashifalTests
{
    [Fact]
    public void Anthropic_tool_round_becomes_openai_messages()
    {
        var msgs = new JsonArray
        {
            new JsonObject { ["role"] = "user", ["content"] = "aaj simha rashi?" },
            new JsonObject { ["role"] = "assistant", ["content"] = new JsonArray(
                new JsonObject { ["type"] = "text", ["text"] = "Dekhta hoon" },
                new JsonObject { ["type"] = "tool_use", ["id"] = "t1", ["name"] = "get_rashifal", ["input"] = new JsonObject { ["rashi"] = "Simha" } }) },
            new JsonObject { ["role"] = "user", ["content"] = new JsonArray(
                new JsonObject { ["type"] = "tool_result", ["tool_use_id"] = "t1", ["content"] = "Rating 4/5" }) },
        };
        var o = OpenAiCompatClient.ToOpenAiMessages("sys", msgs);
        Assert.Equal(4, o.Count);
        Assert.Equal("system", o[0]!["role"]!.GetValue<string>());
        Assert.Equal("get_rashifal", o[2]!["tool_calls"]![0]!["function"]!["name"]!.GetValue<string>());
        Assert.True(o[2]!["tool_calls"]![0]!["function"]!["arguments"]!.GetValue<string>().Contains("Simha"), "arguments carried");
        Assert.Equal("tool", o[3]!["role"]!.GetValue<string>());
        Assert.Equal("t1", o[3]!["tool_call_id"]!.GetValue<string>());

        var tools = OpenAiCompatClient.ToOpenAiTools(PromptLibrary.Tools(new[] { "Vivah" }));
        Assert.Equal(5, tools.Count);
        Assert.Equal("function", tools[0]!["type"]!.GetValue<string>());
    }

    [Fact]
    public void Rashifal_matches_panchang_moon_sign()
    {
        Assert.Equal(7, RashifalCalc.Parse("aaj ka vrishchik rashifal"));
        Assert.Equal(10, RashifalCalc.Parse("कुंभ"));
        Assert.Equal(4, RashifalCalc.Parse("Leo"));
        var tz = VedicPandit.Infrastructure.Panchang.PanchangEngine.ResolveTimeZone("Asia/Kolkata");
        // 27 Oct 2026 the Moon is in Mesha at sunrise (same engine as the panchang): Simha sees it in the 9th house
        var day = RashifalCalc.Context(4, new DateOnly(2026, 10, 27), tz, "day");
        Assert.True(day.Contains("Moon in Mesha = house 9"), day);
        var month = RashifalCalc.Context(4, new DateOnly(2026, 10, 27), tz, "month");
        Assert.True(month.Contains("Sun in Tula") && month.Contains("house 3"), month);
    }
}
