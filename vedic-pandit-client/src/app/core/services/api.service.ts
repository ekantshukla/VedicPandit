import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { MonthSystem, Mantra, MuhuratEventInfo, MuhuratSearchResult, PanchangResult, Scripture, Verse } from '../astro/models';
import { computePanchang } from '../astro/panchang-engine';
import { findMuhurat, MUHURAT_EVENTS } from '../astro/muhurat-engine';
import { API_URL } from '../app-info';
import mantrasJson from '../data/mantras.json';

/**
 * Where the .NET API lives:
 *  1. window.__VP_API__ if a page sets it (handy for testing)
 *  2. API_URL from app-info.ts (the GitHub workflows fill it in for the website and the Android app)
 *  3. http://localhost:5000 during `ng serve`
 *  4. otherwise the same address the site is served from (Angular inside the .NET app's wwwroot)
 */
export function apiBase(): string {
  const w = window as unknown as { __VP_API__?: string };
  if (w.__VP_API__ !== undefined) return w.__VP_API__.replace(/\/$/, '');
  if (API_URL) return API_URL.replace(/\/$/, '');
  return location.port === '4200' ? 'http://localhost:5000' : '';
}

/** True when the site was built to talk to a separately hosted API (website on GitHub Pages, Android app). */
export const hasRemoteApi = () => !!API_URL;

/** The verse library is ~400 KB, so it loads only when the Granth page or offline search needs it. */
let scripturesCache: Promise<Scripture[]> | undefined;
export function loadScriptures(): Promise<Scripture[]> {
  scripturesCache ??= import('../data/scriptures.json').then(m => (m.default as unknown as Scripture[]));
  return scripturesCache;
}

/**
 * Talks to the .NET Web API. If the API is unreachable (static hosting, preview, offline),
 * falls back to the in-browser port of the same panchang/muhurat engine and the bundled seed data.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  readonly online = signal<boolean | null>(null);
  /** True when the API reports a Claude key, i.e. PanditJi gives full answers. */
  readonly ai = signal(false);
  private probe?: Promise<boolean>;
  private probedAt = 0;

  /** Quick check, cached. A failed check is retried after 20 s, so a server that was waking up is picked up. */
  isOnline(waitMs = 4000): Promise<boolean> {
    const stale = this.online() === false && Date.now() - this.probedAt > 20000;
    if (!this.probe || stale) {
      this.probedAt = Date.now();
      this.probe = firstValueFrom(this.http.get<{ ai?: boolean }>(`${apiBase()}/api/health`).pipe(timeout(waitMs)))
        .then(r => { this.ai.set(!!r?.ai); return true; }).catch(() => false)
        .then(ok => { this.online.set(ok); return ok; });
    }
    return this.probe;
  }

  /** Free hosting tiers sleep when idle and take up to a minute to wake. Chat waits for that; pages don't. */
  async wake(): Promise<boolean> {
    if (await this.isOnline()) return true;
    if (!hasRemoteApi()) return false;
    this.probe = undefined;
    return this.isOnline(60000);
  }

  async panchang(date: string, lat: number, lng: number, tz: string, system: MonthSystem = 'Purnimanta'): Promise<PanchangResult> {
    if (await this.isOnline()) {
      const params = new HttpParams({ fromObject: { date, lat, lng, tz, system } });
      try { return await firstValueFrom(this.http.get<PanchangResult>(`${apiBase()}/api/panchang`, { params })); } catch { /* fall through */ }
    }
    return computePanchang(date, lat, lng, tz, system);
  }

  async muhuratEvents(): Promise<MuhuratEventInfo[]> {
    if (await this.isOnline()) {
      try { return await firstValueFrom(this.http.get<MuhuratEventInfo[]>(`${apiBase()}/api/muhurat/events`)); } catch { /* fall through */ }
    }
    return MUHURAT_EVENTS;
  }

  async muhurat(event: string, from: string, to: string, lat: number, lng: number, tz: string): Promise<MuhuratSearchResult> {
    if (await this.isOnline()) {
      const params = new HttpParams({ fromObject: { event, from, to, lat, lng, tz, max: 30 } });
      try { return await firstValueFrom(this.http.get<MuhuratSearchResult>(`${apiBase()}/api/muhurat`, { params })); } catch { /* fall through */ }
    }
    // let the spinner paint before the synchronous scan
    await new Promise(r => setTimeout(r, 30));
    return findMuhurat(event, from, to, lat, lng, tz, 30);
  }

  async mantras(): Promise<Mantra[]> {
    if (await this.isOnline()) {
      try {
        const list = await firstValueFrom(this.http.get<{ slug: string }[]>(`${apiBase()}/api/mantras`));
        return await Promise.all(list.map(m => this.mantra(m.slug)));
      } catch { /* fall through */ }
    }
    return mantrasJson as Mantra[];
  }

  async mantra(slug: string): Promise<Mantra> {
    if (this.online()) {
      try { return await firstValueFrom(this.http.get<Mantra>(`${apiBase()}/api/mantras/${slug}`)); } catch { /* fall through */ }
    }
    return (mantrasJson as Mantra[]).find(m => m.slug === slug) ?? (mantrasJson as Mantra[])[0];
  }

  async scriptures(): Promise<Scripture[]> {
    if (await this.isOnline()) {
      try { return await firstValueFrom(this.http.get<Scripture[]>(`${apiBase()}/api/scriptures`)); } catch { /* fall through */ }
    }
    return (await loadScriptures()).map(s => ({ ...s, verses: undefined, verseCount: s.verses?.length ?? 0 }));
  }

  async verses(code: string): Promise<Verse[]> {
    if (await this.isOnline()) {
      try { return await firstValueFrom(this.http.get<Verse[]>(`${apiBase()}/api/scriptures/${code}/verses`)); } catch { /* fall through */ }
    }
    const s = (await loadScriptures()).find(x => x.code === code);
    return (s?.verses ?? []).map(v => ({ ...v, citation: citation(s!, v), scripture: code }));
  }

  async searchVerses(q: string): Promise<Verse[]> {
    if (await this.isOnline()) {
      try { return await firstValueFrom(this.http.get<Verse[]>(`${apiBase()}/api/scriptures/search`, { params: { q } })); } catch { /* fall through */ }
    }
    return localSearch(q);
  }
}

