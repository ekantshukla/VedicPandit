import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { LocationService } from '../../core/services/location.service';
import { MonthSystem, PanchangResult } from '../../core/astro/models';
import { addDays, todayIn } from '../../core/astro/panchang-engine';
import { PanchangViewComponent } from '../../shared/panchang-view.component';
import { DayPipe } from '../../shared/time.pipe';

@Component({
  selector: 'vp-panchang-page',
  standalone: true,
  imports: [FormsModule, PanchangViewComponent, DayPipe],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('nav.panchang') }}</h1>
      <p>{{ date() | day: i18n.lang() }}, {{ loc.place().name }}</p>
    </header>

    <div class="tools">
      <div class="nav-days">
        <button class="btn ghost" type="button" (click)="shift(-1)" [attr.aria-label]="i18n.t('prevDay')">‹</button>
        <label class="sr-only" for="pdate">{{ i18n.t('date') }}</label>
        <input id="pdate" type="date" class="input" [ngModel]="date()" (ngModelChange)="date.set($event)">
        <button class="btn ghost" type="button" (click)="shift(1)" [attr.aria-label]="i18n.t('nextDayBtn')">›</button>
        <button class="btn quiet" type="button" (click)="date.set(today())">{{ i18n.t('todayBtn') }}</button>
      </div>
      <fieldset class="ms">
        <legend class="sr-only">{{ i18n.t('monthSystem') }}</legend>
        @for (m of systems; track m) {
          <label [class.on]="system() === m"><input type="radio" name="ms" [value]="m" [ngModel]="system()" (ngModelChange)="system.set($event)">{{ i18n.t(m.toLowerCase()) }}</label>
        }
      </fieldset>
    </div>

    @if (error()) { <p class="err">{{ i18n.t('error') }}</p> }
    <div class="panel" [class.loading]="loading()">
      <vp-panchang-view [p]="p()" />
    </div>
    <p class="faint note">Lahiri ayanamsa {{ p()?.ayanamsa?.toFixed(4) }}°</p>
  </div>`,
  styles: [`
    .tools { display: flex; flex-wrap: wrap; gap: 16px; justify-content: space-between; align-items: center; margin-bottom: 18px; }
    .nav-days { display: flex; gap: 8px; align-items: center; }
    .nav-days .ghost { width: 44px; padding: 0; font-size: 1.4rem; }
    .nav-days input { width: auto; }
    .ms { border: 0; padding: 4px; margin: 0; display: flex; background: #EAE6F2; border-radius: 999px; }
    .ms label { padding: 8px 14px; border-radius: 999px; cursor: pointer; color: var(--muted); font-weight: 500; }
    .ms label.on { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(29,23,54,.12); }
    .ms input { position: absolute; opacity: 0; pointer-events: none; }
    .ms label:has(input:focus-visible) { outline: 3px solid var(--haldi); }
    .panel.loading { opacity: .55; transition: opacity .2s; }
    .note { margin-top: 14px; font-size: var(--s-1); }
    .err { color: var(--sindoor); }
  `],
})
export class PanchangPageComponent {
  readonly i18n = inject(I18nService);
  readonly loc = inject(LocationService);
  private api = inject(ApiService);
  readonly systems: MonthSystem[] = ['Purnimanta', 'Amanta'];
  readonly today = () => todayIn(this.loc.place().tz);
  readonly date = signal(this.today());
  readonly system = signal<MonthSystem>('Purnimanta');
  readonly p = signal<PanchangResult | null>(null);
  readonly loading = signal(false);
  readonly error = signal(false);

  constructor() {
    effect(() => {
      const d = this.date(), place = this.loc.place(), sys = this.system();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      this.loading.set(true);
      this.error.set(false);
      this.api.panchang(d, place.lat, place.lng, place.tz, sys)
        .then(r => this.p.set(r))
        .catch(() => this.error.set(true))
        .finally(() => this.loading.set(false));
    });
  }

  shift(n: number) { this.date.set(addDays(this.date(), n)); }
}
