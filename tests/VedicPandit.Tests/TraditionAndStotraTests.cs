using VedicPandit.Infrastructure.AI;
using VedicPandit.Infrastructure.Panchang;
using Xunit;

namespace VedicPandit.Tests;

public class TraditionAndStotraTests
{
    [Theory]
    [InlineData(11, 11, 10, "Ekadashi")]               // Ekadashi at arunodaya and sunrise: one day for everyone
    [InlineData(11, 10, 10, "Ekadashi (Smarta)")]      // Dashami still at arunodaya: Vaishnavas wait a day
    [InlineData(12, 11, 10, "Ekadashi (Vaishnava)")]   // ...and fast the next day
    [InlineData(12, 12, 10, "Ekadashi (Vaishnava)")]   // Ekadashi touched no arunodaya: fast on Dvadashi
    [InlineData(26, 26, 25, "Ekadashi")]               // Krishna paksha
    [InlineData(12, 12, 11, null)]                     // the day after a normal Ekadashi
    public void Ekadashi_rules_basic(int sunriseTithi, int arunodaya, int prevArunodaya, string? expected) =>
        Assert.Equal(expected, PanchangEngine.Ekadashi(sunriseTithi, arunodaya, prevArunodaya, sunriseTithi - 1));

    [Theory]
    [InlineData(11, 10, 10, 10, "Ekadashi (Smarta)")]  // Ekadashi at two sunrises (vriddhi), day 1: Smarta
    [InlineData(11, 11, 10, 11, "Ekadashi (Vaishnava)")] // day 2: Vaishnava
    public void Ekadashi_vriddhi(int sunriseTithi, int arunodaya, int prevArunodaya, int prevSunrise, string? expected) =>
        Assert.Equal(expected, PanchangEngine.Ekadashi(sunriseTithi, arunodaya, prevArunodaya, prevSunrise));

    /// <summary>26–27 May 2026 (Adhik Jyeshtha): Ekadashi holds at both sunrises in New Delhi.</summary>
    [Fact]
    public void May_2026_vriddhi_ekadashi_splits_smarta_and_vaishnava()
    {
        var e = new PanchangEngine();
        Assert.Contains(e.Compute(new DateOnly(2026, 5, 26), 28.6139, 77.209, "Asia/Kolkata").Observances, o => o == "Ekadashi (Smarta)");
        Assert.Contains(e.Compute(new DateOnly(2026, 5, 27), 28.6139, 77.209, "Asia/Kolkata").Observances, o => o == "Ekadashi (Vaishnava)");
    }

    [Fact]
    public void Every_paksha_of_2026_has_one_ekadashi_for_each_tradition()
    {
        var engine = new PanchangEngine();
        int smarta = 0, vaishnava = 0;
        string? pendingSmarta = null;
        for (var d = new DateOnly(2026, 1, 1); d.Year == 2026; d = d.AddDays(1))
        {
            var pr = engine.Compute(d, 28.6139, 77.209, "Asia/Kolkata");
            var obs = pr.Observances;
            if (obs.Contains("Ekadashi")) { smarta++; vaishnava++; }
            if (obs.Contains("Ekadashi (Smarta)")) { smarta++; pendingSmarta = d.ToString(); }
            if (obs.Contains("Ekadashi (Vaishnava)"))
            {
                vaishnava++;
                // A split Ekadashi puts the Vaishnava fast on the day after the Smarta one
                if (pendingSmarta is not null) Assert.Equal(DateOnly.Parse(pendingSmarta).AddDays(1), d);
                pendingSmarta = null;
            }
        }
        Assert.InRange(smarta, 24, 26);   // 24 or 25 pakshas end in a year, plus Adhik masa in 2026
        Assert.InRange(vaishnava, 24, 26);
    }

    [Fact]
    public void Stotra_library_loads_with_credits()
    {
        var store = Fixture.Store();
        Assert.True(store.Mantras.Count >= 50, $"only {store.Mantras.Count} entries");
        var vsn = store.FindMantra("vishnu-sahasranama")!;
        Assert.Equal("stotra", vsn.Kind);
        Assert.Contains("sanskritdocuments.org", vsn.Credit);
        Assert.Contains("विश्वं विष्णुर्वषट्कारो", vsn.Sanskrit);
        Assert.True(vsn.Sanskrit.Split("\n\n").Length > 100);
        Assert.Equal("[]", vsn.TimingJson);   // long texts are timed in the browser, verse by verse
        Assert.Contains("जय हनुमान ज्ञान गुन सागर", store.FindMantra("hanuman-chalisa")!.Sanskrit);
        Assert.Contains("तत्प्रणमामि सदाशिवलिङ्गम्", store.FindMantra("lingashtakam")!.Sanskrit);
        Assert.NotEqual("[]", store.FindMantra("gayatri")!.TimingJson);
        foreach (var m in store.Mantras)
        {
            Assert.False(string.IsNullOrWhiteSpace(m.Source), m.Slug);
            Assert.DoesNotContain("+++", m.Sanskrit, m.Slug);
            Assert.DoesNotContain("**", m.Sanskrit, m.Slug);
        }
    }

    [Fact]
    public void Prompt_carries_the_sampradaya()
    {
        var p = PromptLibrary.System("hi", new DateOnly(2026, 10, 27), "Asia/Kolkata", "vaishnava");
        Assert.Contains("Vaishnava", p);
        Assert.Contains("arunodaya", p);
        Assert.Contains("mention both", PromptLibrary.System("en", new DateOnly(2026, 10, 27), "Asia/Kolkata"));
    }
}
