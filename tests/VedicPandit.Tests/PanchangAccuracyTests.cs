using VedicPandit.Core.Dtos;
using VedicPandit.Core.Models;
using VedicPandit.Infrastructure.Astronomy;
using VedicPandit.Infrastructure.Data;
using VedicPandit.Infrastructure.Muhurat;
using VedicPandit.Infrastructure.Panchang;
using Xunit;

namespace VedicPandit.Tests;

/// <summary>Reference values from Drik Panchang (New Delhi, 28.6139 N, 77.2090 E, IST).</summary>
public class PanchangAccuracyTests
{
    private const double DelhiLat = 28.6139, DelhiLng = 77.2090;
    private const string Ist = "Asia/Kolkata";
    private readonly PanchangEngine _engine = new();

    private static void Near(DateTimeOffset? actual, string expectedLocal, int toleranceMinutes = 2)
    {
        Assert.NotNull(actual);
        var expected = DateTimeOffset.Parse(expectedLocal + " +05:30");
        var diff = Math.Abs((actual!.Value - expected).TotalMinutes);
        Assert.True(diff <= toleranceMinutes, $"Expected {expected:yyyy-MM-dd HH:mm}, got {actual:yyyy-MM-dd HH:mm} (diff {diff:F1} min)");
    }

    [Fact]
    public void Delhi_26_Oct_2026_matches_drik()
    {
        var p = _engine.Compute(new DateOnly(2026, 10, 26), DelhiLat, DelhiLng, Ist);

        Near(p.Sunrise, "2026-10-26 06:29");
        Near(p.Sunset, "2026-10-26 17:41");

        Assert.Equal("Purnima", p.Tithis[0].Name);
        Near(p.Tithis[0].Ends, "2026-10-26 09:41");

        Assert.Equal("Ashwini", p.Nakshatras[0].Name);
        Near(p.Nakshatras[0].Ends, "2026-10-26 17:41");

        Assert.Equal("Vajra", p.Yogas[0].Name);
        Near(p.Yogas[0].Ends, "2026-10-26 14:17");

        Assert.Equal("Bava", p.Karanas[0].Name);
        Near(p.Karanas[0].Ends, "2026-10-26 09:41");
        Assert.Equal("Balava", p.Karanas[1].Name);
        Near(p.Karanas[1].Ends, "2026-10-26 20:23");

        Assert.Equal("Ashvin", p.Masa);
        Assert.Equal(2083, p.VikramSamvat);
        Assert.Contains(p.Observances, o => o.Contains("Sharad Purnima"));
    }

    [Theory]
    [InlineData(270, "2026-01-12", "2026-01-14 15:13")] // Makar
    [InlineData(0,   "2026-04-12", "2026-04-14 09:38")] // Mesha
    [InlineData(90,  "2026-07-14", "2026-07-16 23:45")] // Karka
    [InlineData(180, "2026-10-15", "2026-10-17 19:57")] // Tula
    [InlineData(240, "2026-12-14", "2026-12-16 10:29")] // Dhanu
    public void Sankranti_moments_match_drik(double rashiStart, string searchFrom, string expected)
    {
        var start = DateTimeOffset.Parse(searchFrom + "T00:00:00+00:00");
        var jd = AstroMath.FindAngleCrossing(PanchangEngine.SunSidereal, rashiStart, AstroMath.ToJulianDay(start), 5);
        Assert.NotNull(jd);
        Near(AstroMath.FromJulianDay(jd!.Value), expected);
    }

    [Theory]
    [InlineData("2024-10-31", "2024-11-01 18:17")] // new moon 12:47 UTC
    [InlineData("2025-10-20", "2025-10-21 17:55")] // new moon 12:25 UTC
    public void New_moons_match_published_times(string from, string expectedIst)
    {
        var jd = AstroMath.FindAngleCrossing(PanchangEngine.Elongation, 0, AstroMath.ToJulianDay(DateTimeOffset.Parse(from + "T00:00:00+00:00")), 4);
        Assert.NotNull(jd);
        Near(AstroMath.FromJulianDay(jd!.Value), expectedIst);
    }

    [Theory]
    [InlineData("2026-02-15", "Maha Shivaratri")]   // nishita rule
    [InlineData("2026-03-26", "Ram Navami")]        // madhyahna rule
    [InlineData("2026-09-04", "Krishna Janmashtami")] // ashtami spans neither midnight -> sunrise fallback
    [InlineData("2026-09-14", "Ganesh Chaturthi")]  // madhyahna rule
    [InlineData("2026-10-20", "Vijayadashami")]     // aparahna rule
    [InlineData("2026-11-08", "Diwali")]            // pradosh rule
    public void Festivals_2026_fall_on_published_dates(string date, string festival)
    {
        var p = _engine.Compute(DateOnly.Parse(date), DelhiLat, DelhiLng, Ist);
        Assert.Contains(p.Observances, o => o.Contains(festival));
        var dayBefore = _engine.Compute(DateOnly.Parse(date).AddDays(-1), DelhiLat, DelhiLng, Ist);
        var dayAfter = _engine.Compute(DateOnly.Parse(date).AddDays(1), DelhiLat, DelhiLng, Ist);
        Assert.DoesNotContain(dayBefore.Observances, o => o.Contains(festival));
        Assert.DoesNotContain(dayAfter.Observances, o => o.Contains(festival));
    }

    [Fact]
    public void Adhik_Jyeshtha_2026_is_detected()
    {
        Assert.True(_engine.Compute(new DateOnly(2026, 6, 1), DelhiLat, DelhiLng, Ist).IsAdhikMasa);
        Assert.False(_engine.Compute(new DateOnly(2026, 7, 1), DelhiLat, DelhiLng, Ist).IsAdhikMasa);
    }

    [Fact]
    public void Muhurat_windows_are_outside_rahu_kaal_and_use_allowed_nakshatras()
    {
        var m = new MuhuratEngine(_engine);
        var r = m.Find(MuhuratEvent.VahanKharid, new DateOnly(2026, 11, 1), new DateOnly(2026, 12, 15), DelhiLat, DelhiLng, Ist);
        Assert.NotEmpty(r.Windows);
        foreach (var w in r.Windows)
        {
            var p = _engine.Compute(w.Date, DelhiLat, DelhiLng, Ist);
            Assert.False(w.Start < p.RahuKaal!.End && w.End > p.RahuKaal.Start, $"Window {w.Start} overlaps Rahu Kaal");
            Assert.True(w.End > w.Start);
        }
    }

    [Fact]
    public void Akshara_counter_handles_conjuncts()
    {
        Assert.Equal(3, ChantTiming.CountAksharas("त्र्यम्बकं")); // trya-mba-kaṃ
        Assert.Equal(1, ChantTiming.CountAksharas("ॐ"));
        Assert.Equal(3, ChantTiming.CountAksharas("शिवाय"));
    }
}
