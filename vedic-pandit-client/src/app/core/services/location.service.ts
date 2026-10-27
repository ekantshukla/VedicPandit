import { Injectable, signal } from '@angular/core';
import { Place } from '../astro/models';
import districtsJson from '../data/districts.json';

/** One Indian state or UT with its districts: [name, lat, lng]. Built by tools/build_districts.py. */
export interface StateInfo { n: string; h: string; d: [string, number, number][]; }
export const STATES: StateInfo[] = (districtsJson as unknown as { states: StateInfo[] }).states;

/** Tirth kshetras and big towns, shown as quick picks above the state/district lists. */
export const TIRTHS: Place[] = [
  { name: 'Varanasi', nameHi: 'वाराणसी', lat: 25.3176, lng: 82.9739, tz: 'Asia/Kolkata', state: 'Uttar Pradesh', district: 'Varanasi' },
  { name: 'Ayodhya', nameHi: 'अयोध्या', lat: 26.7922, lng: 82.1998, tz: 'Asia/Kolkata', state: 'Uttar Pradesh', district: 'Ayodhya' },
  { name: 'Mathura', nameHi: 'मथुरा', lat: 27.4924, lng: 77.6737, tz: 'Asia/Kolkata', state: 'Uttar Pradesh', district: 'Mathura' },
  { name: 'Vrindavan', nameHi: 'वृंदावन', lat: 27.5650, lng: 77.6593, tz: 'Asia/Kolkata', state: 'Uttar Pradesh', district: 'Mathura' },
  { name: 'Prayagraj', nameHi: 'प्रयागराज', lat: 25.4358, lng: 81.8463, tz: 'Asia/Kolkata', state: 'Uttar Pradesh', district: 'Prayagraj' },
  { name: 'Haridwar', nameHi: 'हरिद्वार', lat: 29.9457, lng: 78.1642, tz: 'Asia/Kolkata', state: 'Uttarakhand', district: 'Haridwar' },
  { name: 'Rishikesh', nameHi: 'ऋषिकेश', lat: 30.0869, lng: 78.2676, tz: 'Asia/Kolkata', state: 'Uttarakhand', district: 'Dehradun' },
  { name: 'Ujjain', nameHi: 'उज्जैन', lat: 23.1765, lng: 75.7885, tz: 'Asia/Kolkata', state: 'Madhya Pradesh', district: 'Ujjain' },
  { name: 'Puri', nameHi: 'पुरी', lat: 19.8135, lng: 85.8312, tz: 'Asia/Kolkata', state: 'Odisha', district: 'Puri' },
  { name: 'Tirupati', nameHi: 'तिरुपति', lat: 13.6288, lng: 79.4192, tz: 'Asia/Kolkata', state: 'Andhra Pradesh', district: 'Chittoor' },
  { name: 'Rameswaram', nameHi: 'रामेश्वरम', lat: 9.2876, lng: 79.3129, tz: 'Asia/Kolkata', state: 'Tamil Nadu', district: 'Ramanathapuram' },
  { name: 'Dwarka', nameHi: 'द्वारका', lat: 22.2442, lng: 68.9685, tz: 'Asia/Kolkata', state: 'Gujarat', district: 'Jamnagar' },
];

