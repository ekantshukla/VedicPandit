using VedicPandit.Core.Models;

namespace VedicPandit.Core.Dtos;

/// <summary>One panchang element (tithi, nakshatra...) with the local time it ends. End is null if it continues past the next sunrise window.</summary>
public record PanchangElement(int Number, string Name, string NameSanskrit, DateTimeOffset? Ends, string? Extra = null);

public record TimeWindow(string Name, DateTimeOffset Start, DateTimeOffset End, string? Quality = null);

public record PanchangOptions(MonthSystem Months = MonthSystem.Purnimanta);

public class PanchangResult
{
    public DateOnly Date { get; init; }
    public double Latitude { get; init; }
    public double Longitude { get; init; }
    public string TimeZone { get; init; } = "Asia/Kolkata";
    public string MonthSystem { get; init; } = "Purnimanta";

    public DateTimeOffset? Sunrise { get; init; }
    public DateTimeOffset? Sunset { get; init; }
    public DateTimeOffset? NextSunrise { get; init; }

    public PanchangElement Vara { get; init; } = default!;
    /// <summary>All tithis that occur between sunrise and next sunrise (normally 1, sometimes 2).</summary>
    public List<PanchangElement> Tithis { get; init; } = new();
    public List<PanchangElement> Nakshatras { get; init; } = new();
    public List<PanchangElement> Yogas { get; init; } = new();
    public List<PanchangElement> Karanas { get; init; } = new();

    public string Paksha { get; init; } = string.Empty;
    public string Masa { get; init; } = string.Empty;
    public string MasaSanskrit { get; init; } = string.Empty;
    public bool IsAdhikMasa { get; init; }
    public int VikramSamvat { get; init; }
    public int ShakaSamvat { get; init; }
    public string Ritu { get; init; } = string.Empty;
    public string Ayana { get; init; } = string.Empty;
    public string SunRashi { get; init; } = string.Empty;
    public string MoonRashi { get; init; } = string.Empty;

    public TimeWindow? RahuKaal { get; init; }
    public TimeWindow? Yamaganda { get; init; }
    public TimeWindow? Gulika { get; init; }
    public TimeWindow? AbhijitMuhurat { get; init; }
    public TimeWindow? BrahmaMuhurat { get; init; }
    public List<TimeWindow> DayChoghadiya { get; init; } = new();
    public List<TimeWindow> NightChoghadiya { get; init; } = new();

    public List<string> Observances { get; init; } = new();
    public double Ayanamsa { get; init; }

    /// <summary>Compact text summary used as grounding context for the LLM.</summary>
    public string ToContextString()
    {
        static string T(DateTimeOffset? d) => d?.ToString("dd MMM HH:mm") ?? "next day";
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Panchang for {Date:yyyy-MM-dd} at lat {Latitude:F3}, lng {Longitude:F3} ({TimeZone}), month system {MonthSystem}, Lahiri ayanamsa {Ayanamsa:F4}°");
        sb.AppendLine($"Sunrise {T(Sunrise)}, Sunset {T(Sunset)}; Vara: {Vara.Name} ({Vara.NameSanskrit})");
        sb.AppendLine("Tithi: " + string.Join("; ", Tithis.Select(t => $"{t.Name} ({t.NameSanskrit}) upto {T(t.Ends)}")));
        sb.AppendLine("Nakshatra: " + string.Join("; ", Nakshatras.Select(t => $"{t.Name} {t.Extra} upto {T(t.Ends)}")));
        sb.AppendLine("Yoga: " + string.Join("; ", Yogas.Select(t => $"{t.Name} upto {T(t.Ends)}")));
        sb.AppendLine("Karana: " + string.Join("; ", Karanas.Select(t => $"{t.Name} upto {T(t.Ends)}")));
        sb.AppendLine($"Paksha: {Paksha}; Masa: {Masa}{(IsAdhikMasa ? " (Adhik)" : "")}; Vikram Samvat {VikramSamvat}; Shaka {ShakaSamvat}; Ritu {Ritu}; {Ayana}");
        sb.AppendLine($"Sun in {SunRashi}; Moon in {MoonRashi}");
        if (RahuKaal != null) sb.AppendLine($"Rahu Kaal {RahuKaal.Start:HH:mm}-{RahuKaal.End:HH:mm}");
        if (Yamaganda != null) sb.AppendLine($"Yamaganda {Yamaganda.Start:HH:mm}-{Yamaganda.End:HH:mm}");
        if (Gulika != null) sb.AppendLine($"Gulika Kaal {Gulika.Start:HH:mm}-{Gulika.End:HH:mm}");
        if (AbhijitMuhurat != null) sb.AppendLine($"Abhijit Muhurat {AbhijitMuhurat.Start:HH:mm}-{AbhijitMuhurat.End:HH:mm}{(AbhijitMuhurat.Quality is null ? "" : " (" + AbhijitMuhurat.Quality + ")")}");
        if (BrahmaMuhurat != null) sb.AppendLine($"Brahma Muhurat {BrahmaMuhurat.Start:HH:mm}-{BrahmaMuhurat.End:HH:mm}");
        if (Observances.Count > 0) sb.AppendLine("Observances (tithi-at-sunrise rule): " + string.Join(", ", Observances));
        return sb.ToString();
    }
}

public class MuhuratWindow
{
    public DateOnly Date { get; init; }
    public DateTimeOffset Start { get; init; }
    public DateTimeOffset End { get; init; }
    public string Tithi { get; init; } = string.Empty;
    public string Nakshatra { get; init; } = string.Empty;
    public string Vara { get; init; } = string.Empty;
    public string Yoga { get; init; } = string.Empty;
    public int Score { get; init; }
    public List<string> Reasons { get; init; } = new();
}

public class MuhuratSearchResult
{
    public string Event { get; init; } = string.Empty;
    public string EventName { get; init; } = string.Empty;
    public DateOnly From { get; init; }
    public DateOnly To { get; init; }
    public List<MuhuratWindow> Windows { get; init; } = new();
    /// <summary>Whole-period blocks found (Kharmas, Chaturmas, Adhik masa) explaining why dates were skipped.</summary>
    public List<string> Notes { get; init; } = new();
    public string Disclaimer { get; init; } = string.Empty;
}
