import { Component, Input, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { PanchangElement, PanchangResult, TimeWindow } from '../core/astro/models';
import { I18nService } from '../core/services/i18n.service';
import { DayPipe, TimePipe } from './time.pipe';
import { deva } from '../core/astro/display';
import { TraditionService, forTradition, isFocus } from '../core/services/tradition.service';

@Component({
  selector: 'vp-panchang-view',
  standalone: true,
  imports: [TimePipe, DayPipe],
  template: `
  @if (p; as p) {
  <section class="pv" [class.compact]="compact">
    @if (compact) {
      <p class="when">{{ p.date | day: i18n.lang() }}</p>
    }
    @if (obsList(p).length) {
      <ul class="obs" [attr.aria-label]="i18n.t('observances')">
        @for (o of obsList(p); track o) { <li [class.focus]="focus(o)">{{ d(o) }}</li> }
      </ul>
    }

    <div class="limbs">
      @for (row of limbs(p); track row.key) {
        <div class="limb">
          <span class="lk">{{ i18n.t(row.key) }}</span>
          <div class="lv">
            @for (e of row.els; track $index; let first = $first) {
              <span class="el" [class.next]="!first">
                <span class="nm" [class.sa]="i18n.lang() !== 'en'">{{ name(e) }}</span>
                @if (e.ends) { <span class="upto num">{{ i18n.f('untilT', { t: (e.ends | hm: p.date) }) }}</span> }
                @if (first && e.extra && !compact) { <span class="faint pada">{{ d(e.extra) }}</span> }
              </span>
            }
          </div>
        </div>
      }
    </div>

    <div class="sun num">
      <span>{{ i18n.t('sunrise') }} <b>{{ p.sunrise | hm }}</b></span>
      <span>{{ i18n.t('sunset') }} <b>{{ p.sunset | hm }}</b></span>
    </div>

    <div class="kaal">
      <div>
        <h4 class="q-avoid">{{ i18n.t('inauspicious') }}</h4>
        @for (w of avoidWindows(p); track w.name) {
          <p class="win" [class.now]="isNow(w)"><span>{{ label(w.name) }}</span><span class="num">{{ w.start | hm }}–{{ w.end | hm }}</span></p>
        }
      </div>
      <div>
        <h4 class="q-good">{{ i18n.t('auspicious') }}</h4>
        @for (w of goodWindows(p); track w.name) {
          <p class="win" [class.now]="isNow(w)" [class.struck]="!!w.quality"><span>{{ label(w.name) }}</span><span class="num">{{ w.start | hm }}–{{ w.end | hm: p.date }}</span></p>
          @if (w.quality && !compact) { <p class="faint note">{{ w.quality }}</p> }
        }
      </div>
    </div>

    @if (!compact) {
      <h3 class="ch-h">{{ i18n.t('choghadiya') }}</h3>
      @for (band of [ {k: 'day', list: p.dayChoghadiya}, {k: 'night', list: p.nightChoghadiya} ]; track band.k) {
        <div class="band">
          <span class="bk">{{ i18n.t(band.k) }}</span>
          <ol class="chog">
            @for (c of band.list; track $index) {
              <li [class]="'c-' + (c.quality || '').toLowerCase()" [class.now]="isNow(c)" [title]="c.name + ' ' + (c.start | hm) + '–' + (c.end | hm)">
                <b>{{ d(c.name) }}</b><span class="num">{{ c.start | hm }}</span>
              </li>
            }
          </ol>
        </div>
      }

      <dl class="cal">
        <div><dt>{{ i18n.t('paksha') }}</dt><dd>{{ d(p.paksha) }}</dd></div>
        <div><dt>{{ i18n.t('masa') }}</dt><dd>{{ masaLabel(p) }} <span class="faint">({{ d(p.monthSystem) }})</span></dd></div>
        <div><dt>{{ i18n.t('samvat') }}</dt><dd class="num">{{ p.vikramSamvat }} <span class="faint">({{ dev() ? 'शक' : 'Shaka' }} {{ p.shakaSamvat }})</span></dd></div>
        <div><dt>{{ i18n.t('ritu') }}</dt><dd>{{ d(p.ritu) }}</dd></div>
        <div><dt>{{ i18n.t('ayana') }}</dt><dd>{{ d(p.ayana) }}</dd></div>
        <div><dt>{{ i18n.t('sunRashi') }}</dt><dd>{{ d(p.sunRashi) }}</dd></div>
        <div><dt>{{ i18n.t('moonRashi') }}</dt><dd>{{ d(p.moonRashi) }}</dd></div>
      </dl>
    }
  </section>
  }`,
  styles: [`
    .pv { display: grid; gap: 18px; }
    .pv.compact { gap: 12px; font-size: .95rem; }
    .when { margin: 0; font-weight: 600; color: var(--ink); }
    .obs { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .obs li { background: var(--haldi-soft); color: var(--ink); border-radius: 999px; padding: 3px 12px; font-weight: 600; font-size: var(--s-1); }
    .obs li.focus { background: var(--sindoor); color: #fff; }
    .limbs { display: grid; border-top: 1px solid var(--line); }
    .limb { display: grid; grid-template-columns: 7.5rem 1fr; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line); align-items: baseline; }
    .compact .limb { grid-template-columns: 6rem 1fr; padding: 6px 0; }
    .lk { color: var(--muted); font-weight: 500; }
    .lv { display: flex; flex-wrap: wrap; gap: 4px 18px; }
    .el { display: inline-flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
    .el.next { color: var(--muted); }
    .nm { font-weight: 600; font-size: 1.08rem; color: var(--ink); }
    .nm.sa { font-size: 1.18rem; font-weight: 400; }
    .el.next .nm { color: var(--muted); font-weight: 500; }
    .upto { color: var(--faint); font-size: var(--s-1); }
    .pada { font-size: var(--s-1); }
    .sun { display: flex; gap: 24px; color: var(--muted); }
    .sun b { color: var(--ink); }
    .kaal { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    h4 { margin: 0 0 6px; font-size: var(--s0); }
    .win { display: flex; justify-content: space-between; gap: 10px; margin: 0; padding: 5px 8px; border-radius: var(--r-sm); max-width: none; }
    .win.now { background: var(--haldi-soft); font-weight: 600; }
    .win.struck span:first-child { text-decoration: line-through; text-decoration-color: var(--faint); }
    .note { font-size: var(--s-1); margin: 0 8px 4px; }
    .ch-h { margin: 8px 0 0; }
    .band { display: grid; grid-template-columns: 3.5rem 1fr; gap: 10px; align-items: center; }
    .bk { color: var(--muted); font-size: var(--s-1); }
    .chog { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; }
    .chog li { padding: 6px 6px 5px; border-radius: 4px; font-size: .78rem; line-height: 1.25; display: flex; flex-direction: column; border-bottom: 3px solid transparent; }
    .chog b { font-weight: 600; }
    .c-good { background: var(--tulsi-soft); color: var(--tulsi); }
    .c-avoid { background: var(--sindoor-soft); color: var(--sindoor); }
    .c-neutral { background: #EEECF4; color: var(--muted); }
    .chog li.now { border-bottom-color: var(--haldi); box-shadow: inset 0 0 0 1.5px var(--haldi); }
    .cal { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px 24px; margin: 6px 0 0; }
    .cal dt { color: var(--muted); font-size: var(--s-1); }
    .cal dd { margin: 0; font-weight: 500; color: var(--ink); }
    @media (max-width: 720px) {
      .chog { grid-template-columns: repeat(4, 1fr); }
      .band { grid-template-columns: 1fr; gap: 4px; }
    }
    @media (max-width: 520px) { .kaal { grid-template-columns: 1fr; } .limb { grid-template-columns: 6rem 1fr; } }
  `],
})
export class PanchangViewComponent implements OnInit, OnDestroy {
  @Input() p?: PanchangResult | null;
  @Input() compact = false;
  readonly i18n = inject(I18nService);
  private trad = inject(TraditionService);
  obsList(p: PanchangResult) { return forTradition(p.observances, this.trad.tradition()); }
  focus(o: string) { return isFocus(o, this.trad.tradition()); }
  private readonly now = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() { this.timer = setInterval(() => this.now.set(Date.now()), 60000); }
  ngOnDestroy() { clearInterval(this.timer); }

  limbs(p: PanchangResult) {
    return [
      { key: 'tithi', els: p.tithis }, { key: 'nakshatra', els: p.nakshatras }, { key: 'yoga', els: p.yogas },
      { key: 'karana', els: p.karanas }, { key: 'vara', els: [p.vara] },
    ];
  }
  dev() { return this.i18n.prefersDevanagari(); }
  d(text: string | null | undefined) { return this.dev() ? deva(text) : (text ?? ''); }
  masaLabel(p: PanchangResult) {
    const adhik = p.isAdhikMasa ? (this.dev() ? 'अधिक ' : 'Adhik ') : '';
    return adhik + (this.dev() ? p.masaSanskrit : p.masa);
  }
  name(e: PanchangElement) { return this.i18n.sanskritName(e.nameSanskrit, e.name); }
  avoidWindows(p: PanchangResult) { return [p.rahuKaal, p.yamaganda, p.gulika].filter((w): w is TimeWindow => !!w); }
  goodWindows(p: PanchangResult) { return [p.brahmaMuhurat, p.abhijitMuhurat].filter((w): w is TimeWindow => !!w); }
  isNow(w: TimeWindow) { const n = this.now(); return Date.parse(w.start) <= n && n < Date.parse(w.end); }
  label(name: string) {
    const map: Record<string, string> = { 'Rahu Kaal': 'rahuKaal', 'Yamaganda': 'yamaganda', 'Gulika Kaal': 'gulika', 'Abhijit Muhurat': 'abhijit', 'Brahma Muhurat': 'brahma' };
    return map[name] ? this.i18n.t(map[name]) : name;
  }
}
