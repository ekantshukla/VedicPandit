namespace VedicPandit.Core.Models;

/// <summary>
/// Regional month convention. North India (incl. Kashi/Varanasi and Rishikesh panchangs) follows Purnimanta;
/// South and West India follow Amanta. Tithi/nakshatra are identical in both; only month names in Krishna paksha differ.
/// </summary>
public enum MonthSystem { Purnimanta, Amanta }

public enum Ayanamsa { Lahiri }

public enum MuhuratEvent
{
    Vivah,
    GrihaPravesh,
    VahanKharid,
    SampattiKharid,
    Namakaran,
    Mundan,
    Annaprashan,
    Vidyarambh,
    VyaparAarambh
}
