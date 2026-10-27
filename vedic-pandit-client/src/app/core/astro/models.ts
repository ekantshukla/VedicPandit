// Mirrors the JSON returned by the .NET API (camelCase of VedicPandit.Core.Dtos). Times are ISO strings with the
// location's UTC offset, e.g. "2026-10-26T06:29:05+05:30", so the wall-clock time can be read straight off the string.

export interface PanchangElement { number: number; name: string; nameSanskrit: string; ends: string | null; extra?: string | null; }
export interface TimeWindow { name: string; start: string; end: string; quality?: string | null; }

export interface PanchangResult {
  date: string; latitude: number; longitude: number; timeZone: string; monthSystem: string;
  sunrise: string | null; sunset: string | null; nextSunrise: string | null;
  vara: PanchangElement;
  tithis: PanchangElement[]; nakshatras: PanchangElement[]; yogas: PanchangElement[]; karanas: PanchangElement[];
  paksha: string; masa: string; masaSanskrit: string; isAdhikMasa: boolean;
  vikramSamvat: number; shakaSamvat: number; ritu: string; ayana: string; sunRashi: string; moonRashi: string;
  rahuKaal: TimeWindow | null; yamaganda: TimeWindow | null; gulika: TimeWindow | null;
  abhijitMuhurat: TimeWindow | null; brahmaMuhurat: TimeWindow | null;
  dayChoghadiya: TimeWindow[]; nightChoghadiya: TimeWindow[];
  observances: string[]; ayanamsa: number;
}

export interface MuhuratWindow { date: string; start: string; end: string; tithi: string; nakshatra: string; vara: string; yoga: string; score: number; reasons: string[]; }
export interface MuhuratSearchResult { event: string; eventName: string; from: string; to: string; windows: MuhuratWindow[]; notes: string[]; disclaimer: string; }
export interface MuhuratEventInfo { id: string; name: string; nameHi: string; }

export interface Mantra {
  slug: string; name: string; nameHi: string; deity: string; source: string; sanskrit: string;
  meaningEn: string; meaningHi: string; benefits: string; pronunciationTips: string;
  recommendedRepetitions: number; audioUrl?: string | null; timingJson?: string; tags: string;
  /** mantra | stotra | chalisa | aarti. Stotra verses are separated by a blank line. */
  kind?: 'mantra' | 'stotra' | 'chalisa' | 'aarti'; credit?: string;
  /** Who is chanting in the recording at audioUrl, e.g. "Voice: Pt. ... (recorded with permission)". */
  audioCredit?: string;
  /** false while only the title of a recorded text is known: the recording plays without word highlighting. */
  syncText?: boolean;
}

export interface Verse { citation?: string; scripture?: string; chapter: number; verse: string; sanskrit: string; translationEn: string; translationHi: string; keywords?: string; }
export interface Scripture { code: string; name: string; nameDevanagari: string; category: string; description: string; translationCredit?: string; verseCount?: number; verses?: Verse[]; }

export type MonthSystem = 'Purnimanta' | 'Amanta';

export interface Place { name: string; nameHi?: string; lat: number; lng: number; tz: string; state?: string; district?: string; }
