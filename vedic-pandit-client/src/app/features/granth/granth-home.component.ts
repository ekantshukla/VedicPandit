import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { Scripture, Verse } from '../../core/astro/models';
import { VerseCardComponent } from '../../shared/verse-card.component';
import { GranthCatalog, GranthText, loadCatalog } from '../../core/services/granth-library';

/** The Granth library: Gita & Upanishads with translation, then every text by category. */
@Component({
  selector: 'vp-granth-home',
  standalone: true,
  imports: [FormsModule, RouterLink, VerseCardComponent],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('granthTitle') }}</h1>
      <p>{{ i18n.t('libIntro') }}</p>
    </header>

    <form class="search" role="search" (ngSubmit)="search()">
      <label class="sr-only" for="vq">{{ i18n.t('search') }}</label>
      <input id="vq" class="input" name="q" [(ngModel)]="q" [placeholder]="i18n.t('searchPh')" enterkeyhint="search">
      <button class="btn" type="submit">{{ i18n.t('search') }}</button>
    </form>
    @if (query()) {
      <section class="results" aria-live="polite">
        <p class="muted">{{ hits().length }} {{ i18n.t('verses') }}: “{{ query() }}” <button type="button" class="clear" (click)="clear()">{{ i18n.t('clearSearch') }}</button></p>
        <div class="verses">@for (v of hits(); track $index) { <vp-verse [v]="v" /> }</div>
      </section>
    }

    <nav class="jump" [attr.aria-label]="i18n.t('libCategories')">
      <a href="#cat-translated" (click)="go($event, 'cat-translated')">{{ i18n.t('libTranslated') }}</a>
      @for (c of catalog()?.categories ?? []; track c.id) {
        @if (textsIn(c.id).length) { <a [href]="'#cat-' + c.id" (click)="go($event, 'cat-' + c.id)">{{ label(c.name) }}</a> }
      }
    </nav>

    <section id="cat-translated" class="cat">
      <h2>{{ i18n.t('libTranslated') }}</h2>
      <p class="muted">{{ i18n.t('libTranslatedSub') }}</p>
      <div class="cards">
        @for (s of translated(); track s.code) {
          <a class="card feat" [routerLink]="['/granth/t', s.code]">
            <b class="sa">{{ s.nameDevanagari }}</b>
            <span class="en">{{ s.name }}</span>
            <small>{{ s.verseCount }} {{ i18n.t('verses') }} · {{ i18n.t('libWithTr') }}</small>
          </a>
        }
      </div>
    </section>

    @if (failed()) { <p class="note">{{ i18n.t('libOffline') }}</p> }
    @for (c of catalog()?.categories ?? []; track c.id) {
      @if (textsIn(c.id).length) {
        <section class="cat" [id]="'cat-' + c.id">
          <h2>{{ label(c.name) }}</h2>
          <p class="muted">{{ c.desc }}</p>
          <div class="cards">
            @for (t of textsIn(c.id); track t.code) {
              @if (t.soon) {
                <div class="card soon" aria-disabled="true">
                  <b class="sa">{{ t.nameDev }}</b><span class="en">{{ t.name }}</span><small>{{ i18n.t('libSoon') }}</small>
                </div>
              } @else {
                <a class="card" [routerLink]="['/granth', t.code]">
                  <b class="sa">{{ t.nameDev }}</b>
                  <span class="en">{{ t.name }}</span>
                  <small>{{ fmt(t.verses) }} {{ i18n.t('verses') }} · {{ fmt(t.chapters) }} {{ i18n.t('libChapters') }}</small>
                </a>
              }
            }
          </div>
        </section>
      }
    }
    @if (!catalog() && !failed()) { <p class="muted">{{ i18n.t('loading') }}</p> }
    <p class="credit faint">{{ i18n.t('libCredit') }}</p>
  </div>`,
  styles: [`
    .search { display: flex; gap: 8px; max-width: 640px; margin-bottom: 18px; }
    .search .input { min-width: 0; flex: 1; }
    .results { margin-bottom: 28px; }
    .verses { display: grid; gap: 14px; max-width: 820px; }
    .clear { background: none; border: 0; color: var(--sindoor); cursor: pointer; text-decoration: underline; margin-left: 8px; font: inherit; }
    .jump { display: flex; gap: 8px; overflow-x: auto; padding: 4px 0 10px; margin: 0 calc(-1 * var(--gutter)) 8px; padding-inline: var(--gutter);
      scrollbar-width: none; position: sticky; top: 64px; z-index: 5; background: var(--paper); }
    .jump::-webkit-scrollbar { display: none; }
    .jump a { flex: none; padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--line); background: var(--card); text-decoration: none;
      font-weight: 600; font-size: .9rem; color: var(--ink); white-space: nowrap; }
    .jump a:hover { border-color: var(--ink); }
    .cat { padding-top: 18px; scroll-margin-top: 120px; }
    .cat h2 { margin-bottom: 2px; }
    .cat > p { margin-bottom: 12px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
    .card { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; background: var(--card); border: 1px solid var(--line);
      border-radius: var(--r-md); text-decoration: none; color: inherit; border-left: 4px solid var(--haldi); min-height: 92px; }
    a.card:hover { border-color: var(--ink); border-left-color: var(--sindoor); }
    .card b { font-size: 1.22rem; color: var(--ink); font-weight: 400; line-height: 1.3; }
    .card .en { font-weight: 600; color: var(--text); font-size: .95rem; }
    .card small { color: var(--faint); font-size: .8rem; margin-top: auto; }
    .card.feat { border-left-color: var(--tulsi); }
    .card.soon { opacity: .6; border-left-color: var(--line); }
    .note { background: var(--haldi-soft); border-radius: var(--r-sm); padding: 10px 14px; max-width: none; }
    .credit { margin-top: 28px; font-size: var(--s-1); max-width: 80ch; }
    @media (max-width: 1024px) { .jump { position: static; } }
    @media (max-width: 520px) {
      .cards { grid-template-columns: 1fr 1fr; gap: 10px; }
      .card { padding: 12px; min-height: 0; }
      .card b { font-size: 1.08rem; }
      .card .en { font-size: .84rem; }
      .search .btn { padding-inline: 14px; }
    }
  `],
})
export class GranthHomeComponent {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly catalog = signal<GranthCatalog | null>(null);
  readonly failed = signal(false);
  readonly translated = signal<Scripture[]>([]);
  readonly query = signal('');
  readonly hits = signal<Verse[]>([]);
  q = '';

  constructor() {
    loadCatalog().then(c => this.catalog.set(c)).catch(() => this.failed.set(true));
    this.api.scriptures().then(s => this.translated.set(s));
  }

  readonly byCat = computed(() => {
    const m = new Map<string, GranthText[]>();
    for (const t of this.catalog()?.texts ?? []) m.set(t.cat, [...(m.get(t.cat) ?? []), t]);
    return m;
  });
  textsIn(cat: string) { return this.byCat().get(cat) ?? []; }
  /** "Vedas · वेद": Hindi readers see the Devanagari half first. */
  label(name: string) {
    const [en, hi] = name.split(' · ');
    return this.i18n.prefersDevanagari() && hi ? `${hi} · ${en}` : name;
  }
  fmt(n?: number) { return (n ?? 0).toLocaleString('en-IN'); }
  go(e: Event, id: string) { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  async search() {
    const q = this.q.trim();
    if (!q) { this.clear(); return; }
    this.query.set(q);
    this.hits.set(await this.api.searchVerses(q));
  }
  clear() { this.q = ''; this.query.set(''); this.hits.set([]); }
}
