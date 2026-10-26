import { Injectable, NgZone, inject, signal } from '@angular/core';

/** Browser speech: Web Speech API for recognition (Chrome/Edge/Safari) and speechSynthesis for read-aloud. */
@Injectable({ providedIn: 'root' })
export class SpeechService {
  private zone = inject(NgZone);
  readonly listening = signal(false);
  readonly speaking = signal(false);
  private rec: any;

  get canListen(): boolean {
    const w = window as any;
    return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
  }
  get canSpeak(): boolean { return typeof speechSynthesis !== 'undefined'; }

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

  speak(text: string, lang: string, rate = 0.95) {
    if (!this.canSpeak) return;
    speechSynthesis.cancel();
    const clean = text.replace(/[*_#`>]/g, '').replace(/\(Demo mode[^)]*\)|\(डेमो मोड[^)]*\)/g, '');
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang;
    u.rate = rate;
    const voice = speechSynthesis.getVoices().find(v => v.lang === lang) ?? speechSynthesis.getVoices().find(v => v.lang.startsWith(lang.slice(0, 2)));
    if (voice) u.voice = voice;
    u.onend = () => this.zone.run(() => this.speaking.set(false));
    u.onerror = () => this.zone.run(() => this.speaking.set(false));
    this.speaking.set(true);
    speechSynthesis.speak(u);
  }

  stopSpeaking() {
    if (this.canSpeak) speechSynthesis.cancel();
    this.speaking.set(false);
  }
}
