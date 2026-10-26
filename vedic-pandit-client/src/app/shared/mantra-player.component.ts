import { Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Mantra } from '../core/astro/models';
import { I18nService } from '../core/services/i18n.service';
import { SpeechService } from '../core/services/speech.service';
import { SCRIPT_FOR_LANG, Script, toIast, toScript } from '../core/services/transliterate';

interface Word { w: string; s: number; e: number; l: number; }

const SCRIPTS: { id: Script; label: string }[] = [
  { id: 'deva', label: 'देवनागरी' }, { id: 'iast', label: 'IAST' }, { id: 'roman', label: 'Roman (simple)' },
  { id: 'knda', label: 'ಕನ್ನಡ' }, { id: 'telu', label: 'తెలుగు' }, { id: 'taml', label: 'தமிழ்' },
  { id: 'beng', label: 'বাংলা' }, { id: 'gujr', label: 'ગુજરાતી' }, { id: 'mlym', label: 'മലയാളം' },
];

/** Same rule as the server's ChantTiming: duration proportional to syllable count. */
function generateTiming(text: string): Word[] {
  const out: Word[] = [];
  let t = 0;
  text.replace(/\r/g, '').split('\n').filter(Boolean).forEach((line, l) => {
    for (const w of line.split(' ').filter(Boolean)) {
      let n = 0; const ch = [...w];
      ch.forEach((c, i) => {
        const code = c.charCodeAt(0);
        if ((code >= 0x904 && code <= 0x914) || code === 0x950) n++;
        else if (code >= 0x915 && code <= 0x939 && ch[i + 1] !== '्') n++;
      });
      const dur = Math.max(1, n) * 420;
      out.push({ w, s: t, e: t + dur, l });
      t += dur + 120;
    }
    t += 700;
  });
  return out;
}

@Component({
  selector: 'vp-mantra-player',
  standalone: true,
  imports: [FormsModule],
  template: `
  @if (mantra) {
  <article class="player">
    <header class="ph">
      <div>
        <h3>{{ i18n.prefersDevanagari() ? mantra.nameHi : mantra.name }}</h3>
        <p class="src">{{ i18n.t('source') }}: {{ mantra.source }}</p>
      </div>
      <label class="script">
        <span class="sr-only">{{ i18n.t('script') }}</span>
        <select class="input" [ngModel]="script()" (ngModelChange)="script.set($event)" [attr.aria-label]="i18n.t('script')">
          @for (s of scripts; track s.id) { <option [value]="s.id">{{ s.label }}</option> }
        </select>
      </label>
    </header>

    <div class="text" [class.big]="!compact">
      @for (line of lines(); track $index) {
        <p class="line">
          @for (w of line; track w.i) {
            <span class="w" [class.on]="w.i === current()" [class.done]="w.i < current()">
              <span class="main" [class.sa]="script() !== 'iast' && script() !== 'roman'">{{ w.main }}</span>
              @if (script() !== 'iast' && script() !== 'roman') { <span class="rom">{{ w.iast }}</span> }
            </span>
          }
        </p>
      }
    </div>

    <div class="controls">
      <button class="btn" type="button" (click)="toggle()">{{ playing() ? i18n.t('pause') : i18n.t('play') }}</button>
      <button class="btn ghost" type="button" (click)="restart()">{{ i18n.t('restart') }}</button>
      <label class="tempo">
        <span>{{ i18n.t('tempo') }} {{ tempo().toFixed(1) }}×</span>
        <input type="range" min="0.5" max="1.5" step="0.1" [ngModel]="tempo()" (ngModelChange)="setTempo(+$event)">
      </label>
      @if (speech.canSpeak && !mantra.audioUrl) {
        <button class="btn quiet" type="button" (click)="voice()">{{ speech.speaking() ? i18n.t('stopReading') : i18n.t('voice') }}</button>
      }
      @if (mantra.audioUrl) { <audio #audio [src]="mantra.audioUrl" preload="metadata" (ended)="onEnded()"></audio> }
    </div>

    @if (!compact) {
    <div class="japa">
      <button type="button" class="bead" (click)="countUp()" [attr.aria-label]="i18n.t('count')">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="8"/>
          <circle cx="60" cy="60" r="52" fill="none" stroke="var(--tulsi)" stroke-width="8" stroke-linecap="round"
            [attr.stroke-dasharray]="ring()" transform="rotate(-90 60 60)"/>
        </svg>
        <span class="cnt num">{{ count() }}<small>/{{ mantra.recommendedRepetitions }}</small></span>
      </button>
      <p class="muted">{{ i18n.t('tapToCount') }}</p>
    </div>
    }

    <dl class="info">
      <dt>{{ i18n.t('meaning') }}</dt>
      <dd>{{ i18n.prefersDevanagari() ? mantra.meaningHi : mantra.meaningEn }}</dd>
      <dt>{{ i18n.t('pronunciation') }}</dt>
      <dd>{{ mantra.pronunciationTips }}</dd>
      @if (!compact) { <dt>{{ i18n.t('benefits') }}</dt><dd>{{ mantra.benefits }}</dd> }
    </dl>
  </article>
  }`,
  styles: [`
    .player { background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); padding: 20px; }
    .ph { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .ph h3 { margin: 0; }
    .src { color: var(--faint); font-size: var(--s-1); margin: 2px 0 0; }
    .script select { width: auto; min-width: 150px; }
    .text { background: var(--ink); color: #F6F4FA; border-radius: var(--r-md); padding: 20px 18px; margin: 16px 0; }
    .line { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0 0 12px; max-width: none; }
    .line:last-child { margin-bottom: 0; }
    .w { display: inline-flex; flex-direction: column; align-items: flex-start; padding: 2px 4px; border-radius: 6px; transition: background-color .15s, color .15s; }
    .main { font-size: 1.35rem; line-height: 1.5; color: rgba(246,244,250,.78); }
    .big .main { font-size: 1.75rem; }
    .rom { font-size: .8rem; color: rgba(246,244,250,.55); }
    .w.done .main { color: #F6F4FA; }
    .w.on { background: var(--haldi); }
    .w.on .main, .w.on .rom { color: var(--ink); }
    .controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .tempo { display: flex; flex-direction: column; font-size: var(--s-1); color: var(--muted); min-width: 140px; }
    .tempo input { accent-color: var(--sindoor); }
    .japa { display: flex; align-items: center; gap: 16px; margin-top: 18px; }
    .japa p { margin: 0; }
    .bead { position: relative; width: 92px; height: 92px; border: 0; background: none; padding: 0; cursor: pointer; border-radius: 50%; }
    .bead svg { width: 100%; height: 100%; }
    .bead circle:last-child { transition: stroke-dasharray .25s; }
    .cnt { position: absolute; inset: 0; display: flex; align-items: baseline; justify-content: center; padding-top: 34px; font-weight: 700; font-size: 1.3rem; color: var(--ink); }
    .cnt small { font-size: .7rem; color: var(--faint); font-weight: 500; }
    .info { margin: 18px 0 0; display: grid; grid-template-columns: max-content 1fr; gap: 6px 16px; }
    .info dt { color: var(--muted); font-weight: 600; }
    .info dd { margin: 0; max-width: 66ch; }
    @media (max-width: 560px) { .info { grid-template-columns: 1fr; } .info dd { margin-bottom: 8px; } }
  `],
})
export class MantraPlayerComponent implements OnChanges, OnDestroy {
  @Input() mantra?: Mantra;
  @Input() compact = false;
  @ViewChild('audio') audioRef?: ElementRef<HTMLAudioElement>;

