import { Component, inject } from '@angular/core';
import { I18nService } from '../../core/services/i18n.service';
import { PanditJiService } from '../../core/services/panditji.service';
import { ChatPanelComponent } from '../../shared/chat-panel.component';

@Component({
  selector: 'vp-chat-page',
  standalone: true,
  imports: [ChatPanelComponent],
  template: `
  <div class="wrap page chat-page">
    <header class="head">
      <h1 class="sa">{{ i18n.t('panditji') }}</h1>
      @if (bot.messages().length) { <button type="button" class="btn ghost" (click)="bot.clear()">{{ i18n.t('restart') }}</button> }
    </header>
    <vp-chat-panel [full]="true" />
  </div>`,
  styles: [`
    .chat-page { display: flex; flex-direction: column; height: calc(100dvh - 64px); padding-bottom: 16px; max-width: 900px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    h1 { font-weight: 400; margin: 0 0 8px; }
    vp-chat-panel { flex: 1; min-height: 0; }
    @media (max-width: 1024px) {
      .chat-page { height: calc(100dvh - 108px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); padding-top: 12px; padding-bottom: 8px; }
      h1 { font-size: var(--s2); }
    }
  `],
})
export class ChatPageComponent {
  readonly i18n = inject(I18nService);
  readonly bot = inject(PanditJiService);
}
