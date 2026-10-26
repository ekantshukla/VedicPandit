// Port of VedicPandit.Infrastructure.Panchang.PanchangEngine (C#). Keep the two in sync.
import { bisect, elongation, findAngleCrossing, fromJd, lahiri, deltaTDays, moonSidereal, sunAltitude, sunSidereal, toJd, yogaAngle } from './astro';
import * as N from './names';
import { MonthSystem, PanchangElement, PanchangResult, TimeWindow } from './models';

const NAK = 360 / 27;

// ---------- time-zone helpers (Intl based, works for any IANA zone) ----------
const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function tzOffsetMinutes(tz: string, utcMs: number): number {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    fmtCache.set(tz, f);
  }
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(utcMs))) if (part.type !== 'literal') p[part.type] = +part.value;
  const asUtc = Date.UTC(p['year'], p['month'] - 1, p['day'], p['hour'] % 24, p['minute'], p['second']);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}
const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');
export function isoLocal(utcMs: number, tz: string): string {
  const off = tzOffsetMinutes(tz, utcMs);
  const d = new Date(utcMs + off * 60000);
  const sign = off >= 0 ? '+' : '-';
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
}
export function todayIn(tz: string): string { return isoLocal(Date.now(), tz).slice(0, 10); }
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function sunEvent(jdMid: number, tzHours: number, lat: number, lng: number, rising: boolean): number | null {
  const noon = jdMid + 0.5 + (tzHours - lng / 15) / 24;
  const F = (j: number) => sunAltitude(j, lat, lng) + 0.833;
  const a = rising ? noon - 0.5 : noon, b = rising ? noon : noon + 0.5;
  if ((F(a) > 0) === (F(b) > 0)) return null;
  return bisect(F, a, b, 40);
}

export function lunarMonth(jd: number): { masa: number; adhik: boolean } {
  const el = elongation(jd);
  const approxPrev = jd - (el / 360) * 29.530588 - 2;
  let prev = findAngleCrossing(elongation, 0, approxPrev, 4, 0.25) ?? jd - el / 12.19;
  if (prev > jd) prev -= 29.530588;
  const next = findAngleCrossing(elongation, 0, prev + 25, 8, 0.25) ?? prev + 29.53;
  const rp = Math.floor(sunSidereal(prev) / 30), rn = Math.floor(sunSidereal(next) / 30);
  return { masa: (rp + 1) % 12, adhik: rp === rn };
}

type Describe = (i: number) => { number: number; name: string; sa: string; extra?: string | null };

function segments(angle: (j: number) => number, span: number, count: number, start: number, end: number, describe: Describe, local: (jd: number) => string): PanchangElement[] {
  const list: PanchangElement[] = [];
  let t = start;
  let idx = Math.floor(angle(t) / span) % count;
  for (let guard = 0; guard < 5; guard++) {
    const target = ((idx + 1) % count) * span;
    const ends = findAngleCrossing(angle, target, t, 2, span <= 6 ? 0.1 : 0.2);
    const d = describe(idx);
    list.push({ number: d.number, name: d.name, nameSanskrit: d.sa, ends: ends !== null ? local(ends) : null, extra: d.extra ?? null });
    if (ends === null || ends >= end) break;
    t = ends + 1e-6;
    idx = (idx + 1) % count;
  }
  return list;
}

const MAJOR: Record<string, string> = {
  '0-1': 'Chaitra Navratri begins / Gudi Padwa / Ugadi', '1-3': 'Akshaya Tritiya',
  '3-11': 'Devshayani Ekadashi (Chaturmas begins)', '3-15': 'Guru Purnima', '4-5': 'Nag Panchami', '4-15': 'Raksha Bandhan',
  '6-1': 'Sharad Navratri begins',
  '6-15': 'Sharad Purnima', '7-1': 'Govardhan Puja',
  '7-2': 'Bhai Dooj', '7-11': 'Prabodhini (Dev Uthani) Ekadashi (Chaturmas ends)', '7-15': 'Kartik Purnima / Dev Deepawali',
  '10-5': 'Vasant Panchami', '11-16': 'Holi',
};
// Festivals decided by the tithi prevailing at pradosh (sunset) or nishita (midnight) rather than at sunrise.
const AT_PRADOSH: Record<string, string> = { '6-19': 'Karwa Chauth', '6-28': 'Dhanteras', '6-30': 'Diwali (Lakshmi Puja)', '11-15': 'Holika Dahan' };
const AT_NISHITA: Record<string, string> = { '4-23': 'Krishna Janmashtami', '10-29': 'Maha Shivaratri' };
const AT_MADHYAHNA: Record<string, string> = { '0-9': 'Ram Navami', '5-4': 'Ganesh Chaturthi' };
const AT_APARAHNA: Record<string, string> = { '6-10': 'Vijayadashami (Dussehra)' };
export interface ObservanceTimes { madhyahna: number; aparahna: number; pradosh: number; nishita: number; prevMadhyahna: number; prevAparahna: number; prevPradosh: number; prevNishita: number; }
// A kaal-based festival falls on the first day whose kaal has the tithi (skip if yesterday's kaal already had it).
const firstAt = (table: Record<string, string>, masa: number, now: number, prev: number) => now !== prev ? table[`${masa}-${now}`] : undefined;
const tithiAt = (jd: number) => Math.floor(elongation(jd) / 12) + 1;

