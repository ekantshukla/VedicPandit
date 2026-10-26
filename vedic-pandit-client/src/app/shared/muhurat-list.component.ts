import { Component, Input, inject } from '@angular/core';
import { MuhuratSearchResult } from '../core/astro/models';
import { I18nService } from '../core/services/i18n.service';
import { DayPipe, TimePipe } from './time.pipe';

@Component({
  selector: 'vp-muhurat-list',
  standalone: true,
  imports: [TimePipe, DayPipe],
  template: `
  @if (r; as r) {
    @if (r.notes.length && !compact) { <p class="notes muted">{{ r.notes.join('. ') }}.</p> }
    @if (!r.windows.length) { <p class="empty">{{ i18n.t('noResults') }}</p> }
    <ol class="list">
      @for (w of (compact ? r.windows.slice(0, 4) : r.windows); track $index) {
        <li class="row">
          <div class="when">
            <span class="d">{{ w.date | day: i18n.lang() : 'short' }}</span>
            <span class="t num">{{ w.start | hm }}–{{ w.end | hm: w.date }}</span>
          </div>
          <div class="what">
            <span>{{ w.nakshatra }}, {{ w.tithi }}</span>
            @if (!compact) {
              <details>
                <summary>{{ i18n.t('why') }}</summary>
                <ul>@for (x of w.reasons; track x) { <li>{{ x }}</li> }</ul>
              </details>
            }
          </div>
          <meter class="score" min="0" max="100" low="55" high="75" optimum="100" [value]="w.score" [attr.aria-label]="i18n.t('score') + ' ' + w.score"></meter>
        </li>
      }
    </ol>
    <p class="disc faint">{{ r.disclaimer }}</p>
  }`,
  styles: [`
    .list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
    .row { display: grid; grid-template-columns: 11rem 1fr 80px; gap: 14px; align-items: start; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .when { display: flex; flex-direction: column; }
    .d { font-weight: 600; color: var(--ink); }
    .t { color: var(--tulsi); font-weight: 600; }
    .what { color: var(--muted); }
    details { margin-top: 4px; font-size: var(--s-1); }
    summary { cursor: pointer; color: var(--ink); }
    details ul { margin: 6px 0 0; padding-left: 18px; }
    .score { width: 80px; height: 10px; margin-top: 8px; }
    .notes, .disc { font-size: var(--s-1); }
    .disc { margin-top: 12px; }
    .empty { padding: 16px; background: var(--haldi-soft); border-radius: var(--r-sm); }
    @media (max-width: 560px) { .row { grid-template-columns: 1fr; gap: 4px; } }
  `],
})
export class MuhuratListComponent {
  @Input() r?: MuhuratSearchResult | null;
  @Input() compact = false;
  readonly i18n = inject(I18nService);
}
