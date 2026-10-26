// Browser port of VedicPandit.Infrastructure.Astronomy (C#). Same algorithms, same constants.
// Used for the home-page sky dial and as an offline fallback when the .NET API is unreachable.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const norm360 = (a: number) => ((a % 360) + 360) % 360;
const sinD = (d: number) => Math.sin(d * D2R);
const cosD = (d: number) => Math.cos(d * D2R);

export const toJd = (ms: number) => ms / 86400000 + 2440587.5;
export const fromJd = (jd: number) => Math.round((jd - 2440587.5) * 86400000);
const centuries = (jd: number) => (jd - 2451545.0) / 36525;

export function deltaTDays(jdUt: number): number {
  const year = 2000 + (jdUt - 2451545) / 365.25;
  const ys = [1900, 1920, 1940, 1960, 1980, 2000, 2010, 2020, 2030, 2040, 2050, 2100];
  const vs = [-2.7, 21.2, 24.3, 33.2, 50.5, 63.8, 66.1, 69.4, 70.5, 72.0, 74.0, 93.0];
  let s: number;
  if (year <= ys[0]) s = vs[0];
  else if (year >= ys[ys.length - 1]) s = vs[vs.length - 1];
  else {
    let i = 0;
    while (ys[i + 1] < year) i++;
    s = vs[i] + ((year - ys[i]) / (ys[i + 1] - ys[i])) * (vs[i + 1] - vs[i]);
  }
  return s / 86400;
}

export function bisect(f: (x: number) => number, a: number, b: number, n = 50): number {
  let fa = f(a);
  for (let i = 0; i < n; i++) {
    const m = (a + b) / 2, fm = f(m);
    if ((fm > 0) === (fa > 0)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

export function findAngleCrossing(fn: (j: number) => number, target: number, start: number, maxDays = 3, step = 0.25): number | null {
  const diff = (j: number) => { const d = norm360(fn(j) - target); return d > 180 ? d - 360 : d; };
  let a = start, da = diff(a);
  for (let b = start + step; b <= start + maxDays + 1e-9; b += step) {
    const db = diff(b);
    if (da < 0 && db >= 0) return bisect(diff, a, b, 40);
    a = b; da = db;
  }
  return null;
}

// ---------------- Sun (truncated VSOP87) ----------------
type S = number[][];
const L0: S = [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],[3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],[1273,2.0371,529.691],[1199,1.1096,1577.3435],[990,5.233,5884.927],[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],[753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],[357,2.92,0.067],[317,5.849,11790.629],[284,1.899,796.298],[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],[205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],[103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],[99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],[85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],[79,3.04,12036.46],[75,1.76,5088.63],[74,3.5,3154.69],[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],[61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],[56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],[41,2.4,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],[33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]];
const L1: S = [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],[425,1.59,3.523],[119,5.796,26.298],[109,2.966,1577.344],[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],[67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],[45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],[21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.3],[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],[15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],[12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],[10,1.3,6286.6],[10,4.24,1349.87],[9,2.7,242.73],[9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]];
const L2: S = [[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],[27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],[10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],[3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],[2,4.38,5223.69],[2,3.75,0.98]];
const L3: S = [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],[3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]];
const L4: S = [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]];
const L5: S = [[1,3.14,0]];
const ser = (s: S, t: number) => s.reduce((a, [A, B, C]) => a + A * Math.cos(B + C * t), 0);

export function sunMeanEquinox(jdTT: number): number {
  const t = (jdTT - 2451545) / 365250;
  const L = (ser(L0, t) + ser(L1, t) * t + ser(L2, t) * t * t + ser(L3, t) * t ** 3 + ser(L4, t) * t ** 4 + ser(L5, t) * t ** 5) / 1e8;
  return norm360(L * R2D + 180 - 0.09033 / 3600 - 20.4898 / 3600);
}

function nutationLon(jdTT: number): number {
  const t = centuries(jdTT);
  const om = 125.04452 - 1934.136261 * t, l0 = 280.4665 + 36000.7698 * t, lp = 218.3165 + 481267.8813 * t;
  return (-17.2 * sinD(om) - 1.32 * sinD(2 * l0) - 0.23 * sinD(2 * lp) + 0.21 * sinD(2 * om)) / 3600;
}
function trueObliquity(jdTT: number): number {
  const t = centuries(jdTT);
  const om = 125.04452 - 1934.136261 * t, l0 = 280.4665 + 36000.7698 * t, lp = 218.3165 + 481267.8813 * t;
  const eps0 = 23 + 26 / 60 + (21.448 - 46.815 * t - 0.00059 * t * t + 0.001813 * t ** 3) / 3600;
  return eps0 + (9.2 * cosD(om) + 0.57 * cosD(2 * l0) + 0.1 * cosD(2 * lp) - 0.09 * cosD(2 * om)) / 3600;
}

