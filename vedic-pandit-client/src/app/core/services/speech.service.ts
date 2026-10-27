import { Injectable, NgZone, inject, signal } from '@angular/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { NativeService } from './native.service';

/** Which engine reads Sanskrit aloud: the phone's own TTS (in the app), a browser voice, or none. */
export type SanskritVoice = { kind: 'native'; name: string } | { kind: 'web'; name: string; voice: SpeechSynthesisVoice } | null;

/** Indic voices that read Devanagari correctly, best first. English voices are never used for mantras. */
const INDIC = ['sa', 'hi', 'mr', 'ne'];
const PREFERRED = /natural|online|neural|google|swara|madhur|lekha|kiyara|aditi/i;

/**
 * Hindi text-to-speech reads Devanagari well but follows Hindi habits. These rewrites make it closer to Sanskrit:
 * the visarga is voiced as an echo of the vowel before it (नमः → नमह, हरिः → हरिहि), the avagraha is silent,
 * verse numbers are dropped and dandas become pauses.
 */
export function forSanskritTts(text: string): string {
  const echo: Record<string, string> = { 'ा': 'ह', 'ि': 'हि', 'ी': 'हि', 'ु': 'हु', 'ू': 'हु', 'े': 'हे', 'ै': 'हि', 'ो': 'हो', 'ौ': 'हु' };
  return text
    .replace(/॥\s*[०-९0-9]+\s*॥/g, '।')
    .replace(/([क-ह])([ािीुूेैोौ]?)ः/g, (_, c: string, v: string) => c + v + (v ? echo[v] : 'ह'))
    .replace(/ऽ/g, '')
    .replace(/[॥।]+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Browser speech: Web Speech API for recognition and speechSynthesis / native TTS for read-aloud. */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private zone = inject(NgZone);
  private native = inject(NativeService);
  readonly listening = signal(false);
  readonly speaking = signal(false);
  private rec: any;
  private voiceCheck?: Promise<SanskritVoice>;

  get canListen(): boolean {
    const w = window as any;
    return !this.native.isApp && !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }
  get canSpeak(): boolean { return this.native.isApp || typeof speechSynthesis !== 'undefined'; }

  listen(lang: string, onFinal: (text: string) => void, onInterim?: (text: string) => void) {
    const w = window as any;
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) return;
    this.stopListening();
    this.rec = new Rec();
    this.rec.lang = lang;
    this.rec.interimResults = true;
    this.rec.maxAlternatives = 1;
    this.rec.onresult = (e: any) => this.zone.run(() => {
      let finalText = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      if (interim && onInterim) onInterim(interim);
      if (finalText) onFinal(finalText);
    });
    this.rec.onend = () => this.zone.run(() => this.listening.set(false));
    this.rec.onerror = () => this.zone.run(() => this.listening.set(false));
    this.listening.set(true);
    this.rec.start();
  }

  stopListening() {
    try { this.rec?.stop(); } catch { /* ignore */ }
    this.listening.set(false);
  }

  private webVoices(): Promise<SpeechSynthesisVoice[]> {
    if (typeof speechSynthesis === 'undefined') return Promise.resolve([]);
    const now = speechSynthesis.getVoices();
    if (now.length) return Promise.resolve(now);
    return new Promise(resolve => {
      const done = () => resolve(speechSynthesis.getVoices());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }

  /** Finds a voice that can read Sanskrit, once. Returns null if the device has none (then the voice guide stays off). */
  sanskritVoice(): Promise<SanskritVoice> {
    this.voiceCheck ??= (async (): Promise<SanskritVoice> => {
      if (this.native.isApp) {
        try {
          const { supported } = await TextToSpeech.isLanguageSupported({ lang: 'hi-IN' });
          return supported ? { kind: 'native', name: 'Android हिन्दी' } : null;
        } catch { return null; }
      }
      const voices = await this.webVoices();
      for (const code of INDIC) {
        const list = voices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith(code));
        const best = list.find(v => PREFERRED.test(v.name)) ?? list[0];
        if (best) return { kind: 'web', name: best.name, voice: best };
      }
      return null;
    })();
    return this.voiceCheck;
  }

  /** Speaks one line of Sanskrit and resolves when it has been spoken (or was stopped). */
  async speakSanskritLine(line: string, rate = 0.8): Promise<void> {
    const v = await this.sanskritVoice();
    if (!v) return;
    const text = forSanskritTts(line);
    if (!text) return;
    this.speaking.set(true);
    if (v.kind === 'native') {
      try { await TextToSpeech.speak({ text, lang: 'hi-IN', rate, pitch: 1, volume: 1, category: 'playback' }); } catch { /* stopped */ }
      return;
    }
    await new Promise<void>(resolve => {
      const u = new SpeechSynthesisUtterance(text);
      u.voice = v.voice; u.lang = v.voice.lang; u.rate = rate;
      u.onend = () => resolve(); u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  /** Read an answer aloud in the reader's language. Uses only a voice for that language; never a mismatched one. */
  async speak(text: string, lang: string, rate = 0.95) {
    const clean = text.replace(/[*_#`>]/g, '');
    this.stopSpeaking();
    if (this.native.isApp) {
      this.speaking.set(true);
      try { await TextToSpeech.speak({ text: clean, lang, rate, category: 'playback' }); } catch { /* ignore */ }
      this.zone.run(() => this.speaking.set(false));
      return;
    }
    if (typeof speechSynthesis === 'undefined') return;
    const voices = await this.webVoices();
    const base = lang.slice(0, 2);
    const voice = voices.find(v => v.lang === lang) ?? voices.find(v => v.lang.startsWith(base));
    if (!voice && base !== 'en') return;   // an English voice reading Hindi or Tamil is worse than silence
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang; u.rate = rate;
    if (voice) u.voice = voice;
    u.onend = () => this.zone.run(() => this.speaking.set(false));
    u.onerror = () => this.zone.run(() => this.speaking.set(false));
    this.speaking.set(true);
    speechSynthesis.speak(u);
  }

  stopSpeaking() {
    if (this.native.isApp) { TextToSpeech.stop().catch(() => undefined); }
    else if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    this.speaking.set(false);
  }
}
