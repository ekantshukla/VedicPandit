using VedicPandit.Core.Dtos;
using VedicPandit.Core.Interfaces;
using VedicPandit.Core.Models;
using VedicPandit.Infrastructure.Astronomy;
using static VedicPandit.Infrastructure.Astronomy.AstroMath;
using N = VedicPandit.Infrastructure.Panchang.PanchangNames;

namespace VedicPandit.Infrastructure.Panchang;

/// <summary>
/// Computes a full drik (astronomical) panchang for any date and location.
/// Conventions: elements are taken at local sunrise (udaya tithi), sunrise = upper limb with standard refraction (-0.833°),
/// sidereal positions with Lahiri ayanamsa. Verified against Drik Panchang (New Delhi, 26-Oct-2026) to the minute.
/// </summary>
public sealed class PanchangEngine : IPanchangEngine
{
    private const double NakSpan = 360.0 / 27.0;

    // ---- angle functions of jdUt ----
    private static double Tt(double jdUt) => jdUt + DeltaTDays(jdUt);
    public static double SunSidereal(double jdUt) { var t = Tt(jdUt); return Norm360(SunPosition.MeanEquinoxLongitude(t) - AyanamsaCalc.Lahiri(t)); }
    public static double MoonSidereal(double jdUt) { var t = Tt(jdUt); return Norm360(MoonPosition.MeanEquinoxLongitude(t) - AyanamsaCalc.Lahiri(t)); }
    public static double Elongation(double jdUt) { var t = Tt(jdUt); return Norm360(MoonPosition.MeanEquinoxLongitude(t) - SunPosition.MeanEquinoxLongitude(t)); }
    private static double YogaAngle(double jdUt) => Norm360(SunSidereal(jdUt) + MoonSidereal(jdUt));

