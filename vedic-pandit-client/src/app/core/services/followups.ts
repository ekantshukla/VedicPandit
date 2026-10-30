// "Ask next" suggestions. The AI ends each answer with a [[NEXT]] block of three likely follow-up questions;
// the chat hides that block and shows the questions as tappable chips. Built-in answers supply their own.

const MARKER = /\[\[\s*NEXT\s*\]\]/i;

/** Instruction added to the AI's system prompt (the .NET PromptLibrary has the same text). */
export const FOLLOWUP_RULE = `FOLLOW-UP SUGGESTIONS (always): after your answer, on a new line write [[NEXT]] and then exactly 3 short questions the user is most likely to ask next, one per line, each starting with "- ".
Write them in the SAME language and script as your answer (the app's selected language), phrased as the user would ask them, specific to this conversation, under 60 characters each.
Never mention or refer to these suggestions in the answer itself. Put [[NEXT]] only once, at the very end.`;

/** The part of a (streaming) answer to show: everything before [[NEXT]], minus a half-written marker at the end. */
export function visibleText(raw: string): string {
  const i = raw.search(MARKER);
  if (i >= 0) return raw.slice(0, i).trimEnd();
  return raw.replace(/\[\[?\s*N?E?X?T?\]?$/i, '');
}

/** The suggested questions after [[NEXT]]. */
export function parseFollowups(raw: string): string[] {
  const i = raw.search(MARKER);
  if (i < 0) return [];
  return raw.slice(i).replace(MARKER, '').split('\n')
    .map(l => l.replace(/^\s*(?:(?:[-*•]|\d+[.)])\s*)+/, '').replace(/^["“'`]+|["”'`]+$/g, '').replace(/\*\*/g, '').trim())
    .filter(l => l.length >= 3 && l.length <= 120)
    .slice(0, 3);
}

/** Answer without the suggestion block, for conversation memory. */
export const stripFollowups = (raw: string) => { const i = raw.search(MARKER); return (i >= 0 ? raw.slice(0, i) : raw).trim(); };

type Topic = 'rashifal' | 'muhurat' | 'panchang' | 'ekadashi' | 'mantra' | 'verses' | 'general';
type Set3 = [string, string, string];

/** Built-in suggestions in every app language; {r} is the rashi name. */
const S: Record<string, Record<Topic, Set3>> = {
  en: {
    rashifal: ["Tomorrow's rashifal for {r}", "This week's rashifal for {r}", 'When is Rahu Kaal today?'],
    muhurat: ['Marriage muhurat in the next 3 months', 'Good time for griha pravesh', "Today's panchang"],
    panchang: ["Tomorrow's panchang", 'When is the next Ekadashi?', 'Any auspicious time today?'],
    ekadashi: ['What are the Ekadashi fasting rules?', 'Which mantra to chant on Ekadashi?', "Today's panchang"],
    mantra: ['Explain the meaning of this mantra', 'How many times should I chant it?', 'Play the Hanuman Chalisa'],
    verses: ['Explain this verse in detail', 'What does the Gita say about karma?', 'How do I calm my mind?'],
    general: ["Today's panchang", "Today's rashifal for Mesha", 'When is the next Ekadashi?'],
  },
  hi: {
    rashifal: ['{r} राशि का कल का राशिफल', '{r} राशि का साप्ताहिक राशिफल', 'आज राहु काल कब है?'],
    muhurat: ['विवाह मुहूर्त अगले 3 महीने में', 'गृह प्रवेश का शुभ मुहूर्त', 'आज का पंचांग बताइए'],
    panchang: ['कल का पंचांग बताइए', 'अगली एकादशी कब है?', 'आज का शुभ मुहूर्त क्या है?'],
    ekadashi: ['एकादशी व्रत के नियम क्या हैं?', 'एकादशी पर कौन सा मंत्र जपें?', 'आज का पंचांग बताइए'],
    mantra: ['इस मंत्र का अर्थ समझाइए', 'इसे कितनी बार जपना चाहिए?', 'हनुमान चालीसा सुनाइए'],
    verses: ['इस श्लोक को विस्तार से समझाइए', 'गीता में कर्म के बारे में क्या कहा है?', 'मन को शांत कैसे करें?'],
    general: ['आज का पंचांग बताइए', 'मेष राशि का आज का राशिफल', 'अगली एकादशी कब है?'],
  },
  mr: {
    rashifal: ['{r} राशीचे उद्याचे भविष्य', '{r} राशीचे साप्ताहिक भविष्य', 'आज राहुकाळ कधी आहे?'],
    muhurat: ['पुढील ३ महिन्यांतील विवाह मुहूर्त', 'गृहप्रवेशाचा शुभ मुहूर्त', 'आजचे पंचांग सांगा'],
    panchang: ['उद्याचे पंचांग सांगा', 'पुढची एकादशी कधी आहे?', 'आज शुभ मुहूर्त कोणता?'],
    ekadashi: ['एकादशी व्रताचे नियम काय आहेत?', 'एकादशीला कोणता मंत्र जपावा?', 'आजचे पंचांग सांगा'],
    mantra: ['या मंत्राचा अर्थ समजावून सांगा', 'हा मंत्र किती वेळा जपावा?', 'हनुमान चालीसा ऐकवा'],
    verses: ['हा श्लोक सविस्तर समजावा', 'गीतेत कर्माबद्दल काय सांगितले आहे?', 'मन शांत कसे करावे?'],
    general: ['आजचे पंचांग सांगा', 'मेष राशीचे आजचे भविष्य', 'पुढची एकादशी कधी आहे?'],
  },
  kn: {
    rashifal: ['{r} ರಾಶಿಯ ನಾಳೆಯ ಫಲ', '{r} ರಾಶಿಯ ವಾರದ ಫಲ', 'ಇಂದು ರಾಹುಕಾಲ ಯಾವಾಗ?'],
    muhurat: ['ಮುಂದಿನ 3 ತಿಂಗಳ ವಿವಾಹ ಮುಹೂರ್ತ', 'ಗೃಹಪ್ರವೇಶಕ್ಕೆ ಶುಭ ಮುಹೂರ್ತ', 'ಇಂದಿನ ಪಂಚಾಂಗ ತಿಳಿಸಿ'],
    panchang: ['ನಾಳೆಯ ಪಂಚಾಂಗ ತಿಳಿಸಿ', 'ಮುಂದಿನ ಏಕಾದಶಿ ಯಾವಾಗ?', 'ಇಂದು ಶುಭ ಮುಹೂರ್ತ ಯಾವುದು?'],
    ekadashi: ['ಏಕಾದಶಿ ವ್ರತದ ನಿಯಮಗಳು ಯಾವುವು?', 'ಏಕಾದಶಿಯಂದು ಯಾವ ಮಂತ್ರ ಜಪಿಸಬೇಕು?', 'ಇಂದಿನ ಪಂಚಾಂಗ ತಿಳಿಸಿ'],
    mantra: ['ಈ ಮಂತ್ರದ ಅರ್ಥ ವಿವರಿಸಿ', 'ಇದನ್ನು ಎಷ್ಟು ಬಾರಿ ಜಪಿಸಬೇಕು?', 'ಹನುಮಾನ್ ಚಾಲೀಸಾ ಕೇಳಿಸಿ'],
    verses: ['ಈ ಶ್ಲೋಕವನ್ನು ವಿವರವಾಗಿ ತಿಳಿಸಿ', 'ಕರ್ಮದ ಬಗ್ಗೆ ಗೀತೆ ಏನು ಹೇಳುತ್ತದೆ?', 'ಮನಸ್ಸನ್ನು ಶಾಂತಗೊಳಿಸುವುದು ಹೇಗೆ?'],
    general: ['ಇಂದಿನ ಪಂಚಾಂಗ ತಿಳಿಸಿ', 'ಮೇಷ ರಾಶಿಯ ಇಂದಿನ ಫಲ', 'ಮುಂದಿನ ಏಕಾದಶಿ ಯಾವಾಗ?'],
  },
  ta: {
    rashifal: ['{r} ராசிக்கு நாளைய பலன்', '{r} ராசிக்கு வார பலன்', 'இன்று ராகு காலம் எப்போது?'],
    muhurat: ['அடுத்த 3 மாதங்களில் திருமண முகூர்த்தம்', 'கிரகப்பிரவேசத்திற்கு நல்ல நேரம்', 'இன்றைய பஞ்சாங்கம் சொல்லுங்கள்'],
    panchang: ['நாளைய பஞ்சாங்கம் சொல்லுங்கள்', 'அடுத்த ஏகாதசி எப்போது?', 'இன்று நல்ல நேரம் எது?'],
    ekadashi: ['ஏகாதசி விரத நியமங்கள் என்ன?', 'ஏகாதசியில் எந்த மந்திரம் ஜபிக்க வேண்டும்?', 'இன்றைய பஞ்சாங்கம் சொல்லுங்கள்'],
    mantra: ['இந்த மந்திரத்தின் பொருளை விளக்குங்கள்', 'இதை எத்தனை முறை ஜபிக்க வேண்டும்?', 'ஹனுமான் சாலீசா கேட்க வேண்டும்'],
    verses: ['இந்த ஸ்லோகத்தை விரிவாக விளக்குங்கள்', 'கர்மம் பற்றி கீதை என்ன சொல்கிறது?', 'மனதை அமைதிப்படுத்துவது எப்படி?'],
    general: ['இன்றைய பஞ்சாங்கம் சொல்லுங்கள்', 'மேஷ ராசிக்கு இன்றைய பலன்', 'அடுத்த ஏகாதசி எப்போது?'],
  },
  te: {
    rashifal: ['{r} రాశికి రేపటి ఫలం', '{r} రాశికి వార ఫలం', 'ఈరోజు రాహుకాలం ఎప్పుడు?'],
    muhurat: ['వచ్చే 3 నెలల్లో వివాహ ముహూర్తం', 'గృహప్రవేశానికి శుభ ముహూర్తం', 'ఈరోజు పంచాంగం చెప్పండి'],
    panchang: ['రేపటి పంచాంగం చెప్పండి', 'తదుపరి ఏకాదశి ఎప్పుడు?', 'ఈరోజు శుభ సమయం ఏది?'],
    ekadashi: ['ఏకాదశి వ్రత నియమాలు ఏమిటి?', 'ఏకాదశి నాడు ఏ మంత్రం జపించాలి?', 'ఈరోజు పంచాంగం చెప్పండి'],
    mantra: ['ఈ మంత్రం అర్థం వివరించండి', 'దీన్ని ఎన్నిసార్లు జపించాలి?', 'హనుమాన్ చాలీసా వినిపించండి'],
    verses: ['ఈ శ్లోకాన్ని వివరంగా చెప్పండి', 'కర్మ గురించి గీత ఏమి చెబుతుంది?', 'మనసును ఎలా ప్రశాంతంగా ఉంచాలి?'],
    general: ['ఈరోజు పంచాంగం చెప్పండి', 'మేష రాశికి ఈరోజు ఫలం', 'తదుపరి ఏకాదశి ఎప్పుడు?'],
  },
  bn: {
    rashifal: ['{r} রাশির আগামীকালের রাশিফল', '{r} রাশির সাপ্তাহিক রাশিফল', 'আজ রাহুকাল কখন?'],
    muhurat: ['আগামী ৩ মাসে বিবাহের মুহূর্ত', 'গৃহপ্রবেশের শুভ মুহূর্ত', 'আজকের পঞ্জিকা বলুন'],
    panchang: ['আগামীকালের পঞ্জিকা বলুন', 'পরের একাদশী কবে?', 'আজ শুভ সময় কোনটি?'],
    ekadashi: ['একাদশী ব্রতের নিয়ম কী?', 'একাদশীতে কোন মন্ত্র জপ করব?', 'আজকের পঞ্জিকা বলুন'],
    mantra: ['এই মন্ত্রের অর্থ বুঝিয়ে বলুন', 'এটি কতবার জপ করা উচিত?', 'হনুমান চালিশা শোনান'],
    verses: ['এই শ্লোকটি বিস্তারিত বুঝিয়ে বলুন', 'কর্ম সম্পর্কে গীতা কী বলে?', 'মন শান্ত করব কীভাবে?'],
    general: ['আজকের পঞ্জিকা বলুন', 'মেষ রাশির আজকের রাশিফল', 'পরের একাদশী কবে?'],
  },
  gu: {
    rashifal: ['{r} રાશિનું આવતીકાલનું રાશિફળ', '{r} રાશિનું સાપ્તાહિક રાશિફળ', 'આજે રાહુકાળ ક્યારે છે?'],
    muhurat: ['આગામી 3 મહિનામાં લગ્નનું મુહૂર્ત', 'ગૃહપ્રવેશનું શુભ મુહૂર્ત', 'આજનું પંચાંગ જણાવો'],
    panchang: ['આવતીકાલનું પંચાંગ જણાવો', 'આગામી એકાદશી ક્યારે છે?', 'આજે શુભ સમય કયો છે?'],
    ekadashi: ['એકાદશી વ્રતના નિયમો શું છે?', 'એકાદશીએ કયો મંત્ર જપવો?', 'આજનું પંચાંગ જણાવો'],
    mantra: ['આ મંત્રનો અર્થ સમજાવો', 'આ કેટલી વાર જપવો જોઈએ?', 'હનુમાન ચાલીસા સંભળાવો'],
    verses: ['આ શ્લોક વિગતવાર સમજાવો', 'ગીતા કર્મ વિશે શું કહે છે?', 'મનને શાંત કેવી રીતે કરવું?'],
    general: ['આજનું પંચાંગ જણાવો', 'મેષ રાશિનું આજનું રાશિફળ', 'આગામી એકાદશી ક્યારે છે?'],
  },
};

/** Suggestions for built-in answers, or when the AI forgot to add any, in the selected language. */
export function builtInFollowups(topic: Topic, lang: string, rashiName = ''): string[] {
  return (S[lang] ?? S['en'])[topic].map(q => q.replace('{r}', rashiName));
}
