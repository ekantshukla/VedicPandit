import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export type Platform = 'app' | 'android' | 'ios' | 'desktop';

/** Everything that differs between the website and the Android app. */
@Injectable({ providedIn: 'root' })
export class NativeService {
  /** True inside the Android app. */
  readonly isApp = Capacitor.isNativePlatform();

  readonly platform: Platform = this.detect();

  private detect(): Platform {
    if (this.isApp) return 'app';
    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 1)) return 'ios';
    return 'desktop';
  }

  /**
   * The phone's back button. `handler` returns true if it handled it (closed a panel, went back a page).
   * Otherwise the app goes to the background instead of closing.
   */
  onBack(handler: () => boolean): void {
    if (!this.isApp) return;
    App.addListener('backButton', () => { if (!handler()) App.minimizeApp().catch(() => undefined); }).catch(() => undefined);
  }
}
