/* ==========================================================
   六爻納甲排盤計算引擎
   起卦（數字、手動六爻、時間）→ 本卦變卦、八宮世應、納甲、六親、六神、伏神、旬空
   → 月建日辰對各爻、動變、飛伏、三合、卦級沖合反伏 → 依力量排序的關係清單
   規則依據以《增刪卜易》為主（各章名寫在註解裡），進退神、飛伏生剋歌、卦反吟伏吟依《卜筮正宗》。
   ========================================================== */
const Liuyao = (() => {
"use strict";
const C = (typeof Cal !== "undefined") ? Cal : require("./calendar.js");
const { mod } = C;

/* ---------------- 1. 干支與五行 ---------------- */
const GAN = "甲乙丙丁戊己庚辛壬癸".split("");
const ZHI = "子丑寅卯辰巳午未申酉戌亥".split("");
const WX = "木火土金水".split("");                    // 木0 火1 土2 金3 水4；生：+1，剋：+2
const ZHI_WX = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const zhiWx = b => ZHI_WX[b];
const ganWx = g => g >> 1;
const gzName = i => GAN[mod(i, 10)] + ZHI[mod(i, 12)];
const gzOf = (g, b) => C.gzIndex(g, b);
/* a 對 b：same 比和、sheng a生b、ke a剋b、beike b剋a、besheng b生a */
function wxRel(a, b) { return ["same", "sheng", "ke", "beike", "besheng"][mod(b - a, 5)]; }
const isChong = (a, b) => mod(a - b, 12) === 6;
const isHe = (a, b) => a !== b && mod(a + b, 12) === 1;
/* 生旺墓絕（《增刪卜易·生旺墓絕章》：只驗生旺墓絕；土隨水，長生申、旺子、墓辰、絕巳） */
const CS_START = [11, 2, 8, 5, 8];                   // 木亥 火寅 土申 金巳 水申
function csStage(wx, b) {
  const s = mod(b - CS_START[wx], 12);
  return s === 0 ? "長生" : s === 4 ? "帝旺" : s === 8 ? "墓" : s === 9 ? "絕" : null;
}
/* 三合局：申子辰水、亥卯未木、寅午戌火、巳酉丑金 */
const SANHE = [{ m: [8, 0, 4], wx: 4 }, { m: [11, 3, 7], wx: 0 }, { m: [2, 6, 10], wx: 1 }, { m: [5, 9, 1], wx: 3 }];
/* 進神退神（《增刪卜易·進神退神章》） */
const JIN = { 11: 0, 2: 3, 5: 6, 8: 9, 1: 4, 4: 7, 7: 10, 10: 1 };
const TUI = { 0: 11, 3: 2, 6: 5, 9: 8, 4: 1, 7: 4, 10: 7, 1: 10 };

/* ---------------- 2. 八卦與六十四卦 ---------------- */
/* 三爻卦編碼：初爻＝1、二爻＝2、三爻＝4，陽爻為 1 */
const TRI_NAME = ["坤", "震", "坎", "兌", "艮", "離", "巽", "乾"];
const TRI_XIANG = ["地", "雷", "水", "澤", "山", "火", "風", "天"];
const TRI_WX = [2, 0, 4, 3, 2, 1, 0, 3];
const TRI_XT = [8, 4, 6, 2, 7, 3, 5, 1];               // 先天數
const XT_TRI = [null, 7, 3, 5, 1, 6, 2, 4, 0];
const TRI_BY_NAME = Object.fromEntries(TRI_NAME.map((n, i) => [n, i]));
/* 納甲（《增刪卜易·渾天甲子章》）：[內卦天干, 內卦三支, 外卦天干, 外卦三支] */
const NAJIA = [
  [1, [7, 5, 3], 9, [1, 11, 9]],    // 坤 乙未 乙巳 乙卯／癸丑 癸亥 癸酉
  [6, [0, 2, 4], 6, [6, 8, 10]],    // 震 庚子 庚寅 庚辰／庚午 庚申 庚戌
  [4, [2, 4, 6], 4, [8, 10, 0]],    // 坎 戊寅 戊辰 戊午／戊申 戊戌 戊子
  [3, [5, 3, 1], 3, [11, 9, 7]],    // 兌 丁巳 丁卯 丁丑／丁亥 丁酉 丁未
  [2, [4, 6, 8], 2, [10, 0, 2]],    // 艮 丙辰 丙午 丙申／丙戌 丙子 丙寅
  [5, [3, 1, 11], 5, [9, 7, 5]],    // 離 己卯 己丑 己亥／己酉 己未 己巳
  [7, [1, 11, 9], 7, [7, 5, 3]],    // 巽 辛丑 辛亥 辛酉／辛未 辛巳 辛卯
  [0, [0, 2, 4], 8, [6, 8, 10]]     // 乾 甲子 甲寅 甲辰／壬午 壬申 壬戌
];
/* 文王卦序：上卦、下卦 */
const KW_PAIRS = "乾乾 坤坤 坎震 艮坎 坎乾 乾坎 坤坎 坎坤 巽乾 乾兌 坤乾 乾坤 乾離 離乾 坤艮 震坤 兌震 艮巽 坤兌 巽坤 離震 艮離 艮坤 坤震 乾震 艮乾 艮震 兌巽 坎坎 離離 兌艮 震巽 乾艮 震乾 離坤 坤離 巽離 離兌 坎艮 震坎 艮兌 巽震 兌乾 乾巽 兌坤 坤巽 兌坎 坎巽 兌離 離巽 震震 艮艮 巽艮 震兌 震離 離艮 巽巽 兌兌 巽坎 坎兌 巽兌 震艮 坎離 離坎".split(" ");
const KW_NAMES = "乾 坤 屯 蒙 需 訟 師 比 小畜 履 泰 否 同人 大有 謙 豫 隨 蠱 臨 觀 噬嗑 賁 剝 復 无妄 大畜 頤 大過 坎 離 咸 恆 遯 大壯 晉 明夷 家人 睽 蹇 解 損 益 夬 姤 萃 升 困 井 革 鼎 震 艮 漸 歸妹 豐 旅 巽 兌 渙 節 中孚 小過 既濟 未濟".split(" ");
const KW_OF_BITS = new Array(64);
const BITS_OF_KW = new Array(65);
KW_PAIRS.forEach((p, i) => {
  const up = TRI_BY_NAME[p[0]], lo = TRI_BY_NAME[p[1]];
  const bits = lo | (up << 3);
  KW_OF_BITS[bits] = i + 1; BITS_OF_KW[i + 1] = bits;
});
const lowerOf = bits => bits & 7, upperOf = bits => bits >> 3;
function fullName(bits) {
  const up = upperOf(bits), lo = lowerOf(bits), n = KW_NAMES[KW_OF_BITS[bits] - 1];
  if (up === lo) return `${TRI_NAME[up]}為${TRI_XIANG[up]}`;
  return TRI_XIANG[up] + TRI_XIANG[lo] + n;
}
/* 八宮（京房）：乾 坎 艮 震 巽 離 坤 兌；本宮→一世…五世→遊魂→歸魂 */
const PALACE_ORDER = [7, 2, 4, 1, 6, 5, 0, 3];
const GEN_NAMES = ["八純", "一世", "二世", "三世", "四世", "五世", "遊魂", "歸魂"];
const GEN_SHI = [6, 1, 2, 3, 4, 5, 4, 3];
const PALACE_OF = new Array(64);
for (const t of PALACE_ORDER) {
  const seq = [];
  let h = t | (t << 3); seq.push(h);
  h ^= 1; seq.push(h); h ^= 2; seq.push(h); h ^= 4; seq.push(h); h ^= 8; seq.push(h); h ^= 16; seq.push(h);
  h ^= 8; seq.push(h);
  seq.push((h & 56) | t);
  seq.forEach((b, gen) => { PALACE_OF[b] = { palace: t, gen, shi: GEN_SHI[gen], ying: mod(GEN_SHI[gen] + 2, 6) + 1 }; });
}
/* 一卦六爻的納甲 */
function najiaOf(bits) {
  const lo = NAJIA[lowerOf(bits)], up = NAJIA[upperOf(bits)];
  const out = [];
  for (let k = 0; k < 3; k++) out.push({ g: lo[0], b: lo[1][k] });
  for (let k = 0; k < 3; k++) out.push({ g: up[2], b: up[3][k] });
  return out;
}
const LIUQIN = ["兄弟", "子孫", "妻財", "官鬼", "父母"];       // (爻五行 − 我) mod 5
const liuqinOf = (meWx, wx) => LIUQIN[mod(wx - meWx, 5)];
const LIUSHEN = ["青龍", "朱雀", "勾陳", "螣蛇", "白虎", "玄武"];
const LIUSHEN_START = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5];        // 甲乙青龍、丙丁朱雀、戊勾陳、己螣蛇、庚辛白虎、壬癸玄武
/* 六沖卦、六合卦：初四、二五、三上三對地支皆沖（合） */
function pairKind(bits) {
  const L = najiaOf(bits);
  if ([0, 1, 2].every(k => isChong(L[k].b, L[k + 3].b))) return "六沖";
  if ([0, 1, 2].every(k => isHe(L[k].b, L[k + 3].b))) return "六合";
  return null;
}
function hexInfo(bits) {
  const kw = KW_OF_BITS[bits], pal = PALACE_OF[bits];
  return {
    bits, kw, name: KW_NAMES[kw - 1], full: fullName(bits), upper: upperOf(bits), lower: lowerOf(bits),
    palace: pal.palace, palaceName: TRI_NAME[pal.palace], palaceWx: TRI_WX[pal.palace], gen: pal.gen, genName: GEN_NAMES[pal.gen],
    shi: pal.shi, ying: pal.ying, pair: pairKind(bits), najia: najiaOf(bits)
  };
}
/* 爻名：初九、六二…上六 */
const POS_NAME = ["初", "二", "三", "四", "五", "上"];
function yaoName(pos, yang) { const n = yang ? "九" : "六"; return pos === 0 ? "初" + n : pos === 5 ? "上" + n : n + POS_NAME[pos]; }
const POS_SHORT = ["初爻", "二爻", "三爻", "四爻", "五爻", "上爻"];

/* ---------------- 3. 起卦 ---------------- */
/* 爻值：6 老陰（動）、7 少陽、8 少陰、9 老陽（動） */
const isYang = v => v === 7 || v === 9;
const isMoving = v => v === 6 || v === 9;
const YAO_LABEL = { 6: "老陰", 7: "少陽", 8: "少陰", 9: "老陽" };
function bigMod(str, n) {                         // 大整數取餘，餘 0 取 n
  const v = BigInt(str) % BigInt(n);
  return v === 0n ? n : Number(v);
}
function validNum(s) { return typeof s === "string" ? /^\d{1,60}$/.test(s.trim()) && BigInt(s.trim()) > 0n : Number.isInteger(s) && s > 0; }
/* 數字起卦：第一數上卦、第二數下卦，三數之和除 6 取動爻（餘 0 取上爻） */
function castNumbers(a, b, c) {
  const s = [a, b, c].map(x => String(x).trim());
  if (!s.every(validNum)) return { error: "請填三個正整數" };
  const up = bigMod(s[0], 8), lo = bigMod(s[1], 8);
  const sum = (BigInt(s[0]) + BigInt(s[1]) + BigInt(s[2])).toString();
  const mv = bigMod(sum, 6);
  return linesFrom(XT_TRI[up], XT_TRI[lo], [mv], {
    method: "number", nums: s, steps: [
      { label: "上卦", expr: `${s[0]} ÷ 8`, rem: up % 8, use: up, tri: XT_TRI[up] },
      { label: "下卦", expr: `${s[1]} ÷ 8`, rem: lo % 8, use: lo, tri: XT_TRI[lo] },
      { label: "動爻", expr: `(${s[0]} + ${s[1]} + ${s[2]}) = ${sum} ÷ 6`, rem: mv % 6, use: mv }
    ]
  });
}
function linesFrom(upTri, loTri, movingPositions, detail) {
  const bits = loTri | (upTri << 3);
  const lines = [];
  for (let k = 0; k < 6; k++) {
    const yang = (bits >> k) & 1, mv = movingPositions.includes(k + 1);
    lines.push(yang ? (mv ? 9 : 7) : (mv ? 6 : 8));
  }
  return { lines, detail };
}
/* 時間起卦（梅花易數）：(年支數＋農曆月＋農曆日)÷8 上卦；再加時支數 ÷8 下卦；總數 ÷6 動爻。
   年取農曆年地支；閏月以本月數計；時支數子=1…亥=12。 */
function castTime(mom) {
  const L = mom.lunar;
  if (!L) return { error: "這一天查不到農曆" };
  const yb = mod(L.year - 4, 12);                       // 農曆年地支（1984 甲子）
  const Y = yb + 1, M = L.month, D = L.day, H = mom.hourBranch + 1;
  const s1 = Y + M + D, s2 = s1 + H;
  const up = mod(s1 - 1, 8) + 1, lo = mod(s2 - 1, 8) + 1, mv = mod(s2 - 1, 6) + 1;
  return linesFrom(XT_TRI[up], XT_TRI[lo], [mv], {
    method: "time", Y, M, D, H, yb, leap: L.leap, steps: [
      { label: "上卦", expr: `年${ZHI[yb]}${Y} + ${L.leap ? "閏" : ""}${M}月 + ${D}日 = ${s1} ÷ 8`, rem: s1 % 8, use: up, tri: XT_TRI[up] },
      { label: "下卦", expr: `${s1} + ${ZHI[mom.hourBranch]}時${H} = ${s2} ÷ 8`, rem: s2 % 8, use: lo, tri: XT_TRI[lo] },
      { label: "動爻", expr: `${s2} ÷ 6`, rem: s2 % 6, use: mv }
    ]
  });
}
function castManual(values) {
  if (!Array.isArray(values) || values.length !== 6 || !values.every(v => [6, 7, 8, 9].includes(v))) return { error: "六個爻都要選" };
  return { lines: values.slice(), detail: { method: "manual" } };
}

/* ---------------- 4. 時間 ---------------- */
/* inp = { y, m, d, hh, mi, tz（小時）, zishi: 'day23'（23 點換日）| 'split'（夜子時不換日） } */
function moment(inp) {
  const tz = +inp.tz;
  const civil = { y: inp.y, m: inp.m, d: inp.d, hh: inp.hh || 0, mi: inp.mi || 0, ss: 0 };
  const jdLocal = C.clockToJD(civil);
  const jdUT = jdLocal - tz / 24;
  const clock = C.jdToClock(jdLocal);
  const solarYear = C.solarYearOf(jdUT);
  const yi = C.yearGZ(solarYear);
  const { prev: prevJie, next: nextJie } = C.jieAround(jdUT);
  const mb = prevJie.branch;
  const mi = C.monthGZ(yi, mb);
  const hb = C.hourBranchOf(clock.hh);
  let dayNum = clock.dayNum, hourDay = clock.dayNum;
  const zishi = inp.zishi === "split" ? "split" : "day23";
  if (clock.hh >= 23) { if (zishi === "day23") { dayNum += 1; hourDay = dayNum; } else hourDay = dayNum + 1; }
  const di = C.dayGZ(dayNum), hi = C.hourGZ(C.dayGZ(hourDay), hb);
  const lunar = C.lunarOfDay(dayNum);
  const term = C.termAround(jdUT);
  return {
    input: Object.assign({}, inp), tz, zishi, jdUT, clock, dayNum, solarYear,
    pillars: [yi, mi, di, hi], yearIdx: yi, monthIdx: mi, dayIdx: di, hourIdx: hi,
    monthBranch: mb, dayBranch: di % 12, dayStem: di % 10, hourBranch: hb,
    xunkong: C.xunKong(di), lunar, prevJie, nextJie, prevTerm: term.prev, nextTerm: term.next,
    lateZi: clock.hh >= 23
  };
}

/* ---------------- 5. 旺衰 ---------------- */
/* 月令（《增刪卜易·四時旺相章》《月將章》）：臨月建、同類為旺，月生為相；月沖為月破、月合為月合 */
function monthState(mb, b) {
  const mw = zhiWx(mb), w = zhiWx(b);
  if (b === mb) return { key: "lin", text: "臨月建", wang: true };
  if (isChong(mb, b)) return { key: "po", text: "月破", wang: false };
  if (isHe(mb, b)) return { key: "he", text: "月合", wang: true };
  const r = wxRel(mw, w);
  if (r === "same") return { key: "fu", text: "旺", wang: true };
  if (r === "sheng") return { key: "xiang", text: "相", wang: true };
  if (r === "besheng") return { key: "xiu", text: "休", wang: false, yuqi: (mb === 7 && w === 1) || (mb === 1 && w === 4) };
  if (r === "beike") return { key: "qiu", text: "囚", wang: false };
  return { key: "si", text: "死", wang: false };            // 月剋爻
}
const MONTH_F = { lin: 1.0, fu: 0.95, xiang: 0.85, he: 0.85, xiu: 0.6, qiu: 0.55, si: 0.5, po: 0.4 };
function dayRel(db, b) {
  const dw = zhiWx(db), w = zhiWx(b);
  if (b === db) return "lin";
  if (isChong(db, b)) return "chong";
  if (isHe(db, b)) return "he";
  const r = wxRel(dw, w);
  return { same: "fu", sheng: "sheng", ke: "ke", beike: "hao", besheng: "xie" }[r];
}

/* ---------------- 6. 排盤 ---------------- */
function build(cast, mom) {
  const vals = cast.lines;
  let bits = 0, cbits = 0;
  const moving = [];
  vals.forEach((v, k) => {
    if (isYang(v)) bits |= 1 << k;
    if (isMoving(v)) moving.push(k);
  });
  cbits = bits; for (const k of moving) cbits ^= 1 << k;
  const ben = hexInfo(bits), bian = moving.length ? hexInfo(cbits) : null;
  const meWx = ben.palaceWx;
  const mb = mom.monthBranch, db = mom.dayBranch, kong = mom.xunkong;
  const shenStart = LIUSHEN_START[mom.dayStem];
  const lines = ben.najia.map((nj, k) => {
    const yang = isYang(vals[k]), mv = isMoving(vals[k]);
    const wx = zhiWx(nj.b);
    const L = {
      pos: k, posName: POS_SHORT[k], yaoName: yaoName(k, yang), value: vals[k], yang, moving: mv,
      g: nj.g, b: nj.b, wx, qin: liuqinOf(meWx, wx), shen: LIUSHEN[(shenStart + k) % 6],
      shi: ben.shi === k + 1, ying: ben.ying === k + 1,
      kong: kong.includes(nj.b), month: monthState(mb, nj.b), day: dayRel(db, nj.b),
      dayStage: csStage(wx, db)
    };
    if (mv) {
      const cn = bian.najia[k];
      const cwx = zhiWx(cn.b);
      L.change = {
        pos: k, g: cn.g, b: cn.b, wx: cwx, qin: liuqinOf(meWx, cwx), yang: !yang,
        kong: kong.includes(cn.b), month: monthState(mb, cn.b), day: dayRel(db, cn.b), dayStage: csStage(cwx, db)
      };
    }
    return L;
  });
  /* 伏神：本卦缺的六親，取本宮首卦同一六親所在之爻，伏於本卦同位之下（《火珠林》：本宮之六親在飛象之下為伏神） */
  const present = new Set(lines.map(l => l.qin));
  const shou = hexInfo(ben.palace | (ben.palace << 3));
  const fu = [];
  shou.najia.forEach((nj, k) => {
    const wx = zhiWx(nj.b), q = liuqinOf(meWx, wx);
    if (!present.has(q)) {
      const F = { pos: k, g: nj.g, b: nj.b, wx, qin: q, kong: kong.includes(nj.b), month: monthState(mb, nj.b), day: dayRel(db, nj.b), dayStage: csStage(wx, db) };
      F.fei = lines[k];
      lines[k].fu = F;
      fu.push(F);
    }
  });
  /* 爻的動態（《增刪卜易·暗動章》《動散章》《六合章》）：
     靜爻旺相逢日沖為暗動、休囚為日破；旬空逢日沖為沖空則實（旺相者兼作暗動）；
     動爻逢日沖，旺相不散、休囚恐散；靜而逢日合為合起，動而逢日合為合絆 */
  for (const L of lines) {
    L.wang = L.month.wang;                                         // 旺相休囚以月令定
    if (L.day === "chong") {
      if (L.moving) L.dayChong = L.wang ? "notsan" : "san";
      else if (L.kong) { L.dayChong = "kongshi"; L.andong = L.wang; }
      else if (L.wang) { L.dayChong = "andong"; L.andong = true; }
      else { L.dayChong = "ripo"; L.ripo = true; }
    }
    if (L.day === "he") L.dayHe = L.moving ? "ban" : "qi";
  }
  /* 動變 */
  for (const L of lines) if (L.moving) L.hua = huaOf(L, mom);
  const out = { cast, mom, ben, bian, shou, lines, fu, moving, meWx };
  out.lineForce = lines.map(L => lineForce(L));
  out.relations = relations(out);
  out.summary = summarize(out);
  return out;
}

/* 動爻化出的關係：回頭生剋沖合、進退、生旺墓絕、化空、化破、伏吟 */
function huaOf(L, mom) {
  const c = L.change, res = [];
  const r = wxRel(c.wx, L.wx);                       // 變爻對動爻
  if (c.b === L.b) res.push({ key: "fuyin", text: "化伏吟", note: "變爻與動爻同支" });
  if (isChong(c.b, L.b)) res.push({ key: "chong", text: "回頭沖", note: "變爻沖本位，爻之反吟" });
  if (isHe(c.b, L.b)) res.push({ key: "he", text: "回頭合", note: "爻動化出之爻回頭相合，謂之化扶" });
  if (JIN[L.b] === c.b) res.push({ key: "jin", text: "化進神" });
  if (TUI[L.b] === c.b) res.push({ key: "tui", text: "化退神" });
  if (r === "sheng") res.push({ key: "sheng", text: "回頭生" });
  if (r === "ke") res.push({ key: "ke", text: "回頭剋" });
  if (r === "besheng") res.push({ key: "xie", text: "化洩", note: "動爻生變爻" });
  if (r === "beike") res.push({ key: "hao", text: "化耗", note: "動爻剋變爻" });
  if (r === "same" && c.b !== L.b && JIN[L.b] !== c.b && TUI[L.b] !== c.b) res.push({ key: "bihe", text: "化比和" });
  const st = csStage(L.wx, c.b);
  if (st === "長生") res.push({ key: "zhangsheng", text: "化長生" });
  if (st === "帝旺") res.push({ key: "diwang", text: "化帝旺" });
  if (st === "墓") res.push({ key: "mu", text: "化墓" });
  if (st === "絕") res.push({ key: "jue", text: "化絕" });
  if (c.kong) res.push({ key: "kong", text: "化空" });
  if (isChong(mom.monthBranch, c.b)) res.push({ key: "po", text: "化破" });
  return res;
}
const hasHua = (L, k) => L.hua && L.hua.some(h => h.key === k);

/* 動爻或暗動爻作為施力者的力量係數（0.2–1.2） */
function lineForce(L) {
  let f = MONTH_F[L.month.key];
  if (L.day === "lin") f += 0.15; else if (L.day === "sheng") f += 0.1; else if (L.day === "fu") f += 0.05; else if (L.day === "ke") f -= 0.15;
  if (L.moving) {
    if (L.dayHe === "ban") f *= 0.6;
    if (L.dayChong === "san") f *= 0.7;
    if (hasHua(L, "ke")) f *= 0.6;
    if (hasHua(L, "chong")) f *= 0.75;
    if (hasHua(L, "tui")) f *= 0.8;
    if (hasHua(L, "po")) f *= 0.7;
    if (hasHua(L, "kong")) f *= 0.8;
    if (hasHua(L, "jue") || hasHua(L, "mu")) f *= 0.8;
    if (hasHua(L, "sheng") || hasHua(L, "jin")) f *= 1.1;
  }
  return Math.max(0.2, Math.min(1.2, f));
}

/* ---------------- 7. 關係清單 ---------------- */
/* group: 'hc' 合沖、'sk' 生剋、'kong' 旬空。score 0–100 為力量，排序用。 */
const wxN = w => WX[w];
const bName = b => ZHI[b] + WX[zhiWx(b)];
function who(L) {
  const t = [];
  if (L.shi) t.push("世"); if (L.ying) t.push("應");
  return `${L.posName}${GAN[L.g]}${bName(L.b)}${L.qin}${t.length ? "（" + t.join("、") + "）" : ""}`;
}
function whoChange(L) { const c = L.change; return `${L.posName}變爻${GAN[c.g]}${bName(c.b)}${c.qin}`; }
function whoFu(F) { return `伏神${GAN[F.g]}${bName(F.b)}${F.qin}（伏${POS_SHORT[F.pos]}下）`; }
function relations(ch) {
  const R = [];
  const { lines, mom, ben, bian } = ch;
  const mb = mom.monthBranch, db = mom.dayBranch;
  const M = `月建${ZHI[mb]}${WX[zhiWx(mb)]}`, D = `日辰${gzName(mom.dayIdx)}`;
  const add = (o) => { o.score = Math.round(Math.max(1, Math.min(100, o.score))); R.push(o); };
  /* 7.1 月建 → 各爻、變爻、伏神 */
  const monthItems = (target, label, kind, base) => {
    const st = target.month;
    const sub = { line: "爻", change: "變爻", fu: "伏神" }[kind];
    if (st.key === "po") {
      const extra = kind === "change" ? "，化破" : "";
      add({ group: "hc", type: "月破", actor: "M", target: label, kind, pos: target.pos, score: base * 1.0,
        title: `${M}沖${label}`, verdict: kind === "change" ? "化破" : "月破",
        note: `月建沖爻即為月破，${sub}目下無力${target.day === "lin" ? "；但臨日辰，逢破不破" : ""}${extra}` });
    } else if (st.key === "he") {
      add({ group: "hc", type: "月合", actor: "M", target: label, kind, pos: target.pos, score: base * 0.82,
        title: `${M}合${label}`, verdict: "月合", note: "月建合爻為月合，有用之爻" });
    } else {
      const map = {
        lin: ["臨月建", 0.9, "爻值月建，旺"], fu: ["月扶", 0.66, "與月建同五行，旺（次於臨月）"],
        xiang: ["月生", 0.78, "月建生之，相"], si: ["月剋", 0.84, "月建剋之，受制"],
        xiu: ["生月（休）", 0.3, st.yuqi ? "爻生月建，休；《增刪卜易》謂此月尚有餘氣" : "爻生月建，休"],
        qiu: ["剋月（囚）", 0.26, "爻剋月建，囚"]
      }[st.key];
      add({ group: "sk", type: map[0], actor: "M", target: label, kind, pos: target.pos, score: base * map[1],
        title: `${M}與${label}`, verdict: map[0], note: map[2] });
    }
  };
  /* 7.2 日辰 → 各爻、變爻、伏神 */
  const dayItems = (target, label, kind, base) => {
    const rel = target.day;
    if (rel === "chong") {
      let verdict, note, s = base;
      if (kind === "line" && !target.moving) {
        if (target.kong) { verdict = target.wang ? "沖空則實（暗動）" : "沖空則實"; note = "爻遇旬空，日辰沖起而有用，謂之沖空則實"; s *= 0.92; }
        else if (target.wang) { verdict = "暗動"; note = "靜爻旺相，日辰沖之為暗動"; s *= 0.95; }
        else { verdict = "日破"; note = "靜爻休囚，日辰沖之為日破，愈加無用"; s *= 0.95; }
      } else if (kind === "line") {
        if (target.dayChong === "san") { verdict = "沖散之虞"; note = "動爻休囚逢日沖，間有沖散（《增刪卜易·動散章》）"; s *= 0.86; }
        else { verdict = "沖而不散"; note = "動爻旺相，日沖不散，愈彊"; s *= 0.7; }
      } else if (kind === "change") { verdict = "日沖變爻"; note = "日辰能沖變爻，變爻之力受制"; s *= 0.8; }
      else { verdict = "日沖伏神"; note = "日辰沖伏神"; s *= 0.7; }
      add({ group: "hc", type: "日沖", actor: "D", target: label, kind, pos: target.pos, score: s, title: `${D}沖${label}`, verdict, note });
    } else if (rel === "he") {
      let verdict, note, s = base * 0.84;
      if (kind === "line" && target.moving) { verdict = "合絆"; note = "動而逢合謂之合絆，暫不能動，待沖開"; }
      else if (kind === "line") { verdict = "合起"; note = target.wang ? "靜而逢合謂之合起" : "靜而逢合謂之合起，休囚亦有旺相之意"; }
      else if (kind === "change") { verdict = "日合變爻"; note = "日辰合變爻"; s *= 0.85; }
      else { verdict = "日合伏神"; note = "日辰合伏神，伏神得合而起"; s *= 0.85; }
      add({ group: "hc", type: "日合", actor: "D", target: label, kind, pos: target.pos, score: s, title: `${D}合${label}`, verdict, note });
    } else {
      const map = {
        lin: ["臨日", 0.9, "爻臨日辰，旺；逢月破而不破"], fu: ["日扶", 0.66, "與日辰同五行，得扶"],
        sheng: ["日生", 0.8, "日辰生之，有力"], ke: ["日剋", 0.86, "日辰剋之，受傷"],
        xie: ["生日（洩）", 0.3, "爻生日辰，洩氣"], hao: ["剋日（耗）", 0.26, "爻剋日辰，耗力；爻傷日辰，徒受其名"]
      }[rel];
      add({ group: "sk", type: map[0], actor: "D", target: label, kind, pos: target.pos, score: base * map[1], title: `${D}與${label}`, verdict: map[0], note: map[2] });
    }
    const st = target.b === db ? null : target.dayStage;          // 臨日已含旺意，不再重列生旺墓絕
    if (st) {
      const m = { 長生: ["長生於日", 0.66, "爻長生於日辰"], 帝旺: ["帝旺於日", 0.7, "爻帝旺於日辰"], 墓: ["入日墓", 0.76, "爻墓於日辰，墓中人不沖不發"], 絕: ["絕於日", 0.72, "爻絕於日辰；旺相或得生扶者逢絕不絕"] }[st];
      add({ group: "sk", type: m[0], actor: "D", target: label, kind, pos: target.pos, score: base * m[1], title: `${D}與${label}`, verdict: m[0], note: m[2] });
    }
  };
  for (const L of lines) {
    monthItems(L, who(L), "line", 100);
    dayItems(L, who(L), "line", 100);
    if (L.moving) { monthItems(L.change, whoChange(L), "change", 92); dayItems(L.change, whoChange(L), "change", 92); }
    if (L.fu) { monthItems(L.fu, whoFu(L.fu), "fu", 80); dayItems(L.fu, whoFu(L.fu), "fu", 80); }
  }
  /* 7.3 變爻 → 本位動爻（《增刪卜易·動變生克沖合章》：變爻只生剋沖合本位之動爻） */
  const HUA = {
    ke: ["hc", 0], chong: ["hc", 0.95, "變爻沖本位，回頭沖，爻之反吟"], he: ["hc", 0.82, "回頭合，謂之化扶"],
    po: ["hc", 0.9, "變爻逢月建沖，化破"],
    sheng: ["sk", 0.86, "變爻生本位動爻，回頭生"], kesk: ["sk", 0.95, "變爻剋本位動爻，回頭剋"],
    jin: ["sk", 0.8, "化進神，愈進愈旺"], tui: ["sk", 0.84, "化退神，漸退無力"], bihe: ["sk", 0.55, "化出同五行之爻"],
    xie: ["sk", 0.42, "動爻生變爻，化洩"], hao: ["sk", 0.38, "動爻剋變爻，化耗"],
    zhangsheng: ["sk", 0.7, "動爻化出長生之地"], diwang: ["sk", 0.72, "動爻化出帝旺之地"], mu: ["sk", 0.8, "動爻化入墓"], jue: ["sk", 0.8, "動爻化絕"],
    fuyin: ["sk", 0.78, "變爻與動爻同支，伏吟"], kong: ["kong", 0.84, "變爻旬空，化空"]
  };
  for (const L of lines) if (L.moving) {
    for (const h of L.hua) {
      const k = h.key === "ke" ? "kesk" : h.key;
      if (k === "po") continue;                                  // 化破已在月建項下列出
      const [g, w, note] = HUA[k];
      let n = note;
      if (k === "jue" && hasHua(L, "sheng") && L.wx === 2) n += (L.wang ? "；土爻旺相，化巳反能生土，論生不論絕（《增刪卜易·生旺墓絕章》）" : "；土爻休囚，化巳論絕");
      add({ group: g, type: h.text, actor: "C", target: who(L), kind: "line", pos: L.pos, score: 90 * w,
        title: `${who(L)}化${GAN[L.change.g]}${bName(L.change.b)}`, verdict: h.text, note: n });
    }
  }
  /* 7.4 動爻（明動、暗動）→ 他爻、伏神；靜爻旺相 → 靜爻休囚（《增刪卜易·動靜生克章》） */
  const actors = lines.filter(L => L.moving || L.andong);
  const actorF = ch.lineForce;
  const pairSeen = new Set();
  for (const A of actors) {
    const aw = A.moving ? 0.75 : 0.6;
    const aname = `${A.moving ? "動爻" : "暗動"}${who(A)}`;
    for (const T of lines) {
      if (T === A) continue;
      const base = 100 * aw * actorF[A.pos];
      linePair(A, T, aname, who(T), base, A.moving ? "動" : "暗動", "line");
    }
    for (const F of ch.fu) {
      const base = 80 * aw * actorF[A.pos];
      linePair(A, F, aname, whoFu(F), base, A.moving ? "動" : "暗動", "fu");
    }
  }
  function linePair(A, T, aname, tname, base, how, kind) {
    const key = [A.pos, kind, T.pos].join("-");
    if (pairSeen.has(key)) return; pairSeen.add(key);
    const mutual = kind === "line" && (T.moving || T.andong);       // 兩爻都在動：沖合只列一次
    if (mutual && T.pos < A.pos && (isChong(A.b, T.b) || isHe(A.b, T.b))) { /* 已在另一方列過 */ }
    else if (isChong(A.b, T.b)) {
      const both = mutual;
      add({ group: "hc", type: "爻沖", actor: "L", target: tname, kind, pos: T.pos, apos: A.pos, score: base * 0.9,
        title: `${aname}沖${tname}`, verdict: both ? "相沖" : "沖之", note: kind === "fu" ? "動爻沖伏神" : (T.moving ? "動爻相沖，謂之相殺" : "動爻沖靜爻，靜者被沖而動或散，視旺衰而定") });
    } else if (isHe(A.b, T.b)) {
      const both = mutual;
      add({ group: "hc", type: "爻合", actor: "L", target: tname, kind, pos: T.pos, apos: A.pos, score: base * 0.8,
        title: `${aname}合${tname}`, verdict: both ? "合好" : "合之", note: both ? "爻動與動爻相合，乃得他來合我，相助之意" : (kind === "fu" ? "動爻合伏神" : "動爻合靜爻，靜者得合而起") });
    }
    if (A.b === T.b) {
      add({ group: "sk", type: "爻比", actor: "L", target: tname, kind, pos: T.pos, apos: A.pos, score: base * 0.5,
        title: `${aname}與${tname}`, verdict: "同支相扶", note: "同支比和" });
      return;
    }
    const r = wxRel(A.wx, T.wx);
    const m = { sheng: ["生之", 0.82], ke: ["剋之", 0.88], same: ["扶之", 0.5] }[r];
    if (m) add({ group: "sk", type: "爻" + m[0].slice(0, 1), actor: "L", target: tname, kind, pos: T.pos, apos: A.pos, score: base * m[1],
      title: `${aname}${m[0].slice(0, 1)}${tname}`, verdict: m[0], note: { sheng: "動爻生他爻", ke: "動爻剋他爻", same: "同五行相扶" }[r] });
  }
  /* 靜爻旺相 → 靜爻休囚 */
  for (const A of lines) {
    if (A.moving || A.andong || !A.wang) continue;
    for (const T of lines) {
      if (T === A || T.moving || T.andong || T.wang) continue;
      const r = wxRel(A.wx, T.wx);
      if (r !== "sheng" && r !== "ke") continue;
      add({ group: "sk", type: r === "sheng" ? "靜生" : "靜剋", actor: "L", target: who(T), kind: "line", pos: T.pos, apos: A.pos,
        score: 30 * actorF[A.pos] * (r === "ke" ? 1 : 0.92), title: `靜爻${who(A)}${r === "sheng" ? "生" : "剋"}${who(T)}`,
        verdict: r === "sheng" ? "旺生衰" : "旺剋衰", note: "六爻安靜旺相之爻，可以生剋休囚之爻（《增刪卜易·動靜生克章》）" });
    }
  }
  /* 靜爻之間的沖合（兩爻皆靜，只是位置上的沖合，力量最弱） */
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const A = lines[i], B = lines[j];
    if (A.moving || B.moving || A.andong || B.andong) continue;
    if (isChong(A.b, B.b)) add({ group: "hc", type: "靜沖", actor: "L", target: who(B), kind: "line", pos: B.pos, apos: A.pos, score: 12,
      title: `${who(A)}與${who(B)}`, verdict: "靜爻相沖", note: "兩爻皆靜，相沖不發" });
    else if (isHe(A.b, B.b)) add({ group: "hc", type: "靜合", actor: "L", target: who(B), kind: "line", pos: B.pos, apos: A.pos, score: 10,
      title: `${who(A)}與${who(B)}`, verdict: "靜爻相合", note: "兩爻皆靜，相合不發" });
  }
  /* 7.5 飛伏（《卜筮正宗》飛伏生剋吉凶歌） */
  for (const F of ch.fu) {
    const fei = F.fei;
    const r = wxRel(fei.wx, F.wx);
    const m = {
      sheng: ["飛來生伏", "飛來生伏得長生", 0.66], ke: ["飛來剋伏", "飛來剋伏反傷身", 0.8],
      besheng: ["伏去生飛", "伏去生飛名洩氣", 0.5], beike: ["伏剋飛神", "伏剋飛神為出暴", 0.6], same: ["飛伏比和", "飛伏比和為有助", 0.46]
    }[r];
    add({ group: "sk", type: m[0], actor: "F", target: whoFu(F), kind: "fu", pos: F.pos, score: 80 * m[2],
      title: `飛神${who(fei)}／${whoFu(F)}`, verdict: m[0], note: m[1] });
    if (isChong(fei.b, F.b)) add({ group: "hc", type: "飛伏沖", actor: "F", target: whoFu(F), kind: "fu", pos: F.pos, score: 40, title: `飛神${who(fei)}／${whoFu(F)}`, verdict: "飛伏相沖", note: "飛伏地支相沖" });
    if (isHe(fei.b, F.b)) add({ group: "hc", type: "飛伏合", actor: "F", target: whoFu(F), kind: "fu", pos: F.pos, score: 36, title: `飛神${who(fei)}／${whoFu(F)}`, verdict: "飛伏相合", note: "飛伏地支相合" });
    /* 提拔、推開（《黃金策》：伏無提拔終徒爾，飛不推開亦枉然；空下伏神易於引拔） */
    const lift = [];
    if (["lin", "fu", "xiang", "he"].includes(F.month.key)) lift.push("月建" + F.month.text);
    if (["lin", "fu", "sheng", "he"].includes(F.day)) lift.push({ lin: "臨日", fu: "日扶", sheng: "日生", he: "日合" }[F.day]);
    for (const A of lines) if (A.moving || A.andong) { const r2 = wxRel(A.wx, F.wx); if (r2 === "sheng" || A.b === F.b) lift.push(`${A.posName}${A.moving ? "動" : "暗動"}生扶`); }
    const push = [];
    if (fei.kong) push.push("飛神旬空");
    if (fei.month.key === "po") push.push("飛神月破");
    if (fei.day === "chong" && !fei.moving) push.push(fei.wang ? "日沖飛神（暗動）" : "日沖飛神（日破）");
    if (fei.month.key === "si") push.push("月剋飛神");
    if (fei.day === "ke") push.push("日剋飛神");
    add({ group: "sk", type: "伏神出伏", actor: "F", target: whoFu(F), kind: "fu", pos: F.pos, score: 30 + 8 * lift.length + 8 * push.length,
      title: `${whoFu(F)}能否出伏`, verdict: lift.length && push.length ? "有提拔、有推開" : lift.length ? "有提拔" : push.length ? "飛神被推開" : "無提拔、無推開",
      note: `提拔：${lift.length ? lift.join("、") : "無"}；推開：${push.length ? push.join("、") : "無"}。伏無提拔終徒爾，飛不推開亦枉然` });
  }
  /* 7.6 世應 */
  const S = lines[ben.shi - 1], Y = lines[ben.ying - 1];
  {
    const r = wxRel(Y.wx, S.wx);
    const t = isChong(S.b, Y.b) ? ["hc", "世應相沖", 46] : isHe(S.b, Y.b) ? ["hc", "世應相合", 44] :
      r === "sheng" ? ["sk", "應生世", 40] : r === "ke" ? ["sk", "應剋世", 42] : r === "besheng" ? ["sk", "世生應", 34] : r === "beike" ? ["sk", "世剋應", 36] : ["sk", "世應比和", 30];
    add({ group: t[0], type: t[1], actor: "L", target: who(S), kind: "line", pos: S.pos, apos: Y.pos, score: t[2], title: `世${who(S)}／應${who(Y)}`, verdict: t[1], note: "世為我、應為彼" });
  }
  /* 7.7 卦級：六沖六合、反吟伏吟 */
  if (ben.pair || (bian && bian.pair)) {
    const a = ben.pair, b = bian ? bian.pair : null;
    let v, note, s;
    if (a && b) { v = `${a}化${b}`; s = 82; note = { "六沖化六合": "散而復聚，先離後合", "六合化六沖": "先合後離，有始無終", "六沖化六沖": "沖而又沖，事多散", "六合化六合": "始終作合" }[v]; }
    else if (a && bian) { v = `${a}卦`; s = 72; note = a === "六沖" ? "卦逢六沖，主散" : "卦逢六合，主聚"; }
    else if (a) { v = `${a}卦`; s = 72; note = a === "六沖" ? "卦逢六沖，主散（靜卦）" : "卦逢六合，主聚（靜卦）"; }
    else { v = `變卦為${b}`; s = 66; note = b === "六沖" ? "化出六沖" : "化出六合"; }
    add({ group: "hc", type: v, actor: "G", target: "全卦", kind: "gua", score: s, title: `${ben.full}${bian ? "之" + bian.full : ""}`, verdict: v, note });
  }
  if (bian) {
    const OPP = { 7: 6, 6: 7, 2: 5, 5: 2, 4: 0, 0: 4, 1: 3, 3: 1 };     // 乾巽、坎離、艮坤、震兌（後天方位相對）
    for (const [part, f] of [["內卦", lowerOf], ["外卦", upperOf]]) {
      const a = f(ben.bits), b = f(bian.bits);
      if (a === b) continue;
      if (OPP[a] === b) add({ group: "hc", type: "卦反吟", actor: "G", target: part, kind: "gua", score: 80, title: `${part}${TRI_NAME[a]}化${TRI_NAME[b]}`, verdict: `${part}反吟`, note: "乾巽、坎離、艮坤、震兌互變為卦之反吟，主反覆" });
      const idx = part === "內卦" ? [0, 1, 2] : [3, 4, 5];
      const mv = idx.filter(k => lines[k].moving);
      if (mv.length === 3 && mv.every(k => isChong(lines[k].b, lines[k].change.b)))
        add({ group: "hc", type: "爻反吟", actor: "G", target: part, kind: "gua", score: 78, title: `${part}${TRI_NAME[a]}化${TRI_NAME[b]}`, verdict: `${part}三爻回頭沖`, note: "內外爻動而反伏，三爻皆回頭沖（《增刪卜易·反伏章》）" });
      if (mv.length && mv.every(k => lines[k].change.b === lines[k].b) && ((a === 7 && b === 1) || (a === 1 && b === 7)))
        add({ group: "sk", type: "伏吟", actor: "G", target: part, kind: "gua", score: 74, title: `${part}${TRI_NAME[a]}化${TRI_NAME[b]}`, verdict: `${part}伏吟`, note: "乾震互變，地支不變，主憂鬱呻吟" });
    }
  }
  /* 7.8 三合局（《增刪卜易·六合章》：三爻動；兩動一靜；內卦初三動或外卦四六動、變出之爻成局。暗動作動論。） */
  for (const g of SANHE) {
    const slots = g.m.map(b => ({
      b,
      mv: lines.filter(L => (L.moving || L.andong) && L.b === b),
      st: lines.filter(L => !L.moving && !L.andong && L.b === b),
      ch: lines.filter(L => L.moving && L.change.b === b)
    }));
    const movingCount = slots.filter(s => s.mv.length).length;
    const present = slots.filter(s => s.mv.length || s.st.length).length;
    let status = null, how = "";
    if (movingCount === 3) { status = "成局"; how = "三爻皆動"; }
    else if (movingCount === 2 && present === 3) { status = "成局"; how = "兩爻動、一爻靜"; }
    else if (movingCount === 2) {
      const missing = slots.find(s => !s.mv.length && !s.st.length);
      const byChange = missing && missing.ch.some(L => {
        const tri = L.pos < 3 ? [0, 2] : [3, 5];
        return tri.includes(L.pos) && slots.every(s => s === missing || s.mv.some(x => x.moving && tri.includes(x.pos)));
      });
      if (byChange) { status = "成局"; how = "同一卦內兩爻動，變出之爻補足"; }
      else { status = "待用"; how = "兩爻動，缺一待補（虛一待用）"; }
    } else if (movingCount >= 1 && present === 3) { status = "未成"; how = "三支俱在而只一爻動"; }
    if (!status) continue;
    const members = slots.map(s => {
      const L = s.mv[0] || s.st[0] || s.ch[0];
      if (!L) return `${ZHI[s.b]}（缺）`;
      const src = s.mv[0] ? (s.mv[0].moving ? "動" : "暗動") : s.st[0] ? "靜" : "變";
      return `${ZHI[s.b]}（${L.posName}${src}）`;
    }).join("、");
    const flaw = status !== "未成" && slots.some(s => [...s.mv, ...s.st].some(L => L.kong || L.month.key === "po")) ? "；局中有爻空破，待填實之日成之" : "";
    add({ group: "hc", type: "三合", actor: "G", target: `${g.m.map(b => ZHI[b]).join("")}${WX[g.wx]}局`, kind: "gua",
      score: status === "成局" ? 84 : status === "待用" ? 46 : 20,
      title: `${g.m.map(b => ZHI[b]).join("")}合${WX[g.wx]}局`, verdict: status, note: `${how}：${members}${flaw}` });
  }
  /* 7.9 旬空（《增刪卜易·旬空章》：旺不為空、動不為空、有日建動爻生扶不為空；月破亦空；春土夏金秋木冬火為真空） */
  const ZHENKONG = { 2: 2, 5: 2, 1: 3, 4: 3, 7: 0, 10: 0 };   // 寅卯月土、巳午月金…（以月令剋爻判「死」）
  const kongItem = (T, label, kind, moving, base) => {
    if (!T.kong) return;
    let verdict, s;
    const help = T.day === "sheng" || T.day === "fu" || lines.some(A => (A.moving || A.andong) && A !== T && (wxRel(A.wx, T.wx) === "sheng" || A.b === T.b));
    if (moving) { verdict = "動不為空"; s = 40; }
    else if (T.day === "chong") { verdict = "沖空則實"; s = 52; }
    else if (T.month.key === "po") { verdict = "空又逢破"; s = 86; }
    else if (T.month.key === "si") { verdict = "真空"; s = 84; }
    else if (T.month.wang) { verdict = "旺而逢空，出旬可用"; s = 56; }
    else if (help) { verdict = "有生扶，不為真空"; s = 60; }
    else { verdict = "旬空"; s = 72; }
    add({ group: "kong", type: "旬空", actor: "K", target: label, kind, pos: T.pos, score: base * s / 100, title: `${label}落旬空（${mom.xunkong.map(b => ZHI[b]).join("")}）`, verdict, note: "旬內為空，出旬或逢沖、逢值則實" });
  };
  for (const L of lines) {
    kongItem(L, who(L), "line", L.moving, 100);
    if (L.fu) kongItem(L.fu, whoFu(L.fu), "fu", false, 80);
  }
  /* 排序：同分時合沖先於生剋 */
  const GO = { hc: 0, sk: 1, kong: 2 };
  R.sort((a, b) => b.score - a.score || GO[a.group] - GO[b.group]);
  R.forEach((r, i) => { r.id = i; });
  return R;
}

