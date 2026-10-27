import { Injectable, computed, signal } from '@angular/core';
import { SCRIPT_FOR_LANG, toScript } from './transliterate';

export interface Lang { code: string; label: string; speech: string; }

export const LANGS: Lang[] = [
  { code: 'hi', label: 'हिन्दी', speech: 'hi-IN' },
  { code: 'en', label: 'English', speech: 'en-IN' },
  { code: 'kn', label: 'ಕನ್ನಡ', speech: 'kn-IN' },
  { code: 'ta', label: 'தமிழ்', speech: 'ta-IN' },
  { code: 'te', label: 'తెలుగు', speech: 'te-IN' },
  { code: 'mr', label: 'मराठी', speech: 'mr-IN' },
  { code: 'bn', label: 'বাংলা', speech: 'bn-IN' },
  { code: 'gu', label: 'ગુજરાતી', speech: 'gu-IN' },
];

type Dict = Record<string, string>;

const en: Dict = {
  askNext: 'You could ask next',
  'nav.rashifal': 'Rashifal', rashifalTitle: 'Rashifal', rashifalIntro: 'Your day, week and month by Moon sign, worked out from where the Moon and Sun really are — not copied from a newspaper.',
  rfToday: 'Today', rfTomorrow: 'Tomorrow', rfWeek: 'This week', rfMonth: 'This month', rfPick: 'Choose your rashi',
  rfName: 'Don\'t know your rashi? Type your name', rfNamePh: 'e.g. Rahul or राहुल', rfFind: 'Find rashi',
  rfNameIs: 'By the first letter of “{n}”, your naam rashi is {r}. If you know your janma rashi (Moon sign at birth), choose that instead.',
  rfNameNone: 'Couldn\'t tell from that name. Please choose your rashi above.',
  rfOverall: 'Overall', rfWork: 'Work & money', rfLove: 'Family & relations', rfHealth: 'Health', rfLord: 'Lord',
  rfLuckyColour: 'Lucky colour', rfLuckyNumber: 'Lucky number', rfUpay: 'Upay', rfChant: 'Chant',
  rfMoonIn: 'The Moon is in {r}, the {h} house from your sign.', rfChange: 'From {t} the Moon moves to {r} ({h} house):',
  rfSunIn: 'The Sun is in {r}, the {h} house from your sign.', rfAfter: 'After {d}:', rfBestDay: 'Best day this week',
  rfAsk: 'Ask PanditJi in detail', 'rfAskQ.today': 'Tell me today\'s rashifal for {r} rashi in detail', 'rfAskQ.tomorrow': 'Tell me tomorrow\'s rashifal for {r} rashi in detail', 'rfAskQ.week': 'Tell me this week\'s rashifal for {r} rashi in detail', 'rfAskQ.month': 'Tell me this month\'s rashifal for {r} rashi in detail', rfOpen: 'Full rashifal',
  rfHomeBtn: 'Today\'s Rashifal', rfHomeSub: 'All 12 rashis · daily, weekly, monthly',
  rfNote: 'General guidance by Moon sign (Chandra gochar, Lahiri ayanamsa) for your location. A personal reading needs your full birth chart.',
  ex5: 'What does today look like for Mesha rashi?',
  guruVoice: 'In Guru ji\'s voice', textComing: 'Full text coming soon. Listen to Guru ji and sing along.',
  'nav.learn': 'Learn', 'nav.samagri': 'Samagri', learnTitle: 'Learn mantras', learnIntro: 'Every mantra, stotra, chalisa and aarti: the daily puja in order, then by deity. Tap one to chant along.',
  dailyPuja: 'Daily puja, step by step', dailyPujaSub: 'The mantras of a simple home puja, from waking to sleep.', nothingFound: 'Nothing found.',
  samagriTitle: 'Puja samagri', samagriIntro: 'What to keep ready for each puja. Tick items off while shopping and share the list.',
  shareWhatsApp: 'Share on WhatsApp', copyList: 'Copy list', clearTicks: 'Clear ticks', samagriNote: 'Common practice; your family purohit may add or change items. Ticks are saved on this device.',
  listenSpeak: 'Speak now… PanditJi is listening', micDenied: 'Microphone permission is off. Allow it in Settings → Apps → Vedic Pandit → Permissions.', micError: 'Could not hear you. Tap the mic and try again.',
  rightNow: 'Right now', pakshaDay: 'Day {n} of 15, {p}', endsAt: 'ends', nowCaption: 'The bars show how much of each limb has passed. Tithi changes every 12° the Moon gains on the Sun; nakshatra and yoga every 13°20′.',
  tradition: 'Sampradaya', botHello: 'Namaste! Ask me anything 🙏', botOnline: 'Online · answers any question', botBuiltIn: 'Built-in answers (server not connected)',
  fullScreen: 'Open full screen', pickLocation: 'Choose your location', inIndia: 'India', outsideIndia: 'Outside India', state: 'State / UT', district: 'District',
  chooseState: 'Choose state', chooseDistrict: 'Choose district', tirths: 'Tirth kshetras',
  locNote: 'Sunrise and tithi are calculated for the centre of the district. District list: DataMeet (CC BY 2.5 India), names updated to today’s.',
  allTexts: 'All', kindMantra: 'Mantras', kindStotra: 'Stotras', kindChalisa: 'Chalisa & Aarti', searchMantra: 'Search mantra or stotra',
  verseOf: 'Verse {n} of {total}', prevVerse: 'Previous verse', nextVerse: 'Next verse', fullText: 'Full text', textCredit: 'Text',
  voiceNone: 'No Hindi or Sanskrit voice on this device. Install “Hindi” under Settings → Text-to-speech (Google Speech Services) to hear the guide.',
  voiceNoneWeb: 'Your browser has no Hindi or Sanskrit voice, so the voice guide is off (an English voice cannot pronounce Sanskrit). Chrome on Android and Edge have one.',
  voiceIs: 'Voice: {v}', forTradition: 'For your sampradaya', vaishnavaEkadashi: 'Vaishnava Ekadashi',
  'nav.dakshina': 'Dakshina',
  'chapter': 'Chapter',
  'clearSearch': 'Show all',
  'waking': 'Waking up PanditJi, this can take up to a minute…',
  'getApp': 'Get App',
  'dakIntro': 'Vedic Pandit is free and has no ads. If it has helped you, you can offer a dakshina to keep it running.',
  'dakAmount': 'Choose an amount',
  'dakOther': 'Or enter your own',
  'dakAny': 'Any amount',
  'dakWhy': 'Shagun amounts end in 1. The extra rupee is for a new beginning.',
  'dakPay': 'Pay {amt} with a UPI app',
  'dakPayHint': 'Opens Google Pay, PhonePe, Paytm or BHIM with the details filled in.',
  'dakScan': 'Scan with any UPI app',
  'dakAnyAmount': 'Any amount',
  'dakCopy': 'Copy',
  'dakCopied': 'Copied',
  'dakTo': 'Goes to',
  'dakSafe': 'Payments go straight to the bank account behind this UPI ID through your own UPI app. Vedic Pandit never sees your bank or card details.',
  'appTitle': 'Get the Vedic Pandit app',
  'appSub': 'Panchang, muhurat and mantras on your phone, even offline.',
  'appDownload': 'Download for Android',
  'appStep1': 'Tap Download for Android. The app file (VedicPandit.apk) downloads.',
  'appStep2': 'Open it from your notifications or Downloads.',
  'appStep3': 'Tap Install. If Android asks, allow your browser to install apps.',
  'appIos': 'The app is for Android. On iPhone, add Vedic Pandit to your Home Screen and it opens like an app:',
  'appIos1': 'Tap the Share button at the bottom of Safari.',
  'appIos2': 'Choose Add to Home Screen.',
  'appIos3': 'Tap Add.',
  'appScan': 'Scan with your Android phone',
  'appScanHint': 'Point your phone camera at the code to download the app, or download the file here and send it to your phone.',
  'appNote': 'Installing a newer version updates the app and keeps your city and language.',
  creditPre: 'Crafted with devotion by ', creditName: 'Ekant Shukla',
  untilT: 'until {t}', 
  appName: 'Vedic Pandit', tagline: 'Panchang, muhurat, mantra and scripture — calculated for where you are.',
  'nav.panchang': 'Panchang', 'nav.muhurat': 'Muhurat', 'nav.mantra': 'Mantra', 'nav.granth': 'Granth', 'nav.ask': 'Ask PanditJi',
  today: 'Today', tithi: 'Tithi', nakshatra: 'Nakshatra', yoga: 'Yoga', karana: 'Karana', vara: 'Vara', paksha: 'Paksha', masa: 'Masa',
  samvat: 'Vikram Samvat', ritu: 'Ritu', ayana: 'Ayana', sunrise: 'Sunrise', sunset: 'Sunset', sunRashi: 'Sun sign', moonRashi: 'Moon sign',
  rahuKaal: 'Rahu Kaal', yamaganda: 'Yamaganda', gulika: 'Gulika Kaal', abhijit: 'Abhijit Muhurat', brahma: 'Brahma Muhurat',
  choghadiya: 'Choghadiya', day: 'Day', night: 'Night', until: 'until', nextDay: 'next day', observances: 'Festivals & vrat',
  inauspicious: 'Times to avoid', auspicious: 'Auspicious times', now: 'Now', good: 'Good', avoid: 'Avoid', neutral: 'Neutral',
  skyCaption: 'The tithi is the angle between Moon and Sun. Each 12° is one tithi.',
  moonIn: 'Moon in', sunIn: 'Sun in',
  askPlaceholder: 'Ask about a shloka, a festival, today\'s Rahu Kaal…', ask: 'Ask', listening: 'Listening… tap to stop', speak: 'Speak your question',
  readAloud: 'Read aloud', stopReading: 'Stop', thinking: 'PanditJi is consulting the panchang…',
  ex1: 'What does the Gita say about anger?', ex2: 'Is tomorrow good for buying a car?', ex3: 'Teach me to pronounce the Mahamrityunjaya mantra',
  ex4: 'When is the next Ekadashi?',
  muhuratTitle: 'Find a muhurat', muhuratIntro: 'Pick the occasion and a date range. Windows avoid Rahu Kaal, Yamaganda, Gulika and Bhadra.',
  event: 'Occasion', from: 'From', to: 'To', find: 'Find muhurat', noResults: 'No suitable windows in this range. Try a longer range.',
  score: 'Score', why: 'Why this time',
  mantraTitle: 'Mantra uchcharan', mantraIntro: 'Chant along. Each word lights up as you go; slow it down until every syllable is clear.',
  play: 'Chant', pause: 'Pause', restart: 'Restart', tempo: 'Speed', count: 'Japa count', meaning: 'Meaning', pronunciation: 'Pronunciation',
  script: 'Script', source: 'Source', benefits: 'When to chant', voice: 'Voice guide', tapToCount: 'Tap the bead after each round',
  granthTitle: 'Granth', granthIntro: 'Read verses with translation, or search by topic.', search: 'Search verses', searchPh: 'e.g. karma, mind, anger, Gita 2.47',
  verses: 'verses',
  location: 'Location', useMyLocation: 'Use my location', monthSystem: 'Month system', purnimanta: 'Purnimanta (North)', amanta: 'Amanta (South/West)',
  date: 'Date', prevDay: 'Previous day', nextDayBtn: 'Next day', todayBtn: 'Today',
  offline: 'PanditJi is answering from his built-in library: panchang, muhurat, mantras and Gita verses. Open questions need the PanditJi server.',
  loading: 'Loading…', error: 'Could not load. Check your connection and try again.',
  disclaimer: 'Calculated with Lahiri ayanamsa for the selected location. For major samskaras, confirm with your family purohit.',
  chatEmpty: 'Namaste. Ask me anything: your rashifal, today\'s panchang, a muhurat, a mantra, the Gita — or any question at all.',
  you: 'You', panditji: 'PanditJi', openChat: 'Ask PanditJi', closeChat: 'Close',
};

