import { Component, Input, OnChanges, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { elongation, moonSidereal, sunSidereal, toJd } from '../core/astro/astro';
import { NAKSHATRA, NAKSHATRA_SA, RASHI_SA, RASHI, tithiName } from '../core/astro/names';
import { I18nService } from '../core/services/i18n.service';

interface Seg { i: number; path: string; label: string; lx: number; ly: number; rot: number; active: boolean; }

/**
 * The sky as a panchang sees it: the 27 nakshatras around the ecliptic (sidereal, Lahiri), with the Sun and Moon
 * at their real positions right now. The arc from Sun to Moon is the elongation — every 12° is one tithi.
 */
@Component({
  selector: 'vp-sky-dial',
  standalone: true,
  template: `
  <figure class="dial" [attr.aria-label]="aria()">
    <svg viewBox="0 0 400 400" role="img">
      <defs>
        <radialGradient id="sky" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#3A2F6B"/><stop offset="100%" stop-color="#1D1736"/>
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#sky)"/>
      <!-- nakshatra ring -->
      @for (s of segs(); track s.i) {
        <path [attr.d]="s.path" [attr.fill]="s.active ? 'rgba(227,162,26,.28)' : (s.i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(255,255,255,.07)')" stroke="rgba(255,255,255,.12)" stroke-width=".6"/>
        <text [attr.x]="s.lx" [attr.y]="s.ly" [attr.transform]="'rotate(' + s.rot + ' ' + s.lx + ' ' + s.ly + ')'"
              text-anchor="middle" dominant-baseline="middle" class="nk" [class.on]="s.active">{{ s.label }}</text>
      }
      <!-- rashi boundaries -->
      @for (r of rashiTicks; track r) {
        <line [attr.x1]="pt(r, 128).x" [attr.y1]="pt(r, 128).y" [attr.x2]="pt(r, 150).x" [attr.y2]="pt(r, 150).y" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
      }
      <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,.18)"/>
      <!-- elongation arc: Sun -> Moon -->
      <path [attr.d]="arc()" fill="none" stroke="#E3A21A" stroke-width="6" stroke-linecap="round" opacity=".9"/>
      @for (k of tithiTicks(); track k) {
        <circle [attr.cx]="pt(k, 139).x" [attr.cy]="pt(k, 139).y" r="1.8" fill="#FBEFD2"/>
      }
      <!-- Sun -->
      <g [attr.transform]="'translate(' + pt(sun(), 139).x + ',' + pt(sun(), 139).y + ')'">
        <circle r="13" fill="#E3A21A"/>
        @for (a of rays; track a) { <line [attr.x1]="0" [attr.y1]="-16" [attr.x2]="0" [attr.y2]="-20" stroke="#E3A21A" stroke-width="2" [attr.transform]="'rotate(' + a + ')'"/> }
      </g>
      <!-- Moon with true phase -->
      <g [attr.transform]="'translate(' + pt(moon(), 139).x + ',' + pt(moon(), 139).y + ')'">
        <circle r="12" fill="#3A3360" stroke="#FBEFD2" stroke-width=".8"/>
        <path [attr.d]="phase()" fill="#FBEFD2"/>
      </g>
      <!-- centre -->
      <text x="200" y="150" text-anchor="middle" class="c-now">{{ i18n.t('now') }}</text>
      <text x="200" y="172" text-anchor="middle" class="c-small">{{ paksha() }}</text>
      <text x="200" y="208" text-anchor="middle" class="c-big">{{ tithiLabel() }}</text>
      <text x="200" y="238" text-anchor="middle" class="c-small">{{ elong().toFixed(1) }}°</text>
    </svg>
    <figcaption>{{ i18n.t('skyCaption') }}
      <span class="legend">{{ i18n.t('moonIn') }} {{ moonPlace() }} &nbsp;/&nbsp; {{ i18n.t('sunIn') }} {{ sunPlace() }}</span>
    </figcaption>
  </figure>`,
  styles: [`
    .dial { margin: 0; }
    svg { width: 100%; height: auto; display: block; max-width: 460px; margin: 0 auto; }
    .nk { fill: rgba(246,244,250,.66); font-size: 10px; font-family: var(--sanskrit); }
    .nk.on { fill: #FBEFD2; font-weight: 700; }
    .c-big { fill: #fff; font-family: var(--sanskrit); font-size: 30px; }
    .c-now { fill: #E3A21A; font-size: 12px; font-weight: 600; font-family: var(--sans); }
    .c-small { fill: rgba(246,244,250,.72); font-size: 13px; font-family: var(--sans); }
    figcaption { color: var(--muted); font-size: var(--s-1); text-align: center; margin-top: 12px; max-width: 46ch; margin-inline: auto; }
    .legend { display: block; color: var(--ink); font-weight: 500; margin-top: 2px; }
  `],
})
export class SkyDialComponent implements OnInit, OnChanges, OnDestroy {
  @Input() at?: number; // epoch ms; defaults to now and ticks every minute
  readonly i18n = inject(I18nService);

  readonly sun = signal(0);
  readonly moon = signal(0);
  readonly elong = signal(0);
  readonly segs = signal<Seg[]>([]);
  readonly rashiTicks = Array.from({ length: 12 }, (_, i) => i * 30);
  readonly rays = [0, 45, 90, 135, 180, 225, 270, 315];
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit() { this.update(); if (this.at === undefined) this.timer = setInterval(() => this.update(), 60000); }
  ngOnChanges() { this.update(); }
  ngOnDestroy() { clearInterval(this.timer); }

  /** 0° (start of Ashwini) at the top, increasing clockwise. */
  pt(deg: number, r: number) {
    const a = (deg - 90) * Math.PI / 180;
    return { x: 200 + r * Math.cos(a), y: 200 + r * Math.sin(a) };
  }

  private update() {
    const jd = toJd(this.at ?? Date.now());
    const s = sunSidereal(jd), m = moonSidereal(jd);
    this.sun.set(s); this.moon.set(m); this.elong.set(elongation(jd));
    const active = Math.floor(m / (360 / 27));
    const dev = this.i18n.prefersDevanagari();
    const span = 360 / 27;
    this.segs.set(NAKSHATRA.map((n, i) => {
      const a0 = i * span, a1 = a0 + span;
      const o0 = this.pt(a0, 196), o1 = this.pt(a1, 196), i1 = this.pt(a1, 152), i0 = this.pt(a0, 152);
      const mid = a0 + span / 2, lp = this.pt(mid, 174);
      let rot = mid;
      if (mid > 90 && mid < 270) rot += 180; // keep labels upright
      return {
        i, active: i === active,
        path: `M${o0.x},${o0.y} A196,196 0 0 1 ${o1.x},${o1.y} L${i1.x},${i1.y} A152,152 0 0 0 ${i0.x},${i0.y} Z`,
        label: dev ? this.shortSa(NAKSHATRA_SA[i]) : this.short(n), lx: lp.x, ly: lp.y, rot,
      };
    }));
  }

  private shortSa(n: string) { return n.replace('पूर्वाफाल्गुनी', 'पू.फा.').replace('उत्तराफाल्गुनी', 'उ.फा.').replace('पूर्वाषाढा', 'पू.षा.').replace('उत्तराषाढा', 'उ.षा.').replace('पूर्वाभाद्रपदा', 'पू.भा.').replace('उत्तराभाद्रपदा', 'उ.भा.'); }
  private short(n: string) { return n.replace('Purva ', 'P. ').replace('Uttara ', 'U. ').replace('Bhadrapada', 'Bhadra').replace('Phalguni', 'Phal.').replace('Shatabhisha', 'Shatabh.'); }

  arc(): string {
    const s = this.sun(), e = this.elong();
    if (e < 0.5) return '';
    const p0 = this.pt(s, 139), p1 = this.pt(s + e, 139);
    return `M${p0.x},${p0.y} A139,139 0 ${e > 180 ? 1 : 0} 1 ${p1.x},${p1.y}`;
  }
  tithiTicks(): number[] { const out: number[] = []; for (let k = 12; k < this.elong(); k += 12) out.push(this.sun() + k); return out; }

  phase(): string {
    const e = this.elong() * Math.PI / 180, r = 12;
    const rx = Math.abs(Math.cos(e)) * r;
    const waxing = this.elong() < 180;
    const gibbous = Math.cos(e) < 0;
    if (waxing) return `M0,${-r} A${r},${r} 0 0 1 0,${r} A${rx},${r} 0 0 ${gibbous ? 1 : 0} 0,${-r} Z`;
    return `M0,${-r} A${r},${r} 0 0 0 0,${r} A${rx},${r} 0 0 ${gibbous ? 0 : 1} 0,${-r} Z`;
  }

  tithiNo() { return Math.floor(this.elong() / 12) + 1; }
  tithiLabel() { const [n, sa] = tithiName(this.tithiNo()); const name = this.i18n.prefersDevanagari() ? sa : n; return name.replace(/^(Shukla|Krishna|शुक्ल|कृष्ण) /, ''); }
  paksha() { const sh = this.tithiNo() <= 15; return this.i18n.prefersDevanagari() ? (sh ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष') : (sh ? 'Shukla Paksha' : 'Krishna Paksha'); }
  pct() { return Math.floor(((this.elong() % 12) / 12) * 100); }
  moonPlace() { const i = Math.floor(this.moon() / (360 / 27)); return this.i18n.prefersDevanagari() ? NAKSHATRA_SA[i] : NAKSHATRA[i]; }
  sunPlace() { const i = Math.floor(this.sun() / 30); return this.i18n.prefersDevanagari() ? RASHI_SA[i] : RASHI[i]; }
  aria() { return `Moon in ${this.moonPlace()}, Sun in ${this.sunPlace()}, elongation ${this.elong().toFixed(0)} degrees`; }
}
