using System.Text;
using VedicPandit.Infrastructure.Astronomy;

namespace VedicPandit.Infrastructure.Rashifal;

/// <summary>
/// Rashifal by Moon sign from the real transits (port of vedic-pandit-client/src/app/core/astro/rashifal.ts — keep in sync).
/// Day: house of the transiting Moon from the rashi (Chandra gochar), half a star up/down by the weekday lord's natural
/// friendship with the rashi lord. Month: house of the transiting Sun. Gives the model facts; it writes the reading.
/// </summary>
public static class RashifalCalc
{
    public static readonly string[] Rashi = { "Mesha", "Vrishabha", "Mithuna", "Karka", "Simha", "Kanya", "Tula", "Vrishchika", "Dhanu", "Makara", "Kumbha", "Meena" };
    private static readonly string[] Western = { "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces" };
    private static readonly string[] Graha = { "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn" };
    private static readonly int[] Lord = { 2, 5, 3, 1, 0, 3, 5, 2, 4, 6, 6, 4 };
    private static readonly string[] Colour = { "Orange", "White", "Red", "Green", "Yellow", "Pink", "Blue" };
    private static readonly int[] Number = { 1, 2, 9, 5, 3, 6, 8 };
    private static readonly string[] Upay =
    {
        "Offer water to Surya at sunrise; Aditya Hridayam", "Offer water or milk to a Shivalinga; Om Namah Shivaya",
        "Hanuman Chalisa", "Offer durva to Ganesha; Om Gam Ganapataye Namah", "Worship Vishnu, respect elders; Om Namo Bhagavate Vasudevaya",
        "Light a ghee lamp for Lakshmi; Mahalakshmi mantra", "Light a sesame-oil lamp, help someone in need; Shani stotra",
    };
    private static readonly int[,] Friend =
    {
        { 1, 1, 1, 0, 1, -1, -1 }, { 1, 1, 0, 1, 0, 0, 0 }, { 1, 1, 1, -1, 1, 0, 0 }, { 1, -1, 0, 1, 0, 1, 0 },
        { 1, 1, 1, -1, 1, -1, 0 }, { -1, -1, 0, 1, 0, 1, 1 }, { -1, -1, -1, 1, 0, 1, 1 },
    };
    private static readonly double[] MoonBase = { 0, 4, 2, 5, 2, 2, 4, 4, 1, 3, 5, 5, 2 };
    private static readonly double[] SunBase = { 0, 2, 2, 5, 2, 3, 5, 3, 2, 3, 5, 5, 2 };
    private static readonly string[] MoonHouse =
    {
        "",
        "Moon in own sign: steady mind, comfort, good food; good to start pending work; warm family time; energy good (don't overeat).",
        "Money slips out, words carry weight: speak softly, check accounts, payments may be delayed; care for eyes/throat.",
        "Courage and success; efforts pay off; good for calls, meetings, short trips; siblings/friends help; high energy.",
        "Mind may feel unsettled: keep the day simple, avoid big property/vehicle/job decisions; mother/home need attention; rest.",
        "Plans move slowly: be patient, avoid speculation; students revise; small misunderstandings, children need attention; digestion.",
        "Victory over obstacles and rivals; finish pending work, clear dues; helping others brings goodwill; health improves.",
        "Partnerships and social life favoured: good for meetings and deals; harmony with spouse/partner; respect; good health.",
        "Keep a low profile: avoid risks and arguments, postpone signing important papers; stay calm at home; drive carefully.",
        "Luck slow but elders' blessings and prayer help; good for dharma and study; results take time, no shortcuts.",
        "Strong day for work: recognition, seniors notice; do important work today; respect in family; busy.",
        "Day of gains: wishes fulfilled, friends bring good news, income likely; joyful social time.",
        "Expenses and running around: postpone big purchases; good for prayer, rest and charity; someone close may feel distant; sleep well.",
    };
    private static readonly string[] SunHouse =
    {
        "", "Sun in own sign: confidence up, also ego/heat; lead but listen.", "Money and family need care; avoid lending.",
        "Courage and progress; efforts succeed.", "Home and peace of mind need attention; avoid property disputes.",
        "Plans and children need patience; avoid speculation.", "Beat competition, clear debts; health improves.",
        "Partnerships need understanding; avoid ego clashes with spouse/partner.", "Go slow; care with health and money.",
        "Mixed luck; respect elders, keep up prayers.", "Excellent for career: recognition, authority, support from seniors.",
        "Gains and fulfilled wishes; income rises.", "Expenses and travel; good for spiritual practice; rest well.",
    };

    private static double Tt(double jdUt) => jdUt + AstroMath.DeltaTDays(jdUt);
    public static double MoonSidereal(double jdUt) { var t = Tt(jdUt); return AstroMath.Norm360(MoonPosition.MeanEquinoxLongitude(t) - AyanamsaCalc.Lahiri(t)); }
    public static double SunSidereal(double jdUt) { var t = Tt(jdUt); return AstroMath.Norm360(SunPosition.MeanEquinoxLongitude(t) - AyanamsaCalc.Lahiri(t)); }
    private static int Sign(double lon) => (int)Math.Floor(lon / 30) % 12;
    private static int House(int rashi, int transit) => ((transit - rashi + 12) % 12) + 1;

