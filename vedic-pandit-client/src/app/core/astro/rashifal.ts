// Rashifal (horoscope by Moon sign) from the actual transit of the Moon and the Sun.
// Method: Chandra gochar — the house the transiting Moon occupies counted from your rashi gives the day's tone
// (good in 1, 3, 6, 7, 10, 11; difficult in 4, 8, 12; mixed in 2, 5, 9). The weekday lord's natural friendship
// with your rashi lord shifts it by half a star. The month comes from the Sun's transit (good in 3, 6, 10, 11).
// Same ayanamsa (Lahiri) and ephemeris as the panchang, so the Moon sign here matches the panchang page.
import { findAngleCrossing, fromJd, moonSidereal, sunSidereal, toJd } from './astro';
import { addDays, isoLocal, tzOffsetMinutes } from './panchang-engine';
import { RASHI, RASHI_SA } from './names';

export type L = { en: string; hi: string };

export interface RashiInfo { id: number; en: string; hi: string; sym: string; lord: number; letters: string; lettersEn: string; }
export interface Graha { en: string; hi: string; colour: L; num: number; deity: L; mantra: string; mantraName: L; }

/** Planets in weekday order: Sunday = Sun … Saturday = Saturn, so the weekday index is also the day lord. */
export const GRAHA: Graha[] = [
  { en: 'Sun', hi: 'सूर्य', colour: { en: 'Orange', hi: 'नारंगी' }, num: 1, deity: { en: 'Offer water (arghya) to Surya at sunrise', hi: 'सूर्योदय के समय सूर्य को जल (अर्घ्य) दें' }, mantra: 'aditya-hridayam', mantraName: { en: 'Aditya Hridayam', hi: 'आदित्य हृदयम्' } },
  { en: 'Moon', hi: 'चंद्र', colour: { en: 'White', hi: 'सफ़ेद' }, num: 2, deity: { en: 'Offer water or milk to a Shivalinga', hi: 'शिवलिंग पर जल या दूध चढ़ाएँ' }, mantra: 'om-namah-shivaya', mantraName: { en: 'Om Namah Shivaya', hi: 'ॐ नमः शिवाय' } },
  { en: 'Mars', hi: 'मंगल', colour: { en: 'Red', hi: 'लाल' }, num: 9, deity: { en: 'Read the Hanuman Chalisa', hi: 'हनुमान चालीसा का पाठ करें' }, mantra: 'hanuman-chalisa', mantraName: { en: 'Hanuman Chalisa', hi: 'हनुमान चालीसा' } },
  { en: 'Mercury', hi: 'बुध', colour: { en: 'Green', hi: 'हरा' }, num: 5, deity: { en: 'Pray to Ganesha and offer durva grass', hi: 'गणेश जी को दूर्वा अर्पित करें' }, mantra: 'om-gam-ganapataye', mantraName: { en: 'Om Gam Ganapataye Namah', hi: 'ॐ गं गणपतये नमः' } },
  { en: 'Jupiter', hi: 'गुरु', colour: { en: 'Yellow', hi: 'पीला' }, num: 3, deity: { en: 'Worship Vishnu; respect your teachers and elders', hi: 'विष्णु जी की पूजा करें; गुरु और बड़ों का आदर करें' }, mantra: 'om-namo-bhagavate-vasudevaya', mantraName: { en: 'Om Namo Bhagavate Vasudevaya', hi: 'ॐ नमो भगवते वासुदेवाय' } },
  { en: 'Venus', hi: 'शुक्र', colour: { en: 'Pink', hi: 'गुलाबी' }, num: 6, deity: { en: 'Light a ghee lamp for Lakshmi', hi: 'लक्ष्मी जी के सामने घी का दीपक जलाएँ' }, mantra: 'mahalakshmi-mantra', mantraName: { en: 'Mahalakshmi mantra', hi: 'महालक्ष्मी मंत्र' } },
  { en: 'Saturn', hi: 'शनि', colour: { en: 'Blue', hi: 'नीला' }, num: 8, deity: { en: 'Light a sesame-oil lamp; help someone in need', hi: 'तिल के तेल का दीपक जलाएँ; किसी ज़रूरतमंद की मदद करें' }, mantra: 'shani-nilanjana', mantraName: { en: 'Shani stotra (Nilanjana)', hi: 'शनि स्तोत्र (नीलांजन)' } },
];