const hi: Dict = {
  askNext: 'आगे पूछ सकते हैं',
  'nav.rashifal': 'राशिफल', rashifalTitle: 'राशिफल', rashifalIntro: 'चंद्र राशि के अनुसार आपका दिन, सप्ताह और महीना — चंद्रमा और सूर्य की वास्तविक स्थिति से गणना, अख़बार से नकल नहीं।',
  rfToday: 'आज', rfTomorrow: 'कल', rfWeek: 'साप्ताहिक', rfMonth: 'मासिक', rfPick: 'अपनी राशि चुनें',
  rfName: 'राशि नहीं पता? अपना नाम लिखें', rfNamePh: 'जैसे राहुल या Rahul', rfFind: 'राशि जानें',
  rfNameIs: '“{n}” के पहले अक्षर से आपकी नाम राशि {r} है। अगर जन्म राशि (जन्म के समय चंद्र राशि) पता हो तो वही चुनें।',
  rfNameNone: 'इस नाम से राशि तय नहीं हो पाई। कृपया ऊपर से अपनी राशि चुनें।',
  rfOverall: 'सामान्य', rfWork: 'काम और धन', rfLove: 'परिवार और संबंध', rfHealth: 'स्वास्थ्य', rfLord: 'स्वामी',
  rfLuckyColour: 'शुभ रंग', rfLuckyNumber: 'शुभ अंक', rfUpay: 'उपाय', rfChant: 'जप करें',
  rfMoonIn: 'चंद्रमा {r} राशि में है, आपकी राशि से {h} भाव में।', rfChange: '{t} से चंद्रमा {r} राशि में ({h} भाव):',
  rfSunIn: 'सूर्य {r} राशि में है, आपकी राशि से {h} भाव में।', rfAfter: '{d} के बाद:', rfBestDay: 'इस सप्ताह का सबसे अच्छा दिन',
  rfAsk: 'पंडित जी से विस्तार में पूछें', 'rfAskQ.today': '{r} राशि का आज का राशिफल विस्तार से बताइए', 'rfAskQ.tomorrow': '{r} राशि का कल का राशिफल विस्तार से बताइए', 'rfAskQ.week': '{r} राशि का इस सप्ताह का राशिफल विस्तार से बताइए', 'rfAskQ.month': '{r} राशि का इस महीने का राशिफल विस्तार से बताइए', rfOpen: 'पूरा राशिफल',
  rfHomeBtn: 'आज का राशिफल', rfHomeSub: 'सभी 12 राशियाँ · दैनिक, साप्ताहिक, मासिक',
  rfNote: 'आपके स्थान के लिए चंद्र राशि (चंद्र गोचर, लाहिड़ी अयनांश) से सामान्य मार्गदर्शन। व्यक्तिगत फल के लिए पूरी जन्म कुंडली देखनी होती है।',
  ex5: 'मेष राशि का आज का राशिफल बताइए',
  guruVoice: 'गुरु जी की वाणी में', textComing: 'पूरा पाठ जल्द ही। गुरु जी को सुनें और साथ में गाएँ।',
  'nav.learn': 'मंत्र सीखें', 'nav.samagri': 'सामग्री', learnTitle: 'मंत्र सीखें', learnIntro: 'सभी मंत्र, स्तोत्र, चालीसा और आरती: पहले क्रम से नित्य पूजा, फिर देवता के अनुसार। किसी पर दबाएँ और साथ में जप करें।',
  dailyPuja: 'नित्य पूजा, क्रम से', dailyPujaSub: 'घर की सरल पूजा के मंत्र, जागने से सोने तक।', nothingFound: 'कुछ नहीं मिला।',
  samagriTitle: 'पूजा सामग्री', samagriIntro: 'हर पूजा के लिए क्या तैयार रखें। ख़रीदते समय टिक करें और सूची भेजें।',
  shareWhatsApp: 'WhatsApp पर भेजें', copyList: 'सूची कॉपी करें', clearTicks: 'टिक हटाएँ', samagriNote: 'सामान्य परंपरा; आपके कुल पुरोहित कुछ बदल या जोड़ सकते हैं। टिक इसी फ़ोन में सहेजे जाते हैं।',
  listenSpeak: 'बोलिए… पंडित जी सुन रहे हैं', micDenied: 'माइक्रोफ़ोन की अनुमति बंद है। Settings → Apps → Vedic Pandit → Permissions में चालू करें।', micError: 'आवाज़ सुनाई नहीं दी। माइक दबाकर फिर बोलें।',
  rightNow: 'इस समय', pakshaDay: '{p}, दिन {n} / 15', endsAt: 'समाप्ति', nowCaption: 'पट्टियाँ दिखाती हैं कि हर अंग कितना बीत चुका है। चंद्रमा सूर्य से हर 12° आगे बढ़ने पर तिथि बदलती है; नक्षत्र और योग हर 13°20′ पर।',
  tradition: 'संप्रदाय', botHello: 'नमस्ते! कुछ भी पूछिए 🙏', botOnline: 'ऑनलाइन · हर प्रश्न का उत्तर', botBuiltIn: 'अंतर्निहित उत्तर (सर्वर जुड़ा नहीं)',
  fullScreen: 'पूरी स्क्रीन पर खोलें', pickLocation: 'अपना स्थान चुनें', inIndia: 'भारत', outsideIndia: 'भारत के बाहर', state: 'राज्य / केंद्रशासित प्रदेश', district: 'ज़िला',
  chooseState: 'राज्य चुनें', chooseDistrict: 'ज़िला चुनें', tirths: 'तीर्थ क्षेत्र',
  locNote: 'सूर्योदय और तिथि ज़िले के केंद्र के लिए निकाले जाते हैं। ज़िला सूची: DataMeet (CC BY 2.5 India), नाम आज के अनुसार।',
  allTexts: 'सभी', kindMantra: 'मंत्र', kindStotra: 'स्तोत्र', kindChalisa: 'चालीसा व आरती', searchMantra: 'मंत्र या स्तोत्र खोजें',
  verseOf: 'श्लोक {n} / {total}', prevVerse: 'पिछला श्लोक', nextVerse: 'अगला श्लोक', fullText: 'पूरा पाठ', textCredit: 'पाठ',
  voiceNone: 'इस फ़ोन में हिन्दी/संस्कृत आवाज़ नहीं है। Settings → Text-to-speech (Google Speech Services) में “Hindi” इंस्टॉल करें।',
  voiceNoneWeb: 'आपके ब्राउज़र में हिन्दी या संस्कृत आवाज़ नहीं है, इसलिए स्वर मार्गदर्शन बंद है (अंग्रेज़ी आवाज़ संस्कृत ठीक नहीं बोल पाती)। Android पर Chrome और Edge में यह उपलब्ध है।',
  voiceIs: 'आवाज़: {v}', forTradition: 'आपके संप्रदाय के लिए', vaishnavaEkadashi: 'वैष्णव एकादशी',
  'nav.dakshina': 'दक्षिणा',
  'chapter': 'अध्याय',
  'clearSearch': 'सभी दिखाएँ',
  'waking': 'पंडित जी को जगा रहे हैं, इसमें एक मिनट तक लग सकता है…',
  'getApp': 'ऐप पाएँ',
  'dakIntro': 'वैदिक पंडित निःशुल्क और विज्ञापन-रहित है। यदि इससे आपको सहायता मिली हो, तो इसे चलाते रहने के लिए दक्षिणा अर्पित कर सकते हैं।',
  'dakAmount': 'राशि चुनें',
  'dakOther': 'या अपनी राशि लिखें',
  'dakAny': 'कोई भी राशि',
  'dakWhy': 'शगुन की राशि 1 पर समाप्त होती है। यह एक रुपया नई शुरुआत का प्रतीक है।',
  'dakPay': 'UPI ऐप से {amt} दें',
  'dakPayHint': 'Google Pay, PhonePe, Paytm या BHIM विवरण भरकर खुलेगा।',
  'dakScan': 'किसी भी UPI ऐप से स्कैन करें',
  'dakAnyAmount': 'कोई भी राशि',
  'dakCopy': 'कॉपी करें',
  'dakCopied': 'कॉपी हो गया',
  'dakTo': 'प्राप्तकर्ता',
  'dakSafe': 'भुगतान आपके अपने UPI ऐप से सीधे इस UPI ID के बैंक खाते में जाता है। वैदिक पंडित आपके बैंक या कार्ड का विवरण कभी नहीं देखता।',
  'appTitle': 'वैदिक पंडित ऐप पाएँ',
  'appSub': 'पंचांग, मुहूर्त और मंत्र आपके फ़ोन में, बिना इंटरनेट के भी।',
  'appDownload': 'Android के लिए डाउनलोड करें',
  'appStep1': 'डाउनलोड दबाएँ। ऐप फ़ाइल (VedicPandit.apk) डाउनलोड होगी।',
  'appStep2': 'इसे नोटिफ़िकेशन या Downloads से खोलें।',
  'appStep3': 'Install दबाएँ। पूछे जाने पर ब्राउज़र को ऐप इंस्टॉल करने की अनुमति दें।',
  'appIos': 'ऐप Android के लिए है। iPhone पर वैदिक पंडित को होम स्क्रीन पर जोड़ें, यह ऐप की तरह खुलेगा:',
  'appIos1': 'Safari में नीचे Share बटन दबाएँ।',
  'appIos2': 'Add to Home Screen चुनें।',
  'appIos3': 'Add दबाएँ।',
  'appScan': 'अपने Android फ़ोन से स्कैन करें',
  'appScanHint': 'ऐप डाउनलोड करने के लिए फ़ोन का कैमरा कोड पर रखें, या फ़ाइल यहीं डाउनलोड करके फ़ोन पर भेजें।',
  'appNote': 'नया संस्करण इंस्टॉल करने से ऐप अपडेट हो जाता है और आपका शहर व भाषा बने रहते हैं।',
  creditPre: 'श्रद्धा और भक्ति से रचित — ', creditName: 'एकांत शुक्ल',
  untilT: '{t} तक', 
  appName: 'वैदिक पंडित', tagline: 'पंचांग, मुहूर्त, मंत्र और शास्त्र — आपके स्थान के अनुसार गणना।',
  'nav.panchang': 'पंचांग', 'nav.muhurat': 'मुहूर्त', 'nav.mantra': 'मंत्र', 'nav.granth': 'ग्रंथ', 'nav.ask': 'पंडित जी से पूछें',
  today: 'आज', tithi: 'तिथि', nakshatra: 'नक्षत्र', yoga: 'योग', karana: 'करण', vara: 'वार', paksha: 'पक्ष', masa: 'मास',
  samvat: 'विक्रम संवत', ritu: 'ऋतु', ayana: 'अयन', sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', sunRashi: 'सूर्य राशि', moonRashi: 'चंद्र राशि',
  rahuKaal: 'राहु काल', yamaganda: 'यमगंड', gulika: 'गुलिक काल', abhijit: 'अभिजित मुहूर्त', brahma: 'ब्रह्म मुहूर्त',
  choghadiya: 'चौघड़िया', day: 'दिन', night: 'रात', until: 'तक', nextDay: 'अगले दिन', observances: 'पर्व और व्रत',
  inauspicious: 'वर्जित समय', auspicious: 'शुभ समय', now: 'अभी', good: 'शुभ', avoid: 'वर्जित', neutral: 'सामान्य',
  skyCaption: 'चंद्रमा और सूर्य के बीच का कोण ही तिथि है। हर 12° एक तिथि।',
  moonIn: 'चंद्र', sunIn: 'सूर्य',
  askPlaceholder: 'किसी श्लोक, पर्व या आज के राहु काल के बारे में पूछें…', ask: 'पूछें', listening: 'सुन रहे हैं… रोकने के लिए दबाएँ', speak: 'बोलकर पूछें',
  readAloud: 'सुनें', stopReading: 'रोकें', thinking: 'पंडित जी पंचांग देख रहे हैं…',
  ex1: 'गीता में क्रोध के बारे में क्या कहा गया है?', ex2: 'क्या कल गाड़ी खरीदना शुभ है?', ex3: 'महामृत्युंजय मंत्र का सही उच्चारण सिखाइए',
  ex4: 'अगली एकादशी कब है?',
  muhuratTitle: 'मुहूर्त खोजें', muhuratIntro: 'अवसर और तिथियाँ चुनें। राहु काल, यमगंड, गुलिक और भद्रा को छोड़कर समय दिए जाते हैं।',
  event: 'अवसर', from: 'से', to: 'तक', find: 'मुहूर्त खोजें', noResults: 'इस अवधि में उपयुक्त समय नहीं मिला। अवधि बढ़ाकर देखें।',
  score: 'अंक', why: 'यह समय क्यों',
  mantraTitle: 'मंत्र उच्चारण', mantraIntro: 'साथ-साथ जप करें। हर शब्द क्रम से चमकेगा; गति धीमी करें जब तक हर अक्षर स्पष्ट न हो।',
  play: 'जप करें', pause: 'रोकें', restart: 'फिर से', tempo: 'गति', count: 'जप संख्या', meaning: 'अर्थ', pronunciation: 'उच्चारण',
  script: 'लिपि', source: 'स्रोत', benefits: 'कब जपें', voice: 'स्वर मार्गदर्शन', tapToCount: 'हर आवृत्ति के बाद मनका दबाएँ',
  granthTitle: 'ग्रंथ', granthIntro: 'अनुवाद सहित श्लोक पढ़ें या विषय से खोजें।', search: 'श्लोक खोजें', searchPh: 'जैसे कर्म, मन, क्रोध, गीता 2.47',
  verses: 'श्लोक',
  location: 'स्थान', useMyLocation: 'मेरा स्थान', monthSystem: 'मास पद्धति', purnimanta: 'पूर्णिमांत (उत्तर)', amanta: 'अमांत (दक्षिण/पश्चिम)',
  date: 'दिनांक', prevDay: 'पिछला दिन', nextDayBtn: 'अगला दिन', todayBtn: 'आज',
  offline: 'पंडित जी अभी अपनी अंतर्निहित जानकारी से उत्तर दे रहे हैं: पंचांग, मुहूर्त, मंत्र और गीता के श्लोक। खुले प्रश्नों के लिए पंडित जी का सर्वर चाहिए।',
  loading: 'लोड हो रहा है…', error: 'लोड नहीं हो सका। कनेक्शन जाँचकर फिर प्रयास करें।',
  disclaimer: 'चयनित स्थान के लिए लाहिड़ी अयनांश से गणना। प्रमुख संस्कारों के लिए अपने कुल पुरोहित से पुष्टि करें।',
  chatEmpty: 'नमस्ते। कुछ भी पूछिए: राशिफल, आज का पंचांग, मुहूर्त, मंत्र, गीता — या कोई भी प्रश्न।',
  you: 'आप', panditji: 'पंडित जी', openChat: 'पंडित जी से पूछें', closeChat: 'बंद करें',
};

