import { Component, computed, inject, signal } from '@angular/core';
import { Place } from '../core/astro/models';
import { I18nService } from '../core/services/i18n.service';
import { LocationService, STATES, StateInfo, TIRTHS, WORLD, districtPlace } from '../core/services/location.service';

/** Header chip showing the current place; opens a sheet to choose State → District, a tirth, or a city abroad. */
@Component({
  selector: 'vp-place-picker',
  standalone: true,
  template: `
  <button type="button" class="hdr-select hdr-chip" (click)="openSheet()" [attr.aria-label]="i18n.t('location') + ': ' + label()" aria-haspopup="dialog">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>
    <span class="t">{{ label() }}</span>
  </button>

  @if (open()) {
    <div class="scrim" (click)="open.set(false)"></div>
    <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('pickLocation')" (keydown.escape)="open.set(false)">
      <header>
        <h2>{{ i18n.t('pickLocation') }}</h2>
        <button type="button" class="x" (click)="open.set(false)" [attr.aria-label]="i18n.t('closeChat')">✕</button>
      </header>

      <div class="seg" role="tablist">
        <button type="button" role="tab" [attr.aria-selected]="tab() === 'in'" [class.on]="tab() === 'in'" (click)="tab.set('in')">{{ i18n.t('inIndia') }}</button>
        <button type="button" role="tab" [attr.aria-selected]="tab() === 'out'" [class.on]="tab() === 'out'" (click)="tab.set('out')">{{ i18n.t('outsideIndia') }}</button>
      </div>

      @if (tab() === 'in') {
        <label class="field">
          <span>{{ i18n.t('state') }}</span>
          <select class="input" (change)="pickState($any($event.target).value)">
            <option value="" [selected]="!stateName()">{{ i18n.t('chooseState') }}</option>
            @for (s of states; track s.n) { <option [value]="s.n" [selected]="s.n === stateName()">{{ hi() ? s.h : s.n }}</option> }
          </select>
        </label>
        <label class="field">
          <span>{{ i18n.t('district') }}</span>
          <select class="input" [disabled]="!state()" (change)="pickDistrict($any($event.target).value)">
            <option value="">{{ i18n.t('chooseDistrict') }}</option>
            @for (d of state()?.d ?? []; track d[0]) { <option [value]="d[0]" [selected]="d[0] === loc.place().district && !isTirth()">{{ d[0] }}</option> }
          </select>
        </label>

        <p class="sub">{{ i18n.t('tirths') }}</p>
        <div class="chips">
          @for (p of tirths; track p.name) {
            <button type="button" class="chip" [class.on]="p.name === loc.place().name" (click)="choose(p)">{{ hi() ? p.nameHi : p.name }}</button>
          }
        </div>
      } @else {
        <div class="world">
          @for (p of world; track p.name) {
            <button type="button" class="chip" [class.on]="p.name === loc.place().name" (click)="choose(p)">{{ hi() ? p.nameHi : p.name }}</button>
          }
        </div>
      }
      <p class="foot">{{ i18n.t('locNote') }}</p>
    </div>
  }`,
  styles: [`
    :host { display: block; min-width: 0; }
    .hdr-chip { max-width: 190px; }
    .scrim { position: fixed; inset: 0; background: rgba(29,23,54,.42); z-index: 70; }
    .sheet { position: fixed; z-index: 71; background: var(--paper); color: var(--text); display: flex; flex-direction: column; gap: 12px;
      left: 50%; top: 84px; transform: translateX(-50%); width: min(460px, calc(100vw - 24px)); max-height: calc(100vh - 110px); overflow: auto;
      border-radius: var(--r-lg); padding: 18px 18px 16px; box-shadow: 0 18px 50px rgba(29,23,54,.35); }
    header { display: flex; align-items: center; justify-content: space-between; }
    h2 { margin: 0; font-size: var(--s1); color: var(--ink); }
    .x { width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--card); cursor: pointer; color: var(--muted); }
    .seg { display: grid; grid-template-columns: 1fr 1fr; background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 3px; }
    .seg button { border: 0; background: none; border-radius: 999px; padding: 8px; font: inherit; font-weight: 600; color: var(--muted); cursor: pointer; }
    .seg button.on { background: var(--ink); color: #fff; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field span { font-size: var(--s-1); color: var(--muted); font-weight: 600; }
    .sub { margin: 4px 0 0; font-size: var(--s-1); color: var(--muted); font-weight: 600; }
    .chips, .world { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip { border: 1.5px solid var(--line); background: var(--card); color: var(--ink); border-radius: 999px; padding: 6px 12px; font: inherit; font-size: .9rem; cursor: pointer; }
    .chip:hover { border-color: var(--ink); }
    .chip.on { border-color: var(--sindoor); background: var(--sindoor); color: #fff; }
    .foot { margin: 4px 0 0; font-size: .78rem; color: var(--faint); }
    @media (max-width: 1024px) {
      .hdr-chip { max-width: 100%; }
      .sheet { left: 0; right: 0; bottom: 0; top: auto; transform: none; width: auto; max-height: 88vh; border-radius: var(--r-lg) var(--r-lg) 0 0;
        padding-bottom: calc(18px + env(safe-area-inset-bottom, 0px)); animation: up .2s ease-out; }
    }
    @keyframes up { from { transform: translateY(30px); opacity: 0; } to { transform: none; opacity: 1; } }
  `],
})
export class PlacePickerComponent {
  readonly i18n = inject(I18nService);
  readonly loc = inject(LocationService);
  readonly states = STATES;
  readonly tirths = TIRTHS;
  readonly world = WORLD;
  readonly open = signal(false);
  readonly tab = signal<'in' | 'out'>('in');
  readonly stateName = signal<string>('');
  readonly state = computed<StateInfo | undefined>(() => STATES.find(s => s.n === this.stateName()));
  readonly hi = computed(() => this.i18n.prefersDevanagari());

  readonly label = computed(() => {
    const p = this.loc.place();
    if (this.hi() && p.nameHi) return p.nameHi;
    return p.name;
  });

  isTirth() { return TIRTHS.some(t => t.name === this.loc.place().name); }

  openSheet() {
    const p = this.loc.place();
    this.tab.set(p.tz === 'Asia/Kolkata' || p.state ? 'in' : 'out');
    this.stateName.set(p.state ?? '');
    this.open.set(true);
  }

  pickState(name: string) { this.stateName.set(name); }

  pickDistrict(name: string) {
    const s = this.state();
    const d = s?.d.find(x => x[0] === name);
    if (s && d) this.choose(districtPlace(s, d));
  }

  choose(p: Place) { this.loc.set(p); this.open.set(false); }
}
