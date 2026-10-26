import { Component, Input, OnChanges, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { Mantra } from '../../core/astro/models';
import { MantraPlayerComponent } from '../../shared/mantra-player.component';

@Component({
  selector: 'vp-mantra-page',
  standalone: true,
  imports: [MantraPlayerComponent],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('mantraTitle') }}</h1>
      <p>{{ i18n.t('mantraIntro') }}</p>
    </header>
    <div class="layout">
      <nav class="list" aria-label="Mantras">
        @for (m of mantras(); track m.slug) {
          <button type="button" [class.on]="m.slug === selected()?.slug" (click)="pick(m)" [attr.aria-current]="m.slug === selected()?.slug">
            <span class="n" [class.sa]="i18n.prefersDevanagari()">{{ i18n.prefersDevanagari() ? m.nameHi : m.name }}</span>
            <span class="d">{{ m.deity }}</span>
          </button>
        }
      </nav>
      <vp-mantra-player [mantra]="selected()" />
    </div>
  </div>`,
  styles: [`
    .layout { display: grid; grid-template-columns: 260px 1fr; gap: 28px; align-items: start; }
    .list { display: flex; flex-direction: column; border-top: 1px solid var(--line); position: sticky; top: 84px; }
    .list button { text-align: left; background: none; border: 0; border-bottom: 1px solid var(--line); padding: 12px 10px; cursor: pointer; display: flex; flex-direction: column; border-left: 3px solid transparent; }
    .list button:hover { background: var(--card); }
    .list button.on { border-left-color: var(--sindoor); background: var(--card); }
    .n { font-weight: 600; color: var(--ink); font-size: 1.05rem; }
    .n.sa { font-weight: 400; font-size: 1.12rem; }
    .d { color: var(--faint); font-size: var(--s-1); }
    @media (max-width: 820px) {
      .layout { grid-template-columns: 1fr; }
      .list { position: static; flex-direction: row; overflow-x: auto; border: 0; gap: 8px; padding-bottom: 4px; }
      .list button { border: 1.5px solid var(--line); border-radius: 999px; padding: 6px 14px; white-space: nowrap; flex: none; }
      .list button.on { border-color: var(--sindoor); }
      .d { display: none; }
    }
  `],
})
export class MantraPageComponent implements OnChanges {
  @Input() slug?: string;
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  private router = inject(Router);
  readonly mantras = signal<Mantra[]>([]);
  readonly selected = signal<Mantra | undefined>(undefined);

  constructor() {
    this.api.mantras().then(list => { this.mantras.set(list); this.select(); });
  }
  ngOnChanges() { this.select(); }

  private select() {
    const list = this.mantras();
    if (!list.length) return;
    this.selected.set(list.find(m => m.slug === this.slug) ?? list[0]);
  }

  pick(m: Mantra) { this.router.navigate(['/mantra', m.slug]); this.selected.set(m); }
}
