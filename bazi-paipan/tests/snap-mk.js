/* 截取細盤左右兩欄與設定頁：node tests/snap-mk.js <outdir> <width> */
const { chromium } = require("/opt/npm-tools/node_modules/playwright");
const path = require("path");
const [outdir, width] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const w = +width;
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: w < 600 ? 2 : 1, timezoneId: "Asia/Shanghai", isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage(); const req = [];
  p.on("request", r => { if (!r.url().startsWith("file:")) req.push(r.url()); });
  await p.clock.install({ time: new Date("2026-10-18T17:01:30+08:00") });
  await p.goto("file://" + path.join(__dirname, "../dist/bazi.html"));
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click("#nowcard"); await p.click('.nav-item[data-page="pro"]'); await p.waitForSelector("#page-pro .strip.s-month");
  await p.locator("#page-pro .pro-right").screenshot({ path: path.join(outdir, `mk-right-${w}.png`) });
  await p.locator("#page-pro .pro-left").screenshot({ path: path.join(outdir, `mk-left-${w}.png`) });
  await p.locator("#page-pro .attn").screenshot({ path: path.join(outdir, `mk-attn-${w}.png`) });
  await p.click('.nav-item[data-page="theme"]');
  await p.locator("#show-card").screenshot({ path: path.join(outdir, `show-${w}.png`) });
  await p.click('[data-act="show-lite"]');
  await p.click('.nav-item[data-page="pro"]');
  await p.screenshot({ path: path.join(outdir, `lite-pro-${w}.png`), fullPage: true });
  console.log("外部請求", req.length, req.slice(0, 3));
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