const mr: Dict = {
  'nav.dakshina': 'दक्षिणा',
  'getApp': 'ॲप मिळवा',
  creditPre: 'श्रद्धा आणि भक्तीने साकारले — ', creditName: 'एकांत शुक्ल',
  untilT: '{t} पर्यंत', 
  appName: 'वैदिक पंडित', 'nav.panchang': 'पंचांग', 'nav.muhurat': 'मुहूर्त', 'nav.mantra': 'मंत्र', 'nav.granth': 'ग्रंथ', 'nav.ask': 'पंडितजींना विचारा',
  today: 'आज', tithi: 'तिथी', nakshatra: 'नक्षत्र', yoga: 'योग', karana: 'करण', vara: 'वार', paksha: 'पक्ष', masa: 'मास', samvat: 'विक्रम संवत',
  ritu: 'ऋतू', ayana: 'अयन', sunrise: 'सूर्योदय', sunset: 'सूर्यास्त', sunRashi: 'सूर्य रास', moonRashi: 'चंद्र रास',
  rahuKaal: 'राहुकाळ', yamaganda: 'यमगंड', gulika: 'गुलिक काळ', abhijit: 'अभिजित मुहूर्त', brahma: 'ब्रह्म मुहूर्त', choghadiya: 'चौघडिया',
  day: 'दिवस', night: 'रात्र', until: 'पर्यंत', observances: 'सण व व्रत', now: 'आता', good: 'शुभ', avoid: 'वर्ज्य',
  ask: 'विचारा', askPlaceholder: 'श्लोक, सण किंवा आजच्या राहुकाळाबद्दल विचारा…', find: 'मुहूर्त शोधा', play: 'जप करा', pause: 'थांबा',
  meaning: 'अर्थ', pronunciation: 'उच्चार', location: 'स्थान', date: 'दिनांक', todayBtn: 'आज', search: 'श्लोक शोधा', you: 'तुम्ही', panditji: 'पंडितजी',
};

