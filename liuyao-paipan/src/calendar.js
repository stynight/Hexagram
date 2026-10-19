/* ==========================================================
   曆算模組：節氣、農曆、四柱干支
   本檔第 2–5 節逐字沿用同倉庫 bazi-paipan/src/engine.js 的曆算部分
   （VSOP87 截斷級數求太陽視黃經、Espenak–Meeus ΔT、Meeus 真朔、中氣置閏），
   方便兩個工具的節氣與日柱完全一致。驗證見 tests/calendar-check.js。
   ========================================================== */
const Cal = (() => {
"use strict";
const mod = (a, n) => ((a % n) + n) % n;
const gzIndex = (g, b) => ((g & 1) === (b & 1)) ? mod(6 * g - 5 * b, 60) : -1;

/* ---------------- 2. 曆算（沿用舊版） ---------------- */
const RAD = Math.PI / 180;
const mod360 = x => ((x % 360) + 360) % 360;
const sind = d => Math.sin(d * RAD);

function toJD(y, m, d, frac) {
  frac = frac || 0;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 + frac;
}
function fromJD(jd) {
  const z = Math.floor(jd + 0.5), f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) { const al = Math.floor((z - 1867216.25) / 36524.25); a = z + 1 + al - Math.floor(al / 4); }
  const b = a + 1524, c = Math.floor((b - 122.1) / 365.25), dd = Math.floor(365.25 * c),
    e = Math.floor((b - dd) / 30.6001);
  const day = b - dd - Math.floor(30.6001 * e) + f;
  const mo = e < 14 ? e - 1 : e - 13;
  const yr = mo > 2 ? c - 4716 : c - 4715;
  return { y: yr, m: mo, d: Math.floor(day), frac: day - Math.floor(day) };
}
const ymdToDayNum = (y, m, d) => Math.round(toJD(y, m, d, 0) + 0.5);
function dayNumToYMD(n) { const o = fromJD(n); return { y: o.y, m: o.m, d: o.d }; }
const dayGZ = dn => mod(dn + 49, 60);            // 1949-10-01（JDN 2433191）為甲子
const monthLen = (y, m) => ymdToDayNum(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1) - ymdToDayNum(y, m, 1);

/* ΔT（Espenak & Meeus） */
function deltaT(y) {
  let u, t;
  if (y < 1600) { u = (y - 1000) / 100; return 1574.2 - 556.01 * u + 71.23472 * u * u + 0.319781 * u ** 3 - 0.8503463 * u ** 4 - 0.005050998 * u ** 5 + 0.0083572073 * u ** 6; }
  if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129; }
  if (y < 1800) { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
  if (y < 1860) { t = y - 1800; return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t ** 3 - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7; }
  if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (y < 2150) { u = (y - 1820) / 100; return -20 + 32 * u * u - 0.5628 * (2150 - y); }
  u = (y - 1820) / 100; return -20 + 32 * u * u;
}

/* 太陽視黃經（VSOP87 截斷） */
const L0 = [[175347046,0,0],[3341656,4.6692568,6283.07585],[34894,4.6261,12566.1517],[3497,2.7441,5753.3849],[3418,2.8289,3.5231],[3136,3.6277,77713.7715],[2676,4.4181,7860.4194],[2343,6.1352,3930.2097],[1324,0.7425,11506.7698],[1273,2.0371,529.691],[1199,1.1096,1577.3435],[990,5.233,5884.927],[902,2.045,26.298],[857,3.508,398.149],[780,1.179,5223.694],[753,2.533,5507.553],[505,4.583,18849.228],[492,4.205,775.523],[357,2.92,0.067],[317,5.849,11790.629],[284,1.899,796.298],[271,0.315,10977.079],[243,0.345,5486.778],[206,4.806,2544.314],[205,1.869,5573.143],[202,2.458,6069.777],[156,0.833,213.299],[132,3.411,2942.463],[126,1.083,20.775],[115,0.645,0.98],[103,0.636,4694.003],[102,0.976,15720.839],[102,4.267,7.114],[99,6.21,2146.17],[98,0.68,155.42],[86,5.98,161000.69],[85,1.3,6275.96],[85,3.67,71430.7],[80,1.81,17260.15],[79,3.04,12036.46],[75,1.76,5088.63],[74,3.5,3154.69],[74,4.68,801.82],[70,0.83,9437.76],[62,3.98,8827.39],[61,1.82,7084.9],[57,2.78,6286.6],[56,4.39,14143.5],[56,3.47,6279.55],[52,0.19,12139.55],[52,1.33,1748.02],[51,0.28,5856.48],[49,0.49,1194.45],[41,5.37,8429.24],[41,2.4,19651.05],[39,6.17,10447.39],[37,6.04,10213.29],[37,2.57,1059.38],[36,1.71,2352.87],[36,1.78,6812.77],[33,0.59,17789.85],[30,0.44,83996.85],[30,2.74,1349.87],[25,3.16,4690.48]];
const L1 = [[628331966747,0,0],[206059,2.678235,6283.07585],[4303,2.6351,12566.1517],[425,1.59,3.523],[119,5.796,26.298],[109,2.966,1577.344],[93,2.59,18849.23],[72,1.14,529.69],[68,1.87,398.15],[67,4.41,5507.55],[59,2.89,5223.69],[56,2.17,155.42],[45,0.4,796.3],[36,0.47,775.52],[29,2.65,7.11],[21,5.34,0.98],[19,1.85,5486.78],[19,4.97,213.3],[17,2.99,6275.96],[16,0.03,2544.31],[16,1.43,2146.17],[15,1.21,10977.08],[12,2.83,1748.02],[12,3.26,5088.63],[12,5.27,1194.45],[12,2.08,4694],[11,0.77,553.57],[10,1.3,6286.6],[10,4.24,1349.87],[9,2.7,242.73],[9,5.64,951.72],[8,5.3,2352.87],[6,2.65,9437.76],[6,4.67,4690.48]];
const L2 = [[52919,0,0],[8720,1.0721,6283.0758],[309,0.867,12566.152],[27,0.05,3.52],[16,5.19,26.3],[16,3.68,155.42],[10,0.76,18849.23],[9,2.06,77713.77],[7,0.83,775.52],[5,4.66,1577.34],[4,1.03,7.11],[4,3.44,5573.14],[3,5.14,796.3],[3,6.05,5507.55],[3,1.19,242.73],[3,6.12,529.69],[3,0.31,398.15],[3,2.28,553.57],[2,4.38,5223.69],[2,3.75,0.98]];
const L3 = [[289,5.844,6283.076],[35,0,0],[17,5.49,12566.15],[3,5.2,155.42],[1,4.72,3.52],[1,5.3,18849.23],[1,5.97,242.73]];
const L4 = [[114,3.142,0],[8,4.13,6283.08],[1,3.84,12566.15]];
const L5 = [[1,3.14,0]];
const R0 = [[100013989,0,0],[1670700,3.0984635,6283.07585],[13956,3.05525,12566.1517],[3084,5.1985,77713.7715],[1628,1.1739,5753.3849],[1576,2.8469,7860.4194],[925,5.453,11506.77],[542,4.564,3930.21],[472,3.661,5884.927],[346,0.964,5507.553],[329,5.9,5223.694],[307,0.299,5573.143],[243,4.273,11790.629],[212,5.847,1577.344],[186,5.022,10977.079],[175,3.012,18849.228],[110,5.055,5486.778],[98,0.89,6069.78],[86,5.69,15720.84],[86,1.27,161000.69],[65,0.27,17260.15],[63,0.92,529.69],[57,2.01,83996.85],[56,5.24,71430.7],[49,3.25,2544.31],[47,2.58,775.52],[45,5.54,9437.76],[43,6.01,6275.96],[39,5.36,4694],[38,2.39,8827.39],[37,0.83,19651.05],[37,4.9,12139.55],[36,1.67,12036.46],[35,1.84,2942.46],[33,0.24,7084.9],[32,0.18,5088.63],[32,1.78,398.15],[28,1.21,6286.6],[28,1.9,6279.55],[26,4.59,10447.39]];
function sumSer(ser, t) { let s = 0; for (const [a, b, c] of ser) s += a * Math.cos(b + c * t); return s; }

function apparentSunLon(jde) {
  const t = (jde - 2451545) / 365250;
  const L = (sumSer(L0, t) + sumSer(L1, t) * t + sumSer(L2, t) * t * t + sumSer(L3, t) * t ** 3 + sumSer(L4, t) * t ** 4 + sumSer(L5, t) * t ** 5) / 1e8;
  const R = sumSer(R0, t) / 1e8;
  let lon = mod360(L / RAD + 180);
  const T = t * 10;
  lon += -0.09033 / 3600;                                     // FK5
  const Om = 125.04452 - 1934.136261 * T;
  const Ls = 280.4665 + 36000.7698 * T;
  const Lm = 218.3165 + 481267.8813 * T;
  const dpsi = (-17.20 * sind(Om) - 1.32 * sind(2 * Ls) - 0.23 * sind(2 * Lm) + 0.21 * sind(2 * Om)) / 3600; // 章動
  const ab = -20.4898 / 3600 / R;                             // 光行差
  return mod360(lon + dpsi + ab);
}
/* 某公曆年中太陽視黃經達 lon 的時刻（世界時 JD） */
function solarTermJD(year, lon) {
  let jd = toJD(year, 1, 1, 0) + mod360(lon - 280) / 360 * 365.2422;
  for (let i = 0; i < 14; i++) {
    const jde = jd + deltaT(year) / 86400;
    const diff = mod360(lon - apparentSunLon(jde) + 180) - 180;
    jd += diff * 365.2422 / 360;
    if (Math.abs(diff) < 1e-7) break;
  }
  return jd;
}
/* 真朔（Meeus 第 49 章） */
function newMoonJD(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
  let c = 0;
  c += -0.40720 * sind(Mp); c += 0.17241 * E * sind(M); c += 0.01608 * sind(2 * Mp); c += 0.01039 * sind(2 * F);
  c += 0.00739 * E * sind(Mp - M); c += -0.00514 * E * sind(Mp + M); c += 0.00208 * E * E * sind(2 * M);
  c += -0.00111 * sind(Mp - 2 * F); c += -0.00057 * sind(Mp + 2 * F); c += 0.00056 * E * sind(2 * Mp + M);
  c += -0.00042 * sind(3 * Mp); c += 0.00042 * E * sind(M + 2 * F); c += 0.00038 * E * sind(M - 2 * F);
  c += -0.00024 * E * sind(2 * Mp - M); c += -0.00017 * sind(Om); c += -0.00007 * sind(Mp + 2 * M);
  c += 0.00004 * sind(2 * Mp - 2 * F); c += 0.00004 * sind(3 * M); c += 0.00003 * sind(Mp + M - 2 * F);
  c += 0.00003 * sind(2 * Mp + 2 * F); c += -0.00003 * sind(Mp + M + 2 * F); c += 0.00003 * sind(Mp - M + 2 * F);
  c += -0.00002 * sind(Mp - M - 2 * F); c += -0.00002 * sind(3 * Mp + M); c += 0.00002 * sind(4 * Mp);
  const A = [299.77 + 0.107408 * k - 0.009173 * T2, 251.88 + 0.016321 * k, 251.83 + 26.651886 * k,
    349.42 + 36.412478 * k, 84.66 + 18.206239 * k, 141.74 + 53.303771 * k, 207.14 + 2.453732 * k,
    154.84 + 7.306860 * k, 34.52 + 27.261239 * k, 207.19 + 0.121824 * k, 291.34 + 1.844379 * k,
    161.72 + 24.198154 * k, 239.56 + 25.513099 * k, 331.55 + 3.592518 * k];
  const W = [0.000325, 0.000165, 0.000164, 0.000126, 0.000110, 0.000062, 0.000060, 0.000056,
    0.000047, 0.000042, 0.000040, 0.000037, 0.000035, 0.000023];
  for (let i = 0; i < 14; i++) c += W[i] * sind(A[i]);
  jde += c;
  return jde - deltaT(fromJD(jde).y) / 86400;   // → 世界時
}
/* 均時差（分鐘） */
function equationOfTime(jdUT) {
  const jde = jdUT + deltaT(fromJD(jdUT).y) / 86400;
  const T = (jde - 2451545) / 36525;
  const Lm = mod360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const lam = apparentSunLon(jde);
  const eps = 23.439291111 - 0.013004167 * T - 1.6389e-7 * T * T + 5.036e-7 * T ** 3;
  const a = mod360(Math.atan2(Math.cos(eps * RAD) * Math.sin(lam * RAD), Math.cos(lam * RAD)) / RAD);
  let E = Lm - 0.0057183 - a;
  E = ((E + 180) % 360 + 360) % 360 - 180;
  return E * 4;
}

/* ---------------- 3. 節氣 ---------------- */
const TERM_NAMES = ["小寒", "大寒", "立春", "雨水", "驚蟄", "春分", "清明", "穀雨", "立夏", "小滿", "芒種", "夏至",
  "小暑", "大暑", "立秋", "處暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至"];
const termCache = new Map();
function termsOfYear(Y) {                       // 該公曆年的 24 節氣（小寒…冬至）
  if (termCache.has(Y)) return termCache.get(Y);
  const arr = TERM_NAMES.map((name, k) => {
    const lon = mod360(285 + 15 * k);
    const jd = solarTermJD(Y, lon);
    const isJie = k % 2 === 0;
    return { k, name, lon, jd, isJie, branch: isJie ? mod(1 + k / 2, 12) : null, year: Y };
  });
  termCache.set(Y, arr);
  return arr;
}
function jieAround(jdUT) {                      // 前一個節、後一個節
  const Y = fromJD(jdUT).y;
  const list = [];
  for (const yy of [Y - 1, Y, Y + 1]) for (const t of termsOfYear(yy)) if (t.isJie) list.push(t);
  list.sort((a, b) => a.jd - b.jd);
  let prev = null, next = null;
  for (const t of list) { if (t.jd <= jdUT) prev = t; else { next = t; break; } }
  return { prev, next };
}
function termAround(jdUT) {                     // 前後最近的節氣（含中氣）
  const Y = fromJD(jdUT).y;
  const list = [];
  for (const yy of [Y - 1, Y, Y + 1]) for (const t of termsOfYear(yy)) list.push(t);
  list.sort((a, b) => a.jd - b.jd);
  let prev = null, next = null;
  for (const t of list) { if (t.jd <= jdUT) prev = t; else { next = t; break; } }
  return { prev, next };
}
function solarYearOf(jdUT) {
  const Y = fromJD(jdUT).y;
  return jdUT >= termsOfYear(Y)[2].jd ? Y : Y - 1;
}
const yearGZ = Y => mod(Y - 1984, 60);
function monthGZ(yearIdx, mb) {                 // 五虎遁
  const yinStem = mod((yearIdx % 10 % 5) * 2 + 2, 10);
  return gzIndex(mod(yinStem + mod(mb - 2, 12), 10), mb);
}
function hourGZ(dayIdx, hb) {                   // 五鼠遁
  return gzIndex(mod((dayIdx % 10 % 5) * 2 + hb, 10), hb);
}

/* ---------------- 4. 農曆 ---------------- */
/* 民國元年至十七年（1912–1928）的曆書以北京地方平時（東經 116.4°，約 UTC+7:45:36）定朔，其餘年份用東經 120° 標準時。
   這是六爻工具相對八字引擎唯一的改動：1914、1916、1920 年三個朔日落在午夜前後十四分鐘內的月份，因此與官方曆書一致。 */
const JD_1912 = toJD(1912, 1, 1, 0), JD_1929 = toJD(1929, 1, 1, 0);
const jdToCnDay = jd => Math.floor(jd + 0.5 + (jd >= JD_1912 && jd < JD_1929 ? 116.4 / 360 : 8 / 24));
const suiCache = new Map();
function suiMonths(Y) {                         // 冬至(Y-1) 所在月 起，到冬至(Y) 所在月之前
  if (suiCache.has(Y)) return suiCache.get(Y);
  const w1 = solarTermJD(Y - 1, 270), w2 = solarTermJD(Y, 270);
  const ws1 = jdToCnDay(w1), ws2 = jdToCnDay(w2);
  const k0 = Math.floor((w1 - 2451550.09766) / 29.530588861) - 1;
  const nms = [];
  for (let i = 0; i < 17; i++) nms.push(jdToCnDay(newMoonJD(k0 + i)));
  let s = -1, e = -1;
  for (let i = 0; i < nms.length - 1; i++) {
    if (s < 0 && nms[i] <= ws1 && ws1 < nms[i + 1]) s = i;
    if (e < 0 && nms[i] <= ws2 && ws2 < nms[i + 1]) e = i;
  }
  const count = e - s;
  const zq = [];
  for (const yy of [Y - 1, Y]) for (const t of termsOfYear(yy)) if (!t.isJie) zq.push(jdToCnDay(t.jd));
  const months = [];
  let num = 11, leapDone = false, ly = Y - 1;
  for (let i = s; i < e; i++) {
    const a = nms[i], b = nms[i + 1];
    let leap = false;
    if (i > s) {
      if (count === 13 && !leapDone && !zq.some(d => d >= a && d < b)) { leap = true; leapDone = true; }
      if (!leap) { num = num === 12 ? 1 : num + 1; if (num === 1) ly = Y; }
    }
    months.push({ start: a, end: b, num, leap, ly });
  }
  suiCache.set(Y, months);
  return months;
}
function lunarOfDay(dn) {
  const { y } = dayNumToYMD(dn);
  for (const Y of [y, y + 1]) {
    for (const m of suiMonths(Y)) if (dn >= m.start && dn < m.end)
      return { year: m.ly, month: m.num, leap: m.leap, day: dn - m.start + 1, size: m.end - m.start };
  }
  return null;
}
function lunarMonthsOfYear(ly) {                // 某農曆年的所有月份（含閏月）
  const out = [];
  for (const Y of [ly, ly + 1]) for (const m of suiMonths(Y)) if (m.ly === ly) out.push(m);
  out.sort((a, b) => a.start - b.start);
  const seen = new Set();
  return out.filter(m => { const k = m.start; if (seen.has(k)) return false; seen.add(k); return true; });
}
function lunarToDayNum(ly, lm, leap, ld) {
  const m = lunarMonthsOfYear(ly).find(x => x.num === lm && !!x.leap === !!leap);
  if (!m) return null;
  return m.start + Math.min(ld, m.end - m.start) - 1;
}
const LUNAR_MONTH = ["", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "臘月"];
const LUNAR_DAY = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
const lunarText = l => l ? `${l.year}年${l.leap ? "閏" : ""}${LUNAR_MONTH[l.month]}${LUNAR_DAY[l.day]}` : "";

/* ---------------- 5. 時間換算 ---------------- */
const pad2 = n => String(n).padStart(2, "0");
function jdToClock(jd) {                        // 「本地 JD」→ 年月日時分秒
  const t = Math.round((jd + 0.5) * 86400);
  const dayNum = Math.floor(t / 86400);
  const sec = t - dayNum * 86400;
  const { y, m, d } = dayNumToYMD(dayNum);
  return { y, m, d, hh: Math.floor(sec / 3600), mi: Math.floor((sec % 3600) / 60), ss: sec % 60, dayNum };
}
const clockToJD = c => toJD(c.y, c.m, c.d, ((c.hh || 0) + (c.mi || 0) / 60 + (c.ss || 0) / 3600) / 24);
const jdNow = () => 2440587.5 + Date.now() / 86400000;
function addCalendar(c, Y, M, D, H, Mi) {      // 按年、月、日、時順加
  let y = c.y + (Y || 0), m = c.m + (M || 0);
  while (m > 12) { m -= 12; y += 1; }
  const base = toJD(y, m, 1, 0) + (c.d - 1) + ((c.hh || 0) + (c.mi || 0) / 60 + (c.ss || 0) / 3600) / 24;
  return jdToClock(base + (D || 0) + ((H || 0) + (Mi || 0) / 60) / 24);
}
const hourBranchOf = hh => Math.floor((hh + 1) / 2) % 12;
const SHICHEN_RANGE = b => b === 0 ? "23–01" : `${pad2(2 * b - 1)}–${pad2(2 * b + 1)}`;


/* ---------------- 6. 旬空 ---------------- */
function xunKong(i) { const head = i - mod(i, 10); return [mod(head + 10, 12), mod(head + 11, 12)]; }

return {
  mod, gzIndex, toJD, fromJD, ymdToDayNum, dayNumToYMD, dayGZ, monthLen, deltaT, apparentSunLon, solarTermJD, newMoonJD,
  TERM_NAMES, termsOfYear, jieAround, termAround, solarYearOf, yearGZ, monthGZ, hourGZ,
  suiMonths, lunarOfDay, lunarMonthsOfYear, lunarToDayNum, LUNAR_MONTH, LUNAR_DAY, lunarText,
  pad2, jdToClock, clockToJD, jdNow, addCalendar, hourBranchOf, SHICHEN_RANGE, xunKong
};
})();
if (typeof module !== "undefined") module.exports = Cal;
