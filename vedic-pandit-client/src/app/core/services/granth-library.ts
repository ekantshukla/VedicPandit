// The Granth library: Vedas, Upanishads, Upavedas, Mahabharata, Ramayana, Puranas, Darshana and Bhakti texts.
// Built by tools/build_library.py into public/granth (see the "Deploy website" workflow) and loaded chapter by
// chapter. The website reads it from its own address; the Android app reads it from the website, so the app stays small.
import { Capacitor } from '@capacitor/core';
import { WEBSITE_URL } from '../app-info';

export interface GranthCategory { id: string; name: string; desc: string; }
export interface GranthText {
  code: string; name: string; nameDev: string; cat: string; desc?: string; unit?: string; src?: string; lang?: string;
  verses?: number; chapters?: number; soon?: boolean;
}
export interface GranthCatalog { categories: GranthCategory[]; texts: GranthText[]; }
export interface GranthBook { id: string; name: string; chapters: { id: string; n: number }[]; }
export interface GranthIndex { code: string; books: GranthBook[]; }
/** [verse label, text]; the label is a number, or a type such as 'ऋषि' / 'दोहा/सोरठा'. */
export type GranthVerse = [string, string];

function base(): string {
  if (Capacitor.isNativePlatform()) return WEBSITE_URL.replace(/\/?$/, '/') + 'granth/';
  try { return new URL('granth/', document.baseURI).href; } catch { return 'granth/'; }
}

const cache = new Map<string, Promise<unknown>>();
function load<T>(path: string): Promise<T> {
  let p = cache.get(path) as Promise<T> | undefined;
  if (!p) {
    p = fetch(base() + path).then(r => { if (!r.ok) throw new Error(`${r.status} ${path}`); return r.json() as Promise<T>; });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p;
}

export const loadCatalog = () => load<GranthCatalog>('catalog.json');
export const loadIndex = (code: string) => load<GranthIndex>(`${code}/index.json`);
export const loadChapter = (code: string, chapter: string) =>
  load<{ v: GranthVerse[] }>(`${code}/${chapter.replace(/\//g, '_')}.json`).then(r => r.v);

/** All chapter ids of a text in reading order. */
export async function chapterList(code: string): Promise<string[]> {
  const idx = await loadIndex(code);
  return idx.books.flatMap(b => b.chapters.map(c => c.id));
}

/** Find a text by code or by a loose name ("mahabharat", "ramayan", "bhagavat", "rig veda"). */
export async function findText(q: string): Promise<GranthText | undefined> {
  const cat = await loadCatalog();
  const n = (s: string) => s.toLowerCase().replace(/[^a-zऀ-ॿ]/g, '');
  const k = n(q);
  if (!k) return undefined;
  return cat.texts.find(t => !t.soon && t.code === q)
    ?? cat.texts.find(t => !t.soon && (n(t.code) === k || n(t.name).startsWith(k) || n(t.nameDev).startsWith(k)))
    ?? cat.texts.find(t => !t.soon && (n(t.code).includes(k.slice(0, 6)) || n(t.name).includes(k.slice(0, 6))));
}

/** "6.24.5" style chapter + verse for a text; the chapter must exist. */
export async function readPassage(code: string, chapter: string, verse?: string, around = 2): Promise<{ chapter: string; verses: GranthVerse[] } | null> {
  const ids = await chapterList(code);
  let ch = chapter.trim().replace(/[:\s/]+/g, '.');
  let vs = verse?.trim();
  if (!ids.includes(ch) && !vs) {
    // "6.24.5" given as the chapter: split off the verse
    const parts = ch.split('.');
    const head = parts.slice(0, -1).join('.');
    if (ids.includes(head)) { vs = parts[parts.length - 1]; ch = head; }
  }
  if (!ids.includes(ch)) return null;
  const all = await loadChapter(code, ch);
  if (!vs) return { chapter: ch, verses: all };
  const i = all.findIndex(v => v[0] === vs);
  if (i < 0) return { chapter: ch, verses: all.slice(0, 2 * around + 1) };
  return { chapter: ch, verses: all.slice(Math.max(0, i - around), i + around + 1) };
}
