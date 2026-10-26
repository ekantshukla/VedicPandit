export const TITHI = ['Pratipada','Dwitiya','Tritiya','Chaturthi','Panchami','Shashthi','Saptami','Ashtami','Navami','Dashami','Ekadashi','Dwadashi','Trayodashi','Chaturdashi','Purnima','Amavasya'];
export const TITHI_SA = ['प्रतिपदा','द्वितीया','तृतीया','चतुर्थी','पञ्चमी','षष्ठी','सप्तमी','अष्टमी','नवमी','दशमी','एकादशी','द्वादशी','त्रयोदशी','चतुर्दशी','पूर्णिमा','अमावस्या'];
export const NAKSHATRA = ['Ashwini','Bharani','Krittika','Rohini','Mrigashira','Ardra','Punarvasu','Pushya','Ashlesha','Magha','Purva Phalguni','Uttara Phalguni','Hasta','Chitra','Swati','Vishakha','Anuradha','Jyeshtha','Mula','Purva Ashadha','Uttara Ashadha','Shravana','Dhanishta','Shatabhisha','Purva Bhadrapada','Uttara Bhadrapada','Revati'];
export const NAKSHATRA_SA = ['अश्विनी','भरणी','कृत्तिका','रोहिणी','मृगशिरा','आर्द्रा','पुनर्वसु','पुष्य','आश्लेषा','मघा','पूर्वाफाल्गुनी','उत्तराफाल्गुनी','हस्त','चित्रा','स्वाती','विशाखा','अनुराधा','ज्येष्ठा','मूल','पूर्वाषाढा','उत्तराषाढा','श्रवण','धनिष्ठा','शतभिषा','पूर्वाभाद्रपदा','उत्तराभाद्रपदा','रेवती'];
export const YOGA = ['Vishkumbha','Priti','Ayushman','Saubhagya','Shobhana','Atiganda','Sukarma','Dhriti','Shula','Ganda','Vriddhi','Dhruva','Vyaghata','Harshana','Vajra','Siddhi','Vyatipata','Variyan','Parigha','Shiva','Siddha','Sadhya','Shubha','Shukla','Brahma','Indra','Vaidhriti'];
export const YOGA_SA = ['विष्कम्भ','प्रीति','आयुष्मान्','सौभाग्य','शोभन','अतिगण्ड','सुकर्मा','धृति','शूल','गण्ड','वृद्धि','ध्रुव','व्याघात','हर्षण','वज्र','सिद्धि','व्यतीपात','वरीयान्','परिघ','शिव','सिद्ध','साध्य','शुभ','शुक्ल','ब्रह्म','इन्द्र','वैधृति'];
export const INAUSPICIOUS_YOGAS = new Set([1, 6, 9, 10, 13, 15, 17, 19, 27]);
export const KARANA = ['Bava','Balava','Kaulava','Taitila','Garaja','Vanija','Vishti (Bhadra)','Shakuni','Chatushpada','Naga','Kimstughna'];
export const KARANA_SA = ['बव','बालव','कौलव','तैतिल','गर','वणिज','विष्टि (भद्रा)','शकुनि','चतुष्पद','नाग','किंस्तुघ्न'];
export const VARA = ['Ravivara (Sunday)','Somavara (Monday)','Mangalavara (Tuesday)','Budhavara (Wednesday)','Guruvara (Thursday)','Shukravara (Friday)','Shanivara (Saturday)'];
export const VARA_SA = ['रविवार','सोमवार','मंगलवार','बुधवार','गुरुवार','शुक्रवार','शनिवार'];
export const RASHI = ['Mesha','Vrishabha','Mithuna','Karka','Simha','Kanya','Tula','Vrishchika','Dhanu','Makara','Kumbha','Meena'];
export const RASHI_SA = ['मेष','वृषभ','मिथुन','कर्क','सिंह','कन्या','तुला','वृश्चिक','धनु','मकर','कुम्भ','मीन'];
export const MASA = ['Chaitra','Vaishakha','Jyeshtha','Ashadha','Shravana','Bhadrapada','Ashvin','Kartika','Margashirsha','Pausha','Magha','Phalguna'];
export const MASA_SA = ['चैत्र','वैशाख','ज्येष्ठ','आषाढ','श्रावण','भाद्रपद','आश्विन','कार्तिक','मार्गशीर्ष','पौष','माघ','फाल्गुन'];
export const RITU = ['Vasanta (Spring)','Grishma (Summer)','Varsha (Monsoon)','Sharad (Autumn)','Hemanta (Pre-winter)','Shishira (Winter)'];

export const DAY_CHOG = ['Udveg','Chal','Labh','Amrit','Kaal','Shubh','Rog'];
export const DAY_CHOG_START = [0, 3, 6, 2, 5, 1, 4];
export const NIGHT_CHOG = ['Shubh','Amrit','Chal','Rog','Kaal','Labh','Udveg'];
export const NIGHT_CHOG_START = [0, 2, 4, 6, 1, 3, 5];
export const chogQuality = (n: string) => (n === 'Amrit' || n === 'Shubh' || n === 'Labh') ? 'Good' : n === 'Chal' ? 'Neutral' : 'Avoid';

export const RAHU_SEG = [8, 2, 7, 5, 6, 4, 3];
export const YAMA_SEG = [5, 4, 3, 2, 1, 7, 6];
export const GULIKA_SEG = [7, 6, 5, 4, 3, 2, 1];

export function karanaIndex(half: number): number {
  if (half === 0) return 10;
  if (half === 57) return 7;
  if (half === 58) return 8;
  if (half === 59) return 9;
  return (half - 1) % 7;
}

export function tithiName(n: number): [string, string] {
  if (n === 15) return [TITHI[14], TITHI_SA[14]];
  if (n === 30) return [TITHI[15], TITHI_SA[15]];
  const i = (n - 1) % 15;
  return n <= 15 ? [`Shukla ${TITHI[i]}`, `शुक्ल ${TITHI_SA[i]}`] : [`Krishna ${TITHI[i]}`, `कृष्ण ${TITHI_SA[i]}`];
}