  readonly i18n = inject(I18nService);
  readonly speech = inject(SpeechService);
  readonly scripts = SCRIPTS;
  readonly script = signal<Script>(SCRIPT_FOR_LANG[this.i18n.lang()] ?? 'deva');
  readonly words = signal<Word[]>([]);
  readonly current = signal(-1);
  readonly playing = signal(false);
  readonly tempo = signal(1);
  readonly count = signal(0);

  private raf = 0;
  private startedAt = 0;
  private offsetMs = 0;

  readonly lines = computed(() => {
    const byLine: { i: number; main: string; iast: string }[][] = [];
    this.words().forEach((w, i) => {
      (byLine[w.l] ??= []).push({ i, main: toScript(w.w, this.script()), iast: toIast(w.w) });
    });
    return byLine.filter(Boolean);
  });
  readonly ring = computed(() => {
    const total = this.mantra?.recommendedRepetitions || 108;
    const c = 2 * Math.PI * 52;
    return `${(Math.min(this.count(), total) / total) * c} ${c}`;
  });

  ngOnChanges() {
    this.stop();
    this.count.set(0);
    if (!this.mantra) return;
    let timing: Word[] = [];
    try { timing = JSON.parse(this.mantra.timingJson || '[]'); } catch { timing = []; }
    this.words.set(timing.length ? timing : generateTiming(this.mantra.sanskrit));
    this.current.set(-1);
  }
  ngOnDestroy() { this.stop(); this.speech.stopSpeaking(); }

  private get totalMs() { const w = this.words(); return w.length ? w[w.length - 1].e : 0; }

  toggle() { this.playing() ? this.pause() : this.play(); }

  play() {
    const audio = this.audioRef?.nativeElement;
    if (audio) { audio.playbackRate = this.tempo(); audio.play(); }
    this.startedAt = performance.now();
    this.playing.set(true);
    const tick = () => {
      const elapsed = audio ? audio.currentTime * 1000 : this.offsetMs + (performance.now() - this.startedAt) * this.tempo();
      const idx = this.words().findIndex(w => elapsed >= w.s && elapsed < w.e + 120);
      if (idx >= 0) this.current.set(idx);
      if (!audio && elapsed >= this.totalMs) { this.onEnded(); return; }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  pause() {
    cancelAnimationFrame(this.raf);
    this.audioRef?.nativeElement.pause();
    this.offsetMs += (performance.now() - this.startedAt) * this.tempo();
    this.playing.set(false);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.playing.set(false);
    this.offsetMs = 0;
  }

  restart() {
    this.stop();
    const a = this.audioRef?.nativeElement;
    if (a) a.currentTime = 0;
    this.current.set(-1);
    this.play();
  }

  onEnded() {
    this.stop();
    this.current.set(this.words().length);
    this.count.update(c => c + 1);
  }

  setTempo(v: number) {
    if (this.playing()) { this.pause(); this.tempo.set(v); this.play(); }
    else this.tempo.set(v);
    const a = this.audioRef?.nativeElement;
    if (a) a.playbackRate = v;
  }

  countUp() { this.count.update(c => c + 1); if (navigator.vibrate) navigator.vibrate(15); }

  voice() {
    if (this.speech.speaking()) { this.speech.stopSpeaking(); return; }
    if (this.mantra) this.speech.speak(this.mantra.sanskrit.replace(/\n/g, '। '), 'hi-IN', 0.7 * this.tempo());
  }
}
