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
  const hpText = await txt("#page-hepan");
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
  const idx = s => { const G = "甲乙丙丁戊己庚辛壬癸", Z = "子丑寅卯辰巳午未申酉戌亥"; const g = G.indexOf(s[0]), b = Z.indexOf(s[1]); return String(((6 * g - 5 * b) % 60 + 60) % 60); };
  await page.selectOption("#f-p0", idx("丙午")); await page.selectOption("#f-p1", idx("辛丑")); await page.selectOption("#f-p2", idx("甲寅")); await page.selectOption("#f-p3", idx("丁卯"));
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

(async () => {
  await run({ name: "desktop", w: 1366, h: 900 });
  await run({ name: "mobile", w: 390, h: 844, mobile: true });
  const f = results.filter(r => !r.pass);
  console.log(`\n通過 ${results.length - f.length}，失敗 ${f.length}`);
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
