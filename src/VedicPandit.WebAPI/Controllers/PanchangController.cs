using Microsoft.AspNetCore.Mvc;
using VedicPandit.Core.Dtos;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;

namespace VedicPandit.WebAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PanchangController : ControllerBase
{
    private readonly IPanchangEngine _engine;
    public PanchangController(IPanchangEngine engine) => _engine = engine;

    /// <summary>Daily panchang. GET /api/panchang?date=2026-10-26&amp;lat=25.3176&amp;lng=82.9739&amp;tz=Asia/Kolkata&amp;system=Purnimanta</summary>
    [HttpGet]
    [ResponseCache(Duration = 3600, VaryByQueryKeys = new[] { "*" })]
    public ActionResult<PanchangResult> Get([FromQuery] DateOnly? date, [FromQuery] double lat = 25.3176, [FromQuery] double lng = 82.9739,
        [FromQuery] string tz = "Asia/Kolkata", [FromQuery] MonthSystem system = MonthSystem.Purnimanta)
    {
        if (lat is < -66 or > 66) return BadRequest("Latitude must be between -66 and 66 (sunrise-based panchang is undefined in polar regions).");
        var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
        return Ok(_engine.Compute(d, lat, lng, tz, new PanchangOptions(system)));
    }

    /// <summary>Compact month calendar: tithi, nakshatra and observances for each day.</summary>
    [HttpGet("month")]
    [ResponseCache(Duration = 21600, VaryByQueryKeys = new[] { "*" })]
    public IActionResult Month([FromQuery] int year, [FromQuery] int month, [FromQuery] double lat = 25.3176, [FromQuery] double lng = 82.9739,
        [FromQuery] string tz = "Asia/Kolkata", [FromQuery] MonthSystem system = MonthSystem.Purnimanta)
    {
        if (month is < 1 or > 12 || year is < 1900 or > 2100) return BadRequest("Invalid year/month");
        var first = new DateOnly(year, month, 1);
        var days = Enumerable.Range(0, DateTime.DaysInMonth(year, month)).Select(i =>
        {
            var p = _engine.Compute(first.AddDays(i), lat, lng, tz, new PanchangOptions(system));
            return new
            {
                date = p.Date,
                tithi = p.Tithis[0].Name,
                tithiSa = p.Tithis[0].NameSanskrit,
                tithiNumber = p.Tithis[0].Number,
                nakshatra = p.Nakshatras[0].Name,
                paksha = p.Paksha,
                masa = p.Masa,
                sunrise = p.Sunrise,
                sunset = p.Sunset,
                observances = p.Observances
            };
        }).ToList();
        return Ok(days);
    }
}
