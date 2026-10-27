using System.Net;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace VedicPandit.Infrastructure.AI;

/// <summary>
/// A free (or any) OpenAI-compatible chat model: Groq, Google Gemini (OpenAI endpoint), OpenRouter, Together, a local Ollama…
/// Set FreeAI__ApiKey (and optionally FreeAI__BaseUrl / FreeAI__Model). When set, PanditJi uses it instead of Claude.
/// </summary>
public class FreeAiOptions
{
    public const string Section = "FreeAI";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/openai";
    public string Model { get; set; } = "gemini-3.1-flash-lite";
    public int MaxTokens { get; set; } = 1500;
}

/// <summary>
/// Speaks the OpenAI chat-completions protocol but exposes the same IClaudeClient interface, translating the
/// Anthropic-style messages and tools the orchestrator builds, so PanditJiOrchestrator works unchanged.
/// </summary>
public sealed class OpenAiCompatClient : IClaudeClient
{
    /// <summary>Gemini 3 thought signatures by tool-call id: they must be sent back unchanged with the call.</summary>
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, JsonNode> Signatures = new();

    private readonly HttpClient _http;
    private readonly FreeAiOptions _opt;
    private readonly ILogger<OpenAiCompatClient> _log;

    public OpenAiCompatClient(HttpClient http, IOptions<FreeAiOptions> opt, ILogger<OpenAiCompatClient> log)
    {
        _http = http; _opt = opt.Value; _log = log;
        _http.BaseAddress = new Uri(_opt.BaseUrl.TrimEnd('/') + "/");
        _http.Timeout = TimeSpan.FromSeconds(120);
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_opt.ApiKey);

    public async IAsyncEnumerable<ClaudeStreamEvent> StreamAsync(string system, JsonArray messages, JsonArray? tools,
        [EnumeratorCancellation] CancellationToken ct = default)
    {
        var res = await SendAsync(system, messages, tools, ct);
        // Some models now and then write a malformed tool call (Groq: 400 "tool_use_failed"): retry once as plain chat
        if (res.StatusCode == HttpStatusCode.BadRequest && tools is { Count: > 0 })
        {
            var err = await res.Content.ReadAsStringAsync(ct);
            _log.LogWarning("Free AI rejected the tool round, retrying without tools: {Body}", err);
            res.Dispose();
            res = await SendAsync(system, messages, null, ct);
        }
        using var response = res;
        if (!res.IsSuccessStatusCode)
        {
            var err = await res.Content.ReadAsStringAsync(ct);
            _log.LogError("Free AI error {Status}: {Body}", (int)res.StatusCode, err);
            throw new HttpRequestException($"AI API returned {(int)res.StatusCode}: {err}");
        }

        await using var stream = await res.Content.ReadAsStreamAsync(ct);
        using var reader = new StreamReader(stream);
        var calls = new SortedDictionary<int, (string Id, string Name, StringBuilder Args, JsonNode? Extra)>();
        string? finish = null;

        while (!reader.EndOfStream && !ct.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(ct);
            if (string.IsNullOrEmpty(line) || !line.StartsWith("data:")) continue;
            var data = line["data:".Length..].Trim();
            if (data.Length == 0 || data == "[DONE]") continue;

            JsonNode? evt;
            try { evt = JsonNode.Parse(data); } catch { continue; }
            var choice = evt?["choices"]?[0];
            if (choice is null) continue;
            finish = choice["finish_reason"]?.GetValue<string>() ?? finish;
            var delta = choice["delta"];
            if (delta is null) continue;

            var text = delta["content"]?.GetValue<string>();
            if (!string.IsNullOrEmpty(text)) yield return new ClaudeText(text);

            if (delta["tool_calls"] is JsonArray tcs)
            {
                int pos = 0;
                foreach (var tc in tcs)
                {
                    var id = tc?["id"]?.GetValue<string>();
                    // Gemini sends whole calls without "index": a new id means a new call
                    int idx;
                    if (tc?["index"] is JsonNode idxNode) idx = idxNode.GetValue<int>();
                    else if (id is not null)
                    {
                        idx = calls.Count;
                        foreach (var e in calls) if (e.Value.Id == id) { idx = e.Key; break; }
                    }
                    else idx = calls.Count == 0 ? pos : calls.Keys.Max();
                    pos++;
                    if (!calls.TryGetValue(idx, out var c)) c = (string.Empty, string.Empty, new StringBuilder(), null);
                    if (tc?["extra_content"] is JsonNode extra) c.Extra = extra.DeepClone();
                    var name = tc?["function"]?["name"]?.GetValue<string>();
                    var args = tc?["function"]?["arguments"];
                    if (!string.IsNullOrEmpty(id)) c.Id = id;
                    if (!string.IsNullOrEmpty(name)) c.Name = name;
                    if (args is JsonValue av) c.Args.Append(av.GetValue<string>());
                    else if (args is JsonObject ao) c.Args.Append(ao.ToJsonString());
                    calls[idx] = c;
                }
            }
        }

        int n = 0;
        foreach (var kv in calls)
        {
            var c = kv.Value;
            if (string.IsNullOrEmpty(c.Name)) continue;
            JsonObject input;
            try { input = c.Args.Length == 0 ? new JsonObject() : (JsonNode.Parse(c.Args.ToString()) as JsonObject ?? new JsonObject()); }
            catch { input = new JsonObject(); }
            var callId = string.IsNullOrEmpty(c.Id) ? $"call_{Guid.NewGuid():N}_{n}" : c.Id;
            if (c.Extra is not null) { if (Signatures.Count > 5000) Signatures.Clear(); Signatures[callId] = c.Extra; }
            yield return new ClaudeToolUse(callId, c.Name, input);
            n++;
        }
        yield return new ClaudeStop(n > 0 || finish == "tool_calls" ? "tool_use" : "end_turn");
    }

