/* 計算驗收：三個用例的預期值全部手推後寫死，程式只負責對照。
   用法：node tests/acceptance.js            （測 src/ 的引擎）
        node tests/acceptance.js liuyao.html（測組好的獨立檔裡的引擎） */
const fs = require("fs");
const path = require("path");
let Y;
const target = process.argv[2];
if (target) {
  const html = fs.readFileSync(path.resolve(target), "utf8");
  const a = html.indexOf("/* ===== ENGINE BEGIN ===== */"), b = html.indexOf("/* ===== ENGINE END ===== */");
  if (a < 0 || b < 0) { console.error("找不到引擎區段"); process.exit(2); }
  const code = html.slice(a, b) + "\n;module.exports = Liuyao;";
  const m = { exports: {} };
  new Function("module", "require", code)(m, require);
  Y = m.exports;
} else Y = require(path.join(__dirname, "..", "src", "engine.js"));

const { GAN, ZHI, WX } = Y;
let pass = 0, fail = 0;
function eq(label, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; } else { fail++; console.log(`  ✗ ${label}\n      得到 ${g}\n      應為 ${w}`); }
}
const gzb = (g, b) => GAN[g] + ZHI[b] + WX[Y.zhiWx(b)];
const lineStr = L => gzb(L.g, L.b) + L.qin;
const huaKeys = L => (L.hua || []).map(h => h.text).sort();
const relHas = (ch, pred) => ch.relations.some(pred);

/* ---------- 用例一（題目給定）：雷水解上六動，丙午年戊戌月甲子日 ---------- */
console.log("用例一：雷水解 上六動｜2026-10-17 10:00（數字 4、6、2）");
{
  const mom = Y.moment({ y: 2026, m: 10, d: 17, hh: 10, mi: 0, tz: 8, zishi: "day23" });
  eq("四柱", mom.pillars.map(Y.gzName), ["丙午", "戊戌", "甲子", "己巳"]);
  eq("旬空", mom.xunkong.map(b => ZHI[b]).join(""), "戌亥");
  const cast = Y.castNumbers("4", "6", "2");
  eq("起卦數字", cast.detail.steps.map(s => s.use), [4, 6, 6]);
  const ch = Y.build(cast, mom);
  eq("本卦", [ch.ben.full, ch.ben.palaceName + "宮", ch.ben.genName], ["雷水解", "震宮", "二世"]);
  eq("世應", [ch.ben.shi, ch.ben.ying], [2, 5]);
  eq("世爻", lineStr(ch.lines[1]), "戊辰土妻財");
  eq("應爻", lineStr(ch.lines[4]), "庚申金官鬼");
  eq("六爻納甲六親", ch.lines.map(lineStr), ["戊寅木兄弟", "戊辰土妻財", "戊午火子孫", "庚午火子孫", "庚申金官鬼", "庚戌土妻財"]);
  eq("六神", ch.lines.map(L => L.shen), ["青龍", "朱雀", "勾陳", "螣蛇", "白虎", "玄武"]);
  eq("動爻", ch.moving, [5]);
  eq("上六化出", gzb(ch.lines[5].change.g, ch.lines[5].change.b) + ch.lines[5].change.qin, "己巳火子孫");
  eq("上六動變", huaKeys(ch.lines[5]), ["回頭生", "化絕"].sort());
  eq("變卦", [ch.bian.full, ch.bian.palaceName + "宮", ch.bian.genName], ["火水未濟", "離宮", "三世"]);
  eq("伏神", ch.fu.map(F => `${gzb(F.g, F.b)}${F.qin}伏${Y.POS_SHORT[F.pos]}${gzb(F.fei.g, F.fei.b)}下`), ["庚子水父母伏初爻戊寅木下"]);
  eq("世爻月破", ch.lines[1].month.key, "po");
  eq("上六臨月建、旬空", [ch.lines[5].month.key, ch.lines[5].kong], ["lin", true]);
  eq("三、四爻日破", [ch.lines[2].ripo, ch.lines[3].ripo], [true, true]);
  eq("初爻日生、五爻生日", [ch.lines[0].day, ch.lines[4].day], ["sheng", "xie"]);
  eq("月令", ch.lines.map(L => L.month.text), ["囚", "月破", "休", "休", "相", "臨月建"]);
  eq("伏神臨日", [ch.fu[0].day, ch.fu[0].month.key], ["lin", "si"]);
  eq("飛伏", relHas(ch, r => r.type === "伏去生飛"), true);
  eq("動爻沖世", relHas(ch, r => r.type === "爻沖" && r.apos === 5 && r.pos === 1), true);
  eq("土化巳的論生不論絕", relHas(ch, r => r.type === "化絕" && /論生不論絕/.test(r.note)), true);
  eq("關係第一條是世爻月破", [ch.relations[0].type, ch.relations[0].pos], ["月破", 1]);
  eq("寅午戌只一爻動：未成", relHas(ch, r => r.type === "三合" && r.verdict === "未成"), true);
}

