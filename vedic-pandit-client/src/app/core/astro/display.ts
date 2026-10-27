// Devanagari display names for terms the engine returns in Roman (API contract stays language-neutral).
const DEVA: Record<string, string> = {
  // choghadiya
  Amrit: 'अमृत', Shubh: 'शुभ', Labh: 'लाभ', Chal: 'चल', Udveg: 'उद्वेग', Kaal: 'काल', Rog: 'रोग',
  // paksha / ayana / ritu
  'Shukla Paksha': 'शुक्ल पक्ष', 'Krishna Paksha': 'कृष्ण पक्ष', Uttarayana: 'उत्तरायण', Dakshinayana: 'दक्षिणायन',
  'Vasanta (Spring)': 'वसंत', 'Grishma (Summer)': 'ग्रीष्म', 'Varsha (Monsoon)': 'वर्षा', 'Sharad (Autumn)': 'शरद',
  'Hemanta (Pre-winter)': 'हेमंत', 'Shishira (Winter)': 'शिशिर', Purnimanta: 'पूर्णिमांत', Amanta: 'अमांत',
  // observances
  'Sharad Purnima': 'शरद पूर्णिमा', Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या', Ekadashi: 'एकादशी', 'Ekadashi (Smarta)': 'एकादशी (स्मार्त)', 'Ekadashi (Vaishnava)': 'एकादशी (वैष्णव)',
  'Vinayaka Chaturthi': 'विनायक चतुर्थी', 'Sankashti Chaturthi': 'संकष्टी चतुर्थी', 'Masik Shivaratri': 'मासिक शिवरात्रि',
  'Pradosh Vrat': 'प्रदोष व्रत', 'Karwa Chauth': 'करवा चौथ', Dhanteras: 'धनतेरस', 'Diwali (Lakshmi Puja)': 'दीपावली (लक्ष्मी पूजा)',
  'Govardhan Puja': 'गोवर्धन पूजा', 'Bhai Dooj': 'भाई दूज', 'Kartik Purnima / Dev Deepawali': 'कार्तिक पूर्णिमा / देव दीपावली',
  'Prabodhini (Dev Uthani) Ekadashi (Chaturmas ends)': 'प्रबोधिनी (देवउठनी) एकादशी', 'Devshayani Ekadashi (Chaturmas begins)': 'देवशयनी एकादशी',
  'Vasant Panchami': 'वसंत पंचमी', 'Maha Shivaratri': 'महाशिवरात्रि', 'Holika Dahan': 'होलिका दहन', Holi: 'होली',
  'Chaitra Navratri begins / Gudi Padwa / Ugadi': 'चैत्र नवरात्रि आरंभ / गुड़ी पड़वा / उगादि', 'Ram Navami': 'राम नवमी',
  'Akshaya Tritiya': 'अक्षय तृतीया', 'Guru Purnima': 'गुरु पूर्णिमा', 'Nag Panchami': 'नाग पंचमी', 'Raksha Bandhan': 'रक्षाबंधन',
  'Krishna Janmashtami': 'कृष्ण जन्माष्टमी', 'Ganesh Chaturthi': 'गणेश चतुर्थी', 'Sharad Navratri begins': 'शारदीय नवरात्रि आरंभ',
  'Vijayadashami (Dussehra)': 'विजयादशमी (दशहरा)', 'Adhik Masa (Purushottam Maas)': 'अधिक मास (पुरुषोत्तम मास)',
  'Makar Sankranti': 'मकर संक्रांति',
};
const RASHI_DEVA: Record<string, string> = { Mesha: 'मेष', Vrishabha: 'वृषभ', Mithuna: 'मिथुन', Karka: 'कर्क', Simha: 'सिंह', Kanya: 'कन्या', Tula: 'तुला', Vrishchika: 'वृश्चिक', Dhanu: 'धनु', Makara: 'मकर', Kumbha: 'कुम्भ', Meena: 'मीन' };

/** Translate an engine string for Devanagari readers; returns the input unchanged when no mapping applies. */
export function deva(text: string | null | undefined): string {
  if (!text) return '';
  if (DEVA[text]) return DEVA[text];
  let m = text.match(/^\(pada (\d) at sunrise\)$/);
  if (m) return `(सूर्योदय पर ${m[1]} पद)`;
  m = text.match(/^Pradosh Vrat/);
  if (m) return DEVA['Pradosh Vrat'];
  m = text.match(/^(\w+) Sankranti(?: at (\d\d:\d\d))?(?: \(Makar Sankranti\))?$/);
  if (m) return `${RASHI_DEVA[m[1]] ?? m[1]} संक्रांति${m[2] ? ' ' + m[2] : ''}`;
  m = text.match(/^(\w+) \((.+)\)$/); // "Tula (तुला)" -> "तुला"
  if (m && /[\u0900-\u097F]/.test(m[2])) return m[2];
  return text;
}
