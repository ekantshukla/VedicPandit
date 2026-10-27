import { L } from '../core/astro/rashifal';

/** Remembered rashi on this device (rashifal page and chat card). */
export function savedRashi(): number | null {
  try { const v = localStorage.getItem('vp.rashi'); return v !== null && /^\d+$/.test(v) && +v < 12 ? +v : null; } catch { return null; }
}
export function saveRashi(r: number) { try { localStorage.setItem('vp.rashi', String(r)); } catch { /* ignore */ } }

export const COLOUR_HEX: Record<string, string> = {
  Orange: '#E8771E', White: '#FFFFFF', Red: '#C62828', Green: '#2E7D32', Yellow: '#F2C200', Pink: '#E0457B', Blue: '#1E4FD8',
};

export function ordinal(n: number, hi: boolean): string {
  if (hi) return `${n}वें`;
  const s = n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
  return `${n}${s}`;
}

export const pick = (x: L, hi: boolean) => (hi ? x.hi : x.en);
