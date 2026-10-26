using static VedicPandit.Infrastructure.Astronomy.AstroMath;

namespace VedicPandit.Infrastructure.Astronomy;

/// <summary>Lunar longitude from Meeus ch. 47 (ELP-2000/82 main 59 terms + additive corrections). Accuracy ~10 arc-seconds.</summary>
public static class MoonPosition
{
    // D, M, M', F, coefficient (1e-6 degree)
    private static readonly int[,] Terms =
    {
        {0,0,1,0,6288774},{2,0,-1,0,1274027},{2,0,0,0,658314},{0,0,2,0,213618},{0,1,0,0,-185116},{0,0,0,2,-114332},
        {2,0,-2,0,58793},{2,-1,-1,0,57066},{2,0,1,0,53322},{2,-1,0,0,45758},{0,1,-1,0,-40923},{1,0,0,0,-34720},
        {0,1,1,0,-30383},{2,0,0,-2,15327},{0,0,1,2,-12528},{0,0,1,-2,10980},{4,0,-1,0,10675},{0,0,3,0,10034},
        {4,0,-2,0,8548},{2,1,-1,0,-7888},{2,1,0,0,-6766},{1,0,-1,0,-5163},{1,1,0,0,4987},{2,-1,1,0,4036},
        {2,0,2,0,3994},{4,0,0,0,3861},{2,0,-3,0,3665},{0,1,-2,0,-2689},{2,0,-1,2,-2602},{2,-1,-2,0,2390},
        {1,0,1,0,-2348},{2,-2,0,0,2236},{0,1,2,0,-2120},{0,2,0,0,-2069},{2,-2,-1,0,2048},{2,0,1,-2,-1773},
        {2,0,0,2,-1595},{4,-1,-1,0,1215},{0,0,2,2,-1110},{3,0,-1,0,-892},{2,1,1,0,-810},{4,-1,-2,0,759},
        {0,2,-1,0,-713},{2,2,-1,0,-700},{2,1,-2,0,691},{2,-1,0,-2,596},{4,0,1,0,549},{0,0,4,0,537},
        {4,-1,0,0,520},{1,0,-2,0,-487},{2,1,0,-2,-399},{0,0,2,-2,-381},{1,1,1,0,351},{3,0,-2,0,-340},
        {4,0,-3,0,330},{2,-1,2,0,327},{0,2,1,0,-323},{1,1,-1,0,299},{2,0,3,0,294}
    };

    /// <summary>Geocentric ecliptic longitude of the Moon, mean equinox of date (degrees).</summary>
    public static double MeanEquinoxLongitude(double jdTT)
    {
        double t = Centuries(jdTT);
        double t2 = t * t, t3 = t2 * t, t4 = t3 * t;
        double lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000;
        double d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000;
        double m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000;
        double mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000;
        double f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000;
        double e = 1 - 0.002516 * t - 0.0000074 * t2;

        double sum = 0;
        for (int i = 0; i < Terms.GetLength(0); i++)
        {
            int cm = Terms[i, 1];
            double ef = Math.Abs(cm) == 1 ? e : Math.Abs(cm) == 2 ? e * e : 1.0;
            sum += Terms[i, 4] * ef * SinD(Terms[i, 0] * d + cm * m + Terms[i, 2] * mp + Terms[i, 3] * f);
        }
        double a1 = 119.75 + 131.849 * t, a2 = 53.09 + 479264.290 * t;
        sum += 3958 * SinD(a1) + 1962 * SinD(lp - f) + 318 * SinD(a2);
        return Norm360(lp + sum / 1e6);
    }
}

public static class AyanamsaCalc
{
    /// <summary>
    /// Lahiri (Chitrapaksha) mean ayanamsa in degrees. Base constant calibrated so that the 12 sankranti moments of 2026
    /// match Drik Panchang (New Delhi) within ±1 minute when used with the mean-equinox solar longitude above.
    /// </summary>
    public static double Lahiri(double jdTT)
    {
        double t = Centuries(jdTT);
        return 23.86075 + 1.39697 * t + 0.0003086 * t * t;
    }
}
