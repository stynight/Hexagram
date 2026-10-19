/* 介面走查：桌面 1366 與手機 390 各走一遍，每個控制項都操作一次，並檢查橫向溢出、主控台錯誤。
   用法：node tests/ui.js [輸出截圖資料夾]（預設測 liuyao.html） */
let pw; try { pw = require("playwright"); } catch (e) { pw = require("/opt/npm-tools/node_modules/playwright"); }
const { chromium } = pw;
const path = require("path");
const fs = require("fs");
const FILE = "file://" + path.resolve(__dirname, "..", "liuyao.html");
const OUT = process.argv[2] || path.join(__dirname, "..", "dist", "shots");
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (label, cond, extra) => { if (cond) pass++; else { fail++; console.log("  ✗ " + label + (extra ? "｜" + extra : "")); } };

async function run(width, height, tag) {
  console.log(`== ${tag} ${width}×${height}`);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: width < 600 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  const shot = async name => page.screenshot({ path: path.join(OUT, `${tag}-${name}.png`), fullPage: true });
  const noOverflow = async label => {
    const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    ok(`${label}：沒有橫向溢出`, r.sw <= r.cw + 1, `${r.sw} > ${r.cw}`);
  };
  /* 檢查一個區塊裡沒有元素被裁切或超出卡片 */
  const noClip = async (sel, label) => {
    const bad = await page.evaluate(s => {
      const out = [];
      for (const root of document.querySelectorAll(s)) {
        const rb = root.getBoundingClientRect();
        for (const el of root.querySelectorAll("*")) {
          if (!el.offsetParent && getComputedStyle(el).position !== "fixed") continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          if (r.right > rb.right + 1.5 || r.left < rb.left - 1.5) out.push((el.className || el.tagName) + ":" + Math.round(r.left) + "-" + Math.round(r.right) + " vs " + Math.round(rb.left) + "-" + Math.round(rb.right));
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === "visible" && el.children.length === 0 && el.textContent.trim()) out.push("text-overflow " + (el.className || el.tagName) + " " + el.textContent.slice(0, 12));
        }
      }
      return out.slice(0, 8);
    }, sel);
    ok(`${label}：元素都在框內`, bad.length === 0, bad.join("；"));
  };
  await page.goto(FILE);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForSelector("#f-go");
  await shot("01-input-empty");
  await noOverflow("起卦頁");
  ok("一開始開始排盤按鈕停用", await page.$eval("#f-go", b => b.disabled));

  /* 日期時間：選 2026-10-17 10:00，時區 UTC+8，子時換日勾選 */
  await page.selectOption("#f-y", "2026"); await page.selectOption("#f-m", "10"); await page.selectOption("#f-d", "17");
  await page.selectOption("#f-hh", "10"); await page.selectOption("#f-mi", "0"); await page.selectOption("#f-tz", "8");
  ok("預覽四柱", (await page.textContent("#f-preview")).includes("丙午　戊戌　甲子　己巳"));
  ok("預覽旬空", (await page.textContent("#f-preview")).includes("旬空 戌亥"));
  /* 數字起卦 */
  await page.fill("#f-n1", "4"); await page.fill("#f-n2", "6");
  ok("只填兩個數字時提示還差一個", (await page.textContent("#f-steps")).includes("還差1個數字"));
  await page.fill("#f-n3", "2x");
  ok("數字欄位只收數字", (await page.inputValue("#f-n3")) === "2");
  ok("預覽卦名", (await page.textContent("#f-gua")).includes("雷水解") && (await page.textContent("#f-gua")).includes("火水未濟"));
  ok("算式顯示", (await page.textContent("#f-steps")).includes("(4 + 6 + 2) = 12 ÷ 6 餘 0"));
  await page.fill("#f-q", "測試占事");
  await shot("02-input-number");
  /* 子時換日勾選框：改到 23:30 看日柱 */
  await page.selectOption("#f-hh", "23"); await page.selectOption("#f-mi", "30");
  ok("23:30 子時換日→乙丑日", (await page.textContent("#f-preview")).includes("乙丑日"));
  await page.click("#f-zs");
  ok("取消子時換日→日柱甲子、時柱丙子", (await page.textContent("#f-preview")).includes("甲子日 丙子時"));
  await page.click("#f-zs");
  await page.selectOption("#f-hh", "10"); await page.selectOption("#f-mi", "0");
  /* 時區：本機 */
  await page.selectOption("#f-tz", "auto");
  ok("本機時區標示", (await page.textContent("#f-preview")).includes("（本機）"));
  await page.selectOption("#f-tz", "8");
  /* 現在按鈕 */
  await page.click("#f-now");
  const yNow = await page.inputValue("#f-y");
  ok("現在按鈕回到今年", yNow === String(new Date().getFullYear()));
  await page.selectOption("#f-y", "2026"); await page.selectOption("#f-m", "10"); await page.selectOption("#f-d", "17"); await page.selectOption("#f-hh", "10"); await page.selectOption("#f-mi", "0");
  /* 六爻分頁 */
  await page.click("#m-btn-manual");
  ok("切到六爻：選爻區出現", await page.isVisible("#f-picker"));
  ok("未選完時停用", await page.$eval("#f-go", b => b.disabled));
  const picks = [[5, 6], [4, 8], [3, 7], [2, 8], [1, 7], [0, 8]];      // 雷水解上六動（老陰）
  for (const [k, v] of picks) await page.click(`[data-act="pick"][data-pos="${k}"][data-v="${v}"]`);
  ok("六爻選完預覽", (await page.textContent("#f-gua")).includes("雷水解"));
  await page.click('[data-act="pick"][data-pos="0"][data-v="8"]');
  ok("再點一次取消選取", (await page.textContent("#f-steps")).includes("還有 1 個爻沒選"));
  await page.click('[data-act="pick"][data-pos="0"][data-v="9"]');
  ok("初爻改成老陽：本卦變雷澤歸妹", (await page.textContent("#f-gua")).includes("雷澤歸妹"));
  await shot("03-input-manual");
  await page.click("#f-clear");
  ok("全部清除", (await page.textContent("#f-steps")).includes("還有 6 個爻沒選"));
  /* 時間分頁 */
  await page.click("#m-btn-time");
  ok("時間起卦算式", (await page.textContent("#f-steps")).includes("年午7"));
  await page.selectOption("#f-m", "2"); await page.selectOption("#f-d", "27"); await page.selectOption("#f-hh", "8");
  ok("2026-02-27 08:00 → 火地晉之雷地豫", (await page.textContent("#f-gua")).includes("火地晉") && (await page.textContent("#f-gua")).includes("雷地豫"));
  await shot("04-input-time");
  /* 回數字分頁排盤 */
  await page.click("#m-btn-number");
  await page.selectOption("#f-m", "10"); await page.selectOption("#f-d", "17"); await page.selectOption("#f-hh", "10");
  await page.click("#f-go");
  await page.waitForSelector(".pan-row");
  await shot("05-chart");
  await noOverflow("排盤頁");
  await noClip(".pan-card", "排盤表");
  await noClip(".rel-card", "關係清單");
  await noClip(".hbar", "抬頭帶");
  const rows = await page.$$eval(".pan-row", rs => rs.map(r => r.innerText.replace(/\s+/g, " ")));
  ok("上爻列：玄武 妻財 庚戌土 化 子孫 己巳火", /玄武.*妻財.*庚戌土.*子孫.*己巳火/.test(rows[0]), rows[0]);
  ok("二爻列：世、戊辰土、月破", /妻財.*戊辰土.*世/.test(rows[4]) && rows[4].includes("月破"), rows[4]);
  ok("初爻列：伏 父母 庚子水", /伏 父母庚子水/.test(rows[5].replace(/\s/g, " ")) || rows[5].includes("父母庚子水"), rows[5]);
  ok("抬頭帶：雷水解→火水未濟、旬空戌亥", (await page.textContent(".hbar")).includes("火水未濟") && (await page.textContent(".hbar")).includes("戌亥"));
  ok("占事顯示", (await page.textContent(".hbar")).includes("測試占事"));
  const firstRel = await page.textContent(".rel");
  ok("最要緊第一條是世爻月破", firstRel.includes("月破") && firstRel.includes("戊辰土"), firstRel.slice(0, 60));
  /* 關係清單：每條只出現一次、總數相符、跳轉按鈕 */
  const relCount = await page.$$eval(".rel", rs => rs.length);
  const relTotal = +(await page.textContent(".rel-card .card-title small")).match(/共 (\d+) 條/)[1];
  ok("關係每條只列一次", relCount === relTotal, relCount + " / " + relTotal);
  const ids = await page.$$eval(".rel", rs => rs.map(r => r.dataset.id));
  ok("關係沒有重複", new Set(ids).size === ids.length);
  await page.click('[data-act="jump"][data-sec="rs-sk"]');
  await page.waitForTimeout(600);
  const skTop = await page.$eval("#rs-sk", el => el.getBoundingClientRect().top);
  ok("跳到生剋段落", skTop >= -2 && skTop < 140, String(skTop));
  await page.evaluate(() => window.scrollTo(0, 0));
  /* 點爻聚焦 */
  await page.click('.pan-row[data-pos="1"]');
  ok("聚焦列出現", await page.isVisible(".focusbar"));
  ok("無關的關係變淡", (await page.$$(".rel.is-dim")).length > 0);
  await shot("06-chart-focus");
  await page.click('[data-act="focus-clear"]');
  ok("取消聚焦", !(await page.$(".focusbar")));
  /* 點關係標出爻 */
  await page.click(".rel");
  ok("點關係後標出相關爻", (await page.$$(".pan-row.is-mark")).length >= 1);
  await page.click(".rel.is-sel");
  ok("再點取消標示", (await page.$$(".pan-row.is-mark")).length === 0);
  /* 規則說明展開 */
  await page.click(".rule-note summary");
  ok("規則說明展開", await page.isVisible(".rule-note ul"));
  /* 複製文字盤（無剪貼簿權限時改開對話框） */
  await page.click("#c-copy");
  await page.waitForTimeout(300);
  if (await page.isVisible("#modal")) {
    ok("複製對話框內有文字盤", (await page.inputValue("#copy-area")).includes("雷水解之火水未濟"));
    await page.click('[data-act="modal-close"]');
    ok("關閉對話框", await page.isHidden("#modal"));
  } else ok("已複製提示", (await page.textContent("#toast")).includes("已複製"));
  /* 存成卦例 */
  await page.click("#c-save");
  await page.waitForTimeout(200);
  ok("存卦例提示", (await page.textContent("#toast")).includes("已存成卦例"));
  ok("存完按鈕變已存", (await page.textContent("#c-save")).includes("已存在卦例"));
  /* 原文頁 */
  await page.click('.nav-item[data-page="text"]');
  await page.waitForSelector(".tx");
  const tx = await page.textContent("#page-text");
  ok("本卦卦辭", tx.includes("利西南，无所往，其來復吉。有攸往，夙吉。"));
  ok("本卦大象", tx.includes("雷雨作，解；君子以赦過宥罪。"));
  ok("動爻爻辭與小象", tx.includes("公用射隼于高墉之上，獲之，无不利。") && tx.includes("公用射隼，以解悖也。"));
  ok("變卦卦辭與大象", tx.includes("亨，小狐汔濟，濡其尾，无攸利。") && tx.includes("火在水上，未濟；君子以慎辨物居方。"));
  ok("變卦對應爻辭", tx.includes("有孚于飲酒，无咎，濡其首，有孚失是。") && tx.includes("飲酒濡首，亦不知節也。"));
  await shot("07-text");
  await noOverflow("原文頁");
  await page.click("#t-full");
  ok("展開本卦六爻全文", (await page.textContent("#page-text")).includes("田獲三狐，得黃矢，貞吉。"));
  await page.click("#t-full");
  /* 卦例頁：改名、刪除取消、關掉再打開 */
  await page.click('.nav-item[data-page="cases"]');
  ok("卦例一筆", (await page.$$(".case")).length === 1);
  await page.click('.case [data-act="case-edit"]');
  await page.fill(".case-edit .field", "改名後的卦例");
  await page.click('.case [data-act="case-rename"]');
  ok("改名成功", (await page.textContent(".case-name")).includes("改名後的卦例"));
  await page.click('.case [data-act="case-del"]');
  ok("刪除先確認", await page.isVisible(".case-confirm"));
  await page.click('.case-confirm [data-act="case-cancel"]');
  ok("取消刪除", !(await page.$(".case-confirm")) && (await page.$$(".case")).length === 1);
  await shot("08-cases");
  await noOverflow("卦例頁");
  /* 關掉再打開 */
  await page.close();
  const page2 = await ctx.newPage();
  page2.on("pageerror", e => errors.push(String(e)));
  await page2.goto(FILE + "#cases");
  await page2.waitForSelector(".case");
  ok("重開後卦例還在", (await page2.textContent(".case-name")).includes("改名後的卦例"));
  await page2.click('.case [data-act="case-open"]');
  await page2.waitForSelector(".pan-row");
  ok("打開卦例回到排盤", (await page2.textContent(".hbar")).includes("雷水解"));
  ok("打開後按鈕顯示已存", (await page2.textContent("#c-save")).includes("已存在卦例"));
  /* 匯出（獨立檔走一般下載） */
  await page2.click('.nav-item[data-page="cases"]');
  const [dl] = await Promise.all([page2.waitForEvent("download", { timeout: 4000 }).catch(() => null), page2.click("#cs-export")]);
  ok("匯出下載 JSON", !!dl && /\.json$/.test(dl.suggestedFilename()));
  if (dl) {
    const p = path.join(OUT, `${tag}-export.json`); await dl.saveAs(p);
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    ok("匯出內容一筆", j.cases && j.cases.length === 1);
    /* 刪除後匯入 */
    await page2.click('.case [data-act="case-del"]'); await page2.click('[data-act="case-del-yes"]');
    ok("刪除後清單為空", (await page2.$$(".case")).length === 0);
    await page2.setInputFiles("#f-import", p);
    await page2.waitForSelector(".case");
    ok("匯入回來", (await page2.$$(".case")).length === 1);
  }
  /* 晉卦看避字設定 */
  await page2.click('.nav-item[data-page="input"]');
  await page2.click("#m-btn-time");
  await page2.selectOption("#f-y", "2026"); await page2.selectOption("#f-m", "2"); await page2.selectOption("#f-d", "27"); await page2.selectOption("#f-hh", "8"); await page2.selectOption("#f-mi", "0"); await page2.selectOption("#f-tz", "8");
  await page2.click("#f-go");
  await page2.waitForSelector(".pan-row");
  ok("晉卦：合絆、合起標籤", (await page2.textContent(".pan")).includes("合絆") && (await page2.textContent(".pan")).includes("合起"));
  await page2.click('.nav-item[data-page="text"]');
  ok("避字預設以□顯示", (await page2.textContent("#page-text")).includes("晝日三□"));
  await page2.click('.nav-item[data-page="settings"]');
  await page2.click("#s-avoid");
  await page2.click('.nav-item[data-page="text"]');
  ok("關閉避字顯示原字", (await page2.textContent("#page-text")).includes("晝日三" + String.fromCharCode(0x63A5)));
  await page2.click('.nav-item[data-page="settings"]');
  await page2.click("#s-avoid");
  /* 設定：主題、分數、滑桿 */
  await page2.click('[data-act="theme"][data-id="moye"]');
  ok("換成墨夜主題", (await page2.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--bg").trim().toUpperCase())) === "#111214");
  await page2.screenshot({ path: path.join(OUT, `${tag}-09-settings-dark.png`), fullPage: true });
  await page2.click('[data-act="theme"][data-id="auto"]');
  await page2.click("#s-score");
  await page2.$eval("#s-top", el => { el.value = "7"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  ok("滑桿數值顯示", (await page2.textContent("#s-top-out")) === "7");
  await page2.click('.nav-item[data-page="chart"]');
  ok("最要緊變 7 條", (await page2.$$("#rs-top .rel")).length === 7);
  ok("分數隱藏", (await page2.$$(".rel-score")).length === 0);
  await page2.screenshot({ path: path.join(OUT, `${tag}-10-chart-jin.png`), fullPage: true });
  await page2.click('.nav-item[data-page="settings"]');
  await page2.click("#s-score");
  await page2.$eval("#s-top", el => { el.value = "5"; el.dispatchEvent(new Event("input", { bubbles: true })); });
  ok("沒有主控台錯誤", errors.length === 0, errors.join(" | "));
  await browser.close();
}
(async () => {
  await run(1366, 900, "desktop");
  await run(390, 844, "phone");
  console.log(`\n通過 ${pass} 項，失敗 ${fail} 項；截圖在 ${OUT}`);
  process.exitCode = fail ? 1 : 0;
})();
