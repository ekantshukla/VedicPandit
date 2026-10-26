using VedicPandit.Core.Models;

namespace VedicPandit.Infrastructure.Muhurat;

/// <summary>
/// Data-driven muhurat rules. These reflect commonly cited Muhurta Chintamani-style guidance used by many panchangs;
/// regional traditions vary, so the lists are intentionally kept in one place for a pandit/editor to review and adjust.
/// Numbers: nakshatra 1 = Ashwini ... 27 = Revati; tithi 1-15 Shukla, 16-30 Krishna (30 = Amavasya); vara 0 = Sunday.
/// </summary>
public sealed record MuhuratRule(
    MuhuratEvent Event,
    string Name,
    string NameHi,
    int[] Nakshatras,
    int[] Varas,
    int[] AllowedTithis,
    bool AvoidKharmas,
    bool AvoidChaturmas,
    bool AvoidAdhikMasa,
    bool PreferShuklaPaksha);

public static class MuhuratRules
{
    private static readonly int[] AllExceptRiktaAmavasya = Enumerable.Range(1, 30).Except(new[] { 4, 9, 14, 19, 24, 29, 30 }).ToArray();
    private static readonly int[] AuspiciousShukla = { 2, 3, 5, 7, 10, 11, 12, 13 };

    public static readonly IReadOnlyDictionary<MuhuratEvent, MuhuratRule> All = new Dictionary<MuhuratEvent, MuhuratRule>
    {
        [MuhuratEvent.Vivah] = new(MuhuratEvent.Vivah, "Marriage (Vivah)", "विवाह",
            new[] { 4, 5, 10, 12, 13, 15, 17, 19, 21, 26, 27 }, new[] { 1, 3, 4, 5 },
            AuspiciousShukla.Concat(new[] { 1, 15, 16, 17, 18, 20, 22, 25 }).ToArray(),
            AvoidKharmas: true, AvoidChaturmas: true, AvoidAdhikMasa: true, PreferShuklaPaksha: true),

        [MuhuratEvent.GrihaPravesh] = new(MuhuratEvent.GrihaPravesh, "House warming (Griha Pravesh)", "गृह प्रवेश",
            new[] { 4, 5, 12, 14, 17, 21, 26, 27 }, new[] { 1, 3, 4, 5, 6 },
            AuspiciousShukla.Concat(new[] { 17, 18, 20 }).ToArray(),
            AvoidKharmas: true, AvoidChaturmas: true, AvoidAdhikMasa: true, PreferShuklaPaksha: true),

        [MuhuratEvent.VahanKharid] = new(MuhuratEvent.VahanKharid, "Vehicle purchase (Vahan Kharid)", "वाहन खरीद",
            new[] { 1, 4, 5, 7, 8, 13, 14, 15, 17, 22, 23, 24, 27 }, new[] { 0, 1, 3, 4, 5 },
            AllExceptRiktaAmavasya,
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: false, PreferShuklaPaksha: true),

        [MuhuratEvent.SampattiKharid] = new(MuhuratEvent.SampattiKharid, "Property purchase", "संपत्ति / भूमि खरीद",
            new[] { 4, 5, 8, 12, 14, 17, 21, 26, 27 }, new[] { 1, 3, 4, 5 },
            AllExceptRiktaAmavasya,
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: true, PreferShuklaPaksha: true),

        [MuhuratEvent.Namakaran] = new(MuhuratEvent.Namakaran, "Naming ceremony (Namakaran)", "नामकरण",
            new[] { 1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27 }, new[] { 1, 3, 4, 5 },
            AllExceptRiktaAmavasya.Except(new[] { 8, 23 }).ToArray(),
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: false, PreferShuklaPaksha: false),

        [MuhuratEvent.Mundan] = new(MuhuratEvent.Mundan, "First haircut (Mundan)", "मुंडन",
            new[] { 1, 5, 7, 8, 13, 14, 15, 18, 22, 23, 24, 27 }, new[] { 1, 3, 4, 5 },
            AuspiciousShukla,
            AvoidKharmas: true, AvoidChaturmas: true, AvoidAdhikMasa: true, PreferShuklaPaksha: true),

        [MuhuratEvent.Annaprashan] = new(MuhuratEvent.Annaprashan, "First rice feeding (Annaprashan)", "अन्नप्राशन",
            new[] { 1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27 }, new[] { 1, 3, 4, 5 },
            new[] { 2, 3, 5, 7, 10, 13, 17, 18, 20, 22, 25, 28 },
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: true, PreferShuklaPaksha: true),

        [MuhuratEvent.Vidyarambh] = new(MuhuratEvent.Vidyarambh, "Start of education (Vidyarambh)", "विद्यारंभ",
            new[] { 1, 5, 7, 8, 13, 14, 15, 22, 23, 24, 27 }, new[] { 0, 3, 4, 5 },
            AllExceptRiktaAmavasya,
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: false, PreferShuklaPaksha: true),

        [MuhuratEvent.VyaparAarambh] = new(MuhuratEvent.VyaparAarambh, "Business opening (Vyapar Aarambh)", "व्यापार आरंभ",
            new[] { 1, 4, 5, 8, 12, 13, 14, 17, 21, 22, 27 }, new[] { 1, 3, 4, 5 },
            AllExceptRiktaAmavasya,
            AvoidKharmas: false, AvoidChaturmas: false, AvoidAdhikMasa: true, PreferShuklaPaksha: true),
    };
}