function observances(tithi: number, masa: number, adhik: boolean, t: ObservanceTimes): string[] {
  const o: string[] = [];
  const monthly: Record<number, string> = { 4: 'Vinayaka Chaturthi', 11: 'Ekadashi', 26: 'Ekadashi', 13: 'Pradosh Vrat (confirm Trayodashi at pradosh kaal)', 28: 'Pradosh Vrat (confirm Trayodashi at pradosh kaal)', 15: 'Purnima', 19: 'Sankashti Chaturthi', 29: 'Masik Shivaratri', 30: 'Amavasya' };
  if (monthly[tithi]) o.push(monthly[tithi]);
  if (adhik) { o.push('Adhik Masa (Purushottam Maas)'); return o; }
  let f = MAJOR[`${masa}-${tithi}`] ?? firstAt(AT_MADHYAHNA, masa, t.madhyahna, t.prevMadhyahna) ?? firstAt(AT_APARAHNA, masa, t.aparahna, t.prevAparahna)
    ?? firstAt(AT_PRADOSH, masa, t.pradosh, t.prevPradosh) ?? firstAt(AT_NISHITA, masa, t.nishita, t.prevNishita);
  // Nishita tithi that spans neither midnight: observe on the day it prevails at sunrise.
  if (!f && t.nishita === tithi + 1 && t.prevNishita !== tithi) f = AT_NISHITA[`${masa}-${tithi}`];
  if (f) o.unshift(f);
  return o;
}

