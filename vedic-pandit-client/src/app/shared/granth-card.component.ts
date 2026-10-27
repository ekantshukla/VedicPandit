import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../core/services/i18n.service';
import { GranthVerse } from '../core/services/granth-library';

export interface GranthCardData { code: string; name: string; nameDev: string; chapter: string; verse?: string; verses: GranthVerse[]; }

/** The passage AI PanditJi read from the library, with a link to read the whole chapter. */
@Component({
  selector: 'vp-granth-card',
  standalone: true,
  imports: [RouterLink],
  template: `
  @if (data) {
    <div class="gc">
      <p class="t"><b class="sa">{{ data.nameDev }}</b> · {{ data.name }} {{ data.chapter }}</p>
      @for (v of data.verses.slice(0, 3); track $index) {
        <p class="v sa" [class.hl]="v[0] === data.verse"><span class="n">{{ v[0] }}</span>{{ v[1] }}</p>
      }
      <a class="more" [routerLink]="['/granth', data.code]" [queryParams]="{ c: data.chapter, v: data.verse ?? null }">{{ i18n.t('libReadChapter') }} →</a>
    </div>
  }`,
  styles: [`
    .t { margin: 0 0 8px; color: var(--muted); font-size: .9rem; }
    .t b { color: var(--ink); font-weight: 400; font-size: 1.05rem; }
    .v { white-space: pre-line; margin: 0 0 8px; color: var(--ink); line-height: 1.65; padding-left: 8px; border-left: 3px solid var(--line); }
    .v.hl { border-left-color: var(--sindoor); }
    .n { font-family: var(--sans); font-size: .72rem; font-weight: 700; color: var(--faint); margin-right: 6px; }
    .more { font-weight: 600; }
  `],
})
export class GranthCardComponent {
  readonly i18n = inject(I18nService);
  @Input() data?: GranthCardData;
}
