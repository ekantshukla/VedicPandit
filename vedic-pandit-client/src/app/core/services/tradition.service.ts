import { Injectable, signal } from '@angular/core';

/** The reader's sampradaya. It orders the stotra library, picks the Ekadashi rule and tells PanditJi. */
export type Tradition = 'all' | 'vaishnava' | 'shaiva' | 'shakta' | 'smarta';

export const TRADITIONS: { id: Tradition; en: string; hi: string; note: string; noteHi: string }[] = [
  { id: 'all', en: 'All traditions', hi: 'सभी परंपराएँ', note: 'Everything, in the usual order.', noteHi: 'सब कुछ, सामान्य क्रम में।' },
  { id: 'vaishnava', en: 'Vaishnava', hi: 'वैष्णव', note: 'Vishnu, Krishna and Rama first. Ekadashi by the Vaishnava rule (no Dashami at arunodaya).', noteHi: 'विष्णु, कृष्ण, राम पहले। एकादशी वैष्णव नियम से (अरुणोदय में दशमी न हो)।' },
  { id: 'shaiva', en: 'Shaiva', hi: 'शैव', note: 'Shiva first. Pradosh, Masik Shivaratri and Somvar highlighted.', noteHi: 'शिव पहले। प्रदोष, मासिक शिवरात्रि और सोमवार विशेष।' },
  { id: 'shakta', en: 'Shakta', hi: 'शाक्त', note: 'Devi first. Ashtami, Navami and Navratri highlighted.', noteHi: 'देवी पहले। अष्टमी, नवमी और नवरात्रि विशेष।' },
  { id: 'smarta', en: 'Smarta', hi: 'स्मार्त', note: 'The five deities (Ganesha, Surya, Vishnu, Shiva, Devi). Ekadashi by the Smarta rule.', noteHi: 'पंचदेव (गणेश, सूर्य, विष्णु, शिव, देवी)। एकादशी स्मार्त नियम से।' },
];

/** Deity tags each tradition puts first. */
export const TRADITION_TAGS: Record<Tradition, string[]> = {
  all: [],
  vaishnava: ['vishnu', 'krishna', 'rama', 'narasimha', 'lakshmi', 'hanuman', 'venkateshwara'],
  shaiva: ['shiva', 'bhairava', 'ganesha', 'skanda', 'parvati'],
  shakta: ['devi', 'durga', 'lakshmi', 'saraswati', 'lalita', 'parvati'],
  smarta: ['ganesha', 'surya', 'vishnu', 'shiva', 'devi'],
};

@Injectable({ providedIn: 'root' })
export class TraditionService {
  readonly tradition = signal<Tradition>(this.initial());

  /** The sampradaya picker was removed from the site, so everyone sees all traditions. */
  private initial(): Tradition { return 'all'; }

  set(t: Tradition) {
    this.tradition.set(t);
    try { localStorage.setItem('vp.tradition', t); } catch { /* ignore */ }
  }
}

/**
 * Festivals as the reader keeps them: Vaishnavas see the Vaishnava Ekadashi only, other sampradayas the Smarta one,
 * and "all" sees both (each labelled).
 */
export function forTradition(obs: string[], t: Tradition): string[] {
  if (t === 'all') return obs;
  const drop = t === 'vaishnava' ? 'Ekadashi (Smarta)' : 'Ekadashi (Vaishnava)';
  return obs.filter(o => o !== drop);
}

const FOCUS: Record<Tradition, RegExp | null> = {
  all: null,
  vaishnava: /Ekadashi|Janmashtami|Ram Navami|Purnima|Govardhan|Akshaya/,
  shaiva: /Shivaratri|Pradosh|Shravan|Kartik Purnima/,
  shakta: /Navratri|Ashtami|Durga|Vijayadashami|Diwali/,
  smarta: /Chaturthi|Ekadashi|Shivaratri|Navratri|Sankranti/,
};
/** True for the observances a sampradaya gives most weight to (shown highlighted). */
export const isFocus = (o: string, t: Tradition) => !!FOCUS[t]?.test(o);