    private static DateTimeOffset LocalTime(DateOnly date, int hour, TimeZoneInfo tz)
    {
        var local = date.ToDateTime(new TimeOnly(hour, 0), DateTimeKind.Unspecified);
        return new DateTimeOffset(local, tz.GetUtcOffset(local));
    }
    private static double Score(double baseScore, int rashi, int dayLord) => Math.Clamp(baseScore + Friend[Lord[rashi], dayLord] * 0.5, 1, 5);

    /// <summary>"mesh", "मेष", "Aries", "Scorpio"… → 0..11.</summary>
    public static int? Parse(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        var t = s.Trim().ToLowerInvariant();
        string[][] aliases =
        {
            new[] { "mesh", "aries", "मेष" }, new[] { "vrishabh", "vrish", "taurus", "वृषभ", "वृष" }, new[] { "mithun", "gemini", "मिथुन" },
            new[] { "kark", "cancer", "कर्क" }, new[] { "simh", "singh", "leo", "सिंह" }, new[] { "kanya", "virgo", "कन्या" },
            new[] { "tula", "libra", "तुला" }, new[] { "vrishchik", "vrischik", "scorpio", "वृश्चिक" }, new[] { "dhanu", "sagittarius", "धनु" },
            new[] { "makar", "capricorn", "मकर" }, new[] { "kumbh", "aquarius", "कुंभ", "कुम्भ" }, new[] { "meen", "pisces", "मीन" },
        };
        for (int i = 0; i < 12; i++)
            if (t == Rashi[i].ToLowerInvariant() || t == Western[i].ToLowerInvariant()) return i;
        // longest alias first so "vrishchik" is not taken for "vrish"
        foreach (var (alias, i) in aliases.SelectMany((arr, idx) => arr.Select(x => (x, idx))).OrderByDescending(p => p.x.Length))
            if (t.Contains(alias)) return i;
        return null;
    }

    public static string Context(int rashi, DateOnly date, TimeZoneInfo tz, string period)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Rashifal for {Rashi[rashi]} ({Western[rashi]}) rashi, lord {Graha[Lord[rashi]]}. Method: Chandra gochar (house of the transiting Moon from the rashi), adjusted by the weekday lord; month from Surya gochar.");
        if (period == "week")
        {
            for (int i = 0; i < 7; i++)
            {
                var d = date.AddDays(i);
                var mr = Sign(MoonSidereal(AstroMath.ToJulianDay(LocalTime(d, 12, tz))));
                int h = House(rashi, mr), dl = (int)d.DayOfWeek;
                sb.AppendLine($"{d:yyyy-MM-dd} {d.DayOfWeek}: Moon in {Rashi[mr]} (house {h}) rating {Score(MoonBase[h], rashi, dl)}/5 — {MoonHouse[h]}");
            }
        }
        else if (period == "month")
        {
            var jd = AstroMath.ToJulianDay(LocalTime(date, 12, tz));
            var sr = Sign(SunSidereal(jd));
            int h = House(rashi, sr);
            DateOnly since = date, until = date;
            while (since > date.AddDays(-33) && Sign(SunSidereal(AstroMath.ToJulianDay(LocalTime(since.AddDays(-1), 12, tz)))) == sr) since = since.AddDays(-1);
            while (until < date.AddDays(33) && Sign(SunSidereal(AstroMath.ToJulianDay(LocalTime(until.AddDays(1), 12, tz)))) == sr) until = until.AddDays(1);
            sb.AppendLine($"Sun in {Rashi[sr]} from about {since:yyyy-MM-dd} to {until:yyyy-MM-dd} = house {h}, rating {SunBase[h]}/5. {SunHouse[h]}");
            int next = h % 12 + 1;
            sb.AppendLine($"After {until:yyyy-MM-dd}: house {next} — {SunHouse[next]}");
        }
        else
        {
            var start = LocalTime(date, 6, tz);
            var mr = Sign(MoonSidereal(AstroMath.ToJulianDay(start)));
            int h = House(rashi, mr), dl = (int)date.DayOfWeek, lord = Lord[rashi];
            var sc = Score(MoonBase[h], rashi, dl);
            var colour = Friend[lord, dl] >= 0 ? Colour[dl] : Colour[lord];
            var upay = sc <= 2 && lord != 2 ? Upay[2] : Upay[lord];
            sb.AppendLine($"Date {date:yyyy-MM-dd} ({date.DayOfWeek}, lord {Graha[dl]}). Moon in {Rashi[mr]} = house {h}. Rating {sc}/5.");
            sb.AppendLine(MoonHouse[h]);
            sb.AppendLine($"Lucky colour {colour}; lucky numbers {string.Join(", ", new[] { Number[lord], Number[dl] }.Distinct())}. Upay: {upay}.");
            for (int hr = 1; hr <= 24; hr++)
            {
                var t = start.AddHours(hr);
                var m2 = Sign(MoonSidereal(AstroMath.ToJulianDay(t)));
                if (m2 == mr) continue;
                int h2 = House(rashi, m2);
                sb.AppendLine($"Around {TimeZoneInfo.ConvertTime(t, tz):HH:mm} the Moon enters {Rashi[m2]} (house {h2}, rating {Score(MoonBase[h2], rashi, dl)}/5): {MoonHouse[h2]}");
                break;
            }
        }
        sb.AppendLine("General sign-based guidance; a personal reading needs the full birth chart.");
        return sb.ToString();
    }
}
