// Port of VedicPandit.Infrastructure.Muhurat (C#). Keep rules in sync with MuhuratRules.cs.
import { addDays, computePanchang } from './panchang-engine';
import { INAUSPICIOUS_YOGAS, MASA, RASHI, VARA } from './names';
import { MuhuratEventInfo, MuhuratSearchResult, MuhuratWindow, PanchangElement } from './models';

interface Rule { id: string; name: string; nameHi: string; nak: number[]; varas: number[]; tithis: number[]; kharmas: boolean; chaturmas: boolean; adhik: boolean; shukla: boolean; }

const exceptRikta = Array.from({ length: 30 }, (_, i) => i + 1).filter(t => ![4, 9, 14, 19, 24, 29, 30].includes(t));
const shuklaGood = [2, 3, 5, 7, 10, 11, 12, 13];

export const RULES: Rule[] = [
  { id: 'Vivah', name: 'Marriage (Vivah)', nameHi: 'विवाह', nak: [4, 5, 10, 12, 13, 15, 17, 19, 21, 26, 27], varas: [1, 3, 4, 5], tithis: [...shuklaGood, 1, 15, 16, 17, 18, 20, 22, 25], kharmas: true, chaturmas: true, adhik: true, shukla: true },
  { id: 'GrihaPravesh', name: 'House warming (Griha Pravesh)', nameHi: 'गृह प्रवेश', nak: [4, 5, 12, 14, 17, 21, 26, 27], varas: [1, 3, 4, 5, 6], tithis: [...shuklaGood, 17, 18, 20], kharmas: true, chaturmas: true, adhik: true, shukla: true },
  { id: 'VahanKharid', name: 'Vehicle purchase (Vahan Kharid)', nameHi: 'वाहन खरीद', nak: [1, 4, 5, 7, 8, 13, 14, 15, 17, 22, 23, 24, 27], varas: [0, 1, 3, 4, 5], tithis: exceptRikta, kharmas: false, chaturmas: false, adhik: false, shukla: true },
  { id: 'SampattiKharid', name: 'Property purchase', nameHi: 'संपत्ति / भूमि खरीद', nak: [4, 5, 8, 12, 14, 17, 21, 26, 27], varas: [1, 3, 4, 5], tithis: exceptRikta, kharmas: false, chaturmas: false, adhik: true, shukla: true },
  { id: 'Namakaran', name: 'Naming ceremony (Namakaran)', nameHi: 'नामकरण', nak: [1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27], varas: [1, 3, 4, 5], tithis: exceptRikta.filter(t => t !== 8 && t !== 23), kharmas: false, chaturmas: false, adhik: false, shukla: false },
  { id: 'Mundan', name: 'First haircut (Mundan)', nameHi: 'मुंडन', nak: [1, 5, 7, 8, 13, 14, 15, 18, 22, 23, 24, 27], varas: [1, 3, 4, 5], tithis: shuklaGood, kharmas: true, chaturmas: true, adhik: true, shukla: true },
  { id: 'Annaprashan', name: 'First rice feeding (Annaprashan)', nameHi: 'अन्नप्राशन', nak: [1, 4, 5, 7, 8, 12, 13, 14, 15, 17, 21, 22, 23, 24, 26, 27], varas: [1, 3, 4, 5], tithis: [2, 3, 5, 7, 10, 13, 17, 18, 20, 22, 25, 28], kharmas: false, chaturmas: false, adhik: true, shukla: true },
  { id: 'Vidyarambh', name: 'Start of education (Vidyarambh)', nameHi: 'विद्यारंभ', nak: [1, 5, 7, 8, 13, 14, 15, 22, 23, 24, 27], varas: [0, 3, 4, 5], tithis: exceptRikta, kharmas: false, chaturmas: false, adhik: false, shukla: true },
  { id: 'VyaparAarambh', name: 'Business opening (Vyapar Aarambh)', nameHi: 'व्यापार आरंभ', nak: [1, 4, 5, 8, 12, 13, 14, 17, 21, 22, 27], varas: [1, 3, 4, 5], tithis: exceptRikta, kharmas: false, chaturmas: false, adhik: true, shukla: true },
];

export const MUHURAT_EVENTS: MuhuratEventInfo[] = RULES.map(r => ({ id: r.id, name: r.name, nameHi: r.nameHi }));

const ms = (iso: string) => Date.parse(iso);
const active = (els: PanchangElement[], t: number) => els.find(e => e.ends === null || ms(e.ends) > t) ?? els[els.length - 1];
const isChaturmas = (masa: number, tithi: number) => (masa === 3 && tithi >= 11) || masa === 4 || masa === 5 || masa === 6 || (masa === 7 && tithi < 11);