/* ---------------- 8. 摘要（給表格標籤用） ---------------- */
function summarize(ch) {
  return ch.lines.map(L => {
    const tags = [];
    if (L.month.key === "lin") tags.push({ t: "臨月建", k: "good" });
    if (L.month.key === "po") tags.push({ t: L.day === "lin" ? "月破（臨日不破）" : "月破", k: "bad" });
    if (L.month.key === "he") tags.push({ t: "月合", k: "good" });
    if (L.day === "lin") tags.push({ t: "臨日", k: "good" });
    if (L.day === "chong") {
      if (!L.moving) tags.push(L.kong ? { t: "沖空則實", k: "note" } : L.wang ? { t: "暗動", k: "warn" } : { t: "日破", k: "bad" });
      else tags.push(L.dayChong === "san" ? { t: "日沖（恐散）", k: "bad" } : { t: "日沖（不散）", k: "note" });
      tags.push({ t: "日沖", k: "chong" });
    }
    if (L.day === "he") tags.push(L.moving ? { t: "合絆", k: "warn" } : { t: "合起", k: "good" });
    if (L.kong) tags.push({ t: L.moving ? "旬空（動不為空）" : "旬空", k: "kong" });
    if (L.dayStage) tags.push({ t: { 長生: "長生於日", 帝旺: "帝旺於日", 墓: "入日墓", 絕: "絕於日" }[L.dayStage], k: "note" });
    const hua = (L.hua || []).map(h => ({ t: h.text, k: ["ke", "chong", "tui", "kong", "po", "jue", "mu"].includes(h.key) ? "bad" : ["sheng", "jin", "he", "zhangsheng", "diwang"].includes(h.key) ? "good" : "note" }));
    return { tags, hua };
  });
}

/* ---------------- 匯出 ---------------- */
return {
  GAN, ZHI, WX, ZHI_WX, TRI_NAME, TRI_XIANG, TRI_WX, TRI_XT, XT_TRI, NAJIA, KW_NAMES, KW_PAIRS, KW_OF_BITS, BITS_OF_KW, PALACE_OF,
  LIUQIN, LIUSHEN, POS_SHORT, YAO_LABEL, SANHE, JIN, TUI,
  mod, zhiWx, ganWx, gzName, gzOf, wxRel, isChong, isHe, csStage, hexInfo, najiaOf, liuqinOf, yaoName, fullName,
  isYang, isMoving, castNumbers, castTime, castManual, linesFrom, moment, monthState, dayRel, build, Cal: C
};
})();
if (typeof module !== "undefined") module.exports = Liuyao;
