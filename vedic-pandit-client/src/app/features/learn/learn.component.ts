import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { I18nService } from '../../core/services/i18n.service';
import { Mantra } from '../../core/astro/models';
import { DEITIES, textsFor } from '../../core/data/deities';

interface Step { slug: string; en: string; hi: string; }

/** A simple daily puja, in the order it is done. Each step opens the chant-along player. */
const DAILY: Step[] = [
  { slug: 'karagre-vasate', en: 'On waking: look at your palms', hi: 'जागते ही: हथेलियों का दर्शन' },
  { slug: 'samudra-vasane', en: 'Before stepping on the floor', hi: 'धरती पर पैर रखने से पहले' },
  { slug: 'ganga-cha-yamune', en: 'While bathing', hi: 'स्नान करते समय' },
  { slug: 'apavitrah-pavitro-va', en: 'Puja step 1: purify with water', hi: 'पूजा 1: जल से पवित्रीकरण' },
  { slug: 'achamana', en: 'Puja step 2: achamana', hi: 'पूजा 2: आचमन' },
  { slug: 'deepa-jyoti', en: 'Puja step 3: light the diya', hi: 'पूजा 3: दीपक जलाएँ' },
  { slug: 'vakratunda', en: 'Puja step 4: Ganesha first', hi: 'पूजा 4: पहले गणेश वंदना' },
  { slug: 'guru-brahma', en: 'Puja step 5: bow to the Guru', hi: 'पूजा 5: गुरु वंदना' },
  { slug: 'gayatri', en: 'Puja step 6: Gayatri japa', hi: 'पूजा 6: गायत्री जप' },
  { slug: 'om-jai-jagdish-hare', en: 'Puja step 7: aarti', hi: 'पूजा 7: आरती' },
  { slug: 'shiva-dhyana-karpuragauram', en: 'After the aarti', hi: 'आरती के बाद' },
  { slug: 'kshama-prarthana', en: 'Puja step 8: ask forgiveness', hi: 'पूजा 8: क्षमा प्रार्थना' },
  { slug: 'brahmarpanam', en: 'Before meals', hi: 'भोजन से पहले' },
  { slug: 'kara-charana-kritam', en: 'Before sleep', hi: 'सोने से पहले' },
];