export const RASHIS: RashiInfo[] = [
  { id: 0, en: RASHI[0], hi: RASHI_SA[0], sym: '♈', lord: 2, letters: 'चू चे चो ला ली लू ले लो अ', lettersEn: 'Chu Che Cho La Li Lu Le Lo A' },
  { id: 1, en: RASHI[1], hi: RASHI_SA[1], sym: '♉', lord: 5, letters: 'इ उ ए ओ वा वी वू वे वो', lettersEn: 'I U E O Va Vi Vu Ve Vo' },
  { id: 2, en: RASHI[2], hi: RASHI_SA[2], sym: '♊', lord: 3, letters: 'का की कू घ ङ छ के को हा', lettersEn: 'Ka Ki Ku Gha Chha Ke Ko Ha' },
  { id: 3, en: RASHI[3], hi: RASHI_SA[3], sym: '♋', lord: 1, letters: 'ही हू हे हो डा डी डू डे डो', lettersEn: 'Hi Hu He Ho Da Di Du De Do' },
  { id: 4, en: RASHI[4], hi: RASHI_SA[4], sym: '♌', lord: 0, letters: 'मा मी मू मे मो टा टी टू टे', lettersEn: 'Ma Mi Mu Me Mo Ta Ti Tu Te' },
  { id: 5, en: RASHI[5], hi: RASHI_SA[5], sym: '♍', lord: 3, letters: 'टो पा पी पू ष ण ठ पे पो', lettersEn: 'To Pa Pi Pu Sha Na Tha Pe Po' },
  { id: 6, en: RASHI[6], hi: RASHI_SA[6], sym: '♎', lord: 5, letters: 'रा री रू रे रो ता ती तू ते', lettersEn: 'Ra Ri Ru Re Ro Ta Ti Tu Te' },
  { id: 7, en: RASHI[7], hi: RASHI_SA[7], sym: '♏', lord: 2, letters: 'तो ना नी नू ने नो या यी यू', lettersEn: 'To Na Ni Nu Ne No Ya Yi Yu' },
  { id: 8, en: RASHI[8], hi: RASHI_SA[8], sym: '♐', lord: 4, letters: 'ये यो भा भी भू धा फा ढा भे', lettersEn: 'Ye Yo Bha Bhi Bhu Dha Pha Bhe' },
  { id: 9, en: RASHI[9], hi: RASHI_SA[9], sym: '♑', lord: 6, letters: 'भो जा जी खी खू खे खो गा गी', lettersEn: 'Bho Ja Ji Khi Khu Khe Kho Ga Gi' },
  { id: 10, en: RASHI[10], hi: RASHI_SA[10], sym: '♒', lord: 6, letters: 'गू गे गो सा सी सू से सो दा', lettersEn: 'Gu Ge Go Sa Si Su Se So Da' },
  { id: 11, en: RASHI[11], hi: RASHI_SA[11], sym: '♓', lord: 4, letters: 'दी दू थ झ ञ दे दो चा ची', lettersEn: 'Di Du Tha Jha De Do Cha Chi' },
];

// Natural friendship (Brihat Parashara): 1 friend, 0 neutral, -1 enemy. Rows/cols in GRAHA order.
const FRIEND: number[][] = [
  /* Sun     */ [1, 1, 1, 0, 1, -1, -1],
  /* Moon    */ [1, 1, 0, 1, 0, 0, 0],
  /* Mars    */ [1, 1, 1, -1, 1, 0, 0],
  /* Mercury */ [1, -1, 0, 1, 0, 1, 0],
  /* Jupiter */ [1, 1, 1, -1, 1, -1, 0],
  /* Venus   */ [-1, -1, 0, 1, 0, 1, 1],
  /* Saturn  */ [-1, -1, -1, 1, 0, 1, 1],
];

/** Base strength of the Moon's transit through each house (1–5). */
const MOON_BASE = [0, 4, 2, 5, 2, 2, 4, 4, 1, 3, 5, 5, 2];
/** Sun's transit: good in 3, 6, 10, 11. */
const SUN_BASE = [0, 2, 2, 5, 2, 3, 5, 3, 2, 3, 5, 5, 2];

export interface DayText { overall: L; work: L; love: L; health: L; }

