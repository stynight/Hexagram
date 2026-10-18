/* 驗收用例：node tests/acceptance.js [path-to-engine-or-html] */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadEngine(p) {
  const src = fs.readFileSync(p, "utf8");
  let code = src;
  if (p.endsWith(".html")) {
    const m = src.match(/\/\* ===== ENGINE BEGIN ===== \*\/([\s\S]*?)\/\* ===== ENGINE END ===== \*\//);
    if (!m) throw new Error("engine block not found in html");
    code = m[1];
  }
  const ctx = { module: { exports: {} }, console };
  vm.createContext(ctx);
  vm.runInContext(code + "\n;module.exports = Bazi;", ctx);
  return ctx.module.exports;
}

const target = process.argv[2] || path.join(__dirname, "../src/engine.js");
const B = loadEngine(target);
let pass = 0, fail = 0;
function eq(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log(`${ok ? "✔" : "✘"} ${label}: ${JSON.stringify(got)}${ok ? "" : "  ≠ 期望 " + JSON.stringify(want)}`);
}
function has(label, list, items) {
  for (const it of items) {
    const ok = list.some(s => s.includes(it));
    if (ok) pass++; else fail++;
    console.log(`${ok ? "✔" : "✘"} ${label} 含「${it}」`);
  }
}
const gz = i => B.gzName(i);
const pillarsInfo = (p, dm) => ({
  xingyun: p.map(i => B.changSheng(dm, i % 12)),
  zizuo: p.map(i => B.changSheng(i % 10, i % 12)),
  kong: p.map(i => B.xunKong(i).map(b => B.ZHI[b]).join("")),
  nayin: p.map(i => B.nayin(i))
});
const natalItems = p => ["年柱", "月柱", "日柱", "時柱"].map((label, pos) => ({ key: "n" + pos, label, kind: "natal", pos, idx: p[pos], side: "A" }));

/* ---------- 用例 1：四柱 丙午 辛丑 甲寅 丁卯 ---------- */
console.log("\n=== 用例 1：四柱 丙午 辛丑 甲寅 丁卯 ===");
{
  const p = ["丙午", "辛丑", "甲寅", "丁卯"].map(s => B.gzIndex(B.GAN.indexOf(s[0]), B.ZHI.indexOf(s[1])));
  const c = B.chartFromPillars(p, "m");
  const info = pillarsInfo(p, c.dm);
  eq("日主", B.GAN[c.dm], "甲");
  eq("星運", info.xingyun, ["死", "冠帶", "臨官", "帝旺"]);
  eq("自坐", info.zizuo, ["帝旺", "養", "臨官", "病"]);
  eq("空亡", info.kong, ["寅卯", "辰巳", "子丑", "戌亥"]);
  eq("納音", info.nayin, ["天河水", "壁上土", "大溪水", "爐中火"]);
  const raw = B.findRelations(natalItems(p));
  const att = B.attention(raw);
  console.log("  天干留意：" + att.gan.join("、"));
  console.log("  地支留意：" + att.zhi.join("、"));
  has("地支留意", att.zhi, ["寅午半合", "丑午相害", "午卯相破"]);
  const s = B.searchPillars(p, { from: 1801, to: 2100 });
  console.log("  反查日期：" + s.list.map(x => `${x.from.y}-${B.pad2(x.from.m)}-${B.pad2(x.from.d)} ${B.pad2(x.from.hh)}:${B.pad2(x.from.mi)}~${B.pad2(x.to.hh)}:${B.pad2(x.to.mi)}`).join("；"));
  has("反查日期", s.list.map(x => `${x.from.y}-${B.pad2(x.from.m)}-${B.pad2(x.from.d)}`), ["2027-02-04"]);
}

/* ---------- 用例 2：公曆 2026-10-18 17:01 ---------- */
console.log("\n=== 用例 2：公曆 2026-10-18 17:01（男，北京時間） ===");
{
  const c = B.buildChart({ sex: "m", y: 2026, m: 10, d: 18, hh: 17, mi: 1, tz: 8, lon: 120, trueSolar: false, zishi: "day23" });
  eq("四柱", c.pillars.map(gz), ["丙午", "戊戌", "乙丑", "乙酉"]);
  const info = pillarsInfo(c.pillars, c.dm);
  eq("星運", info.xingyun, ["長生", "墓", "衰", "絕"]);
  eq("納音", info.nayin, ["天河水", "平地木", "海中金", "泉中水"]);
  const att = B.attention(B.findRelations(natalItems(c.pillars)));
  console.log("  天干留意：" + (att.gan.join("、") || "無"));
  console.log("  地支留意：" + att.zhi.join("、"));
  has("地支留意", att.zhi, ["午戌半合", "酉丑半合", "丑戌相刑", "丑午相害", "酉戌相害"]);
  eq("農曆", B.lunarText(c.lunar), "2026年九月初九");
  eq("司令", B.GAN[c.siling], "丁");
  const y = c.yun;
  console.log(`  起運：出生後${y.Y}年${y.M}月${y.D}天${y.H}時；交運：逢${y.jiaoStems.map(g => B.GAN[g]).join("、")}年 ${y.jiaoJieName}後${y.jiaoDaysAfterJie}天（立春後${y.jiaoDaysAfterLichun}天）`);
  console.log("  大運：" + y.dayun.map(d => `${d.startYear}(${d.startAge}歲)${gz(d.idx)}`).join(" "));
  eq("起運", `${y.Y}年${y.M}月${y.D}天${y.H}時`, "6年8月4天5時");
  eq("交運", `逢${y.jiaoStems.map(g => B.GAN[g]).join("、")}年 ${y.jiaoJieName}後${y.jiaoDaysAfterJie}天`, "逢癸、戊年 芒種後17天");
  eq("大運前三步", y.dayun.slice(0, 3).map(d => `${d.startYear}/${d.startAge}/${gz(d.idx)}`), ["2033/8/己亥", "2043/18/庚子", "2053/28/辛丑"]);
  // 此刻 = 2026-10-18 17:01（北京時間）
  const jdMoment = B.toJD(2026, 10, 18, (17 + 1 / 60) / 24) - 8 / 24;
  const mo = B.momentOf(jdMoment, 8);
  const months = B.liuYue(mo.Y, 8);
  eq("此刻流年", gz(B.yearGZ(mo.Y)), "丙午");
  eq("此刻流月", gz(months[mo.monthK].idx), "戊戌");
  eq("此刻流日", gz(B.dayGZ(mo.dayNum)), "乙丑");
  eq("此刻流時", gz(B.liuShi(mo.dayNum)[mo.hourBranch].idx), "乙酉");
  eq("小運 2026", gz(B.xiaoYun(c, 2026)), "丙戌");
  eq("流日條首末", (() => { const m = months[mo.monthK]; const r = B.liuRi(m); return [`${r[0].m}/${r[0].d}`, `${r[r.length - 1].m}/${r[r.length - 1].d}`]; })(), ["10/8", "11/6"]);
}

/* ---------- 用例 3：公曆 1990-01-01 00:00 男 ---------- */
console.log("\n=== 用例 3：公曆 1990-01-01 00:00 男（北京時間，不用真太陽時） ===");
{
  const c = B.buildChart({ sex: "m", y: 1990, m: 1, d: 1, hh: 0, mi: 0, tz: 8, lon: 120, trueSolar: false, zishi: "day23" });
  eq("四柱", c.pillars.map(gz), ["己巳", "丙子", "丙寅", "戊子"]);
  const info = pillarsInfo(c.pillars, c.dm);
  eq("納音", info.nayin, ["大林木", "澗下水", "爐中火", "霹靂火"]);
  eq("日柱旬空", B.xunKong(c.pillars[2]).map(b => B.ZHI[b]).join(""), "戌亥");
  eq("大運前六步", c.yun.dayun.slice(0, 6).map(d => gz(d.idx)), ["乙亥", "甲戌", "癸酉", "壬申", "辛未", "庚午"]);
  eq("大運方向", c.yun.forward ? "順" : "逆", "逆");
  const y = c.yun;
  eq("起運（年、月）", [y.Y, y.M], [8, 2]);
  console.log(`  起運：出生後${y.Y}年${y.M}月${y.D}天${y.H}時；交運日 ${y.jiao.y}-${B.pad2(y.jiao.m)}-${B.pad2(y.jiao.d)} ${B.pad2(y.jiao.hh)}:${B.pad2(y.jiao.mi)}`);
  eq("交運", `逢${y.jiaoStems.map(g => B.GAN[g]).join("、")}年 ${y.jiaoJieName}後${y.jiaoDaysAfterJie}天`, "逢戊、癸年 立春後27天");
  eq("司令", B.GAN[c.siling], "癸");
  eq("農曆", B.lunarText(c.lunar), "1989年臘月初五");
  eq("大運起始年歲", c.yun.dayun.slice(0, 3).map(d => `${d.startYear}/${d.startAge}`), ["1998/9", "2008/19", "2018/29"]);
  eq("小運 2026", gz(B.xiaoYun(c, 2026)), "辛亥");
  eq("小運 2018", gz(B.xiaoYun(c, 2018)), "己未");
  const ex = c.extra;
  eq("胎元 命宮 身宮 胎息", [ex.taiyuan, ex.minggong, ex.shengong, ex.taixi].map(gz), ["丁卯", "己巳", "丁丑", "辛亥"]);
  const pj = c.prevJie, nj = c.nextJie;
  const fmt = jd => { const k = B.jdToClock(jd + 8 / 24); return `${k.y}-${B.pad2(k.m)}-${B.pad2(k.d)} ${B.pad2(k.hh)}:${B.pad2(k.mi)}:${B.pad2(k.ss)}`; };
  console.log(`  前節 ${pj.name} ${fmt(pj.jd)}（參考 1989-12-07 11:20:57）；後節 ${nj.name} ${fmt(nj.jd)}（參考 1990-01-05 22:33:14）`);
  eq("前節分鐘", fmt(pj.jd).slice(0, 16), "1989-12-07 11:20");
  eq("後節分鐘", fmt(nj.jd).slice(0, 16), "1990-01-05 22:33");
}

/* ---------- 其他交叉檢查 ---------- */
console.log("\n=== 交叉檢查 ===");
{
  // 納音名與公式五行一致
  let bad = 0;
  for (let i = 0; i < 60; i++) if (B.WX[B.nayinWx(i)] !== B.nayin(i).slice(-1)) bad++;
  eq("納音名稱與公式五行一致（不一致數）", bad, 0);
  // 節氣對國立天文台（JST−1h = 北京時間）
  const chk = [[2027, 2, "2027-02-04 09:46"], [2026, 18, "2026-10-08 14:29"], [2026, 20, "2026-11-07 17:52"], [2027, 0, "2027-01-05 22:10"], [2026, 2, "2026-02-04 04:02"]];
  for (const [Y, k, want] of chk) {
    const t = B.termsOfYear(Y)[k];
    const c = B.jdToClock(t.jd + 8 / 24);
    const got = `${c.y}-${B.pad2(c.m)}-${B.pad2(c.d)} ${B.pad2(c.hh)}:${B.pad2(c.mi)}`;
    const diffMin = Math.abs(B.clockToJD(c) - B.clockToJD({ y: +want.slice(0, 4), m: +want.slice(5, 7), d: +want.slice(8, 10), hh: +want.slice(11, 13), mi: +want.slice(14, 16) })) * 1440;
    eq(`${t.name} ${Y}（誤差≤1分）`, diffMin <= 1.01, true);
    if (diffMin > 1.01) console.log("    got " + got + " want " + want);
  }
  // 農曆閏月與春節
  const L = (y, m, d) => B.lunarText(B.lunarOfDay(B.ymdToDayNum(y, m, d)));
  eq("2023-03-22", L(2023, 3, 22), "2023年閏二月初一");
  eq("2020-05-23", L(2020, 5, 23), "2020年閏四月初一");
  eq("2025-07-25", L(2025, 7, 25), "2025年閏六月初一");
  eq("2033-12-22", L(2033, 12, 22), "2033年閏冬月初一");
  eq("1984-11-23", L(1984, 11, 23), "1984年閏十月初一");
  eq("2017-07-23", L(2017, 7, 23), "2017年閏六月初一");
  eq("2027-02-04", L(2027, 2, 4), "2026年臘月廿八");
  for (const [y, m, d] of [[2024, 2, 10], [2025, 1, 29], [2026, 2, 17], [2027, 2, 6], [1990, 1, 27], [2000, 2, 5], [2019, 2, 5], [1985, 2, 20], [2030, 2, 3], [1950, 2, 17], [1900, 1, 31], [2050, 1, 23]])
    eq(`春節 ${y}-${m}-${d}`, L(y, m, d), `${y}年正月初一`);
  // 農曆 → 公曆
  const dn = B.lunarToDayNum(1989, 12, false, 5);
  const o = B.dayNumToYMD(dn);
  eq("農曆 1989 臘月初五 → 公曆", `${o.y}-${o.m}-${o.d}`, "1990-1-1");
  const dn2 = B.lunarToDayNum(2023, 2, true, 1);
  const o2 = B.dayNumToYMD(dn2);
  eq("農曆 2023 閏二月初一 → 公曆", `${o2.y}-${o2.m}-${o2.d}`, "2023-3-22");
  // 十神：月干與日干相同時為比肩
  eq("十神 乙見乙", B.tenGod(1, 1), "比肩");
  // 日柱錨點
  eq("1949-10-01 日柱", gz(B.dayGZ(B.ymdToDayNum(1949, 10, 1))), "甲子");
  // 早晚子時
  const c23 = B.buildChart({ sex: "m", y: 2026, m: 10, d: 18, hh: 23, mi: 30, tz: 8, zishi: "day23" });
  const cSp = B.buildChart({ sex: "m", y: 2026, m: 10, d: 18, hh: 23, mi: 30, tz: 8, zishi: "split" });
  eq("23:30 換日：日柱、時柱", [gz(c23.pillars[2]), gz(c23.pillars[3])], ["丙寅", "戊子"]);
  eq("23:30 早晚子時：日柱、時柱", [gz(cSp.pillars[2]), gz(cSp.pillars[3])], ["乙丑", "戊子"]);
  // 真太陽時（烏魯木齊 87.6E）
  const cts = B.buildChart({ sex: "m", y: 1990, m: 1, d: 1, hh: 12, mi: 0, tz: 8, lon: 87.6, trueSolar: true });
  console.log(`  真太陽時（87.6E）：${cts.clock.hh}:${B.pad2(cts.clock.mi)}，修正 ${cts.solarOffsetMin.toFixed(1)} 分（均時差 ${cts.eot.toFixed(1)} 分）`);
  eq("真太陽時修正約 −133.2 分", Math.abs(cts.solarOffsetMin - (-129.6 - 3.3)) < 1.5, true);
}

console.log(`\n通過 ${pass}，失敗 ${fail}`);
process.exit(fail ? 1 : 0);