const kn: Dict = {
  'nav.dakshina': 'ದಕ್ಷಿಣೆ',
  'getApp': 'ಆ್ಯಪ್ ಪಡೆಯಿರಿ',
  creditPre: 'ಭಕ್ತಿಯಿಂದ ರಚಿಸಿದವರು ', creditName: 'ಏಕಾಂತ್ ಶುಕ್ಲ',
  untilT: '{t} ವರೆಗೆ', 
  appName: 'ವೈದಿಕ ಪಂಡಿತ', 'nav.panchang': 'ಪಂಚಾಂಗ', 'nav.muhurat': 'ಮುಹೂರ್ತ', 'nav.mantra': 'ಮಂತ್ರ', 'nav.granth': 'ಗ್ರಂಥ', 'nav.ask': 'ಪಂಡಿತರನ್ನು ಕೇಳಿ',
  today: 'ಇಂದು', tithi: 'ತಿಥಿ', nakshatra: 'ನಕ್ಷತ್ರ', yoga: 'ಯೋಗ', karana: 'ಕರಣ', vara: 'ವಾರ', paksha: 'ಪಕ್ಷ', masa: 'ಮಾಸ', samvat: 'ವಿಕ್ರಮ ಸಂವತ್',
  ritu: 'ಋತು', ayana: 'ಅಯನ', sunrise: 'ಸೂರ್ಯೋದಯ', sunset: 'ಸೂರ್ಯಾಸ್ತ', sunRashi: 'ಸೂರ್ಯ ರಾಶಿ', moonRashi: 'ಚಂದ್ರ ರಾಶಿ',
  rahuKaal: 'ರಾಹುಕಾಲ', yamaganda: 'ಯಮಗಂಡ', gulika: 'ಗುಳಿಕ ಕಾಲ', abhijit: 'ಅಭಿಜಿತ್ ಮುಹೂರ್ತ', brahma: 'ಬ್ರಹ್ಮ ಮುಹೂರ್ತ', choghadiya: 'ಚೌಘಡಿಯಾ',
  day: 'ಹಗಲು', night: 'ರಾತ್ರಿ', until: 'ವರೆಗೆ', observances: 'ಹಬ್ಬ ಮತ್ತು ವ್ರತ', now: 'ಈಗ', good: 'ಶುಭ', avoid: 'ವರ್ಜ್ಯ',
  ask: 'ಕೇಳಿ', askPlaceholder: 'ಶ್ಲೋಕ, ಹಬ್ಬ ಅಥವಾ ಇಂದಿನ ರಾಹುಕಾಲದ ಬಗ್ಗೆ ಕೇಳಿ…', find: 'ಮುಹೂರ್ತ ಹುಡುಕಿ', play: 'ಜಪಿಸಿ', pause: 'ನಿಲ್ಲಿಸಿ',
  meaning: 'ಅರ್ಥ', pronunciation: 'ಉಚ್ಚಾರಣೆ', location: 'ಸ್ಥಳ', date: 'ದಿನಾಂಕ', todayBtn: 'ಇಂದು', search: 'ಶ್ಲೋಕ ಹುಡುಕಿ', you: 'ನೀವು', panditji: 'ಪಂಡಿತರು',
};