const MOON_TEXT: DayText[] = [
  null as unknown as DayText,
  { // 1
    overall: { en: 'The Moon is in your own sign: the mind is steady and people notice you. A comfortable, pleasant day.', hi: 'चंद्रमा आपकी ही राशि में है: मन स्थिर रहेगा और लोग आपकी बात सुनेंगे। सुखद और आरामदायक दिन।' },
    work: { en: 'Good for starting pending work and taking the first step yourself.', hi: 'रुके काम शुरू करने और ख़ुद पहल करने के लिए अच्छा दिन।' },
    love: { en: 'Warm time with family; good food and company.', hi: 'परिवार के साथ अच्छा समय; अच्छा भोजन और साथ।' },
    health: { en: 'Energy is good. Just do not overeat.', hi: 'ऊर्जा अच्छी रहेगी। बस ज़्यादा भोजन से बचें।' },
  },
  { // 2
    overall: { en: 'Money slips out easily today and words carry weight. Speak softly and spend with care.', hi: 'आज पैसा आसानी से ख़र्च हो सकता है और शब्दों का असर ज़्यादा होगा। मीठा बोलें, सोच-समझकर ख़र्च करें।' },
    work: { en: 'Payments may be delayed. Check accounts and bills twice.', hi: 'भुगतान में देरी हो सकती है। हिसाब और बिल दो बार जाँचें।' },
    love: { en: 'A sharp word can hurt someone at home; keep your tone gentle.', hi: 'घर में कड़वी बात किसी को चुभ सकती है; लहजा नरम रखें।' },
    health: { en: 'Take care of eyes, teeth and throat; eat simple food.', hi: 'आँख, दाँत और गले का ध्यान रखें; सादा भोजन करें।' },
  },
  { // 3
    overall: { en: 'A day of courage and success. Efforts pay off and friends help.', hi: 'साहस और सफलता का दिन। मेहनत का फल मिलेगा और मित्र साथ देंगे।' },
    work: { en: 'Good for calls, meetings, short trips and negotiations.', hi: 'फ़ोन, मुलाक़ात, छोटी यात्रा और बातचीत के लिए अच्छा समय।' },
    love: { en: 'Brothers, sisters and neighbours are supportive.', hi: 'भाई-बहन और पड़ोसी सहयोग करेंगे।' },
    health: { en: 'Full of energy; a good day to exercise.', hi: 'भरपूर ऊर्जा; व्यायाम के लिए अच्छा दिन।' },
  },
  { // 4
    overall: { en: 'The mind may feel unsettled. Keep the day simple and give time to home.', hi: 'मन थोड़ा बेचैन रह सकता है। दिन सरल रखें और घर को समय दें।' },
    work: { en: 'Avoid big decisions about property, vehicle or a job change today.', hi: 'आज संपत्ति, वाहन या नौकरी बदलने जैसे बड़े फ़ैसले टालें।' },
    love: { en: 'Mother or home may need your attention.', hi: 'माता या घर को आपके ध्यान की ज़रूरत हो सकती है।' },
    health: { en: 'Rest well and avoid stress; take care of the chest and sleep.', hi: 'अच्छा आराम करें, तनाव से बचें; छाती और नींद का ध्यान रखें।' },
  },
  { // 5
    overall: { en: 'Plans may move slowly. Patience works better than hurry.', hi: 'योजनाएँ धीरे आगे बढ़ेंगी। जल्दबाज़ी से ज़्यादा धैर्य काम आएगा।' },
    work: { en: 'Avoid speculation and risky investments. Students should revise rather than start new topics.', hi: 'सट्टे और जोखिम वाले निवेश से बचें। विद्यार्थी नया शुरू करने के बजाय दोहराएँ।' },
    love: { en: 'Small misunderstandings are possible; children may need attention.', hi: 'छोटी-मोटी ग़लतफ़हमी हो सकती है; बच्चों पर ध्यान दें।' },
    health: { en: 'Watch your digestion; eat light.', hi: 'पाचन का ध्यान रखें; हल्का भोजन करें।' },
  },
  { // 6
    overall: { en: 'You win over obstacles and rivals. A good day to finish pending matters.', hi: 'बाधाओं और विरोधियों पर विजय मिलेगी। अधूरे काम पूरे करने के लिए अच्छा दिन।' },
    work: { en: 'Competition goes your way; a good day to clear dues and loans.', hi: 'प्रतियोगिता में आप आगे रहेंगे; उधार और बकाया चुकाने के लिए अच्छा दिन।' },
    love: { en: 'Helping someone today brings goodwill.', hi: 'आज किसी की मदद करने से सद्भावना बढ़ेगी।' },
    health: { en: 'Health improves. Start a healthy routine today.', hi: 'स्वास्थ्य में सुधार। आज से अच्छी दिनचर्या शुरू करें।' },
  },
  { // 7
    overall: { en: 'Partnerships and social life are favoured. You get respect and support.', hi: 'साझेदारी और सामाजिक जीवन के लिए अनुकूल दिन। मान और सहयोग मिलेगा।' },
    work: { en: 'Good for meetings, deals and working with a partner.', hi: 'मीटिंग, सौदे और साझेदारी के काम के लिए अच्छा।' },
    love: { en: 'Harmony with your spouse or partner; a nice day to go out together.', hi: 'जीवनसाथी के साथ तालमेल; साथ घूमने के लिए अच्छा दिन।' },
    health: { en: 'Good health and a cheerful mood.', hi: 'अच्छा स्वास्थ्य और प्रसन्न मन।' },
  },
  { // 8
    overall: { en: 'Keep a low profile today. Avoid risks and unnecessary arguments.', hi: 'आज शांत रहकर काम करें। जोखिम और बेवजह की बहस से बचें।' },
    work: { en: 'Sudden hurdles are possible; postpone signing important papers if you can.', hi: 'अचानक रुकावट आ सकती है; हो सके तो ज़रूरी काग़ज़ों पर हस्ताक्षर टालें।' },
    love: { en: 'Do not take small things to heart; stay calm with family.', hi: 'छोटी बातों को दिल पर न लें; परिवार के साथ शांत रहें।' },
    health: { en: 'Drive carefully and do not ignore small health signs.', hi: 'सावधानी से वाहन चलाएँ और छोटी स्वास्थ्य समस्याओं को अनदेखा न करें।' },
  },
  { // 9
    overall: { en: 'Luck moves slowly, but blessings of elders and prayer help. Good for dharma and learning.', hi: 'भाग्य धीमा है, पर बड़ों का आशीर्वाद और प्रार्थना साथ देंगे। धर्म और अध्ययन के लिए अच्छा।' },
    work: { en: 'Results take time; avoid shortcuts.', hi: 'परिणाम में समय लगेगा; शॉर्टकट से बचें।' },
    love: { en: 'Listen to advice from your father, teacher or elders.', hi: 'पिता, गुरु या बड़ों की सलाह सुनें।' },
    health: { en: 'Moderate; do not tire yourself out.', hi: 'सामान्य; ज़्यादा थकान से बचें।' },
  },
  { // 10
    overall: { en: 'A strong day for work. Your efforts are seen and recognised.', hi: 'काम के लिए बहुत अच्छा दिन। आपकी मेहनत दिखेगी और सराही जाएगी।' },
    work: { en: 'Seniors notice you; do the important work today.', hi: 'वरिष्ठ आपका काम देखेंगे; ज़रूरी काम आज ही करें।' },
    love: { en: 'Respect in the family; parents are pleased.', hi: 'परिवार में मान बढ़ेगा; माता-पिता प्रसन्न रहेंगे।' },
    health: { en: 'Good, though busy. Take short breaks.', hi: 'अच्छा, पर व्यस्तता रहेगी। बीच-बीच में आराम करें।' },
  },
  { // 11
    overall: { en: 'A day of gains. Wishes can be fulfilled and friends bring good news.', hi: 'लाभ का दिन। इच्छाएँ पूरी हो सकती हैं और मित्रों से अच्छी ख़बर मिलेगी।' },
    work: { en: 'Income and gains are likely; good for asking for what you want.', hi: 'आय और लाभ की संभावना; अपनी बात रखने के लिए अच्छा दिन।' },
    love: { en: 'Joyful time with friends and family.', hi: 'मित्रों और परिवार के साथ आनंद का समय।' },
    health: { en: 'Good health and high spirits.', hi: 'अच्छा स्वास्थ्य और उत्साह।' },
  },
  { // 12
    overall: { en: 'Expenses and running around are likely. A good day for prayer, rest and charity.', hi: 'ख़र्च और भाग-दौड़ रह सकती है। प्रार्थना, आराम और दान के लिए अच्छा दिन।' },
    work: { en: 'Postpone big purchases; keep track of where money goes.', hi: 'बड़ी ख़रीदारी टालें; पैसे के ख़र्च पर नज़र रखें।' },
    love: { en: 'Someone close may feel distant; give them time.', hi: 'कोई अपना दूर-सा महसूस कर सकता है; उन्हें समय दें।' },
    health: { en: 'Sleep well; tiredness is possible.', hi: 'अच्छी नींद लें; थकान हो सकती है।' },
  },
];

