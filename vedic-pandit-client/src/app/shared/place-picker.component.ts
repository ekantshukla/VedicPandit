import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../core/services/i18n.service';
import { LocationService, PLACES } from '../core/services/location.service';

@Component({
  selector: 'vp-place-picker',
  standalone: true,
  template: `
  <div class="pp">
    <label class="sr-only" for="place">{{ i18n.t('location') }}</label>
    <select id="place" class="hdr-select pp-select" (change)="pick($any($event.target).value)">
      @if (custom()) { <option value="__custom" selected>{{ loc.place().name }}</option> }
      @for (p of places; track p.name) {
        <option [value]="p.name" [selected]="p.name === loc.place().name">{{ i18n.prefersDevanagari() && p.nameHi ? p.nameHi : p.name }}</option>
      }
    </select>
    <button type="button" class="hdr-icon" (click)="gps()" [attr.aria-label]="i18n.t('useMyLocation')" [title]="i18n.t('useMyLocation')" [class.busy]="busy()">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 3h-2.07A7 7 0 0 0 13 5.07V3h-2v2.07A7 7 0 0 0 5.07 11H3v2h2.07A7 7 0 0 0 11 18.93V21h2v-2.07A7 7 0 0 0 18.93 13H21v-2Zm-9 6a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z"/></svg>
    </button>
  </div>`,
  styles: [`
    :host { display: block; min-width: 0; }
    .pp { display: flex; gap: 6px; align-items: center; min-width: 0; }
    .pp-select { flex: 1; min-width: 0; max-width: 180px; }
    @media (max-width: 1024px) { .pp-select { max-width: none; width: 100%; } }
  `],
})
export class PlacePickerComponent {
  readonly i18n = inject(I18nService);
  readonly loc = inject(LocationService);
  readonly places = PLACES;
  readonly busy = signal(false);
  custom() { return !PLACES.some(p => p.name === this.loc.place().name); }
  pick(name: string) { const p = PLACES.find(x => x.name === name); if (p) this.loc.set(p); }
  async gps() {
    this.busy.set(true);
    try { await this.loc.useDevice(); } catch { /* permission denied: keep current */ }
    this.busy.set(false);
  }
}
