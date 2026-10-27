import { Mantra } from '../astro/models';

/** Popular texts that are not in the library yet: the deity page links to a recitation to listen to. */
export interface Listen { kind: 'chalisa' | 'aarti' | 'stotra'; en: string; hi: string; }

export interface Deity {
  id: string; en: string; hi: string; icon: string; color: string;
  about: string; aboutHi: string;
  day: string; dayHi: string; fest: string; festHi: string;
  /** Which library texts belong to this deity: matched on the text's "deity" field. */
  re: RegExp;
  listen?: Listen[];
}

export const DEITIES: Deity[] = [
  { id: 'ganesha', en: 'Ganesha', hi: 'श्री गणेश', icon: '🐘', color: '#E8771E', re: /Ganesha/,
    about: 'Remover of obstacles, worshipped first in every puja.', aboutHi: 'विघ्नहर्ता, हर पूजा में सबसे पहले पूजे जाते हैं।',
    day: 'Wednesday', dayHi: 'बुधवार', fest: 'Ganesh Chaturthi, Sankashti Chaturthi', festHi: 'गणेश चतुर्थी, संकष्टी चतुर्थी',
    listen: [{ kind: 'chalisa', en: 'Shri Ganesh Chalisa', hi: 'श्री गणेश चालीसा' }] },
  { id: 'shiva', en: 'Shiva', hi: 'भगवान शिव', icon: '🔱', color: '#3B4A8C', re: /Shiva|Bhairava|Tryambaka/,
    about: 'Mahadeva, the auspicious one; Bholenath who is pleased by a little water and a bel leaf.', aboutHi: 'महादेव, कल्याणकारी; जल और बेलपत्र से प्रसन्न होनेवाले भोलेनाथ।',
    day: 'Monday', dayHi: 'सोमवार', fest: 'Maha Shivaratri, Pradosh, Shravan', festHi: 'महाशिवरात्रि, प्रदोष, सावन',
    listen: [{ kind: 'chalisa', en: 'Shri Shiv Chalisa', hi: 'श्री शिव चालीसा' }, { kind: 'aarti', en: 'Om Jai Shiv Omkara (Shiv Aarti)', hi: 'ॐ जय शिव ओंकारा (शिव आरती)' }] },
  { id: 'vishnu', en: 'Vishnu', hi: 'भगवान विष्णु', icon: '🐚', color: '#1E5AA8', re: /Vishnu|Narayana|Pundarikaksha/,
    about: 'The preserver, lord of Lakshmi, who descends as the avatars.', aboutHi: 'पालनकर्ता, लक्ष्मीपति, जो अवतार लेकर धर्म की रक्षा करते हैं।',
    day: 'Thursday', dayHi: 'गुरुवार', fest: 'Ekadashi, Satyanarayan Katha, Dev Uthani', festHi: 'एकादशी, सत्यनारायण कथा, देवउठनी',
    listen: [{ kind: 'chalisa', en: 'Shri Vishnu Chalisa', hi: 'श्री विष्णु चालीसा' }] },
  { id: 'krishna', en: 'Krishna', hi: 'श्रीकृष्ण', icon: '🦚', color: '#2B5FAE', re: /Krishna/,
    about: 'Teacher of the Gita, the playful child of Gokul and the flute player of Vrindavan.', aboutHi: 'गीता के उपदेशक, गोकुल के नटखट बालक, वृन्दावन के बंसीवाले।',
    day: 'Wednesday', dayHi: 'बुधवार', fest: 'Janmashtami, Holi, Govardhan Puja', festHi: 'जन्माष्टमी, होली, गोवर्धन पूजा',
    listen: [{ kind: 'chalisa', en: 'Shri Krishna Chalisa', hi: 'श्री कृष्ण चालीसा' }, { kind: 'aarti', en: 'Aarti Kunj Bihari Ki', hi: 'आरती कुंजबिहारी की' }] },
  { id: 'rama', en: 'Rama', hi: 'श्रीराम', icon: '🏹', color: '#B85C1E', re: /\bRama\b/,
    about: 'Maryada Purushottam, the ideal king, son and husband.', aboutHi: 'मर्यादा पुरुषोत्तम, आदर्श राजा, पुत्र और पति।',
    day: 'Thursday', dayHi: 'गुरुवार', fest: 'Ram Navami, Diwali, Vivah Panchami', festHi: 'राम नवमी, दीपावली, विवाह पंचमी',
    listen: [{ kind: 'chalisa', en: 'Shri Ram Chalisa', hi: 'श्री राम चालीसा' }, { kind: 'aarti', en: 'Shri Ramayan Ji Ki Aarti', hi: 'श्री रामायण जी की आरती' }] },
  { id: 'hanuman', en: 'Hanuman', hi: 'हनुमान जी', icon: '🚩', color: '#C2410C', re: /Hanuman/,
    about: 'Shri Rama\'s devoted messenger: strength, courage and humility; Sankat Mochan.', aboutHi: 'श्रीराम के परम भक्त: बल, साहस और विनय; संकटमोचन।',
    day: 'Tuesday, Saturday', dayHi: 'मंगलवार, शनिवार', fest: 'Hanuman Jayanti', festHi: 'हनुमान जयंती',
    listen: [{ kind: 'aarti', en: 'Aarti Kije Hanuman Lala Ki', hi: 'आरती कीजै हनुमान लला की' }, { kind: 'stotra', en: 'Sankat Mochan Hanuman Ashtak', hi: 'संकटमोचन हनुमान अष्टक' }, { kind: 'stotra', en: 'Bajrang Baan', hi: 'बजरंग बाण' }] },
  { id: 'narasimha', en: 'Narasimha', hi: 'भगवान नृसिंह', icon: '🦁', color: '#9A3412', re: /Narasimha/,
    about: 'Vishnu as man-lion, who protected Prahlada.', aboutHi: 'नर-सिंह रूप में विष्णु, भक्त प्रह्लाद के रक्षक।',
    day: 'Saturday', dayHi: 'शनिवार', fest: 'Narasimha Jayanti', festHi: 'नृसिंह जयंती' },
  { id: 'durga', en: 'Durga', hi: 'माँ दुर्गा', icon: '🌺', color: '#B3122E', re: /Durga|Chamunda|Ambe/,
    about: 'The Divine Mother who destroys evil, riding the lion.', aboutHi: 'सिंहवाहिनी जगदम्बा, जो असुरों का नाश करती हैं।',
    day: 'Tuesday, Friday', dayHi: 'मंगलवार, शुक्रवार', fest: 'Navratri, Durga Ashtami', festHi: 'नवरात्रि, दुर्गा अष्टमी' },
  { id: 'lakshmi', en: 'Lakshmi', hi: 'माँ लक्ष्मी', icon: '🪷', color: '#C08A00', re: /Lakshmi/,
    about: 'Goddess of prosperity, grace and good fortune.', aboutHi: 'धन, सौभाग्य और समृद्धि की देवी।',
    day: 'Friday', dayHi: 'शुक्रवार', fest: 'Diwali, Sharad Purnima, Dhanteras', festHi: 'दीपावली, शरद पूर्णिमा, धनतेरस',
    listen: [{ kind: 'chalisa', en: 'Shri Lakshmi Chalisa', hi: 'श्री लक्ष्मी चालीसा' }] },
  { id: 'saraswati', en: 'Saraswati', hi: 'माँ सरस्वती', icon: '📚', color: '#5B6B8C', re: /Saraswati/,
    about: 'Goddess of knowledge, music and speech.', aboutHi: 'विद्या, संगीत और वाणी की देवी।',
    day: 'Thursday', dayHi: 'गुरुवार', fest: 'Vasant Panchami', festHi: 'वसंत पंचमी',
    listen: [{ kind: 'chalisa', en: 'Shri Saraswati Chalisa', hi: 'श्री सरस्वती चालीसा' }, { kind: 'aarti', en: 'Saraswati Mata Ki Aarti', hi: 'सरस्वती माता की आरती' }] },
  { id: 'kali', en: 'Kali', hi: 'माँ काली', icon: '🌑', color: '#1F2937', re: /\bKali\b/,
    about: 'The fierce Mother beyond time, who removes fear.', aboutHi: 'काल से परे उग्र माता, जो भय का नाश करती हैं।',
    day: 'Amavasya', dayHi: 'अमावस्या', fest: 'Kali Puja (Diwali night), Navratri', festHi: 'काली पूजा (दीपावली की रात), नवरात्रि',
    listen: [{ kind: 'chalisa', en: 'Shri Kali Chalisa', hi: 'श्री काली चालीसा' }, { kind: 'aarti', en: 'Kali Mata Ki Aarti', hi: 'काली माता की आरती' }] },
  { id: 'lalita', en: 'Lalita & Parvati', hi: 'माँ ललिता व पार्वती', icon: '🌸', color: '#BE185D', re: /Lalita|Parvati|Tripura/,
    about: 'The beautiful Mother of the three worlds, consort of Shiva.', aboutHi: 'त्रिलोक सुन्दरी जगन्माता, शिव की शक्ति।',
    day: 'Friday', dayHi: 'शुक्रवार', fest: 'Navratri, Teej, Gauri Puja', festHi: 'नवरात्रि, तीज, गौरी पूजा' },
  { id: 'surya', en: 'Surya', hi: 'सूर्य देव', icon: '☀️', color: '#D97706', re: /Surya|Savitr/,
    about: 'The visible God, giver of light, health and energy.', aboutHi: 'प्रत्यक्ष देवता, प्रकाश, आरोग्य और ऊर्जा के दाता।',
    day: 'Sunday', dayHi: 'रविवार', fest: 'Makar Sankranti, Chhath, Ratha Saptami', festHi: 'मकर संक्रान्ति, छठ, रथ सप्तमी',
    listen: [{ kind: 'aarti', en: 'Surya Dev Ki Aarti', hi: 'सूर्य देव की आरती' }, { kind: 'chalisa', en: 'Shri Surya Chalisa', hi: 'श्री सूर्य चालीसा' }] },
  { id: 'shani', en: 'Shani', hi: 'शनि देव', icon: '🪐', color: '#334155', re: /Shani/,
    about: 'The just graha who gives the fruit of karma; patient and fair.', aboutHi: 'कर्मफलदाता न्यायप्रिय ग्रह; धैर्य और न्याय के देवता।',
    day: 'Saturday', dayHi: 'शनिवार', fest: 'Shani Jayanti, Shani Amavasya', festHi: 'शनि जयंती, शनि अमावस्या',
    listen: [{ kind: 'chalisa', en: 'Shri Shani Chalisa', hi: 'श्री शनि चालीसा' }, { kind: 'aarti', en: 'Shani Dev Ki Aarti', hi: 'शनि देव की आरती' }] },
  { id: 'navagraha', en: 'Navagraha', hi: 'नवग्रह', icon: '✨', color: '#4338CA', re: /grahas/,
    about: 'The nine grahas: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu and Ketu.', aboutHi: 'नौ ग्रह: सूर्य, चन्द्र, मंगल, बुध, गुरु, शुक्र, शनि, राहु और केतु।',
    day: 'Every day', dayHi: 'प्रतिदिन', fest: 'Before any major work', festHi: 'हर बड़े कार्य से पहले' },
  { id: 'guru', en: 'Guru & Brahman', hi: 'गुरु व ब्रह्म', icon: '🙏', color: '#065F46', re: /Guru|Brahman|Peace/,
    about: 'Prayers to the teacher and the Upanishadic shanti mantras.', aboutHi: 'गुरु वंदना और उपनिषदों के शांति मंत्र।',
    day: 'Thursday', dayHi: 'गुरुवार', fest: 'Guru Purnima', festHi: 'गुरु पूर्णिमा' },
];

export const KINDS: ('mantra' | 'stotra' | 'chalisa' | 'aarti')[] = ['mantra', 'stotra', 'chalisa', 'aarti'];

export const textsFor = (d: Deity, all: Mantra[]) => all.filter(m => d.re.test(m.deity));
/** Prayers for any deity (e.g. Tvameva Mata, Kshama Prarthana), shown on every deity page. */
export const forEveryDeity = (all: Mantra[]) => all.filter(m => /Any deity/.test(m.deity));

/** A recitation to listen to, for popular texts not in the library. */
export const listenUrl = (l: Listen) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(l.hi + ' ' + l.en);