/* ---------- 用例二：時間起卦，火地晉上九動（遊魂、化墓化空、合絆合起、變卦六合、飛來剋伏） ---------- */
console.log("用例二：時間起卦｜2026-02-27 08:00（農曆正月十一辰時）");
{
  const mom = Y.moment({ y: 2026, m: 2, d: 27, hh: 8, mi: 0, tz: 8, zishi: "day23" });
  eq("四柱", mom.pillars.map(Y.gzName), ["丙午", "庚寅", "壬申", "甲辰"]);
  eq("旬空", mom.xunkong.map(b => ZHI[b]).join(""), "戌亥");
  eq("農曆", [mom.lunar.year, mom.lunar.month, mom.lunar.day, mom.lunar.leap], [2026, 1, 11, false]);
  const cast = Y.castTime(mom);
  eq("年月日時數", [cast.detail.Y, cast.detail.M, cast.detail.D, cast.detail.H], [7, 1, 11, 5]);
  eq("上卦下卦動爻", cast.detail.steps.map(s => s.use), [3, 8, 6]);
  const ch = Y.build(cast, mom);
  eq("本卦", [ch.ben.full, ch.ben.palaceName + "宮", ch.ben.genName, ch.ben.shi, ch.ben.ying], ["火地晉", "乾宮", "遊魂", 4, 1]);
  eq("六爻納甲六親", ch.lines.map(lineStr), ["乙未土父母", "乙巳火官鬼", "乙卯木妻財", "己酉金兄弟", "己未土父母", "己巳火官鬼"]);
  eq("六神", ch.lines.map(L => L.shen), ["玄武", "青龍", "朱雀", "勾陳", "螣蛇", "白虎"]);
  eq("動爻", ch.moving, [5]);
  eq("上九化出", gzb(ch.lines[5].change.g, ch.lines[5].change.b) + ch.lines[5].change.qin, "庚戌土父母");
  eq("上九動變", huaKeys(ch.lines[5]), ["化洩", "化墓", "化空"].sort());
  eq("變卦", [ch.bian.full, ch.bian.palaceName + "宮", ch.bian.genName, ch.bian.pair], ["雷地豫", "震宮", "一世", "六合"]);
  eq("伏神", ch.fu.map(F => `${gzb(F.g, F.b)}${F.qin}伏${Y.POS_SHORT[F.pos]}${gzb(F.fei.g, F.fei.b)}下`), ["甲子水子孫伏初爻乙未土下"]);
  eq("伏神日生、長生於日、月令休", [ch.fu[0].day, ch.fu[0].dayStage, ch.fu[0].month.text], ["sheng", "長生", "休"]);
  eq("月令", ch.lines.map(L => L.month.text), ["死", "相", "旺", "囚", "死", "相"]);
  eq("日辰", ch.lines.map(L => L.day), ["xie", "he", "ke", "fu", "xie", "he"]);
  eq("二爻合起、上九合絆", [ch.lines[1].dayHe, ch.lines[5].dayHe], ["qi", "ban"]);
  eq("三爻絕於日", ch.lines[2].dayStage, "絕");
  eq("變爻月剋、長生於日", [ch.lines[5].change.month.key, ch.lines[5].change.dayStage], ["si", "長生"]);
  eq("飛來剋伏", relHas(ch, r => r.type === "飛來剋伏"), true);
  eq("出伏判斷", ch.relations.find(r => r.type === "伏神出伏").verdict, "有提拔、有推開");
  eq("應生世", relHas(ch, r => r.type === "應生世"), true);
  eq("變卦六合", relHas(ch, r => r.type === "變卦為六合"), true);
  eq("沒有三合", relHas(ch, r => r.type === "三合"), false);
  eq("動爻剋世", relHas(ch, r => r.type === "爻剋" && r.apos === 5 && r.pos === 3), true);
  eq("靜爻旺剋衰（卯剋未）", ch.relations.filter(r => r.type === "靜剋" && r.apos === 2).map(r => r.pos).sort(), [0, 4]);
  eq("卯酉靜沖", relHas(ch, r => r.type === "靜沖" && r.apos === 2 && r.pos === 3), true);
}