const ta: Dict = {
  'nav.dakshina': 'தட்சிணை',
  'getApp': 'செயலி பெறுக',
  creditPre: 'பக்தியுடன் உருவாக்கியவர் ', creditName: 'ஏகாந்த் ஷுக்லா',
  untilT: '{t} வரை', 
  appName: 'வைதிக பண்டிதர்', 'nav.panchang': 'பஞ்சாங்கம்', 'nav.muhurat': 'முகூர்த்தம்', 'nav.mantra': 'மந்திரம்', 'nav.granth': 'நூல்கள்', 'nav.ask': 'பண்டிதரிடம் கேளுங்கள்',
  today: 'இன்று', tithi: 'திதி', nakshatra: 'நட்சத்திரம்', yoga: 'யோகம்', karana: 'கரணம்', vara: 'வாரம்', paksha: 'பட்சம்', masa: 'மாதம்', samvat: 'விக்கிரம சம்வத்',
  ritu: 'ருது', ayana: 'அயனம்', sunrise: 'சூரிய உதயம்', sunset: 'சூரிய அஸ்தமனம்', sunRashi: 'சூரிய ராசி', moonRashi: 'சந்திர ராசி',
  rahuKaal: 'ராகு காலம்', yamaganda: 'எமகண்டம்', gulika: 'குளிகை', abhijit: 'அபிஜித் முகூர்த்தம்', brahma: 'பிரம்ம முகூர்த்தம்', choghadiya: 'சௌகடியா',
  day: 'பகல்', night: 'இரவு', until: 'வரை', observances: 'பண்டிகை, விரதம்', now: 'இப்போது', good: 'நல்லது', avoid: 'தவிர்க்கவும்',
  ask: 'கேளுங்கள்', askPlaceholder: 'ஸ்லோகம், பண்டிகை அல்லது இன்றைய ராகு காலம் பற்றி கேளுங்கள்…', find: 'முகூர்த்தம் தேடு', play: 'ஜபிக்கவும்', pause: 'நிறுத்து',
  meaning: 'பொருள்', pronunciation: 'உச்சரிப்பு', location: 'இடம்', date: 'தேதி', todayBtn: 'இன்று', search: 'ஸ்லோகம் தேடு', you: 'நீங்கள்', panditji: 'பண்டிதர்',
};

