/* ==========================================================
   八字排盤計算引擎
   - 干支、五行、十神、長生、納音、旬空等一律用公式
   - 節氣：VSOP87 截斷級數求太陽視黃經（沿用舊版並經驗收用例驗證）
   - 農曆：Meeus 真朔 + 中氣置閏
   ========================================================== */
const Bazi = (() => {
"use strict";

/* ---------------- 1. 編號與基本公式 ---------------- */
const GAN = "甲乙丙丁戊己庚辛壬癸".split("");
const ZHI = "子丑寅卯辰巳午未申酉戌亥".split("");
const WX = "木火土金水".split("");
const SHENGXIAO = "鼠牛虎兔龍蛇馬羊猴雞狗豬".split("");
const mod = (a, n) => ((a % n) + n) % n;

const ganWx = g => g >> 1;                                   // 干：編號整除 2
const ganYang = g => (g & 1) === 0;
const zhiSeason = b => Math.floor(mod(b - 2, 12) / 3);        // 0 春 1 夏 2 秋 3 冬
const SEASON_WX = [0, 1, 3, 4];                               // 木 火 金 水
const zhiWx = b => (mod(b - 2, 12) % 3 === 2) ? 2 : SEASON_WX[zhiSeason(b)]; // 季末為土
const zhiYang = b => (b & 1) === 0;
const gzIndex = (g, b) => ((g & 1) === (b & 1)) ? mod(6 * g - 5 * b, 60) : -1;
const gzName = i => GAN[mod(i, 10)] + ZHI[mod(i, 12)];
const gOf = i => mod(i, 10), bOf = i => mod(i, 12);

/* 十神：(對方五行 − 日主五行) mod 5，陰陽同為偏、異為正 */
const SS_SAME = ["比肩", "食神", "偏財", "七殺", "偏印"];
const SS_DIFF = ["劫財", "傷官", "正財", "正官", "正印"];
const SS_ABBR = { 比肩: "比", 劫財: "劫", 食神: "食", 傷官: "傷", 偏財: "才", 正財: "財", 七殺: "殺", 正官: "官", 偏印: "梟", 正印: "印" };
function tenGod(dm, g) {
  const rel = mod(ganWx(g) - ganWx(dm), 5);
  return ((dm & 1) === (g & 1) ? SS_SAME : SS_DIFF)[rel];
}
/* 藏干（本氣、中氣、餘氣） */
const CANG = [[9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4], [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0]];
const zhiTenGod = (dm, b) => tenGod(dm, CANG[b][0]);

/* 十二長生：陽干順行、陰干逆行；土隨火 */
const CS = ["長生", "沐浴", "冠帶", "臨官", "帝旺", "衰", "病", "死", "墓", "絕", "胎", "養"];
function csStart(g) {
  const s = [0, 1, 1, 2, 3][ganWx(g)];                 // 木 火 土(隨火) 金 水
  return ganYang(g) ? mod(11 + 3 * s, 12) : mod(6 + 3 * s, 12);
}
function csStep(g, b) {
  const st = csStart(g);
  return ganYang(g) ? mod(b - st, 12) : mod(st - b, 12);
}
const changSheng = (g, b) => CS[csStep(g, b)];
const luOf = g => ganYang(g) ? mod(csStart(g) + 3, 12) : mod(csStart(g) - 3, 12); // 臨官 = 祿
const yangRenOf = g => mod(luOf(g) + 1, 12);                                     // 祿前一位

/* 旬空 */
function xunKong(i) { const head = i - mod(i, 10); return [mod(head + 10, 12), mod(head + 11, 12)]; }

/* 納音：大衍數求五行，名稱取 30 組固定名 */
const NAYIN_NAMES = ["海中金", "爐中火", "大林木", "路旁土", "劍鋒金", "山頭火", "澗下水", "城頭土", "白蠟金", "楊柳木",
  "泉中水", "屋上土", "霹靂火", "松柏木", "長流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆燈火", "天河水", "大驛土", "釵釧金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"];
function nayinWx(i) {
  const p = i - mod(i, 2);
  const dg = g => 9 - (g % 5), dz = b => 9 - (b % 6);
  const s = dg(p % 10) + dz(p % 12) + dg((p + 1) % 10) + dz((p + 1) % 12);
  let r = mod(49 - s, 5); if (r === 0) r = 5;
  const HETU = { 1: 4, 2: 1, 3: 0, 4: 3, 5: 2 };          // 河圖數 → 五行
  return mod(HETU[r] + 1, 5);                            // 所生者為納音
}
const nayin = i => NAYIN_NAMES[Math.floor(mod(i, 60) / 2)];

/* 旺相休囚死（以月支五行為令） */
function wangXiang(mb) {
  const w = zhiWx(mb);
  return [[w, "旺"], [mod(w + 1, 5), "相"], [mod(w + 4, 5), "休"], [mod(w + 3, 5), "囚"], [mod(w + 2, 5), "死"]];
}

/* 人元司令（按入節後天數分配；採《淵海子平》常見分野） */
const SILING = {
  2: [[4, 7], [2, 7], [0, 16]], 3: [[0, 10], [1, 20]], 4: [[1, 9], [9, 3], [4, 18]],
  5: [[4, 5], [6, 9], [2, 16]], 6: [[2, 10], [5, 9], [3, 11]], 7: [[3, 9], [1, 3], [5, 18]],
  8: [[5, 7], [4, 3], [8, 3], [6, 17]], 9: [[6, 10], [7, 20]], 10: [[7, 9], [3, 3], [4, 18]],
  11: [[4, 7], [0, 5], [8, 18]], 0: [[8, 10], [9, 20]], 1: [[9, 9], [7, 3], [5, 18]]
};
function siLing(mb, days) {
  let acc = 0; const list = SILING[mb];
  for (const [g, n] of list) { acc += n; if (days < acc) return g; }
  return list[list.length - 1][0];
}

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
/* 節氣時刻算一次就記住：記憶體裡一份；另可掛上外部存放（例如瀏覽器），下次打開就讀存檔。
   TERM_VERSION 跟著曆算公式走，公式一改就換號，舊的存檔自動作廢。 */
const TERM_VERSION = 1;
const termCache = new Map();
let termStore = null;                            // { get(Y) → 24 個 JD 或 null, put(Y, jds) }
function setTermStore(st) { termStore = st && typeof st.get === "function" && typeof st.put === "function" ? st : null; }
function termsOfYear(Y) {                       // 該公曆年的 24 節氣（小寒…冬至）
  if (termCache.has(Y)) return termCache.get(Y);
  let jds = null;
  if (termStore) { try { jds = termStore.get(Y); } catch (e) { jds = null; } }
  if (!Array.isArray(jds) || jds.length !== 24 || !jds.every(Number.isFinite)) {
    jds = TERM_NAMES.map((name, k) => solarTermJD(Y, mod360(285 + 15 * k)));
    if (termStore) { try { termStore.put(Y, jds); } catch (e) { /* 存不了就算了 */ } }
  }
  const arr = TERM_NAMES.map((name, k) => {
    const isJie = k % 2 === 0;
    return { k, name, lon: mod360(285 + 15 * k), jd: jds[k], isJie, branch: isJie ? mod(1 + k / 2, 12) : null, year: Y };
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
const CN_TZ = 8 / 24;
const jdToCnDay = jd => Math.floor(jd + 0.5 + CN_TZ);
const suiCache = new Map();
function suiMonths(Y) {                         // 冬至(Y-1) 所在月 起，到冬至(Y) 所在月之前
  if (suiCache.has(Y)) return suiCache.get(Y);
  const w1 = termsOfYear(Y - 1)[23].jd, w2 = termsOfYear(Y)[23].jd;   // 冬至（與 solarTermJD(Y, 270) 同一算式）
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

/* ---------------- 6. 排盤主體 ---------------- */
/*
 input = { name, sex:'m'|'f', y,m,d,hh,mi,ss, tz(小時), dst, lon, lat, trueSolar, zishi:'day23'|'split' }
 年、月柱以絕對時刻比對節氣；日、時柱以（真太陽時或標準時）鐘面讀數決定。
*/
function buildChart(inp) {
  const tz = inp.tz == null ? 8 : +inp.tz;
  const civil = { y: inp.y, m: inp.m, d: inp.d, hh: inp.hh || 0, mi: inp.mi || 0, ss: inp.ss || 0 };
  const jdCivil = clockToJD(civil);
  const jdUT = jdCivil - tz / 24 - (inp.dst ? 1 / 24 : 0);
  const jdStd = jdUT + tz / 24;                                  // 標準時（已去掉夏令時）
  let jdClock = jdStd, solarOffsetMin = 0, eot = 0;
  const lon = inp.lon == null ? tz * 15 : +inp.lon;
  if (inp.trueSolar) {
    eot = equationOfTime(jdUT);
    solarOffsetMin = (lon - tz * 15) * 4 + eot;
    jdClock = jdStd + solarOffsetMin / 1440;
  }
  const clock = jdToClock(jdClock);
  const std = jdToClock(jdStd);

  // 年、月
  const solarYear = solarYearOf(jdUT);
  const yi = yearGZ(solarYear);
  const { prev: prevJie, next: nextJie } = jieAround(jdUT);
  const mb = prevJie.branch;
  const mi = monthGZ(yi, mb);
  // 日、時
  const zishi = inp.zishi || "day23";
  let dayNum = clock.dayNum;
  const hb = hourBranchOf(clock.hh);
  let hourDay = dayNum;
  if (clock.hh >= 23) {
    if (zishi === "day23") { dayNum += 1; hourDay = dayNum; }
    else { hourDay = dayNum + 1; }                              // 夜子時：日柱不換，時干用次日
  }
  const di = dayGZ(dayNum);
  const hi = hourGZ(dayGZ(hourDay), hb);
  const pillars = [yi, mi, di, hi];
  const dm = di % 10;

  // 農曆（以鐘面日期）
  const lunar = lunarOfDay(clock.dayNum);

  // 起運
  const male = inp.sex !== "f";
  const forward = ganYang(yi % 10) === male;                    // 陽男陰女順
  const target = forward ? nextJie : prevJie;
  const diffMin = Math.abs(target.jd - jdUT) * 1440;
  let rem = diffMin * 120;                                      // 三天折一年 ⇔ 時間 ×120
  const qY = Math.floor(rem / 518400); rem -= qY * 518400;      // 每年 360 天
  const qM = Math.floor(rem / 43200); rem -= qM * 43200;        // 每月 30 天
  const qD = Math.floor(rem / 1440); rem -= qD * 1440;
  const qH = Math.floor(rem / 60);
  const jiao = addCalendar(std, qY, qM, qD, qH);                // 交運（標準時）
  const jiaoJD = clockToJD(jiao) - tz / 24;
  const jiaoSolarYear = solarYearOf(jiaoJD);
  const jiaoStem = yearGZ(jiaoSolarYear) % 10;
  const jiaoJie = jieAround(jiaoJD).prev;
  const jiaoLichun = termsOfYear(jiaoSolarYear)[2];
  const birthYear = civil.y;
  const dayun = [];
  for (let k = 0; k < 10; k++) {
    const st = addCalendar(jiao, 10 * k, 0, 0, 0);
    dayun.push({
      k, idx: mod(mi + (forward ? 1 : -1) * (k + 1), 60),
      startYear: jiao.y + 10 * k, startAge: jiao.y + 10 * k - birthYear + 1,
      startJD: clockToJD(st) - tz / 24
    });
  }
  const yun = {
    forward, diffMin, Y: qY, M: qM, D: qD, H: qH, target,
    jiao, jiaoJD, jiaoStems: [jiaoStem, mod(jiaoStem + 5, 10)],
    jiaoJieName: jiaoJie.name, jiaoDaysAfterJie: Math.floor(jiaoJD - jiaoJie.jd),
    jiaoDaysAfterLichun: Math.floor(jiaoJD - jiaoLichun.jd),
    xiaoYunFrom: birthYear, xiaoYunTo: Math.max(birthYear, jiao.y - 1),
    dayun
  };

  // 司令、旺衰、交節
  const daysSinceJie = jdUT - prevJie.jd;
  const siling = siLing(mb, daysSinceJie);
  const ta = termAround(jdUT);
  const nearJie = (jdUT - prevJie.jd) < (nextJie.jd - jdUT) ? { t: prevJie, after: true, dist: jdUT - prevJie.jd } : { t: nextJie, after: false, dist: nextJie.jd - jdUT };
  const boundary = nearJie.dist < 1 ? nearJie : null;

  // 胎命身
  const extra = taiMingShen(pillars);

  return {
    input: Object.assign({}, inp), tz, lon, lat: inp.lat, civil, std, clock, jdUT, jdClock, solarOffsetMin, eot,
    trueSolar: !!inp.trueSolar, dst: !!inp.dst, zishi, sex: male ? "m" : "f", male,
    pillars, dm, solarYear, lunar, prevJie, nextJie, termAround: ta, daysSinceJie, siling, boundary,
    monthBranch: mb, wangxiang: wangXiang(mb), shengxiao: SHENGXIAO[yi % 12],
    yun, extra, birthYear, hourClockBranch: hb
  };
}

/* 只憑四柱成盤（找不到日期時使用；無大運） */
function chartFromPillars(p, sex) {
  const male = sex !== "f";
  return {
    input: { mode: "sizhu" }, pillarsOnly: true, pillars: p.slice(), dm: p[2] % 10, sex: male ? "m" : "f", male,
    monthBranch: p[1] % 12, wangxiang: wangXiang(p[1] % 12), shengxiao: SHENGXIAO[p[0] % 12], extra: taiMingShen(p)
  };
}

/* 胎元、命宮、身宮、胎息 */
function taiMingShen(p) {
  const [yi, mi, di, hi] = p;
  const taiyuan = gzIndex(mod(mi % 10 + 1, 10), mod(mi % 12 + 3, 12));
  const m1 = mod(mi % 12 - 2, 12) + 1, t1 = mod(hi % 12 - 2, 12) + 1;   // 寅=1 … 丑=12
  const mingN = mod(26 - (m1 + t1) - 1, 12) + 1;
  const shenN = mod(2 + (m1 + t1) - 1, 12) + 1;
  const withStem = n => { const b = mod(n + 1, 12); return monthGZ(yi, b); }; // 五虎遁
  const taixi = gzIndex(mod(di % 10 + 5, 10), mod(1 - di % 12, 12));
  return { taiyuan, minggong: withStem(mingN), shengong: withStem(shenN), taixi };
}

/* ---------------- 7. 歲運 ---------------- */
function currentDayunIndex(chart, jdUT) {       // -1 表示小運期
  const dy = chart.yun.dayun;
  let k = -1;
  for (let i = 0; i < dy.length; i++) if (jdUT >= dy[i].startJD) k = i;
  return k;
}
function dayunIndexForYear(chart, Y) {          // 以年份（大運起始年）歸屬
  const dy = chart.yun.dayun;
  let k = -1;
  for (let i = 0; i < dy.length; i++) if (Y >= dy[i].startYear) k = i;
  return k;
}
function xiaoYun(chart, Y) {
  const age = Y - chart.birthYear + 1;
  return mod(chart.pillars[3] + (chart.yun.forward ? 1 : -1) * age, 60);
}
function liuYue(Y, tzHours) {                   // 某流年的 12 個月（立春起）
  const tz = tzHours == null ? 8 : tzHours;
  const cur = termsOfYear(Y), nxt = termsOfYear(Y + 1);
  const yi = yearGZ(Y);
  const out = [];
  for (let k = 0; k < 12; k++) {
    const t = k < 11 ? cur[2 + 2 * k] : nxt[0];
    const t2 = k < 10 ? cur[4 + 2 * k] : (k === 10 ? nxt[0] : nxt[2]);
    const b = mod(2 + k, 12);
    const c = jdToClock(t.jd + tz / 24), c2 = jdToClock(t2.jd + tz / 24);
    out.push({ k, name: t.name, jd: t.jd, endJD: t2.jd, branch: b, idx: monthGZ(yi, b), clock: c, startDay: c.dayNum, endDay: c2.dayNum - 1 });
  }
  return out;
}
function liuRi(month) {
  const out = [];
  for (let dn = month.startDay; dn <= month.endDay; dn++) { const o = dayNumToYMD(dn); out.push({ dayNum: dn, y: o.y, m: o.m, d: o.d, idx: dayGZ(dn) }); }
  return out;
}
function liuShi(dayNum) {
  const di = dayGZ(dayNum);
  const out = [];
  for (let b = 0; b < 12; b++) out.push({ branch: b, idx: hourGZ(di, b), range: SHICHEN_RANGE(b) });
  return out;
}
/* 「此刻」：以本地時間（tz 小時）定流年、流月、流日、流時（23 點換日） */
function momentOf(jdUT, tzHours) {
  const tz = tzHours == null ? 8 : tzHours;
  const c = jdToClock(jdUT + tz / 24);
  let dayNum = c.dayNum; if (c.hh >= 23) dayNum += 1;
  const Y = solarYearOf(jdUT);
  const months = liuYue(Y, tz);
  let mk = 0; for (const m of months) if (jdUT >= m.jd) mk = m.k;
  return { Y, monthK: mk, dayNum, hourBranch: hourBranchOf(c.hh), clock: c };
}

/* ---------------- 8. 神煞 ---------------- */
/*
 shensha(chart, 干, 支, pos, opt)：pos 是原局第幾柱（0 年 1 月 2 日 3 時），歲運與胎命身傳 -1。
 以某柱地支起查的神煞（年支、月支、日支），不算該柱自己：華蓋、將星、亥月血刃會遇到這種情形。
 查日柱的神煞（魁罡、日德等）只看原局日柱；金神看日柱與時柱。
 流派有分歧的項目由 opt 切換，預設值見 SHA_DEFAULT，說明見 README。
*/
const gzOf = s => gzIndex(GAN.indexOf(s[0]), ZHI.indexOf(s[1]));
const gzSet = list => new Set(list.split(" ").map(gzOf));
const TIANYI = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 8: [3, 5], 9: [3, 5], 7: [6, 2] };
const TAIJI = { 0: [0, 6], 1: [0, 6], 2: [3, 9], 3: [3, 9], 4: [4, 10, 1, 7], 5: [4, 10, 1, 7], 6: [2, 11], 7: [2, 11], 8: [5, 8], 9: [5, 8] };
const WENCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const GUOYIN = [10, 11, 1, 2, 1, 2, 4, 5, 7, 8];                    // 甲戌 乙亥 丙丑 丁寅 戊丑 己寅 庚辰 辛巳 壬未 癸申
const FUXING = {
  sanming: [[2, 0], [1, 3], [2, 0], [11], [8], [7], [6], [5], [4], [1, 3]], // 甲丙寅子 乙癸丑卯 丁亥 戊申 己未 庚午 辛巳 壬辰
  simple: [[2], [1], [0], [9], [8], [7], [6], [5], [4], [3]]               // 甲寅 乙丑 丙子 丁酉 戊申 己未 庚午 辛巳 壬辰 癸卯
};
const TIANCHU_OLD = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11];                // 甲巳 乙午 丙子 丁巳 戊午 己申 庚寅 辛午 壬酉 癸亥
const CIGUAN = "庚寅 辛卯 乙巳 戊午 丁巳 庚午 壬申 癸酉 癸亥 壬戌".split(" ").map(gzOf); // 依日干甲…癸
const NY_XUETANG = [11, 2, 8, 5, 8];                                // 年納音 木亥 火寅 土申 金巳 水申
const NY_CIGUAN = [2, 5, 11, 8, 11];                                // 年納音 木寅 火巳 土亥 金申 水亥
const TIANDE = { 2: ["g", 3], 3: ["z", 8], 4: ["g", 8], 5: ["g", 7], 6: ["z", 11], 7: ["g", 0], 8: ["g", 9], 9: ["z", 2], 10: ["g", 2], 11: ["g", 1], 0: ["z", 5], 1: ["g", 6] };
const XUEREN = { 2: 1, 3: 7, 4: 2, 5: 8, 6: 3, 7: 9, 8: 4, 9: 10, 10: 5, 11: 11, 0: 6, 1: 0 }; // 月支 → 血刃
const juGroup = b => b % 4;                                   // 0 申子辰 1 巳酉丑 2 寅午戌 3 亥卯未
const juStart = grp => mod(8 - 3 * grp, 12);                  // 長生位
const JU_WX = [4, 3, 1, 0];                                   // 水 金 火 木
const fangOf = b => Math.floor(mod(b + 1, 12) / 3);           // 0 亥子丑 1 寅卯辰 2 巳午未 3 申酉戌
const KUIGANG = gzSet("庚辰 庚戌 壬辰 戊戌");
const JINSHEN = gzSet("乙丑 己巳 癸酉");
const YINCHA = gzSet("丙子 丁丑 戊寅 辛卯 壬辰 癸巳 丙午 丁未 戊申 辛酉 壬戌 癸亥");
const SHIE = gzSet("甲辰 乙巳 壬申 丙申 丁亥 庚辰 戊戌 癸亥 辛巳 己丑");
const RIDE = gzSet("甲寅 丙辰 戊辰 庚辰 壬戌");
const TIANSHE = "戊寅 甲午 戊申 甲子".split(" ").map(gzOf);          // 春 夏 秋 冬

const SHENSHA_ORDER = ["天乙貴人", "太極貴人", "天德貴人", "天德合", "月德貴人", "月德合", "文昌貴人", "國印貴人", "福星貴人", "天廚貴人",
  "學堂", "詞館", "金輿", "祿神", "天醫", "將星", "華蓋", "驛馬", "桃花", "紅鸞", "天喜", "天赦", "日德", "魁罡", "金神",
  "羊刃", "血刃", "劫煞", "亡神", "災煞", "孤辰", "寡宿", "勾絞", "元辰", "喪門", "弔客", "陰差陽錯", "十惡大敗", "空亡"];
const SHENSHA_BAD = new Set(["羊刃", "血刃", "劫煞", "亡神", "災煞", "孤辰", "寡宿", "勾絞", "元辰", "喪門", "弔客", "陰差陽錯", "十惡大敗", "空亡"]);
const SHA_DEFAULT = { ganBase: "dy", zhiBase: "dy", tianyiGeng: "chou", yangren: "next", xuetang: "gan", ciguan: "table", fuxing: "sanming", tianchu: "shishen", kong: "dy" };
const SHA_OPTIONS = [
  { k: "ganBase", title: "以干起查（天乙、太極、文昌、國印、福星、天廚、學堂、詞館）", items: [["dy", "日干與年干"], ["d", "只用日干"]] },
  { k: "zhiBase", title: "以支起查（桃花、驛馬、華蓋、將星、劫煞、亡神）", items: [["dy", "年支與日支"], ["y", "只用年支"]] },
  { k: "tianyiGeng", title: "庚日（年）的天乙貴人", items: [["chou", "丑、未（甲戊庚牛羊）"], ["wu", "午、寅（庚辛逢馬虎）"]] },
  { k: "yangren", title: "陰干的羊刃", items: [["next", "祿前一位（乙辰丁己未辛戌癸丑）"], ["rev", "逆行（乙寅丁己巳辛申癸亥）"], ["none", "陰干不取"]] },
  { k: "xuetang", title: "學堂", items: [["gan", "日干長生（甲亥乙午丙戊寅…）"], ["nayin", "年納音長生（金巳木亥水土申火寅）"]] },
  { k: "ciguan", title: "詞館", items: [["table", "古表干支（甲見庚寅、乙見辛卯…）"], ["nayin", "年納音臨官（金申木寅水土亥火巳）"]] },
  { k: "fuxing", title: "福星貴人", items: [["sanming", "甲丙寅子、乙癸丑卯、丁亥…（三命通會）"], ["simple", "甲寅乙丑丙子丁酉…（簡表）"]] },
  { k: "tianchu", title: "天廚貴人", items: [["shishen", "食神之祿（甲巳乙午丙巳丁午…）"], ["old", "古表（丙子丁巳戊午己申…）"]] },
  { k: "kong", title: "空亡", items: [["dy", "日柱與年柱旬空"], ["d", "只看日柱旬空"]] }
];
function shaOpt(o) {
  const r = Object.assign({}, SHA_DEFAULT);
  if (o) for (const it of SHA_OPTIONS) if (it.items.some(x => x[0] === o[it.k])) r[it.k] = o[it.k];
  return r;
}
function shensha(chart, g, b, pos, opt) {
  const o = shaOpt(opt);
  if (pos == null) pos = -1;
  const p = chart.pillars, ds = chart.dm, ys = p[0] % 10, yb = p[0] % 12, mb = p[1] % 12, db = p[2] % 12;
  const idx = gzIndex(g, b);
  const gans = o.ganBase === "d" || ys === ds ? [ds] : [ds, ys];
  const zrefs = o.zhiBase === "y" ? [[yb, 0]] : [[yb, 0], [db, 2]];
  const out = new Set();
  const add = (n, ok) => { if (ok) out.add(n); };
  // 以日干、年干查
  const tianyi = x => (x === 6 && o.tianyiGeng === "wu") ? [6, 2] : TIANYI[x];
  add("天乙貴人", gans.some(x => tianyi(x).includes(b)));
  add("太極貴人", gans.some(x => TAIJI[x].includes(b)));
  add("文昌貴人", gans.some(x => WENCHANG[x] === b));
  add("國印貴人", gans.some(x => GUOYIN[x] === b));
  add("福星貴人", gans.some(x => FUXING[o.fuxing][x].includes(b)));
  add("天廚貴人", gans.some(x => (o.tianchu === "old" ? TIANCHU_OLD[x] : luOf(mod(x + 2, 10))) === b));
  if (o.xuetang === "nayin") add("學堂", b === NY_XUETANG[nayinWx(p[0])]);
  else add("學堂", gans.some(x => csStart(x) === b));
  if (o.ciguan === "nayin") add("詞館", b === NY_CIGUAN[nayinWx(p[0])]);
  else add("詞館", gans.some(x => CIGUAN[x] === idx));
  // 只以日干查
  add("祿神", b === luOf(ds));
  add("金輿", b === mod(luOf(ds) + 2, 12));
  if (ganYang(ds)) add("羊刃", b === yangRenOf(ds));
  else if (o.yangren === "next") add("羊刃", b === yangRenOf(ds));
  else if (o.yangren === "rev") add("羊刃", b === mod(luOf(ds) - 1, 12));
  // 以月支查（不算月柱自己）
  if (pos !== 1) {
    const td = TIANDE[mb];
    add("天德貴人", td[0] === "g" ? g === td[1] : b === td[1]);
    add("天德合", td[0] === "g" ? g === mod(td[1] + 5, 10) : b === mod(1 - td[1], 12));
    add("月德貴人", g === 2 * JU_WX[juGroup(mb)]);
    add("月德合", g === mod(2 * JU_WX[juGroup(mb)] + 5, 10));
    add("天醫", b === mod(mb - 1, 12));
    add("血刃", b === XUEREN[mb]);
  }
  // 以年支、日支查（不算起查那一柱自己）
  for (const [ref, rp] of zrefs) {
    if (pos === rp) continue;
    const st = juStart(juGroup(ref));
    add("桃花", b === mod(st + 1, 12));
    add("亡神", b === mod(st + 3, 12));
    add("將星", b === mod(st + 4, 12));
    add("驛馬", b === mod(st + 6, 12));
    add("華蓋", b === mod(st + 8, 12));
    add("劫煞", b === mod(st + 9, 12));
  }
  // 只以年支查
  if (pos !== 0) {
    add("災煞", b === mod(juStart(juGroup(yb)) + 10, 12));
    add("紅鸞", b === mod(3 - yb, 12));
    add("天喜", b === mod(9 - yb, 12));
    const f = fangOf(yb);
    add("孤辰", b === [2, 5, 8, 11][f]);
    add("寡宿", b === [10, 1, 4, 7][f]);
    add("喪門", b === mod(yb + 2, 12));
    add("弔客", b === mod(yb - 2, 12));
    add("勾絞", b === mod(yb + 3, 12) || b === mod(yb - 3, 12));
    add("元辰", b === mod(yb + (chart.male === ganYang(ys) ? 7 : 5), 12));   // 陽男陰女沖後一位，陰男陽女沖前一位
  }
  // 查日柱、時柱
  if (pos === 2) {
    add("魁罡", KUIGANG.has(idx));
    add("陰差陽錯", YINCHA.has(idx));
    add("十惡大敗", SHIE.has(idx));
    add("日德", RIDE.has(idx));
    add("天赦", idx === TIANSHE[zhiSeason(mb)]);
  }
  if (pos === 2 || pos === 3) add("金神", JINSHEN.has(idx));
  // 空亡
  add("空亡", xunKong(p[2]).includes(b) || (o.kong === "dy" && xunKong(p[0]).includes(b)));
  return SHENSHA_ORDER.filter(n => out.has(n));
}

/* ---------------- 9. 干支關係 ---------------- */
const LIUHE_HUA = { 0: 2, 2: 0, 3: 1, 4: 3, 5: 4, 6: 2 };      // 子丑土 寅亥木 卯戌火 辰酉金 巳申水 午未土
const FANG_START = [2, 8, 5, 11];                            // 三合局 → 所刑之方
function xingTarget(b) {
  const grp = juGroup(b), role = mod(b - juStart(grp), 12) / 4;
  return mod(FANG_START[grp] + role, 12);
}
const isXing = (a, b) => xingTarget(a) === b || xingTarget(b) === a;
const ANHE = new Set(["0-5", "0-10", "1-2", "3-8", "6-11"]);  // 子巳 子戌 丑寅 卯申 午亥
const juRole = b => mod(b - juStart(juGroup(b)), 12) / 4;     // 0 生 1 旺 2 墓

const TYPE_LABEL = {
  sanhui: "三會", sanhe: "三合", chong: "沖", liuhe: "六合", sanxing: "三刑", xing: "刑", banhe: "半合",
  gonghe: "拱合", hai: "害", po: "破", anhe: "暗合", ganhe: "天干五合", ganchong: "天干四沖", ganke: "天干相剋",
  tkdc: "天剋地沖", thdh: "天合地合", fuyin: "伏吟"
};
/* 整柱關係：天剋地沖（干相剋或相沖、支相沖）、天合地合（干五合、支六合）、伏吟（干支全同） */
function pillarRel(x, y) {
  const d = Math.abs(x % 10 - y % 10), a = x % 12, b = y % 12;
  if (x === y) return "fuyin";
  if (Math.abs(a - b) === 6 && (d === 4 || d === 6)) return "tkdc";
  if (d === 5 && a !== b && mod(a + b, 12) === 1) return "thdh";
  return null;
}

/* items: [{key,label,kind:'natal'|'dyn', pos?, layer?, side?, idx}] → 原始關係清單 */
function findRelations(items) {
  const rel = [];
  const n = items.length;
  const G = items.map(it => it.idx % 10), B = items.map(it => it.idx % 12);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = G[i], b = G[j];
    const lo = a <= b ? i : j, hi = lo === i ? j : i;
    const d = Math.abs(a - b);
    if (d === 5) rel.push({ cat: "gan", type: "ganhe", m: [lo, hi], text: `${GAN[G[lo]]}${GAN[G[hi]]}合`, hua: mod(Math.min(a, b) + 2, 5) });
    else if (d === 6) rel.push({ cat: "gan", type: "ganchong", m: [lo, hi], text: `${GAN[G[lo]]}${GAN[G[hi]]}相沖` });
    else if (d === 4) {
      const ki = mod(ganWx(a) + 2, 5) === ganWx(b) ? i : j, kj = ki === i ? j : i;
      rel.push({ cat: "gan", type: "ganke", m: [ki, kj], text: `${GAN[G[ki]]}${GAN[G[kj]]}相剋` });
    }
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const a = B[i], b = B[j];
    const sm = a <= b ? i : j, lg = sm === i ? j : i;
    const S = ZHI[B[sm]], L = ZHI[B[lg]];
    if (a !== b && mod(a + b, 12) === 1) rel.push({ cat: "zhi", type: "liuhe", m: [sm, lg], text: `${S}${L}合`, hua: LIUHE_HUA[Math.min(a, b)] });
    if (Math.abs(a - b) === 6) rel.push({ cat: "zhi", type: "chong", m: [sm, lg], text: `${S}${L}相沖` });
    if (a === b && xingTarget(a) === a) rel.push({ cat: "zhi", type: "xing", m: [i, j], text: `${ZHI[a]}${ZHI[a]}相刑`, self: true });
    else if (a !== b && isXing(a, b)) {
      const both = xingTarget(a) === b && xingTarget(b) === a;
      const f = both ? sm : (xingTarget(a) === b ? i : j), t = f === i ? j : i;
      rel.push({ cat: "zhi", type: "xing", m: [f, t], text: `${ZHI[B[f]]}${ZHI[B[t]]}相刑` });
    }
    if (a !== b && mod(a + b, 12) === 7) rel.push({ cat: "zhi", type: "hai", m: [sm, lg], text: `${S}${L}相害` });
    if (a !== b && mod(b - a, 12) === (zhiYang(a) ? 9 : 3)) {
      const f = zhiYang(a) ? i : j, t = f === i ? j : i;
      rel.push({ cat: "zhi", type: "po", m: [f, t], text: `${ZHI[B[f]]}${ZHI[B[t]]}相破` });
    }
    if (a !== b && juGroup(a) === juGroup(b)) {
      const ra = juRole(a), rb = juRole(b);
      const f = ra < rb ? i : j, t = f === i ? j : i;
      const wx = JU_WX[juGroup(a)];
      if (Math.abs(ra - rb) === 1) rel.push({ cat: "zhi", type: "banhe", m: [f, t], text: `${ZHI[B[f]]}${ZHI[B[t]]}半合`, hua: wx, ju: true });
      else rel.push({ cat: "zhi", type: "gonghe", m: [f, t], text: `${ZHI[B[f]]}${ZHI[B[t]]}拱合`, hua: wx, ju: true });
    }
    if (a !== b && ANHE.has(`${Math.min(a, b)}-${Math.max(a, b)}`)) rel.push({ cat: "zhi", type: "anhe", m: [sm, lg], text: `${S}${L}暗合` });
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const t = pillarRel(items[i].idx, items[j].idx);
    if (!t) continue;
    const nm = x => GAN[G[x]] + ZHI[B[x]];
    rel.push({ cat: "zhu", type: t, m: [i, j], text: t === "fuyin" ? `${nm(i)}伏吟` : `${nm(i)}${nm(j)}${TYPE_LABEL[t]}` });
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const t = [i, j, k], bs = t.map(x => B[x]);
    if (new Set(bs).size !== 3) continue;
    if (bs.every(x => juGroup(x) === juGroup(bs[0]))) {
      const ord = t.slice().sort((p, q) => juRole(B[p]) - juRole(B[q]));
      rel.push({ cat: "zhi", type: "sanhe", m: ord, text: ord.map(x => ZHI[B[x]]).join("") + "三合", hua: JU_WX[juGroup(bs[0])], ju: true });
    }
    if (bs.every(x => zhiSeason(x) === zhiSeason(bs[0]))) {
      const ord = t.slice().sort((p, q) => mod(B[p] - 2, 12) - mod(B[q] - 2, 12));
      rel.push({ cat: "zhi", type: "sanhui", m: ord, text: ord.map(x => ZHI[B[x]]).join("") + "三會", hua: SEASON_WX[zhiSeason(bs[0])], fang: true });
    }
    const key = bs.slice().sort((p, q) => p - q).join(",");
    if (key === "2,5,8" || key === "1,7,10") {
      const ordRef = key === "2,5,8" ? [2, 5, 8] : [1, 10, 7];
      const ord = ordRef.map(v => t[bs.indexOf(v)]);
      rel.push({ cat: "zhi", type: "sanxing", m: ord, text: ord.map(x => ZHI[B[x]]).join("") + "三刑" });
    }
  }
  return rel;
}

/* 整柱關係成立時，同一對柱的天干、地支關係收進整柱那一條（sub），不另計分 */
function foldZhu(raw) {
  const key = r => r.m.slice().sort((a, b) => a - b).join(",");
  const zhu = new Map();
  for (const r of raw) if (r.cat === "zhu") zhu.set(key(r), Object.assign({}, r, { sub: [] }));
  if (!zhu.size) return raw.slice();
  const out = [];
  for (const r of raw) {
    if (r.cat === "zhu") { out.push(zhu.get(key(r))); continue; }
    const host = r.m.length === 2 ? zhu.get(key(r)) : null;
    if (host) host.sub.push(r); else out.push(r);
  }
  return out;
}

/* 權重預設值 */
const DEFAULT_WEIGHTS = {
  type: { sanhui: 10, sanhe: 9, chong: 8, liuhe: 7, sanxing: 7, xing: 6, banhe: 5, gonghe: 4.5, hai: 4, po: 3, anhe: 2, ganhe: 8, ganchong: 8, ganke: 5, tkdc: 9, thdh: 8, fuyin: 6 },
  pos: { adj: 1.0, gap1: 0.7, gap2: 0.5, day: 1.2 },
  layer: { dayun: 1.0, xiaoyun: 0.7, liunian: 0.85, liuyue: 0.6, liuri: 0.4, liushi: 0.25, dyndyn: 0.8 },
  he: { dayStem: 1.5, dayBranch: 1.3, oneDay: 1.0, same: 0.8, other: 0.6 },
  power: { ling: 1.2, kong: 0.7 },
  view: { top: 5, fold: 3.0 }
};

/*
 ctx = { mode:'single'|'pair', charts: {A: chart, B?: chart} }
 items 帶 side（'A'|'B'|'T'），T 為雙方共用的流年月日時
*/
function scoreRelations(raw, items, ctx, W) {
  const out = [];
  const isNatal = it => it.kind === "natal";
  const distCoef = (p, q) => [0, W.pos.adj, W.pos.gap1, W.pos.gap2][Math.abs(p - q)] || W.pos.gap2;
  for (const r of raw) {
    const mem = r.m.map(x => items[x]);
    const natal = mem.filter(isNatal), dyn = mem.filter(x => !isNatal(x));
    let pos;
    if (ctx.mode === "pair") {
      const sides = new Set(mem.filter(x => x.side !== "T").map(x => x.side));
      if (!(sides.has("A") && sides.has("B"))) continue;          // 合盤只看兩人之間
      if (!dyn.length) {
        let sum = 0, cnt = 0;
        for (let i = 0; i < mem.length; i++) for (let j = i + 1; j < mem.length; j++) {
          const x = mem[i], y = mem[j];
          let f;
          if (x.side === y.side) f = distCoef(x.pos, y.pos) * ((x.pos === 2 || y.pos === 2) ? W.pos.day : 1);
          else if (x.pos === 2 && y.pos === 2) f = r.cat === "zhi" ? W.he.dayBranch : W.he.dayStem;
          else if (x.pos === 2 || y.pos === 2) f = W.he.oneDay;
          else if (x.pos === y.pos) f = W.he.same;
          else f = W.he.other;
          sum += f; cnt++;
        }
        pos = sum / cnt;
      } else {
        const lc = Math.min(...dyn.map(x => W.layer[x.layer]));
        pos = lc * (natal.some(x => x.pos === 2) ? W.pos.day : 1) * (natal.length ? 1 : W.layer.dyndyn);
      }
    } else {
      if (!dyn.length) {
        let sum = 0, cnt = 0;
        for (let i = 0; i < natal.length; i++) for (let j = i + 1; j < natal.length; j++) { sum += distCoef(natal[i].pos, natal[j].pos); cnt++; }
        pos = (sum / cnt) * (natal.some(x => x.pos === 2) ? W.pos.day : 1);
      } else {
        const lc = Math.min(...dyn.map(x => W.layer[x.layer]));
        pos = lc * (natal.some(x => x.pos === 2) ? W.pos.day : 1) * (natal.length ? 1 : W.layer.dyndyn);
      }
    }
    // 力量
    let power = 1; const notes = [];
    if (r.hua != null) {
      const months = ctx.mode === "pair" ? [ctx.charts.A, ctx.charts.B] : [ctx.charts.A];
      let bonus = 0;
      for (const c of months) {
        const w = zhiWx(c.monthBranch);
        if (r.hua === w) bonus = Math.max(bonus, W.power.ling - 1);
        else if (r.hua === mod(w + 1, 5)) bonus = Math.max(bonus, (W.power.ling - 1) / 2);
      }
      if (bonus > 0) { power *= 1 + bonus; notes.push(bonus >= W.power.ling - 1 - 1e-9 ? "化神得令" : "化神得相"); }
    }
    if (r.cat === "zhi" || r.cat === "zhu") {                    // 整柱關係含地支，旬空同樣折減
      const kongHit = mem.some(x => {
        const c = ctx.charts[x.side === "B" ? "B" : "A"];
        if (x.side === "T") return [ctx.charts.A, ctx.charts.B].filter(Boolean).some(cc => xunKong(cc.pillars[2]).includes(x.idx % 12));
        return xunKong(c.pillars[2]).includes(x.idx % 12);
      });
      if (kongHit) { power *= W.power.kong; notes.push("旬空"); }
    }
    const typeScore = W.type[r.type];
    const score = typeScore * pos * power;
    out.push(Object.assign({}, r, { members: mem, typeScore, pos, power, score, notes, now: dyn.length > 0 }));
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

/* 留意（精簡字串，去重） */
const ORDER_GAN = ["ganhe", "ganchong", "ganke"];
const ORDER_ZHU = ["tkdc", "thdh", "fuyin"];
const ORDER_ZHI = ["sanhui", "sanhe", "liuhe", "banhe", "gonghe", "anhe", "chong", "sanxing", "xing", "hai", "po"];
function relText(r) {
  if (r.type === "ganhe" || r.type === "liuhe") return `${r.text}（理論化${WX[r.hua]}）`;
  if (r.type === "sanhe" || r.type === "banhe" || r.type === "gonghe") return `${r.text}（${WX[r.hua]}局）`;
  if (r.type === "sanhui") return `${r.text}（${WX[r.hua]}方）`;
  return r.text;
}
function attention(raw) {
  const gan = [], zhi = [], zhu = [];
  for (const t of ORDER_ZHU) for (const r of raw) if (r.type === t) { const s = relText(r); if (!zhu.includes(s)) zhu.push(s); }
  for (const t of ORDER_GAN) for (const r of raw) if (r.type === t) { const s = relText(r); if (!gan.includes(s)) gan.push(s); }
  for (const t of ORDER_ZHI) for (const r of raw) if (r.type === t) { const s = relText(r); if (!zhi.includes(s)) zhi.push(s); }
  return { gan, zhi, zhu };
}

/* ---------------- 10. 四柱反查日期 ---------------- */
function searchPillars(p, opt) {
  opt = opt || {};
  const from = opt.from || 1801, to = opt.to || 2100, tz = opt.tz == null ? 8 : opt.tz, limit = opt.limit || 40;
  const [yi, mi, di, hi] = p;
  if (monthGZ(yi, mi % 12) !== mi) return { error: "月柱與年柱不合（五虎遁）", list: [] };
  if (hourGZ(di, hi % 12) !== hi) return { error: "時柱與日柱不合（五鼠遁）", list: [] };
  const out = [];
  const mb = mi % 12, hb = hi % 12;
  for (let S = from - 1; S <= to; S++) {
    if (yearGZ(S) !== yi) continue;
    const months = liuYue(S, tz);
    const M = months.find(m => m.branch === mb);
    for (let dn = M.startDay - 1; dn <= M.endDay + 1; dn++) {
      if (dayGZ(dn) !== di) continue;
      // 時辰窗口（本地標準時，23 點換日）
      const o = dayNumToYMD(dn);
      const startLocal = toJD(o.y, o.m, o.d, 0) + (hb === 0 ? -1 / 24 : (2 * hb - 1) / 24);
      const a = Math.max(startLocal - tz / 24, M.jd), b = Math.min(startLocal + 2 / 24 - tz / 24, M.endJD);
      if (b <= a) continue;
      const midUT = (a + b) / 2;
      const c1 = jdToClock(a + tz / 24), c2 = jdToClock(b + tz / 24), cm = jdToClock(Math.round((midUT + tz / 24) * 1440) / 1440);
      if (c1.y < from || c1.y > to) continue;
      out.push({ fromJD: a, toJD: b, from: c1, to: c2, mid: cm, cut: (b - a) < 2 / 24 - 1e-6 });
      if (out.length >= limit) break;
    }
  }
  return { error: null, list: out };
}

/* ---------------- 匯出 ---------------- */
return {
  GAN, ZHI, WX, SHENGXIAO, CS, CANG, SS_ABBR, TERM_NAMES, LUNAR_MONTH, LUNAR_DAY, TYPE_LABEL, DEFAULT_WEIGHTS, SHENSHA_ORDER, SHENSHA_BAD, SHA_DEFAULT, SHA_OPTIONS, shaOpt,
  mod, ganWx, ganYang, zhiWx, zhiYang, zhiSeason, gzIndex, gzName, gOf, bOf, tenGod, zhiTenGod, changSheng, csStep, luOf, yangRenOf,
  xunKong, nayin, nayinWx, NAYIN_NAMES, wangXiang, siLing,
  toJD, fromJD, ymdToDayNum, dayNumToYMD, dayGZ, monthLen, deltaT, apparentSunLon, solarTermJD, newMoonJD, equationOfTime,
  termsOfYear, setTermStore, TERM_VERSION, jieAround, termAround, solarYearOf, yearGZ, monthGZ, hourGZ,
  suiMonths, lunarOfDay, lunarMonthsOfYear, lunarToDayNum, lunarText,
  jdToClock, clockToJD, jdNow, addCalendar, hourBranchOf, SHICHEN_RANGE, pad2,
  buildChart, chartFromPillars, taiMingShen, currentDayunIndex, dayunIndexForYear, xiaoYun, liuYue, liuRi, liuShi, momentOf,
  shensha, findRelations, foldZhu, pillarRel, scoreRelations, attention, relText, xingTarget, searchPillars
};
})();
if (typeof module !== "undefined") module.exports = Bazi;
