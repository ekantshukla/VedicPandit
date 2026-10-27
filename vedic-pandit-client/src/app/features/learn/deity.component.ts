import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { PanditJiService } from '../../core/services/panditji.service';
import { Mantra } from '../../core/astro/models';
import { DEITIES, KINDS, Listen, forEveryDeity, listenUrl, textsFor } from '../../core/data/deities';

/** One deity: its mantras, stotras, chalisa and aarti, with the days and festivals it is worshipped on. */
@Component({
  selector: 'vp-deity',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="wrap page">
    <a routerLink="/learn" class="back">← {{ i18n.t('learnTitle') }}</a>
    @if (deity(); as d) {
      <header class="hero" [style.--dc]="d.color">
        <span class="ic" aria-hidden="true">{{ d.icon }}</span>
        <div>
          <h1 [class.sa]="hi()">{{ hi() ? d.hi : d.en }}</h1>
          <p>{{ hi() ? d.aboutHi : d.about }}</p>
          <p class="meta"><span>📅 {{ hi() ? d.dayHi : d.day }}</span><span>🪔 {{ hi() ? d.festHi : d.fest }}</span></p>
        </div>
      </header>

      <nav class="kinds" [attr.aria-label]="i18n.t('learnTitle')">
        @for (k of kinds; track k) {
          <a [href]="'#k-' + k" (click)="jump($event, k)" [class.empty]="!byKind()[k].length && !listen(k).length">{{ kindName(k) }} <b class="num">{{ byKind()[k].length }}</b></a>
        }
      </nav>

      @for (k of kinds; track k) {
        <section [id]="'k-' + k">
          <h2>{{ kindName(k) }}</h2>
          @if (byKind()[k].length) {
            <div class="grid">
              @for (m of byKind()[k]; track m.slug) {
                <a class="card" [routerLink]="['/mantra', m.slug]">
                  <b [class.sa]="hi()">{{ nm(m) }}</b>
                  <span>{{ hi() ? m.name : m.nameHi }}</span>
                  <small>{{ m.source }}</small>
                </a>
              }
            </div>
          }
          @if (listen(k).length) {
            <div class="listen">
              @for (l of listen(k); track l.en) {
                <a class="lcard" [href]="url(l)" target="_blank" rel="noopener">
                  <span class="pl" aria-hidden="true">▶</span>
                  <span><b [class.sa]="hi()">{{ hi() ? l.hi : l.en }}</b><small>{{ i18n.t('dListen') }}</small></span>
                </a>
              }
            </div>
          }
          @if (!byKind()[k].length && !listen(k).length) { <p class="muted none">{{ i18n.t('dNone') }}</p> }
        </section>
      }

      @if (every().length) {
        <section>
          <h2>{{ i18n.t('dEvery') }}</h2>
          <div class="grid">
            @for (m of every(); track m.slug) {
              <a class="card" [routerLink]="['/mantra', m.slug]"><b [class.sa]="hi()">{{ nm(m) }}</b><small>{{ m.source }}</small></a>
            }
          </div>
        </section>
      }

      <button type="button" class="btn ask" (click)="ask()">✨ {{ i18n.f('dAsk', { d: hi() ? d.hi : d.en }) }}</button>
      <p class="note faint">{{ i18n.t('dNote') }}</p>
    } @else {
      <p class="muted">{{ i18n.t('nothingFound') }}</p>
    }
  </div>`,
  styles: [`
    .back { display: inline-block; margin-bottom: 12px; font-weight: 600; text-decoration: none; color: var(--sindoor); }
    .hero { display: flex; gap: 16px; align-items: flex-start; background: var(--card); border: 1px solid var(--line); border-top: 5px solid var(--dc);
      border-radius: var(--r-md); padding: 18px; }
    .ic { width: 72px; height: 72px; flex: none; border-radius: 20px; display: grid; place-items: center; font-size: 2.4rem;
      background: color-mix(in srgb, var(--dc) 14%, white); }
    .hero h1 { margin: 0 0 4px; font-size: var(--s3); }
    .hero h1.sa { font-weight: 400; }
    .hero p { margin: 0 0 6px; color: var(--muted); }
    .meta { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: .9rem; }
    .kinds { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 16px 0 4px; padding-bottom: 4px; }
    .kinds a { flex: none; display: inline-flex; gap: 6px; align-items: center; padding: 8px 14px; border-radius: 999px; border: 1.5px solid var(--line);
      background: var(--card); color: var(--ink); text-decoration: none; font-weight: 600; white-space: nowrap; }
    .kinds a b { background: var(--haldi-soft); border-radius: 999px; padding: 0 8px; font-size: .8rem; }
    .kinds a.empty { opacity: .5; }
    section { margin-top: 22px; scroll-margin-top: 90px; }
    h2 { font-size: var(--s2); margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
    .card { min-width: 0; display: flex; flex-direction: column; gap: 2px; background: var(--card); border: 1px solid var(--line); border-left: 4px solid var(--haldi);
      border-radius: 14px; padding: 12px 14px; text-decoration: none; color: inherit; }
    .card:hover { border-color: var(--ink); }
    .card b { color: var(--ink); font-size: 1.05rem; }
    .card b.sa { font-weight: 400; font-size: 1.15rem; }
    .card span { color: var(--muted); font-size: .85rem; }
    .card small { color: var(--faint); font-size: .76rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .listen { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-top: 10px; }
    .lcard { min-width: 0; display: flex; gap: 12px; align-items: center; padding: 10px 14px; border-radius: 14px; border: 1.5px dashed var(--line); background: var(--paper);
      text-decoration: none; color: inherit; }
    .lcard:hover { border-color: var(--sindoor); }
    .pl { width: 36px; height: 36px; flex: none; border-radius: 50%; background: var(--sindoor); color: #fff; display: grid; place-items: center; font-size: .85rem; }
    .lcard b { display: block; color: var(--ink); }
    .lcard b.sa { font-weight: 400; font-size: 1.08rem; }
    .lcard small { color: var(--faint); font-size: .78rem; }
    .none { margin: 0; }
    .ask { margin-top: 26px; }
    .note { margin-top: 14px; font-size: var(--s-1); }
    @media (max-width: 560px) {
      .hero { padding: 14px; gap: 12px; }
      .ic { width: 56px; height: 56px; font-size: 1.9rem; border-radius: 16px; }
      .grid, .listen { grid-template-columns: minmax(0, 1fr); }
      .ask { width: 100%; white-space: normal; }
    }
  `],
})
export class DeityComponent {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  private bot = inject(PanditJiService);
  private router = inject(Router);
  readonly kinds = KINDS;
  readonly hi = computed(() => this.i18n.prefersDevanagari());
  readonly id = signal('');
  readonly all = signal<Mantra[]>([]);

  constructor() {
    inject(ActivatedRoute).paramMap.subscribe(p => this.id.set(p.get('deity') ?? ''));
    this.api.mantras().then(l => this.all.set(l));
  }

  readonly deity = computed(() => DEITIES.find(d => d.id === this.id()));
  readonly byKind = computed(() => {
    const d = this.deity();
    const list = d ? textsFor(d, this.all()) : [];
    const out: Record<string, Mantra[]> = { mantra: [], stotra: [], chalisa: [], aarti: [] };
    for (const m of list) out[m.kind ?? 'mantra'].push(m);
    return out;
  });
  readonly every = computed(() => forEveryDeity(this.all()));

  listen(k: string): Listen[] { return (this.deity()?.listen ?? []).filter(l => l.kind === k); }
  url(l: Listen) { return listenUrl(l); }
  nm(m: Mantra) { return this.hi() ? m.nameHi : m.name; }
  kindName(k: string) {
    const hi = this.hi();
    return ({ mantra: hi ? 'मंत्र' : 'Mantras', stotra: hi ? 'स्तोत्र' : 'Stotras', chalisa: hi ? 'चालीसा' : 'Chalisa', aarti: hi ? 'आरती' : 'Aarti' } as Record<string, string>)[k];
  }
  jump(e: Event, k: string) { e.preventDefault(); document.getElementById('k-' + k)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  ask() {
    const d = this.deity();
    if (!d) return;
    const q = this.hi() ? `${d.hi} की पूजा कैसे करें? उनके प्रमुख मंत्र, व्रत और कथा बताइए।` : `How should I worship ${d.en}? Tell me the main mantras, vrat and story.`;
    this.router.navigate(['/ask']);
    this.bot.ask(q);
  }
}
