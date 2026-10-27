import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { Scripture, Verse } from '../../core/astro/models';
import { VerseCardComponent } from '../../shared/verse-card.component';

@Component({
  selector: 'vp-granth-page',
  standalone: true,
  imports: [FormsModule, RouterLink, VerseCardComponent],
  template: `
  <div class="wrap page">
    <a routerLink="/granth" class="back">← {{ i18n.t('granthTitle') }}</a>
    <header class="page-head">
      <h1>{{ i18n.t('libTranslated') }}</h1>
      <p>{{ i18n.t('granthIntro') }}</p>
    </header>

    <form class="search" role="search" (ngSubmit)="search()">
      <label class="sr-only" for="vq">{{ i18n.t('search') }}</label>
      <input id="vq" class="input" name="q" [(ngModel)]="q" [placeholder]="i18n.t('searchPh')">
      <button class="btn" type="submit">{{ i18n.t('search') }}</button>
    </form>

    <div class="tabs" role="tablist">
      @for (s of scriptures(); track s.code) {
        <button role="tab" type="button" [attr.aria-selected]="active() === s.code && !query()" (click)="open(s.code)">
          <span class="sa">{{ s.nameDevanagari }}</span>&ngsp;<span class="faint">{{ s.verseCount }} {{ i18n.t('verses') }}</span>
        </button>
      }
    </div>

    @if (query()) {
      <p class="muted">{{ verses().length }} {{ i18n.t('verses') }}: "{{ query() }}"
        <button type="button" class="clear" (click)="q = ''; open(active())">{{ i18n.t('clearSearch') }}</button></p>
    } @else if (current()) {
      <p class="muted desc">{{ current()?.description }}</p>
      @if (chapters().length > 1) {
        <nav class="chapters" [attr.aria-label]="i18n.t('chapter')">
          @for (c of chapters(); track c) {
            <button type="button" [class.on]="c === chapter()" [attr.aria-current]="c === chapter()" (click)="chapter.set(c)">{{ c }}</button>
          }
        </nav>
        <h2 class="ch">{{ i18n.t('chapter') }} {{ chapter() }} <span class="faint">({{ shown().length }} {{ i18n.t('verses') }})</span></h2>
      }
    }

    <div class="verses">
      @for (v of shown(); track v.chapter + '.' + v.verse) { <vp-verse [v]="v" /> }
    </div>

    @if (current()?.translationCredit && !query()) { <p class="credit faint">{{ current()?.translationCredit }}</p> }
  </div>`,
  styles: [`
    .back { display: inline-block; margin-bottom: 10px; font-weight: 600; text-decoration: none; color: var(--sindoor); }
    .search { display: flex; gap: 8px; max-width: 640px; margin-bottom: 20px; }
    .search .input { min-width: 0; }
    .tabs { display: flex; gap: 6px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
    .tabs button { background: none; border: 0; padding: 10px 14px; cursor: pointer; font-size: 1.05rem; border-bottom: 3px solid transparent; margin-bottom: -1px; flex: none; white-space: nowrap; }
    .tabs button[aria-selected="true"] { border-bottom-color: var(--sindoor); color: var(--ink); }
    .tabs .faint { font-size: var(--s-1); }
    .desc { max-width: 70ch; }
    .chapters { display: grid; grid-template-columns: repeat(9, minmax(0, 1fr)); gap: 6px; max-width: 560px; margin: 4px 0 18px; }
    @media (max-width: 560px) { .chapters { grid-template-columns: repeat(6, minmax(0, 1fr)); } }
    .chapters button { min-height: 44px; border-radius: var(--r-sm); border: 1.5px solid var(--line); background: var(--card); cursor: pointer; font-weight: 600; color: var(--ink); font-variant-numeric: tabular-nums; }
    .chapters button:hover { border-color: var(--ink); }
    .chapters button.on { background: var(--ink); border-color: var(--ink); color: #fff; }
    .ch { font-size: var(--s1); margin: 0 0 12px; }
    .ch .faint { font-weight: 400; font-size: var(--s-1); }
    .verses { display: grid; gap: 14px; max-width: 820px; }
    .credit { margin-top: 20px; font-size: var(--s-1); }
    .clear { background: none; border: 0; color: var(--sindoor); cursor: pointer; text-decoration: underline; margin-left: 8px; font: inherit; }
  `],
})
export class GranthPageComponent {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly scriptures = signal<Scripture[]>([]);
  readonly active = signal('gita');
  readonly verses = signal<Verse[]>([]);
  readonly query = signal('');
  readonly chapter = signal(1);
  q = '';

  readonly chapters = computed(() => [...new Set(this.verses().map(v => v.chapter).filter(c => c > 0))].sort((a, b) => a - b));
  /** One chapter at a time for long texts; everything for short collections and search results. */
  readonly shown = computed(() => this.query() || this.chapters().length <= 1 ? this.verses() : this.verses().filter(v => v.chapter === this.chapter()));

  constructor() {
    const want = inject(ActivatedRoute).snapshot.paramMap.get('code');
    this.api.scriptures().then(s => {
      this.scriptures.set(s);
      if (s.length) this.open(s.some(x => x.code === want) ? want! : s[0].code);
    });
  }

  current() { return this.scriptures().find(s => s.code === this.active()); }

  async open(code: string) {
    this.active.set(code);
    this.query.set('');
    this.chapter.set(1);
    this.verses.set(await this.api.verses(code));
  }

  async search() {
    const q = this.q.trim();
    if (!q) { this.open(this.active()); return; }
    this.query.set(q);
    this.verses.set(await this.api.searchVerses(q));
  }
}