const te: Dict = {
  'nav.dakshina': 'దక్షిణ',
  'getApp': 'యాప్ పొందండి',
  creditPre: 'భక్తితో రూపొందించినవారు ', creditName: 'ఏకాంత్ శుక్లా',
  untilT: '{t} వరకు', 
  appName: 'వైదిక పండితుడు', 'nav.panchang': 'పంచాంగం', 'nav.muhurat': 'ముహూర్తం', 'nav.mantra': 'మంత్రం', 'nav.granth': 'గ్రంథాలు', 'nav.ask': 'పండితుడిని అడగండి',
  today: 'ఈరోజు', tithi: 'తిథి', nakshatra: 'నక్షత్రం', yoga: 'యోగం', karana: 'కరణం', vara: 'వారం', paksha: 'పక్షం', masa: 'మాసం', samvat: 'విక్రమ సంవత్',
  ritu: 'ఋతువు', ayana: 'అయనం', sunrise: 'సూర్యోదయం', sunset: 'సూర్యాస్తమయం', sunRashi: 'సూర్య రాశి', moonRashi: 'చంద్ర రాశి',
  rahuKaal: 'రాహుకాలం', yamaganda: 'యమగండం', gulika: 'గుళిక కాలం', abhijit: 'అభిజిత్ ముహూర్తం', brahma: 'బ్రహ్మ ముహూర్తం', choghadiya: 'చౌఘడియా',
  day: 'పగలు', night: 'రాత్రి', until: 'వరకు', observances: 'పండుగలు, వ్రతాలు', now: 'ఇప్పుడు', good: 'శుభం', avoid: 'వర్జ్యం',
  ask: 'అడగండి', askPlaceholder: 'శ్లోకం, పండుగ లేదా ఈరోజు రాహుకాలం గురించి అడగండి…', find: 'ముహూర్తం వెతకండి', play: 'జపించండి', pause: 'ఆపండి',
  meaning: 'అర్థం', pronunciation: 'ఉచ్చారణ', location: 'స్థలం', date: 'తేదీ', todayBtn: 'ఈరోజు', search: 'శ్లోకం వెతకండి', you: 'మీరు', panditji: 'పండితుడు',
};