/** One-line tone of a day by the Moon's house from the rashi. */
export const moonOverall = (house: number): L => MOON_TEXT[house].overall;

const SUN_TEXT: L[] = [
  null as unknown as L,
  { en: 'The Sun is in your sign: confidence rises but so can ego and heat. Lead, but listen too.', hi: 'सूर्य आपकी राशि में: आत्मविश्वास बढ़ेगा, पर अहं और क्रोध भी। नेतृत्व करें, पर दूसरों की भी सुनें।' },
  { en: 'Money and family matters need care this month. Speak gently and avoid lending.', hi: 'इस महीने धन और परिवार के मामलों में सावधानी रखें। मीठा बोलें, उधार देने से बचें।' },
  { en: 'A month of courage and progress. Efforts succeed; short travel is fruitful.', hi: 'साहस और प्रगति का महीना। प्रयास सफल होंगे; छोटी यात्राएँ फलदायी।' },
  { en: 'Home and peace of mind need attention. Avoid property disputes.', hi: 'घर और मन की शांति पर ध्यान दें। संपत्ति के विवाद से बचें।' },
  { en: 'Plans and children need patience. Avoid speculation this month.', hi: 'योजनाओं और संतान के मामलों में धैर्य रखें। इस महीने सट्टे से बचें।' },
  { en: 'A month to beat competition and clear debts. Health improves.', hi: 'प्रतियोगिता जीतने और क़र्ज़ उतारने का महीना। स्वास्थ्य सुधरेगा।' },
  { en: 'Partnerships need understanding; avoid ego clashes with your spouse or partner.', hi: 'साझेदारी में समझदारी रखें; जीवनसाथी या साथी से अहं का टकराव न करें।' },
  { en: 'A month to go slow and stay careful with health and money.', hi: 'धीरे चलने और स्वास्थ्य व धन में सावधानी का महीना।' },
  { en: 'Luck is mixed; respect elders and keep up your prayers.', hi: 'भाग्य मिला-जुला; बड़ों का आदर करें और पूजा-पाठ बनाए रखें।' },
  { en: 'An excellent month for career: recognition, authority and support from seniors.', hi: 'करियर के लिए उत्तम महीना: मान, अधिकार और वरिष्ठों का सहयोग।' },
  { en: 'A month of gains and fulfilled wishes; income rises.', hi: 'लाभ और मनोकामना पूर्ति का महीना; आय बढ़ेगी।' },
  { en: 'Expenses and travel are likely. Good for spiritual practice; rest well.', hi: 'ख़र्च और यात्रा की संभावना। साधना के लिए अच्छा; पूरा आराम करें।' },
];

