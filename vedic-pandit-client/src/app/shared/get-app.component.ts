import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import QRCode from 'qrcode';
import { APK_URL, WEBSITE_URL } from '../core/app-info';
import { I18nService } from '../core/services/i18n.service';
import { NativeService } from '../core/services/native.service';

/** "Get App" sheet: Android downloads the APK, iPhone gets Home Screen steps, desktop gets a QR to scan. */
@Component({
  selector: 'vp-get-app',
  standalone: true,
  template: `
  <div class="scrim" (click)="close.emit()"></div>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ga-h" (keydown.escape)="close.emit()" tabindex="-1">
    <header>
      <img class="icon" src="logo.svg" alt="" width="56" height="56">
      <div>
        <h2 id="ga-h">{{ i18n.t('appTitle') }}</h2>
        <p class="muted">{{ i18n.t('appSub') }}</p>
      </div>
      <button type="button" class="x" (click)="close.emit()" [attr.aria-label]="i18n.t('closeChat')">✕</button>
    </header>

    @switch (native.platform) {
      @case ('ios') {
        <p>{{ i18n.t('appIos') }}</p>
        <ol class="steps">
          <li>{{ i18n.t('appIos1') }}</li>
          <li>{{ i18n.t('appIos2') }}</li>
          <li>{{ i18n.t('appIos3') }}</li>
        </ol>
      }
      @case ('desktop') {
        <div class="desk">
          <div class="qr">@if (qr()) { <img [src]="qr()" [alt]="i18n.t('appScan')" width="320" height="320"> }</div>
          <div>
            <p><b>{{ i18n.t('appScan') }}</b></p>
            <p class="muted">{{ i18n.t('appScanHint') }}</p>
            <a class="btn ghost" [href]="apk" rel="noopener">{{ i18n.t('appDownload') }}</a>
          </div>
        </div>
      }
      @default {
        <a class="btn big" [href]="apk" rel="noopener">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M17.6 9.48 19.44 6.3a.5.5 0 0 0-.87-.5l-1.87 3.23A11.4 11.4 0 0 0 12 8c-1.67 0-3.24.37-4.7 1.03L5.43 5.8a.5.5 0 0 0-.87.5L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52ZM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z"/></svg>
          {{ i18n.t('appDownload') }}
        </a>
        <ol class="steps">
          <li>{{ i18n.t('appStep1') }}</li>
          <li>{{ i18n.t('appStep2') }}</li>
          <li>{{ i18n.t('appStep3') }}</li>
        </ol>
      }
    }
    <p class="faint small">{{ i18n.t('appNote') }}</p>
  </div>`,
  styles: [`
    .scrim { position: fixed; inset: 0; background: rgba(29,23,54,.45); z-index: 70; }
    .sheet { position: fixed; z-index: 71; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(480px, calc(100vw - 32px));
             max-height: calc(100dvh - 32px); overflow: auto; background: var(--paper); border-radius: var(--r-lg); padding: 22px;
             box-shadow: 0 24px 60px rgba(29,23,54,.35); animation: pop .18s ease-out; }
    header { display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: center; margin-bottom: 16px; }
    .icon { width: 56px; height: 56px; border-radius: 14px; background: var(--ink); padding: 3px; }
    h2 { margin: 0; font-size: var(--s1); }
    header p { margin: 2px 0 0; font-size: var(--s-1); }
    .x { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #EAE6F2; cursor: pointer; color: var(--ink); align-self: start; }
    .big { width: 100%; min-height: 54px; font-size: 1.1rem; text-decoration: none; }
    .steps { margin: 16px 0 0; padding-left: 22px; display: grid; gap: 6px; }
    .desk { display: grid; grid-template-columns: 160px 1fr; gap: 18px; align-items: center; }
    .qr { background: #fff; padding: 10px; border-radius: var(--r-md); border: 1px solid var(--line); }
    .qr img { width: 100%; height: auto; display: block; }
    .desk .btn { text-decoration: none; }
    .small { margin: 16px 0 0; font-size: var(--s-1); }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -46%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    @media (max-width: 860px) {
      .sheet { top: auto; bottom: 0; left: 0; transform: none; width: 100%; max-height: 90dvh; border-radius: var(--r-lg) var(--r-lg) 0 0;
               padding: 22px max(18px, env(safe-area-inset-right, 0px)) calc(22px + env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px));
               animation: up .22s ease-out; }
      .desk { grid-template-columns: 1fr; }
      @keyframes up { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
    }
  `],
})
export class GetAppComponent {
  @Output() close = new EventEmitter<void>();
  readonly i18n = inject(I18nService);
  readonly native = inject(NativeService);
  readonly apk = APK_URL;
  readonly site = WEBSITE_URL;
  readonly qr = signal('');

  constructor() {
    QRCode.toDataURL(APK_URL, { margin: 0, width: 320, color: { dark: '#1D1736', light: '#FFFFFF' } })
      .then(s => this.qr.set(s)).catch(() => undefined);
  }
}
