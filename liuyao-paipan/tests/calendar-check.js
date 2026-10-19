/* 曆算互核：拿 src/calendar.js 與 lunar-javascript（6tail，壽星天文曆系）逐日、逐節氣對照。
   用法：node tests/calendar-check.js [起年] [迄年]
   需要先在本資料夾 npm install（devDependencies 裡有 lunar-javascript）。 */
const path = require("path");
const C = require(path.join(__dirname, "..", "src", "calendar.js"));
let LJ;
try { LJ = require("lunar-javascript"); } catch (e) {
  try { LJ = require(path.join(process.cwd(), "node_modules", "lunar-javascript")); } catch (e2) {
    console.error("找不到 lunar-javascript，請先 npm install。"); process.exit(2);
  }
}
const { Lunar, Solar } = LJ;
const Y0 = +(process.argv[2] || 1901), Y1 = +(process.argv[3] || 2099);
const TZ = 8 / 24;
const pad2 = n => String(n).padStart(2, "0");
const SIMP = { 驚蟄: "惊蛰", 穀雨: "谷雨", 小滿: "小满", 芒種: "芒种", 處暑: "处暑" };

/* 1. 節氣時刻 */
let termN = 0, termMaxSec = 0, termOver60 = [];
for (let Y = Y0; Y <= Y1; Y++) {
  const table = Lunar.fromYmd(Y, 6, 1).getJieQiTable();
  for (const t of C.termsOfYear(Y)) {
    const key = SIMP[t.name] || t.name;
    let s = table[key];
    if (!s || s.getYear() !== Y) {
      // 小寒、大寒、冬至可能落在表的前後段
      const alt = Lunar.fromYmd(Y + (t.k < 2 ? 0 : 0), 1, 15).getJieQiTable()[key];
      if (alt && alt.getYear() === Y) s = alt;
      else { const alt2 = Lunar.fromYmd(Y + 1, 1, 15).getJieQiTable()[key]; if (alt2 && alt2.getYear() === Y) s = alt2; }
    }
    if (!s || s.getYear() !== Y) { console.log("找不到對照節氣", Y, t.name); continue; }
    const refJD = C.toJD(s.getYear(), s.getMonth(), s.getDay(), (s.getHour() + s.getMinute() / 60 + s.getSecond() / 3600) / 24) - TZ;
    const dsec = Math.abs(t.jd - refJD) * 86400;
    termN++;
    if (dsec > termMaxSec) termMaxSec = dsec;
    if (dsec > 60) termOver60.push(`${Y} ${t.name} 差 ${dsec.toFixed(0)} 秒`);
  }
}
console.log(`節氣：${termN} 個，最大差 ${termMaxSec.toFixed(1)} 秒，超過 60 秒的有 ${termOver60.length} 個`);
termOver60.slice(0, 20).forEach(s => console.log("  " + s));

/* 2. 逐日：日柱、農曆 */
let dayN = 0, dayGzBad = 0, lunarBad = [];
for (let dn = C.ymdToDayNum(Y0, 1, 1), end = C.ymdToDayNum(Y1, 12, 31); dn <= end; dn++) {
  const o = C.dayNumToYMD(dn);
  const L = Solar.fromYmd(o.y, o.m, o.d).getLunar();
  dayN++;
  if (C.dayGZ(dn) !== (L.getDayGanIndex() * 6 - L.getDayZhiIndex() * 5 + 600) % 60) dayGzBad++;
  const mine = C.lunarOfDay(dn);
  const m = L.getMonth();
  if (!mine || mine.year !== L.getYear() || mine.month !== Math.abs(m) || mine.leap !== (m < 0) || mine.day !== L.getDay())
    lunarBad.push(`${o.y}-${pad2(o.m)}-${pad2(o.d)} 本工具 ${mine ? C.lunarText(mine) : "無"}｜對照 ${L.getYear()}年${m < 0 ? "閏" : ""}${Math.abs(m)}月${L.getDay()}日`);
}
console.log(`逐日：${dayN} 天，日柱不同 ${dayGzBad} 天，農曆不同 ${lunarBad.length} 天`);
lunarBad.slice(0, 30).forEach(s => console.log("  " + s));

/* 3. 年柱、月柱：每天正午 + 每個節前後 3 分鐘 */
let pillarN = 0, pillarBad = [];
function check(y, m, d, hh, mi) {
  const jdUT = C.toJD(y, m, d, (hh + mi / 60) / 24) - TZ;
  const Ys = C.solarYearOf(jdUT), yi = C.yearGZ(Ys);
  const mb = C.jieAround(jdUT).prev.branch, mIdx = C.monthGZ(yi, mb);
  const L = Solar.fromYmdHms(y, m, d, hh, mi, 0).getLunar();
  pillarN++;
  const a = C.mod(yi, 60), b = C.mod(mIdx, 60);
  const ra = (L.getYearGanIndexExact() * 6 - L.getYearZhiIndexExact() * 5 + 600) % 60;
  const rb = (L.getMonthGanIndexExact() * 6 - L.getMonthZhiIndexExact() * 5 + 600) % 60;
  if (a !== ra || b !== rb) pillarBad.push(`${y}-${pad2(m)}-${pad2(d)} ${pad2(hh)}:${pad2(mi)} 本工具 ${a}/${b} 對照 ${ra}/${rb}`);
}
for (let dn = C.ymdToDayNum(Y0, 1, 1), end = C.ymdToDayNum(Y1, 12, 31); dn <= end; dn += 1) {
  const o = C.dayNumToYMD(dn); check(o.y, o.m, o.d, 12, 0);
}
for (let Y = Y0; Y <= Y1; Y++) for (const t of C.termsOfYear(Y)) {
  if (!t.isJie) continue;
  for (const off of [-3, 3]) {
    const c = C.jdToClock(t.jd + TZ + off / 1440);
    check(c.y, c.m, c.d, c.hh, c.mi);
  }
}
console.log(`年月柱：${pillarN} 個時刻，不同 ${pillarBad.length} 個`);
pillarBad.slice(0, 20).forEach(s => console.log("  " + s));
const ok = termOver60.length === 0 && dayGzBad === 0 && pillarBad.length === 0;
console.log(ok && lunarBad.length === 0 ? "全部一致" : ok ? "節氣、日柱、年月柱一致；農曆差異見上" : "有差異，見上");
process.exitCode = ok ? 0 : 1;
