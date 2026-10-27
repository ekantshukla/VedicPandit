import { AfterViewChecked, Component, ElementRef, Input, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { I18nService } from '../core/services/i18n.service';
import { PanditJiService } from '../core/services/panditji.service';
import { SpeechService } from '../core/services/speech.service';
import { ApiService } from '../core/services/api.service';
import { PanchangViewComponent } from './panchang-view.component';
import { MuhuratListComponent } from './muhurat-list.component';
import { MantraPlayerComponent } from './mantra-player.component';
import { VerseCardComponent } from './verse-card.component';
import { BotAvatarComponent } from './bot-avatar.component';
import { RashifalCardComponent } from './rashifal-card.component';

@Component({
  selector: 'vp-chat-panel',
  standalone: true,
  imports: [FormsModule, PanchangViewComponent, MuhuratListComponent, MantraPlayerComponent, VerseCardComponent, BotAvatarComponent, RashifalCardComponent],
  template: `
  <div class="chat" [class.full]="full">
    <div class="log" #log aria-live="polite">
      @if (!bot.messages().length) {
        <div class="row">
          <vp-bot-avatar class="av" [size]="32" />
          <div class="col">
            <div class="bubble hello">{{ i18n.t('chatEmpty') }}</div>
            <div class="ex">
              @for (k of ['ex5','ex1','ex2','ex3','ex4']; track k) {
                <button type="button" class="chip" (click)="send(i18n.t(k))">{{ i18n.t(k) }}</button>
              }
            </div>
          </div>
        </div>
      }
      @for (m of bot.messages(); track $index) {
        <div class="row" [class.me]="m.role === 'user'" [class.err]="m.error">
          @if (m.role !== 'user') { <vp-bot-avatar class="av" [size]="32" /> }
          <div class="col">
            @if (m.text) { <div class="bubble">{{ m.text }}</div> }
            @if (m.pending && !m.text) {
              <div class="bubble typing" [attr.aria-label]="m.status || i18n.t('thinking')"><i></i><i></i><i></i></div>
              <span class="status">{{ m.status || i18n.t('thinking') }}</span>
            }
            @for (c of m.cards; track $index) {
              <div class="card">
                @switch (c.type) {
                  @case ('panchang') { <vp-panchang-view [p]="c.payload" [compact]="true" /> }
                  @case ('muhurat') { <vp-muhurat-list [r]="c.payload" [compact]="!full" /> }
                  @case ('mantra') { <vp-mantra-player [mantra]="c.payload" [compact]="true" /> }
                  @case ('rashifal') { <vp-rashifal-card [payload]="c.payload" /> }
                  @case ('verses') { <div class="verses">@for (v of c.payload.slice(0, 3); track $index) { <vp-verse [v]="v" /> }</div> }
                }
              </div>
            }
            @if (m.role === 'assistant' && !m.pending && m.text && speech.canSpeak) {
              <button type="button" class="speak" (click)="read(m.text)">{{ speech.speaking() ? i18n.t('stopReading') : i18n.t('readAloud') }}</button>
            }
            @if (m.role === 'assistant' && !m.pending && m.next?.length && $last) {
              <div class="next" role="group" [attr.aria-label]="i18n.t('askNext')">
                <span class="nl">{{ i18n.t('askNext') }}</span>
                @for (n of m.next; track n) {
                  <button type="button" class="chip nx" (click)="send(n)" [disabled]="bot.busy()">{{ n }}</button>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>

    @if (api.online() === false && !api.ai() && showOffline) { <p class="offline">{{ i18n.t('offline') }}</p> }

    @if (speech.listening()) {
      <div class="listen" role="status">
        <span class="wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
        <span>{{ draft() || i18n.t('listenSpeak') }}</span>
      </div>
    }
    @if (micNote()) { <p class="micnote">{{ micNote() }}</p> }
    <form class="ask" (ngSubmit)="send(draft())">
      <label class="sr-only" for="ask-{{ uid }}">{{ i18n.t('askPlaceholder') }}</label>
      <input id="ask-{{ uid }}" class="input" [ngModel]="draft()" (ngModelChange)="draft.set($event)" name="q"
             [placeholder]="speech.listening() ? i18n.t('listening') : i18n.t('askPlaceholder')" autocomplete="off" [disabled]="bot.busy()">
      @if (speech.canListen && (!draft().trim() || speech.listening())) {
        <!-- Empty box: the main button is the microphone (tap, speak, it sends by itself) -->
        <button type="button" class="mic big" [class.on]="speech.listening()" (click)="mic()" [disabled]="bot.busy()"
                [attr.aria-label]="speech.listening() ? i18n.t('listening') : i18n.t('speak')" [title]="i18n.t('speak')">
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z"/></svg>
        </button>
      } @else {
        <button class="btn send" type="submit" [disabled]="bot.busy() || !draft().trim()">{{ i18n.t('ask') }}</button>
      }
    </form>
  </div>`,
  styles: [`
    .chat { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .log { flex: 1; overflow-y: auto; padding: 4px 2px 12px; display: flex; flex-direction: column; gap: 16px; overscroll-behavior: contain; }
    .row { display: flex; gap: 8px; align-items: flex-start; }
    .row.me { justify-content: flex-end; }
    .av { flex: none; margin-top: 2px; }
    .col { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; min-width: 0; flex: 1; }
    .me .col { align-items: flex-end; }
    .hello { font-size: 1.02rem; }
    .typing { display: inline-flex; gap: 5px; padding: 14px 16px; }
    .typing i { width: 7px; height: 7px; border-radius: 50%; background: var(--faint); animation: dot 1.2s infinite ease-in-out; }
    .typing i:nth-child(2) { animation-delay: .15s; } .typing i:nth-child(3) { animation-delay: .3s; }
    @keyframes dot { 0%, 60%, 100% { transform: none; opacity: .45; } 30% { transform: translateY(-4px); opacity: 1; } }
    .status { font-size: .78rem; color: var(--faint); }
    .ex { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { border: 1.5px solid var(--line); background: var(--card); border-radius: 999px; padding: 8px 14px; cursor: pointer; text-align: left; min-height: 40px; }
    .chip:hover { border-color: var(--ink); }
    .bubble { white-space: pre-line; background: var(--card); border: 1px solid var(--line); padding: 10px 14px; border-radius: 4px 14px 14px 14px; max-width: min(62ch, 100%); }
    .me .bubble { background: var(--ink); color: #F6F4FA; border-color: var(--ink); border-radius: 14px 4px 14px 14px; }
    .err .bubble { border-color: var(--sindoor); }
    .card { width: 100%; background: var(--card); border: 1px solid var(--line); border-radius: var(--r-md); padding: 14px; }
    .card:has(vp-mantra-player) { padding: 0; border: 0; background: none; }
    .verses { display: grid; gap: 10px; }
    .next { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 4px; animation: nx-in .25s ease-out; }
    .nl { width: 100%; font-size: .78rem; font-weight: 600; color: var(--faint); }
    .chip.nx { border-color: var(--haldi); background: var(--haldi-soft); color: var(--ink); font-size: .92rem; min-height: 38px; padding: 7px 13px; }
    .chip.nx::before { content: '↳ '; color: var(--sindoor); }
    .chip.nx:hover { border-color: var(--sindoor); }
    .chip.nx:disabled { opacity: .5; cursor: default; }
    @keyframes nx-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    .speak { background: none; border: 0; color: var(--muted); cursor: pointer; font-size: var(--s-1); padding: 2px 0; text-decoration: underline; text-decoration-color: var(--line); }
    .offline { font-size: var(--s-1); color: var(--muted); background: var(--haldi-soft); border-radius: var(--r-sm); padding: 6px 10px; margin: 0 0 8px; max-width: none; }
    .ask { display: flex; gap: 8px; align-items: center; padding-top: 8px; border-top: 1px solid var(--line); }
    .ask .input { flex: 1; border-radius: 999px; padding-left: 16px; }
    .mic { width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--line); background: var(--card); color: var(--ink); cursor: pointer; display: grid; place-items: center; flex: none; }
    .mic.big { width: 48px; height: 48px; background: var(--sindoor); color: #fff; border-color: var(--sindoor); }
    .mic.on { background: var(--sindoor); color: #fff; border-color: var(--sindoor); animation: pulse 1.4s infinite; }
    .mic:disabled { opacity: .5; }
    .send { min-height: 48px; }
    .listen { display: flex; align-items: center; gap: 12px; background: var(--ink); color: #fff; border-radius: 16px; padding: 12px 16px; margin-bottom: 8px; font-size: 1rem; }
    .wave { display: inline-flex; gap: 3px; align-items: center; height: 22px; flex: none; }
    .wave i { width: 4px; border-radius: 2px; background: var(--haldi); animation: wv 1s ease-in-out infinite; height: 8px; }
    .wave i:nth-child(2) { animation-delay: .1s; } .wave i:nth-child(3) { animation-delay: .2s; } .wave i:nth-child(4) { animation-delay: .3s; } .wave i:nth-child(5) { animation-delay: .4s; }
    @keyframes wv { 0%, 100% { height: 6px; } 50% { height: 22px; } }
    .micnote { font-size: var(--s-1); color: var(--sindoor); margin: 0 0 8px; max-width: none; }
    @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(179,18,46,.35); } 50% { box-shadow: 0 0 0 10px rgba(179,18,46,0); } }
  `],
})
export class ChatPanelComponent implements AfterViewChecked {
  @Input() full = false;
  @Input() showOffline = true;
  @ViewChild('log') log?: ElementRef<HTMLDivElement>;
  readonly i18n = inject(I18nService);
  readonly bot = inject(PanditJiService);
  readonly speech = inject(SpeechService);
  readonly api = inject(ApiService);
  readonly draft = signal('');
  readonly uid = Math.random().toString(36).slice(2, 7);
  private lastCount = 0;
  private lastLen = 0;

  ngAfterViewChecked() {
    const msgs = this.bot.messages();
    const last = msgs[msgs.length - 1];
    const len = last ? last.text.length + last.cards.length + (last.next?.length ?? 0) : 0;
    if (msgs.length !== this.lastCount || len !== this.lastLen) {
      this.lastCount = msgs.length; this.lastLen = len;
      const el = this.log?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  send(text: string) {
    if (!text.trim()) return;
    this.draft.set('');
    this.bot.ask(text);
  }

  readonly micNote = signal('');
  mic() {
    if (this.speech.listening()) { this.speech.stopListening(); return; }
    this.micNote.set('');
    this.speech.listen(this.i18n.current().speech,
      final => { this.draft.set(''); this.send(final); },
      interim => this.draft.set(interim),
      err => this.micNote.set(this.i18n.t(err === 'denied' ? 'micDenied' : 'micError')));
  }


  read(text: string) {
    if (this.speech.speaking()) { this.speech.stopSpeaking(); return; }
    this.speech.speak(text, this.i18n.current().speech);
  }
}