// ---------- time helpers ----------
/** UTC ms of a local wall-clock time on a date in an IANA zone. */
function localMs(date: string, hour: number, tz: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, hour);
  let ms = guess - tzOffsetMinutes(tz, guess) * 60000;
  ms = guess - tzOffsetMinutes(tz, ms) * 60000;
  return ms;
}
const weekday = (date: string) => { const [y, m, d] = date.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };

export const moonRashiAt = (ms: number) => Math.floor(moonSidereal(toJd(ms)) / 30) % 12;
export const sunRashiAt = (ms: number) => Math.floor(sunSidereal(toJd(ms)) / 30) % 12;
export const houseFrom = (rashi: number, transit: number) => ((transit - rashi + 12) % 12) + 1;

function score(base: number, rashi: number, dayLord: number): number {
  const f = FRIEND[RASHIS[rashi].lord][dayLord];
  return Math.max(1, Math.min(5, base + f * 0.5));
}

export interface DayRashifal {
  date: string; rashi: number; dayLord: number;
  moonRashi: number; house: number; score: number; text: DayText;
  /** When the Moon changes sign during the day (06:00 to next 06:00). */
  change?: { at: string; moonRashi: number; house: number; score: number };
  luckyColour: L; luckyNumbers: number[]; upay: L; mantra: string; mantraName: L;
}