@Component({
  selector: 'vp-learn',
  standalone: true,
  imports: [RouterLink, FormsModule],
  template: `
  <div class="wrap page">
    <header class="page-head">
      <h1>{{ i18n.t('learnTitle') }}</h1>
      <p>{{ i18n.t('learnIntro') }}</p>
    </header>
    <input class="input q" type="search" [ngModel]="q()" (ngModelChange)="q.set($event)" [placeholder]="i18n.t('searchMantra')" [attr.aria-label]="i18n.t('searchMantra')">

    @if (q().trim()) {
      <section>
        <h2>{{ i18n.t('search') }}</h2>
        <div class="grid">
          @for (m of found(); track m.slug) { <a class="card" [routerLink]="['/mantra', m.slug]"><b [class.sa]="hi()">{{ nm(m) }}</b><span>{{ m.deity }} · {{ kind(m) }}</span></a> }
          @empty { <p class="muted">{{ i18n.t('nothingFound') }}</p> }
        </div>
      </section>
    } @else {
      <section>
        <h2>{{ i18n.t('dChoose') }}</h2>
        <p class="muted sub">{{ i18n.t('dChooseSub') }}</p>
        <div class="gods">
          @for (d of deities(); track d.d.id) {
            <a class="god" [routerLink]="['/learn', d.d.id]" [style.--dc]="d.d.color">
              <span class="gi" aria-hidden="true">{{ d.d.icon }}</span>
              <b [class.sa]="hi()">{{ hi() ? d.d.hi : d.d.en }}</b>
              <small>{{ d.n }} · {{ hi() ? d.d.dayHi : d.d.day }}</small>
            </a>
          }
        </div>
      </section>
      @if (recorded().length) {
        <section class="guru">
          <h2>🎙 {{ i18n.t('guruVoice') }}</h2>
          <div class="grid">
            @for (m of recorded(); track m.slug) {
              <a class="card rec" [routerLink]="['/mantra', m.slug]"><b [class.sa]="hi()">{{ nm(m) }}</b><span>{{ m.audioCredit }}</span></a>
            }
          </div>
        </section>
      }
      <section>
        <h2>{{ i18n.t('dailyPuja') }}</h2>
        <p class="muted sub">{{ i18n.t('dailyPujaSub') }}</p>
        <ol class="steps">
          @for (s of daily(); track s.step.slug; let i = $index) {
            <li><a [routerLink]="['/mantra', s.step.slug]">
              <span class="no num">{{ i + 1 }}</span>
              <span class="st"><small>{{ hi() ? s.step.hi : s.step.en }}</small><b [class.sa]="hi()">{{ nm(s.m) }}</b></span>
              <span class="go" aria-hidden="true">›</span>
            </a></li>
          }
        </ol>
      </section>

    }
  </div>`,
  styles: [`
    .gods { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .god { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; padding: 14px 8px 12px; border-radius: 16px;
      background: var(--card); border: 1px solid var(--line); border-bottom: 4px solid var(--dc); text-decoration: none; color: inherit; }
    .god:hover { border-color: var(--dc); }
    .gi { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; font-size: 1.9rem; background: color-mix(in srgb, var(--dc) 14%, white); }
    .god b { color: var(--ink); font-size: 1rem; line-height: 1.2; }
    .god b.sa { font-weight: 400; font-size: 1.1rem; }
    .god small { color: var(--faint); font-size: .74rem; }
    @media (max-width: 560px) { .gods { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; } .god { padding: 10px 4px; } .gi { width: 46px; height: 46px; font-size: 1.6rem; } .god b { font-size: .9rem; } }
    .q { max-width: 420px; border-radius: 999px; margin-bottom: 8px; }
    section { margin-top: 28px; }
    h2 { margin: 0 0 6px; font-size: var(--s2); }
    .cnt { font-size: .6em; color: var(--faint); font-weight: 500; vertical-align: middle; }
    .sub { margin: 0 0 12px; }
    .steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; max-width: 720px; }
    .steps a { display: flex; align-items: center; gap: 14px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; text-decoration: none; color: inherit; }
    .steps a:hover { border-color: var(--ink); }
    .no { width: 32px; height: 32px; border-radius: 50%; background: var(--haldi-soft); color: var(--ink); display: grid; place-items: center; font-weight: 700; flex: none; }
    .st { display: flex; flex-direction: column; flex: 1; min-width: 0; }
    .st small { color: var(--muted); font-size: .8rem; }
    .st b { color: var(--ink); font-size: 1.05rem; }
    .st b.sa, .card b.sa { font-weight: 400; font-size: 1.12rem; }
    .go { color: var(--sindoor); font-size: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
    .card { min-width: 0; display: flex; flex-direction: column; gap: 2px; background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; text-decoration: none; color: inherit; }
    .card:hover { border-color: var(--ink); }
    .card b { color: var(--ink); }
    .card.rec { background: var(--ink); border-color: var(--ink); }
    .card.rec b { color: #fff; }
    .card.rec span { color: var(--haldi); }
    .card span { color: var(--faint); font-size: .8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `],
})
export class LearnComponent {
  readonly i18n = inject(I18nService);
  private api = inject(ApiService);
  readonly all = signal<Mantra[]>([]);
  readonly q = signal('');
  readonly hi = computed(() => this.i18n.prefersDevanagari());

  constructor() { this.api.mantras().then(l => this.all.set(l)); }

  readonly recorded = computed(() => this.all().filter(m => !!m.audioUrl));

  readonly daily = computed(() => {
    const by = new Map(this.all().map(m => [m.slug, m]));
    return DAILY.filter(s => by.has(s.slug)).map(s => ({ step: s, m: by.get(s.slug)! }));
  });

  /** Deity tiles with how many texts each has. */
  readonly deities = computed(() => DEITIES.map(d => ({ d, n: textsFor(d, this.all()).length })));

  readonly found = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.all().filter(m => `${m.name} ${m.nameHi} ${m.deity} ${m.tags} ${m.slug}`.toLowerCase().includes(q));
  });

  nm(m: Mantra) { return this.hi() ? m.nameHi : m.name; }
  kind(m: Mantra) {
    const k = m.kind ?? 'mantra', hi = this.hi();
    return ({ mantra: hi ? 'मंत्र' : 'Mantra', stotra: hi ? 'स्तोत्र' : 'Stotra', chalisa: hi ? 'चालीसा' : 'Chalisa', aarti: hi ? 'आरती' : 'Aarti' } as Record<string, string>)[k];
  }
}
