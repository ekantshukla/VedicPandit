import { Pipe, PipeTransform } from '@angular/core';

/** "2026-10-27T06:29:28+05:30" -> "06:29", with "+1" when it falls on the day after `baseDate`. */
@Pipe({ name: 'hm', standalone: true })
export class TimePipe implements PipeTransform {
  transform(iso: string | null | undefined, baseDate?: string): string {
    if (!iso) return '—';
    const t = iso.slice(11, 16);
    if (baseDate && iso.slice(0, 10) > baseDate) return `${t} +1`;
    return t;
  }
}

/** Format YYYY-MM-DD for display in the user's language. */
@Pipe({ name: 'day', standalone: true })
export class DayPipe implements PipeTransform {
  transform(date: string | null | undefined, lang = 'hi', style: 'long' | 'short' = 'long'): string {
    if (!date) return '';
    const [y, m, d] = date.slice(0, 10).split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12));
    const opts: Intl.DateTimeFormatOptions = style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' };
    try { return new Intl.DateTimeFormat(`${lang}-IN`, opts).format(dt); } catch { return date; }
  }
}
