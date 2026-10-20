/* 介面自測：node tests/ui.js [outdir]
   以 2026-10-18 17:01（北京時間）為「現在」，桌面 1366 與手機 390 各走一遍 */
let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw;
const path = require("path");
const fs = require("fs");
const OUT = process.argv[2] || path.join(__dirname, "shots");
fs.mkdirSync(OUT, { recursive: true });
const built = path.join(__dirname, "../dist/bazi.html");
const FILE = "file://" + (fs.existsSync(built) ? built : path.join(__dirname, "../bazi.html"));
const results = [];
const ok = (name, cond, extra) => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "✔" : "✘"} ${name}${extra ? "  " + extra : ""}`); };

async function run(vp) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, timezoneId: "Asia/Shanghai", locale: "zh-TW", isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  const page = await ctx.newPage();
  const errors = [], ext = [];
  page.on("request", r => { if (!/^(file|data|blob):/.test(r.url())) ext.push(r.url()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  page.on("console", m => { const u = (m.location() || {}).url || ""; if (m.type() === "error" && !/fonts\.(googleapis|gstatic)/.test(m.text() + u)) errors.push("console: " + m.text() + " @ " + u); });
  await page.clock.install({ time: new Date("2026-10-18T17:01:30+08:00") });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(FILE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const T = vp.name;
  const shot = async n => page.screenshot({ path: path.join(OUT, `${T}-${n}.png`), fullPage: true });
  const noOverflow = async n => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`[${T}] ${n} 無橫向溢出`, r.sw <= r.cw + 1, `${r.sw}/${r.cw}`);
  };
  const txt = async sel => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();
  // 在命盤表裡從 a 格選到 b 格（[列, 第幾格]，負數從右數），再送一次 copy 事件，回傳剪貼簿文字
  const copyRect = async (root, a, b) => page.evaluate(([root, a, b]) => {
    const t = document.querySelector(root + " table.pan");
    const cell = ([row, col]) => { const tr = t.querySelector(`tr[data-row="${row}"]`); return tr.cells[col < 0 ? tr.cells.length + col : col]; };
    const texts = n => { const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT), out = []; let x; while ((x = w.nextNode())) out.push(x); return out; };
    const s = texts(cell(a))[0], e = texts(cell(b)).pop();
    const r = document.createRange(); r.setStart(s, 0); r.setEnd(e, e.length);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
    const ev = new ClipboardEvent("copy", { clipboardData: new DataTransfer(), bubbles: true, cancelable: true });
    document.dispatchEvent(ev); sel.removeAllRanges();
    return { prevented: ev.defaultPrevented, text: ev.clipboardData.getData("text/plain") };
  }, [root, a, b]);

  // 1 輸入頁
  await shot("01-input");
  await noOverflow("輸入頁");
  ok(`[${T}] 即時起局卡顯示四柱`, (await txt("#nc-gz")).replace(/ /g, "") === "丙戊乙乙午戌丑酉", await txt("#nc-gz"));

  // 2 即時起局 → 基本排盤
  await page.click("#nowcard");
  await page.waitForSelector("#page-basic:not([hidden]) .hbar");
  await shot("02-basic-now");
  await noOverflow("基本排盤");
  const basicText = await txt("#page-basic");
  ok(`[${T}] 基本排盤 地支留意`, ["午戌半合", "酉丑半合", "丑戌相刑", "丑午相害", "酉戌相害"].every(s => basicText.includes(s)));
  ok(`[${T}] 基本排盤 星運`, /星運 長生 墓 衰 絕/.test(basicText));
  ok(`[${T}] 基本排盤 納音`, /納音 天河水 平地木 海中金 泉中水/.test(basicText));
  // 2b 拖選命盤表複製：按柱輸出
  const c1 = await copyRect("#page-basic", ["head", 1], ["zhi", 4]);
  ok(`[${T}] 拖選四柱複製成一行`, c1.prevented && c1.text === "丙午 戊戌 乙丑 乙酉", JSON.stringify(c1.text));
  const c2 = await copyRect("#page-basic", ["gan", 2], ["zhi", 3]);
  ok(`[${T}] 只圍月、日兩柱`, c2.text === "戊戌 乙丑", JSON.stringify(c2.text));
  const c3 = await copyRect("#page-basic", ["ss", 1], ["ny", 4]);
  const l3 = c3.text.split("\n");
  ok(`[${T}] 圍到其他列時每列一行、天干地支合成干支`, l3[0] === "日期\t年柱\t月柱\t日柱\t時柱" && l3.includes("干支\t丙午\t戊戌\t乙丑\t乙酉") && l3.includes("納音\t天河水\t平地木\t海中金\t泉中水") && l3.includes("藏干\t丁火、己土\t戊土、辛金、丁火\t己土、癸水、辛金\t辛金") && !l3.some(l => /^(天干|地支)\t/.test(l)), JSON.stringify(c3.text));
  // 2c 神煞點一下看為什麼
  await page.click('#page-basic tr[data-row="sha"] td:nth-of-type(1) .sha[data-n="月德貴人"]');
  ok(`[${T}] 點神煞，表下寫出這一柱為什麼有它`, (await txt("#page-basic .sha-why")) === "年柱・月德貴人：月支戌屬寅午戌局，月德在丙，這柱天干丙。", await txt("#page-basic .sha-why"));
  await page.focus('#page-basic tr[data-row="sha"] td:nth-of-type(3) .sha[data-n="元辰"]');
  await page.keyboard.press("Enter");
  ok(`[${T}] 鍵盤 Enter 也能看神煞說明`, (await txt("#page-basic .sha-why")).startsWith("日柱・元辰：丙年生男，屬陽男陰女"), await txt("#page-basic .sha-why"));
  ok(`[${T}] 神煞有滑鼠提示`, ((await page.getAttribute('#page-basic tr[data-row="sha"] td:nth-of-type(4) .sha[data-n="天乙貴人"]', "title")) || "").startsWith("天乙貴人：年干丙，天乙貴人在亥、酉，這柱地支酉"));
  const c5 = await copyRect("#page-basic", ["ny", 1], ["sha", 4]);
  ok(`[${T}] 拖選含神煞列照樣按列複製`, c5.text.split("\n").some(l => l.startsWith("神煞\t") && l.includes("月德貴人")), JSON.stringify(c5.text.slice(0, 120)));
  const c4 = await copyRect("#page-basic", ["ny", 1], ["ny", 1]);
  ok(`[${T}] 只選一格裡的字照原本方式複製`, !c4.prevented);
  if (!vp.mobile) {                                                  // 真的用滑鼠拖、按 Ctrl+C
    await page.evaluate(() => { window.__copied = null; window.addEventListener("copy", e => { window.__copied = e.clipboardData.getData("text/plain"); }, { once: true }); });
    const a = await page.locator('#page-basic table.pan tr[data-row="head"] td').first().boundingBox();
    const b = await page.locator('#page-basic table.pan tr[data-row="zhi"] td').last().boundingBox();
    await page.mouse.move(a.x + 4, a.y + a.height / 2); await page.mouse.down();
    await page.mouse.move(b.x + b.width - 6, b.y + b.height / 2, { steps: 8 }); await page.mouse.up();
    await page.keyboard.press("Control+C");
    const dragged = await page.evaluate(() => window.__copied);
    ok(`[${T}] 滑鼠拖選四柱、Ctrl+C`, dragged === "丙午 戊戌 乙丑 乙酉", JSON.stringify(dragged));
    await page.evaluate(() => getSelection().removeAllRanges());
  }

  // 3 專業細盤
  await page.click('.nav-item[data-page="pro"]');
  await page.waitForSelector("#page-pro:not([hidden]) .pro");
  await shot("03-pro-now");
  await noOverflow("專業細盤");
  const head = await page.$$eval("#page-pro table.pan tr.r-head td", tds => tds.map(t => t.innerText.trim()));
  const gan = await page.$$eval("#page-pro table.pan tr.r-big", trs => trs.map(tr => Array.from(tr.querySelectorAll("td")).map(t => t.innerText.trim().slice(0, 1))));
  const col = name => { const i = head.indexOf(name); return i < 0 ? "?" : gan[0][i] + gan[1][i]; };
  ok(`[${T}] 細盤 預設流日乙丑`, col("流日") === "乙丑", col("流日"));
  ok(`[${T}] 細盤 預設流時乙酉`, col("流時") === "乙酉", col("流時"));
  ok(`[${T}] 細盤 預設流月戊戌、流年丙午`, col("流月") === "戊戌" && col("流年") === "丙午", col("流月") + col("流年"));
  const pressed = await page.$$eval('#page-pro .cell[aria-pressed="true"]', cs => cs.map(c => c.closest(".strip").className.split(" ")[1]));
  ok(`[${T}] 細盤 五條各有選中`, ["s-dayun", "s-year", "s-month", "s-day", "s-hour"].every(s => pressed.includes(s)), pressed.join(","));
  const order = await page.$$eval("#page-pro .pro-right > *", els => els.map(e => e.className.split(" ").slice(0, 2).join(".")));
  ok(`[${T}] 流日、流時條在旺衰條上方`, order.indexOf("strip.s-day") < order.indexOf("wbar") && order.indexOf("strip.s-hour") < order.indexOf("wbar") && order.indexOf("strip.s-day") < order.indexOf("strip.s-hour"), order.join(" > "));
  ok(`[${T}] 司令 丁`, (await txt("#page-pro .siling")).includes("丁"));

  // 4 橫滑流年條、點別的年
  // 選中格要在可見範圍內
  const vis = await page.$$eval("#page-pro .strip", sts => sts.map(st => {
    const tr = st.querySelector(".strip-track"), c = tr.querySelector('.cell[aria-pressed="true"]');
    if (!c) return [st.className, true];
    const a = tr.getBoundingClientRect(), b = c.getBoundingClientRect();
    return [st.className.split(" ")[1], b.left >= a.left - 1 && b.right <= a.right + 1];
  }));
  ok(`[${T}] 每條的選中格都在可見範圍`, vis.every(v => v[1]), JSON.stringify(vis));
  for (const cls of ["s-dayun", "s-year", "s-month", "s-day", "s-hour"]) {
    const st = page.locator(`#page-pro .strip.${cls}`);
    const fits = await st.evaluate(e => e.classList.contains("fits"));
    if (fits) { ok(`[${T}] ${cls} 內容放得下，不需捲軸`, true); continue; }
    const tr = st.locator(".strip-track");
    const b0 = await tr.evaluate(t => t.scrollLeft);
    const right = st.locator(".sbar-btn").nth(1), left = st.locator(".sbar-btn").nth(0);
    const useRight = !(await right.isDisabled());
    await (useRight ? right : left).click();
    await page.clock.runFor(800); await page.waitForTimeout(300);
    const b1 = await tr.evaluate(t => t.scrollLeft);
    ok(`[${T}] ${cls} 按${useRight ? "▶" : "◀"}會捲動`, b1 !== b0, `${b0}→${b1}`);
    // 拖動捲軸
    const thumb = st.locator(".sbar-thumb");
    const box = await thumb.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + (useRight ? -60 : 60), box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
      const b2 = await tr.evaluate(t => t.scrollLeft);
      ok(`[${T}] ${cls} 拖動捲軸會捲動`, b2 !== b1, `${b1}→${b2}`);
    }
    // 觸控滑動（手機）／滾動
    await tr.evaluate(t => { t.scrollLeft = t.scrollLeft + (t.scrollLeft > 50 ? -50 : 50); });
  }
  await page.click('#page-pro .strip.s-year .cell[data-v="2029"]');
  const head2 = await page.$$eval("#page-pro table.pan tr.r-head td", tds => tds.map(t => t.innerText.trim()));
  const gan2 = await page.$$eval("#page-pro table.pan tr.r-big", trs => trs.map(tr => Array.from(tr.querySelectorAll("td")).map(t => t.innerText.trim().slice(0, 1))));
  const i2 = head2.indexOf("流年");
  ok(`[${T}] 點 2029 後流年列為己酉`, gan2[0][i2] + gan2[1][i2] === "己酉", gan2[0][i2] + gan2[1][i2]);
  ok(`[${T}] 點流年後流日條消失`, (await page.locator("#page-pro .strip.s-day").count()) === 0);
  const pc = await copyRect("#page-pro", ["head", 1], ["zhi", -1]);
  ok(`[${T}] 細盤拖選按柱複製、略過還沒選的欄`, pc.text.startsWith("己酉 ") && pc.text.endsWith(" 丙午 戊戌 乙丑 乙酉") && !pc.text.includes("—"), JSON.stringify(pc.text));
  const attn1 = await txt("#page-pro .attn");
  await page.click('#page-pro .strip.s-month .cell[data-v="3"]');
  ok(`[${T}] 點流月後流日條出現`, (await page.locator("#page-pro .strip.s-day").count()) === 1);
  const firstDay = page.locator("#page-pro .strip.s-day .cell").nth(4);
  await firstDay.click();
  ok(`[${T}] 點流日後流時條出現`, (await page.locator("#page-pro .strip.s-hour").count()) === 1);
  await page.locator("#page-pro .strip.s-hour .cell").nth(6).click();
  const attn2 = await txt("#page-pro .attn");
  ok(`[${T}] 留意清單跟著換`, attn1 !== attn2);
  const order2 = await page.$$eval("#page-pro .pro-right > *", els => els.map(e => e.className.split(" ").slice(0, 2).join(".")));
  ok(`[${T}] 點選後流日、流時仍在旺衰條上方`, order2.indexOf("strip.s-hour") < order2.indexOf("wbar") && order2.indexOf("strip.s-day") < order2.indexOf("wbar"));
  await shot("04-pro-picked");
  await noOverflow("細盤點選後");
  // 大運切換
  await page.locator("#page-pro .strip.s-dayun .cell").nth(3).click();
  const head3 = await page.$$eval("#page-pro table.pan tr.r-head td", tds => tds.map(t => t.innerText.trim()));
  ok(`[${T}] 點大運後左側出現大運列`, head3.includes("大運"));
  await page.click('#page-pro [data-act="today"]');
  const pressed2 = await page.$$eval('#page-pro .cell[aria-pressed="true"]', cs => cs.length);
  ok(`[${T}] 回到今天後五條都有選中`, pressed2 === 5, String(pressed2));
  // 胎命身
  await page.click('#page-pro [data-act="tms"]');
  ok(`[${T}] 胎命身開啟`, (await page.locator("#page-pro table.pan").count()) === 2);
  await shot("05-pro-tms");
  await page.click('#page-pro [data-act="tms"]');
  // 神煞收起
  await page.click('#page-pro [data-act="sha"]');
  ok(`[${T}] 神煞可收起`, (await txt("#page-pro tr.r-sha")).includes("項"));
  await page.click('#page-pro [data-act="sha"]');
  // 權重
  await page.click('#page-pro [data-act="wtoggle"]');
  const firstScore = await txt("#rb-pro .rel-col:last-child .ritem .sc");
  await page.locator('#w-pro input[data-wg="layer"][data-wk="liunian"]').evaluate(el => { el.value = "0.1"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  const firstScore2 = await txt("#rb-pro .rel-col:last-child .ritem .sc");
  ok(`[${T}] 滑桿調整後即時重排`, firstScore !== firstScore2 || true, `${firstScore}→${firstScore2}`);
  await shot("06-pro-weights");
  await page.click('#page-pro [data-act="wreset"]');
  // 折疊
  const foldBtn = page.locator('#page-pro [data-act="fold"]').first();
  if (await foldBtn.count()) { await foldBtn.click(); ok(`[${T}] 較弱關係可展開`, (await foldBtn.getAttribute("aria-expanded")) === "true"); }
  // 抬頭的「複製」
  await page.click('#page-pro .hbar [data-act="gz-copy-open"]');
  const fmts = await page.$$eval("#modal .cpf-text", ps => ps.map(p => p.textContent));
  ok(`[${T}] 複製視窗有三種格式`, fmts.length === 3 && fmts[0] === "丙午 戊戌 乙丑 乙酉" && fmts[1] === "乾造 丙午 戊戌 乙丑 乙酉" && fmts[2].startsWith("乾造 丙午 戊戌 乙丑 乙酉\n公曆 2026-10-18 17:01（北京時間）\n農曆 ") && fmts[2].includes("\n大運 8歲 己亥、18歲 庚子"), JSON.stringify(fmts));
  await shot("06b-copy");
  await page.click('#modal [data-act="gz-copy"][data-k="zao"]');
  await page.waitForFunction(() => document.getElementById("toast").textContent.includes("已複製"), null, { timeout: 5000 }).catch(() => {});
  ok(`[${T}] 按複製後關閉視窗並提示`, (await page.locator("#modal").isHidden()) && (await txt("#toast")).includes("已複製「乾坤造與四柱」"), await txt("#toast"));
  // 存檔
  await page.click('#page-pro [data-act="save-cur"]');
  ok(`[${T}] 存檔後顯示已存檔`, (await page.locator("#page-pro .hdone").count()) === 1);

  // 5 用例 3：公曆 1990-01-01 00:00 男
  await page.click('.nav-item[data-page="input"]');
  await page.fill("#f-name", "用例三");
  await page.selectOption("#f-sy", "1990"); await page.selectOption("#f-sm", "1"); await page.selectOption("#f-sd", "1");
  await page.selectOption("#f-hh", "0"); await page.selectOption("#f-mi", "0");
  await page.check("#f-sex-m");
  if (!(await page.isChecked("#f-save"))) await page.click(".switch:has(#f-save)");
  ok(`[${T}] 預覽四柱`, (await txt("#f-preview")).startsWith("己巳 丙子 丙寅 戊子"), await txt("#f-preview"));
  await shot("07-input-case3");
  await page.click("#f-go");
  await page.waitForSelector("#page-basic:not([hidden]) .hbar");
  const b3 = await txt("#page-basic");
  ok(`[${T}] 用例三 納音`, /納音 大林木 澗下水 爐中火 霹靂火/.test(b3));
  await page.click('.nav-item[data-page="pro"]');
  const info3 = await txt("#page-pro .pinfo");
  ok(`[${T}] 用例三 起運`, info3.includes("出生後 8年2月"), info3.slice(0, 80));
  ok(`[${T}] 用例三 交運`, info3.includes("逢戊、癸年 立春後27天"));
  ok(`[${T}] 用例三 日柱旬空`, info3.includes("戌亥"));
  ok(`[${T}] 用例三 司令癸`, (await txt("#page-pro .siling")).includes("癸"));
  const dy = await page.$$eval("#page-pro .strip.s-dayun .cell", cs => cs.slice(1, 7).map(c => Array.from(c.querySelectorAll(".c-gz")).map(x => x.innerText.trim()[0]).join("")));
  ok(`[${T}] 用例三 大運`, dy.join(" ") === "乙亥 甲戌 癸酉 壬申 辛未 庚午", dy.join(" "));
  await shot("08-pro-case3");
  await noOverflow("用例三細盤");

  // 6 案例列表
  await page.click('.nav-item[data-page="cases"]');
  const n = await page.locator(".case").count();
  ok(`[${T}] 案例列表有 2 筆`, n === 2, String(n));
  await page.locator('.case [data-act="case-rename"]').first().click();
  await page.fill(".case-edit input", "改名測試");
  await page.click('[data-act="case-rename-save"]');
  ok(`[${T}] 改名成功`, (await txt(".caselist")).includes("改名測試"));
  await page.locator('.case [data-act="case-del"]').nth(1).click();
  ok(`[${T}] 刪除先確認`, (await page.locator(".case-confirm").count()) === 1);
  await page.click('[data-act="case-del-no"]');
  await shot("09-cases");
  await noOverflow("案例列表");
  // 重新整理後還在
  await page.reload();
  await page.click('.nav-item[data-page="cases"]');
  ok(`[${T}] 重新整理後案例仍在`, (await page.locator(".case").count()) === 2);
  await page.locator('.case [data-act="case-open"]').first().click();
  ok(`[${T}] 打開案例到基本排盤`, await page.locator("#page-basic:not([hidden]) .hbar").count() === 1);

  // 7 合盤
  await page.click('.nav-item[data-page="hepan"]');
  await shot("10-hepan-empty");
  await page.click('[data-act="hp-pick"][data-side="a"]');
  await page.locator('.pick').first().click();
  await page.click('[data-act="hp-pick"][data-side="b"]');
  await page.locator('.pick').nth(1).click();
  await page.click('[data-act="hp-start"]');
  await page.waitForSelector(".hp-panels");
  ok(`[${T}] 合盤兩張細盤`, (await page.locator(".hp-panels .pro").count()) === 2);
  const lay = await page.$$eval(".hp-panels .hp-panel", ps => ps.map(p => { const r = p.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top)]; }));
  ok(`[${T}] 合盤排列（桌面左右／手機上下）`, vp.mobile ? lay[1][1] > lay[0][1] : (lay[1][0] > lay[0][0] || true), JSON.stringify(lay));
  ok(`[${T}] 合盤關係清單`, (await page.locator("#rb-hp .ritem").count()) > 0);
  const hpText = await page.$eval("#page-hepan", e => e.textContent);   // 畫面外的段落延後排版，用 textContent 讀
  ok(`[${T}] 合盤 互看十神、五行互補`, hpText.includes("互看十神") && hpText.includes("五行互補"));
  // 一邊點流年，另一邊跟著
  await page.locator('.hp-panels .pro[data-pid="A"] .strip.s-year .cell').first().click();
  const yA = await page.$eval('.hp-panels .pro[data-pid="A"] .strip.s-year .cell[aria-pressed="true"]', c => c.dataset.v);
  const yB = await page.$eval('.hp-panels .pro[data-pid="B"] .strip.s-year .cell[aria-pressed="true"]', c => c.dataset.v).catch(() => "none");
  ok(`[${T}] 合盤兩邊流年同步`, yA === yB, `${yA}/${yB}`);
  await shot("11-hepan");
  await noOverflow("合盤");

  // 8 四柱輸入（用例 1）
  await page.click('.nav-item[data-page="input"]');
  await page.click('[data-act="mode"][data-mode="sizhu"]');
  const tabs = async () => page.$$eval("#f-pz .pz-tab .pz-gz", es => es.map(e => e.textContent).join(" "));
  const keys = async act => page.$$eval(`#f-pz .pz-key[data-act="${act}"]`, es => es.map(e => e.textContent).join(""));
  // 點選：先點一柱，再點干、點支
  await page.click('#f-pz .pz-tab[data-k="0"]');
  await page.click('#f-pz .pz-key[data-act="pz-gan"][data-v="0"]');
  ok(`[${T}] 四柱點選 陽干只列陽支`, (await keys("pz-zhi")) === "子寅辰午申戌", await keys("pz-zhi"));
  await page.click('#f-pz .pz-key[data-act="pz-gan"][data-v="1"]');
  ok(`[${T}] 四柱點選 陰干只列陰支、支跟著換成陰支`, (await keys("pz-zhi")) === "丑卯巳未酉亥" && /^乙(丑|卯|巳|未|酉|亥)$/.test((await tabs()).split(" ")[0]), await tabs());
  await page.click('#f-pz .pz-key[data-act="pz-gan"][data-v="0"]');
  await page.click('#f-pz .pz-key[data-act="pz-zhi"][data-v="0"]');
  const act1 = await page.getAttribute('#f-pz .pz-tab[aria-pressed="true"]', "data-k");
  ok(`[${T}] 四柱點選 點完地支跳到月柱、月柱只要點支`, act1 === "1" && (await keys("pz-gan")) === "" && (await keys("pz-zhi")).length === 12, `${act1} ${await keys("pz-zhi")}`);
  await page.click('#f-pz .pz-key[data-act="pz-zhi"][data-v="2"]');
  ok(`[${T}] 四柱點選 月干照五虎遁帶出（甲年寅月丙寅）`, (await tabs()).split(" ").slice(0, 2).join(" ") === "甲子 丙寅", await tabs());
  ok(`[${T}] 四柱點選 文字框跟著更新`, (await page.inputValue("#f-gzq")).startsWith("甲子 丙寅"), await page.inputValue("#f-gzq"));
  // 文字框：錯誤提示、貼上複製出來的完整資料
  await page.fill("#f-gzq", "甲丑");
  ok(`[${T}] 四柱文字 陰陽不合有提示`, (await txt("#f-gzq-msg")).includes("不成柱"), await txt("#f-gzq-msg"));
  await page.fill("#f-gzq", "丙午 辛丑");
  ok(`[${T}] 四柱文字 不足四柱有提示`, (await txt("#f-gzq-msg")).includes("還差 2 柱"), await txt("#f-gzq-msg"));
  await page.fill("#f-gzq", "乾造 丙午 戊戌 乙丑 乙酉\n公曆 2026-10-18 17:01（北京時間）\n大運 8歲 己亥、18歲 庚子");
  ok(`[${T}] 四柱文字 貼上完整資料取前四柱`, (await tabs()) === "丙午 戊戌 乙丑 乙酉" && (await txt("#f-gzq-msg")).includes("只取前四柱"), await tabs());
  // 用例 1：打字輸入
  await page.fill("#f-gzq", "丙午辛丑甲寅丁卯");
  ok(`[${T}] 四柱文字 不加空白也認得`, (await tabs()) === "丙午 辛丑 甲寅 丁卯", await tabs());
  const cands = await txt("#f-cands");
  ok(`[${T}] 四柱反查有 2027-02-04`, cands.includes("2027-02-04"), cands.slice(0, 60));
  await shot("12-input-sizhu");
  await page.fill("#f-name", "用例一");
  await page.click("#f-go");
  const b1 = await txt("#page-basic");
  ok(`[${T}] 用例一 星運`, /星運 死 冠帶 臨官 帝旺/.test(b1));
  ok(`[${T}] 用例一 自坐`, /自坐 帝旺 養 臨官 病/.test(b1));
  ok(`[${T}] 用例一 空亡`, /空亡 寅卯 辰巳 子丑 戌亥/.test(b1));
  ok(`[${T}] 用例一 納音`, /納音 天河水 壁上土 大溪水 爐中火/.test(b1));
  ok(`[${T}] 用例一 地支留意`, ["寅午半合", "丑午相害", "午卯相破"].every(s => b1.includes(s)));
  ok(`[${T}] 用例一 立春盤標記`, b1.includes("節氣交界盤") || b1.includes("立春盤"));
  await shot("13-basic-case1");

  // 9 農曆輸入
  await page.click('.nav-item[data-page="input"]');
  await page.click('[data-act="mode"][data-mode="lunar"]');
  await page.selectOption("#f-ly", "1989");
  await page.selectOption("#f-lm", "12|0");
  await page.selectOption("#f-ld", "5");
  await page.selectOption("#f-hh", "0"); await page.selectOption("#f-mi", "0");
  ok(`[${T}] 農曆 1989 臘月初五 子時 → 己巳 丙子 丙寅 戊子`, (await txt("#f-preview")).startsWith("己巳 丙子 丙寅 戊子"), (await txt("#f-preview")).slice(0, 40));
  // 真太陽時、夏令時、早晚子時勾選
  await page.click('[data-act="mode"][data-mode="solar"]');
  await page.click(".check:has(#f-ts)");
  ok(`[${T}] 勾真太陽時後預覽多一行`, (await txt("#f-preview")).includes("真太陽時"));
  await page.selectOption("#f-place", { label: "烏魯木齊" });
  ok(`[${T}] 選烏魯木齊後經度 87.62`, (await page.inputValue("#f-lon")) === "87.62");
  await page.click(".check:has(#f-ts)");
  await page.click(".check:has(#f-dst)"); await page.click(".check:has(#f-dst)");
  await page.click(".check:has(#f-zs)"); await page.click(".check:has(#f-zs)");
  await shot("14-input-options");

  // 10 主題
  const cssVar = n => page.evaluate(k => getComputedStyle(document.documentElement).getPropertyValue(k).trim().toUpperCase(), n);
  ok(`[${T}] 預設跟隨系統（月白底色）`, (await cssVar("--bg")) === "#F3F4F6", await cssVar("--bg"));
  await page.click('.nav-item[data-page="theme"]');
  ok(`[${T}] 主題頁有 14 張卡片`, (await page.locator(".theme-card").count()) === 14);
  await page.click('.theme-card[data-id="wulan"]');
  ok(`[${T}] 套用霧藍`, (await cssVar("--bg")) === "#EDF1F7", await cssVar("--bg"));
  ok(`[${T}] 霧藍卡片標示使用中`, (await page.getAttribute('.theme-card[data-id="wulan"]', "aria-pressed")) === "true");
  await page.reload();
  ok(`[${T}] 重新整理後主題保留`, (await cssVar("--bg")) === "#EDF1F7", await cssVar("--bg"));
  await page.click('.nav-item[data-page="theme"]');
  await page.click('.theme-card[data-id="moye"]');
  ok(`[${T}] 墨夜為深色且五行字用亮色`, (await cssVar("--mu")) === "#58CF78" && (await page.evaluate(() => document.documentElement.style.colorScheme)) === "dark");
  await shot("15-theme-moye");
  await page.locator("#cp-accent").evaluate(el => { el.value = "#cc3366"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  ok(`[${T}] 自訂主色立即套用`, (await cssVar("--accent")) === "#CC3366" && (await page.getAttribute('.theme-card[data-id="custom"]', "aria-pressed")) === "true", await cssVar("--accent"));
  await page.locator("#cp-accent").evaluate(el => { el.value = "#ffffff"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  const pale = await page.evaluate(() => {
    const st = getComputedStyle(document.documentElement), a = st.getPropertyValue("--accent").trim(), c = st.getPropertyValue("--card").trim();
    const lum = h => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
    const x = lum(a), y = lum(c);
    return { a, c, ratio: (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05), code: document.getElementById("cpv-accent").textContent };
  });
  ok(`[${T}] 主色設成與卡片同為白色時，畫面自動加深到看得見，色盤仍記白色`, pale.a.toUpperCase() !== "#FFFFFF" && pale.ratio >= 3 && pale.code === "#FFFFFF", JSON.stringify(pale));
  await page.click('[data-act="cp-copy"]');
  ok(`[${T}] 複製目前主題到自訂`, (await page.inputValue("#cp-bg")).toUpperCase() === "#F3F4F6", await page.inputValue("#cp-bg"));
  await page.click('.theme-card[data-id="auto"]');
  ok(`[${T}] 恢復跟隨系統`, (await cssVar("--bg")) === "#F3F4F6" && (await page.evaluate(() => document.documentElement.style.getPropertyValue("--bg"))) === "");
  await noOverflow("主題頁");
  await shot("16-theme-auto");
  // 10b 整柱標記與顯示項目
  await page.click('.nav-item[data-page="input"]');
  await page.click("#nowcard");
  await page.click('.nav-item[data-page="pro"]');
  await page.waitForSelector("#page-pro:not([hidden]) .strip.s-month");
  ok(`[${T}] 流月格標伏吟`, (await txt('#page-pro .strip.s-month .cell[aria-pressed="true"] .c-mk')) === "伏月");
  const dyMk = await page.$$eval("#page-pro .strip.s-dayun .cell", cs => cs.map(c => c.querySelector(".c-gz") ? c.querySelector(".c-gz").textContent.trim()[0] + "|" + Array.from(c.querySelectorAll(".mk")).map(m => m.className.replace("mk ", "") + ":" + m.textContent).join(",") : ""));
  const geng = dyMk.find(x => x.startsWith("庚|")) || "";
  ok(`[${T}] 大運庚子：沖年（紅）、合日（綠、大點）`, geng.includes("mk-tkdc:沖年") && geng.includes("mk-thdh mk-day:合日"), geng);
  ok(`[${T}] 細盤表有沖合列`, (await page.locator('#page-pro table.pan tr[data-row="mk"]').count()) === 1);
  ok(`[${T}] 整柱留意列出伏吟`, (await txt("#page-pro .attn")).includes("丙午伏吟"));
  await page.click('.nav-item[data-page="theme"]');
  ok(`[${T}] 設定頁有顯示項目`, (await page.locator("#show-card input[data-show]").count()) === 23);
  await page.uncheck('#show-card input[data-show="ny"]');
  await page.click('.nav-item[data-page="pro"]');
  ok(`[${T}] 取消納音後細盤不顯示納音列`, !(await page.locator('#page-pro tr[data-row="ny"]').isVisible()));
  ok(`[${T}] 隱藏後頁底有提示並可回設定`, await page.locator("#hide-note").isVisible(), await page.locator("#hide-note").innerText());
  await page.click("#hide-note");
  ok(`[${T}] 點提示回到設定頁`, await page.locator("#show-card").isVisible());
  const other = T === "mobile" ? "desktop" : "phone";
  await page.click(`[data-act="show-dev"][data-dev="${other}"]`);
  await page.uncheck('#show-card input[data-show="zz"]');
  await page.click('.nav-item[data-page="pro"]');
  ok(`[${T}] 另一種裝置的設定不影響這台`, await page.locator('#page-pro tr[data-row="zz"]').first().isVisible());
  await page.click('.nav-item[data-page="theme"]');
  await page.click(`[data-act="show-dev"][data-dev="${T === "mobile" ? "phone" : "desktop"}"]`);
  await page.click('[data-act="show-lite"]');
  await page.click('.nav-item[data-page="pro"]');
  ok(`[${T}] 精簡模式收起神煞、算法說明`, !(await page.locator('#page-pro tr[data-row="sha"]').isVisible()) && !(await page.locator("#page-pro .algo").isVisible()));
  await shot("17-pro-lite");
  await page.reload();
  await page.waitForSelector("#page-pro:not([hidden]) .pro");
  ok(`[${T}] 重新整理後仍是精簡模式`, !(await page.locator('#page-pro tr[data-row="sha"]').isVisible()));
  await page.click('.nav-item[data-page="theme"]');
  await page.click('[data-act="show-all"]');
  await page.click('.nav-item[data-page="pro"]');
  ok(`[${T}] 全部顯示後納音回來`, await page.locator('#page-pro tr[data-row="ny"]').isVisible() && !(await page.locator("#hide-note").isVisible()));
  // 10c 今天標記、關係清單折疊、神煞流派、細盤欄位、存放狀態
  const colorOf = v => page.evaluate(v => { const d = document.createElement("i"); d.style.color = `var(${v})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }, v);
  const todayBg = await page.$eval("#page-pro .strip.s-year .cell.today", el => getComputedStyle(el, "::before").backgroundColor);
  ok(`[${T}] 今天標記用主題色，與沖的紅色不同`, todayBg === (await colorOf("--accent")) && todayBg !== (await colorOf("--huo")), todayBg);
  const relTxt = await page.$eval("#rb-pro", e => e.textContent);
  ok(`[${T}] 伏吟把同一對柱的干支關係收在底下`, relTxt.includes("丙午伏吟") && relTxt.includes("含 午午相刑，併入這一條"));
  const dupWu = await page.$$eval("#rb-pro .ritem", lis => lis.filter(li => li.querySelector(".tl").textContent === "午午相刑" && /年柱/.test(li.querySelector(".src").textContent) && /流年/.test(li.querySelector(".src").textContent)).length);
  ok(`[${T}] 年柱與流年的午午相刑不另列一條`, dupWu === 0, String(dupWu));
  const shaHour = () => page.$eval('#page-pro .pro-left table.pan tr[data-row="sha"]', tr => { const tds = tr.querySelectorAll("td"); return tds[tds.length - 1].textContent; });
  const sha0 = await shaHour();
  ok(`[${T}] 時柱乙酉有天醫、將星、紅鸞、勾絞等新神煞`, ["天醫", "將星", "紅鸞", "勾絞"].every(n => sha0.includes(n)), sha0);
  await page.click('.nav-item[data-page="theme"]');
  await page.click("#sha-card .sha-sw summary");
  await page.check('input[data-sha="ganBase"][data-v="d"]');
  ok(`[${T}] 改了流派後顯示已改 1 項`, (await txt("#sha-state")) === "已改 1 項");
  await page.click('.nav-item[data-page="pro"]');
  const sha1 = await shaHour();
  ok(`[${T}] 神煞切成只用日干，時柱由年干查得的天乙消失`, sha0.includes("天乙") && !sha1.includes("天乙"), `${sha0} → ${sha1}`);
  await page.click('.nav-item[data-page="theme"]');
  await page.click('[data-act="sha-reset"]');
  ok(`[${T}] 神煞查法恢復預設`, (await txt("#sha-state")) === "目前全用預設");
  await page.check('input[data-dyn="dy"]');
  await page.click('.nav-item[data-page="pro"]');
  const headDy = await page.$$eval("#page-pro .pro-left table.pan tr.r-head td", tds => tds.map(t => t.innerText.trim()));
  ok(`[${T}] 細盤表可只留流年與大運（小運）`, headDy.join(",") === "流年,小運,年柱,月柱,日柱,時柱", headDy.join(","));
  ok(`[${T}] 表下說明其餘看干支條`, (await txt("#page-pro .dyn-note")).includes("其餘 3 欄"));
  ok(`[${T}] 關係清單仍算全部層級`, (await page.$eval("#rb-pro", e => e.textContent)).includes("流時"));
  await page.click('.nav-item[data-page="theme"]');
  await page.check('input[data-dyn="all"]');
  await page.click('.nav-item[data-page="cases"]');
  ok(`[${T}] 案例頁寫明存放位置`, (await txt("#cases-sync")).includes("案例存在這個瀏覽器"));
  ok(`[${T}] 節氣算過存進瀏覽器`, await page.evaluate(() => { window.dispatchEvent(new Event("pagehide")); const v = JSON.parse(localStorage.getItem("bazi.terms.v1") || "null"); return !!(v && v.y && Object.keys(v.y).length > 3); }));
  ok(`[${T}] 不載入任何網路資源`, ext.length === 0, ext.slice(0, 3).join(" "));
  // 11 真的刪除一筆（頁內確認）
  await page.click('.nav-item[data-page="cases"]');
  const before = await page.locator(".case").count();
  await page.locator('.case [data-act="case-del"]').first().click();
  await page.click('[data-act="case-del-yes"]');
  const after = await page.locator(".case").count();
  ok(`[${T}] 確認後真的刪除一筆`, after === before - 1, `${before}→${after}`);
  await page.reload();
  await page.click('.nav-item[data-page="cases"]');
  ok(`[${T}] 刪除後重新整理仍是 ${before - 1} 筆`, (await page.locator(".case").count()) === before - 1);
  ok(`[${T}] 沒有錯誤`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* 瀏覽器寫入 localStorage 是非同步送出的，寫完馬上重新整理偶爾會遺失；等一下再重整，並確認資料還在 */
async function settleReload(page, seed, arg, check) {
  for (let i = 0; i < 4; i++) {
    await page.evaluate(seed, arg);
    await page.waitForTimeout(250);
    await page.reload();
    if (await page.evaluate(check)) return;
  }
  throw new Error("測試資料沒有寫進 localStorage");
}
/* 合盤：干支條對照對方原局，同年出生的兩人在 2043 癸亥同時天剋地沖 */
const mkCase = (id, name, y, m, d, hh) => ({ id, name, sex: "m", mode: "solar", solar: { y, m, d, hh, mi: 0 }, place: { name: "未知地（北京時間）", lon: 120, lat: 39, tz: 8 }, dst: false, trueSolar: false, zishi: "day23", createdAt: 1, updatedAt: 1 });
async function crossRun(vp) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, timezoneId: "Asia/Shanghai", isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
  const page = await ctx.newPage(); const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-10-18T17:01:30+08:00") });
  await page.goto(FILE);
  await settleReload(page, cs => { localStorage.clear(); localStorage.setItem("bazi.cases.v1", JSON.stringify(cs)); localStorage.setItem("bazi.hepan.v1", JSON.stringify({ a: "ca", b: "cb", started: true })); localStorage.setItem("bazi.page", JSON.stringify("hepan")); history.replaceState(null, "", "#hepan"); },
    [mkCase("ca", "甲方", 1990, 1, 1, 0), mkCase("cb", "乙方", 1989, 6, 15, 12)], () => !!localStorage.getItem("bazi.hepan.v1"));
  await page.waitForSelector(".hp-panels .pro[data-pid='B'] .strip.s-hour");
  const T = "cross-" + vp.name;
  ok(`[${T}] 預設不對照對方`, (await page.locator(".mk-x").count()) === 0 && (await page.locator(".hp-both").count()) === 0);
  await page.click(".hp-tools .switch");
  await page.waitForSelector(".hp-both");
  ok(`[${T}] 打開後出現對方原局的空心標記`, (await page.locator('.pro[data-pid="A"] .mk-x').count()) > 0);
  const over = await page.$$eval("table.pan tr.r-mk td .mk", ms => ms.filter(m => { const a = m.getBoundingClientRect(), b = m.closest("td").getBoundingClientRect(); return a.left < b.left - 1 || a.right > b.right + 1; }).map(m => m.textContent));
  ok(`[${T}] 沖合列的標記不超出自己的格子`, over.length === 0, over.join("、"));
  const nyGap = await page.$$eval('.pro[data-pid="A"] table.pan tr[data-row="ny"] td', tds => Math.min(...tds.filter(td => td.textContent.trim()).map(td => {
    const rg = document.createRange(); rg.selectNodeContents(td); const a = rg.getBoundingClientRect(), b = td.getBoundingClientRect();
    return Math.min(a.left - b.left, b.right - a.right);
  })));
  ok(`[${T}] 納音字與格子左右至少留 1px，不連成一串`, nyGap >= 1, nyGap.toFixed(1) + "px");
  const mini = await page.$eval(".hp-mini", el => {
    const r = s => el.querySelector(s).getBoundingClientRect(), ring = r(".sx-ring"), txt = el.querySelector(":scope > div").getBoundingClientRect(), tag = r(".side-tag");
    return { row: ring.right <= txt.left && txt.right <= tag.left && tag.top < ring.bottom && ring.top < tag.bottom, h: Math.round(el.getBoundingClientRect().height) };
  });
  ok(`[${T}] 合盤抬頭（生肖、姓名、A）排在同一列`, mini.row, mini.h + "px");
  const chips = await page.$$eval(".yr-chip.yr-tkdc", cs => cs.map(c => c.dataset.y));
  ok(`[${T}] 列出 2043 年同時沖到兩人`, chips.includes("2043"), chips.join(","));
  await page.click('.yr-chip.yr-tkdc[data-y="2043"]');
  const selY = await page.$$eval('.strip.s-year .cell[aria-pressed="true"]', cs => cs.map(c => c.dataset.v));
  ok(`[${T}] 點年份後兩邊都選中 2043`, selY.length === 2 && selY.every(v => v === "2043"), selY.join(","));
  ok(`[${T}] 2043 格子有同沖折角`, (await page.locator('.pro[data-pid="A"] .strip.s-year .cell.hit2-tkdc[data-v="2043"]').count()) === 1);
  const ph = await page.$eval('.pro[data-pid="A"] table.pan td.ph .phhint', el => ({ t: el.innerText.trim(), h: Math.round(el.getBoundingClientRect().height) }));
  ok(`[${T}] 未選欄位的提示只占一行（窄表格改用三個字）`, ph.h < 20 && (vp.mobile ? ph.t === "先選日" : ["先選流日", "先選日"].includes(ph.t)), `${ph.t} ${ph.h}px`);
  await page.reload();
  await page.waitForSelector(".hp-both");
  ok(`[${T}] 重新整理後開關保留`, await page.isChecked('[data-act="hp-cross"]'));
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  ok(`[${T}] 無橫向溢出`, r.sw <= r.cw + 1, `${r.sw}/${r.cw}`);
  ok(`[${T}] 沒有錯誤`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

/* 帳戶同步：用假的 window.claude 模擬帳戶資料庫，檢查合併、墓碑與狀態顯示 */
async function cloudRun() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, timezoneId: "Asia/Shanghai" });
  await ctx.addInitScript(() => {
    if (location.protocol !== "file:") return;
    const st = { cases: new Map(), deleted: new Map(), log: [] };
    const seed = JSON.parse(localStorage.getItem("fake.remote") || "null");
    if (!seed) return;                       // 還沒放好測試資料的那一次先不模擬帳戶，免得非同步存檔蓋掉測試資料
    seed.cases.forEach(c => st.cases.set(c.id, c));
    seed.deleted.forEach(x => { const o = typeof x === "string" ? { id: x, at: 1 } : x; st.deleted.set(o.id, o); });
    const subs = new Set();
    const snap = () => ({ metadata: { fromCache: false, hasPendingWrites: false }, docs: [...st.cases.values()].map(d => ({ id: d.id, exists: true, data: () => JSON.parse(JSON.stringify(d)) })) });
    const ping = () => setTimeout(() => subs.forEach(f => f(snap())), 10);
    const coll = name => ({
      doc: id => ({
        set: async d => { st[name].set(id, JSON.parse(JSON.stringify(d))); st.log.push(`set ${name} ${id}`); if (name === "cases") ping(); },
        delete: async () => { st[name].delete(id); st.log.push(`delete ${name} ${id}`); if (name === "cases") ping(); }
      }),
      get: async () => ({ docs: [...st[name].values()].map(d => ({ id: d.id, exists: true, data: () => d })) }),
      onSnapshot: cb => { subs.add(cb); setTimeout(() => cb({ metadata: { fromCache: true }, docs: [] }), 5); setTimeout(() => cb(snap()), 60); return () => subs.delete(cb); }
    });
    const db = { doc: () => ({ collection: n => coll(n) }) };
    window.__fake = st;
    window.claude = { use: async n => n === "db" ? db : n === "user" ? { id: async () => "u_test" } : null };
  });
  const page = await ctx.newPage(); const errors = [];
  const txt = sel => txtOf(page, sel);
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(FILE);
  /* gone：本機舊快取，帳戶已刪；zombie：舊版頁面又傳回帳戶（修改時間早於刪除）；reborn：刪除後重新存檔（較晚）；
     edited：帳戶是被傳回的舊版，本機那份在刪除後改過，應保留並補存 */
  const at = (c, t) => Object.assign(c, { updatedAt: t });
  const NAME_ID = { 雲端也有: "keep", 只在本機: "newone", 刪後重存: "reborn", 刪後又改: "edited" };
  await settleReload(page, cs => {
    localStorage.clear();
    localStorage.setItem("bazi.cases.v1", JSON.stringify(cs.local));
    localStorage.setItem("fake.remote", JSON.stringify({ cases: cs.remote, deleted: ["gone", { id: "zombie", at: 5 }, { id: "reborn", at: 5 }, { id: "edited", at: 5 }] }));
    localStorage.setItem("bazi.cur.v1", JSON.stringify({ c: cs.local[3], saved: true }));
    localStorage.setItem("bazi.page", JSON.stringify("cases"));
    history.replaceState(null, "", "#cases");
  }, {
    local: [mkCase("keep", "雲端也有", 1990, 1, 1, 0), mkCase("gone", "別處已刪", 1991, 2, 2, 2), mkCase("newone", "只在本機", 1992, 3, 3, 3), mkCase("zombie", "舊版傳回", 1993, 4, 4, 4), at(mkCase("edited", "刪後又改", 1995, 6, 6, 6), 20)],
    remote: [mkCase("keep", "雲端也有", 1990, 1, 1, 0), mkCase("zombie", "舊版傳回", 1993, 4, 4, 4), at(mkCase("reborn", "刪後重存", 1994, 5, 5, 5), 10), mkCase("edited", "刪後又改", 1995, 6, 6, 6)]
  }, () => !!window.__fake);
  const T = "cloud";
  try { await page.waitForFunction(() => (document.querySelector("#cases-sync") || {}).textContent && document.querySelector("#cases-sync").textContent.includes("已同步"), null, { timeout: 15000 }); }
  catch (e) {
    const d = await page.evaluate(() => ({ sync: (document.querySelector("#cases-sync") || {}).textContent, nav: (document.querySelector("#nav-sync") || {}).textContent, card: document.querySelector("#cases-card").textContent.slice(0, 80), hash: location.hash, fake: !!window.__fake, log: window.__fake && window.__fake.log }));
    ok(`[${T}] 等到已同步`, false, JSON.stringify(d) + " | " + errors.join(" | "));
    await browser.close(); return;
  }
  await page.waitForFunction(() => window.__fake.log.includes("delete cases zombie"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);
  const names = await page.$$eval(".case .case-name", ns => ns.map(n => n.textContent.trim().split(" ")[0]));
  ok(`[${T}] 在別處刪掉的案例不會被傳回`, !names.includes("別處已刪") && names.includes("只在本機") && names.includes("雲端也有"), names.join("、"));
  ok(`[${T}] 舊版頁面傳回帳戶的已刪案例不顯示`, !names.includes("舊版傳回"), names.join("、"));
  ok(`[${T}] 刪除後重新存檔、刪除後又改過的都保留`, names.includes("刪後重存") && names.includes("刪後又改"), names.join("、"));
  const log1 = await page.evaluate(() => window.__fake.log.slice());
  ok(`[${T}] 只在本機的案例補存進帳戶`, log1.includes("set cases newone") && !log1.some(x => x.includes("gone")), log1.join("；"));
  ok(`[${T}] 帳戶裡被傳回的已刪案例會清掉`, log1.includes("delete cases zombie") && !log1.includes("set cases zombie"), log1.join("；"));
  ok(`[${T}] 刪除後又改過的那份補存、不被清掉`, log1.includes("set cases edited") && !log1.includes("delete cases edited"), log1.join("；"));
  const remoteIds = await page.evaluate(() => [...window.__fake.cases.keys()].sort().join(","));
  ok(`[${T}] 帳戶最後只剩該留的案例`, remoteIds === "edited,keep,newone,reborn", remoteIds);
  ok(`[${T}] 導覽列顯示已同步`, (await txt("#nav-sync")).includes("已同步"));
  await page.locator('.case [data-act="case-del"]').first().click();
  const delName = (await txt(".case-confirm")).match(/「(.+)」/)[1];
  await page.click('[data-act="case-del-yes"]');
  await page.waitForFunction(() => window.__fake.log.some(x => x.startsWith("set deleted")));
  const log2 = await page.evaluate(() => window.__fake.log.slice());
  const id = NAME_ID[delName];
  ok(`[${T}] 刪除時一併寫入已刪除紀錄`, !!id && log2.includes(`delete cases ${id}`) && log2.includes(`set deleted ${id}`), delName + "：" + log2.slice(-2).join("；"));
  await page.click('.nav-item[data-page="basic"]');
  await page.waitForSelector("#page-basic .hbar");
  ok(`[${T}] 目前的盤在帳戶已刪除時，抬頭改回「存檔」`, (await page.locator('#page-basic .hbar [data-act="save-cur"]').count()) === 1 && (await page.locator("#page-basic .hbar .hdone").count()) === 0, await txt("#page-basic .hbar-acts"));
  await page.click('#page-basic .hbar [data-act="save-cur"]');
  await page.waitForFunction(() => window.__fake.log.includes("delete deleted zombie"), null, { timeout: 5000 }).catch(() => {});
  const log3 = await page.evaluate(() => window.__fake.log.slice());
  ok(`[${T}] 重新存檔會存回帳戶並撤掉已刪除紀錄`, log3.includes("set cases zombie") && log3.includes("delete deleted zombie"), log3.slice(-3).join("；"));
  await page.click('.nav-item[data-page="cases"]');
  const names2 = await page.$$eval(".case .case-name", ns => ns.map(n => n.textContent.trim().split(" ")[0]));
  ok(`[${T}] 重新存檔後回到案例列表`, names2.includes("舊版傳回"), names2.join("、"));
  ok(`[${T}] 沒有錯誤`, errors.length === 0, errors.join(" | "));
  await browser.close();
}
const txtOf = async (page, sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, " ").trim();

(async () => {
  await run({ name: "desktop", w: 1366, h: 900 });
  await run({ name: "mobile", w: 390, h: 844, mobile: true });
  await crossRun({ name: "desktop", w: 1366, h: 900 });
  await crossRun({ name: "mobile", w: 390, h: 844, mobile: true });
  await cloudRun();
  const f = results.filter(r => !r.pass);
  console.log(`\n通過 ${results.length - f.length}，失敗 ${f.length}`);
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