export function findMuhurat(eventId: string, from: string, to: string, lat: number, lng: number, tz: string, max = 15): MuhuratSearchResult {
  const rule = RULES.find(r => r.id === eventId) ?? RULES[0];
  const windows: MuhuratWindow[] = [];
  const notes = new Set<string>();

  for (let d = from, n = 0; d <= to && windows.length < max && n < 181; d = addDays(d, 1), n++) {
    const p = computePanchang(d, lat, lng, tz, 'Amanta');
    if (!p.sunrise || !p.sunset) continue;
    const masa = MASA.indexOf(p.masa);
    const tithiAtRise = p.tithis[0].number;
    const sunRashi = RASHI.findIndex(r => p.sunRashi.startsWith(r));
    const weekday = p.vara.number - 1;

    if (rule.adhik && p.isAdhikMasa) { notes.add('Adhik (Purushottam) masa skipped'); continue; }
    if (rule.kharmas && (sunRashi === 8 || sunRashi === 11)) { notes.add('Kharmas skipped (Sun in Dhanu or Meena)'); continue; }
    if (rule.chaturmas && isChaturmas(masa, tithiAtRise)) { notes.add('Chaturmas skipped (Devshayani to Prabodhini Ekadashi)'); continue; }
    if (!rule.varas.includes(weekday)) continue;

    const start = ms(p.sunrise);
    const end = rule.id === 'Vivah' && p.nextSunrise ? ms(p.nextSunrise) : ms(p.sunset);
    const cuts = new Set<number>([start, end]);
    for (const e of [...p.tithis, ...p.nakshatras, ...p.karanas, ...p.yogas]) if (e.ends) { const t = ms(e.ends); if (t > start && t < end) cuts.add(t); }
    const kaals = [p.rahuKaal, p.yamaganda, p.gulika].filter(Boolean).map(k => ({ s: ms(k!.start), e: ms(k!.end) }));
    for (const k of kaals) { if (k.s > start && k.s < end) cuts.add(k.s); if (k.e > start && k.e < end) cuts.add(k.e); }
    const pts = [...cuts].sort((a, b) => a - b);

    let run: { s: number; t: PanchangElement; n: PanchangElement; y: PanchangElement } | null = null;
    const close = (e: number) => {
      if (!run) return;
      const r = run; run = null;
      if ((e - r.s) / 60000 < 30) return;
      const reasons = [`Nakshatra ${r.n.name} is favourable for ${rule.name}`, `Tithi ${r.t.name} is permitted`, `${VARA[weekday]} is a favourable weekday`, 'Avoids Rahu Kaal, Yamaganda, Gulika and Bhadra (Vishti karana)'];
      let score = 60;
      if (r.t.number <= 15 && rule.shukla) { score += 10; reasons.push('Shukla paksha (waxing moon)'); }
      if (INAUSPICIOUS_YOGAS.has(r.y.number)) { score -= 15; reasons.push(`Caution: ${r.y.name} yoga is traditionally inauspicious`); } else score += 10;
      const ab = p.abhijitMuhurat;
      if (ab && !ab.quality && r.s < ms(ab.end) && e > ms(ab.start)) { score += 10; reasons.push('Overlaps Abhijit Muhurat'); }
      if ([4, 8, 27].includes(r.n.number)) score += 5;
      const startIso = isoAt(p, r.s);
      const win: MuhuratWindow = { date: d, start: startIso, end: isoAt(p, e), tithi: r.t.name, nakshatra: r.n.name, yoga: r.y.name, vara: VARA[weekday], score: Math.max(0, Math.min(100, score)), reasons };
      const prev = windows[windows.length - 1];
      if (prev && prev.date === d && Date.parse(prev.end) === r.s) {
        // contiguous: extend instead of listing twice
        const join = (a: string, b: string) => a === b || a.endsWith(' → ' + b) ? a : `${a} → ${b}`;
        prev.end = win.end; prev.tithi = join(prev.tithi, win.tithi); prev.nakshatra = join(prev.nakshatra, win.nakshatra); prev.yoga = join(prev.yoga, win.yoga);
        prev.score = Math.min(prev.score, win.score);
        for (const x of win.reasons) if (!prev.reasons.includes(x)) prev.reasons.push(x);
      } else windows.push(win);
    };

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], mid = (a + b) / 2;
      const t = active(p.tithis, mid), nk = active(p.nakshatras, mid), k = active(p.karanas, mid), y = active(p.yogas, mid);
      const inKaal = kaals.some(q => mid >= q.s && mid < q.e);
      const ok = !inKaal && rule.tithis.includes(t.number) && rule.nak.includes(nk.number) && !k.name.startsWith('Vishti');
      const cur = run as { s: number; t: PanchangElement; n: PanchangElement; y: PanchangElement } | null;
      if (ok && cur && cur.t === t && cur.n === nk && cur.y === y) continue;
      close(a);
      if (ok) run = { s: a, t, n: nk, y };
    }
    close(pts[pts.length - 1]);
  }

  return {
    event: rule.id, eventName: rule.name, from, to, windows: windows.slice(0, max), notes: [...notes].sort(),
    disclaimer: 'Computed from tithi, nakshatra, vara, karana and kaal rules. Lagna shuddhi, Guru/Shukra asta and personal kundali matching are not evaluated - please confirm the final muhurat with your family purohit.',
  };
}

/** Format an instant with the same UTC offset as the panchang's sunrise string. */
function isoAt(p: { sunrise: string | null }, t: number): string {
  const off = (p.sunrise ?? '+05:30').slice(-6);
  const sign = off[0] === '-' ? -1 : 1;
  const mins = sign * (parseInt(off.slice(1, 3), 10) * 60 + parseInt(off.slice(4, 6), 10));
  const d = new Date(t + mins * 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${off}`;
}
