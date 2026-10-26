using VedicPandit.Core.Dtos;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;
using VedicPandit.Infrastructure.Panchang;
using N = VedicPandit.Infrastructure.Panchang.PanchangNames;

namespace VedicPandit.Infrastructure.Muhurat;

/// <summary>
/// Scans a date range and returns time windows where tithi, nakshatra, vara and karana all satisfy the event's rule,
/// excluding Rahu Kaal, Yamaganda and Gulika. Each window carries human-readable reasons so the bot can explain it.
/// Note: lagna (ascendant) shuddhi, Guru/Shukra asta and individual birth-chart compatibility are NOT evaluated.
/// </summary>
public sealed class MuhuratEngine : IMuhuratEngine
{
    private readonly IPanchangEngine _panchang;
    public MuhuratEngine(IPanchangEngine panchang) => _panchang = panchang;

    public IReadOnlyList<(MuhuratEvent Event, string Name, string NameHi)> SupportedEvents =>
        MuhuratRules.All.Values.Select(r => (r.Event, r.Name, r.NameHi)).ToList();

    public MuhuratSearchResult Find(MuhuratEvent evt, DateOnly from, DateOnly to, double latitude, double longitude, string timeZoneId, int maxResults = 15)
    {
        var rule = MuhuratRules.All[evt];
        if (to < from) (from, to) = (to, from);
        if (to.DayNumber - from.DayNumber > 180) to = from.AddDays(180);

        var windows = new List<MuhuratWindow>();
        var notes = new SortedSet<string>();
        var opts = new PanchangOptions(MonthSystem.Amanta);

        for (var d = from; d <= to && windows.Count < maxResults; d = d.AddDays(1))
        {
            var p = _panchang.Compute(d, latitude, longitude, timeZoneId, opts);
            if (p.Sunrise is null || p.Sunset is null) continue;

            int masa = Array.IndexOf(N.Masa, p.Masa);
            int tithiAtRise = p.Tithis[0].Number;
            int sunRashi = Array.FindIndex(N.Rashi, r => p.SunRashi.StartsWith(r));

            if (rule.AvoidAdhikMasa && p.IsAdhikMasa) { notes.Add("Adhik (Purushottam) masa skipped"); continue; }
            if (rule.AvoidKharmas && (sunRashi == 8 || sunRashi == 11))
            { notes.Add("Kharmas skipped (Sun in Dhanu or Meena)"); continue; }
            if (rule.AvoidChaturmas && IsChaturmas(masa, tithiAtRise))
            { notes.Add("Chaturmas skipped (Devshayani to Prabodhini Ekadashi)"); continue; }
            if (!rule.Varas.Contains((int)d.DayOfWeek)) continue;

            var start = p.Sunrise.Value;
            var end = evt == MuhuratEvent.Vivah && p.NextSunrise.HasValue ? p.NextSunrise.Value : p.Sunset.Value;

            // Breakpoints: every element end + kaal boundaries
            var cuts = new SortedSet<DateTimeOffset> { start, end };
            void AddCuts(IEnumerable<PanchangElement> els) { foreach (var e in els) if (e.Ends is { } t && t > start && t < end) cuts.Add(t); }
            AddCuts(p.Tithis); AddCuts(p.Nakshatras); AddCuts(p.Karanas); AddCuts(p.Yogas);
            var kaals = new[] { p.RahuKaal, p.Yamaganda, p.Gulika }.Where(k => k != null).Select(k => k!).ToList();
            foreach (var k in kaals) { if (k.Start > start && k.Start < end) cuts.Add(k.Start); if (k.End > start && k.End < end) cuts.Add(k.End); }

            var pts = cuts.ToList();
            DateTimeOffset? runStart = null;
            PanchangElement? runTithi = null, runNak = null, runYoga = null;

            for (int i = 0; i < pts.Count - 1; i++)
            {
                var a = pts[i]; var b = pts[i + 1];
                var mid = a + (b - a) / 2;
                var tithi = Active(p.Tithis, mid);
                var nak = Active(p.Nakshatras, mid);
                var karana = Active(p.Karanas, mid);
                var yoga = Active(p.Yogas, mid);
                bool inKaal = kaals.Any(k => mid >= k.Start && mid < k.End);

                bool ok = !inKaal
                          && rule.AllowedTithis.Contains(tithi.Number)
                          && rule.Nakshatras.Contains(nak.Number)
                          && !karana.Name.StartsWith("Vishti");

                bool sameRun = runStart != null && runTithi == tithi && runNak == nak && runYoga == yoga;
                if (ok && sameRun) continue;

                if (runStart != null) Close(runStart.Value, a);
                if (ok) { runStart = a; runTithi = tithi; runNak = nak; runYoga = yoga; }
                else runStart = null;
            }
            if (runStart != null) Close(runStart.Value, pts[^1]);

            void Close(DateTimeOffset s, DateTimeOffset e)
            {
                if ((e - s).TotalMinutes < 30 || runTithi is null || runNak is null || runYoga is null) { runStart = null; return; }
                var reasons = new List<string>
                {
                    $"Nakshatra {runNak.Name} is favourable for {rule.Name}",
                    $"Tithi {runTithi.Name} is permitted",
                    $"{N.Vara[(int)d.DayOfWeek]} is a favourable weekday",
                    "Avoids Rahu Kaal, Yamaganda, Gulika and Bhadra (Vishti karana)"
                };
                int score = 60;
                if (runTithi.Number <= 15 && rule.PreferShuklaPaksha) { score += 10; reasons.Add("Shukla paksha (waxing moon)"); }
                if (N.InauspiciousYogas.Contains(runYoga.Number)) { score -= 15; reasons.Add($"Caution: {runYoga.Name} yoga is traditionally inauspicious"); }
                else score += 10;
                if (p.AbhijitMuhurat is { } ab && s < ab.End && e > ab.Start && p.AbhijitMuhurat.Quality is null)
                { score += 10; reasons.Add("Overlaps Abhijit Muhurat"); }
                if (runNak.Number is 4 or 8 or 27) score += 5; // Rohini, Pushya, Revati widely regarded as especially auspicious

                var win = new MuhuratWindow
                {
                    Date = d, Start = s, End = e,
                    Tithi = runTithi.Name, Nakshatra = runNak.Name, Yoga = runYoga.Name, Vara = N.Vara[(int)d.DayOfWeek],
                    Score = Math.Clamp(score, 0, 100), Reasons = reasons
                };
                var prev = windows.Count > 0 ? windows[^1] : null;
                if (prev != null && prev.Date == d && prev.End == s)
                {
                    // contiguous with the previous window: extend instead of listing twice
                    static string Join(string a, string b) => a == b || a.EndsWith(" → " + b) ? a : $"{a} → {b}";
                    windows[^1] = new MuhuratWindow
                    {
                        Date = d, Start = prev.Start, End = e, Vara = prev.Vara,
                        Tithi = Join(prev.Tithi, win.Tithi), Nakshatra = Join(prev.Nakshatra, win.Nakshatra), Yoga = Join(prev.Yoga, win.Yoga),
                        Score = Math.Min(prev.Score, win.Score), Reasons = prev.Reasons.Union(win.Reasons).ToList()
                    };
                }
                else windows.Add(win);
                runStart = null;
            }
        }

        return new MuhuratSearchResult
        {
            Event = evt.ToString(),
            EventName = rule.Name,
            From = from,
            To = to,
            Windows = windows.Take(maxResults).ToList(),
            Notes = notes.ToList(),
            Disclaimer = "Computed from tithi, nakshatra, vara, karana and kaal rules. Lagna shuddhi, Guru/Shukra asta and " +
                         "personal kundali matching are not evaluated - please confirm the final muhurat with your family purohit."
        };
    }

    private static PanchangElement Active(List<PanchangElement> els, DateTimeOffset t)
    {
        foreach (var e in els) if (e.Ends is null || e.Ends.Value > t) return e;
        return els[^1];
    }

    /// <summary>Chaturmas: Ashadha Shukla Ekadashi to Kartika Shukla Ekadashi (amanta month indices 3..7).</summary>
    private static bool IsChaturmas(int amantaMasa, int tithi) =>
        (amantaMasa == 3 && tithi >= 11 && tithi <= 30) || amantaMasa is 4 or 5 or 6 || (amantaMasa == 7 && tithi < 11);
}
