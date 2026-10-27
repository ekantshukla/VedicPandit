import { Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/services/i18n.service';
import { LocationService } from '../core/services/location.service';
import { dailyRashifal, monthlyRashifal, moonOverall, RASHIS, stars, weeklyRashifal } from '../core/astro/rashifal';
import { DayPipe } from './time.pipe';
import { COLOUR_HEX, pick, saveRashi } from './rashifal-util';

export interface RashifalCardData { rashi: number; date: string; period?: 'day' | 'week' | 'month'; }

/** Compact rashifal shown inside a PanditJi chat answer. */
@Component({
  selector: 'vp-rashifal-card',
  standalone: true,
  imports: [RouterLink, DayPipe],
  template: `
  @let R = rashis[data().rashi];
  <div class="rc">
    <header>
      <span class="sym" aria-hidden="true">{{ R.sym }}</span>
      <b>{{ hi() ? R.hi : R.en }}</b>
      @if (day(); as d) { <span class="st" [attr.aria-label]="d.score + '/5'">{{ star(d.score) }}</span> }
      @if (month(); as m) { <span class="st" [attr.aria-label]="m.score + '/5'">{{ star(m.score) }}</span> }
    </header>
    @if (day(); as d) {
      <p class="when">{{ d.date | day: i18n.lang() : 'short' }}</p>
      <p>{{ L(d.text.overall) }}</p>
      <p class="lk"><i class="sw" [style.background]="hex(d.luckyColour.en)"></i>{{ i18n.t('rfLuckyColour') }}: {{ L(d.luckyColour) }} · {{ i18n.t('rfLuckyNumber') }}: {{ d.luckyNumbers.join(', ') }}</p>
    }
    @if (week().length) {
      <ol class="wk">
        @for (w of week(); track w.date) { <li><span>{{ w.date | day: i18n.lang() : 'short' }}</span><span class="st">{{ star(w.score) }}</span></li> }
      </ol>
    }
    @if (month(); as m) { <p>{{ L(m.text) }}</p> }
    <a class="more" [routerLink]="['/rashifal']" [queryParams]="{ r: data().rashi, p: linkPeriod() }" (click)="remember()">{{ i18n.t('rfOpen') }} →</a>
  </div>`,
  styles: [`
    .rc header { display: flex; align-items: center; gap: 8px; }
    .sym { width: 32px; height: 32px; border-radius: 50%; background: var(--ink); color: var(--haldi); display: grid; place-items: center; font-size: 1.1rem; flex: none; }
    .rc b { font-size: 1.05rem; color: var(--ink); flex: 1; }
    .st { color: var(--haldi); letter-spacing: 1px; white-space: nowrap; }
    .when { color: var(--faint); font-size: var(--s-1); margin: 6px 0 2px; }
    .rc p { margin: 4px 0; }
    .lk { font-size: var(--s-1); color: var(--muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .sw { width: 12px; height: 12px; border-radius: 50%; border: 1px solid var(--line); display: inline-block; }
    .wk { list-style: none; margin: 8px 0; padding: 0; display: grid; gap: 2px; }
    .wk li { display: flex; justify-content: space-between; gap: 10px; font-size: var(--s-1); }
    .more { display: inline-block; margin-top: 6px; font-weight: 600; }
  `],
})
export class RashifalCardComponent {
  readonly i18n = inject(I18nService);
  private loc = inject(LocationService);
  readonly rashis = RASHIS;
  readonly data = signal<RashifalCardData>({ rashi: 0, date: '', period: 'day' });
  @Input({ required: true }) set payload(v: RashifalCardData) { this.data.set(v); }

  readonly hi = computed(() => this.i18n.prefersDevanagari());
  readonly day = computed(() => { const d = this.data(); return (d.period ?? 'day') === 'day' ? dailyRashifal(d.rashi, d.date, this.loc.place().tz) : null; });
  readonly week = computed(() => { const d = this.data(); return d.period === 'week' ? weeklyRashifal(d.rashi, d.date, this.loc.place().tz) : []; });
  readonly month = computed(() => { const d = this.data(); return d.period === 'month' ? monthlyRashifal(d.rashi, d.date, this.loc.place().tz) : null; });
  linkPeriod() { const d = this.data(); return d.period === 'week' ? 'week' : d.period === 'month' ? 'month' : 'today'; }

  L(x: { en: string; hi: string }) { return pick(x, this.hi()); }
  star(s: number) { return stars(s); }
  hex(c: string) { return COLOUR_HEX[c] ?? '#ccc'; }
  overall(h: number) { return this.L(moonOverall(h)); }
  remember() { saveRashi(this.data().rashi); }
}
