using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using VedicPandit.Core.Interfaces;

namespace VedicPandit.WebAPI.Hubs;

/// <summary>
/// Real-time channel for PanditJi. The client calls Ask(); the server pushes "botEvent" messages:
///   { type: "delta", text } | { type: "card", cardType, payload } | { type: "status", tool, status }
///   { type: "done", text } | { type: "error", message }
/// </summary>
public class PanditJiHub : Hub
{
    private readonly IPanditJiOrchestrator _orchestrator;
    private readonly HubRateLimiter _limiter;
    private readonly ILogger<PanditJiHub> _log;

    public PanditJiHub(IPanditJiOrchestrator orchestrator, HubRateLimiter limiter, ILogger<PanditJiHub> log)
    {
        _orchestrator = orchestrator;
        _limiter = limiter;
        _log = log;
    }

    public async Task Ask(AskRequest request)
    {
        var ct = Context.ConnectionAborted;
        var ip = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString() ?? Context.ConnectionId;
        if (!_limiter.TryAcquire(ip))
        {
            await Clients.Caller.SendAsync("botEvent", new { type = "error", message = "Too many questions in a minute. Please wait a moment and ask again." }, ct);
            return;
        }

        var session = string.IsNullOrWhiteSpace(request.SessionId) ? Context.ConnectionId : request.SessionId!;
        var botReq = new BotRequest(session, request.Text ?? "", request.Language ?? "hi",
            request.Latitude ?? 25.3176, request.Longitude ?? 82.9739, request.TimeZone ?? "Asia/Kolkata");

        try
        {
            await foreach (var ev in _orchestrator.AskAsync(botReq, ct))
            {
                object msg = ev switch
                {
                    BotTextDelta d => new { type = "delta", text = d.Text },
                    BotCard c => new { type = "card", cardType = c.Type, payload = c.Payload },
                    BotToolStatus s => new { type = "status", tool = s.Tool, status = s.Status },
                    BotDone d => new { type = "done", text = d.FullText },
                    BotError e => new { type = "error", message = e.Message },
                    _ => new { type = "unknown" }
                };
                await Clients.Caller.SendAsync("botEvent", msg, ct);
            }
        }
        catch (OperationCanceledException) { /* client left */ }
        catch (Exception ex)
        {
            _log.LogError(ex, "Ask failed");
            await Clients.Caller.SendAsync("botEvent", new { type = "error", message = "Something went wrong. Please try again." }, CancellationToken.None);
        }
    }
}

public record AskRequest(string? SessionId, string? Text, string? Language, double? Latitude, double? Longitude, string? TimeZone);

/// <summary>Sliding one-minute window per client IP for hub calls (ASP.NET's rate limiter only covers HTTP requests).</summary>
public sealed class HubRateLimiter
{
    private const int PerMinute = 20;
    private readonly ConcurrentDictionary<string, Queue<DateTime>> _hits = new();

    public bool TryAcquire(string key)
    {
        var now = DateTime.UtcNow;
        var q = _hits.GetOrAdd(key, _ => new Queue<DateTime>());
        lock (q)
        {
            while (q.Count > 0 && now - q.Peek() > TimeSpan.FromMinutes(1)) q.Dequeue();
            if (q.Count >= PerMinute) return false;
            q.Enqueue(now);
            return true;
        }
    }
}
