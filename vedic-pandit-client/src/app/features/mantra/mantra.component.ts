import { Component, Input, OnChanges, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { TRADITIONS, TraditionService } from '../../core/services/tradition.service';
import { sortForTradition } from '../../core/services/mantra-search';
import { Mantra } from '../../core/astro/models';
import { MantraPlayerComponent } from '../../shared/mantra-player.component';

type Kind = 'all' | 'mantra' | 'stotra' | 'chalisa';

@Component({
  selector: 'vp-mantra-page',
  standalone: true,
  imports: [MantraPlayerComponent, FormsModule],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('mantraTitle') }}</h1>
      <p>{{ i18n.t('mantraIntro') }}</p>
    </header>

    <div class="filters">
      <div class="kinds" role="tablist">
        @for (k of kinds; track k.id) {
          <button type="button" role="tab" [class.on]="kind() === k.id" [attr.aria-selected]="kind() === k.id" (click)="kind.set(k.id)">
            {{ i18n.t(k.label) }} <span class="n num">{{ countOf(k.id) }}</span>
          </button>
        }
      </div>
      <input class="input q" type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="i18n.t('searchMantra')" [attr.aria-label]="i18n.t('searchMantra')">
    </div>

    <div class="layout">
      <nav class="list" aria-label="Mantras">
        @for (m of shown(); track m.slug) {
          <button type="button" [class.on]="m.slug === selected()?.slug" (click)="pick(m)" [attr.aria-current]="m.slug === selected()?.slug">
            <span class="nm" [class.sa]="i18n.prefersDevanagari()">{{ i18n.prefersDevanagari() ? m.nameHi : m.name }}</span>
            <span class="d">{{ m.deity }} · {{ kindLabel(m) }}</span>
          </button>
        } @empty { <p class="muted none">{{ i18n.t('noResults') }}</p> }
      </nav>
      <vp-mantra-player [mantra]="selected()" />
    </div>
  </div>`,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-bottom: 10px; }
    .kinds { display: flex; gap: 6px; flex-wrap: wrap; }
    .kinds button { border: 1.5px solid var(--line); background: var(--card); color: var(--ink); border-radius: 999px; padding: 6px 14px; font: inherit; font-weight: 600; cursor: pointer; }
    .kinds button.on { background: var(--ink); border-color: var(--ink); color: #fff; }
    .kinds .n { font-weight: 500; opacity: .65; font-size: .85em; margin-left: 2px; }
    .q { flex: 1; min-width: 200px; max-width: 340px; border-radius: 999px; }
    .trad { display: flex; align-items: center; gap: 8px; color: var(--muted); font-size: var(--s-1); font-weight: 600; }
    .trad select { width: auto; }
    .tnote { margin: 0 0 14px; color: var(--muted); font-size: var(--s-1); max-width: none; }
    .layout { display: grid; grid-template-columns: 280px 1fr; gap: 28px; align-items: start; margin-top: 8px; }
    .list { display: flex; flex-direction: column; border-top: 1px solid var(--line); position: sticky; top: 84px; max-height: calc(100vh - 110px); overflow: auto; }
    .list button { text-align: left; background: none; border: 0; border-bottom: 1px solid var(--line); padding: 11px 10px; cursor: pointer; display: flex; flex-direction: column; border-left: 3px solid transparent; }
    .list button:hover { background: var(--card); }
    .list button.on { border-left-color: var(--sindoor); background: var(--card); }
    .nm { font-weight: 600; color: var(--ink); font-size: 1.02rem; }
    .nm.sa { font-weight: 400; font-size: 1.1rem; }
    .d { color: var(--faint); font-size: var(--s-1); }
    .none { padding: 12px 4px; }
    @media (max-width: 820px) {
      .layout { grid-template-columns: 1fr; gap: 16px; }
      .q { max-width: none; flex-basis: 100%; }
      .list { position: static; flex-direction: row; overflow-x: auto; max-height: none; border: 0; gap: 8px; padding-bottom: 6px; scroll-snap-type: x proximity; }
      .list button { border: 1.5px solid var(--line); border-radius: 14px; padding: 8px 14px; white-space: nowrap; flex: none; scroll-snap-align: start; }
      .list button.on { border-color: var(--sindoor); }
    }
  `],
})
export class MantraPageComponent implements OnChanges {
  @Input() slug?: string;
  readonly i18n = inject(I18nService);
  readonly trad = inject(TraditionService);
  private api = inject(ApiService);
  private router = inject(Router);
  readonly traditions = TRADITIONS;
  readonly kinds: { id: Kind; label: string }[] = [
    { id: 'all', label: 'allTexts' }, { id: 'mantra', label: 'kindMantra' }, { id: 'stotra', label: 'kindStotra' }, { id: 'chalisa', label: 'kindChalisa' },
  ];
  readonly mantras = signal<Mantra[]>([]);
  readonly selected = signal<Mantra | undefined>(undefined);
  readonly kind = signal<Kind>('all');
  readonly q = signal('');

  private readonly ordered = computed(() => sortForTradition(this.mantras(), this.trad.tradition()));
  readonly shown = computed(() => {
    const k = this.kind(), q = this.q().trim().toLowerCase();
    return this.ordered().filter(m => {
      const mk = m.kind ?? 'mantra';
      if (k !== 'all' && (k === 'chalisa' ? !(mk === 'chalisa' || mk === 'aarti') : mk !== k)) return false;
      if (!q) return true;
      return `${m.name} ${m.nameHi} ${m.deity} ${m.tags} ${m.slug}`.toLowerCase().includes(q);
    });
  });

  constructor() {
    this.api.mantras().then(list => { this.mantras.set(list); this.select(); });
  }
  ngOnChanges() { this.select(); }

  countOf(k: Kind) {
    const list = this.mantras();
    if (k === 'all') return list.length;
    return list.filter(m => k === 'chalisa' ? (m.kind === 'chalisa' || m.kind === 'aarti') : (m.kind ?? 'mantra') === k).length;
  }

  kindLabel(m: Mantra) {
    const k = m.kind ?? 'mantra';
    const hi = this.i18n.prefersDevanagari();
    return ({ mantra: hi ? 'मंत्र' : 'mantra', stotra: hi ? 'स्तोत्र' : 'stotra', chalisa: hi ? 'चालीसा' : 'chalisa', aarti: hi ? 'आरती' : 'aarti' } as Record<string, string>)[k];
  }

  tradNote() {
    const t = TRADITIONS.find(x => x.id === this.trad.tradition());
    return t ? `${this.i18n.t('forTradition')}: ${this.i18n.prefersDevanagari() ? t.noteHi : t.note}` : '';
  }

  private select() {
    const list = this.ordered();
    if (!list.length) return;
    this.selected.set(list.find(m => m.slug === this.slug) ?? this.selected() ?? list[0]);
  }

  pick(m: Mantra) { this.router.navigate(['/mantra', m.slug]); this.selected.set(m); }
}
