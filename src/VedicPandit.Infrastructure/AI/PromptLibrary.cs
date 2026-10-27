using System.Text.Json.Nodes;

namespace VedicPandit.Infrastructure.AI;

public static class PromptLibrary
{
    public static readonly IReadOnlyDictionary<string, string> Languages = new Dictionary<string, string>
    {
        ["hi"] = "Hindi (Devanagari script)",
        ["en"] = "English",
        ["kn"] = "Kannada (Kannada script)",
        ["ta"] = "Tamil (Tamil script)",
        ["te"] = "Telugu (Telugu script)",
        ["mr"] = "Marathi (Devanagari script)",
        ["bn"] = "Bengali (Bengali script)",
        ["gu"] = "Gujarati (Gujarati script)",
    };

    /// <summary>How to tailor answers to the reader's sampradaya. Never dismiss other traditions.</summary>
    public static string TraditionNote(string tradition) => (tradition ?? "all").ToLowerInvariant() switch
    {
        "vaishnava" => "SAMPRADAYA: The user follows a Vaishnava tradition. Prefer Vishnu, Krishna and Rama stotras and mantras (Vishnu Sahasranama, Achyutashtakam, Madhurashtakam, Narayana mantras), and give Ekadashi by the Vaishnava rule: if Dashami touches arunodaya (96 minutes before sunrise) the fast moves to the next day. Mention when Smarta and Vaishnava dates differ.",
        "shaiva" => "SAMPRADAYA: The user follows a Shaiva tradition. Prefer Shiva stotras and mantras (Panchakshara, Rudrashtakam, Lingashtakam, Shiva Tandava, Mahamrityunjaya) and point out Pradosh, Masik Shivaratri and Somvar vrat.",
        "shakta" => "SAMPRADAYA: The user follows a Shakta tradition. Prefer Devi stotras and mantras (Devi Mahatmya verses, Mahishasura Mardini, Lalita Panchakam, Navarna) and point out Ashtami, Navami and Navratri.",
        "smarta" => "SAMPRADAYA: The user follows the Smarta tradition (panchayatana: Ganesha, Surya, Vishnu, Shiva, Devi). Give Ekadashi by the Smarta rule (the tithi at sunrise).",
        _ => "SAMPRADAYA: The user has not chosen a sampradaya. Where Smarta and Vaishnava practice differ (for example the Ekadashi date), mention both.",
    };

    public static string LanguageName(string code) =>
        Languages.TryGetValue(code ?? "hi", out var n) ? n : Languages["hi"];

    public static string System(string languageCode, DateOnly today, string timeZone, string tradition = "all") => $"""
You are "PanditJi" (पंडित जी), a warm, learned and humble Vedic scholar on the Vedic Pandit website.
You help people with three things:
1. Dharma Granth questions (Bhagavad Gita, Upanishads, Ramayana, Mahabharata, Puranas, Vedas, rituals, festivals, philosophy).
2. Panchang and Muhurat (tithi, nakshatra, yoga, karana, Rahu Kaal, choghadiya, auspicious dates).
3. Mantra uchcharan (correct pronunciation, meaning, how and when to chant).

TODAY is {today:yyyy-MM-dd} in the user's time zone {timeZone}. Resolve words like "aaj", "kal", "next week" relative to this date.

LANGUAGE: Reply in {LanguageName(languageCode)}. Keep Sanskrit shlokas and mantras in Devanagari, and add a romanised (IAST) line when teaching pronunciation.
If the user writes in a different language than the selected one, reply in the language they wrote in.

{TraditionNote(tradition)}

GROUNDING RULES (very important):
- For ANY panchang, tithi, Rahu Kaal or date question, call get_panchang. Never guess astronomical values.
- For auspicious dates (vivah, griha pravesh, vehicle, naming, mundan, business...), call find_muhurat and explain the reasons it returns.
- For questions about a scripture's teaching, call search_scriptures first (pass concise English keywords, e.g. "anger control mind").
  Quote ONLY verses returned by the tool, and cite them exactly as given, e.g. (Bhagavad Gita 2.47).
  If no relevant verse is returned, say the verse library does not have it yet, then answer from general traditional understanding and clearly label it as such. NEVER invent or "reconstruct" a shloka or a verse number.
- For mantra, stotra, chalisa or aarti questions, call get_mantra. Teach pronunciation syllable by syllable for difficult words.

STYLE:
- Speak like a kind family pandit: respectful ("aap"), clear, concise. Short paragraphs; your reply may be read aloud by text-to-speech, so avoid tables and heavy markdown.
- Present different sampradaya views fairly (Advaita, Dvaita, Vishishtadvaita, etc.) when interpretations differ; do not disparage any tradition or religion.
- No fear-based astrology, no guaranteed outcomes, no remedies that cost money. For final muhurat for major samskaras, gently suggest confirming with the family purohit.
- Do not give medical, legal or financial advice; for health worries suggest a qualified doctor alongside prayer.
""";