/* ---------- 用例三：手動六爻，水雷屯四五上爻動化火雷噬嗑（暗動、化進化退、化空化破、三合、卦反吟） ---------- */
console.log("用例三：手動六爻｜2026-03-11 12:00 水雷屯 六四、九五、上六動");
{
  const mom = Y.moment({ y: 2026, m: 3, d: 11, hh: 12, mi: 0, tz: 8, zishi: "day23" });
  eq("四柱", mom.pillars.map(Y.gzName), ["丙午", "辛卯", "甲申", "庚午"]);
  eq("旬空", mom.xunkong.map(b => ZHI[b]).join(""), "午未");
  const cast = Y.castManual([7, 8, 8, 6, 9, 6]);
  const ch = Y.build(cast, mom);
  eq("本卦", [ch.ben.full, ch.ben.palaceName + "宮", ch.ben.genName, ch.ben.shi, ch.ben.ying], ["水雷屯", "坎宮", "二世", 2, 5]);
  eq("變卦", [ch.bian.full, ch.bian.palaceName + "宮", ch.bian.genName], ["火雷噬嗑", "巽宮", "五世"]);
  eq("六爻納甲六親", ch.lines.map(lineStr), ["庚子水兄弟", "庚寅木子孫", "庚辰土官鬼", "戊申金父母", "戊戌土官鬼", "戊子水兄弟"]);
  eq("變爻", [3, 4, 5].map(k => gzb(ch.lines[k].change.g, ch.lines[k].change.b) + ch.lines[k].change.qin), ["己酉金父母", "己未土官鬼", "己巳火妻財"]);
  eq("四爻動變", huaKeys(ch.lines[3]), ["化進神", "化帝旺", "化破"].sort());
  eq("五爻動變", huaKeys(ch.lines[4]), ["化退神", "化空"].sort());
  eq("上爻動變", huaKeys(ch.lines[5]), ["化耗", "化絕"].sort());
  eq("伏神", ch.fu.map(F => `${gzb(F.g, F.b)}${F.qin}伏${Y.POS_SHORT[F.pos]}${gzb(F.fei.g, F.fei.b)}下`), ["戊午火妻財伏三爻庚辰土下"]);
  eq("伏神旬空", ch.fu[0].kong, true);
  eq("世爻暗動", [ch.lines[1].day, ch.lines[1].andong], ["chong", true]);
  eq("月令", ch.lines.map(L => L.month.text), ["休", "旺", "死", "囚", "月合", "休"]);
  eq("日辰", ch.lines.map(L => L.day), ["sheng", "chong", "xie", "lin", "xie", "sheng"]);
  eq("生旺墓絕於日", ch.lines.map(L => L.dayStage), ["長生", "絕", "長生", null, "長生", "長生"]);
  eq("上爻變爻得日合", ch.lines[5].change.day, "he");
  eq("申子辰成局", ch.relations.filter(r => r.type === "三合" && /申子辰/.test(r.title)).map(r => r.verdict), ["成局"]);
  eq("寅午戌待用", ch.relations.filter(r => r.type === "三合" && /寅午戌/.test(r.title)).map(r => r.verdict), ["待用"]);
  eq("外卦坎化離反吟", relHas(ch, r => r.type === "卦反吟" && r.target === "外卦"), true);
  eq("世剋應", relHas(ch, r => r.type === "世剋應"), true);
  eq("伏去生飛", relHas(ch, r => r.type === "伏去生飛"), true);
  eq("化破列在月建項", relHas(ch, r => r.type === "月破" && r.verdict === "化破" && r.pos === 3), true);
}

/* ---------- 規則表自我檢查 ---------- */
console.log("規則表：六十四卦與原文爻題、八宮、伏神");
{
  const T = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "zhouyi.json"), "utf8"));
  let bad = 0;
  for (let kw = 1; kw <= 64; kw++) {
    const bits = Y.BITS_OF_KW[kw];
    const labels = [0, 1, 2, 3, 4, 5].map(k => Y.yaoName(k, (bits >> k) & 1));
    if (JSON.stringify(labels) !== JSON.stringify(T[kw - 1].lab)) { bad++; console.log("  爻題不合", kw, labels, T[kw - 1].lab); }
    if (Y.KW_NAMES[kw - 1] !== T[kw - 1].n) { bad++; console.log("  卦名不合", kw, Y.KW_NAMES[kw - 1], T[kw - 1].n); }
  }
  eq("六十四卦卦畫與原文爻題（九六）一致", bad, 0);
  const cnt = {};
  for (let b = 0; b < 64; b++) { const p = Y.PALACE_OF[b]; cnt[p.palace] = (cnt[p.palace] || 0) + 1; }
  eq("八宮各八卦", Object.values(cnt), [8, 8, 8, 8, 8, 8, 8, 8]);
  // 每卦缺的六親都能在本宮首卦找到，且首卦本身不缺
  let fuBad = 0;
  const mom = Y.moment({ y: 2026, m: 10, d: 17, hh: 10, mi: 0, tz: 8, zishi: "day23" });
  for (let b = 0; b < 64; b++) {
    const vals = [0, 1, 2, 3, 4, 5].map(k => ((b >> k) & 1) ? 7 : 8);
    const ch = Y.build({ lines: vals, detail: {} }, mom);
    const qs = new Set(ch.lines.map(L => L.qin)); ch.fu.forEach(F => qs.add(F.qin));
    if (qs.size !== 5) fuBad++;
    if (ch.ben.gen === 0 && ch.fu.length) fuBad++;
  }
  eq("伏神補足五類六親", fuBad, 0);
}
console.log(`\n通過 ${pass} 項，失敗 ${fail} 項`);
process.exitCode = fail ? 1 : 0;