    public PanchangResult Compute(DateOnly date, double latitude, double longitude, string timeZoneId, PanchangOptions? options = null)
    {
        options ??= new PanchangOptions();
        var tz = ResolveTimeZone(timeZoneId);

        var localMidnight = date.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        var offset = tz.GetUtcOffset(localMidnight.AddHours(12));
        var midnightUtc = new DateTimeOffset(localMidnight, offset).ToUniversalTime();
        double jdMid = ToJulianDay(midnightUtc);

        double? rise = SunEvent(jdMid, offset.TotalHours, latitude, longitude, rising: true);
        double? set = SunEvent(jdMid, offset.TotalHours, latitude, longitude, rising: false);
        double? nextRise = SunEvent(jdMid + 1, offset.TotalHours, latitude, longitude, rising: true);

        // Polar fallback: use 06:00 / 18:00 local
        double r = rise ?? jdMid + 0.25;
        double s = set ?? jdMid + 0.75;
        double nr = nextRise ?? jdMid + 1.25;

        DateTimeOffset Local(double jd) => TimeZoneInfo.ConvertTime(FromJulianDay(jd), tz);

        // ---- Five limbs between sunrise and next sunrise ----
        var tithis = Segments(Elongation, 12.0, 30, r, nr, i =>
        {
            var (name, sa) = N.TithiName(i + 1);
            return (i + 1, name, sa, (string?)null);
        }, Local);

        var nakshatras = Segments(MoonSidereal, NakSpan, 27, r, nr, i =>
        {
            double moonAtRise = MoonSidereal(r);
            int pada = (int)Math.Floor(Norm360(moonAtRise - i * NakSpan) / (NakSpan / 4)) + 1;
            return (i + 1, N.Nakshatra[i], N.NakshatraSa[i], (string?)$"(pada {Math.Clamp(pada, 1, 4)} at sunrise)");
        }, Local);
        // pada only meaningful for the sunrise nakshatra
        for (int k = 1; k < nakshatras.Count; k++) nakshatras[k] = nakshatras[k] with { Extra = null };

        var yogas = Segments(YogaAngle, NakSpan, 27, r, nr, i => (i + 1, N.Yoga[i], N.YogaSa[i], (string?)null), Local);
        var karanas = Segments(Elongation, 6.0, 60, r, nr, i =>
        {
            int k = N.KaranaIndex(i);
            return (k + 1, N.Karana[k], N.KaranaSa[k], (string?)null);
        }, Local);

        int tithiAtRise = tithis[0].Number;
        string paksha = tithiAtRise <= 15 ? "Shukla Paksha" : "Krishna Paksha";

        // Vara = weekday of the civil date (the Hindu day begins at sunrise, which falls on this civil date)
        int weekday = (int)date.DayOfWeek;
        var vara = new PanchangElement(weekday + 1, N.Vara[weekday], N.VaraSa[weekday], null);

        // ---- Lunar month ----
        var (amantaIdx, isAdhik) = LunarMonth(r);
        int masaIdx = options.Months == MonthSystem.Purnimanta && tithiAtRise > 15 ? (amantaIdx + 1) % 12 : amantaIdx;

        int vikram = date.Month <= 4 && amantaIdx >= 8 ? date.Year + 56 : date.Year + 57;
        int shaka = vikram - 135;

        double sunSid = SunSidereal(r);
        double moonSid = MoonSidereal(r);
        string ayana = sunSid >= 270 || sunSid < 90 ? "Uttarayana" : "Dakshinayana";

        // ---- Kaal (inauspicious periods) and muhurats ----
        double dayLen = s - r;
        TimeWindow Eighth(string name, int seg) => new(name, Local(r + dayLen * (seg - 1) / 8), Local(r + dayLen * seg / 8));
        var rahu = Eighth("Rahu Kaal", N.RahuSegment[weekday]);
        var yama = Eighth("Yamaganda", N.YamagandaSegment[weekday]);
        var gulika = Eighth("Gulika Kaal", N.GulikaSegment[weekday]);

        double muhurta = dayLen / 15;
        var abhijit = new TimeWindow("Abhijit Muhurat", Local(r + 7 * muhurta), Local(r + 8 * muhurta),
            weekday == 3 ? "Traditionally not used on Wednesday" : null);
        double nightMuhurta = (nr - s) / 15;
        var brahma = new TimeWindow("Brahma Muhurat", Local(r - 2 * nightMuhurta), Local(r - nightMuhurta));

        var dayChog = new List<TimeWindow>();
        var nightChog = new List<TimeWindow>();
        double nightLen = nr - s;
        for (int i = 0; i < 8; i++)
        {
            string dn = N.DayChoghadiyaCycle[(N.DayChoghadiyaStart[weekday] + i) % 7];
            dayChog.Add(new TimeWindow(dn, Local(r + dayLen * i / 8), Local(r + dayLen * (i + 1) / 8), N.ChoghadiyaQuality(dn)));
            string nn = N.NightChoghadiyaCycle[(N.NightChoghadiyaStart[weekday] + i) % 7];
            nightChog.Add(new TimeWindow(nn, Local(s + nightLen * i / 8), Local(s + nightLen * (i + 1) / 8), N.ChoghadiyaQuality(nn)));
        }

        var observances = Observances(tithiAtRise, amantaIdx, isAdhik, new ObservanceTithis(
            Madhyahna: TithiAt(r + dayLen / 2), Aparahna: TithiAt(r + dayLen * 0.7), Pradosh: TithiAt(s),
            Nishita: TithiAt((s + nr) / 2), PrevMadhyahna: TithiAt(r - 1 + dayLen / 2), PrevAparahna: TithiAt(r - 1 + dayLen * 0.7),
            PrevPradosh: TithiAt(s - 1), PrevNishita: TithiAt(r - nightLen / 2),
            Arunodaya: TithiAt(r - ArunodayaDays), PrevArunodaya: TithiAt(r - 1 - ArunodayaDays), PrevSunrise: TithiAt(r - 1)));
        // Sankranti between sunrise and next sunrise
        int rashiAtRise = (int)Math.Floor(sunSid / 30);
        int rashiNext = (int)Math.Floor(SunSidereal(nr) / 30);
        if (rashiNext != rashiAtRise)
        {
            double? sk = FindAngleCrossing(SunSidereal, rashiNext * 30.0, r, 1.5, 0.25);
            string when = sk.HasValue ? $" at {Local(sk.Value):HH:mm}" : "";
            observances.Insert(0, $"{N.Rashi[rashiNext]} Sankranti{when}" + (rashiNext == 9 ? " (Makar Sankranti)" : ""));
        }

        return new PanchangResult
        {
            Date = date,
            Latitude = latitude,
            Longitude = longitude,
            TimeZone = timeZoneId,
            MonthSystem = options.Months.ToString(),
            Sunrise = rise.HasValue ? Local(rise.Value) : null,
            Sunset = set.HasValue ? Local(set.Value) : null,
            NextSunrise = nextRise.HasValue ? Local(nextRise.Value) : null,
            Vara = vara,
            Tithis = tithis,
            Nakshatras = nakshatras,
            Yogas = yogas,
            Karanas = karanas,
            Paksha = paksha,
            Masa = N.Masa[masaIdx],
            MasaSanskrit = N.MasaSa[masaIdx],
            IsAdhikMasa = isAdhik,
            VikramSamvat = vikram,
            ShakaSamvat = shaka,
            Ritu = N.Ritu[amantaIdx / 2],
            Ayana = ayana,
            SunRashi = $"{N.Rashi[rashiAtRise]} ({N.RashiSa[rashiAtRise]})",
            MoonRashi = $"{N.Rashi[(int)Math.Floor(moonSid / 30)]} ({N.RashiSa[(int)Math.Floor(moonSid / 30)]})",
            RahuKaal = rahu,
            Yamaganda = yama,
            Gulika = gulika,
            AbhijitMuhurat = abhijit,
            BrahmaMuhurat = brahma,
            DayChoghadiya = dayChog,
            NightChoghadiya = nightChog,
            Observances = observances,
            Ayanamsa = AyanamsaCalc.Lahiri(Tt(r))
        };
    }

