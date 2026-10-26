import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { LocationService } from '../../core/services/location.service';
import { MuhuratEventInfo, MuhuratSearchResult } from '../../core/astro/models';
import { addDays, todayIn } from '../../core/astro/panchang-engine';
import { MuhuratListComponent } from '../../shared/muhurat-list.component';

@Component({
  selector: 'vp-muhurat-page',
  standalone: true,
  imports: [FormsModule, MuhuratListComponent],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('muhuratTitle') }}</h1>
      <p>{{ i18n.t('muhuratIntro') }}</p>
    </header>

    <form class="form panel" (ngSubmit)="search()">
      <div class="field ev">
        <label for="ev">{{ i18n.t('event') }}</label>
        <select id="ev" class="input" name="ev" [(ngModel)]="event">
          @for (e of events(); track e.id) { <option [value]="e.id">{{ i18n.prefersDevanagari() ? e.nameHi : e.name }}</option> }
        </select>
      </div>
      <div class="field">
        <label for="from">{{ i18n.t('from') }}</label>
        <input id="from" type="date" class="input" name="from" [(ngModel)]="from">
      </div>
      <div class="field">
        <label for="to">{{ i18n.t('to') }}</label>
        <input id="to" type="date" class="input" name="to" [(ngModel)]="to">
      </div>
      <button class="btn" type="submit" [disabled]="loading()">{{ loading() ? i18n.t('loading') : i18n.t('find') }}</button>
    </form>

    <p class="muted where">{{ i18n.t('location') }}: {{ loc.place().name }}</p>
    @if (result()) { <vp-muhurat-list [r]="result()" /> }
  </div>`,
  styles: [`
    .form { display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 14px; align-items: end; }
    .form > * { min-width: 0; }
    .form .input { min-width: 0; max-width: 100%; }
    @media (max-width: 420px) { .form { padding: 14px; gap: 10px; } }
    .where { margin: 16px 0 8px; font-size: var(--s-1); }
    @media (max-width: 760px) { .form { grid-template-columns: 1fr 1fr; } .ev { grid-column: 1 / -1; } .form .btn { grid-column: 1 / -1; } }
  `],
})
export class MuhuratPageComponent {
  readonly i18n = inject(I18nService);
  readonly loc = inject(LocationService);
  private api = inject(ApiService);
  readonly events = signal<MuhuratEventInfo[]>([]);
  readonly result = signal<MuhuratSearchResult | null>(null);
  readonly loading = signal(false);
  event = 'Vivah';
  from = todayIn(this.loc.place().tz);
  to = addDays(this.from, 90);

  constructor() {
    this.api.muhuratEvents().then(e => this.events.set(e));
    this.search();
  }

  async search() {
    if (this.to < this.from) [this.from, this.to] = [this.to, this.from];
    if (addDays(this.from, 180) < this.to) this.to = addDays(this.from, 180);
    this.loading.set(true);
    const p = this.loc.place();
    try { this.result.set(await this.api.muhurat(this.event, this.from, this.to, p.lat, p.lng, p.tz)); }
    finally { this.loading.set(false); }
  }
}
