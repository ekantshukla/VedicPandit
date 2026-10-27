import { Mantra } from '../astro/models';
import { TRADITION_TAGS, Tradition } from './tradition.service';

/** The mantra and stotra library ships with the app (built from SeedData by tools/build_client_data.py), so it loads lazily. */
let cache: Promise<Mantra[]> | undefined;
export function loadMantras(): Promise<Mantra[]> {
  cache ??= import('../data/mantras.json').then(m => m.default as unknown as Mantra[]);
  return cache;
}

/** Order the library for a sampradaya: its deities first, the rest after, each group in library order. */
export function sortForTradition(list: Mantra[], t: Tradition): Mantra[] {
  const tags = TRADITION_TAGS[t];
  if (!tags.length) return list;
  const rank = (m: Mantra) => {
    const mt = m.tags.split(' ');
    const i = tags.findIndex(tag => mt.includes(tag));
    return i < 0 ? 99 : i;
  };
  return list.map((m, i) => ({ m, i, r: rank(m) })).sort((a, b) => a.r - b.r || a.i - b.i).map(x => x.m);
}

/** Best match for a free-text request like "shiv tandav", "vishnu sahasranamam", "हनुमान चालीसा". */
const STOP = new Set(['what', 'does', 'about', 'tell', 'with', 'from', 'that', 'this', 'teach', 'how', 'when', 'please', 'mantra', 'stotra', 'stotram', 'chant', 'path', 'the', 'and', 'for']);

export function findMantra(q: string, list: Mantra[], t: Tradition = 'all', min = 2): Mantra | undefined {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ');
  const words = norm(q).split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const kindWanted = /stotra|स्तोत्र|stotram|ashtak|अष्टक/.test(q.toLowerCase()) ? 'stotra' : /chalisa|चालीसा/.test(q.toLowerCase()) ? 'chalisa' : /aarti|आरती/.test(q.toLowerCase()) ? 'aarti' : '';
  const prefer = TRADITION_TAGS[t];
  let best: Mantra | undefined, bestScore = 0;
  for (const m of list) {
    const hay = norm(`${m.slug.replace(/-/g, ' ')} ${m.name} ${m.nameHi} ${m.deity} ${m.tags}`);
    let s = 0;
    for (const w of words) {
      // match on the first 4 letters too, so "shiv" finds "shiva" and "sahasranamam" finds "sahasranama"
      if (hay.includes(w)) s += 3; else if (w.length >= 5 && hay.includes(w.slice(0, 5))) s += 2; else if (hay.includes(w.slice(0, 4))) s += 1;
    }
    if (kindWanted && (m.kind ?? 'mantra') === kindWanted) s += 2;
    if (prefer.length && m.tags.split(' ').some(tag => prefer.includes(tag))) s += 0.5;
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return bestScore >= min ? best : undefined;
}
