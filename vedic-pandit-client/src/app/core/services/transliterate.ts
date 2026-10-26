// Devanagari -> IAST / simple Roman / other Brahmic scripts.
// Brahmic Unicode blocks share the ISCII layout, so most letters convert by a fixed offset;
// letters missing in a target script (e.g. Tamil aspirates) fall back to the nearest letter.

export type Script = 'deva' | 'iast' | 'roman' | 'knda' | 'telu' | 'taml' | 'beng' | 'gujr' | 'mlym';

const CONS: Record<string, string> = {
  'क':'k','ख':'kh','ग':'g','घ':'gh','ङ':'ṅ','च':'c','छ':'ch','ज':'j','झ':'jh','ञ':'ñ',
  'ट':'ṭ','ठ':'ṭh','ड':'ḍ','ढ':'ḍh','ण':'ṇ','त':'t','थ':'th','द':'d','ध':'dh','न':'n',
  'प':'p','फ':'ph','ब':'b','भ':'bh','म':'m','य':'y','र':'r','ल':'l','व':'v','श':'ś','ष':'ṣ','स':'s','ह':'h','ळ':'ḷ',
};
const VOWELS: Record<string, string> = { 'अ':'a','आ':'ā','इ':'i','ई':'ī','उ':'u','ऊ':'ū','ऋ':'ṛ','ॠ':'ṝ','ऌ':'ḷ','ए':'e','ऐ':'ai','ओ':'o','औ':'au' };
const MATRAS: Record<string, string> = { 'ा':'ā','ि':'i','ी':'ī','ु':'u','ू':'ū','ृ':'ṛ','ॄ':'ṝ','ॢ':'ḷ','े':'e','ै':'ai','ो':'o','ौ':'au' };
const OTHER: Record<string, string> = { 'ं':'ṃ','ः':'ḥ','ँ':'m̐','ऽ':"'",'ॐ':'oṃ','।':'|','॥':'||','़':'' };
const VIRAMA = '्';

export function toIast(text: string): string {
  let out = '';
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (CONS[c] !== undefined) {
      let j = i + 1;
      if (chars[j] === '़') j++; // nukta
      out += CONS[c];
      const nx = chars[j];
      if (nx === VIRAMA) { i = j; }
      else if (nx !== undefined && MATRAS[nx] !== undefined) { out += MATRAS[nx]; i = j; }
      else { out += 'a'; i = j - 1; }
    } else if (VOWELS[c] !== undefined) out += VOWELS[c];
    else if (OTHER[c] !== undefined) out += OTHER[c];
    else if (c >= '०' && c <= '९') out += String(c.charCodeAt(0) - 0x966);
    else out += c;
  }
  return out;
}

/** Diacritic-free romanisation for readers unfamiliar with IAST (e.g. "om bhoor bhuvah svah"). */
export function toSimpleRoman(text: string): string {
  return toIast(text)
    .replace(/ch/g, 'chh').replace(/c/g, 'ch')
    .replace(/ā/g, 'aa').replace(/ī/g, 'ee').replace(/ū/g, 'oo')
    .replace(/ṛ/g, 'ri').replace(/ṝ/g, 'ree').replace(/ḷ/g, 'li')
    .replace(/[śṣ]/g, 'sh').replace(/ṭ/g, 't').replace(/ḍ/g, 'd').replace(/ṇ/g, 'n')
    .replace(/ṃ/g, 'm').replace(/ḥ/g, 'h').replace(/ñ/g, 'ny').replace(/ṅ/g, 'ng').replace(/m̐/g, 'n');
}

const BASE: Partial<Record<Script, number>> = { beng: 0x0980, gujr: 0x0a80, taml: 0x0b80, telu: 0x0c00, knda: 0x0c80, mlym: 0x0d00 };
const ASSIGNED = /[\p{L}\p{M}\p{N}\p{P}\p{S}]/u;
const FALLBACK: Partial<Record<Script, Record<string, string>>> = {
  taml: { 'ख':'क','ग':'क','घ':'क','छ':'च','झ':'ज','ठ':'ट','ड':'ट','ढ':'ट','थ':'त','द':'त','ध':'त','फ':'प','ब':'प','भ':'प' },
  beng: { 'व':'ब' },
};
// Sequences that need special handling before offset conversion
const PRE: Partial<Record<Script, [RegExp, string][]>> = {
  taml: [[/ृ/g, '्रु'], [/ऋ/g, 'रु'], [/ं/g, 'म्']],
  knda: [[/ॐ/g, 'ओं']],
  telu: [[/ॐ/g, 'ओं']],
  beng: [[/ॐ/g, 'ओँ']],
};

export function toScript(text: string, script: Script): string {
  if (script === 'deva') return text;
  if (script === 'iast') return toIast(text);
  if (script === 'roman') return toSimpleRoman(text);
  const base = BASE[script];
  if (base === undefined) return text;
  let src = text;
  for (const [re, rep] of PRE[script] ?? []) src = src.replace(re, rep);
  const fb = FALLBACK[script] ?? {};
  let out = '';
  for (const ch of src) {
    const code = ch.charCodeAt(0);
    if (ch === '।' || ch === '॥' || code < 0x0900 || code > 0x097f) { out += ch; continue; }
    const c = fb[ch] ?? ch;
    const target = String.fromCharCode(base + (c.charCodeAt(0) - 0x0900));
    out += ASSIGNED.test(target) ? target : c;
  }
  return out;
}

export const SCRIPT_FOR_LANG: Record<string, Script> = { hi: 'deva', mr: 'deva', en: 'iast', kn: 'knda', te: 'telu', ta: 'taml', bn: 'beng', gu: 'gujr' };