/** Rashifal for one day. The Moon's sign is taken at 06:00 local time (about sunrise). */
export function dailyRashifal(rashi: number, date: string, tz: string): DayRashifal {
  const start = localMs(date, 6, tz), end = localMs(addDays(date, 1), 6, tz);
  const mr = moonRashiAt(start), house = houseFrom(rashi, mr);
  const dayLord = weekday(date);
  const lord = RASHIS[rashi].lord;
  const sc = score(MOON_BASE[house], rashi, dayLord);
  const r: DayRashifal = {
    date, rashi, dayLord, moonRashi: mr, house, score: sc, text: MOON_TEXT[house],
    luckyColour: FRIEND[lord][dayLord] >= 0 ? GRAHA[dayLord].colour : GRAHA[lord].colour,
    luckyNumbers: [...new Set([GRAHA[lord].num, GRAHA[dayLord].num])],
    // Difficult days get Hanuman (protection, courage); otherwise the rashi lord's own worship
    upay: sc <= 2 && lord !== 2 ? GRAHA[2].deity : GRAHA[lord].deity,
    mantra: sc <= 2 && lord !== 2 ? GRAHA[2].mantra : GRAHA[lord].mantra,
    mantraName: sc <= 2 && lord !== 2 ? GRAHA[2].mantraName : GRAHA[lord].mantraName,
  };
  const mrEnd = moonRashiAt(end);
  if (mrEnd !== mr) {
    const next = (mr + 1) % 12;
    const jd = findAngleCrossing(moonSidereal, next * 30, toJd(start), 1.2, 0.1);
    if (jd !== null) {
      const h2 = houseFrom(rashi, next);
      r.change = { at: isoLocal(fromJd(jd), tz), moonRashi: next, house: h2, score: score(MOON_BASE[h2], rashi, dayLord) };
    }
  }
  return r;
}

export interface WeekDay { date: string; dayLord: number; moonRashi: number; house: number; score: number; }
export function weeklyRashifal(rashi: number, from: string, tz: string): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    const mr = moonRashiAt(localMs(d, 12, tz)); // midday sign best represents the whole day
    const house = houseFrom(rashi, mr), dl = weekday(d);
    return { date: d, dayLord: dl, moonRashi: mr, house, score: score(MOON_BASE[house], rashi, dl) };
  });
}

export interface MonthRashifal { sunRashi: number; house: number; score: number; text: L; since: string | null; until: string | null; nextHouse: number; nextText: L; }
/** The solar month: the Sun stays about 30 days in a sign, so this is the "monthly" rashifal. */
export function monthlyRashifal(rashi: number, date: string, tz: string): MonthRashifal {
  const ms = localMs(date, 12, tz), jd = toJd(ms);
  const sr = sunRashiAt(ms), house = houseFrom(rashi, sr);
  const deg = sunSidereal(jd) - sr * 30;
  const sinceJd = findAngleCrossing(sunSidereal, sr * 30, jd - deg / 0.9856 - 2, 4, 0.25);
  const untilJd = findAngleCrossing(sunSidereal, ((sr + 1) % 12) * 30, jd + (30 - deg) / 1.02 - 2, 5, 0.25);
  const nextHouse = (house % 12) + 1;
  return {
    sunRashi: sr, house, score: SUN_BASE[house], text: SUN_TEXT[house],
    since: sinceJd !== null ? isoLocal(fromJd(sinceJd), tz).slice(0, 10) : null,
    until: untilJd !== null ? isoLocal(fromJd(untilJd), tz).slice(0, 10) : null,
    nextHouse, nextText: SUN_TEXT[nextHouse],
  };
}

// ---------- rashi from the first letter of the name (naam akshar) ----------
const DEVA_PREFIX: [string, number][] = [];
RASHIS.forEach(r => r.letters.split(' ').forEach(l => DEVA_PREFIX.push([l, r.id])));
DEVA_PREFIX.sort((a, b) => b[0].length - a[0].length);
const DEVA_CONSONANT_FALLBACK: Record<string, number> = { 'आ': 0, 'ई': 1, 'ऊ': 1, 'ऐ': 1, 'औ': 1, 'ऋ': 6, 'ख': 9, 'ग': 9, 'ज': 9, 'च': 11, 'ल': 0, 'व': 1, 'क': 2, 'ह': 2, 'ड': 3, 'म': 4, 'ट': 4, 'प': 5, 'र': 6, 'त': 6, 'न': 7, 'य': 7, 'भ': 8, 'ध': 8, 'फ': 8, 'स': 10, 'द': 10 };

