/* 速度量測：node tests/perf.js [html] [CPU 降速倍數，預設 4]
   手機 390 寬，用真實時鐘（假時鐘會遮住瀏覽器的計時紀錄），每個情境量三次取中位數。
   首次繪製：第一次畫出內容。完成：該頁的命盤或清單畫好。
   冷開：瀏覽器裡沒有節氣存檔（第一次用）；熱開：同一個瀏覽器再開一次。
   切頁：點導覽或格子到畫面算完（同步腳本加一次強制排版）。 */
let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw;
const path = require("path");
const fs = require("fs");
const built = path.join(__dirname, "../dist/bazi.html");
const FILE = "file://" + path.resolve(process.argv[2] || (fs.existsSync(built) ? built : path.join(__dirname, "../bazi.html")));
const RATE = +(process.argv[3] || 4);
const RUNS = 3;
const med = a => { const s = a.filter(x => x >= 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : -1; };
const READY = { input: "#nc-gz:not(:empty)", pro: "#page-pro .strip.s-hour", cases: "#cases-card .case", hepan: ".hp-panels .pro[data-pid='B'] .strip.s-hour", theme: "#show-card" };

const CASE = (id, name, y, m, d, hh, mi, sex) => ({ id, name, sex, mode: "solar", solar: { y, m, d, hh, mi }, place: { name: "北京", lon: 116.41, lat: 39.9, tz: 8 }, dst: false, trueSolar: false, zishi: "day23", createdAt: 1, updatedAt: 1 });
const CASES = [];
for (let i = 0; i < 20; i++) CASES.push(CASE("p" + i, "量測" + i, 1950 + i * 3, 1 + (i % 12), 1 + (i * 7) % 28, (i * 5) % 24, (i * 13) % 60, i % 2 ? "f" : "m"));

async function openOnce(page, startPage) {
  await page.goto("about:blank");
  await page.goto(FILE + "#" + startPage);
  await page.waitForSelector(READY[startPage], { timeout: 20000 });
  await page.waitForTimeout(250);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return { dcl: nav ? nav.domContentLoadedEventEnd : -1, fcp: fcp ? fcp.startTime : -1, ready: window.__readyAt || -1 };
  });
}

async function scenario(browser, label, seed, startPage, actions) {
  const r = { cold: { dcl: [], fcp: [], ready: [] }, warm: { dcl: [], fcp: [], ready: [] } }, acts = {};
  for (let k = 0; k < RUNS; k++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Asia/Shanghai", locale: "zh-TW" });
    await ctx.addInitScript(sel => {
      const mark = () => { if (!window.__readyAt && document.querySelector(sel)) { window.__readyAt = performance.now(); return true; } return false; };
      new MutationObserver((m, ob) => { if (mark()) ob.disconnect(); }).observe(document, { childList: true, subtree: true });
    }, READY[startPage]);
    const page = await ctx.newPage();
    await page.goto(FILE);
    await page.evaluate(({ seed, startPage }) => {
      localStorage.clear();
      for (const k in seed) localStorage.setItem(k, JSON.stringify(seed[k]));
      localStorage.setItem("bazi.page", JSON.stringify(startPage));
    }, { seed, startPage });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RATE });
    for (const kind of ["cold", "warm"]) {
      const t = await openOnce(page, startPage);
      for (const f of ["dcl", "fcp", "ready"]) r[kind][f].push(t[f]);
      if (kind === "cold") await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    }
    for (const [name, sel] of actions) {
      const ms = await page.evaluate(sel => {
        const el = document.querySelector(sel); if (!el) return -1;
        const t0 = performance.now(); el.click(); void document.body.offsetHeight; return performance.now() - t0;
      }, sel);
      (acts[name] = acts[name] || []).push(ms);
      await page.waitForTimeout(80);
    }
    await ctx.close();
  }
  const f = v => v < 0 ? "—" : v.toFixed(0) + " ms";
  console.log([label,
    `冷開：首次繪製 ${f(med(r.cold.fcp))}、完成 ${f(med(r.cold.ready))}`,
    `熱開：首次繪製 ${f(med(r.warm.fcp))}、完成 ${f(med(r.warm.ready))}`].concat(Object.keys(acts).map(k => `${k} ${f(med(acts[k]))}`)).join("｜"));
  return { label, cold: { fcp: med(r.cold.fcp), ready: med(r.cold.ready), dcl: med(r.cold.dcl) }, warm: { fcp: med(r.warm.fcp), ready: med(r.warm.ready), dcl: med(r.warm.dcl) }, acts: Object.fromEntries(Object.entries(acts).map(([k, v]) => [k, med(v)])) };
}

(async () => {
  const browser = await chromium.launch();
  console.log(`檔案 ${FILE}\nCPU 降速 ${RATE} 倍，手機 390 寬，三次中位數\n`);
  const cur = { c: CASES[3], saved: true };
  const out = [];
  out.push(await scenario(browser, "空白開頁（排盤頁）", {}, "input", [["切到設定", '.nav-item[data-page="theme"]'], ["回排盤", '.nav-item[data-page="input"]']]));
  out.push(await scenario(browser, "上次在專業細盤", { "bazi.cur.v1": cur, "bazi.cases.v1": CASES }, "pro", [["切到基本排盤", '.nav-item[data-page="basic"]'], ["切回細盤", '.nav-item[data-page="pro"]'], ["點流年格", '#page-pro .strip.s-year .cell:nth-child(3)']]));
  out.push(await scenario(browser, "上次在案例（20 筆）", { "bazi.cur.v1": cur, "bazi.cases.v1": CASES }, "cases", [["切到排盤", '.nav-item[data-page="input"]'], ["切回案例", '.nav-item[data-page="cases"]']]));
  out.push(await scenario(browser, "上次在合盤（已開始）", { "bazi.cur.v1": cur, "bazi.cases.v1": CASES, "bazi.hepan.v1": { a: "p3", b: "p8", started: true } }, "hepan", [["點 A 流年格", '.pro[data-pid="A"] .strip.s-year .cell:nth-child(4)'], ["切到細盤", '.nav-item[data-page="pro"]'], ["切回合盤", '.nav-item[data-page="hepan"]']]));
  await browser.close();
  if (process.env.PERF_JSON) fs.writeFileSync(process.env.PERF_JSON, JSON.stringify(out, null, 1));
})().catch(e => { console.error(e); process.exit(1); });