const bn: Dict = {
  'nav.dakshina': 'দক্ষিণা',
  'getApp': 'অ্যাপ নিন',
  creditPre: 'ভক্তিভরে তৈরি করেছেন ', creditName: 'একান্ত শুক্লা',
  untilT: '{t} পর্যন্ত', 
  appName: 'বৈদিক পণ্ডিত', 'nav.panchang': 'পঞ্জিকা', 'nav.muhurat': 'মুহূর্ত', 'nav.mantra': 'মন্ত্র', 'nav.granth': 'গ্রন্থ', 'nav.ask': 'পণ্ডিতজিকে জিজ্ঞাসা করুন',
  today: 'আজ', tithi: 'তিথি', nakshatra: 'নক্ষত্র', yoga: 'যোগ', karana: 'করণ', vara: 'বার', paksha: 'পক্ষ', masa: 'মাস', samvat: 'বিক্রম সংবৎ',
  ritu: 'ঋতু', ayana: 'অয়ন', sunrise: 'সূর্যোদয়', sunset: 'সূর্যাস্ত', sunRashi: 'সূর্য রাশি', moonRashi: 'চন্দ্র রাশি',
  rahuKaal: 'রাহুকাল', yamaganda: 'যমগণ্ড', gulika: 'গুলিক কাল', abhijit: 'অভিজিৎ মুহূর্ত', brahma: 'ব্রাহ্ম মুহূর্ত', choghadiya: 'চৌঘড়িয়া',
  day: 'দিন', night: 'রাত', until: 'পর্যন্ত', observances: 'উৎসব ও ব্রত', now: 'এখন', good: 'শুভ', avoid: 'বর্জনীয়',
  ask: 'জিজ্ঞাসা', askPlaceholder: 'শ্লোক, উৎসব বা আজকের রাহুকাল সম্পর্কে জিজ্ঞাসা করুন…', find: 'মুহূর্ত খুঁজুন', play: 'জপ করুন', pause: 'থামুন',
  meaning: 'অর্থ', pronunciation: 'উচ্চারণ', location: 'স্থান', date: 'তারিখ', todayBtn: 'আজ', search: 'শ্লোক খুঁজুন', you: 'আপনি', panditji: 'পণ্ডিতজি',
};