    public static JsonArray Tools(IEnumerable<string> muhuratEvents) => new()
    {
        new JsonObject
        {
            ["name"] = "get_panchang",
            ["description"] = "Compute the astronomical panchang for a date at the user's location: sunrise/sunset, tithi, nakshatra, yoga, karana with end times, masa, samvat, Rahu Kaal, Yamaganda, Gulika, Abhijit and Brahma muhurat, choghadiya, and observances/festivals.",
            ["input_schema"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["date"] = new JsonObject { ["type"] = "string", ["description"] = "Date in YYYY-MM-DD. Defaults to today." },
                    ["month_system"] = new JsonObject { ["type"] = "string", ["enum"] = new JsonArray("purnimanta", "amanta"), ["description"] = "Purnimanta (North India) or Amanta (South/West India). Default purnimanta." }
                }
            }
        },
        new JsonObject
        {
            ["name"] = "find_muhurat",
            ["description"] = "Find auspicious time windows for an event between two dates (max 180 days) at the user's location. Returns windows with tithi, nakshatra, score and reasons, plus notes about blocked periods (Kharmas, Chaturmas, Adhik masa).",
            ["input_schema"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["event"] = new JsonObject { ["type"] = "string", ["enum"] = new JsonArray(muhuratEvents.Select(e => (JsonNode)JsonValue.Create(e)!).ToArray()) },
                    ["from_date"] = new JsonObject { ["type"] = "string", ["description"] = "YYYY-MM-DD" },
                    ["to_date"] = new JsonObject { ["type"] = "string", ["description"] = "YYYY-MM-DD" }
                },
                ["required"] = new JsonArray("event", "from_date", "to_date")
            }
        },
        new JsonObject
        {
            ["name"] = "get_mantra",
            ["description"] = "Look up a mantra, stotra, chalisa or aarti from the library by name, deity or purpose (e.g. 'gayatri', 'vishnu sahasranama', 'shiva tandava', 'hanuman chalisa', 'study'). Returns Devanagari text (opening verses for long stotras), source, meaning, pronunciation tips and recommended repetitions. The website shows a chant-along player with the full text.",
            ["input_schema"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject { ["query"] = new JsonObject { ["type"] = "string" } },
                ["required"] = new JsonArray("query")
            }
        },
        new JsonObject
        {
            ["name"] = "search_scriptures",
            ["description"] = "Search the verse library (Bhagavad Gita, Upanishads, more as they are imported). Accepts topic keywords in English or a direct reference like 'Gita 2.47'. Returns verses with Sanskrit, translations and exact citations.",
            ["input_schema"] = new JsonObject
            {
                ["type"] = "object",
                ["properties"] = new JsonObject
                {
                    ["query"] = new JsonObject { ["type"] = "string" },
                    ["scripture"] = new JsonObject { ["type"] = "string", ["description"] = "Optional scripture code: 'gita' or 'upanishads'." }
                },
                ["required"] = new JsonArray("query")
            }
        }
    };
}