// Roman spellings: the common reading of Indian names (t/d as dental, sh as s, b as v, w as v, f as ph).
const ROMAN: [string, number][] = [
  ['chh', 2], ['chu', 0], ['che', 0], ['cho', 0], ['cha', 11], ['chi', 11],
  ['kha', 9], ['khi', 9], ['khu', 9], ['khe', 9], ['kho', 9],
  ['gha', 2], ['ghi', 2], ['ghu', 2], ['ghe', 2], ['gho', 2],
  ['bha', 8], ['bhi', 8], ['bhu', 8], ['bhe', 8], ['bho', 9],
  ['dha', 8], ['dhi', 8], ['dhu', 8], ['dhe', 8], ['dho', 8],
  ['pha', 8], ['phi', 8], ['phu', 8], ['jha', 11], ['tha', 11], ['thi', 11],
  ['la', 0], ['li', 0], ['lu', 0], ['le', 0], ['lo', 0],
  ['va', 1], ['vi', 1], ['vu', 1], ['ve', 1], ['vo', 1],
  ['ka', 2], ['ki', 2], ['ku', 2], ['ke', 2], ['ko', 2], ['ha', 2],
  ['hi', 3], ['hu', 3], ['he', 3], ['ho', 3],
  ['ma', 4], ['mi', 4], ['mu', 4], ['me', 4], ['mo', 4],
  ['pa', 5], ['pi', 5], ['pu', 5], ['pe', 5], ['po', 5],
  ['ra', 6], ['ri', 6], ['ru', 6], ['re', 6], ['ro', 6], ['ta', 6], ['ti', 6], ['tu', 6], ['te', 6],
  ['to', 7], ['na', 7], ['ni', 7], ['nu', 7], ['ne', 7], ['no', 7], ['ya', 7], ['yi', 7], ['yu', 7],
  ['ye', 8], ['yo', 8],
  ['ja', 9], ['ji', 9], ['ju', 9], ['je', 9], ['jo', 9], ['ga', 9], ['gi', 9],
  ['gu', 10], ['ge', 10], ['go', 10], ['sa', 10], ['si', 10], ['su', 10], ['se', 10], ['so', 10], ['da', 10],
  ['di', 11], ['du', 11], ['de', 11], ['do', 11],
  ['a', 0], ['i', 1], ['u', 1], ['e', 1], ['o', 1],
];

/** Rashi from the first syllable of a name, in Devanagari or Roman letters. Returns null if it can't tell. */
export function rashiFromName(name: string): number | null {
  let n = (name || '').trim();
  if (!n) return null;
  if (/[ऀ-ॿ]/.test(n)) {
    n = n.replace(/़/g, '') // nukta: ज़ → ज, फ़ → फ
      .replace(/^श/, 'स').replace(/^ब/, 'व').replace(/^क्ष/, 'क').replace(/^त्र/, 'त').replace(/^ज्ञ/, 'ज')
      .replace(/^श्र/, 'स');
    // treat long/short vowel signs alike for matching (ि/ी, ु/ू)
    const variants = [n, n.replace(/^(.)ि/, '$1ी'), n.replace(/^(.)ी/, '$1ि'), n.replace(/^(.)ु/, '$1ू'), n.replace(/^(.)ू/, '$1ु'),
      n.replace(/^(.)ै/, '$1े'), n.replace(/^(.)ौ/, '$1ो')];
    for (const v of variants) for (const [p, id] of DEVA_PREFIX) if (v.startsWith(p)) return id;
    return DEVA_CONSONANT_FALLBACK[n[0]] ?? null;
  }
  let r = n.toLowerCase().replace(/[^a-z]/g, '');
  if (!r) return null;
  r = r.replace(/^sh/, 's').replace(/^w/, 'v').replace(/^f/, 'ph').replace(/^z/, 'j').replace(/^q/, 'k').replace(/^c(?!h)/, 'k')
    .replace(/^x/, 'k').replace(/^ksh/, 'k').replace(/^tr/, 't').replace(/^shr/, 's');
  if (/^b(?!h)/.test(r)) r = 'v' + r.slice(1);
  // "aa", "ee", "oo", "ai", "au" → base vowel
  r = r.replace(/^([a-z]*?)(aa)/, '$1a').replace(/^([a-z]*?)(ee)/, '$1i').replace(/^([a-z]*?)(oo)/, '$1u').replace(/^([a-z]*?)ai/, '$1e').replace(/^([a-z]*?)au/, '$1o');
  for (const [p, id] of ROMAN) if (r.startsWith(p)) return id;
  // consonant + other letter (e.g. "Pr", "Kr"): use the consonant's 'a' form
  const c = r.match(/^(chh|ch|kh|gh|bh|dh|ph|jh|th|[a-z])/)?.[1];
  if (c) for (const [p, id] of ROMAN) if (p.startsWith(c) && p.length === c.length + 1) return id;
  return null;
}