    /// <summary>Walks an increasing angle from start to end, emitting each segment (of width <paramref name="span"/>) with its end time.</summary>
    private static List<PanchangElement> Segments(Func<double, double> angle, double span, int count, double start, double end,
        Func<int, (int Number, string Name, string Sa, string? Extra)> describe, Func<double, DateTimeOffset> local)
    {
        var list = new List<PanchangElement>();
        double t = start;
        int idx = (int)Math.Floor(angle(t) / span) % count;
        for (int guard = 0; guard < 5; guard++)
        {
            double target = ((idx + 1) % count) * span;
            double? ends = FindAngleCrossing(angle, target, t, 2.0, span <= 6.0 ? 0.1 : 0.2);
            var d = describe(idx);
            bool endsInWindow = ends.HasValue && ends.Value < end;
            list.Add(new PanchangElement(d.Number, d.Name, d.Sa, ends.HasValue ? local(ends.Value) : null, d.Extra));
            if (!endsInWindow) break;
            t = ends!.Value + 1e-6;
            idx = (idx + 1) % count;
        }
        return list;
    }

    /// <summary>Sunrise or sunset JD (UT) for the local civil day starting at jdLocalMidnight; null if the Sun does not cross the horizon.</summary>
    public static double? SunEvent(double jdLocalMidnight, double tzHours, double lat, double lng, bool rising)
    {
        double noon = jdLocalMidnight + 0.5 + (tzHours - lng / 15.0) / 24.0;
        double F(double j) => SunPosition.Altitude(j, lat, lng) + 0.833;
        double a = rising ? noon - 0.5 : noon, b = rising ? noon : noon + 0.5;
        if ((F(a) > 0) == (F(b) > 0)) return null;
        return Bisect(F, a, b, 40);
    }

    /// <summary>Amanta lunar month index (0 = Chaitra) containing jd, and whether it is an Adhik (intercalary) month.</summary>
    public static (int MasaIndex, bool IsAdhik) LunarMonth(double jd)
    {
        double elong = Elongation(jd);
        double approxPrev = jd - elong / 360.0 * 29.530588 - 2.0;
        double prevNewMoon = FindAngleCrossing(Elongation, 0, approxPrev, 4, 0.25) ?? jd - elong / 12.19;
        if (prevNewMoon > jd) prevNewMoon -= 29.530588; // safety
        double nextNewMoon = FindAngleCrossing(Elongation, 0, prevNewMoon + 25, 8, 0.25) ?? prevNewMoon + 29.53;

        int rashiPrev = (int)Math.Floor(SunSidereal(prevNewMoon) / 30);
        int rashiNext = (int)Math.Floor(SunSidereal(nextNewMoon) / 30);
        bool adhik = rashiPrev == rashiNext;
        return ((rashiPrev + 1) % 12, adhik);
    }

    private static int TithiAt(double jd) => (int)Math.Floor(Elongation(jd) / 12) + 1;

    /// <summary>Tithi prevailing at the kaal that decides each festival.</summary>
    private readonly record struct ObservanceTithis(int Madhyahna, int Aparahna, int Pradosh, int Nishita,
        int PrevMadhyahna, int PrevAparahna, int PrevPradosh, int PrevNishita, int Arunodaya, int PrevArunodaya, int PrevSunrise);

    /// <summary>Arunodaya: 4 ghatis (96 minutes) before sunrise. Vaishnavas reject an Ekadashi that Dashami touches at arunodaya.</summary>
    public const double ArunodayaDays = 96.0 / 1440;

    /// <summary>
    /// Smarta Ekadashi: the first day with Ekadashi at sunrise (when it spans two sunrises, families keep the first). Vaishnava Ekadashi: the first day Ekadashi holds at arunodaya; if Ekadashi
    /// never reaches an arunodaya (Dashami at one, Dvadashi at the next), the fast is on that Dvadashi day.
    /// When both fall on the same day it is just "Ekadashi".
    /// </summary>
    public static string? Ekadashi(int tithi, int aruna, int prevAruna, int prevSunrise = 0)
    {
        static bool IsE(int x) => x is 11 or 26;
        // Kshaya Ekadashi (Dashami at one sunrise, Dvadashi at the next): the fast is on that Dvadashi day
        bool smarta = (IsE(tithi) && prevSunrise != tithi) || ((tithi is 12 or 27) && prevSunrise == tithi - 2);
        bool vaishnava = (IsE(aruna) && aruna != prevAruna) || ((aruna is 12 or 27) && prevAruna == aruna - 2);
        return (smarta, vaishnava) switch
        {
            (true, true) => "Ekadashi",
            (true, false) => "Ekadashi (Smarta)",
            (false, true) => "Ekadashi (Vaishnava)",
            _ => null,
        };
    }