export function sunAltitude(jdUt: number, lat: number, lng: number): number {
  const jdTT = jdUt + deltaTDays(jdUt);
  const lam = norm360(sunMeanEquinox(jdTT) + nutationLon(jdTT));
  const eps = trueObliquity(jdTT);
  const ra = Math.atan2(cosD(eps) * sinD(lam), cosD(lam)) * R2D;
  const dec = Math.asin(sinD(eps) * sinD(lam)) * R2D;
  const tu = centuries(jdUt);
  const gmst = norm360(280.46061837 + 360.98564736629 * (jdUt - 2451545) + 0.000387933 * tu * tu);
  return Math.asin(sinD(lat) * sinD(dec) + cosD(lat) * cosD(dec) * cosD(gmst + lng - ra)) * R2D;
}

// ---------------- Moon (Meeus ch. 47) ----------------
const MOON = [
[0,0,1,0,6288774],[2,0,-1,0,1274027],[2,0,0,0,658314],[0,0,2,0,213618],[0,1,0,0,-185116],[0,0,0,2,-114332],
[2,0,-2,0,58793],[2,-1,-1,0,57066],[2,0,1,0,53322],[2,-1,0,0,45758],[0,1,-1,0,-40923],[1,0,0,0,-34720],
[0,1,1,0,-30383],[2,0,0,-2,15327],[0,0,1,2,-12528],[0,0,1,-2,10980],[4,0,-1,0,10675],[0,0,3,0,10034],
[4,0,-2,0,8548],[2,1,-1,0,-7888],[2,1,0,0,-6766],[1,0,-1,0,-5163],[1,1,0,0,4987],[2,-1,1,0,4036],
[2,0,2,0,3994],[4,0,0,0,3861],[2,0,-3,0,3665],[0,1,-2,0,-2689],[2,0,-1,2,-2602],[2,-1,-2,0,2390],
[1,0,1,0,-2348],[2,-2,0,0,2236],[0,1,2,0,-2120],[0,2,0,0,-2069],[2,-2,-1,0,2048],[2,0,1,-2,-1773],
[2,0,0,2,-1595],[4,-1,-1,0,1215],[0,0,2,2,-1110],[3,0,-1,0,-892],[2,1,1,0,-810],[4,-1,-2,0,759],
[0,2,-1,0,-713],[2,2,-1,0,-700],[2,1,-2,0,691],[2,-1,0,-2,596],[4,0,1,0,549],[0,0,4,0,537],
[4,-1,0,0,520],[1,0,-2,0,-487],[2,1,0,-2,-399],[0,0,2,-2,-381],[1,1,1,0,351],[3,0,-2,0,-340],
[4,0,-3,0,330],[2,-1,2,0,327],[0,2,1,0,-323],[1,1,-1,0,299],[2,0,3,0,294]];

export function moonMeanEquinox(jdTT: number): number {
  const t = centuries(jdTT), t2 = t * t, t3 = t2 * t, t4 = t3 * t;
  const lp = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2 + t3 / 538841 - t4 / 65194000;
  const d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2 + t3 / 545868 - t4 / 113065000;
  const m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000;
  const mp = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2 + t3 / 69699 - t4 / 14712000;
  const f = 93.272095 + 483202.0175233 * t - 0.0036539 * t2 - t3 / 3526000 + t4 / 863310000;
  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  let s = 0;
  for (const [cd, cm, cmp, cf, c] of MOON) {
    const ef = Math.abs(cm) === 1 ? e : Math.abs(cm) === 2 ? e * e : 1;
    s += c * ef * sinD(cd * d + cm * m + cmp * mp + cf * f);
  }
  s += 3958 * sinD(119.75 + 131.849 * t) + 1962 * sinD(lp - f) + 318 * sinD(53.09 + 479264.29 * t);
  return norm360(lp + s / 1e6);
}

export function lahiri(jdTT: number): number {
  const t = centuries(jdTT);
  return 23.86075 + 1.39697 * t + 0.0003086 * t * t;
}

// ---- angle functions of JD (UT) ----
const tt = (j: number) => j + deltaTDays(j);
export const sunSidereal = (j: number) => { const x = tt(j); return norm360(sunMeanEquinox(x) - lahiri(x)); };
export const moonSidereal = (j: number) => { const x = tt(j); return norm360(moonMeanEquinox(x) - lahiri(x)); };
export const elongation = (j: number) => { const x = tt(j); return norm360(moonMeanEquinox(x) - sunMeanEquinox(x)); };
export const yogaAngle = (j: number) => norm360(sunSidereal(j) + moonSidereal(j));
