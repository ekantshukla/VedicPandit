namespace VedicPandit.Infrastructure.Astronomy;

/// <summary>Shared helpers: Julian days, angle normalisation, Delta-T, root finding.</summary>
public static class AstroMath
{
    public const double Deg2Rad = Math.PI / 180.0;
    public const double Rad2Deg = 180.0 / Math.PI;
    private const double UnixEpochJd = 2440587.5;

    public static double Norm360(double a) => ((a % 360.0) + 360.0) % 360.0;
    public static double SinD(double d) => Math.Sin(d * Deg2Rad);
    public static double CosD(double d) => Math.Cos(d * Deg2Rad);

    public static double ToJulianDay(DateTimeOffset utc) =>
        utc.ToUnixTimeMilliseconds() / 86_400_000.0 + UnixEpochJd;

    public static DateTimeOffset FromJulianDay(double jd) =>
        DateTimeOffset.FromUnixTimeMilliseconds((long)Math.Round((jd - UnixEpochJd) * 86_400_000.0));

    /// <summary>Julian centuries from J2000.0.</summary>
    public static double Centuries(double jd) => (jd - 2451545.0) / 36525.0;

    /// <summary>Delta-T (TT - UT) in days. Interpolated from observed/projected values; seconds-level error is irrelevant for panchang.</summary>
    public static double DeltaTDays(double jdUt)
    {
        double year = 2000.0 + (jdUt - 2451545.0) / 365.25;
        double[] years = { 1900, 1920, 1940, 1960, 1980, 2000, 2010, 2020, 2030, 2040, 2050, 2100 };
        double[] values = { -2.7, 21.2, 24.3, 33.2, 50.5, 63.8, 66.1, 69.4, 70.5, 72.0, 74.0, 93.0 };
        double seconds;
        if (year <= years[0]) seconds = values[0];
        else if (year >= years[^1]) seconds = values[^1];
        else
        {
            int i = 0;
            while (years[i + 1] < year) i++;
            double f = (year - years[i]) / (years[i + 1] - years[i]);
            seconds = values[i] + f * (values[i + 1] - values[i]);
        }
        return seconds / 86400.0;
    }

    /// <summary>Bisection: f(a) and f(b) must have opposite signs.</summary>
    public static double Bisect(Func<double, double> f, double a, double b, int iterations = 50)
    {
        double fa = f(a);
        for (int i = 0; i < iterations; i++)
        {
            double m = (a + b) / 2, fm = f(m);
            if ((fm > 0) == (fa > 0)) { a = m; fa = fm; } else b = m;
        }
        return (a + b) / 2;
    }

    /// <summary>
    /// For an angle function that increases with time (mod 360), find the first JD &gt;= start at which it reaches <paramref name="target"/>.
    /// Returns null if not found within <paramref name="maxDays"/>.
    /// </summary>
    public static double? FindAngleCrossing(Func<double, double> angleFn, double target, double start, double maxDays = 3, double step = 0.25)
    {
        double Diff(double j)
        {
            double d = Norm360(angleFn(j) - target);
            return d > 180 ? d - 360 : d;
        }
        double a = start, da = Diff(a);
        for (double b = start + step; b <= start + maxDays + 1e-9; b += step)
        {
            double db = Diff(b);
            if (da < 0 && db >= 0) return Bisect(Diff, a, b, 40);
            a = b; da = db;
        }
        return null;
    }
}
