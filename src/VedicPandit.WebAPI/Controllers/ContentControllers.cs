using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;

namespace VedicPandit.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MuhuratController : ControllerBase
{
    private readonly IMuhuratEngine _engine;
    public MuhuratController(IMuhuratEngine engine) => _engine = engine;

    [HttpGet("events")]
    public IActionResult Events() =>
        Ok(_engine.SupportedEvents.Select(e => new { id = e.Event.ToString(), name = e.Name, nameHi = e.NameHi }));

    /// <summary>GET /api/muhurat?event=Vivah&amp;from=2026-11-01&amp;to=2027-01-31&amp;lat=..&amp;lng=..&amp;tz=Asia/Kolkata</summary>
    [HttpGet]
    public IActionResult Find([FromQuery(Name = "event")] MuhuratEvent evt, [FromQuery] DateOnly from, [FromQuery] DateOnly to,
        [FromQuery] double lat = 25.3176, [FromQuery] double lng = 82.9739, [FromQuery] string tz = "Asia/Kolkata", [FromQuery] int max = 20)
    {
        if (to.DayNumber - from.DayNumber > 180) return BadRequest("Range is limited to 180 days.");
        if (lat is < -66 or > 66) return BadRequest("Latitude must be between -66 and 66.");
        return Ok(_engine.Find(evt, from, to, lat, lng, tz, Math.Clamp(max, 1, 50)));
    }
}

[ApiController]
[Route("api/[controller]")]
public class MantrasController : ControllerBase
{
    private readonly IContentStore _content;
    public MantrasController(IContentStore content) => _content = content;

    [HttpGet]
    public IActionResult List() =>
        Ok(_content.Mantras.Select(m => new { m.Slug, m.Name, m.NameHi, m.Deity, m.Source, m.Tags, m.Kind }));

    [HttpGet("{slug}")]
    public IActionResult Get(string slug)
    {
        var m = _content.FindMantra(slug);
        return m is null ? NotFound() : Ok(m);
    }
}

[ApiController]
[Route("api/[controller]")]
public class ScripturesController : ControllerBase
{
    private readonly IContentStore _content;
    private readonly IScriptureRetriever _retriever;
    private readonly IConfiguration _config;

    public ScripturesController(IContentStore content, IScriptureRetriever retriever, IConfiguration config)
    { _content = content; _retriever = retriever; _config = config; }

    [HttpGet]
    public IActionResult List() =>
        Ok(_content.Scriptures.Select(s => new { s.Code, s.Name, s.NameDevanagari, s.Category, s.Description, s.TranslationCredit, verseCount = s.Verses.Count }));

    [HttpGet("{code}/verses")]
    public IActionResult Verses(string code, [FromQuery] int? chapter)
    {
        var s = _content.FindScripture(code);
        if (s is null) return NotFound();
        var q = s.Verses.AsEnumerable();
        if (chapter.HasValue) q = q.Where(v => v.Chapter == chapter.Value);
        return Ok(q.Select(v => new { citation = v.Citation, scripture = s.Code, v.Chapter, v.Verse, v.Sanskrit, v.TranslationEn, v.TranslationHi }));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] string? scripture, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q)) return BadRequest("q is required");
        var hits = await _retriever.SearchAsync(q, scripture, 10, ct);
        return Ok(hits.Select(h => new
        {
            citation = h.Verse.Citation, scripture = h.Verse.Scripture?.Code, h.Verse.Chapter, h.Verse.Verse,
            h.Verse.Sanskrit, h.Verse.TranslationEn, h.Verse.TranslationHi, h.Score
        }));
    }

    /// <summary>Import more verses (JSON array shaped like SeedData/scriptures/*.json). Requires header X-Admin-Key.</summary>
    [HttpPost("import")]
    [RequestSizeLimit(50_000_000)]
    public async Task<IActionResult> Import(CancellationToken ct)
    {
        var key = _config["Admin:ApiKey"];
        if (string.IsNullOrEmpty(key) || Request.Headers["X-Admin-Key"] != key) return Unauthorized();
        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync(ct);
        try
        {
            int n = await _content.ImportAsync(json, ct);
            await _retriever.RebuildAsync(ct);
            return Ok(new { imported = n });
        }
        catch (Exception ex) when (ex is System.Text.Json.JsonException or InvalidDataException)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

/// <summary>Non-streaming REST fallback for the bot (useful for testing, mobile apps or WhatsApp integrations).</summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("chat")]
public class ChatController : ControllerBase
{
    private readonly IPanditJiOrchestrator _bot;
    public ChatController(IPanditJiOrchestrator bot) => _bot = bot;

    public record ChatRequest(string Text, string? SessionId, string? Language, double? Latitude, double? Longitude, string? TimeZone, string? Tradition = null);

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ChatRequest r, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(r.Text)) return BadRequest(new { error = "text is required" });
        var req = new BotRequest(r.SessionId ?? Guid.NewGuid().ToString("N"), r.Text, r.Language ?? "hi",
            r.Latitude ?? 25.3176, r.Longitude ?? 82.9739, r.TimeZone ?? "Asia/Kolkata", r.Tradition ?? "all");
        var cards = new List<object>();
        var tools = new List<string>();
        string answer = "";
        string? error = null;
        await foreach (var ev in _bot.AskAsync(req, ct))
        {
            switch (ev)
            {
                case BotCard c: cards.Add(new { type = c.Type, payload = c.Payload }); break;
                case BotToolStatus t: tools.Add(t.Tool); break;
                case BotDone d: answer = d.FullText; break;
                case BotError e: error = e.Message; break;
            }
        }
        return error is null ? Ok(new { sessionId = req.SessionId, answer, tools, cards }) : StatusCode(503, new { error });
    }
}