export function computePanchang(date: string, lat: number, lng: number, tz: string, monthSystem: MonthSystem = 'Purnimanta'): PanchangResult {
  const [y, m, d] = date.split('-').map(Number);
  const offMin = tzOffsetMinutes(tz, Date.UTC(y, m - 1, d, 12) - 5.5 * 3600000);
  const midUtc = Date.UTC(y, m - 1, d) - offMin * 60000;
  const jdMid = toJd(midUtc);
  const tzH = offMin / 60;

  const rise = sunEvent(jdMid, tzH, lat, lng, true);
  const set = sunEvent(jdMid, tzH, lat, lng, false);
  const nextRise = sunEvent(jdMid + 1, tzH, lat, lng, true);
  const r = rise ?? jdMid + 0.25, s = set ?? jdMid + 0.75, nr = nextRise ?? jdMid + 1.25;
  const local = (jd: number) => isoLocal(fromJd(jd), tz);

  const tithis = segments(elongation, 12, 30, r, nr, i => { const [n, sa] = N.tithiName(i + 1); return { number: i + 1, name: n, sa }; }, local);
  const moonAtRise = moonSidereal(r);
  const nakshatras = segments(moonSidereal, NAK, 27, r, nr, i => {
    const pada = Math.min(4, Math.max(1, Math.floor((((moonAtRise - i * NAK) % 360 + 360) % 360) / (NAK / 4)) + 1));
    return { number: i + 1, name: N.NAKSHATRA[i], sa: N.NAKSHATRA_SA[i], extra: `(pada ${pada} at sunrise)` };
  }, local);
  for (let k = 1; k < nakshatras.length; k++) nakshatras[k] = { ...nakshatras[k], extra: null };
  const yogas = segments(yogaAngle, NAK, 27, r, nr, i => ({ number: i + 1, name: N.YOGA[i], sa: N.YOGA_SA[i] }), local);
  const karanas = segments(elongation, 6, 60, r, nr, i => { const k = N.karanaIndex(i); return { number: k + 1, name: N.KARANA[k], sa: N.KARANA_SA[k] }; }, local);

  const tithiAtRise = tithis[0].number;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const { masa: amanta, adhik } = lunarMonth(r);
  const masaIdx = monthSystem === 'Purnimanta' && tithiAtRise > 15 ? (amanta + 1) % 12 : amanta;
  const vikram = m <= 4 && amanta >= 8 ? y + 56 : y + 57;
  const sunSid = sunSidereal(r), moonSid = moonSidereal(r);

  const dayLen = s - r;
  const eighth = (name: string, seg: number): TimeWindow => ({ name, start: local(r + dayLen * (seg - 1) / 8), end: local(r + dayLen * seg / 8) });
  const mu = dayLen / 15, nmu = (nr - s) / 15, nightLen = nr - s;
  const dayChoghadiya: TimeWindow[] = [], nightChoghadiya: TimeWindow[] = [];
  for (let i = 0; i < 8; i++) {
    const dn = N.DAY_CHOG[(N.DAY_CHOG_START[weekday] + i) % 7];
    dayChoghadiya.push({ name: dn, start: local(r + dayLen * i / 8), end: local(r + dayLen * (i + 1) / 8), quality: N.chogQuality(dn) });
    const nn = N.NIGHT_CHOG[(N.NIGHT_CHOG_START[weekday] + i) % 7];
    nightChoghadiya.push({ name: nn, start: local(s + nightLen * i / 8), end: local(s + nightLen * (i + 1) / 8), quality: N.chogQuality(nn) });
  }

  const obs = observances(tithiAtRise, amanta, adhik, {
    madhyahna: tithiAt(r + dayLen / 2), aparahna: tithiAt(r + dayLen * 0.7), pradosh: tithiAt(s), nishita: tithiAt((s + nr) / 2),
    prevMadhyahna: tithiAt(r - 1 + dayLen / 2), prevAparahna: tithiAt(r - 1 + dayLen * 0.7), prevPradosh: tithiAt(s - 1), prevNishita: tithiAt(r - nightLen / 2),
  });
  const rashiAtRise = Math.floor(sunSid / 30), rashiNext = Math.floor(sunSidereal(nr) / 30);
  if (rashiNext !== rashiAtRise) {
    const sk = findAngleCrossing(sunSidereal, rashiNext * 30, r, 1.5, 0.25);
    obs.unshift(`${N.RASHI[rashiNext]} Sankranti${sk !== null ? ' at ' + local(sk).slice(11, 16) : ''}${rashiNext === 9 ? ' (Makar Sankranti)' : ''}`);
  }
  const mr = Math.floor(moonSid / 30);

  return {
    date, latitude: lat, longitude: lng, timeZone: tz, monthSystem,
    sunrise: rise !== null ? local(rise) : null, sunset: set !== null ? local(set) : null, nextSunrise: nextRise !== null ? local(nextRise) : null,
    vara: { number: weekday + 1, name: N.VARA[weekday], nameSanskrit: N.VARA_SA[weekday], ends: null },
    tithis, nakshatras, yogas, karanas,
    paksha: tithiAtRise <= 15 ? 'Shukla Paksha' : 'Krishna Paksha',
    masa: N.MASA[masaIdx], masaSanskrit: N.MASA_SA[masaIdx], isAdhikMasa: adhik,
    vikramSamvat: vikram, shakaSamvat: vikram - 135, ritu: N.RITU[Math.floor(amanta / 2)],
    ayana: sunSid >= 270 || sunSid < 90 ? 'Uttarayana' : 'Dakshinayana',
    sunRashi: `${N.RASHI[rashiAtRise]} (${N.RASHI_SA[rashiAtRise]})`, moonRashi: `${N.RASHI[mr]} (${N.RASHI_SA[mr]})`,
    rahuKaal: eighth('Rahu Kaal', N.RAHU_SEG[weekday]), yamaganda: eighth('Yamaganda', N.YAMA_SEG[weekday]), gulika: eighth('Gulika Kaal', N.GULIKA_SEG[weekday]),
    abhijitMuhurat: { name: 'Abhijit Muhurat', start: local(r + 7 * mu), end: local(r + 8 * mu), quality: weekday === 3 ? 'Traditionally not used on Wednesday' : null },
    brahmaMuhurat: { name: 'Brahma Muhurat', start: local(r - 2 * nmu), end: local(r - nmu) },
    dayChoghadiya, nightChoghadiya, observances: obs, ayanamsa: lahiri(r + deltaTDays(r)),
  };
}
