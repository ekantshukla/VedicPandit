namespace VedicPandit.Infrastructure.Panchang;

public static class PanchangNames
{
    public static readonly string[] Tithi =
    {
        "Pratipada","Dwitiya","Tritiya","Chaturthi","Panchami","Shashthi","Saptami","Ashtami",
        "Navami","Dashami","Ekadashi","Dwadashi","Trayodashi","Chaturdashi","Purnima","Amavasya"
    };
    public static readonly string[] TithiSa =
    {
        "प्रतिपदा","द्वितीया","तृतीया","चतुर्थी","पञ्चमी","षष्ठी","सप्तमी","अष्टमी",
        "नवमी","दशमी","एकादशी","द्वादशी","त्रयोदशी","चतुर्दशी","पूर्णिमा","अमावस्या"
    };

    public static readonly string[] Nakshatra =
    {
        "Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha",
        "Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha",
        "Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishta","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"
    };
    public static readonly string[] NakshatraSa =
    {
        "अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा",
        "मघा","पूर्वाफाल्गुनी","उत्तराफाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा",
        "मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्वाभाद्रपदा","उत्तराभाद्रपदा","रेवती"
    };

    public static readonly string[] Yoga =
    {
        "Vishkumbha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula",
        "Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyan",
        "Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"
    };
    public static readonly string[] YogaSa =
    {
        "विष्कम्भ","प्रीति","आयुष्मान्","सौभाग्य","शोभन","अतिगण्ड","सुकर्मा","धृति","शूल",
        "गण्ड","वृद्धि","ध्रुव","व्याघात","हर्षण","वज्र","सिद्धि","व्यतीपात","वरीयान्",
        "परिघ","शिव","सिद्ध","साध्य","शुभ","शुक्ल","ब्रह्म","इन्द्र","वैधृति"
    };
    /// <summary>Yoga numbers (1-based) traditionally avoided for auspicious work.</summary>
    public static readonly HashSet<int> InauspiciousYogas = new() { 1, 6, 9, 10, 13, 15, 17, 19, 27 };

    public static readonly string[] Karana = { "Bava","Balava","Kaulava","Taitila","Garaja","Vanija","Vishti (Bhadra)","Shakuni","Chatushpada","Naga","Kimstughna" };
    public static readonly string[] KaranaSa = { "बव","बालव","कौलव","तैतिल","गर","वणिज","विष्टि (भद्रा)","शकुनि","चतुष्पद","नाग","किंस्तुघ्न" };

    public static readonly string[] Vara = { "Ravivara (Sunday)","Somavara (Monday)","Mangalavara (Tuesday)","Budhavara (Wednesday)","Guruvara (Thursday)","Shukravara (Friday)","Shanivara (Saturday)" };
    public static readonly string[] VaraSa = { "रविवार","सोमवार","मंगलवार","बुधवार","गुरुवार","शुक्रवार","शनिवार" };

    public static readonly string[] Rashi = { "Mesha","Vrishabha","Mithuna","Karka","Simha","Kanya","Tula","Vrishchika","Dhanu","Makara","Kumbha","Meena" };
    public static readonly string[] RashiSa = { "मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन" };

    public static readonly string[] Masa = { "Chaitra","Vaishakha","Jyeshtha","Ashadha","Shravana","Bhadrapada","Ashvin","Kartika","Margashirsha","Pausha","Magha","Phalguna" };
    public static readonly string[] MasaSa = { "चैत्र","वैशाख","ज्येष्ठ","आषाढ","श्रावण","भाद्रपद","आश्विन","कार्तिक","मार्गशीर्ष","पौष","माघ","फाल्गुन" };

    public static readonly string[] Ritu = { "Vasanta (Spring)","Grishma (Summer)","Varsha (Monsoon)","Sharad (Autumn)","Hemanta (Pre-winter)","Shishira (Winter)" };

    // Choghadiya cycles
    public static readonly string[] DayChoghadiyaCycle = { "Udveg","Chal","Labh","Amrit","Kaal","Shubh","Rog" };
    public static readonly int[] DayChoghadiyaStart = { 0, 3, 6, 2, 5, 1, 4 }; // Sun..Sat -> index in DayChoghadiyaCycle
    public static readonly string[] NightChoghadiyaCycle = { "Shubh","Amrit","Chal","Rog","Kaal","Labh","Udveg" };
    public static readonly int[] NightChoghadiyaStart = { 0, 2, 4, 6, 1, 3, 5 }; // Sun..Sat -> index in NightChoghadiyaCycle

    public static string ChoghadiyaQuality(string name) => name switch
    {
        "Amrit" or "Shubh" or "Labh" => "Good",
        "Chal" => "Neutral",
        _ => "Avoid"
    };

    // 1-based eighth-of-day segment for Sun..Sat
    public static readonly int[] RahuSegment = { 8, 2, 7, 5, 6, 4, 3 };
    public static readonly int[] YamagandaSegment = { 5, 4, 3, 2, 1, 7, 6 };
    public static readonly int[] GulikaSegment = { 7, 6, 5, 4, 3, 2, 1 };

    /// <summary>Karana number (0-10 index into Karana[]) for a half-tithi index 0..59.</summary>
    public static int KaranaIndex(int halfTithi) => halfTithi switch
    {
        0 => 10,
        57 => 7,
        58 => 8,
        59 => 9,
        _ => (halfTithi - 1) % 7
    };

    /// <summary>Tithi name for tithi number 1..30.</summary>
    public static (string Name, string Sa) TithiName(int number)
    {
        if (number == 15) return (Tithi[14], TithiSa[14]);
        if (number == 30) return (Tithi[15], TithiSa[15]);
        int i = (number - 1) % 15;
        string paksha = number <= 15 ? "Shukla" : "Krishna";
        string pakshaSa = number <= 15 ? "शुक्ल" : "कृष्ण";
        return ($"{paksha} {Tithi[i]}", $"{pakshaSa} {TithiSa[i]}");
    }
}
