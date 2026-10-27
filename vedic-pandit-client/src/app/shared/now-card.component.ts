import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { elongation, findAngleCrossing, fromJd, moonSidereal, sunSidereal, toJd, yogaAngle } from '../core/astro/astro';
import { INAUSPICIOUS_YOGAS, NAKSHATRA, NAKSHATRA_SA, RASHI, RASHI_SA, TITHI, TITHI_SA, YOGA, YOGA_SA } from '../core/astro/names';
import { I18nService } from '../core/services/i18n.service';
import { LocationService } from '../core/services/location.service';

interface Limb { key: string; name: string; note: string; pct: number; ends: string; bad?: boolean; }

const NAK = 360 / 27;

/**
 * "Right now": the Moon's phase and how far the current tithi, nakshatra and yoga have run, with the moment
 * each one ends. Computed live in the browser with the same engine as the panchang.
 */
@Component({
  selector: 'vp-now-card',
  standalone: true,
  template: `
  <section class="now" [attr.aria-label]="i18n.t('rightNow')">
    <header>
      <h2>{{ i18n.t('rightNow') }}</h2>
      <span class="clock num">{{ clock() }}</span>
    </header>

    <div class="moon-row">
      <svg class="moon" viewBox="0 0 100 100" role="img" [attr.aria-label]="phaseLabel()">
        <circle cx="50" cy="50" r="40" fill="#2E2752"/>
        <path [attr.d]="litPath()" fill="#FBEFD2"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.25)"/>
      </svg>
      <div class="moon-t">
        <b>{{ phaseLabel() }}</b>
        <span>{{ i18n.f('pakshaDay', { n: '' + dayInPaksha(), p: pakshaName() }) }}</span>
        <span class="faint">{{ i18n.t('moonIn') }} {{ rashi(moon()) }} · {{ i18n.t('sunIn') }} {{ rashi(sun()) }}</span>
      </div>
    </div>

    <ul class="limbs">
      @for (l of limbs(); track l.key) {
        <li>
          <div class="lt">
            <span class="k">{{ i18n.t(l.key) }}</span>
            <span class="n" [class.sa]="i18n.lang() !== 'en'" [class.bad]="l.bad">{{ l.name }}</span>
            @if (l.note) { <span class="note">{{ l.note }}</span> }
          </div>
          <div class="bar" role="progressbar" [attr.aria-valuenow]="l.pct" aria-valuemin="0" aria-valuemax="100" [attr.aria-label]="i18n.t(l.key)">
            <i [style.width.%]="l.pct"></i>
          </div>
          <div class="lm num"><span>{{ l.pct }}%</span><span>{{ i18n.t('endsAt') }} {{ l.ends }}</span></div>
        </li>
      }
    </ul>
    <p class="cap">{{ i18n.t('nowCaption') }}</p>
  </section>`,
  styles: [`
    .now { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: var(--r-lg); padding: 18px 20px; color: #F6F4FA; }
    header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    h2 { margin: 0; font-size: 1rem; color: var(--haldi); letter-spacing: .04em; text-transform: uppercase; }
    .clock { font-size: 1.05rem; font-weight: 600; }
    .moon-row { display: flex; gap: 16px; align-items: center; margin-bottom: 14px; }
    .moon { width: 84px; height: 84px; flex: none; filter: drop-shadow(0 0 14px rgba(251,239,210,.25)); }
    .moon-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .moon-t b { font-size: 1.15rem; color: #fff; }
    .moon-t span { color: rgba(246,244,250,.82); font-size: .92rem; }
    .moon-t .faint { color: rgba(246,244,250,.6); font-size: .84rem; }
    .limbs { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
    .lt { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
    .k { font-size: .78rem; color: rgba(246,244,250,.6); text-transform: uppercase; letter-spacing: .05em; min-width: 5.2rem; }
    .n { font-size: 1.12rem; color: #fff; font-weight: 600; }
    .n.sa { font-weight: 400; font-size: 1.2rem; }
    .n.bad { color: #FFB4C1; }
    .note { font-size: .8rem; color: rgba(246,244,250,.6); }
    .bar { height: 8px; border-radius: 999px; background: rgba(255,255,255,.12); overflow: hidden; }
    .bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--haldi), #F6C860); }
    .lm { display: flex; justify-content: space-between; font-size: .8rem; color: rgba(246,244,250,.7); margin-top: 4px; }
    .cap { margin: 14px 0 0; font-size: .78rem; color: rgba(246,244,250,.55); max-width: none; }
  `],
})
export class NowCardComponent implements OnDestroy {
  readonly i18n = inject(I18nService);
  private loc = inject(LocationService);
  private readonly t = signal(Date.now());
  private timer = setInterval(() => this.t.set(Date.now()), 30000);