const gu: Dict = {
  'nav.dakshina': 'દક્ષિણા',
  'getApp': 'ઍપ મેળવો',
  creditPre: 'શ્રદ્ધા અને ભક્તિથી રચિત — ', creditName: 'એકાંત શુક્લ',
  untilT: '{t} સુધી', 
  appName: 'વૈદિક પંડિત', 'nav.panchang': 'પંચાંગ', 'nav.muhurat': 'મુહૂર્ત', 'nav.mantra': 'મંત્ર', 'nav.granth': 'ગ્રંથ', 'nav.ask': 'પંડિતજીને પૂછો',
  today: 'આજે', tithi: 'તિથિ', nakshatra: 'નક્ષત્ર', yoga: 'યોગ', karana: 'કરણ', vara: 'વાર', paksha: 'પક્ષ', masa: 'માસ', samvat: 'વિક્રમ સંવત',
  ritu: 'ઋતુ', ayana: 'અયન', sunrise: 'સૂર્યોદય', sunset: 'સૂર્યાસ્ત', sunRashi: 'સૂર્ય રાશિ', moonRashi: 'ચંદ્ર રાશિ',
  rahuKaal: 'રાહુકાળ', yamaganda: 'યમઘંટ', gulika: 'ગુલિક કાળ', abhijit: 'અભિજિત મુહૂર્ત', brahma: 'બ્રહ્મ મુહૂર્ત', choghadiya: 'ચોઘડિયા',
  day: 'દિવસ', night: 'રાત', until: 'સુધી', observances: 'તહેવાર અને વ્રત', now: 'હમણાં', good: 'શુભ', avoid: 'વર્જ્ય',
  ask: 'પૂછો', askPlaceholder: 'શ્લોક, તહેવાર અથવા આજના રાહુકાળ વિશે પૂછો…', find: 'મુહૂર્ત શોધો', play: 'જપ કરો', pause: 'રોકો',
  meaning: 'અર્થ', pronunciation: 'ઉચ્ચાર', location: 'સ્થળ', date: 'તારીખ', todayBtn: 'આજે', search: 'શ્લોક શોધો', you: 'તમે', panditji: 'પંડિતજી',
};

const DICTS: Record<string, Dict> = { en, hi, mr, kn, ta, te, bn, gu };

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly lang = signal<string>(this.initial());
  readonly current = computed(() => LANGS.find(l => l.code === this.lang()) ?? LANGS[0]);
  /** Hindi-script languages read Sanskrit names best; others get the romanised name. */
  readonly prefersDevanagari = computed(() => ['hi', 'mr'].includes(this.lang()));

  private initial(): string {
    try { const s = localStorage.getItem('vp.lang'); if (s && DICTS[s]) return s; } catch { /* storage blocked */ }
    const nav = (typeof navigator !== 'undefined' ? navigator.language : 'hi').slice(0, 2);
    return DICTS[nav] ? nav : 'hi';
  }

  /** Render a Sanskrit (Devanagari) name for the reader: Devanagari, their own script, or the Roman fallback. */
  sanskritName(devanagari: string, roman: string): string {
    if (this.prefersDevanagari()) return devanagari;
    const sc = SCRIPT_FOR_LANG[this.lang()];
    return sc && sc !== 'iast' && sc !== 'deva' ? toScript(devanagari, sc) : roman;
  }

  set(code: string) {
    this.lang.set(code);
    try { localStorage.setItem('vp.lang', code); } catch { /* ignore */ }
    document.documentElement.lang = code;
  }

  /** Template lookup: f('untilT', { t: '09:41' }) -> "until 09:41" / "09:41 तक". */
  f(key: string, args: Record<string, string>): string {
    return this.t(key).replace(/\{(\w+)\}/g, (_, k) => args[k] ?? '');
  }

  t(key: string): string {
    // Marathi falls back to Hindi before English since both use Devanagari and share vocabulary
    const chain = this.lang() === 'mr' ? [DICTS['mr'], hi, en] : [DICTS[this.lang()], en];
    for (const d of chain) if (d?.[key]) return d[key];
    return key;
  }
}