// ---------- context for the chatbot ----------
const STAR = (s: number) => '★'.repeat(Math.floor(s)) + (s % 1 ? '½' : '') + '☆'.repeat(5 - Math.ceil(s));
export const stars = STAR;

export function rashifalContext(rashi: number, date: string, tz: string, period: 'day' | 'week' | 'month' = 'day'): string {
  const R = RASHIS[rashi];
  const lines = [`Rashifal for ${R.en} (${R.hi}) rashi, ruled by ${GRAHA[R.lord].en}. Method: Chandra gochar (Moon transit house from the rashi) adjusted by the weekday lord; month from Surya gochar.`];
  if (period === 'day') {
    const d = dailyRashifal(rashi, date, tz);
    lines.push(`Date ${date} (weekday lord ${GRAHA[d.dayLord].en}). Moon in ${RASHI[d.moonRashi]} = house ${d.house} from ${R.en}. Rating ${d.score}/5.`,
      `Overall: ${d.text.overall.en}`, `Work/money: ${d.text.work.en}`, `Family/love: ${d.text.love.en}`, `Health: ${d.text.health.en}`,
      `Lucky colour ${d.luckyColour.en}; lucky numbers ${d.luckyNumbers.join(', ')}. Upay: ${d.upay.en} (${d.mantraName.en}).`);
    if (d.change) lines.push(`At ${d.change.at.slice(11, 16)} the Moon enters ${RASHI[d.change.moonRashi]} (house ${d.change.house}, rating ${d.change.score}/5): ${MOON_TEXT[d.change.house].overall.en}`);
  } else if (period === 'week') {
    for (const w of weeklyRashifal(rashi, date, tz)) lines.push(`${w.date} ${GRAHA[w.dayLord].en}: Moon in ${RASHI[w.moonRashi]} (house ${w.house}) rating ${w.score}/5 — ${MOON_TEXT[w.house].overall.en}`);
  } else {
    const m = monthlyRashifal(rashi, date, tz);
    lines.push(`Sun in ${RASHI[m.sunRashi]} from ${m.since} to ${m.until} = house ${m.house} from ${R.en}, rating ${m.score}/5. ${m.text.en}`,
      `After ${m.until}: house ${m.nextHouse} — ${m.nextText.en}`);
  }
  lines.push('This is general, sign-based guidance; a personal reading needs the full birth chart (date, time, place of birth).');
  return lines.join('\n');
}

/** Match a rashi name in a question ("mesh", "मेष", "aries", "scorpio"…). */
const ALIASES: string[][] = [
  ['mesh', 'mesha', 'aries', 'मेष'], ['vrishabh', 'vrishabha', 'vrish', 'brish', 'taurus', 'वृषभ', 'वृष'], ['mithun', 'mithuna', 'gemini', 'मिथुन'],
  ['kark', 'karka', 'cancer', 'कर्क'], ['simha', 'singh', 'simh', 'leo', 'सिंह'], ['kanya', 'virgo', 'कन्या'], ['tula', 'libra', 'तुला'],
  ['vrishchik', 'vrishchika', 'vrischik', 'brishchik', 'scorpio', 'वृश्चिक'], ['dhanu', 'dhanus', 'sagittarius', 'धनु'], ['makar', 'makara', 'capricorn', 'मकर'],
  ['kumbh', 'kumbha', 'aquarius', 'कुंभ', 'कुम्भ'], ['meen', 'meena', 'pisces', 'मीन'],
];
export function findRashiInText(text: string): number | null {
  const t = (text || '').toLowerCase();
  // longer aliases first so "vrishchik" wins over "vrish"
  const all = ALIASES.flatMap((a, i) => a.map(s => [s, i] as [string, number])).sort((a, b) => b[0].length - a[0].length);
  for (const [s, i] of all) {
    const re = /[a-z]/.test(s) ? new RegExp(`\\b${s}\\b`) : new RegExp(s);
    if (re.test(t)) return i;
  }
  return null;
}
export function rashiIndex(name: string): number | null {
  const n = (name || '').trim().toLowerCase();
  const i = RASHIS.findIndex(r => r.en.toLowerCase() === n || r.hi === name.trim());
  return i >= 0 ? i : findRashiInText(name);
}
