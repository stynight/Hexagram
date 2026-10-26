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

/* ---------- 神煞（預設查法） ---------- */
console.log("\n=== 神煞 ===");
{
  const P = s => B.gzIndex(B.GAN.indexOf(s[0]), B.ZHI.indexOf(s[1]));
  const shaOf = (c, opt) => c.pillars.map((p, i) => B.shensha(c, p % 10, p % 12, i, opt).join("、"));
  const c3 = B.buildChart({ sex: "m", y: 1990, m: 1, d: 1, hh: 0, mi: 0, tz: 8, lon: 120, trueSolar: false, zishi: "day23" });
  eq("用例三 己巳 丙子 丙寅 戊子", shaOf(c3), ["天德貴人、天廚貴人、祿神、亡神", "天乙貴人、福星貴人", "國印貴人、福星貴人、學堂、劫煞、勾絞", "天乙貴人、福星貴人"]);
  const c2 = B.buildChart({ sex: "m", y: 2026, m: 10, d: 18, hh: 17, mi: 1, tz: 8, lon: 120, trueSolar: false, zishi: "day23" });
  eq("用例二 丙午 戊戌 乙丑 乙酉", shaOf(c2), ["太極貴人、天德貴人、月德貴人、文昌貴人、天廚貴人、學堂、桃花", "華蓋、空亡", "國印貴人、福星貴人、金神、元辰", "天乙貴人、太極貴人、天醫、將星、紅鸞、勾絞"]);
  // 華蓋、將星：起查那一柱自己不算；歲運照算
  const cs = B.chartFromPillars(["戊戌", "甲寅", "壬子", "庚子"].map(P), "m");
  const yr = B.shensha(cs, 4, 10, 0), dy = B.shensha(cs, 8, 0, 2), hr = B.shensha(cs, 6, 0, 3), ln = B.shensha(cs, 4, 10, -1);
  eq("年支戌查華蓋，年柱自己不算", yr.includes("華蓋"), false);
  eq("日支子查將星，日柱自己不算", dy.includes("將星"), false);
  eq("時柱子由日支查得將星", hr.includes("將星"), true);
  eq("流年戊戌由年支查得華蓋", ln.includes("華蓋"), true);
  // 亥月血刃：月柱自己不算
  const cx = B.chartFromPillars(["甲子", "乙亥", "丙寅", "己亥"].map(P), "m");
  eq("亥月血刃在亥：月柱不算、時柱算", [B.shensha(cx, 1, 11, 1).includes("血刃"), B.shensha(cx, 5, 11, 3).includes("血刃")], [false, true]);
  // 只看日柱的神煞
  const ck = B.chartFromPillars(["甲子", "丙寅", "庚辰", "癸酉"].map(P), "m");
  eq("庚辰日：魁罡、十惡大敗、日德", ["魁罡", "十惡大敗", "日德"].map(n => B.shensha(ck, 6, 4, 2).includes(n)), [true, true, true]);
  eq("癸酉時：金神", B.shensha(ck, 9, 9, 3).includes("金神"), true);
  eq("庚辰作流年不算魁罡", B.shensha(ck, 6, 4, -1).includes("魁罡"), false);
  const ct = B.chartFromPillars(["甲子", "丙寅", "戊寅", "甲寅"].map(P), "m");
  eq("寅月戊寅日：天赦", B.shensha(ct, 4, 2, 2).includes("天赦"), true);
  // 元辰、勾絞依男女陰陽
  const cm = B.chartFromPillars(["甲子", "丙寅", "丙寅", "戊子"].map(P), "m"), cf = B.chartFromPillars(["甲子", "丙寅", "丙寅", "戊子"].map(P), "f");
  eq("甲子年陽男元辰在未、陽女在巳", [B.shensha(cm, 9, 7, -1).includes("元辰"), B.shensha(cf, 9, 7, -1).includes("元辰"), B.shensha(cf, 9, 5, -1).includes("元辰")], [true, false, true]);
  // 流派切換
  const cg = B.chartFromPillars(["甲子", "丙寅", "庚寅", "戊寅"].map(P), "m");
  eq("庚日天乙：預設丑未，切換後午寅", [B.shensha(cg, 4, 2, 3).includes("天乙貴人"), B.shensha(cg, 4, 2, 3, { tianyiGeng: "wu" }).includes("天乙貴人")], [false, true]);
  const cy = B.chartFromPillars(["甲子", "丙寅", "乙卯", "戊寅"].map(P), "m");
  eq("乙日羊刃：預設在辰，逆行在寅，陰干不取", [B.shensha(cy, 4, 4, -1).includes("羊刃"), B.shensha(cy, 4, 2, 3, { yangren: "rev" }).includes("羊刃"), B.shensha(cy, 4, 4, -1, { yangren: "none" }).includes("羊刃")], [true, true, false]);
  eq("只用日干時，年干的天乙不算", [B.shensha(c3, 0, 0, 1).includes("天乙貴人"), B.shensha(c3, 0, 0, 1, { ganBase: "d" }).includes("天乙貴人")], [true, false]);
  eq("學堂切年納音：己巳大林木見亥", B.shensha(c3, 9, 11, -1, { xuetang: "nayin" }).includes("學堂"), true);
  eq("空亡只看日柱時，年柱旬空（丙午旬空寅卯）不算", [B.shensha(c2, 6, 2, -1).includes("空亡"), B.shensha(c2, 6, 2, -1, { kong: "d" }).includes("空亡")], [true, false]);
  eq("不明的切換值回到預設", B.shaOpt({ yangren: "亂填" }).yangren, "next");
  // 為什麼成立：與 shensha 結果一致，每項都有說明
  const opts = [undefined, { ganBase: "d", zhiBase: "y", tianyiGeng: "wu", yangren: "rev", xuetang: "nayin", ciguan: "nayin", fuxing: "simple", tianchu: "old", kong: "d" }, { yangren: "none" }];
  let same = 0, total = 0, noWhy = 0;
  for (const c of [c2, c3, cs, ck, ct, cf]) for (const o of opts) for (let i = 0; i < 60; i++) for (const pos of [-1, 0, 1, 2, 3]) {
    const a = B.shensha(c, i % 10, i % 12, pos, o), d = B.shenshaDetail(c, i % 10, i % 12, pos, o);
    total++; if (JSON.stringify(a) === JSON.stringify(d.map(x => x.name))) same++;
    noWhy += d.filter(x => !x.why.length).length;
  }
  eq(`神煞說明與神煞清單一致（${total} 組）`, [same, noWhy], [total, 0]);
  const why = (c, gz, pos, n, o) => { const it = B.shenshaDetail(c, B.GAN.indexOf(gz[0]), B.ZHI.indexOf(gz[1]), pos, o).find(x => x.name === n); return it ? it.why : null; };
  eq("月德：用月支三合局", why(c2, "丙午", 0, "月德貴人"), ["月支戌屬寅午戌局，月德在丙，這柱天干丙"]);
  eq("月德合：寫出相合的兩干", why(c2, "辛卯", -1, "月德合"), ["月支戌屬寅午戌局，月德在丙，丙辛相合，這柱天干辛"]);
  eq("天廚：食神之祿", why(c3, "己巳", 0, "天廚貴人"), ["日干丙的食神是戊，戊的祿在巳，這柱地支巳"]);
  eq("天乙：寫出是年干查到的", why(c3, "丙子", 1, "天乙貴人"), ["年干己，天乙貴人在子、申，這柱地支子"]);
  eq("元辰：寫出陽男陰女與沖後一位", why(c2, "乙丑", 2, "元辰"), ["丙年生男，屬陽男陰女；年支午的對沖是子，取沖後一位丑，這柱地支丑"]);
  eq("華蓋：寫出起查的支與局", why(cs, "戊戌", -1, "華蓋"), ["年支戌屬寅午戌局，華蓋在戌（墓庫），這柱地支戌"]);
}

