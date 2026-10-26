import { Component, Input, inject, signal } from '@angular/core';
import { Verse } from '../core/astro/models';
import { I18nService } from '../core/services/i18n.service';
import { SCRIPT_FOR_LANG, toIast, toScript } from '../core/services/transliterate';

@Component({
  selector: 'vp-verse',
  standalone: true,
  template: `
  @if (v) {
  <blockquote class="verse">
    <p class="sk sa">{{ shown() }}</p>
    @if (showIast()) { <p class="iast">{{ iast() }}</p> }
    <p class="tr">{{ translation() }}</p>
    <footer>
      <cite>{{ v.citation }}</cite>
      <button type="button" class="link" (click)="showIast.set(!showIast())">{{ showIast() ? 'Hide IAST' : 'IAST' }}</button>
    </footer>
  </blockquote>
  }`,
  styles: [`
    .verse { margin: 0; padding: 16px 18px; background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--haldi); border-radius: var(--r-sm); }
    .sk { font-size: 1.22rem; line-height: 1.7; color: var(--ink); white-space: pre-line; margin-bottom: .5em; }
    .iast { font-style: italic; color: var(--muted); white-space: pre-line; font-size: .95rem; }
    .tr { margin-bottom: .6em; }
    footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    cite { font-style: normal; font-weight: 600; color: var(--sindoor); }
    .link { background: none; border: 0; color: var(--muted); cursor: pointer; text-decoration: underline; text-decoration-color: var(--line); padding: 4px; }
  `],
})
export class VerseCardComponent {
  @Input() v?: Verse;
  readonly i18n = inject(I18nService);
  readonly showIast = signal(false);
  shown() { return this.v ? toScript(this.v.sanskrit, SCRIPT_FOR_LANG[this.i18n.lang()] === 'iast' ? 'deva' : SCRIPT_FOR_LANG[this.i18n.lang()]) : ''; }
  iast() { return this.v ? toIast(this.v.sanskrit) : ''; }
  /** Hindi readers get Hindi where a verse has it, otherwise the English translation. */
  translation() {
    if (!this.v) return '';
    const hi = this.i18n.lang() === 'hi' || this.i18n.lang() === 'mr';
    return hi && this.v.translationHi ? this.v.translationHi : this.v.translationEn;
  }
}