/** For readers outside India. */
export const WORLD: Place[] = [
  { name: 'Kathmandu', nameHi: 'काठमांडू', lat: 27.7172, lng: 85.324, tz: 'Asia/Kathmandu' },
  { name: 'Dhaka', nameHi: 'ढाका', lat: 23.8103, lng: 90.4125, tz: 'Asia/Dhaka' },
  { name: 'Colombo', nameHi: 'कोलंबो', lat: 6.9271, lng: 79.8612, tz: 'Asia/Colombo' },
  { name: 'Dubai', nameHi: 'दुबई', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
  { name: 'Doha', nameHi: 'दोहा', lat: 25.2854, lng: 51.531, tz: 'Asia/Qatar' },
  { name: 'Muscat', nameHi: 'मस्कट', lat: 23.588, lng: 58.3829, tz: 'Asia/Muscat' },
  { name: 'Singapore', nameHi: 'सिंगापुर', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore' },
  { name: 'Kuala Lumpur', nameHi: 'क्वालालंपुर', lat: 3.139, lng: 101.6869, tz: 'Asia/Kuala_Lumpur' },
  { name: 'Bangkok', nameHi: 'बैंकॉक', lat: 13.7563, lng: 100.5018, tz: 'Asia/Bangkok' },
  { name: 'Tokyo', nameHi: 'टोक्यो', lat: 35.6762, lng: 139.6503, tz: 'Asia/Tokyo' },
  { name: 'Sydney', nameHi: 'सिडनी', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
  { name: 'Melbourne', nameHi: 'मेलबर्न', lat: -37.8136, lng: 144.9631, tz: 'Australia/Melbourne' },
  { name: 'Auckland', nameHi: 'ऑकलैंड', lat: -36.8485, lng: 174.7633, tz: 'Pacific/Auckland' },
  { name: 'Suva', nameHi: 'सुवा', lat: -18.1248, lng: 178.4501, tz: 'Pacific/Fiji' },
  { name: 'Port Louis', nameHi: 'पोर्ट लुई', lat: -20.1609, lng: 57.5012, tz: 'Indian/Mauritius' },
  { name: 'Nairobi', nameHi: 'नैरोबी', lat: -1.2921, lng: 36.8219, tz: 'Africa/Nairobi' },
  { name: 'Durban', nameHi: 'डरबन', lat: -29.8587, lng: 31.0218, tz: 'Africa/Johannesburg' },
  { name: 'London', nameHi: 'लंदन', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { name: 'Leicester', nameHi: 'लेस्टर', lat: 52.6369, lng: -1.1398, tz: 'Europe/London' },
  { name: 'Amsterdam', nameHi: 'एम्सटर्डम', lat: 52.3676, lng: 4.9041, tz: 'Europe/Amsterdam' },
  { name: 'Frankfurt', nameHi: 'फ्रैंकफर्ट', lat: 50.1109, lng: 8.6821, tz: 'Europe/Berlin' },
  { name: 'Paramaribo', nameHi: 'पारामारिबो', lat: 5.852, lng: -55.2038, tz: 'America/Paramaribo' },
  { name: 'Port of Spain', nameHi: 'पोर्ट ऑफ़ स्पेन', lat: 10.6596, lng: -61.5089, tz: 'America/Port_of_Spain' },
  { name: 'Toronto', nameHi: 'टोरंटो', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
  { name: 'Vancouver', nameHi: 'वैंकूवर', lat: 49.2827, lng: -123.1207, tz: 'America/Vancouver' },
  { name: 'New York', nameHi: 'न्यूयॉर्क', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  { name: 'New Jersey (Edison)', nameHi: 'न्यू जर्सी (एडिसन)', lat: 40.5187, lng: -74.4121, tz: 'America/New_York' },
  { name: 'Chicago', nameHi: 'शिकागो', lat: 41.8781, lng: -87.6298, tz: 'America/Chicago' },
  { name: 'Houston', nameHi: 'ह्यूस्टन', lat: 29.7604, lng: -95.3698, tz: 'America/Chicago' },
  { name: 'Dallas', nameHi: 'डलास', lat: 32.7767, lng: -96.797, tz: 'America/Chicago' },
  { name: 'San Francisco', nameHi: 'सैन फ़्रांसिस्को', lat: 37.7749, lng: -122.4194, tz: 'America/Los_Angeles' },
  { name: 'Los Angeles', nameHi: 'लॉस एंजेलिस', lat: 34.0522, lng: -118.2437, tz: 'America/Los_Angeles' },
];

/** Every named place (tirths + world), for lookups by name. */
export const PLACES: Place[] = [...TIRTHS, ...WORLD];

export function districtPlace(state: StateInfo, d: [string, number, number]): Place {
  return { name: d[0], lat: d[1], lng: d[2], tz: 'Asia/Kolkata', state: state.n, district: d[0] };
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly place = signal<Place>(this.initial());

  private initial(): Place {
    try {
      const s = localStorage.getItem('vp.place');
      if (s) {
        const p = JSON.parse(s) as Place;
        // Places saved by older versions (city list, or GPS coordinates) still work as they are
        if (typeof p.lat === 'number' && typeof p.lng === 'number' && p.tz) return p;
      }
    } catch { /* ignore */ }
    return TIRTHS[0];
  }

  set(p: Place) {
    this.place.set(p);
    try { localStorage.setItem('vp.place', JSON.stringify(p)); } catch { /* ignore */ }
  }
}