    /// <summary>A kaal-based festival falls on the first day whose kaal has the tithi (skipped if yesterday's kaal already had it).</summary>
    private static bool FirstAt(Dictionary<(int, int), string> table, int masa, int now, int prev, out string? f)
    {
        f = null;
        return now != prev && table.TryGetValue((masa, now), out f);
    }

    private static List<string> Observances(int tithi, int amantaMasa, bool adhik, ObservanceTithis t)
    {
        var o = new List<string>();
        if (Ekadashi(tithi, t.Arunodaya, t.PrevArunodaya, t.PrevSunrise) is { } ek) o.Add(ek);
        switch (tithi)
        {
            case 4: o.Add("Vinayaka Chaturthi"); break;
            case 13: case 28: o.Add("Pradosh Vrat (confirm Trayodashi at pradosh kaal)"); break;
            case 15: o.Add("Purnima"); break;
            case 19: o.Add("Sankashti Chaturthi"); break;
            case 29: o.Add("Masik Shivaratri"); break;
            case 30: o.Add("Amavasya"); break;
        }
        if (adhik) { o.Add("Adhik Masa (Purushottam Maas)"); return o; }

        var major = new Dictionary<(int, int), string>
        {
            [(0, 1)] = "Chaitra Navratri begins / Gudi Padwa / Ugadi",
            [(1, 3)] = "Akshaya Tritiya",
            [(3, 11)] = "Devshayani Ekadashi (Chaturmas begins)",
            [(3, 15)] = "Guru Purnima",
            [(4, 5)] = "Nag Panchami",
            [(4, 15)] = "Raksha Bandhan",
            [(6, 1)] = "Sharad Navratri begins",
            [(6, 15)] = "Sharad Purnima",
            [(7, 1)] = "Govardhan Puja",
            [(7, 2)] = "Bhai Dooj",
            [(7, 11)] = "Prabodhini (Dev Uthani) Ekadashi (Chaturmas ends)",
            [(7, 15)] = "Kartik Purnima / Dev Deepawali",
            [(10, 5)] = "Vasant Panchami",
            [(11, 16)] = "Holi",
        };
        // Decided by the tithi prevailing at pradosh (sunset) or nishita (midnight) rather than at sunrise
        var atPradosh = new Dictionary<(int, int), string>
        {
            [(6, 19)] = "Karwa Chauth", [(6, 28)] = "Dhanteras", [(6, 30)] = "Diwali (Lakshmi Puja)", [(11, 15)] = "Holika Dahan",
        };
        var atNishita = new Dictionary<(int, int), string> { [(4, 23)] = "Krishna Janmashtami", [(10, 29)] = "Maha Shivaratri" };
        var atMadhyahna = new Dictionary<(int, int), string> { [(0, 9)] = "Ram Navami", [(5, 4)] = "Ganesh Chaturthi" };
        var atAparahna = new Dictionary<(int, int), string> { [(6, 10)] = "Vijayadashami (Dussehra)" };

        if (major.TryGetValue((amantaMasa, tithi), out var f)
            || FirstAt(atMadhyahna, amantaMasa, t.Madhyahna, t.PrevMadhyahna, out f)
            || FirstAt(atAparahna, amantaMasa, t.Aparahna, t.PrevAparahna, out f)
            || FirstAt(atPradosh, amantaMasa, t.Pradosh, t.PrevPradosh, out f)
            || FirstAt(atNishita, amantaMasa, t.Nishita, t.PrevNishita, out f)
            // Nishita tithi spanning neither midnight: observe on the day it prevails at sunrise
            || (t.Nishita == tithi + 1 && t.PrevNishita != tithi && atNishita.TryGetValue((amantaMasa, tithi), out f)))
            o.Insert(0, f!);
        return o;
    }

    public static TimeZoneInfo ResolveTimeZone(string id)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(string.IsNullOrWhiteSpace(id) ? "Asia/Kolkata" : id); }
        catch (TimeZoneNotFoundException)
        {
            // Windows without ICU: try the Windows id for IST
            try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
            catch { return TimeZoneInfo.CreateCustomTimeZone("IST", TimeSpan.FromHours(5.5), "IST", "IST"); }
        }
    }
}
