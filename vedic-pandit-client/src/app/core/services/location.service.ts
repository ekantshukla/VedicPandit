import { Injectable, signal } from '@angular/core';
import { Place } from '../astro/models';

export const PLACES: Place[] = [
  { name: 'Varanasi', nameHi: 'वाराणसी', lat: 25.3176, lng: 82.9739, tz: 'Asia/Kolkata' },
  { name: 'Rishikesh', nameHi: 'ऋषिकेश', lat: 30.0869, lng: 78.2676, tz: 'Asia/Kolkata' },
  { name: 'Haridwar', nameHi: 'हरिद्वार', lat: 29.9457, lng: 78.1642, tz: 'Asia/Kolkata' },
  { name: 'Ujjain', nameHi: 'उज्जैन', lat: 23.1765, lng: 75.7885, tz: 'Asia/Kolkata' },
  { name: 'Ayodhya', nameHi: 'अयोध्या', lat: 26.7922, lng: 82.1998, tz: 'Asia/Kolkata' },
  { name: 'Mathura', nameHi: 'मथुरा', lat: 27.4924, lng: 77.6737, tz: 'Asia/Kolkata' },
  { name: 'Prayagraj', nameHi: 'प्रयागराज', lat: 25.4358, lng: 81.8463, tz: 'Asia/Kolkata' },
  { name: 'New Delhi', nameHi: 'नई दिल्ली', lat: 28.6139, lng: 77.209, tz: 'Asia/Kolkata' },
  { name: 'Mumbai', nameHi: 'मुंबई', lat: 19.076, lng: 72.8777, tz: 'Asia/Kolkata' },
  { name: 'Bengaluru', nameHi: 'बेंगलुरु', lat: 12.9716, lng: 77.5946, tz: 'Asia/Kolkata' },
  { name: 'Chennai', nameHi: 'चेन्नई', lat: 13.0827, lng: 80.2707, tz: 'Asia/Kolkata' },
  { name: 'Hyderabad', nameHi: 'हैदराबाद', lat: 17.385, lng: 78.4867, tz: 'Asia/Kolkata' },
  { name: 'Kolkata', nameHi: 'कोलकाता', lat: 22.5726, lng: 88.3639, tz: 'Asia/Kolkata' },
  { name: 'Ahmedabad', nameHi: 'अहमदाबाद', lat: 23.0225, lng: 72.5714, tz: 'Asia/Kolkata' },
  { name: 'Pune', nameHi: 'पुणे', lat: 18.5204, lng: 73.8567, tz: 'Asia/Kolkata' },
  { name: 'Jaipur', nameHi: 'जयपुर', lat: 26.9124, lng: 75.7873, tz: 'Asia/Kolkata' },
  { name: 'Lucknow', nameHi: 'लखनऊ', lat: 26.8467, lng: 80.9462, tz: 'Asia/Kolkata' },
  { name: 'Patna', nameHi: 'पटना', lat: 25.5941, lng: 85.1376, tz: 'Asia/Kolkata' },
  { name: 'Bhubaneswar', nameHi: 'भुवनेश्वर', lat: 20.2961, lng: 85.8245, tz: 'Asia/Kolkata' },
  { name: 'Guwahati', nameHi: 'गुवाहाटी', lat: 26.1445, lng: 91.7362, tz: 'Asia/Kolkata' },
  { name: 'Thiruvananthapuram', nameHi: 'तिरुवनंतपुरम', lat: 8.5241, lng: 76.9366, tz: 'Asia/Kolkata' },
  { name: 'Tirupati', nameHi: 'तिरुपति', lat: 13.6288, lng: 79.4192, tz: 'Asia/Kolkata' },
  { name: 'Kathmandu', nameHi: 'काठमांडू', lat: 27.7172, lng: 85.324, tz: 'Asia/Kathmandu' },
  { name: 'Dubai', nameHi: 'दुबई', lat: 25.2048, lng: 55.2708, tz: 'Asia/Dubai' },
  { name: 'London', nameHi: 'लंदन', lat: 51.5074, lng: -0.1278, tz: 'Europe/London' },
  { name: 'New York', nameHi: 'न्यूयॉर्क', lat: 40.7128, lng: -74.006, tz: 'America/New_York' },
  { name: 'San Francisco', nameHi: 'सैन फ़्रांसिस्को', lat: 37.7749, lng: -122.4194, tz: 'America/Los_Angeles' },
  { name: 'Toronto', nameHi: 'टोरंटो', lat: 43.6532, lng: -79.3832, tz: 'America/Toronto' },
  { name: 'Singapore', nameHi: 'सिंगापुर', lat: 1.3521, lng: 103.8198, tz: 'Asia/Singapore' },
  { name: 'Sydney', nameHi: 'सिडनी', lat: -33.8688, lng: 151.2093, tz: 'Australia/Sydney' },
];

@Injectable({ providedIn: 'root' })
export class LocationService {
  readonly place = signal<Place>(this.initial());

  private initial(): Place {
    try {
      const s = localStorage.getItem('vp.place');
      if (s) return JSON.parse(s) as Place;
    } catch { /* ignore */ }
    return PLACES[0];
  }

  set(p: Place) {
    this.place.set(p);
    try { localStorage.setItem('vp.place', JSON.stringify(p)); } catch { /* ignore */ }
  }

  useDevice(): Promise<Place> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
      navigator.geolocation.getCurrentPosition(pos => {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        const p: Place = { name: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`, lat: pos.coords.latitude, lng: pos.coords.longitude, tz };
        this.set(p);
        resolve(p);
      }, err => reject(err), { timeout: 10000, maximumAge: 3600000 });
    });
  }
}
