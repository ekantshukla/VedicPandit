import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { I18nService, LANGS } from './core/services/i18n.service';
import { ApiService } from './core/services/api.service';
import { PlacePickerComponent } from './shared/place-picker.component';
import { ChatPanelComponent } from './shared/chat-panel.component';
import { GetAppComponent } from './shared/get-app.component';
import { NativeService } from './core/services/native.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlacePickerComponent, ChatPanelComponent, GetAppComponent],
  template: `
  <a class="skip" href="#main">Skip to content</a>
  <header class="top">
    <div class="wrap bar">
      <a routerLink="/" class="brand" aria-label="Vedic Pandit home">
        <span class="mark sa">वैदिक पंडित</span>
        <span class="latin">Vedic Pandit<span class="by">&nbsp;by&nbsp;</span><span class="sig">Ekant Shukla</span></span>
      </a>
      <nav class="desk" aria-label="Main">
        <a routerLink="/panchang" routerLinkActive="on">{{ i18n.t('nav.panchang') }}</a>
        <a routerLink="/muhurat" routerLinkActive="on">{{ i18n.t('nav.muhurat') }}</a>
        <a routerLink="/mantra" routerLinkActive="on">{{ i18n.t('nav.mantra') }}</a>
        <a routerLink="/granth" routerLinkActive="on">{{ i18n.t('nav.granth') }}</a>
      </nav>
      <div class="prefs">
        <label class="sr-only" for="lang">Language</label>
        <select id="lang" class="hdr-select lang" (change)="i18n.set($any($event.target).value)">
          @for (l of langs; track l.code) { <option [value]="l.code" [selected]="l.code === i18n.lang()">{{ l.label }}</option> }
        </select>
        <vp-place-picker />
      </div>
      <div class="acts">
        <a routerLink="/dakshina" routerLinkActive="on" class="dak">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.6 2.2 2.4 3.9 2.4 5.2A2.4 2.4 0 0 1 12 10.6a2.4 2.4 0 0 1-2.4-2.4C9.6 6.9 10.4 5.2 12 3Z"/><path d="M3 14h18c-.6 3.6-4.2 6-9 6s-8.4-2.4-9-6Z"/><path d="M12 10.6V14"/></svg>
          <span>{{ i18n.t('nav.dakshina') }}</span>
        </a>
        @if (!native.isApp) {
          <button type="button" class="get" (click)="getApp.set(true)" [attr.aria-label]="i18n.t('getApp')" [title]="i18n.t('appTitle')">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7M9 11.5l3 3 3-3M10.5 18.5h3"/></svg>
            <span>{{ i18n.t('getApp') }}</span>
          </button>
        }
      </div>
    </div>
  </header>

  @if (showStrip()) {
    <aside class="strip" aria-label="App">
      <span class="sicon sa" aria-hidden="true">ॐ</span>
      <span class="stext"><b>{{ i18n.t('appTitle') }}</b><small>{{ i18n.t('appSub') }}</small></span>
      <button type="button" class="btn sget" (click)="getApp.set(true)">{{ i18n.t('getApp') }}</button>
      <button type="button" class="sx" (click)="dismissStrip()" [attr.aria-label]="i18n.t('closeChat')">✕</button>
    </aside>
  }
  <main id="main"><router-outlet /></main>

  <footer class="foot">
    <div class="wrap">
      <p class="note">{{ i18n.t('disclaimer') }}</p>
      @if (api.online() === false) { <p class="note faint">{{ i18n.t('offline') }}</p> }
      <nav class="foot-links" aria-label="More">
        <a routerLink="/dakshina">{{ i18n.t('nav.dakshina') }}</a>
        @if (!native.isApp) { <button type="button" (click)="getApp.set(true)">{{ i18n.t('appTitle') }}</button> }
      </nav>
      <div class="sign">
        <p class="copy"><span class="nw">© {{ year }} Vedic Pandit. All rights reserved.</span>&ngsp;<span class="nw">Sacred texts belong to all.</span></p>
        <p class="credit"><span class="nw">Crafted with devotion by&nbsp;<a href="https://ekantshukla.github.io" target="_blank" rel="noopener" class="sig">Ekant Shukla</a></span>&ngsp;<span class="nw">in Bengaluru, India</span></p>
      </div>
    </div>
  </footer>

  <!-- Mobile: bottom tab bar replaces the top nav and the floating button -->
  <nav class="tabbar" aria-label="Main">
    <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>
      <span>{{ i18n.t('today') }}</span>
    </a>
    <a routerLink="/panchang" routerLinkActive="on">
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>
      <span>{{ i18n.t('nav.panchang') }}</span>
    </a>
    <a routerLink="/muhurat" routerLinkActive="on">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>
      <span>{{ i18n.t('nav.muhurat') }}</span>
    </a>
    <a routerLink="/mantra" routerLinkActive="on">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>
      <span>{{ i18n.t('nav.mantra') }}</span>
    </a>
    <a routerLink="/granth" routerLinkActive="on">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5zM4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>
      <span>{{ i18n.t('nav.granth') }}</span>
    </a>
    <a routerLink="/ask" routerLinkActive="on" class="om-tab">
      <span class="om sa" aria-hidden="true">ॐ</span>
      <span>{{ i18n.t('panditji') }}</span>
    </a>
  </nav>

  @if (!onAsk()) {
    <button type="button" class="fab" (click)="drawer.set(true)" [attr.aria-expanded]="drawer()" aria-controls="drawer">
      <span class="sa om" aria-hidden="true">ॐ</span>{{ i18n.t('openChat') }}
    </button>
  }
  @if (drawer() && !onAsk()) {
    <div class="scrim" (click)="drawer.set(false)"></div>
    <aside id="drawer" class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="i18n.t('nav.ask')" (keydown.escape)="drawer.set(false)">
      <header>
        <h2>{{ i18n.t('panditji') }}</h2>
        <button type="button" class="btn ghost close" (click)="drawer.set(false)">{{ i18n.t('closeChat') }}</button>
      </header>
      <vp-chat-panel />
    </aside>
  }
  @if (getApp()) { <vp-get-app (close)="getApp.set(false)" /> }`,
  styles: [`
    .skip { position: absolute; left: -999px; top: 8px; background: var(--haldi); color: var(--ink); padding: 8px 12px; z-index: 100; border-radius: 4px; }
    .skip:focus { left: 8px; }
    .top { background: var(--ink); color: #F6F4FA; position: sticky; top: env(safe-area-inset-top, 0px); z-index: 30; }
    .bar { display: flex; align-items: center; gap: 24px; min-height: 64px; }
    .brand { display: flex; flex-direction: column; text-decoration: none; color: inherit; line-height: 1.05; flex: none; }
    .mark { font-size: 1.45rem; color: #fff; }
    .latin { font-size: .74rem; letter-spacing: .02em; color: rgba(246,244,250,.62); white-space: nowrap; }
    .latin .by { opacity: .8; }
    .latin .sig { font-family: 'Tiro Devanagari Sanskrit', Georgia, serif; font-style: italic; font-size: .9rem; color: var(--haldi); letter-spacing: 0; }
    .desk { display: flex; gap: 4px; flex: 1; }
    .desk a { color: rgba(246,244,250,.82); text-decoration: none; padding: 8px 12px; border-radius: 999px; font-weight: 500; white-space: nowrap; }
    .desk a:hover { color: #fff; background: rgba(255,255,255,.07); }
    .desk a.on { color: var(--ink); background: var(--haldi); }
    .ask-link { margin-left: auto; }
    .prefs { display: flex; gap: 8px; align-items: center; flex: none; }
    .acts { display: flex; gap: 8px; align-items: center; flex: none; }
    .acts a, .acts button { display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 6px 14px 6px 11px; border-radius: 999px;
      font: inherit; font-weight: 600; font-size: .92rem; text-decoration: none; cursor: pointer; white-space: nowrap; }
    .acts svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: none; }
    .dak { background: var(--haldi); color: var(--ink); border: 1.5px solid var(--haldi); }
    .dak:hover, .dak.on { background: #F0B53A; }
    .get { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,.3); }
    .get:hover { border-color: rgba(255,255,255,.6); }
    main { min-height: 70vh; }
    .strip { display: none; }
    @media (max-width: 1024px) {
      .strip { display: flex; align-items: center; gap: 10px; background: var(--card); border-bottom: 1px solid var(--line);
        padding: 10px max(16px, env(safe-area-inset-right, 0px)) 10px max(16px, env(safe-area-inset-left, 0px)); }
      .sicon { width: 40px; height: 40px; flex: none; border-radius: 10px; background: var(--ink); color: var(--haldi); display: grid; place-items: center; font-size: 1.3rem; }
      .stext { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
      .stext b { color: var(--ink); font-size: .92rem; }
      .stext small { color: var(--muted); font-size: .78rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .sget { min-height: 38px; padding: 6px 16px; font-size: .9rem; flex: none; }
      .sx { width: 32px; height: 32px; flex: none; border: 0; background: none; color: var(--faint); cursor: pointer; font-size: .95rem; }
    }
    .foot-links { display: flex; gap: 8px 22px; flex-wrap: wrap; justify-content: center; margin-top: 24px; }
    .foot-links a, .foot-links button { background: none; border: 0; padding: 4px 0; font: inherit; font-size: var(--s0); font-weight: 600; color: var(--sindoor); cursor: pointer;
      text-decoration: underline; text-decoration-color: var(--haldi); text-underline-offset: 4px; }
    .foot { border-top: 1px solid var(--line); padding: 28px 0 40px; font-size: var(--s-1); color: var(--muted); }
    .note { max-width: 72ch; }
    .sign { margin-top: 28px; padding-top: 22px; border-top: 1px solid var(--line); text-align: center; display: grid; gap: 6px; }
    .sign p { margin: 0 auto; max-width: none; }
    .copy { color: var(--faint); }
    .nw { white-space: nowrap; display: inline-block; }
    .credit { color: var(--muted); font-size: var(--s0); }
    .credit .sig { font-family: 'Tiro Devanagari Sanskrit', Georgia, serif; font-style: italic; font-size: 1.12rem; color: var(--ink); text-decoration: none; }
    .credit .sig:hover { color: var(--sindoor); text-decoration: underline; text-decoration-color: var(--haldi); }

    .tabbar { display: none; }

    .fab { position: fixed; right: calc(20px + env(safe-area-inset-right, 0px)); bottom: calc(20px + env(safe-area-inset-bottom, 0px)); z-index: 40;
           display: flex; align-items: center; gap: 10px; border: 0; cursor: pointer;
           background: var(--sindoor); color: #fff; font-weight: 600; padding: 12px 20px 12px 14px; border-radius: 999px; box-shadow: 0 8px 24px rgba(29,23,54,.28); min-height: 52px; }
    .fab:hover { background: #95102A; }
    .om { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,.16); display: grid; place-items: center; font-size: 1.2rem; }
    .scrim { position: fixed; inset: 0; background: rgba(29,23,54,.38); z-index: 50; }
    .drawer { position: fixed; right: 0; top: 0; bottom: 0; width: min(520px, 100vw); background: var(--paper); z-index: 60; display: flex; flex-direction: column;
              padding: calc(16px + env(safe-area-inset-top, 0px)) calc(18px + env(safe-area-inset-right, 0px)) calc(18px + env(safe-area-inset-bottom, 0px)) 18px;
              box-shadow: -12px 0 40px rgba(29,23,54,.25); animation: slide .22s ease-out; }
    .drawer header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .drawer h2 { margin: 0; font-family: var(--sanskrit); font-weight: 400; }
    .close { min-height: 36px; padding: 6px 14px; }
    .drawer vp-chat-panel { flex: 1; min-height: 0; }
    @keyframes slide { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }

    @media (max-width: 1280px) { .bar { gap: 12px; } .desk { gap: 0; } .desk a { padding: 8px 8px; } }
    .prefs .lang { max-width: 124px; }
    @media (max-width: 1240px) { .get span { display: none; } .get { padding: 6px 10px; } }

    /* ---------- phones & small tablets ---------- */
    @media (max-width: 1024px) {
      .desk, .fab { display: none; }
      .bar { flex-wrap: wrap; gap: 8px 12px; padding-block: 10px; min-height: 0; }
      .brand { flex: 1; order: 0; }
      .acts { order: 1; }
      .acts a, .acts button { min-height: 38px; padding: 5px 12px 5px 9px; font-size: .86rem; }
      .dak span { display: inline; }
      .get { padding: 5px 9px; }
      .get span { display: none; }
      .mark { font-size: 1.3rem; }
      .prefs { flex: 1 1 100%; order: 2; display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: 8px; }
      .prefs > * { min-width: 0; }
      .prefs .lang { width: 100%; max-width: none; }
      .foot { padding-bottom: calc(100px + env(safe-area-inset-bottom, 0px)); }

      .tabbar {
        display: grid; grid-template-columns: repeat(6, 1fr);
        position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
        background: var(--card); border-top: 1px solid var(--line);
        padding: 6px max(4px, env(safe-area-inset-right, 0px)) calc(6px + env(safe-area-inset-bottom, 0px)) max(4px, env(safe-area-inset-left, 0px));
        box-shadow: 0 -6px 20px rgba(29,23,54,.08);
      }
      .tabbar a { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; text-decoration: none;
                  color: var(--muted); font-size: .72rem; font-weight: 500; border-radius: 10px; min-height: 52px; justify-content: center; }
      .tabbar a span:last-child { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .tabbar svg { width: 22px; height: 22px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
      .tabbar a.on { color: var(--sindoor); }
      .tabbar a.on svg { stroke-width: 2.2; }
      .tabbar .om-tab .om { width: 26px; height: 26px; font-size: 1rem; background: var(--sindoor); color: #fff; }
      .tabbar .om-tab.on { color: var(--sindoor); }
      .tabbar { max-width: 100%; }
    }
    @media (max-width: 1024px) and (min-width: 600px) { .tabbar { padding-inline: max(10%, env(safe-area-inset-left, 0px)); } }
    @media (max-width: 380px) {
      .bar { gap: 8px; }
      .mark { font-size: 1.15rem; }
      .latin { font-size: .64rem; }
      .latin .sig { font-size: .78rem; }
      .acts { gap: 6px; }
      .acts a, .acts button { min-height: 36px; font-size: .8rem; }
      .dak { padding: 4px 10px 4px 8px; }
      .acts svg { width: 17px; height: 17px; }
    }
  `],
})
export class AppComponent {
  readonly i18n = inject(I18nService);
  readonly api = inject(ApiService);
  readonly langs = LANGS;
  readonly year = new Date().getFullYear();
  readonly drawer = signal(false);
  readonly onAsk = signal(false);
  readonly getApp = signal(false);
  readonly stripClosed = signal(this.readStrip());
  private readStrip(): boolean { try { return localStorage.getItem('vp.appStrip') === 'closed'; } catch { return false; } }
  dismissStrip() { this.stripClosed.set(true); try { localStorage.setItem('vp.appStrip', 'closed'); } catch { /* ignore */ } }
  showStrip() { return !this.native.isApp && (this.native.platform === 'android' || this.native.platform === 'ios') && !this.stripClosed() && !this.onAsk(); }
  readonly native = inject(NativeService);

  constructor() {
    const router = inject(Router);
    // Android back button: close what's open, else go back a page, else minimise the app
    this.native.onBack(() => {
      if (this.getApp()) { this.getApp.set(false); return true; }
      if (this.drawer()) { this.drawer.set(false); return true; }
      if (router.url !== '/' && router.url !== '') { history.back(); return true; }
      return false;
    });
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.onAsk.set((e as NavigationEnd).urlAfterRedirects.startsWith('/ask'));
      this.drawer.set(false);
      window.scrollTo({ top: 0 });
    });
    this.api.isOnline();
    document.documentElement.lang = this.i18n.lang();
  }
}