/* ---------- 關係清單：整柱收進干支 ---------- */
console.log("\n=== 關係清單整柱折疊 ===");
{
  const P = s => B.gzIndex(B.GAN.indexOf(s[0]), B.ZHI.indexOf(s[1]));
  const items = ["甲子", "庚午"].map((x, i) => ({ label: "柱" + i, kind: "natal", pos: i, idx: P(x), side: "A" }));
  const raw = B.findRelations(items);
  eq("甲子、庚午原始三條", raw.map(r => r.type).sort(), ["chong", "ganchong", "tkdc"]);
  const f = B.foldZhu(raw);
  eq("折疊後只剩天剋地沖一條，底下兩條", [f.length, f[0].type, f[0].sub.map(r => r.type).sort().join(",")], [1, "tkdc", "chong,ganchong"]);
  const ch = B.chartFromPillars(["甲子", "庚午", "丙寅", "戊子"].map(P), "m");
  const sc = B.scoreRelations(f, items, { mode: "single", charts: { A: ch } }, B.DEFAULT_WEIGHTS);
  eq("只計一次分", sc.length, 1);
  const raw2 = B.findRelations(["乙丑", "辛未"].map((x, i) => ({ label: "柱" + i, kind: "natal", pos: i, idx: P(x), side: "A" })));
  eq("乙丑、辛未：沖與刑都收進天剋地沖", B.foldZhu(raw2).map(r => r.type + (r.sub ? ":" + r.sub.map(x => x.type).sort().join("+") : "")), ["tkdc:chong+ganchong+xing"]);
  eq("留意清單維持原樣", B.attention(raw).gan.concat(B.attention(raw).zhi), ["甲庚相沖", "子午相沖"]);
}

/* ---------- 節氣存檔 ---------- */
console.log("\n=== 節氣存檔 ===");
{
  const store = new Map(); let puts = 0, gets = 0;
  B.setTermStore({ get(Y) { gets++; return store.get(Y) || null; }, put(Y, j) { puts++; store.set(Y, j.slice()); } });
  const a = B.termsOfYear(2101).map(t => t.jd);
  eq("新年份算完寫入存檔", [puts, store.has(2101)], [1, true]);
  const B2 = loadEngine(target);
  B2.setTermStore({ get(Y) { return store.get(Y) || null; }, put() { throw new Error("不該再算"); } });
  eq("下次從存檔讀出，數值完全相同", B2.termsOfYear(2101).map(t => t.jd), a);
  B2.setTermStore({ get() { return [1, 2, 3]; }, put() { } });
  eq("存檔壞掉就重算", B2.termsOfYear(2102)[2].name, "立春");
  eq("存檔版本號", typeof B.TERM_VERSION, "number");
  B.setTermStore(null);
}

console.log(`\n通過 ${pass}，失敗 ${fail}`);
process.exit(fail ? 1 : 0);
