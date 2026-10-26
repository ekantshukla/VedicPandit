using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VedicPandit.Infrastructure.AI;

public class ClaudeOptions
{
    public const string Section = "Claude";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.anthropic.com";
    public string Model { get; set; } = "claude-sonnet-5-5";
    public int MaxTokens { get; set; } = 1500;
    public string ApiVersion { get; set; } = "2023-06-01";
}

/// <summary>Events parsed from the Messages API SSE stream.</summary>
public abstract record ClaudeStreamEvent;
public record ClaudeText(string Text) : ClaudeStreamEvent;
public record ClaudeToolUse(string Id, string Name, JsonObject Input) : ClaudeStreamEvent;
public record ClaudeStop(string? StopReason) : ClaudeStreamEvent;

public interface IClaudeClient
{
    bool IsConfigured { get; }
    IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string system, JsonArray messages, JsonArray? tools, CancellationToken ct = default);
}

/// <summary>Minimal Anthropic Messages API client with streaming and tool use (no SDK dependency).</summary>
public sealed class ClaudeClient : IClaudeClient
{
    private readonly HttpClient _http;
    private readonly ClaudeOptions _opt;
    private readonly ILogger<ClaudeClient> _log;

    public ClaudeClient(HttpClient http, IOptions<ClaudeOptions> opt, ILogger<ClaudeClient> log)
    {
        _http = http; _opt = opt.Value; _log = log;
        _http.BaseAddress = new Uri(_opt.BaseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(120);
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_opt.ApiKey);

    public async IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string system, JsonArray messages, JsonArray? tools,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var body = new JsonObject
        {
            ["model"] = _opt.Model,
            ["max_tokens"] = _opt.MaxTokens,
            ["stream"] = true,
            // System prompt marked cacheable: it is identical across requests.
            ["system"] = new JsonArray(new JsonObject
            {
                ["type"] = "text",
                ["text"] = system,
                ["cache_control"] = new JsonObject { ["type"] = "ephemeral" }
            }),
            ["messages"] = messages.DeepClone()
        };
        if (tools is { Count: > 0 }) body["tools"] = tools.DeepClone();

        using var req = new HttpRequestMessage(HttpMethod.Post, "v1/messages")
        {
            Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json")
        };
        req.Headers.Add("x-api-key", _opt.ApiKey);
        req.Headers.Add("anthropic-version", _opt.ApiVersion);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        using var res = await _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync(ct);
            _log.LogError("Claude API error {Status}: {Body}", (int)res.StatusCode, err);
            throw new HttpRequestException($"Claude API returned {(int)res.StatusCode}: {err}");
        }

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);

        // content block index -> tool accumulator
        var toolBlocks = new Dictionary<int, (string Id, string Name, StringBuilder Json)>();
        string? stopReason = null;

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrEmpty(line) || !line.StartsWith("data:")) continue;
            var data = line["data:".Length..].Trim();
            if (data.Length == 0) continue;

            JsonNode? evt;
            try { evt = JsonNode.Parse(data); } catch { continue; }
            var type = evt?["type"]?.GetValue<string>();

            switch (type)
            {
                case "content_block_start":
                {
                    int idx = evt!["index"]!.GetValue<int>();
                    var block = evt["content_block"];
                    if (block?["type"]?.GetValue<string>() == "tool_use")
                        toolBlocks[idx] = (block["id"]!.GetValue<string>(), block["name"]!.GetValue<string>(), new StringBuilder());
                    break;
                }
                case "content_block_delta":
                {
                    int idx = evt!["index"]!.GetValue<int>();
                    var delta = evt["delta"];
                    var dtype = delta?["type"]?.GetValue<string>();
                    if (dtype == "text_delta")
                        yield return new ClaudeText(delta!["text"]!.GetValue<string>());
                    else if (dtype == "input_json_delta" && toolBlocks.TryGetValue(idx, out var tb))
                        tb.Json.Append(delta!["partial_json"]!.GetValue<string>());
                    break;
                }
                case "content_block_stop":
                {
                    int idx = evt!["index"]!.GetValue<int>();
                    if (toolBlocks.Remove(idx, out var tb))
                    {
                        JsonObject input;
                        try { input = tb.Json.Length == 0 ? new JsonObject() : (JsonNode.Parse(tb.Json.ToString()) as JsonObject ?? new JsonObject()); }
                        catch { input = new JsonObject(); }
                        yield return new ClaudeToolUse(tb.Id, tb.Name, input);
                    }
                    break;
                }
                case "message_delta":
                    stopReason = evt!["delta"]?["stop_reason"]?.GetValue<string>() ?? stopReason;
                    break;
                case "error":
                    throw new HttpRequestException("Claude stream error: " + evt!["error"]?.ToJsonString());
            }
        }
        yield return new ClaudeStop(stopReason);
    }
}