  private readonly jd = computed(() => toJd(this.t()));
  readonly sun = computed(() => sunSidereal(this.jd()));
  readonly moon = computed(() => moonSidereal(this.jd()));
  readonly elong = computed(() => elongation(this.jd()));
  readonly tithiNo = computed(() => Math.floor(this.elong() / 12) + 1);          // 1..30
  readonly dayInPaksha = computed(() => ((this.tithiNo() - 1) % 15) + 1);

  ngOnDestroy() { clearInterval(this.timer); }

  clock() { return this.fmt(this.t(), false); }

  pakshaName() {
    const shukla = this.tithiNo() <= 15;
    return this.i18n.prefersDevanagari() ? (shukla ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष') : (shukla ? 'Shukla Paksha' : 'Krishna Paksha');
  }

  phaseLabel() {
    const e = this.elong(), hi = this.i18n.prefersDevanagari();
    const lit = Math.round((1 - Math.cos(e * Math.PI / 180)) / 2 * 100);
    let name: string;
    if (e < 12) name = hi ? 'अमावस्या के बाद' : 'New moon just passed';
    else if (e > 348) name = hi ? 'अमावस्या निकट' : 'New moon near';
    else if (e >= 168 && e < 192) name = hi ? 'पूर्ण चंद्र' : 'Full moon';
    else if (e < 180) name = hi ? 'बढ़ता चंद्र' : 'Waxing moon';
    else name = hi ? 'घटता चंद्र' : 'Waning moon';
    return `${name} · ${lit}%`;
  }

  /** Lit part of the disc as seen from India (waxing: right side lit). */
  litPath() {
    const e = this.elong() * Math.PI / 180, r = 40, cx = 50, top = 10, bot = 90;
    const waxing = this.elong() < 180;
    const rx = Math.abs(Math.cos(e)) * r;
    const gibbous = Math.cos(e) < 0;
    const outer = waxing ? 1 : 0;
    const inner = waxing ? (gibbous ? 1 : 0) : (gibbous ? 0 : 1);
    return `M${cx} ${top} A${r} ${r} 0 0 ${outer} ${cx} ${bot} A${rx.toFixed(2)} ${r} 0 0 ${inner} ${cx} ${top}Z`;
  }

  rashi(lon: number) { const i = Math.floor(lon / 30) % 12; return this.i18n.sanskritName(RASHI_SA[i], RASHI[i]); }

  readonly limbs = computed<Limb[]>(() => {
    const jd = this.jd();
    const e = this.elong(), m = this.moon(), y = yogaAngle(jd);
    const tn = this.tithiNo();
    const ti = tn === 15 ? 14 : tn === 30 ? 15 : (tn - 1) % 15;
    const ni = Math.floor(m / NAK), yi = Math.floor(y / NAK);
    const pada = Math.floor((m % NAK) / (NAK / 4)) + 1;
    const end = (fn: (j: number) => number, target: number) => {
      const j = findAngleCrossing(fn, target % 360, jd, 2, 0.05);
      return j ? this.fmt(fromJd(j), true) : '—';
    };
    const hi = this.i18n.prefersDevanagari();
    return [
      { key: 'tithi', name: this.i18n.sanskritName(TITHI_SA[ti], TITHI[ti]), note: this.pakshaName(),
        pct: Math.floor((e % 12) / 12 * 100), ends: end(elongation, tn * 12) },
      { key: 'nakshatra', name: this.i18n.sanskritName(NAKSHATRA_SA[ni], NAKSHATRA[ni]), note: hi ? `${pada} पद` : `pada ${pada}`,
        pct: Math.floor((m % NAK) / NAK * 100), ends: end(moonSidereal, (ni + 1) * NAK) },
      { key: 'yoga', name: this.i18n.sanskritName(YOGA_SA[yi], YOGA[yi]), note: INAUSPICIOUS_YOGAS.has(yi + 1) ? this.i18n.t('avoid') : '',
        pct: Math.floor((y % NAK) / NAK * 100), ends: end(yogaAngle, (yi + 1) * NAK), bad: INAUSPICIOUS_YOGAS.has(yi + 1) },
    ];
  });

  /** Clock time in the chosen place's time zone, with the weekday when it isn't today. */
  private fmt(ms: number, withDay: boolean) {
    const tz = this.loc.place().tz;
    const lang = `${this.i18n.lang()}-IN`;
    try {
      const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }).format(ms);
      if (!withDay) return time;
      const day = (x: number) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(x);
      if (day(ms) === day(Date.now())) return time;
      const wd = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: tz }).format(ms);
      return `${wd} ${time}`;
    } catch { return new Date(ms).toISOString().slice(11, 16); }
  }
}