    private Task<HttpResponseMessage> SendAsync(string system, JsonArray messages, JsonArray? tools, CancellationToken ct)
    {
        var body = new JsonObject
        {
            ["model"] = _opt.Model,
            ["max_tokens"] = _opt.MaxTokens,
            ["temperature"] = 0.6,
            ["stream"] = true,
            ["messages"] = ToOpenAiMessages(system, messages),
        };
        if (tools is { Count: > 0 })
        {
            body["tools"] = ToOpenAiTools(tools);
            body["tool_choice"] = "auto";
        }
        var req = new HttpRequestMessage(HttpMethod.Post, "chat/completions")
        {
            Content = new StringContent(body.ToJsonString(), Encoding.UTF8, "application/json")
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _opt.ApiKey);
        req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));
        return _http.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
    }

    /// <summary>Anthropic tools ({name, description, input_schema}) to OpenAI functions.</summary>
    public static JsonArray ToOpenAiTools(JsonArray tools)
    {
        var list = new JsonArray();
        foreach (var t in tools)
        {
            if (t is null) continue;
            list.Add(new JsonObject
            {
                ["type"] = "function",
                ["function"] = new JsonObject
                {
                    ["name"] = t["name"]?.GetValue<string>(),
                    ["description"] = t["description"]?.GetValue<string>(),
                    ["parameters"] = t["input_schema"]?.DeepClone() ?? new JsonObject { ["type"] = "object" },
                }
            });
        }
        return list;
    }

    /// <summary>Anthropic messages (text, tool_use, tool_result blocks) to OpenAI roles (assistant.tool_calls, tool).</summary>
    public static JsonArray ToOpenAiMessages(string system, JsonArray messages)
    {
        var list = new JsonArray { new JsonObject { ["role"] = "system", ["content"] = system } };
        foreach (var m in messages)
        {
            if (m is null) continue;
            var role = m["role"]?.GetValue<string>() ?? "user";
            var content = m["content"];
            if (content is JsonValue v)
            {
                list.Add(new JsonObject { ["role"] = role, ["content"] = v.GetValue<string>() });
                continue;
            }
            if (content is not JsonArray blocks) continue;

            if (role == "assistant")
            {
                var text = new StringBuilder();
                var calls = new JsonArray();
                foreach (var b in blocks)
                {
                    var type = b?["type"]?.GetValue<string>();
                    if (type == "text") text.Append(b!["text"]?.GetValue<string>());
                    else if (type == "tool_use")
                    {
                        var id = b!["id"]?.GetValue<string>();
                        var call = new JsonObject
                        {
                            ["id"] = id,
                            ["type"] = "function",
                            ["function"] = new JsonObject
                            {
                                ["name"] = b["name"]?.GetValue<string>(),
                                ["arguments"] = b["input"]?.ToJsonString() ?? "{}",
                            }
                        };
                        if (id is not null && Signatures.TryGetValue(id, out var sig)) call["extra_content"] = sig.DeepClone();
                        calls.Add(call);
                    }
                }
                var msg = new JsonObject { ["role"] = "assistant", ["content"] = text.ToString() };
                if (calls.Count > 0) msg["tool_calls"] = calls;
                list.Add(msg);
            }
            else
            {
                foreach (var b in blocks)
                {
                    var type = b?["type"]?.GetValue<string>();
                    if (type == "tool_result")
                        list.Add(new JsonObject
                        {
                            ["role"] = "tool",
                            ["tool_call_id"] = b!["tool_use_id"]?.GetValue<string>(),
                            ["content"] = b["content"] is JsonValue cv ? cv.GetValue<string>() : b["content"]?.ToJsonString() ?? "",
                        });
                    else if (type == "text")
                        list.Add(new JsonObject { ["role"] = role, ["content"] = b!["text"]?.GetValue<string>() });
                }
            }
        }
        return list;
    }
}