export function citation(s: Scripture, v: Verse): string {
  return v.chapter > 0 ? `${s.name} ${v.chapter}.${v.verse}` : `${s.name} ${v.verse}`;
}

// ---------------- Offline verse search (BM25, same idea as the server's ScriptureRetriever) ----------------

const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'or', 'in', 'on', 'is', 'are', 'was', 'what', 'why', 'how', 'does', 'do', 'say', 'says',
  'about', 'me', 'my', 'i', 'you', 'your', 'for', 'with', 'it', 'this', 'that', 'be', 'as', 'by', 'at', 'from', 'tell', 'explain', 'please', 'which',
  'who', 'can', 'should', 'gita', 'bhagavad', 'verse', 'shloka', 'का', 'की', 'के', 'है', 'हैं', 'में', 'से', 'को', 'क्या', 'कैसे', 'क्यों', 'और', 'या', 'पर',
  'यह', 'वह', 'ने', 'भी', 'तो', 'बताइए', 'बताओ', 'बारे', 'गीता']);

function stem(t: string): string {
  if (t.length > 4 && /^[a-z]+$/.test(t)) {
    if (t.endsWith('ies')) return t.slice(0, -3) + 'y';
    if (t.endsWith('ing')) return t.slice(0, -3);
    if (t.endsWith('es') && !t.endsWith('ses')) return t.slice(0, -2);
    if (t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
  }
  return t;
}
export function tokenize(text: string): string[] {
  return (text || '').toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(t => t.length > 1 && !STOP.has(t)).map(stem);
}

interface Doc { v: Verse; tf: Map<string, number>; len: number; }
let index: Promise<{ docs: Doc[]; df: Map<string, number>; avg: number }> | undefined;

function buildIndex() {
  index ??= loadScriptures().then(list => {
    const docs: Doc[] = [];
    const df = new Map<string, number>();
    for (const s of list) for (const v of s.verses ?? []) {
      const kw = tokenize(v.keywords ?? '');
      const toks = [...tokenize(v.translationEn), ...tokenize(v.translationHi), ...kw, ...kw];
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
      docs.push({ v: { ...v, citation: citation(s, v), scripture: s.code }, tf, len: toks.length });
    }
    return { docs, df, avg: docs.reduce((a, d) => a + d.len, 0) / Math.max(1, docs.length) };
  });
  return index;
}

export async function localSearch(q: string, topK = 8): Promise<Verse[]> {
  const { docs, df, avg } = await buildIndex();
  const ref = q.match(/(\d{1,2})\s*[.:/]\s*(\d{1,3})/);
  if (ref) {
    const hit = docs.filter(d => d.v.chapter === +ref[1] && d.v.verse === ref[2]).map(d => d.v);
    if (hit.length) return hit;
  }
  const terms = [...new Set(tokenize(q))];
  if (!terms.length) return [];
  const N = docs.length, k1 = 1.4, b = 0.75;
  return docs
    .map(d => {
      let score = 0;
      for (const t of terms) {
        const f = d.tf.get(t);
        if (!f) continue;
        const n = df.get(t) ?? 0;
        score += Math.log(1 + (N - n + 0.5) / (n + 0.5)) * (f * (k1 + 1)) / (f + k1 * (1 - b + b * d.len / avg));
      }
      return { v: d.v, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, topK)
    .map(x => x.v);
}
