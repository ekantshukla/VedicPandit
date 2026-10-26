import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { ApiService, apiBase, hasRemoteApi, localSearch } from './api.service';
import { I18nService } from './i18n.service';
import { LocationService } from './location.service';
import { addDays, computePanchang, todayIn } from '../astro/panchang-engine';
import { findMuhurat } from '../astro/muhurat-engine';
import { Mantra } from '../astro/models';
import mantrasJson from '../data/mantras.json';

export interface ChatCard { type: 'panchang' | 'muhurat' | 'mantra' | 'verses'; payload: any; }
export interface ChatMessage { role: 'user' | 'assistant'; text: string; cards: ChatCard[]; status?: string; pending?: boolean; error?: boolean; }

interface BotEvent { type: string; text?: string; cardType?: string; payload?: unknown; tool?: string; status?: string; message?: string; }

const TOOL_LABEL: Record<string, string> = {
  get_panchang: 'Calculating panchang…', find_muhurat: 'Scanning dates for muhurat…', get_mantra: 'Opening the mantra…', search_scriptures: 'Searching the granth…',
};

@Injectable({ providedIn: 'root' })
export class PanditJiService {
  private api = inject(ApiService);
  private i18n = inject(I18nService);
  private loc = inject(LocationService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  private hub?: HubConnection;
  private readonly sessionId = this.makeSession();
  private current?: (ev: BotEvent) => void;

  private makeSession(): string {
    try {
      const s = sessionStorage.getItem('vp.session');
      if (s) return s;
      const n = crypto.randomUUID().replace(/-/g, '');
      sessionStorage.setItem('vp.session', n);
      return n;
    } catch { return Math.random().toString(36).slice(2); }
  }

  private async connect(): Promise<HubConnection | null> {
    if (!(await this.api.wake())) return null;
    if (this.hub?.state === HubConnectionState.Connected) return this.hub;
    this.hub = new HubConnectionBuilder()
      .withUrl(`${apiBase()}/hubs/panditji`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    this.hub.on('botEvent', (ev: BotEvent) => this.current?.(ev));
    try { await this.hub.start(); return this.hub; } catch { return null; }
  }

  async ask(text: string): Promise<void> {
    const q = text.trim();
    if (!q || this.busy()) return;
    this.busy.set(true);
    this.messages.update(m => [...m, { role: 'user', text: q, cards: [] }, { role: 'assistant', text: '', cards: [], pending: true }]);

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      this.messages.update(list => { const c = [...list]; c[c.length - 1] = fn({ ...c[c.length - 1] }); return c; });

    if (hasRemoteApi() && this.api.online() !== true) patch(m => ({ ...m, status: this.i18n.t('waking') }));
    const hub = await this.connect();
    if (!hub) {
      const reply = await this.localAnswer(q);
      patch(m => ({ ...m, ...reply, pending: false }));
      this.busy.set(false);
      return;
    }

    await new Promise<void>(resolve => {
      this.current = ev => {
        switch (ev.type) {
          case 'delta': patch(m => ({ ...m, text: m.text + (ev.text ?? ''), status: undefined })); break;
          case 'card': patch(m => ({ ...m, cards: [...m.cards, { type: ev.cardType as ChatCard['type'], payload: ev.payload }] })); break;
          case 'status': patch(m => ({ ...m, status: TOOL_LABEL[ev.tool ?? ''] ?? '…' })); break;
          case 'done': patch(m => ({ ...m, pending: false, status: undefined })); resolve(); break;
          case 'error': patch(m => ({ ...m, pending: false, error: true, text: m.text || (ev.message ?? 'Error') })); resolve(); break;
        }
      };
      const p = this.loc.place();
      hub.invoke('Ask', { sessionId: this.sessionId, text: q, language: this.i18n.lang(), latitude: p.lat, longitude: p.lng, timeZone: p.tz })
        .catch(() => { patch(m => ({ ...m, pending: false, error: true, text: this.i18n.t('error') })); resolve(); });
    });
    this.current = undefined;
    this.busy.set(false);
  }

  clear() { this.messages.set([]); }

  /** Rule-based answers used in demo mode (no API). Mirrors PanditJiOrchestrator.OfflineAnswerAsync. */
  private async localAnswer(q: string): Promise<Pick<ChatMessage, 'text' | 'cards'>> {
    const t = q.toLowerCase();
    const hi = ['hi', 'mr'].includes(this.i18n.lang());
    const p = this.loc.place();
    const today = todayIn(p.tz);
    const has = (...w: string[]) => w.some(x => t.includes(x));
    const note = '';

    if (has('muhurat', 'मुहूर्त', 'shubh', 'शुभ', 'good for', 'auspicious')) {
      const ev = has('vivah', 'shaadi', 'शादी', 'विवाह', 'marriage', 'wedding') ? 'Vivah'
        : has('griha', 'गृह', 'house', 'घर') ? 'GrihaPravesh'
        : has('car', 'bike', 'vahan', 'vehicle', 'गाड़ी', 'वाहन') ? 'VahanKharid'
        : has('naam', 'नाम', 'naming') ? 'Namakaran' : 'VyaparAarambh';
      const from = has('kal', 'कल', 'tomorrow') ? addDays(today, 1) : today;
      const to = has('kal', 'कल', 'tomorrow') ? from : addDays(today, 45);
      const r = findMuhurat(ev, from, to, p.lat, p.lng, p.tz, 8);
      const text = r.windows.length
        ? (hi ? `${r.eventName} के लिए ${r.windows.length} शुभ समय मिले। सबसे पहला: ${r.windows[0].date}, ${r.windows[0].start.slice(11, 16)}–${r.windows[0].end.slice(11, 16)} (${r.windows[0].nakshatra} नक्षत्र)।`
              : `Found ${r.windows.length} windows for ${r.eventName}. The first is ${r.windows[0].date}, ${r.windows[0].start.slice(11, 16)}–${r.windows[0].end.slice(11, 16)} in ${r.windows[0].nakshatra} nakshatra.`)
        : (hi ? `इस अवधि में ${r.eventName} के लिए कोई उपयुक्त समय नहीं मिला।` : `No suitable window for ${r.eventName} in that period.`);
      return { text: text + note, cards: [{ type: 'muhurat', payload: r }] };
    }

    if (has('panchang', 'पंचांग', 'tithi', 'तिथि', 'rahu', 'राहु', 'nakshatra', 'नक्षत्र', 'choghadiya', 'चौघड़िया', 'ekadashi', 'एकादशी', 'aaj', 'आज', 'today')) {
      if (has('ekadashi', 'एकादशी')) {
        for (let i = 0; i < 20; i++) {
          const d = addDays(today, i);
          const pp = computePanchang(d, p.lat, p.lng, p.tz);
          if (pp.observances.some(o => o.includes('Ekadashi'))) {
            return { text: (hi ? `अगली एकादशी ${d} को है (${pp.tithis[0].nameSanskrit})।` : `The next Ekadashi is on ${d} (${pp.tithis[0].name}).`) + note, cards: [{ type: 'panchang', payload: pp }] };
          }
        }
      }
      const d = has('kal', 'कल', 'tomorrow') ? addDays(today, 1) : today;
      const pp = computePanchang(d, p.lat, p.lng, p.tz);
      const tt = pp.tithis[0], nk = pp.nakshatras[0];
      const text = hi
        ? `${d} को ${tt.nameSanskrit} तिथि ${tt.ends?.slice(11, 16) ?? ''} तक है, नक्षत्र ${nk.nameSanskrit}। राहु काल ${pp.rahuKaal?.start.slice(11, 16)} से ${pp.rahuKaal?.end.slice(11, 16)} तक रहेगा।`
        : `On ${d} the tithi is ${tt.name} until ${tt.ends?.slice(11, 16) ?? ''}, nakshatra ${nk.name}. Rahu Kaal is ${pp.rahuKaal?.start.slice(11, 16)}–${pp.rahuKaal?.end.slice(11, 16)}.`;
      return { text: text + note, cards: [{ type: 'panchang', payload: pp }] };
    }

    if (has('mantra', 'मंत्र', 'jaap', 'जाप', 'जप', 'uchcharan', 'उच्चारण', 'pronounce', 'chant')) {
      const mantras = mantrasJson as Mantra[];
      const m = mantras.find(x => t.includes(x.slug.split('-')[0]) || t.includes(x.name.toLowerCase().split(' ')[0]) || q.includes(x.nameHi.split(' ')[0]))
        ?? mantras.find(x => x.tags.split(' ').some(tag => t.includes(tag))) ?? mantras[0];
      return { text: (hi ? `यह रहा ${m.nameHi}। नीचे के प्लेयर के साथ धीरे-धीरे जप करें। ${m.meaningHi}` : `Here is the ${m.name}. Chant slowly along with the player. ${m.meaningEn}`) + note, cards: [{ type: 'mantra', payload: m }] };
    }

    const hits = await localSearch(q, 3);
    if (hits.length) {
      const v = hits[0];
      return { text: (hi ? `${v.citation} में कहा गया है — ${v.translationHi}` : `${v.citation} says: ${v.translationEn}`) + note, cards: [{ type: 'verses', payload: hits }] };
    }
    return { text: (hi ? 'क्षमा करें, इस विषय पर अभी श्लोक-संग्रह में कुछ नहीं मिला।' : 'The verse library has nothing on that yet.') + note, cards: [] };
  }
}
