/* ===== 介面 ===== */
(() => {
"use strict";
const B = Bazi;
const { GAN, ZHI, WX, pad2, mod } = B;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕或封鎖 */ } }
};
const localTz = () => -new Date().getTimezoneOffset() / 60;
const gS = g => `<span class="w${B.ganWx(g)}">${GAN[g]}</span>`;
const zS = b => `<span class="w${B.zhiWx(b)}">${ZHI[b]}</span>`;
const gzH = i => gS(i % 10) + zS(i % 12);
const ssAbbr = (dm, g) => B.SS_ABBR[B.tenGod(dm, g)];
const zAbbr = (dm, b) => B.SS_ABBR[B.zhiTenGod(dm, b)];
const fmtCN = c => `${c.y}年${pad2(c.m)}月${pad2(c.d)}日 ${pad2(c.hh)}:${pad2(c.mi)}`;
const fmtDash = c => `${c.y}-${pad2(c.m)}-${pad2(c.d)} ${pad2(c.hh)}:${pad2(c.mi)}`;
const fmtDate = c => `${c.y}-${pad2(c.m)}-${pad2(c.d)}`;
function tzText(tz) {
  if (tz === 8) return "北京時間";
  const a = Math.abs(tz), h = Math.floor(a), m = Math.round((a - h) * 60);
  return `UTC${tz < 0 ? "−" : "+"}${h}${m ? ":" + pad2(m) : ""}`;
}
const tzOption = tz => { const a = Math.abs(tz), h = Math.floor(a), m = Math.round((a - h) * 60); return `UTC${tz < 0 ? "−" : "+"}${h}${m ? ":" + pad2(m) : ""}`; };
const lonText = v => `${v < 0 ? "西經" : "東經"}${Math.abs(v).toFixed(2)}°`;
const latText = v => `${v < 0 ? "南緯" : "北緯"}${Math.abs(v).toFixed(2)}°`;
function durText(days) {
  const t = Math.round(days * 1440);
  const d = Math.floor(t / 1440), h = Math.floor((t % 1440) / 60), mi = t % 60;
  return `${d ? d + "天" : ""}${h ? h + "時" : ""}${mi ? mi + "分" : ""}` || "0分";
}
const newId = () => "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const PLACES = [
  ["未知地（北京時間）", 120, 39, 8], ["北京", 116.41, 39.9, 8], ["上海", 121.47, 31.23, 8], ["天津", 117.2, 39.08, 8], ["重慶", 106.55, 29.56, 8],
  ["哈爾濱", 126.53, 45.8, 8], ["長春", 125.32, 43.82, 8], ["瀋陽", 123.43, 41.8, 8], ["大連", 121.61, 38.91, 8], ["呼和浩特", 111.75, 40.84, 8],
  ["石家莊", 114.51, 38.04, 8], ["太原", 112.55, 37.87, 8], ["濟南", 117.12, 36.65, 8], ["青島", 120.38, 36.07, 8], ["鄭州", 113.62, 34.75, 8],
  ["西安", 108.94, 34.34, 8], ["蘭州", 103.83, 36.06, 8], ["銀川", 106.23, 38.49, 8], ["西寧", 101.78, 36.62, 8], ["烏魯木齊", 87.62, 43.83, 8],
  ["拉薩", 91.11, 29.65, 8], ["成都", 104.07, 30.57, 8], ["昆明", 102.83, 24.88, 8], ["貴陽", 106.63, 26.65, 8], ["南寧", 108.37, 22.82, 8],
  ["廣州", 113.26, 23.13, 8], ["深圳", 114.06, 22.54, 8], ["香港", 114.17, 22.32, 8], ["澳門", 113.54, 22.2, 8], ["海口", 110.32, 20.04, 8],
  ["福州", 119.3, 26.08, 8], ["廈門", 118.09, 24.48, 8], ["台北", 121.56, 25.04, 8], ["台中", 120.68, 24.15, 8], ["高雄", 120.31, 22.63, 8],
  ["南昌", 115.86, 28.68, 8], ["長沙", 112.94, 28.23, 8], ["武漢", 114.31, 30.59, 8], ["合肥", 117.23, 31.82, 8], ["南京", 118.8, 32.06, 8],
  ["杭州", 120.16, 30.27, 8], ["蘇州", 120.58, 31.3, 8], ["新加坡", 103.82, 1.35, 8], ["吉隆坡", 101.69, 3.14, 8], ["曼谷", 100.5, 13.76, 7],
  ["東京", 139.69, 35.69, 9], ["首爾", 126.98, 37.57, 9], ["雪梨", 151.21, -33.87, 10], ["倫敦", -0.13, 51.51, 0], ["巴黎", 2.35, 48.86, 1],
  ["紐約", -74.01, 40.71, -5], ["多倫多", -79.38, 43.65, -5], ["洛杉磯", -118.24, 34.05, -8], ["舊金山", -122.42, 37.77, -8], ["溫哥華", -123.12, 49.28, -8]
];
const TZS = [-12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4, -3.5, -3, -2, -1, 0, 1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14];

/* ---------- 權重 ---------- */
const WMETA = [
  { g: "type", title: "關係類型分", min: 0, max: 12, step: 0.5, items: [["sanhui", "三會"], ["sanhe", "三合"], ["chong", "沖"], ["liuhe", "六合"], ["sanxing", "三刑（三支全）"], ["xing", "刑（含自刑）"], ["banhe", "半合"], ["gonghe", "拱合（生墓）"], ["hai", "害"], ["po", "破"], ["anhe", "暗合"], ["ganhe", "天干五合"], ["ganchong", "天干四沖"], ["ganke", "天干相剋"], ["tkdc", "天剋地沖（整柱）"], ["thdh", "天合地合（整柱）"], ["fuyin", "伏吟（整柱相同）"]] },
  { g: "pos", title: "位置係數（原局）", min: 0, max: 2, step: 0.05, items: [["adj", "相鄰柱"], ["gap1", "隔一柱"], ["gap2", "隔兩柱"], ["day", "牽到日柱"]] },
  { g: "layer", title: "動態層係數", min: 0, max: 1.5, step: 0.05, items: [["dayun", "大運"], ["xiaoyun", "小運"], ["liunian", "流年"], ["liuyue", "流月"], ["liuri", "流日"], ["liushi", "流時"], ["dyndyn", "歲運之間"]] },
  { g: "he", title: "合盤位置係數", min: 0, max: 2, step: 0.05, items: [["dayStem", "日干×日干"], ["dayBranch", "日支×日支"], ["oneDay", "一方是日柱"], ["same", "同柱位"], ["other", "其他柱位"]] },
  { g: "power", title: "力量係數", min: 0, max: 2, step: 0.05, items: [["ling", "化神得令", 1, 2], ["kong", "旬空折減", 0, 1]] },
  { g: "view", title: "顯示", items: [["top", "置頂條數", 3, 5, 1], ["fold", "折疊門檻（分）", 0, 6, 0.5]] }
];
/* ---------- 主題 ---------- */
const WX_LIGHT = { mu: "#1A973D", huo: "#D2261E", tu: "#8A681B", jin: "#D5820A", shui: "#2B62D5" };
const WX_DARK = { mu: "#58CF78", huo: "#FF6B5E", tu: "#D4AA5E", jin: "#F2AA3A", shui: "#73A2FF" };
const THEMES = [
  { id: "yuebai", name: "月白", bg: "#F3F4F6", card: "#FFFFFF", ink: "#1F2328", accent: "#4A5B8C", bar: "#1F2430", barInk: "#E6EAF2" },
  { id: "subai", name: "素白", bg: "#F6F6F5", card: "#FFFFFF", ink: "#1C1C1C", accent: "#56606B", bar: "#FFFFFF", barInk: "#1C1C1C" },
  { id: "qingci", name: "青瓷", bg: "#EDF3F1", card: "#FCFEFD", ink: "#1D2B28", accent: "#3A8578", bar: "#1C302D", barInk: "#DDEFEA" },
  { id: "wulan", name: "霧藍", bg: "#EDF1F7", card: "#FFFFFF", ink: "#1B2433", accent: "#3567B0", bar: "#162238", barInk: "#DCE6F5" },
  { id: "bingjing", name: "冰晶", bg: "#F1EFFA", card: "#FFFFFF", ink: "#221F33", accent: "#7563C6", bar: "#231D3B", barInk: "#E9E4FF" },
  { id: "nuancheng", name: "暖橙", bg: "#FAF3EC", card: "#FFFFFF", ink: "#2A1E16", accent: "#D2703A", bar: "#2A1C14", barInk: "#FBE4D2" },
  { id: "yanzhi", name: "胭脂", bg: "#F9F0F1", card: "#FFFFFF", ink: "#2B1D20", accent: "#B04559", bar: "#2D191D", barInk: "#F6DCE1" },
  { id: "xuanzhi", name: "宣紙金", bg: "#F2F1ED", card: "#FFFFFF", ink: "#24211C", accent: "#A98A50", bar: "#1C1A16", barInk: "#EBDDBC" },
  { id: "moye", name: "墨夜", bg: "#111214", card: "#1A1C20", ink: "#E8EAED", accent: "#8AB4F8", bar: "#0B0C0E", barInk: "#DDE3EC" },
  { id: "yejin", name: "夜金", bg: "#11100E", card: "#1A1916", ink: "#ECE6DA", accent: "#C9A86A", bar: "#0B0A09", barInk: "#EBDBB4" },
  { id: "shenqing", name: "深青", bg: "#0E1615", card: "#16211F", ink: "#E2EEEA", accent: "#5CC2AE", bar: "#091010", barInk: "#D4ECE6" },
  { id: "ziye", name: "紫夜", bg: "#13111C", card: "#1C1928", ink: "#ECE8F7", accent: "#B4A2FF", bar: "#0C0A14", barInk: "#E4DEFF" }
];
const THEME_KEYS = [["bg", "底色", "頁面背景"], ["card", "卡片", "命盤與清單的底"], ["ink", "文字", "主要文字"], ["accent", "主色", "選中、按鈕與重點"], ["bar", "抬頭帶", "姓名那一列與手機分頁列"], ["barInk", "抬頭文字", "抬頭帶上的字"]];
const THEME_PROPS = ["--bg", "--card", "--ink", "--accent", "--on-accent", "--today", "--bar", "--bar-ink", "--mu", "--huo", "--tu", "--jin", "--shui", "--danger", "--shadow", "color-scheme"];
function rgbOf(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lumOf(h) { const c = rgbOf(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
const contrastOf = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const themeIsDark = t => lumOf(t.card) < 0.3;
/* 主色偏紅（胭脂、暖橙等）時，「今天」改用金色，免得與紅色的「沖」混在一起 */
function hueSat(h) {
  const [r, g, b] = rgbOf(h).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return { h: 0, s: 0 };
  let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  hh = (hh * 60 + 360) % 360;
  return { h: hh, s: d / (1 - Math.abs(mx + mn - 1)) };
}
const reddish = h => { const x = hueSat(h); return x.s > 0.25 && (x.h < 28 || x.h > 330); };
/* 主色跟卡片顏色太像（例如自訂成白底白色主色）時，選中的格子、按鈕字、今天的菱形都會看不見：
   逐步往文字色調，直到對卡片的對比到 3 為止；內建主題都在 3 以上，不受影響 */
function mixHex(a, b, p) { const A = rgbOf(a), Bv = rgbOf(b); return "#" + A.map((v, i) => Math.round(v + (Bv[i] - v) * p).toString(16).padStart(2, "0")).join("").toUpperCase(); }
function legibleAccent(t) {
  if (contrastOf(t.accent, t.card) >= 3) return t.accent;
  for (let k = 1; k <= 20; k++) { const m = mixHex(t.accent, t.ink, k / 20); if (contrastOf(m, t.card) >= 3) return m; }
  return t.ink;
}
function themeVars(t) {
  const dark = themeIsDark(t), wx = dark ? WX_DARK : WX_LIGHT, acc = legibleAccent(t);
  return {
    "--bg": t.bg, "--card": t.card, "--ink": t.ink, "--accent": acc,
    "--on-accent": contrastOf(acc, "#FFFFFF") >= contrastOf(acc, "#111111") ? "#FFFFFF" : "#111111",
    "--today": reddish(acc) ? (dark ? "#E8C25A" : "#B8860B") : acc,
    "--bar": t.bar, "--bar-ink": t.barInk,
    "--mu": wx.mu, "--huo": wx.huo, "--tu": wx.tu, "--jin": wx.jin, "--shui": wx.shui,
    "--danger": dark ? "#FF7B6E" : "#B42318",
    "--shadow": dark ? "0 1px 2px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.25)" : "0 1px 2px rgba(20,24,32,.05), 0 6px 18px rgba(20,24,32,.05)",
    "color-scheme": dark ? "dark" : "light"
  };
}
const systemDark = () => { try { return matchMedia("(prefers-color-scheme: dark)").matches; } catch (e) { return false; } };
function themeNow() {
  if (S.theme.id === "custom") return S.theme.custom;
  if (S.theme.id === "auto") { const host = document.documentElement.getAttribute("data-theme"); return THEMES.find(t => t.id === ((host ? host === "dark" : systemDark()) ? "moye" : "yuebai")); }
  return THEMES.find(t => t.id === S.theme.id) || THEMES[0];
}
function applyTheme() {
  const st = document.documentElement.style;
  THEME_PROPS.forEach(p => st.removeProperty(p));
  let vars = null;
  if (S.theme.id !== "auto") vars = themeVars(themeNow());
  if (vars) for (const k in vars) st.setProperty(k, vars[k]);
  LS.set("bazi.theme.v1", S.theme);
  LS.set("bazi.theme.vars", vars);
}
function themePreviewHTML(t, label) {
  const wx = themeIsDark(t) ? WX_DARK : WX_LIGHT, acc = legibleAccent(t);
  const mix = (a, p, b) => `color-mix(in srgb, ${a} ${p}%, ${b})`;
  return `<span class="tc-prev" style="background:${t.bg}">
    <span class="tc-bar" style="background:${t.bar};color:${mix(acc, 50, t.barInk)}"><i></i>${esc(label || t.name)}</span>
    <span class="tc-body"><span class="tc-cardm" style="background:${t.card};border:1px solid ${mix(t.ink, 12, t.card)}">
      <span class="tc-gz"><span style="color:${wx.mu}">甲</span><span style="color:${wx.huo}">丙</span><span style="color:${wx.tu}">戊</span><span style="color:${wx.jin}">庚</span><span style="color:${wx.shui}">壬</span></span>
      <span class="tc-sel" style="background:${acc}"></span></span></span></span>`;
}
/* ---------- 顯示項目（手機、電腦分開記） ---------- */
const SHOW_GROUPS = [
  { title: "命盤表的列", items: [["ss", "主星"], ["mk", "對原局（沖、合、伏）"], ["cang", "藏干"], ["fu", "副星（基本排盤）"], ["xy", "星運"], ["zz", "自坐"], ["kong", "空亡"], ["ny", "納音"], ["sha", "神煞"]] },
  { title: "干支條", items: [["s-dayun", "大運條"], ["s-year", "流年條"], ["s-month", "流月條"], ["s-day", "流日條"], ["s-hour", "流時條"], ["cmk", "格子底部的沖合標記"]] },
  { title: "資料與說明", items: [["info", "節氣與基本信息（基本排盤）"], ["pinfo", "起運、交運、旬空（專業細盤）"], ["algo", "起運算法說明"], ["hint", "干支條操作說明"], ["wbar", "旺相休囚死"], ["attn", "天干、地支、整柱留意"], ["rel", "關係清單"], ["hpx", "合盤的互看十神與五行互補"]] }
];
const HIDE_SEL = {
  ss: 'table.pan tr[data-row="ss"]', mk: 'table.pan tr[data-row="mk"]', cang: 'table.pan tr[data-row="cang"]', fu: 'table.pan tr[data-row="fu"]',
  xy: 'table.pan tr[data-row="xy"]', zz: 'table.pan tr[data-row="zz"]', kong: 'table.pan tr[data-row="kong"]', ny: 'table.pan tr[data-row="ny"]',
  sha: 'table.pan tr[data-row="sha"], .sha-toggle', "s-dayun": ".strip.s-dayun", "s-year": ".strip.s-year", "s-month": ".strip.s-month",
  "s-day": ".strip.s-day", "s-hour": ".strip.s-hour", cmk: ".cell .c-mk", info: "#page-basic .infobar, #page-basic .basic-extra",
  pinfo: ".pinfo-lines", algo: ".algo", hint: ".swipe-hint", wbar: ".wbar", attn: ".attn", rel: "section.rel", hpx: ".hpx"
};
const LITE = ["fu", "zz", "kong", "ny", "sha", "algo", "hint", "pinfo"];
const DEV_NAME = { phone: "手機版", desktop: "電腦版" };
const devMQ = window.matchMedia ? window.matchMedia("(max-width: 899px)") : null;
const devNow = () => (devMQ && devMQ.matches ? "phone" : "desktop");
function hideList(dev) { const h = S.prefs.hide || {}; return Array.isArray(h[dev]) ? h[dev].filter(k => HIDE_SEL[k]) : []; }
function applyHide() {
  const list = hideList(devNow());
  let st = document.getElementById("hide-style");
  if (!st) { st = document.createElement("style"); st.id = "hide-style"; document.head.appendChild(st); }
  st.textContent = list.length ? list.map(k => HIDE_SEL[k]).join(",\n") + " { display: none !important; }" : "";
  updateHideNote();
}
function updateHideNote() {
  const n = $("#hide-note"); if (!n) return;
  const cnt = hideList(devNow()).length;
  n.hidden = !(cnt && ["basic", "pro", "hepan"].includes(S.page));
  n.textContent = `${DEV_NAME[devNow()]}隱藏了 ${cnt} 項，按這裡到「設定」調整`;
}
if (devMQ) { const f = () => { applyHide(); if (S.page === "theme") renderTheme(); else if (S.page === "pro" || S.page === "hepan") rerenderPanels(S.page === "pro" ? "pro" : "A"); }; if (devMQ.addEventListener) devMQ.addEventListener("change", f); else if (devMQ.addListener) devMQ.addListener(f); }
function showCardHTML() {
  const dev = S.ui.showDev || devNow(), hid = new Set(hideList(dev));
  const segBtn = d => `<button type="button" data-act="show-dev" data-dev="${d}" aria-pressed="${dev === d}">${DEV_NAME[d]}${d === devNow() ? "（這台）" : ""}</button>`;
  return `<div class="card card-pad" id="show-card"><h1 class="card-title">顯示項目<small>打勾的會顯示，取消就隱藏；手機版（寬度 900 以下）與電腦版分開記，設定存在這個瀏覽器</small></h1>
    <div class="show-top"><div class="seg" role="group" aria-label="設定哪一種畫面">${segBtn("phone")}${segBtn("desktop")}</div>
      <div class="row-actions" style="margin:0"><button type="button" class="btn btn-sm" data-act="show-lite">精簡模式</button><button type="button" class="btn btn-sm" data-act="show-all">全部顯示</button></div></div>
    <p class="hint" style="margin:8px 0 0">精簡模式會收起副星、自坐、空亡、納音、神煞、起運交運資訊與兩段說明，只留下看盤最常用的部分；手機版另外把細盤表的動態欄減到大運與流年。</p>
    <div class="show-groups">${SHOW_GROUPS.map((g, gi) => `<fieldset class="show-group"><legend>${g.title}</legend>${g.items.map(([k, l]) => `<label class="check"><input type="checkbox" data-show="${k}"${hid.has(k) ? "" : " checked"}> ${l}</label>`).join("")}</fieldset>${gi === 0 ? dynGroupHTML(dev) : ""}`).join("")}</div></div>`;
}
function dynGroupHTML(dev) {
  return `<fieldset class="show-group dyn-group"><legend>細盤表的動態欄（專業細盤、合盤左邊的表）</legend>${DYN_LABEL.map(([v, l]) => `<label class="radio"><input type="radio" name="dyn-${dev}" data-dyn="${v}"${dynMode(dev) === v ? " checked" : ""}> <span>${l}</span></label>`).join("")}
    <p class="hint" style="grid-column:1/-1;margin:2px 0 4px">手機上欄位太擠時，可以只留一兩個動態欄，其餘看干支條；關係清單照樣計算全部層級。</p></fieldset>`;
}
/* ---------- 神煞查法（全部裝置共用） ---------- */
const SHA_RULES = [
  ["天乙貴人", "日干、年干查地支：甲戊庚丑未，乙己子申，丙丁亥酉，壬癸卯巳，辛午寅；庚可切換為午寅。"],
  ["太極貴人", "日干、年干查地支：甲乙子午，丙丁卯酉，戊己辰戌丑未，庚辛寅亥，壬癸巳申。"],
  ["天德貴人", "月支查干或支：寅丁 卯申 辰壬 巳辛 午亥 未甲 申癸 酉寅 戌丙 亥乙 子巳 丑庚。"],
  ["天德合", "天德的合：寅壬 卯巳 辰丁 巳丙 午寅 未己 申戊 酉亥 戌辛 亥庚 子申 丑乙。"],
  ["月德貴人", "月支三合局查天干：寅午戌丙，申子辰壬，亥卯未甲，巳酉丑庚。"],
  ["月德合", "月德的合：寅午戌辛，申子辰丁，亥卯未己，巳酉丑乙。"],
  ["文昌貴人", "日干、年干查地支：甲巳 乙午 丙申 丁酉 戊申 己酉 庚亥 辛子 壬寅 癸卯。"],
  ["國印貴人", "日干、年干查地支：甲戌 乙亥 丙丑 丁寅 戊丑 己寅 庚辰 辛巳 壬未 癸申。"],
  ["福星貴人", "日干、年干查地支：甲丙寅子，乙癸丑卯，丁亥，戊申，己未，庚午，辛巳，壬辰；可切換簡表。"],
  ["天廚貴人", "日干、年干查地支，取食神之祿：甲巳 乙午 丙巳 丁午 戊申 己酉 庚亥 辛子 壬寅 癸卯；可切換古表。"],
  ["學堂", "日干、年干的長生位：甲亥 乙午 丙戊寅 丁己酉 庚巳 辛子 壬申 癸卯；可切換年納音長生。"],
  ["詞館", "日干、年干查整柱干支：甲庚寅 乙辛卯 丙乙巳 丁戊午 戊丁巳 己庚午 庚壬申 辛癸酉 壬癸亥 癸壬戌；可切換年納音臨官。"],
  ["金輿", "日干查地支，祿前二位：甲辰 乙巳 丙戊未 丁己申 庚戌 辛亥 壬丑 癸寅。"],
  ["祿神", "日干的臨官：甲寅 乙卯 丙戊巳 丁己午 庚申 辛酉 壬亥 癸子。"],
  ["天醫", "月支的前一位：寅月丑、卯月寅……丑月子。"],
  ["將星", "年支、日支三合局的中神：申子辰子，寅午戌午，巳酉丑酉，亥卯未卯；起查那一柱自己不算。"],
  ["華蓋", "年支、日支三合局的墓庫：申子辰辰，寅午戌戌，巳酉丑丑，亥卯未未；起查那一柱自己不算。"],
  ["驛馬", "年支、日支：申子辰寅，寅午戌申，巳酉丑亥，亥卯未巳。"],
  ["桃花", "年支、日支（咸池）：申子辰酉，寅午戌卯，巳酉丑午，亥卯未子。"],
  ["紅鸞、天喜", "年支查：紅鸞子卯、丑寅、寅丑……逆行；天喜在紅鸞對沖。"],
  ["天赦", "日柱配季節：春戊寅、夏甲午、秋戊申、冬甲子。"],
  ["日德", "日柱為甲寅、丙辰、戊辰、庚辰、壬戌。"],
  ["魁罡", "日柱為庚辰、庚戌、壬辰、戊戌。"],
  ["金神", "日柱或時柱為乙丑、己巳、癸酉。"],
  ["羊刃", "日干祿前一位：甲卯 丙戊午 庚酉 壬子；陰干可切換祿前一位、逆行或不取。"],
  ["血刃", "月支查：寅丑 卯未 辰寅 巳申 午卯 未酉 申辰 酉戌 戌巳 亥亥 子午 丑子；月柱自己不算。"],
  ["劫煞", "年支、日支三合局的絕位：申子辰巳，寅午戌亥，巳酉丑寅，亥卯未申。"],
  ["亡神", "年支、日支三合局的臨官：申子辰亥，寅午戌巳，巳酉丑申，亥卯未寅。"],
  ["災煞", "年支查，將星的對沖：申子辰午，寅午戌子，巳酉丑卯，亥卯未酉。"],
  ["孤辰、寡宿", "年支查：亥子丑寅、戌；寅卯辰巳、丑；巳午未申、辰；申酉戌亥、未。"],
  ["勾絞", "年支前後第三位（陽男陰女前為勾後為絞，陰男陽女相反），兩位都標「勾絞」。"],
  ["元辰", "年支對沖的鄰位：陽男陰女取沖後一位（子年未），陰男陽女取沖前一位（子年巳）。"],
  ["喪門、弔客", "年支前二位為喪門，後二位為弔客。"],
  ["陰差陽錯", "日柱為丙子、丁丑、戊寅、辛卯、壬辰、癸巳、丙午、丁未、戊申、辛酉、壬戌、癸亥。"],
  ["十惡大敗", "日柱為甲辰、乙巳、壬申、丙申、丁亥、庚辰、戊戌、癸亥、辛巳、己丑。"],
  ["空亡", "日柱旬空；可切換是否也看年柱旬空。"]
];
function shaCardHTML() {
  const o = B.shaOpt(S.prefs.shaOpt);
  const changed = B.SHA_OPTIONS.some(it => o[it.k] !== B.SHA_DEFAULT[it.k]);
  const nChanged = B.SHA_OPTIONS.filter(it => o[it.k] !== B.SHA_DEFAULT[it.k]).length;
  return `<div class="card card-pad" id="sha-card"><h2 class="card-title">神煞查法<small>手機與電腦共用，設定存在這個瀏覽器</small></h2>
    <details class="sha-sw"${S.ui.shaOpen ? " open" : ""}><summary>流派切換（${B.SHA_OPTIONS.length} 項，<span id="sha-state">${nChanged ? `已改 ${nChanged} 項` : "目前全用預設"}</span>）</summary>
    <div class="sha-opts">${B.SHA_OPTIONS.map(it => `<fieldset class="sha-opt"><legend>${it.title}</legend>${it.items.map(([v, l], i) => `<label class="radio"><input type="radio" name="sha-${it.k}" data-sha="${it.k}" data-v="${v}"${o[it.k] === v ? " checked" : ""}> <span>${l}${i === 0 ? '<small class="dflt">預設</small>' : ""}</span></label>`).join("")}</fieldset>`).join("")}</div>
    <div class="row-actions" style="justify-content:flex-start;margin-top:12px"><button type="button" class="btn btn-sm" data-act="sha-reset"${changed ? "" : " disabled"}>神煞查法恢復預設</button></div></details>
    <details class="sha-rules"><summary>每個神煞怎麼查（共 ${B.SHENSHA_ORDER.length} 項）</summary>
      <p class="hint" style="margin:8px 0">以某柱地支起查的神煞，不算該柱自己（例如年支辰查華蓋得辰，年柱本身不標）；查日柱的神煞只看原局日柱。歲運與胎命身也照同樣規則查，但不套用只看日柱的幾項。</p>
      <dl>${SHA_RULES.map(([n, d]) => `<div><dt>${n}</dt><dd>${d}</dd></div>`).join("")}</dl></details></div>`;
}
function setHide(dev, list) { S.prefs.hide = Object.assign({}, S.prefs.hide, { [dev]: list }); savePrefs(); applyHide(); }
function renderTheme() {
  const root = $("#page-theme");
  const cur = S.theme.id;
  const card = (id, name, sub, prev) => `<button type="button" class="theme-card" data-act="theme" data-id="${id}" aria-pressed="${cur === id}">${prev}<span class="tc-name">${esc(name)}<small>${esc(sub)}</small></span></button>`;
  const yb = THEMES.find(t => t.id === "yuebai"), my = THEMES.find(t => t.id === "moye");
  let h = card("auto", "跟隨系統", "月白／墨夜", `<span class="tc-prev tc-split">${themePreviewHTML(yb, "淺色")}${themePreviewHTML(my, "深色")}</span>`);
  THEMES.forEach(t => { h += card(t.id, t.name, themeIsDark(t) ? "深色" : "淺色", themePreviewHTML(t)); });
  const c = S.theme.custom;
  h += card("custom", "自訂", themeIsDark(c) ? "深色" : "淺色", themePreviewHTML(c, "自訂"));
  root.innerHTML = showCardHTML() + shaCardHTML() + `<div class="card card-pad"><h2 class="card-title">主題配色<small>點一下就套用，設定記在這個瀏覽器；淺色主題的五行字用深色版，深色主題用亮色版</small></h2><div class="theme-grid">${h}</div></div>
    <div class="card card-pad"><h2 class="card-title">自訂色盤<small>改任何一個顏色就切換到「自訂」並立即套用</small></h2>
      <div class="cp-grid">${THEME_KEYS.map(([k, l, d]) => `<label class="cp" for="cp-${k}"><span class="cp-l">${l}<small>${d}</small></span><input type="color" id="cp-${k}" data-cp="${k}" value="${esc(c[k])}"><code id="cpv-${k}">${esc(c[k].toUpperCase())}</code></label>`).join("")}</div>
      <div class="row-actions" style="justify-content:flex-start"><button type="button" class="btn btn-sm" data-act="cp-copy">把目前主題複製到自訂</button><button type="button" class="btn btn-sm" data-act="theme" data-id="auto">恢復跟隨系統</button></div>
      <p class="hint" style="margin:10px 0 0">深淺按卡片顏色自動判斷；按鈕上的字會自動選黑或白；其他線條、淺底與次要文字都由這幾個顏色混出。主色如果跟卡片顏色太像（例如都設成白色），畫面上會自動往文字色加深一些，選中的格子、按鈕與今天的小菱形才看得見；色盤裡記的仍是你選的顏色。</p></div>`;
}
function onCustomColor(inp) {
  const k = inp.dataset.cp;
  S.theme.custom = Object.assign({}, S.theme.custom, { [k]: inp.value.toUpperCase() });
  S.theme.id = "custom";
  applyTheme();
  const code = document.getElementById("cpv-" + k); if (code) code.textContent = inp.value.toUpperCase();
  $$(".theme-card").forEach(b => b.setAttribute("aria-pressed", b.dataset.id === "custom" ? "true" : "false"));
  const cc = $('.theme-card[data-id="custom"]');
  if (cc) { const c = S.theme.custom; cc.innerHTML = `${themePreviewHTML(c, "自訂")}<span class="tc-name">自訂<small>${themeIsDark(c) ? "深色" : "淺色"}</small></span>`; }
}

function loadWeights() {
  const W = JSON.parse(JSON.stringify(B.DEFAULT_WEIGHTS));
  const saved = LS.get("bazi.weights.v1", null);
  if (saved) for (const g in W) for (const k in W[g]) if (saved[g] && typeof saved[g][k] === "number") W[g][k] = saved[g][k];
  return W;
}

/* ---------- 節氣存檔：算過的年份存進瀏覽器，下次打開就讀存檔 ---------- */
const termDisk = (() => {
  const KEY = "bazi.terms.v1";
  let data = null, dirty = false, timer = null;
  const load = () => {
    if (data) return;
    const v = LS.get(KEY, null);
    data = v && v.v === B.TERM_VERSION && v.y && typeof v.y === "object" ? v.y : {};
  };
  const flush = () => {
    clearTimeout(timer); timer = null;
    if (!dirty || !data) return;
    dirty = false;
    const ys = Object.keys(data);
    if (ys.length > 400) ys.sort((a, b) => (data[a].t || 0) - (data[b].t || 0)).slice(0, ys.length - 400).forEach(k => { delete data[k]; });
    LS.set(KEY, { v: B.TERM_VERSION, y: data });
  };
  return {
    get(Y) { load(); const r = data[Y]; return r && Array.isArray(r.j) ? r.j : null; },
    put(Y, j) { load(); data[Y] = { j, t: Date.now() }; dirty = true; if (!timer) timer = setTimeout(flush, 1500); },
    flush
  };
})();
B.setTermStore(termDisk);
window.addEventListener("pagehide", () => termDisk.flush());
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") termDisk.flush(); });

/* ---------- 案例存放：登入時存帳戶（私人），否則存瀏覽器 ----------
   status：local（沒有帳戶，只存這個瀏覽器）、connecting（讀取帳戶中）、cloud（已同步）、error（同步中斷）。
   刪除時另寫一筆「已刪除」紀錄（含刪除時間），別台瀏覽器的舊快取就不會把它傳回帳戶。
   判斷規則：案例最後修改時間不晚於刪除時間，就當作已刪除；帳戶裡若被舊版頁面傳回，也會順手清掉。
   刪除之後又重新存檔（修改時間較晚）則算是新的，保留。 */
const clone = o => JSON.parse(JSON.stringify(o));
const Store = {
  cases: LS.get("bazi.cases.v1", []),
  col: null, tomb: null, status: "local", busy: 0, lastSync: 0, failed: 0, rev: 0, subs: new Set(),
  dead: new Map(), purging: new Set(),
  isDead(c) { return this.dead.has(c.id) && this.dead.get(c.id) >= (c.updatedAt || 0); },
  emit() { this.subs.forEach(f => { try { f(); } catch (e) { console.error(e); } }); },
  sort() { this.cases.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
  saveLocal() { this.rev++; LS.set("bazi.cases.v1", this.cases); },
  get(id) { return this.cases.find(c => c.id === id) || null; },
  async write(fn, failMsg) {
    this.busy++; this.emit();
    try { await fn(); this.lastSync = Date.now(); if (this.status === "error") this.status = "cloud"; }
    catch (e) { this.failed++; if (this.status === "cloud") this.status = "error"; toast(failMsg); }
    finally { this.busy--; this.emit(); }
  },
  async put(c) {
    c.updatedAt = Date.now();
    const i = this.cases.findIndex(x => x.id === c.id);
    if (i >= 0) this.cases[i] = c; else this.cases.unshift(c);
    this.sort(); this.saveLocal(); this.emit();
    const col = this.col, tomb = this.tomb, revive = this.dead.has(c.id);
    if (revive) this.dead.delete(c.id);                            // 刪除後又存檔：撤掉已刪除紀錄
    if (col) await this.write(async () => { await col.doc(c.id).set(clone(c)); if (revive && tomb) await tomb.doc(c.id).delete(); }, "帳戶存檔沒有成功，這個案例先存在本瀏覽器。");
  },
  async remove(id) {
    this.cases = this.cases.filter(c => c.id !== id);
    this.saveLocal(); this.emit();
    const col = this.col, tomb = this.tomb, at = Date.now();
    this.dead.set(id, at);
    if (col) await this.write(async () => { await col.doc(id).delete(); if (tomb) await tomb.doc(id).set({ id, at }); }, "帳戶裡的刪除沒有成功，稍後再試一次。");
  },
  purge(col, list) {                                              // 舊版頁面傳回帳戶的已刪除案例，安靜清掉
    for (const c of list) {
      if (this.purging.has(c.id)) continue;
      this.purging.add(c.id);
      Promise.resolve().then(() => col.doc(c.id).delete()).catch(() => { /* 下次打開再清 */ }).then(() => this.purging.delete(c.id));
    }
  },
  async initCloud() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== "function") return;
    this.status = "connecting"; this.emit();
    const giveUp = () => { this.status = "local"; this.emit(); };
    try {
      const [db, user] = await Promise.all([cl.use("db"), cl.use("user")]);
      if (!db || !user) return giveUp();
      const uid = await user.id();
      if (!uid) return giveUp();
      const base = db.doc("data/users/" + uid + "/bazi");
      const col = base.collection("cases"), tomb = base.collection("deleted");
      try {
        const ts = await tomb.get();
        ts.docs.forEach(d => { const v = d.data ? d.data() : null; const at = v && Number.isFinite(v.at) ? v.at : Infinity; this.dead.set(d.id, Math.max(at, this.dead.get(d.id) || 0)); });
      } catch (e) { /* 讀不到就當作沒有 */ }
      let synced = false;
      this.col = col; this.tomb = tomb; this.known = new Set();
      col.onSnapshot(snap => {
        if (!synced && snap.metadata.fromCache) return;
        const all = snap.docs.map(d => d.data()).filter(x => x && x.id).map(clone);
        const remote = all.filter(c => !this.isDead(c)), liveIds = new Set(remote.map(c => c.id));
        if (!synced) {
          synced = true;
          const localOnly = this.cases.filter(c => !liveIds.has(c.id));
          const missing = localOnly.filter(c => !this.isDead(c));           // 新的，或刪除後又改過的
          const dropped = localOnly.length - missing.length;
          for (const c of missing) this.write(() => col.doc(c.id).set(clone(c)), "有案例沒能存上帳戶，先留在本瀏覽器。");
          this.cases = remote.concat(missing);
          if (dropped) setTimeout(() => toast(`帳戶紀錄顯示有 ${dropped} 個案例已經刪除，這裡也一併移除。`), 400);
        } else {
          const pendingLocal = this.cases.filter(c => !liveIds.has(c.id) && !this.known.has(c.id));
          this.cases = remote.concat(pendingLocal);
        }
        const keep = new Set(this.cases.map(c => c.id));                    // 本機有較新的一份正在補存，就不刪
        const zombies = all.filter(c => this.isDead(c) && !keep.has(c.id));
        if (zombies.length) this.purge(col, zombies);
        this.known = liveIds;
        this.sort(); this.saveLocal(); this.status = "cloud"; this.lastSync = Date.now(); this.emit();
      }, () => { this.col = null; this.tomb = null; this.status = "error"; this.emit(); });
    } catch (e) { this.col = null; this.tomb = null; this.status = "error"; this.emit(); }
  },
  known: new Set()
};
const SYNC_TEXT = {
  local: ["案例存在這個瀏覽器", "沒有登入帳戶（或單獨打開 HTML 檔），換裝置看不到"],
  connecting: ["正在讀取帳戶裡的案例…", "先顯示這個瀏覽器存的，讀完會自動合併"],
  cloud: ["已同步到你的帳戶", "換裝置打開也看得到"],
  saving: ["儲存中…", "正在寫入帳戶"],
  error: ["帳戶同步中斷", "這段期間的變更先存在這個瀏覽器，重新打開頁面會再試"]
};
function syncState() { return Store.busy && Store.status === "cloud" ? "saving" : Store.status; }
function syncHTML(full) {
  const st = syncState(), [a, b] = SYNC_TEXT[st];
  const t = st === "cloud" && Store.lastSync ? `・${pad2(new Date(Store.lastSync).getHours())}:${pad2(new Date(Store.lastSync).getMinutes())}` : "";
  return `<span class="sync sync-${st}" role="status"><i aria-hidden="true"></i><span class="sync-a">${a}${t}</span>${full ? `<span class="sync-b">${b}</span>` : ""}</span>`;
}
function renderSync() {
  const n = $("#nav-sync"); if (n) n.innerHTML = syncHTML(false);
  const c = $("#cases-sync"); if (c) c.innerHTML = syncHTML(true);
}

/* ---------- 狀態 ---------- */
const S = {
  page: "input",
  cur: null,
  proSel: null,
  hepan: Object.assign({ a: null, b: null, started: false }, LS.get("bazi.hepan.v1", {})),
  hpSel: { A: null, B: null },
  W: loadWeights(),
  prefs: Object.assign({ tms: false, sha: true, wOpen: false, autosave: false, hide: { phone: [], desktop: [] }, dyn: { phone: "all", desktop: "all" }, shaOpt: {}, hpCross: false }, LS.get("bazi.prefs.v1", {})),
  mode: "solar",
  flow: null,
  fold: {},
  ui: { editing: null, confirming: null, filter: "" },
  theme: (() => {
    const t = Object.assign({ id: "auto", custom: null }, LS.get("bazi.theme.v1", {}));
    if (!t.custom || !t.custom.bg) { const b = THEMES[0]; t.custom = { name: "自訂", bg: b.bg, card: b.card, ink: b.ink, accent: b.accent, bar: b.bar, barInk: b.barInk }; }
    if (t.id !== "auto" && t.id !== "custom" && !THEMES.some(x => x.id === t.id)) t.id = "auto";
    return t;
  })()
};
const savePrefs = () => LS.set("bazi.prefs.v1", S.prefs);
const saveHepan = () => LS.set("bazi.hepan.v1", { a: S.hepan.a, b: S.hepan.b, started: S.hepan.started });

const chartCache = new Map();
function chartOf(c) {
  const key = JSON.stringify([c.mode, c.solar, c.sex, c.place, c.dst, c.trueSolar, c.zishi, c.sizhu && c.sizhu.p]);
  if (chartCache.has(key)) return chartCache.get(key);
  let ch;
  if (!c.solar) ch = B.chartFromPillars(c.sizhu.p, c.sex);
  else {
    const s = c.solar, sz = c.mode === "sizhu";
    ch = B.buildChart({ sex: c.sex, y: s.y, m: s.m, d: s.d, hh: s.hh, mi: s.mi, tz: c.place.tz, dst: sz ? false : c.dst, lon: c.place.lon, lat: c.place.lat, trueSolar: sz ? false : c.trueSolar, zishi: c.zishi });
  }
  chartCache.set(key, ch);
  return ch;
}

/* ---------- 此刻 ---------- */
function nowMoment() { return B.momentOf(B.jdNow(), localTz()); }
function selNow(chart) {
  const m = nowMoment();
  if (chart.pillarsOnly) return null;
  const dk = B.dayunIndexForYear(chart, m.Y);
  return { dk, year: m.Y, mk: m.monthK, dn: m.dayNum, hb: m.hourBranch };
}
function yearRange(chart, dk, selYear) {
  if (dk < 0) {
    const from = selYear != null && selYear < chart.yun.xiaoYunFrom ? selYear : chart.yun.xiaoYunFrom;  // 合盤時另一方可能選到出生前的年份
    return [from, chart.yun.xiaoYunTo];
  }
  const s = chart.yun.dayun[dk].startYear; return [s, s + 9];
}

/* ---------- 頁面切換 ---------- */
const PAGES = ["input", "cases", "basic", "pro", "hepan", "theme"];
function go(page, opt) {
  if (!PAGES.includes(page)) page = "input";
  S.booted = true;
  S.page = page;
  $$(".page").forEach(p => { p.hidden = p.id !== "page-" + page; });
  $$(".nav-item").forEach(b => b.setAttribute("aria-current", b.dataset.page === page ? "page" : "false"));
  render(page);
  updateHideNote();
  if (!opt || !opt.keepScroll) window.scrollTo(0, 0);
  try { history.replaceState(null, "", "#" + page); } catch (e) { /* 無妨 */ }
  LS.set("bazi.page", page);
}
function render(page) {
  if (page === "input") renderInputDynamic();
  else if (page === "cases") renderCases();
  else if (page === "basic") renderBasic();
  else if (page === "pro") renderPro();
  else if (page === "hepan") renderHepan();
  else if (page === "theme") renderTheme();
}

let toastTimer = null;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

/* =========================================================
   輸入頁
   ========================================================= */
function opt(v, t, sel) { return `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`; }
/* 表單的選單（近千個選項）到第一次用到排盤頁才建 */
let formReady = false;
function ensureForm() {
  if (formReady) return;
  formReady = true;
  buildFormOptions();
  fillFormNow();
  setModeNoSync(S.mode);
}
function buildFormOptions() {
  let h = ""; for (let y = 1801; y <= 2100; y++) h += opt(y, y + "年"); $("#f-sy").innerHTML = h;
  h = ""; for (let m = 1; m <= 12; m++) h += opt(m, m + "月"); $("#f-sm").innerHTML = h;
  h = ""; for (let x = 0; x < 24; x++) h += opt(x, pad2(x) + "時"); $("#f-hh").innerHTML = h;
  h = ""; for (let x = 0; x < 60; x++) h += opt(x, pad2(x) + "分"); $("#f-mi").innerHTML = h;
  h = ""; for (let y = 1801; y <= 2099; y++) h += opt(y, `${y}年（${B.gzName(B.yearGZ(y))}）`); $("#f-ly").innerHTML = h;
  h = PLACES.map((p, i) => opt(i, p[0])).join("") + opt("custom", "自訂座標"); $("#f-place").innerHTML = h;
  $("#f-tz").innerHTML = TZS.map(t => opt(t, tzOption(t), t === 8)).join("");
}
function rebuildDays() {
  const y = +$("#f-sy").value, m = +$("#f-sm").value, cur = +$("#f-sd").value || 1;
  const n = B.monthLen(y, m);
  let h = ""; for (let d = 1; d <= n; d++) h += opt(d, d + "日", d === Math.min(cur, n));
  $("#f-sd").innerHTML = h;
}
function rebuildLunarMonths(keep) {
  const ly = +$("#f-ly").value;
  const ms = B.lunarMonthsOfYear(ly);
  const cur = keep || $("#f-lm").value;
  $("#f-lm").innerHTML = ms.map(m => opt(`${m.num}|${m.leap ? 1 : 0}`, (m.leap ? "閏" : "") + B.LUNAR_MONTH[m.num])).join("");
  if (cur && ms.some(m => `${m.num}|${m.leap ? 1 : 0}` === cur)) $("#f-lm").value = cur;
  rebuildLunarDays();
}
function rebuildLunarDays(keep) {
  const ly = +$("#f-ly").value; const [num, lp] = ($("#f-lm").value || "1|0").split("|").map(Number);
  const m = B.lunarMonthsOfYear(ly).find(x => x.num === num && (x.leap ? 1 : 0) === lp);
  const n = m ? m.end - m.start : 30;
  const cur = keep || +$("#f-ld").value || 1;
  let h = ""; for (let d = 1; d <= n; d++) h += opt(d, B.LUNAR_DAY[d], d === Math.min(cur, n));
  $("#f-ld").innerHTML = h;
}
function setPlaceByIndex(i) {
  const p = PLACES[i]; if (!p) return;
  $("#f-lon").value = p[1].toFixed(2); $("#f-lat").value = p[2].toFixed(2); $("#f-tz").value = String(p[3]);
}
function setMode(mode) {
  ensureForm();
  S.mode = mode;
  $$('[data-act="mode"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false"));
  $("#g-solar").hidden = mode !== "solar";
  $("#g-lunar").hidden = mode !== "lunar";
  $("#g-time").hidden = mode === "sizhu";
  $("#g-sizhu").hidden = mode !== "sizhu";
  $("#g-sizhu-note").hidden = mode !== "sizhu";
  if (mode === "lunar") syncLunarFromSolar();
  if (mode === "sizhu") syncSizhuFromSolar();
  updatePreview();
}
function syncLunarFromSolar() {
  const dn = B.ymdToDayNum(+$("#f-sy").value, +$("#f-sm").value, +$("#f-sd").value);
  const l = B.lunarOfDay(dn); if (!l) return;
  $("#f-ly").value = String(l.year);
  rebuildLunarMonths(`${l.month}|${l.leap ? 1 : 0}`);
  rebuildLunarDays(l.day); $("#f-ld").value = String(l.day);
}
function syncSizhuFromSolar() {
  const r = readSolarRaw();
  S.pzActive = 0;
  try {
    const ch = B.buildChart(Object.assign({ sex: "m", tz: +$("#f-tz").value, lon: +$("#f-lon").value, trueSolar: false, zishi: $("#f-zs").checked ? "split" : "day23" }, r));
    setPillars(ch.pillars, { silent: true });
  } catch (e) { /* 保持原值 */ }
  S.candPick = null;
  renderPz();
  renderCands();
}
function readSolarRaw() { return { y: +$("#f-sy").value, m: +$("#f-sm").value, d: +$("#f-sd").value, hh: +$("#f-hh").value, mi: +$("#f-mi").value }; }
function fillSolar(o) {
  $("#f-sy").value = String(o.y); $("#f-sm").value = String(o.m); rebuildDays(); $("#f-sd").value = String(o.d);
  $("#f-hh").value = String(o.hh); $("#f-mi").value = String(o.mi);
}
function fillFormNow() {
  ensureForm();
  const n = new Date();
  fillSolar({ y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), hh: n.getHours(), mi: n.getMinutes() });
  $("#f-place").value = "0"; setPlaceByIndex(0);
  $("#f-save").checked = !!S.prefs.autosave;
}
let candList = [];
/* ---------- 四柱輸入
   點一柱，再點天干、地支；陽干只列陽支，陰干只列陰支。月干、時干照五虎遁、五鼠遁從年干、日干帶出，只要點地支。
   點完地支跳到下一柱。上方文字框可以自己打或貼上（例如「丙午 庚寅 壬辰 甲辰」，夾雜別的字也行，取前四柱）。 */
const PZ_NAME = ["年柱", "月柱", "日柱", "時柱"];
const PZ_AUTO = { 1: "年干五虎遁", 3: "日干五鼠遁" };
const getPillars = () => [0, 1, 2, 3].map(k => +$("#f-p" + k).value);
let PZ_HELP = null;                                                  // 文字框下方原本的說明，改過干支後放回去
function setPillars(p, opt) {
  const o = opt || {};
  p.forEach((v, k) => { $("#f-p" + k).value = String(v); });
  if (!o.keepText) {
    const q = $("#f-gzq"), m = $("#f-gzq-msg");
    if (q) q.value = p.map(B.gzName).join(" ");
    if (m) { if (PZ_HELP == null) PZ_HELP = m.textContent; m.textContent = PZ_HELP; }
  }
  renderPz();
  if (!o.silent) { S.candPick = null; if (S.mode === "sizhu") renderCands(); updatePreview(); }
}
function renderPz() {
  const box = $("#f-pz"); if (!box) return;
  const p = getPillars(), a = S.pzActive || 0;
  const g = p[a] % 10, b = p[a] % 12;
  const tabs = p.map((v, k) => `<button type="button" class="pz-tab" data-act="pz-tab" data-k="${k}" aria-pressed="${k === a}" aria-label="${PZ_NAME[k]} ${B.gzName(v)}${k === a ? "，正在修改" : "，點一下修改"}"><span class="pz-t">${PZ_NAME[k]}</span><span class="pz-gz">${gzH(v)}</span></button>`).join("");
  const key = (act, i, on, html, label) => `<button type="button" class="pz-key" data-act="${act}" data-v="${i}" aria-pressed="${on}" aria-label="${label}">${html}</button>`;
  let rows = "";
  if (PZ_AUTO[a]) {
    const want = a === 1 ? B.monthGZ(p[0], b) : B.hourGZ(p[2], b);
    rows += want === p[a] ? `<p class="hint pz-note">${PZ_NAME[a][0]}干照${PZ_AUTO[a]}帶出（${GAN[g]}），點地支就好。</p>`
      : `<p class="hint pz-note pz-warn">目前的${PZ_NAME[a][0]}干${GAN[g]}跟${PZ_AUTO[a].slice(0, 2)}不合，照${PZ_AUTO[a]}應為${GAN[want % 10]}；點一下地支就會改正。</p>`;
  }
  else rows += `<div class="pz-row pz-row-g" role="group" aria-label="${PZ_NAME[a]}天干"><span class="pz-k" aria-hidden="true">天干</span>${GAN.map((x, i) => key("pz-gan", i, i === g, gS(i), `${PZ_NAME[a]}天干${x}`)).join("")}</div>`;
  const zs = []; for (let i = 0; i < 12; i++) if (PZ_AUTO[a] || (i & 1) === (g & 1)) zs.push(i);
  rows += `<div class="pz-row pz-row-z" role="group" aria-label="${PZ_NAME[a]}地支"><span class="pz-k" aria-hidden="true">地支${PZ_AUTO[a] ? "" : (g & 1 ? "（陰支）" : "（陽支）")}</span>${zs.map(i => key("pz-zhi", i, i === b, zS(i), `${PZ_NAME[a]}地支${ZHI[i]}`)).join("")}</div>`;
  box.innerHTML = `<div class="pz-tabs">${tabs}</div><div class="pz-keys">${rows}</div>`;
}
/* 改了年干或日干，月干、時干跟著重算 */
function pzDerive(p) {
  p[1] = B.monthGZ(p[0], p[1] % 12);
  p[3] = B.hourGZ(p[2], p[3] % 12);
  return p;
}
function pzPick(kind, v) {
  const p = getPillars(), a = S.pzActive || 0;
  if (kind === "gan") {
    let b = p[a] % 12; if ((b & 1) !== (v & 1)) b = (b + 1) % 12;          // 陰陽不合時換成下一個支
    p[a] = B.gzIndex(v, b);
  } else if (a === 1) p[1] = B.monthGZ(p[0], v);
  else if (a === 3) p[3] = B.hourGZ(p[2], v);
  else p[a] = B.gzIndex(p[a] % 10, v);
  pzDerive(p);
  if (kind === "zhi" && a < 3) S.pzActive = a + 1;
  setPillars(p);
  const f = $(kind === "zhi" && a < 3 ? '#f-pz .pz-key[aria-pressed="true"]' : `#f-pz .pz-key[data-act="pz-${kind}"][aria-pressed="true"]`);
  if (f) f.focus();
}
function parseGzText(s) {
  const chars = Array.from(s || "").filter(c => GAN.includes(c) || ZHI.includes(c));
  const p = [];
  for (let i = 0; i < chars.length && p.length < 4; i += 2) {
    const g = GAN.indexOf(chars[i]), b = ZHI.indexOf(chars[i + 1]);
    if (g < 0 || b < 0) return { error: `第 ${p.length + 1} 柱要先寫天干、再寫地支（讀到「${chars[i]}${chars[i + 1] || ""}」）`, n: p.length };
    if ((g & 1) !== (b & 1)) return { error: `「${chars[i]}${chars[i + 1]}」不成柱：陽干配陽支，陰干配陰支`, n: p.length };
    p.push(B.gzIndex(g, b));
  }
  return { p, n: p.length, extra: chars.length > 8 };
}
function onGzText() {
  const q = $("#f-gzq"), msg = $("#f-gzq-msg");
  if (PZ_HELP == null) PZ_HELP = msg.textContent;
  if (!q.value.trim()) { msg.textContent = PZ_HELP; return; }
  const r = parseGzText(q.value);
  if (r.error) { msg.textContent = r.error + "。"; return; }
  if (r.n < 4) { msg.textContent = `已認出 ${r.n} 柱${r.n ? "：" + r.p.map(B.gzName).join(" ") : ""}，還差 ${4 - r.n} 柱。`; return; }
  msg.textContent = `已填入 ${r.p.map(B.gzName).join(" ")}${r.extra ? "（只取前四柱）" : ""}。`;
  setPillars(r.p, { keepText: true });
}
function renderCands() {
  const p = [0, 1, 2, 3].map(k => +$("#f-p" + k).value);
  const r = B.searchPillars(p, { from: 1801, to: 2100, tz: +$("#f-tz").value });
  candList = r.list;
  const box = $("#f-cands");
  if (r.error) { box.innerHTML = `<p class="hint err" style="color:var(--danger)">${esc(r.error)}。${esc(fixHint(p, r.error))}</p>`; return; }
  if (!r.list.length) { box.innerHTML = `<p class="hint">1801–2100 年間找不到符合這組四柱的時間。仍可只看四柱，但無法排大運與流年。</p>`; return; }
  const now = B.jdNow();
  let best = 0, bd = Infinity;
  r.list.forEach((c, i) => { const d = Math.abs(c.fromJD - now); if (d < bd) { bd = d; best = i; } });
  if (S.candPick == null || S.candPick >= r.list.length) S.candPick = best;
  box.innerHTML = r.list.map((c, i) => {
    const l = B.lunarOfDay(B.ymdToDayNum(c.mid.y, c.mid.m, c.mid.d));
    return `<label class="cand"><input type="radio" name="f-cand" value="${i}"${i === S.candPick ? " checked" : ""}>
      <span class="num">${fmtDate(c.from)} ${pad2(c.from.hh)}:${pad2(c.from.mi)}–${pad2(c.to.hh)}:${pad2(c.to.mi)}</span>
      <span class="dim">取 ${pad2(c.mid.hh)}:${pad2(c.mid.mi)} · 農曆 ${esc(B.lunarText(l))}${c.cut ? " · 交節切段" : ""}</span></label>`;
  }).join("");
}
function fixHint(p, err) {
  if (err.startsWith("月柱")) return `${B.gzName(p[0])}年的${ZHI[p[1] % 12]}月應為 ${B.gzName(B.monthGZ(p[0], p[1] % 12))}`;
  return `${B.gzName(p[2])}日的${ZHI[p[3] % 12]}時應為 ${B.gzName(B.hourGZ(p[2], p[3] % 12))}`;
}
function readForm() {
  const name = $("#f-name").value.trim();
  const sex = $("#f-sex-f").checked ? "f" : "m";
  const lon = parseFloat($("#f-lon").value), lat = parseFloat($("#f-lat").value), tz = parseFloat($("#f-tz").value);
  if (!isFinite(lon) || lon < -180 || lon > 180) return { error: "經度要在 −180 到 180 之間。" };
  if (!isFinite(lat) || lat < -90 || lat > 90) return { error: "緯度要在 −90 到 90 之間。" };
  const pi = $("#f-place").value;
  const place = { name: pi === "custom" ? "自訂座標" : PLACES[+pi][0], lon, lat, tz };
  const base = { name, sex, mode: S.mode, place, dst: $("#f-dst").checked, trueSolar: $("#f-ts").checked, zishi: $("#f-zs").checked ? "split" : "day23" };
  if (S.mode === "solar") base.solar = readSolarRaw();
  else if (S.mode === "lunar") {
    const ly = +$("#f-ly").value; const [lm, lp] = $("#f-lm").value.split("|").map(Number); const ld = +$("#f-ld").value;
    const dn = B.lunarToDayNum(ly, lm, !!lp, ld);
    if (dn == null) return { error: "這個農曆日期不存在。" };
    const o = B.dayNumToYMD(dn);
    base.lunar = { y: ly, m: lm, leap: !!lp, d: ld };
    base.solar = { y: o.y, m: o.m, d: o.d, hh: +$("#f-hh").value, mi: +$("#f-mi").value };
  } else {
    const p = [0, 1, 2, 3].map(k => +$("#f-p" + k).value);
    const r = B.searchPillars(p, { from: 1801, to: 2100, tz });
    if (r.error) return { error: r.error + "。" + fixHint(p, r.error) };
    const pick = $('input[name="f-cand"]:checked');
    const c = r.list[pick ? +pick.value : (S.candPick || 0)];
    base.sizhu = { p };
    base.solar = c ? { y: c.mid.y, m: c.mid.m, d: c.mid.d, hh: c.mid.hh, mi: c.mid.mi } : null;
  }
  return base;
}
function updatePreview() {
  if (!formReady) return;
  const box = $("#f-preview");
  const r = readForm();
  $("#f-shichen").textContent = ZHI[B.hourBranchOf(+$("#f-hh").value)] + "時";
  if (r.error) { box.innerHTML = `<span class="err">${esc(r.error)}</span>`; $("#f-go").disabled = true; return; }
  $("#f-go").disabled = false;
  const ch = chartOf(r);
  const gz = ch.pillars.map(gzH).join(" ");
  const lines = [`<span class="pv-gz">${gz}</span>`];
  if (ch.pillarsOnly) lines.push(`<span>只排四柱，沒有出生日期，無法起大運。</span>`);
  else {
    lines.push(`<span>公曆 ${fmtDash(ch.civil)}（${esc(tzText(ch.tz))}${ch.dst ? "，夏令時" : ""}）｜農曆 ${esc(B.lunarText(ch.lunar))} ${ZHI[ch.pillars[3] % 12]}時</span>`);
    if (ch.trueSolar) lines.push(`<span>真太陽時 ${fmtDash(ch.clock)}（經度修正 ${fmtSigned((ch.lon - ch.tz * 15) * 4)} 分，均時差 ${fmtSigned(ch.eot)} 分）</span>`);
    lines.push(`<span class="dim">地點：${esc(r.place.name)}　${lonText(r.place.lon)} ${latText(r.place.lat)}</span>`);
  }
  box.innerHTML = lines.join("");
}
const fmtSigned = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(1);

function fillFormFromCase(c) {
  ensureForm();
  $("#f-name").value = c.name || "";
  $("#f-sex-m").checked = c.sex !== "f"; $("#f-sex-f").checked = c.sex === "f";
  const pi = PLACES.findIndex(p => p[0] === c.place.name);
  $("#f-place").value = pi >= 0 ? String(pi) : "custom";
  $("#f-lon").value = (+c.place.lon).toFixed(2); $("#f-lat").value = (+c.place.lat).toFixed(2); $("#f-tz").value = String(c.place.tz);
  $("#f-dst").checked = !!c.dst; $("#f-ts").checked = !!c.trueSolar; $("#f-zs").checked = c.zishi === "split";
  if (c.solar) fillSolar(c.solar);
  if (c.mode === "lunar" && c.lunar) {
    $("#f-ly").value = String(c.lunar.y); rebuildLunarMonths(`${c.lunar.m}|${c.lunar.leap ? 1 : 0}`); rebuildLunarDays(c.lunar.d); $("#f-ld").value = String(c.lunar.d);
  }
  if (c.mode === "sizhu" && c.sizhu) { S.pzActive = 0; setPillars(c.sizhu.p, { silent: true }); }
  S.mode = c.mode || "solar";
  setModeNoSync(S.mode);
  if (S.mode === "sizhu") { S.candPick = null; renderCands(); if (c.solar) { const i = candList.findIndex(x => x.mid.y === c.solar.y && x.mid.m === c.solar.m && x.mid.d === c.solar.d); if (i >= 0) { S.candPick = i; renderCands(); } } }
  updatePreview();
}
function setModeNoSync(mode) {
  $$('[data-act="mode"]').forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === mode ? "true" : "false"));
  $("#g-solar").hidden = mode !== "solar"; $("#g-lunar").hidden = mode !== "lunar";
  $("#g-time").hidden = mode === "sizhu"; $("#g-sizhu").hidden = mode !== "sizhu"; $("#g-sizhu-note").hidden = mode !== "sizhu";
}
function updateBanner() {
  const bn = $("#f-banner");
  const f = S.flow;
  if (!f) { bn.hidden = true; bn.innerHTML = ""; $("#f-go").textContent = "開始排盤"; return; }
  bn.hidden = false;
  if (f.type === "hepan") {
    bn.innerHTML = `<span>正在為合盤 <b>${f.side.toUpperCase()}</b> 方新增案例，排盤後會自動存檔並回到合盤。</span><button class="btn btn-sm" type="button" data-act="flow-cancel">取消，回到合盤</button>`;
    $("#f-go").textContent = "排盤並放入合盤";
  } else {
    bn.innerHTML = `<span>正在修改「${esc(f.name)}」${f.saved ? "，排盤後會更新案例列表中的這一筆" : ""}。</span><button class="btn btn-sm" type="button" data-act="flow-cancel">取消修改</button>`;
    $("#f-go").textContent = f.saved ? "排盤並更新案例" : "重新排盤";
  }
}
function renderInputDynamic() { ensureForm(); updateBanner(); updatePreview(); tickNow(true); }
function submitForm() {
  const r = readForm();
  if (r.error) { updatePreview(); return; }
  const f = S.flow;
  if (f && f.type === "edit") {
    const old = Store.get(f.id);
    const c = Object.assign({}, r, { id: f.id, createdAt: old ? old.createdAt : Date.now(), name: r.name || f.name });
    if (old) Store.put(c);
    S.flow = null; updateBanner();
    setCurrent(c, !!old);
    go(f.back || "basic");
    toast(old ? "已更新這個案例。" : "已重新排盤。");
    return;
  }
  const c = Object.assign({ id: newId(), createdAt: Date.now() }, r, { name: r.name || `案例${Store.cases.length + 1}` });
  if (f && f.type === "hepan") {
    Store.put(c);
    S.hepan[f.side] = c.id; S.hepan.started = false; saveHepan();
    S.flow = null; updateBanner();
    go("hepan");
    toast(`已存檔「${c.name}」並放入合盤 ${f.side.toUpperCase()} 方。`);
    return;
  }
  const save = $("#f-save").checked;
  if (save) Store.put(c);
  setCurrent(c, save);
  go("basic");
  if (save) toast(`已存入案例列表：「${c.name}」。`);
}
function setCurrent(c, saved) {
  S.cur = { c, saved: !!saved, get chart() { return chartOf(this.c); } };   // 用到才算，算過就記在 chartCache
  S.proSel = null;
  LS.set("bazi.cur.v1", { c, saved: !!saved });
}
/* 目前的盤標著「已存檔」，案例列表裡卻已經沒有（在別處刪掉，或帳戶紀錄顯示已刪除）：改回可以按「存檔」 */
function checkCurSaved() {
  if (!S.cur || !S.cur.saved || Store.status === "connecting" || Store.get(S.cur.c.id)) return;
  S.cur.saved = false;
  LS.set("bazi.cur.v1", { c: S.cur.c, saved: false });
  $$(".hbar .hdone").forEach(el => { el.outerHTML = `<button class="hbtn" type="button" data-act="save-cur">存檔</button>`; });
}
const isNum = v => typeof v === "number" && isFinite(v);
function validCase(c) {
  if (!c || typeof c !== "object" || !c.place || !isNum(+c.place.tz)) return false;
  if (c.solar) return ["y", "m", "d", "hh", "mi"].every(k => isNum(c.solar[k]));
  return !!(c.sizhu && Array.isArray(c.sizhu.p) && c.sizhu.p.length === 4 && c.sizhu.p.every(isNum));
}

/* 即時起局 */
let nowKey = "";
function nowCase() {
  const n = new Date(), tz = localTz();
  return {
    id: newId(), createdAt: Date.now(), name: "即時局", sex: "m", mode: "solar",
    solar: { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), hh: n.getHours(), mi: n.getMinutes() },
    place: { name: tz === 8 ? "未知地（北京時間）" : "本地時間", lon: tz * 15, lat: 39, tz }, dst: false, trueSolar: false, zishi: "day23"
  };
}
function tickNow(force) {
  const n = new Date();
  const sec = n.getSeconds(), mi = n.getMinutes(), hr = n.getHours() % 12;
  const set = (id, deg) => { const el = document.getElementById(id); if (el) el.setAttribute("transform", `rotate(${deg} 50 50)`); };
  set("nc-h", hr * 30 + mi * 0.5); set("nc-m", mi * 6 + sec * 0.1); set("nc-s", sec * 6);
  const key = `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}-${n.getHours()}-${mi}`;
  if (!force && key === nowKey) return;
  nowKey = key;
  if (S.page !== "input" && !force) return;
  const c = nowCase(); const ch = chartOf(c);
  $("#nc-gz").innerHTML = ch.pillars.map(p => gS(p % 10)).join("") + "<br>" + ch.pillars.map(p => zS(p % 12)).join("");
  $("#nc-lunar").textContent = `農曆：${B.lunarText(ch.lunar)} ${ZHI[ch.pillars[3] % 12]}時`;
  $("#nc-solar").textContent = `公曆：${fmtCN(ch.civil)}`;
}

/* =========================================================
   抬頭帶
   ========================================================= */
function headerHTML(cur, page) {
  const { c, chart } = cur;
  const zao = chart.male ? "乾造" : "坤造";
  const sx = chart.shengxiao;
  let lines;
  if (chart.pillarsOnly) lines = `<div><span class="k">四柱</span>${chart.pillars.map(gzH).join(" ")} <span class="zao">（${zao}）</span></div><div><span class="k">日期</span>未定（四柱直排）</div>`;
  else {
    lines = `<div><span class="k">農曆</span>${esc(B.lunarText(chart.lunar))} ${ZHI[chart.pillars[3] % 12]}時 <span class="zao">（${zao}）</span></div>
      <div><span class="k">陽曆</span>${fmtCN(chart.civil)} <span class="k" style="margin-left:6px">${esc(tzText(chart.tz))}${chart.dst ? "・夏令時" : ""}</span></div>`;
    if (chart.trueSolar) lines += `<div><span class="k">真太陽時</span>${fmtCN(chart.clock)}</div>`;
  }
  const bd = chart.boundary;
  const tag = bd ? `<span class="sx-tag">${bd.t.name === "立春" ? "立春盤" : "交界盤"}</span>` : "";
  const acts = [];
  if (page === "pro") acts.push(`<label class="switch"><input type="checkbox" data-act="tms"${S.prefs.tms ? " checked" : ""}> 胎命身</label>`);
  acts.push(cur.saved ? `<span class="hdone">已存檔</span>` : `<button class="hbtn" type="button" data-act="save-cur">存檔</button>`);
  acts.push(`<button class="hbtn" type="button" data-act="gz-copy-open" aria-haspopup="dialog">複製</button>`);
  acts.push(`<button class="hbtn" type="button" data-act="edit-cur">編輯</button>`);
  return `<header class="hbar">
    <div class="sx"><span class="sx-ring" aria-label="生肖${sx}">${sx}</span>${tag}</div>
    <div class="hbar-main"><h1 class="hbar-name">${esc(c.name)}</h1><div class="hbar-lines">${lines}</div></div>
    <div class="hbar-acts">${acts.join("")}</div>
  </header>`;
}
function emptyChartHTML(title) {
  return `<div class="card empty"><p>${esc(title)}</p><div class="row-actions"><button class="btn btn-gold" type="button" data-act="go" data-page="input">去排盤</button><button class="btn" type="button" data-act="now">即時起局</button><button class="btn" type="button" data-act="go" data-page="cases">從案例打開</button></div></div>`;
}

/* =========================================================
   命盤表（基本排盤與專業細盤共用）
   ========================================================= */
/* 整柱標記：天剋地沖紅點、天合地合綠點、伏吟金點；牽到日柱的點較大。
   合盤打開「對照對方原局」時，x = { chart: 對方的盤, side: "A"|"B" }，對方原局的標記用空心點並加上對方代號。 */
const MK_CH = { tkdc: "沖", thdh: "合", fuyin: "伏" };
const MK_NAME = { tkdc: "天剋地沖", thdh: "天合地合", fuyin: "伏吟" };
function marksOf(idx, pillars, skip) {
  const by = {};
  pillars.forEach((p, pos) => { if (pos === skip) return; const t = B.pillarRel(idx, p); if (t) (by[t] = by[t] || []).push(pos); });
  return ["tkdc", "thdh", "fuyin"].filter(t => by[t]).map(t => ({ t, pos: by[t] }));
}
function marksHTML(ms, side) {
  return ms.map(m => {
    const where = m.pos.map(p => "年月日時"[p]).join("");
    return `<span class="mk mk-${m.t}${m.pos.includes(2) ? " mk-day" : ""}${side ? " mk-x" : ""}" title="${MK_NAME[m.t]}：${side ? side + " 方" : ""}原局${where}柱">${side || ""}${MK_CH[m.t]}${where}</span>`;
  }).join("");
}
function cellMk(idx, chart, x) {
  if (idx == null) return `<span class="c-mk"></span>`;
  return `<span class="c-mk">${marksHTML(marksOf(idx, chart.pillars))}${x ? marksHTML(marksOf(idx, x.chart.pillars), x.side) : ""}</span>`;
}
/* 同一格同時沖到（或合到）兩人：格子右上角折角 */
function hitBoth(idx, chart, x) {
  if (!x || idx == null) return "";
  const a = marksOf(idx, chart.pillars).map(m => m.t), b = marksOf(idx, x.chart.pillars).map(m => m.t);
  if (a.includes("tkdc") && b.includes("tkdc")) return "tkdc";
  if (a.includes("thdh") && b.includes("thdh")) return "thdh";
  return "";
}
const HIT_TEXT = { tkdc: "兩人同時天剋地沖", thdh: "兩人同時天合地合" };
const hitCls = (idx, chart, x) => { const h = hitBoth(idx, chart, x); return h ? ` hit2 hit2-${h}` : ""; };
const hitSr = (idx, chart, x) => { const h = hitBoth(idx, chart, x); return h ? `<span class="sr-only">，${HIT_TEXT[h]}</span>` : ""; };
const PH_SHORT = { 先選流日: "先選日", 先選流月: "先選月" };
function cellsFor(col, chart, row, ctx) {
  const dm = chart.dm;
  if (col.idx == null) {
    if (row === "ss") {                                              // 窄表格改用三個字的短提示，免得擠成兩行
      const ph = col.ph || "", short = PH_SHORT[ph];
      return `<td class="ph${col.sep ? " sep" : ""}">—<span class="phhint">${short ? `<span class="ph-l">${esc(ph)}</span><span class="ph-s">${esc(short)}</span>` : esc(ph)}</span></td>`;
    }
    if (row === "head") return `<td class="${col.sep ? "sep" : ""}">${esc(col.title)}</td>`;
    return `<td class="ph${col.sep ? " sep" : ""}">${row === "gan" || row === "zhi" ? "—" : ""}</td>`;
  }
  const g = col.idx % 10, b = col.idx % 12;
  const cls = col.sep ? ' class="sep"' : "";
  switch (row) {
    case "head": return `<td class="${col.sep ? "sep " : ""}${col.kind === "dyn" ? "on-dyn" : ""}">${esc(col.title)}</td>`;
    case "ss": return `<td${cls}>${col.pos === 2 && col.kind === "natal" ? (chart.male ? "元男" : "元女") : B.tenGod(dm, g)}</td>`;
    case "gan": return `<td${cls}>${gS(g)}${col.wxs ? `<span class="wxs">${WX[B.ganWx(g)]}</span>` : ""}</td>`;
    case "zhi": return `<td${cls}>${zS(b)}${col.wxs ? `<span class="wxs">${WX[B.zhiWx(b)]}</span>` : ""}</td>`;
    case "cang": return `<td${cls}>${B.CANG[b].map(x => `<span class="cg">${gS(x)}${WX[B.ganWx(x)]}</span>`).join("")}</td>`;
    case "fu": return `<td${cls}>${B.CANG[b].map(x => `<span class="cg">${B.tenGod(dm, x)}</span>`).join("")}</td>`;
    case "cangss": return `<td${cls}>${B.CANG[b].map(x => { const t = B.tenGod(dm, x); return `<span class="cg">${gS(x)}<span class="ssf">${t}</span><span class="ssa">${B.SS_ABBR[t]}</span></span>`; }).join("")}</td>`;
    case "xy": return `<td${cls}>${B.changSheng(dm, b)}</td>`;
    case "zz": return `<td${cls}>${B.changSheng(g, b)}</td>`;
    case "kong": return `<td${cls}>${B.xunKong(col.idx).map(x => ZHI[x]).join("")}</td>`;
    case "ny": return `<td${cls}>${B.nayin(col.idx)}</td>`;
    case "mk": {
      const ms = marksOf(col.idx, chart.pillars, col.kind === "natal" ? col.pos : -1);
      const x = ctx && ctx.x, xs = x ? marksOf(col.idx, x.chart.pillars) : [];
      return `<td${cls}>${ms.length || xs.length ? marksHTML(ms) + (x ? marksHTML(xs, x.side) : "") : '<span class="dim">—</span>'}</td>`;
    }
    case "sha": {
      const list = B.shensha(chart, g, b, col.kind === "natal" ? col.pos : -1, S.prefs.shaOpt);
      if (!S.prefs.sha) return `<td${cls}><span class="dim">${list.length ? list.length + " 項" : "—"}</span></td>`;
      return `<td${cls}>${list.length ? list.map(s => `<span class="sha${B.SHENSHA_BAD.has(s) ? " bad" : ""}">${s.length === 4 ? `<span class="nw">${s.slice(0, 2)}</span><span class="nw">${s.slice(2)}</span>` : s}</span>`).join("") : '<span class="dim">—</span>'}</td>`;
    }
  }
  return "<td></td>";
}
const ROW_LABEL = { head: "日期", ss: "主星", gan: "天干", zhi: "地支", cang: "藏干", fu: "副星", cangss: "藏干", xy: "星運", zz: "自坐", kong: "空亡", ny: "納音", sha: "神煞", mk: "沖合" };
const ROW_CLASS = { head: "r-head", ss: "r-ss", gan: "r-big", zhi: "r-big", cang: "r-cang", fu: "r-fu", cangss: "r-cang", xy: "r-sm", zz: "r-sm", kong: "r-sm", ny: "r-sm", sha: "r-sha", mk: "r-mk" };
function panTableHTML(cols, chart, rows, caption, ctx) {
  let h = `<div class="pan-wrap"><table class="pan" data-cols="${cols.length}">${caption ? `<caption class="sr-only">${esc(caption)}</caption>` : ""}<colgroup><col class="c-lab">${cols.map(() => "<col>").join("")}</colgroup>`;
  for (const row of rows) {
    h += `<tr class="${ROW_CLASS[row]}" data-row="${row === "cangss" ? "cang" : row}"><th scope="row">${ROW_LABEL[row]}</th>${cols.map(col => cellsFor(col, chart, row, ctx)).join("")}</tr>`;
  }
  h += "</table></div>";
  if (rows.includes("sha")) h += `<button type="button" class="sha-toggle" data-row="sha" data-act="sha" aria-expanded="${S.prefs.sha}">${S.prefs.sha ? "收起神煞（只顯示每柱項數）" : "展開神煞"}</button>`;
  return h;
}
function natalCols(chart, wxs) {
  return ["年柱", "月柱", "日柱", "時柱"].map((t, pos) => ({ title: t, idx: chart.pillars[pos], kind: "natal", pos, wxs, sep: false }));
}
function wbarHTML(chart) {
  return `<div class="wbar"><span class="wl">旺相休囚死<br>月令${ZHI[chart.monthBranch]}</span>${chart.wangxiang.map(([w, s]) => `<span><b class="w${w}">${WX[w]}</b>${s}</span>`).join("")}</div>`;
}
function attnHTML(raw) {
  const a = B.attention(raw);
  return `<div class="card attn">
    <div class="attn-row"><span class="k">天干留意</span><span class="v">${a.gan.length ? a.gan.join("，") : "無合沖關係"}</span></div>
    <div class="attn-row"><span class="k">地支留意</span><span class="v">${a.zhi.length ? a.zhi.join("，") : "無刑沖合害"}</span></div>
    <div class="attn-row"><span class="k">整柱留意</span><span class="v">${a.zhu.length ? a.zhu.join("，") : "無天剋地沖、天合地合、伏吟"}</span></div>
  </div>`;
}
function natalItems(chart, side) {
  return ["年柱", "月柱", "日柱", "時柱"].map((label, pos) => ({ label, short: label[0], kind: "natal", pos, idx: chart.pillars[pos], side: side || "A" }));
}

/* =========================================================
   複製
   命盤表是一列天干、一列地支，瀏覽器照列複製會變成「丙庚壬甲 午寅辰辰」，還夾著五行小字與排版空白。
   在表格裡拖選時改成按柱輸出，範圍取拖選起點與終點兩格圍出的長方形：
   只圍到日期、主星、天干、地支這幾列時，得到「丙午 庚寅 壬辰 甲辰」一行；
   圍到其他列時每列一行、格子用 Tab 隔開（可貼進試算表），天干地支合成「干支」一列。
   還沒選的流日、流時欄（只有「—」）略過；設定裡隱藏的列不算。
   起點與終點在同一格裡（只選一格裡的字）時照瀏覽器原本的方式複製。
   ========================================================= */
const PILLAR_ROWS = new Set(["head", "ss", "gan", "zhi"]);
function cellText(td) {
  if (!td) return "";
  const c = td.cloneNode(true);
  c.querySelectorAll(".sr-only, .ssa, .phhint, .wxs").forEach(n => n.remove());
  const items = c.querySelectorAll(".cg, .sha, .mk");
  if (items.length) return Array.from(items).map(n => n.textContent.replace(/\s+/g, "")).join("、");
  return c.textContent.replace(/\s+/g, "");
}
function boundaryCell(node, off, isEnd) {
  let el = node;
  if (el && el.nodeType === 1 && el.childNodes.length) el = (isEnd ? el.childNodes[off - 1] : el.childNodes[off]) || el;
  if (el && el.nodeType !== 1) el = el.parentElement;
  return el && el.closest ? el.closest("table.pan td, table.pan th") : null;
}
function tableCopyText(sel) {
  if (!sel || !sel.rangeCount || sel.isCollapsed) return null;
  const cells = [];
  for (let i = 0; i < sel.rangeCount; i++) {
    const r = sel.getRangeAt(i);
    cells.push(boundaryCell(r.startContainer, r.startOffset, false), boundaryCell(r.endContainer, r.endOffset, true));
  }
  if (cells.some(c => !c)) return null;
  const table = cells[0].closest("table.pan");
  if (cells.some(c => c.closest("table.pan") !== table)) return null;
  if (cells.every(c => c === cells[0])) return null;
  const rIdx = cells.map(c => c.parentElement.rowIndex), cIdx = cells.map(c => c.cellIndex);
  const r0 = Math.min(...rIdx), r1 = Math.max(...rIdx);
  const c0 = Math.max(1, Math.min(...cIdx)), c1 = Math.max(...cIdx);
  if (c1 < c0) return null;                                          // 只選到左邊的列名
  const rows = Array.from(table.rows).slice(r0, r1 + 1).filter(tr => tr.getClientRects().length);   // 設定裡隱藏的列不算
  const keys = rows.map(tr => tr.dataset.row);
  const ganRow = table.querySelector('tr[data-row="gan"]');
  const cols = []; for (let i = c0; i <= c1; i++) if (!(ganRow && ganRow.cells[i] && ganRow.cells[i].classList.contains("ph"))) cols.push(i);   // 還沒選的流日、流時欄不算
  if (!cols.length) return null;
  const gan = rows.find(tr => tr.dataset.row === "gan"), zhi = rows.find(tr => tr.dataset.row === "zhi");
  const gz = i => (gan ? cellText(gan.cells[i]) : "") + (zhi ? cellText(zhi.cells[i]) : "");
  if ((gan || zhi) && keys.every(k => PILLAR_ROWS.has(k))) return cols.map(gz).join(" ");
  const head = table.querySelector('tr[data-row="head"]');
  const line = (label, vals) => [label].concat(vals).join("\t");
  const out = head ? [line(cellText(head.cells[0]), cols.map(i => cellText(head.cells[i])))] : [];
  for (const tr of rows) {
    const k = tr.dataset.row;
    if (k === "head" || (k === "zhi" && gan)) continue;
    if (k === "gan" && zhi) { out.push(line("干支", cols.map(gz))); continue; }
    out.push(line(cellText(tr.cells[0]), cols.map(i => cellText(tr.cells[i]))));
  }
  return out.join("\n");
}
/* 抬頭的「複製」：三種格式，都不含姓名 */
function copyFormats(chart) {
  const gz = chart.pillars.map(B.gzName).join(" ");
  const zao = `${chart.male ? "乾造" : "坤造"} ${gz}`;
  const lines = [zao];
  if (chart.pillarsOnly) lines.push("日期未定（四柱直排）");
  else {
    lines.push(`公曆 ${fmtDash(chart.civil)}（${tzText(chart.tz)}${chart.dst ? "・夏令時" : ""}）`);
    if (chart.trueSolar) lines.push(`真太陽時 ${fmtDash(chart.clock)}`);
    lines.push(`農曆 ${B.lunarText(chart.lunar)} ${ZHI[chart.pillars[3] % 12]}時`);
    const y = chart.yun;
    lines.push(`起運 出生後 ${y.Y}年${y.M}月${y.D}天${y.H}時，大運${y.forward ? "順" : "逆"}排`);
    lines.push(`大運 ${y.dayun.map(d => `${d.startAge}歲 ${B.gzName(d.idx)}`).join("、")}`);
  }
  return [["gz", "四柱", gz], ["zao", "乾坤造與四柱", zao], ["full", chart.pillarsOnly ? "完整資料" : "完整資料（公曆、農曆、起運、大運）", lines.join("\n")]];
}
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* 改用舊方法 */ }
  const back = document.activeElement;
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.setAttribute("aria-hidden", "true");
  ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none";
  document.body.appendChild(ta); ta.select();
  let done = false; try { done = document.execCommand("copy"); } catch (e) { done = false; }
  ta.remove(); if (back && back.focus) back.focus();
  return done;
}
function selectNode(el) { try { const s = getSelection(), r = document.createRange(); r.selectNodeContents(el); s.removeAllRanges(); s.addRange(r); } catch (e) { /* 無妨 */ } }

/* =========================================================
   基本排盤
   ========================================================= */
function renderBasic() {
  const root = $("#page-basic");
  if (!S.cur) { root.innerHTML = emptyChartHTML("還沒有排盤。先到排盤頁輸入出生資料，或按即時起局。"); return; }
  const { chart } = S.cur;
  const cols = natalCols(chart, true);
  const info = basicInfoHTML(chart);
  const raw = B.findRelations(natalItems(chart));
  root.innerHTML = headerHTML(S.cur, "basic") + info +
    `<div class="card" style="padding:6px 12px 12px">${panTableHTML(cols, chart, ["head", "ss", "gan", "zhi", "mk", "cang", "fu", "xy", "zz", "kong", "ny", "sha"], "基本排盤")}</div>` +
    wbarHTML(chart) + attnHTML(raw) + extraInfoHTML(chart);
}
function basicInfoHTML(chart) {
  if (chart.pillarsOnly) return `<div class="card infobar"><span>這是四柱直排的盤，沒有出生日期，所以沒有節氣、大運與流年。</span></div>`;
  const pj = chart.prevJie, nj = chart.nextJie;
  const after = chart.jdUT - pj.jd, before = nj.jd - chart.jdUT;
  const bd = chart.boundary;
  const parts = [`<span>出生於<b>${pj.name}</b>後 ${durText(after)}，<b>${nj.name}</b>前 ${durText(before)}</span>`];
  if (bd) parts.push(`<span class="bd-warn">節氣交界盤：距${bd.t.name} ${durText(bd.dist)}（${bd.after ? "交節後" : "交節前"}），月柱${bd.t.name === "立春" ? "與年柱" : ""}要留意</span>`);
  else parts.push(`<span class="dim">非節氣交界盤（距最近的節超過一天）</span>`);
  return `<div class="card infobar">${parts.join("")}</div>`;
}
function extraInfoHTML(chart) {
  const e = chart.extra;
  const tz = chart.tz == null ? 8 : chart.tz;
  const fmtT = t => { const k = B.jdToClock(t.jd + tz / 24); return `${fmtDash(k)}:${pad2(k.ss)}`; };
  const items = [["生肖", chart.shengxiao], ["胎元", `${gzH(e.taiyuan)}（${B.nayin(e.taiyuan)}）`], ["胎息", `${gzH(e.taixi)}（${B.nayin(e.taixi)}）`],
    ["命宮", `${gzH(e.minggong)}（${B.nayin(e.minggong)}）`], ["身宮", `${gzH(e.shengong)}（${B.nayin(e.shengong)}）`]];
  if (!chart.pillarsOnly) {
    items.push(["人元司令", `${gS(chart.siling)}${WX[B.ganWx(chart.siling)]}用事（入${chart.prevJie.name}第 ${Math.floor(chart.daysSinceJie) + 1} 天）`]);
    items.push([chart.prevJie.name, fmtT(chart.prevJie)], [chart.nextJie.name, fmtT(chart.nextJie)]);
    const y = chart.yun;
    items.push(["起運", `出生後 ${y.Y}年${y.M}月${y.D}天${y.H}時`], ["交運", `${fmtDash(y.jiao)}，大運${y.forward ? "順" : "逆"}排`]);
    items.push(["地點", `${esc(chart.input.lon != null ? lonText(chart.lon) : "")} ${chart.lat != null ? latText(chart.lat) : ""}`]);
  }
  return `<div class="card basic-extra"><div class="card-pad" style="padding-bottom:8px"><h2 class="card-title">基本信息</h2></div><div class="infogrid">${items.map(([k, v]) => `<div><span class="k">${esc(k)}</span><span class="v">${v}</span></div>`).join("")}</div></div>`;
}

/* =========================================================
   專業細盤
   ========================================================= */
function proCols(chart, sel) {
  const cols = [];
  const months = B.liuYue(sel.year, localTz());
  const hasM = sel.mk != null, hasD = sel.dn != null, hasH = sel.hb != null;
  cols.push(hasH && hasD ? { title: "流時", idx: B.hourGZ(B.dayGZ(sel.dn), sel.hb), kind: "dyn", layer: "liushi", label: "流時" } : { title: "流時", idx: null, layer: "liushi", ph: hasD ? "點流時" : "先選流日" });
  cols.push(hasD ? { title: "流日", idx: B.dayGZ(sel.dn), kind: "dyn", layer: "liuri", label: "流日" } : { title: "流日", idx: null, layer: "liuri", ph: hasM ? "點流日" : "先選流月" });
  cols.push(hasM ? { title: "流月", idx: months[sel.mk].idx, kind: "dyn", layer: "liuyue", label: "流月" } : { title: "流月", idx: null, layer: "liuyue", ph: "點流月" });
  cols.push({ title: "流年", idx: B.yearGZ(sel.year), kind: "dyn", layer: "liunian", label: "流年" });
  if (sel.dk >= 0) cols.push({ title: "大運", idx: chart.yun.dayun[sel.dk].idx, kind: "dyn", layer: "dayun", label: "大運" });
  else if (sel.year >= chart.birthYear) cols.push({ title: "小運", idx: B.xiaoYun(chart, sel.year), kind: "dyn", layer: "xiaoyun", label: "小運" });
  else cols.push({ title: "大運", idx: null, layer: "dayun", ph: "未出生" });
  natalCols(chart, false).forEach((c, i) => { c.sep = i === 0; c.label = c.title; cols.push(c); });
  return cols;
}
function dynItems(cols, side) {
  return cols.filter(c => c.kind === "dyn" && c.idx != null).map(c => ({ label: c.label, short: c.label, kind: "dyn", layer: c.layer, idx: c.idx, side: side || "A" }));
}
function cellToday(level, v, now, chart) {
  if (level === "dayun") return B.dayunIndexForYear(chart, now.Y) === v;
  if (level === "year") return now.Y === v;
  if (level === "month") return v.Y === now.Y && v.k === now.monthK;
  if (level === "day") return v === now.dayNum;
  if (level === "hour") return v.dn === now.dayNum && v.b === now.hourBranch;
  return false;
}
function stripHTML(pid, key, cls, title, sub, cells) {
  return `<div class="strip ${cls}" data-strip="${pid}:${cls}" data-key="${esc(key)}">
    <div class="strip-title" aria-hidden="true">${title}${sub ? `<small>${sub}</small>` : ""}</div>
    <div class="strip-main">
      <div class="strip-track" role="group" aria-label="${esc(title.replace(/<br>/g, ""))}">${cells}</div>
      <div class="sbar"><button type="button" class="sbar-btn" aria-label="向左捲動">◀</button><div class="sbar-rail"><div class="sbar-thumb"></div></div><button type="button" class="sbar-btn" aria-label="向右捲動">▶</button></div>
    </div>
  </div>`;
}
const TODAY_SR = `<span class="sr-only">（今天）</span>`;
function stripsHTML(pid, chart, sel, x) {
  const now = nowMoment(), dm = chart.dm, y = chart.yun;
  const pr = v => `aria-pressed="${v ? "true" : "false"}"`;
  const td = (level, v) => cellToday(level, v, now, chart);
  const extra = (level, v, idx) => `${td(level, v) ? " today" : ""}${hitCls(idx, chart, x)}`;
  const tail = (level, v, idx) => `${cellMk(idx, chart, x)}${td(level, v) ? TODAY_SR : ""}${hitSr(idx, chart, x)}`;
  // 大運
  let cells = `<button type="button" class="cell${td("dayun", -1) ? " today" : ""}" data-act="sel" data-pid="${pid}" data-level="dayun" data-v="-1" ${pr(sel.dk === -1)}>
      <span class="c-top num">${y.xiaoYunFrom}</span><span class="c-sub">1~${Math.max(1, y.dayun[0].startAge - 1)}歲</span><span class="c-big">小</span><span class="c-big">運</span>${tail("dayun", -1, null)}</button>`;
  y.dayun.forEach((d, k) => {
    cells += `<button type="button" class="cell${extra("dayun", k, d.idx)}" data-act="sel" data-pid="${pid}" data-level="dayun" data-v="${k}" ${pr(sel.dk === k)}>
      <span class="c-top num">${d.startYear}</span><span class="c-sub">${d.startAge}歲</span>
      <span class="c-gz">${gS(d.idx % 10)}<i>${ssAbbr(dm, d.idx % 10)}</i></span><span class="c-gz">${zS(d.idx % 12)}<i>${zAbbr(dm, d.idx % 12)}</i></span>${tail("dayun", k, d.idx)}</button>`;
  });
  let h = stripHTML(pid, "dy", "s-dayun", "大<br>運", "", cells);
  // 流年
  const [y0, y1] = yearRange(chart, sel.dk, sel.year);
  cells = "";
  for (let Y = y0; Y <= y1; Y++) {
    const i = B.yearGZ(Y), xy = Y >= chart.birthYear ? B.xiaoYun(chart, Y) : null;
    cells += `<button type="button" class="cell${extra("year", Y, i)}${Y < chart.birthYear ? " unborn" : ""}" data-act="sel" data-pid="${pid}" data-level="year" data-v="${Y}" ${pr(sel.year === Y)}>
      <span class="c-top num">${Y}</span>
      <span class="c-gz">${gS(i % 10)}<i>${ssAbbr(dm, i % 10)}</i></span><span class="c-gz">${zS(i % 12)}<i>${zAbbr(dm, i % 12)}</i></span>
      <span class="c-xy">${xy != null ? B.gzName(xy) : "未出生"}</span>${tail("year", Y, i)}</button>`;
  }
  h += stripHTML(pid, `ln${y0}`, "s-year", "流<br>年", "小運", cells);
  // 流月
  const months = B.liuYue(sel.year, localTz());
  cells = months.map(m => { const v = { Y: sel.year, k: m.k }; return `<button type="button" class="cell${extra("month", v, m.idx)}" data-act="sel" data-pid="${pid}" data-level="month" data-v="${m.k}" ${pr(sel.mk === m.k)}>
      <span class="c-top">${m.name}</span><span class="c-sub num">${m.clock.m}/${m.clock.d}</span>
      <span class="c-gz">${gS(m.idx % 10)}<i>${ssAbbr(dm, m.idx % 10)}</i></span><span class="c-gz">${zS(m.idx % 12)}<i>${zAbbr(dm, m.idx % 12)}</i></span>${tail("month", v, m.idx)}</button>`; }).join("");
  h += stripHTML(pid, `ly${sel.year}`, "s-month", "流<br>月", "", cells);
  // 流日
  if (sel.mk != null) {
    const days = B.liuRi(months[sel.mk]);
    cells = days.map(d => {
      const l = B.lunarOfDay(d.dayNum);
      return `<button type="button" class="cell${extra("day", d.dayNum, d.idx)}" data-act="sel" data-pid="${pid}" data-level="day" data-v="${d.dayNum}" ${pr(sel.dn === d.dayNum)}>
      <span class="c-top num">${d.m}/${d.d}</span><span class="c-sub">${l ? (l.day === 1 ? (l.leap ? "閏" : "") + B.LUNAR_MONTH[l.month] : B.LUNAR_DAY[l.day]) : ""}</span>
      <span class="c-gz">${gS(d.idx % 10)}<i>${ssAbbr(dm, d.idx % 10)}</i></span><span class="c-gz">${zS(d.idx % 12)}<i>${zAbbr(dm, d.idx % 12)}</i></span>${tail("day", d.dayNum, d.idx)}</button>`;
    }).join("");
    h += stripHTML(pid, `lr${sel.year}-${sel.mk}`, "s-day", "流<br>日", "", cells);
  }
  // 流時
  if (sel.dn != null) {
    cells = B.liuShi(sel.dn).map(t => { const v = { dn: sel.dn, b: t.branch }; return `<button type="button" class="cell${extra("hour", v, t.idx)}" data-act="sel" data-pid="${pid}" data-level="hour" data-v="${t.branch}" ${pr(sel.hb === t.branch)}>
      <span class="c-top">${ZHI[t.branch]}時</span><span class="c-sub num">${t.range}</span>
      <span class="c-gz">${gS(t.idx % 10)}<i>${ssAbbr(dm, t.idx % 10)}</i></span><span class="c-gz">${zS(t.idx % 12)}<i>${zAbbr(dm, t.idx % 12)}</i></span>${tail("hour", v, t.idx)}</button>`; }).join("");
    h += stripHTML(pid, `ls${sel.dn}`, "s-hour", "流<br>時", "", cells);
  }
  return h;
}
function ageOf(chart) {
  const n = new Date();
  const l = B.lunarOfDay(B.ymdToDayNum(n.getFullYear(), n.getMonth() + 1, n.getDate()));
  const xu = l && chart.lunar ? l.year - chart.lunar.year + 1 : null;
  let zhou = n.getFullYear() - chart.civil.y;
  if (n.getMonth() + 1 < chart.civil.m || (n.getMonth() + 1 === chart.civil.m && n.getDate() < chart.civil.d)) zhou--;
  return { xu, zhou };
}
function proInfoHTML(pid, chart) {
  const y = chart.yun;
  const age = ageOf(chart);
  const kong = B.xunKong(chart.pillars[2]).map(b => ZHI[b]).join("");
  const jiaoExtra = y.jiaoJieName === "立春" ? "" : `（立春後${y.jiaoDaysAfterLichun}天）`;
  return `<div class="pinfo">
    <div class="pinfo-lines">
      <div><span class="k">起運：</span>出生後 ${y.Y}年${y.M}月${y.D}天${y.H}時 起運</div>
      <div><span class="k">交運：</span>逢${GAN[y.jiaoStems[0]]}、${GAN[y.jiaoStems[1]]}年 ${y.jiaoJieName}後${y.jiaoDaysAfterJie}天 交大運${jiaoExtra}</div>
      <div><span class="k">日柱旬空：</span>${kong}（日）　<span class="k">首次交運：</span>${fmtDate(y.jiao)}</div>
    </div>
    <div class="pinfo-side">
      <div class="row"><span>${age.zhou < 0 ? "未出生" : `虛歲 ${age.xu} · 周歲 ${age.zhou}`}</span></div>
      <div class="row"><span class="siling">司令：<b class="w${B.ganWx(chart.siling)}">${GAN[chart.siling]}</b></span><button type="button" class="todaybtn" data-act="today" data-pid="${pid}" aria-label="回到今天">回到今天</button></div>
    </div>
    <p class="algo">起運算法：出生到${y.forward ? "下一個" : "上一個"}節（${y.target.name}）的時間，三天折一年、一天折四個月、一個時辰折十天（一年按 360 天、一月按 30 天）。交運日期是出生時刻依序加上這些年月日時。歲數按公曆年份計虛歲；小運從時柱起，與大運同向。司令以出生所在節令、按入節後天數分配。</p>
  </div>`;
}
function tmsHTML(chart, ctx) {
  const e = chart.extra;
  const cols = [["胎元", e.taiyuan], ["命宮", e.minggong], ["身宮", e.shengong]].map(([t, idx]) => ({ title: t, idx, kind: "extra" }));
  return `<div class="tms" style="margin-top:12px;border-top:1px dashed var(--line);padding-top:6px">${panTableHTML(cols, chart, ["head", "ss", "gan", "zhi", "mk", "cangss", "xy", "zz", "kong", "ny"], "胎命身", ctx)}</div>`;
}
/* 細盤表的動態欄：全部、大運與流年、只留流年、只看原局（手機、電腦分開記；關係清單仍用全部層級） */
const DYN_MODES = { all: null, dy: ["liunian", "dayun", "xiaoyun"], year: ["liunian"], none: [] };
const DYN_LABEL = [["all", "全部五欄（流時到大運）"], ["dy", "大運與流年"], ["year", "只留流年"], ["none", "只看原局"]];
function dynMode(dev) { const v = (S.prefs.dyn || {})[dev || devNow()]; return Object.prototype.hasOwnProperty.call(DYN_MODES, v) ? v : "all"; }
function tableCols(cols) {
  const keep = DYN_MODES[dynMode()];
  if (!keep) return cols;
  const out = cols.filter(c => c.kind === "natal" || keep.includes(c.layer));
  const hasDyn = out.some(c => c.kind !== "natal");
  return out.map(c => (c.kind === "natal" && c.pos === 0) ? Object.assign({}, c, { sep: hasDyn }) : c);
}
function proPanelHTML(pid, chart, sel, x) {
  const cols = proCols(chart, sel), ctx = { x };
  const tcols = tableCols(cols), hidden = cols.length - tcols.length;
  const note = hidden ? `<p class="dyn-note">表裡只留${dynMode() === "none" ? "原局" : tcols.filter(c => c.kind !== "natal").map(c => c.title).join("、") + "與原局"}，其餘 ${hidden} 欄請看干支條（到「設定」可改）。</p>` : "";
  const left = `<div class="card pro-left">${panTableHTML(tcols, chart, ["head", "ss", "gan", "zhi", "mk", "cangss", "xy", "zz", "kong", "ny", "sha"], "專業細盤", ctx)}${note}${S.prefs.tms ? tmsHTML(chart, ctx) : ""}</div>`;
  const xHint = x ? `空心點<span class="mk mk-tkdc mk-x">${x.side}沖</span>是對照 ${x.side} 方的原局；同時沖到兩人的格子右上角有紅色折角，同時合到兩人的是綠色折角。` : "";
  const right = `<div class="card pro-right">${proInfoHTML(pid, chart)}${stripsHTML(pid, chart, sel, x)}<p class="swipe-hint">干支條可左右滑動，或拖動下方捲軸、按 ◀ ▶。點一格即選中，左側對應的列與下方清單會跟著換；點流月後出現流日，點流日後出現流時。格子頂端有<span class="today-dot" aria-hidden="true"></span>小菱形的是今天所在的一格（用主題色，主色偏紅時改金色）。格子底部的標記對照原局：<span class="mk mk-tkdc">沖</span>天剋地沖、<span class="mk mk-thdh">合</span>天合地合、<span class="mk mk-fuyin">伏</span>伏吟，後面的字是原局哪一柱，牽到日柱的點較大。${xHint}</p>${wbarHTML(chart)}</div>`;
  return { html: `<div class="pro" data-pid="${pid}"><div class="pro-body">${left}${right}</div></div>`, cols };
}
function renderPro() {
  const root = $("#page-pro");
  if (!S.cur) { root.innerHTML = emptyChartHTML("還沒有排盤。先到排盤頁輸入出生資料，或按即時起局。"); return; }
  const { chart } = S.cur;
  if (chart.pillarsOnly) {
    root.innerHTML = headerHTML(S.cur, "pro") + `<div class="card empty"><p>這是四柱直排的盤，沒有出生日期，排不出大運、流年、流月、流日與流時。到排盤頁的四柱模式選一個符合的時間，就能看專業細盤。</p><div class="row-actions"><button class="btn btn-gold" type="button" data-act="edit-cur">選擇時間</button></div></div>`;
    return;
  }
  if (!S.proSel) S.proSel = selNow(chart);
  const { html, cols } = proPanelHTML("pro", chart, S.proSel);
  const items = natalItems(chart).concat(dynItems(cols));
  const raw = B.findRelations(items);
  root.innerHTML = headerHTML(S.cur, "pro") + html + attnHTML(raw) + relSectionHTML("pro", { mode: "single", items, raw, charts: { A: chart } });
  setupStrips(root);
}

/* ---------- 干支條捲軸 ----------
   先一次量完所有條的位置，再一起設定捲動與捲軸（避免每條各自觸發一次整頁排版）。 */
const stripPos = new Map();
const thumbRO = window.ResizeObserver ? new ResizeObserver(entries => {
  const list = entries.map(en => en.target.__strip).filter(Boolean);
  const ms = list.map(measureStrip);
  list.forEach((pl, i) => paintStrip(pl, ms[i]));
}) : null;
function measureStrip(pl) {
  const t = pl.track;
  return { max: t.scrollWidth - t.clientWidth, cw: t.clientWidth, sw: t.scrollWidth, left: t.scrollLeft, rw: pl.rail.clientWidth };
}
function paintStrip(pl, m) {
  const max = Math.max(0, m.max);
  pl.st.classList.toggle("fits", max <= 1);
  const tw = Math.max(28, m.rw * m.cw / Math.max(1, m.sw));
  const x = max > 0 ? (m.left / max) * (m.rw - tw) : 0;
  pl.thumb.style.width = tw + "px"; pl.thumb.style.transform = `translateX(${x}px)`;
  pl.bl.disabled = m.left <= 1; pl.br.disabled = m.left >= max - 1;
  stripPos.set(pl.id, { key: pl.key, left: m.left });
}
function setupStrips(root) {
  // 1. 讀：位置一次量完
  const plans = $$(".strip", root).map(st => {
    const track = $(".strip-track", st), id = st.dataset.strip, key = st.dataset.key;
    const [bl, br] = $$(".sbar-btn", st);
    const pl = { st, track, id, key, rail: $(".sbar-rail", st), thumb: $(".sbar-thumb", st), bl, br, left: 0 };
    const prev = stripPos.get(id);
    if (prev && prev.key === key) pl.left = prev.left;
    else {
      const el = $('.cell[aria-pressed="true"]', track) || $(".cell.today", track);
      if (el) pl.left = Math.max(0, el.offsetLeft - (track.clientWidth - el.offsetWidth) / 2);
    }
    return pl;
  });
  // 2. 寫：捲動位置與事件
  for (const pl of plans) {
    const { track, rail, thumb, bl, br } = pl;
    track.scrollLeft = pl.left;
    track.__strip = pl;
    track.addEventListener("scroll", () => paintStrip(pl, measureStrip(pl)), { passive: true });
    const step = () => Math.max(120, track.clientWidth * 0.8);
    bl.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: "smooth" }));
    br.addEventListener("click", () => track.scrollBy({ left: step(), behavior: "smooth" }));
    let drag = null;
    thumb.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); try { thumb.setPointerCapture(e.pointerId); } catch (x) { /* 舊瀏覽器 */ } drag = { x: e.clientX, left: track.scrollLeft }; });
    thumb.addEventListener("pointermove", e => {
      if (!drag) return;
      const max = track.scrollWidth - track.clientWidth, room = rail.clientWidth - thumb.offsetWidth;
      track.scrollLeft = drag.left + (e.clientX - drag.x) * (max / Math.max(1, room));
    });
    const end = () => { drag = null; };
    thumb.addEventListener("pointerup", end); thumb.addEventListener("pointercancel", end); thumb.addEventListener("lostpointercapture", end);
    rail.addEventListener("pointerdown", e => {
      if (e.target === thumb) return;
      const r = rail.getBoundingClientRect(), max = track.scrollWidth - track.clientWidth;
      const ratio = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      track.scrollTo({ left: ratio * max, behavior: "smooth" });
    });
  }
  // 3. 捲軸：先全部量，再全部畫
  const ms = plans.map(measureStrip);
  plans.forEach((pl, i) => paintStrip(pl, ms[i]));
  if (thumbRO) plans.forEach(pl => thumbRO.observe(pl.track));
}

/* ---------- 選擇 ---------- */
function panelState(pid) {
  if (pid === "pro") return { chart: S.cur && S.cur.chart, sel: S.proSel };
  const id = pid === "A" ? S.hepan.a : S.hepan.b;
  const c = Store.get(id);
  return { chart: c ? chartOf(c) : null, sel: S.hpSel[pid] };
}
function applySel(pid, level, v) {
  const st = panelState(pid); if (!st.chart || !st.sel) return;
  const sel = st.sel, chart = st.chart, now = nowMoment();
  if (level === "dayun") {
    sel.dk = v; const [a, b] = yearRange(chart, v);
    sel.year = now.Y >= a && now.Y <= b ? now.Y : a; sel.mk = sel.dn = sel.hb = null;
  } else if (level === "year") { sel.year = v; sel.mk = sel.dn = sel.hb = null; }
  else if (level === "month") { sel.mk = v; sel.dn = sel.hb = null; }
  else if (level === "day") { sel.dn = v; sel.hb = null; }
  else if (level === "hour") { sel.hb = v; }
  if (pid !== "pro") syncOther(pid);
  rerenderPanels(pid);
}
function syncOther(pid) {
  const other = pid === "A" ? "B" : "A";
  const src = S.hpSel[pid], st = panelState(other);
  if (!src || !st.chart) return;
  S.hpSel[other] = { dk: B.dayunIndexForYear(st.chart, src.year), year: src.year, mk: src.mk, dn: src.dn, hb: src.hb };
}
function rerenderPanels(pid) {
  const y = window.scrollY;
  if (pid === "pro") renderPro(); else renderHepan();
  window.scrollTo(0, y);
}

/* =========================================================
   關係清單
   ========================================================= */
const LAYER_NAME = { dayun: "大運", xiaoyun: "小運", liunian: "流年", liuyue: "流月", liuri: "流日", liushi: "流時" };
function memberText(m, cat, mode) {
  const ch = cat === "gan" ? GAN[m.idx % 10] : cat === "zhi" ? ZHI[m.idx % 12] : B.gzName(m.idx);
  if (mode === "pair") {
    const side = m.side === "T" ? "" : m.side + " ";
    const pos = m.kind === "natal" ? ["年", "月", "日", "時"][m.pos] + (cat === "gan" ? "干" : cat === "zhi" ? "支" : "柱") : LAYER_NAME[m.layer];
    return `${side}${pos} ${ch}`;
  }
  return `${ch}（${m.label}）`;
}
function relItemHTML(r, top, mode) {
  const W = S.W;
  const chips = [`<span class="chip">${B.TYPE_LABEL[r.type]}</span>`];
  if (r.hua != null) {
    if (r.type === "ganhe" || r.type === "liuhe") chips.push(`<span class="chip gold">合，理論化${WX[r.hua]}</span>`);
    else if (r.type === "sanhui") chips.push(`<span class="chip gold">理論成${WX[r.hua]}方</span>`);
    else chips.push(`<span class="chip gold">理論成${WX[r.hua]}局</span>`);
  }
  r.notes.forEach(n => chips.push(`<span class="chip${n === "旬空" ? " warn" : ""}">${n}</span>`));
  const src = r.members.map(m => memberText(m, r.cat, mode)).join(" × ");
  const sub = r.sub && r.sub.length ? `<div class="rsub">含 ${r.sub.map(x => esc(B.relText(x))).join("、")}，併入這一條，不另計分</div>` : "";
  return `<li class="ritem${top ? " top" : ""}${r.cat === "zhu" ? " zhu" : ""}"><span class="sc">${r.score.toFixed(1)}</span><div>
    <div class="rt"><span class="tl">${esc(r.text)}</span>${chips.join("")}</div>
    <div class="src">${esc(src)}</div>${sub}
    <div class="calc">${B.TYPE_LABEL[r.type]} ${fmtN(r.typeScore)} × 位置 ${fmtN(r.pos)} × 力量 ${fmtN(r.power)}</div></div></li>`;
}
const fmtN = v => (Math.round(v * 100) / 100).toString();
function relColHTML(sid, key, title, sub, list, mode) {
  const W = S.W, topN = Math.round(W.view.top), th = W.view.fold;
  if (!list.length) return `<div class="rel-col"><h3>${title}<small>${sub}</small></h3><p class="rel-none">沒有任何刑沖合害。</p></div>`;
  const tops = list.slice(0, topN), rest = list.slice(topN);
  const strong = rest.filter(r => r.score >= th), weak = rest.filter(r => r.score < th);
  const fk = `${sid}:${key}`, open = !!S.fold[fk];
  let h = `<div class="rel-col"><h3>${title}<small>${sub}・共 ${list.length} 條</small></h3>`;
  h += `<span class="toplabel">分數最高的 ${tops.length} 條</span><ol class="rlist">${tops.map(r => relItemHTML(r, true, mode)).join("")}</ol>`;
  if (strong.length) h += `<ol class="rlist">${strong.map(r => relItemHTML(r, false, mode)).join("")}</ol>`;
  if (weak.length) {
    h += `<button type="button" class="btn btn-sm foldbtn" data-act="fold" data-key="${fk}" aria-expanded="${open}">${open ? "收起" : "展開"}較弱的 ${weak.length} 條（分數低於 ${fmtN(th)}）</button>`;
    h += `<ol class="rlist"${open ? "" : " hidden"}>${weak.map(r => relItemHTML(r, false, mode)).join("")}</ol>`;
  }
  return h + "</div>";
}
function relBodyHTML(sid, ctx) {
  const scored = B.scoreRelations(B.foldZhu(ctx.raw), ctx.items, { mode: ctx.mode, charts: ctx.charts }, S.W);
  const base = scored.filter(r => !r.now), now = scored.filter(r => r.now);
  const pair = ctx.mode === "pair";
  return `<div class="rel-cols">${relColHTML(sid, "base", "底色", pair ? "兩人原局之間" : "原局內部", base, ctx.mode)}${relColHTML(sid, "now", "此刻", pair ? "大運與所選流年月日時，跨兩人" : "大運、流年、流月、流日、流時與原局", now, ctx.mode)}</div>`;
}
const relCtx = {};
function relSectionHTML(sid, ctx) {
  relCtx[sid] = ctx;
  return `<section class="card rel" aria-labelledby="rel-t-${sid}">
    <div class="rel-head"><h2 class="card-title" id="rel-t-${sid}">關係清單<small>分數＝類型分 × 位置係數 × 力量係數，每條都列出；天剋地沖、天合地合、伏吟把同一對柱的干支關係收在底下，只計一次分</small></h2>
      <button type="button" class="btn btn-sm" data-act="wtoggle" aria-expanded="${S.prefs.wOpen}" aria-controls="w-${sid}">${S.prefs.wOpen ? "收起權重" : "調整權重"}</button></div>
    <div class="weights" id="w-${sid}"${S.prefs.wOpen ? "" : " hidden"}>${weightsHTML(sid)}</div>
    <div class="rel-body" id="rb-${sid}">${relBodyHTML(sid, ctx)}</div>
  </section>`;
}
function weightsHTML(sid) {
  const D = B.DEFAULT_WEIGHTS, W = S.W;
  const groups = WMETA.map(gm => `<div class="wgroup"><h4>${gm.title}</h4>${gm.items.map(it => {
    const [k, label, mn, mx, st] = it;
    const min = mn != null ? mn : gm.min, max = mx != null ? mx : gm.max, step = st != null ? st : gm.step;
    const v = W[gm.g][k], d = D[gm.g][k];
    const id = `w-${sid}-${gm.g}-${k}`;
    return `<div class="wslider${v !== d ? " changed" : ""}"><label class="wl" for="${id}">${label}<small>預設 ${fmtN(d)}</small></label><input type="range" id="${id}" data-wg="${gm.g}" data-wk="${k}" min="${min}" max="${max}" step="${step}" value="${v}"><output for="${id}">${fmtN(v)}</output></div>`;
  }).join("")}</div>`).join("");
  return `<div class="wgroups">${groups}</div><div class="row-actions" style="justify-content:flex-start;align-items:center"><button type="button" class="btn btn-sm" data-act="wreset">全部恢復預設</button><span class="hint">拖動即時重排，設定記在這個瀏覽器。合盤位置係數只用在合盤；日柱加權套用在牽到日柱的關係。</span></div>`;
}
let wSaveTimer = null;
function onWeightInput(inp) {
  const g = inp.dataset.wg, k = inp.dataset.wk, v = parseFloat(inp.value);
  S.W[g][k] = v;
  const box = inp.closest(".wslider");
  box.querySelector("output").textContent = fmtN(v);
  box.classList.toggle("changed", v !== B.DEFAULT_WEIGHTS[g][k]);
  // 同步另一頁的同名滑桿
  $$(`input[data-wg="${g}"][data-wk="${k}"]`).forEach(o => { if (o !== inp) { o.value = v; const b2 = o.closest(".wslider"); b2.querySelector("output").textContent = fmtN(v); b2.classList.toggle("changed", v !== B.DEFAULT_WEIGHTS[g][k]); } });
  for (const sid in relCtx) { const el = document.getElementById("rb-" + sid); if (el) el.innerHTML = relBodyHTML(sid, relCtx[sid]); }
  clearTimeout(wSaveTimer); wSaveTimer = setTimeout(() => LS.set("bazi.weights.v1", S.W), 300);
}

/* =========================================================
   案例列表
   ========================================================= */
function caseSummary(c) {
  const ch = chartOf(c);
  const date = c.solar ? `公曆 ${fmtDash(c.solar)}` : "四柱直排";
  const lun = ch.lunar ? ` · 農曆 ${B.lunarText(ch.lunar)}` : "";
  return { ch, date, lun };
}
function renderCases() {
  const root = $("#cases-card");
  S.ui.casesRev = Store.rev;
  const list = Store.cases.filter(c => !S.ui.filter || (c.name || "").includes(S.ui.filter));
  let h = `<div class="listhead"><div><h1 class="card-title">案例列表<small>共 ${Store.cases.length} 個</small></h1><div id="cases-sync" class="cases-sync">${syncHTML(true)}</div></div>
    <input class="field" id="case-filter" type="search" placeholder="按姓名篩選" value="${esc(S.ui.filter)}" aria-label="按姓名篩選"></div>`;
  if (!Store.cases.length) {
    h += `<div class="empty"><p>還沒有存檔的案例。排盤後按抬頭的「存檔」，或在排盤頁打開「排盤後存入案例」。</p><div class="row-actions"><button class="btn btn-gold" type="button" data-act="go" data-page="input">去排盤</button></div></div>`;
    root.innerHTML = h; return;
  }
  if (!list.length) { h += `<div class="empty"><p>沒有名字含「${esc(S.ui.filter)}」的案例。</p></div>`; root.innerHTML = h; return; }
  h += `<div class="caselist">` + list.map(c => {
    const { ch, date, lun } = caseSummary(c);
    const inHp = [S.hepan.a === c.id ? "合盤 A" : "", S.hepan.b === c.id ? "合盤 B" : ""].filter(Boolean);
    let extra = "";
    if (S.ui.editing === c.id) extra = `<div class="case-edit"><label class="sr-only" for="rn-${c.id}">新名字</label><input class="field" id="rn-${c.id}" value="${esc(c.name)}" maxlength="30"><button class="btn btn-sm btn-gold" type="button" data-act="case-rename-save" data-id="${c.id}">儲存名字</button><button class="btn btn-sm" type="button" data-act="case-rename-cancel">取消</button></div>`;
    if (S.ui.confirming === c.id) extra = `<div class="case-confirm"><span>確定刪除「${esc(c.name)}」？刪除後無法復原。</span><button class="btn btn-sm btn-danger solid" type="button" data-act="case-del-yes" data-id="${c.id}">刪除</button><button class="btn btn-sm" type="button" data-act="case-del-no">取消</button></div>`;
    return `<div class="case">
      <div><div class="case-name">${esc(c.name)} <span class="chip">${ch.male ? "乾造" : "坤造"}</span>${inHp.map(t => `<span class="chip gold">${t}</span>`).join("")}</div>
        <div class="case-gz">${ch.pillars.map(gzH).join(" ")}</div>
        <div class="case-meta">${esc(date)}${esc(lun)} · ${c.mode === "lunar" ? "農曆輸入" : c.mode === "sizhu" ? "四柱輸入" : "公曆輸入"}</div></div>
      <div class="case-acts"><button class="btn btn-sm btn-gold" type="button" data-act="case-open" data-id="${c.id}">打開</button><button class="btn btn-sm" type="button" data-act="case-pro" data-id="${c.id}">專業細盤</button><button class="btn btn-sm" type="button" data-act="case-rename" data-id="${c.id}">改名</button><button class="btn btn-sm btn-danger" type="button" data-act="case-del" data-id="${c.id}">刪除</button></div>
      ${extra}</div>`;
  }).join("") + `</div>`;
  root.innerHTML = h;
  if (S.ui.editing) { const i = document.getElementById("rn-" + S.ui.editing); if (i) { i.focus(); i.select(); } }
}

/* =========================================================
   合盤
   ========================================================= */
function hpSideHTML(side) {
  const id = S.hepan[side], c = id ? Store.get(id) : null;
  const L = side.toUpperCase();
  if (!c) return `<div class="hp-side"><h3>${L} 方</h3><button class="btn btn-gold" type="button" data-act="hp-pick" data-side="${side}">從案例列表選擇</button><button class="btn btn-gray" type="button" data-act="hp-new" data-side="${side}">新增案例</button></div>`;
  const ch = chartOf(c);
  return `<div class="hp-side"><h3>${L} 方</h3><div class="hp-chosen"><span class="nm">${esc(c.name)} <span class="chip">${ch.male ? "乾造" : "坤造"}</span></span><span class="gz">${ch.pillars.map(gzH).join(" ")}</span><span class="hint">${c.solar ? "公曆 " + fmtDash(c.solar) : "四柱直排"}</span></div>
    <div class="row-actions"><button class="btn btn-sm" type="button" data-act="hp-pick" data-side="${side}">換一個</button><button class="btn btn-sm" type="button" data-act="hp-new" data-side="${side}">新增案例</button></div></div>`;
}
function renderHepan() {
  const root = $("#page-hepan");
  ["a", "b"].forEach(s => { if (S.hepan[s] && !Store.get(S.hepan[s])) S.hepan[s] = null; });
  const ready = S.hepan.a && S.hepan.b;
  let h = `<div class="card hp-setup"><div class="hp-sides">${hpSideHTML("a")}<div class="hp-div"></div>${hpSideHTML("b")}</div>
    <div class="hp-go"><button class="btn btn-dark gobtn" type="button" data-act="hp-start"${ready ? "" : " disabled"}>開始合盤</button>${ready ? "" : '<p class="hint" style="text-align:center;margin:8px 0 0">兩邊都選好案例後才能開始合盤。</p>'}</div></div>`;
  if (!(ready && S.hepan.started)) { root.innerHTML = h; return; }
  const cA = Store.get(S.hepan.a), cB = Store.get(S.hepan.b);
  const A = chartOf(cA), Bc = chartOf(cB);
  if (A.pillarsOnly || Bc.pillarsOnly) {
    root.innerHTML = h + `<div class="card empty"><p>${A.pillarsOnly ? esc(cA.name) : esc(cB.name)} 是四柱直排、沒有日期的盤，只能比較原局。</p></div>` + pairStaticHTML(cA, cB, A, Bc, null, null);
    return;
  }
  if (!S.hpSel.A) S.hpSel.A = selNow(A);
  if (!S.hpSel.B) S.hpSel.B = selNow(Bc);
  const cross = !!S.prefs.hpCross;
  const pa = proPanelHTML("A", A, S.hpSel.A, cross ? { chart: Bc, side: "B" } : null), pb = proPanelHTML("B", Bc, S.hpSel.B, cross ? { chart: A, side: "A" } : null);
  const mini = (c, ch, L) => `<div class="hp-mini"><span class="sx-ring">${ch.shengxiao}</span><div><div class="nm">${esc(c.name)}</div><div class="ln">${esc(B.lunarText(ch.lunar))} ${ZHI[ch.pillars[3] % 12]}時（${ch.male ? "乾造" : "坤造"}）· ${fmtCN(ch.civil)}</div></div><span class="side-tag">${L}</span></div>`;
  const attnOf = (ch, cols) => attnHTML(B.findRelations(natalItems(ch).concat(dynItems(cols))));
  h += `<div class="card hp-tools"><label class="switch"><input type="checkbox" data-act="hp-cross"${cross ? " checked" : ""}> 干支條也對照對方原局</label><span class="hint">${cross ? "每格除了對照自己的原局，也用空心點標出對方原局的沖、合、伏；下方列出前後年份裡同時沖到或合到兩人的流年。" : "打開後，A 的流年、大運等也拿來對照 B 的原局（B 那邊亦同），看哪一年同時沖到兩個人。"}</span></div>`;
  h += `<div class="hp-panels"><div class="hp-panel">${mini(cA, A, "A")}${pa.html}${attnOf(A, pa.cols)}</div><div class="hp-panel">${mini(cB, Bc, "B")}${pb.html}${attnOf(Bc, pb.cols)}</div></div>`;
  if (cross) h += bothYearsHTML(A, Bc);
  h += pairStaticHTML(cA, cB, A, Bc, pa.cols, pb.cols);
  root.innerHTML = h;
  setupStrips(root);
}
/* 流年同時牽動兩人：今年前十年到後二十年，同一流年對兩人原局都是天剋地沖（或都是天合地合） */
function bothYearsHTML(A, Bc) {
  const now = nowMoment().Y, from = now - 10, to = now + 20;
  const found = { tkdc: [], thdh: [] };
  for (let Y = from; Y <= to; Y++) {
    const i = B.yearGZ(Y), ma = marksOf(i, A.pillars), mb = marksOf(i, Bc.pillars);
    for (const t of ["tkdc", "thdh"]) {
      const a = ma.find(m => m.t === t), b = mb.find(m => m.t === t);
      if (a && b) found[t].push({ Y, i, a, b });
    }
  }
  const where = m => m.pos.map(p => "年月日時"[p]).join("、");
  const chip = (t, r) => `<button type="button" class="yr-chip yr-${t}${r.Y === now ? " is-now" : ""}" data-act="hp-year" data-y="${r.Y}" title="點一下，兩邊一起跳到 ${r.Y} 年"><b class="num">${r.Y}</b><span class="yr-gz">${gzH(r.i)}</span><span class="yr-w">A ${where(r.a)}柱、B ${where(r.b)}柱</span></button>`;
  const never = t => { for (let i = 0; i < 60; i++) if (marksOf(i, A.pillars).some(m => m.t === t) && marksOf(i, Bc.pillars).some(m => m.t === t)) return false; return true; };
  const none = t => `<span class="dim">${never(t) ? `這段期間沒有；兩人原局的組合下，六十甲子裡沒有任何一年會同時${t === "tkdc" ? "沖" : "合"}到兩人` : "這段期間沒有"}</span>`;
  const row = (t, label) => `<div class="yr-row"><span class="k"><span class="mk mk-${t}">${MK_CH[t]}</span>${label}</span><div class="yr-list">${found[t].length ? found[t].map(r => chip(t, r)).join("") : none(t)}</div></div>`;
  return `<div class="card hpx hp-both"><div class="card-pad" style="padding-bottom:6px"><h2 class="card-title">流年同時牽動兩人<small>${from}–${to} 年；點年份，兩邊細盤一起跳到那一年</small></h2></div>
    <div class="yr-rows">${row("tkdc", "同時天剋地沖")}${row("thdh", "同時天合地合")}</div></div>`;
}
function pairStaticHTML(cA, cB, A, Bc, colsA, colsB) {
  // 互看十神
  const dA = A.dm, dB = Bc.dm;
  const zhu = [];
  A.pillars.forEach((pa, i) => Bc.pillars.forEach((pb, j) => { const t = B.pillarRel(pa, pb); if (t) zhu.push(`<span class="mk mk-${t}${i === 2 && j === 2 ? " mk-day" : ""}">${MK_CH[t]}</span>A ${"年月日時"[i]}柱 ${B.gzName(pa)} 與 B ${"年月日時"[j]}柱 ${B.gzName(pb)} ${MK_NAME[t]}`); }));
  const look = `<div class="card hpx"><div class="card-pad" style="padding-bottom:6px"><h2 class="card-title">互看十神</h2></div><div class="duo">
    <div>A 日主 ${gS(dA)}（${esc(cA.name)}）在 B 日主 ${gS(dB)} 眼裡是 <b class="gold">${B.tenGod(dB, dA)}</b></div>
    <div>B 日主 ${gS(dB)}（${esc(cB.name)}）在 A 日主 ${gS(dA)} 眼裡是 <b class="gold">${B.tenGod(dA, dB)}</b></div></div>
    <div class="hp-zhu"><span class="k">整柱對照</span>${zhu.length ? zhu.map(z => `<span class="hz">${z}</span>`).join("") : "<span>兩人原局之間沒有天剋地沖、天合地合或伏吟。</span>"}</div></div>`;
  // 五行互補
  const count = ch => { const n = [0, 0, 0, 0, 0]; ch.pillars.forEach(p => { n[B.ganWx(p % 10)]++; n[B.zhiWx(p % 12)]++; }); return n; };
  const nA = count(A), nB = count(Bc);
  const rows = WX.map((w, i) => {
    let note = "";
    if (!nA[i] && !nB[i]) note = "兩人都缺";
    else if (!nA[i]) note = `A 缺${w}，B 有 ${nB[i]} 個，可補`;
    else if (!nB[i]) note = `B 缺${w}，A 有 ${nA[i]} 個，可補`;
    return `<tr><th scope="row" class="w${i}">${w}</th><td class="num">${nA[i]}</td><td class="num">${nB[i]}</td><td class="note">${note || "—"}</td></tr>`;
  }).join("");
  const wx = `<div class="card hpx"><div class="card-pad" style="padding-bottom:6px"><h2 class="card-title">五行互補<small>各自數原局天干地支八個字（地支按本身五行）</small></h2></div>
    <div style="padding:0 20px 16px;overflow-x:auto"><table class="wxtable"><thead><tr><th scope="col">五行</th><th scope="col">A ${esc(cA.name)}</th><th scope="col">B ${esc(cB.name)}</th><th scope="col" style="text-align:left">缺的對方有沒有</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  // 關係
  const items = natalItems(A, "A").concat(natalItems(Bc, "B"));
  if (colsA && colsB) {
    colsA.filter(c => c.kind === "dyn" && c.idx != null && (c.layer === "dayun" || c.layer === "xiaoyun")).forEach(c => items.push({ label: "A " + c.label, short: c.label, kind: "dyn", layer: c.layer, idx: c.idx, side: "A" }));
    colsB.filter(c => c.kind === "dyn" && c.idx != null && (c.layer === "dayun" || c.layer === "xiaoyun")).forEach(c => items.push({ label: "B " + c.label, short: c.label, kind: "dyn", layer: c.layer, idx: c.idx, side: "B" }));
    colsA.filter(c => c.kind === "dyn" && c.idx != null && !(c.layer === "dayun" || c.layer === "xiaoyun")).forEach(c => items.push({ label: c.label, short: c.label, kind: "dyn", layer: c.layer, idx: c.idx, side: "T" }));
  }
  const raw = B.findRelations(items);
  return look + wx + relSectionHTML("hp", { mode: "pair", items, raw, charts: { A, B: Bc } });
}

/* ---------- 對話框 ---------- */
let modalReturn = null;
function openPicker(side) {
  const m = $("#modal");
  const list = Store.cases;
  const other = side === "a" ? S.hepan.b : S.hepan.a;
  const body = list.length ? list.map(c => {
    const { ch, date } = caseSummary(c);
    return `<button type="button" class="pick" data-act="hp-choose" data-side="${side}" data-id="${c.id}"><span class="nm">${esc(c.name)} <span class="chip">${ch.male ? "乾造" : "坤造"}</span>${c.id === other ? ' <span class="chip gold">已在另一方</span>' : ""}</span><span class="gz">${ch.pillars.map(gzH).join(" ")}</span><span class="mt">${esc(date)}</span></button>`;
  }).join("") : `<div class="empty"><p>還沒有存檔的案例。</p><button class="btn btn-gold" type="button" data-act="hp-new" data-side="${side}">新增案例</button></div>`;
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-t"><div class="modal-head"><h2 class="card-title" id="modal-t">為 ${side.toUpperCase()} 方選擇案例</h2><button type="button" class="btn btn-sm" data-act="modal-close">關閉</button></div><div class="modal-body">${body}</div></div>`;
  modalReturn = document.activeElement;
  m.hidden = false;
  const first = $(".pick, .modal-body .btn", m) || $('[data-act="modal-close"]', m);
  if (first) first.focus();
}
function openCopy() {
  if (!S.cur) return;
  const m = $("#modal");
  const fm = copyFormats(S.cur.chart);
  const body = fm.map(([k, name, text]) => `<div class="cpf"><div class="cpf-head"><span class="cpf-name" id="cpn-${k}">${esc(name)}</span><button type="button" class="btn btn-sm btn-gold" data-act="gz-copy" data-k="${k}" aria-describedby="cpn-${k}">複製</button></div><pre class="cpf-text" id="cpf-${k}">${esc(text)}</pre></div>`).join("") +
    `<p class="hint cpf-hint">都不含姓名。在命盤表裡拖選也會按柱複製：只圍到日期、主星、天干、地支這幾列時，得到「${esc(fm[0][2])}」這樣一行；圍到其他列時每列一行、格子用 Tab 隔開，天干地支合成「干支」一列，可以貼進試算表。</p>`;
  m.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="modal-t"><div class="modal-head"><h2 class="card-title" id="modal-t">複製八字</h2><button type="button" class="btn btn-sm" data-act="modal-close">關閉</button></div><div class="modal-body">${body}</div></div>`;
  modalReturn = document.activeElement;
  m.hidden = false;
  const first = $('[data-act="gz-copy"]', m); if (first) first.focus();
}
function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; if (modalReturn && modalReturn.focus) modalReturn.focus(); modalReturn = null; }

/* =========================================================
   事件
   ========================================================= */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-act]");
  if (!t) { if (e.target.id === "modal") closeModal(); return; }
  const act = t.dataset.act;
  switch (act) {
    case "go": go(t.dataset.page); break;
    case "mode": setMode(t.dataset.mode); break;
    case "now": { const c = nowCase(); setCurrent(c, false); go("basic"); break; }
    case "save-cur": if (S.cur && !S.cur.saved) { Store.put(S.cur.c); S.cur.saved = true; LS.set("bazi.cur.v1", { c: S.cur.c, saved: true }); render(S.page); toast(`已存入案例列表：「${S.cur.c.name}」。`); } break;
    case "edit-cur": if (S.cur) { S.flow = { type: "edit", id: S.cur.c.id, name: S.cur.c.name, saved: S.cur.saved, back: S.page === "pro" ? "pro" : "basic" }; fillFormFromCase(S.cur.c); go("input"); } break;
    case "flow-cancel": { const f = S.flow; S.flow = null; updateBanner(); fillFormNow(); setMode("solar"); go(f && f.type === "hepan" ? "hepan" : (f && f.back) || "basic"); break; }
    case "sha": S.prefs.sha = !S.prefs.sha; savePrefs(); rerenderPanels(S.page === "hepan" ? "A" : "pro"); if (S.page === "basic") renderBasic(); break;
    case "sel": applySel(t.dataset.pid, t.dataset.level, +t.dataset.v); break;
    case "today": {
      const pid = t.dataset.pid, st = panelState(pid); if (!st.chart) break;
      if (pid === "pro") S.proSel = selNow(st.chart); else { S.hpSel.A = null; S.hpSel.B = null; }
      stripPos.clear(); rerenderPanels(pid); toast("已回到今天。"); break;
    }
    case "wtoggle": S.prefs.wOpen = !S.prefs.wOpen; savePrefs();
      $$(".weights").forEach(w => { w.hidden = !S.prefs.wOpen; });
      $$('[data-act="wtoggle"]').forEach(b => { b.setAttribute("aria-expanded", S.prefs.wOpen); b.textContent = S.prefs.wOpen ? "收起權重" : "調整權重"; });
      break;
    case "wreset": S.W = JSON.parse(JSON.stringify(B.DEFAULT_WEIGHTS)); LS.set("bazi.weights.v1", S.W);
      for (const sid in relCtx) { const w = document.getElementById("w-" + sid); if (w) w.innerHTML = weightsHTML(sid); const el = document.getElementById("rb-" + sid); if (el) el.innerHTML = relBodyHTML(sid, relCtx[sid]); }
      toast("權重已恢復預設。"); break;
    case "fold": { const k = t.dataset.key; S.fold[k] = !S.fold[k]; const sid = k.split(":")[0]; const el = document.getElementById("rb-" + sid); if (el) el.innerHTML = relBodyHTML(sid, relCtx[sid]); const nb = document.querySelector(`[data-act="fold"][data-key="${k}"]`); if (nb) nb.focus(); break; }
    case "case-open": case "case-pro": { const c = Store.get(t.dataset.id); if (c) { setCurrent(c, true); go(act === "case-pro" ? "pro" : "basic"); } break; }
    case "case-rename": S.ui.editing = t.dataset.id; S.ui.confirming = null; renderCases(); break;
    case "case-rename-cancel": S.ui.editing = null; renderCases(); break;
    case "case-rename-save": {
      const c = Store.get(t.dataset.id); const inp = document.getElementById("rn-" + t.dataset.id);
      const nm = inp ? inp.value.trim() : "";
      if (!nm) { toast("名字不能空白。"); break; }
      if (c) { const n2 = Object.assign({}, c, { name: nm }); Store.put(n2); if (S.cur && S.cur.c.id === c.id) { S.cur.c = n2; LS.set("bazi.cur.v1", { c: n2, saved: true }); } }
      S.ui.editing = null; renderCases(); toast("名字已更新。"); break;
    }
    case "case-del": S.ui.confirming = t.dataset.id; S.ui.editing = null; renderCases(); break;
    case "case-del-no": S.ui.confirming = null; renderCases(); break;
    case "case-del-yes": {
      const id = t.dataset.id, c = Store.get(id);
      Store.remove(id); S.ui.confirming = null;
      if (S.cur && S.cur.c.id === id) { S.cur.saved = false; LS.set("bazi.cur.v1", { c: S.cur.c, saved: false }); }
      if (S.hepan.a === id) S.hepan.a = null; if (S.hepan.b === id) S.hepan.b = null; saveHepan();
      renderCases(); toast(`已刪除「${c ? c.name : ""}」。`); break;
    }
    case "hp-pick": openPicker(t.dataset.side); break;
    case "hp-choose": { S.hepan[t.dataset.side] = t.dataset.id; S.hepan.started = false; S.hpSel = { A: null, B: null }; saveHepan(); closeModal(); renderHepan(); break; }
    case "hp-new": closeModal(); S.flow = { type: "hepan", side: t.dataset.side }; fillFormNow(); $("#f-name").value = ""; setMode("solar"); go("input"); break;
    case "hp-start": if (S.hepan.a && S.hepan.b) { S.hepan.started = true; S.hpSel = { A: null, B: null }; saveHepan(); renderHepan(); const p = $(".hp-panels"); if (p) p.scrollIntoView({ block: "start", behavior: "smooth" }); } break;
    case "modal-close": closeModal(); break;
    case "gz-copy-open": openCopy(); break;
    case "pz-tab": { S.pzActive = +t.dataset.k; renderPz(); const b = $(`#f-pz .pz-tab[data-k="${t.dataset.k}"]`); if (b) b.focus(); break; }
    case "pz-gan": pzPick("gan", +t.dataset.v); break;
    case "pz-zhi": pzPick("zhi", +t.dataset.v); break;
    case "gz-copy": {
      const pre = document.getElementById("cpf-" + t.dataset.k), nm = document.getElementById("cpn-" + t.dataset.k);
      if (!pre) break;
      copyText(pre.textContent).then(done => {
        if (done) { closeModal(); toast(`已複製「${nm ? nm.textContent.replace(/（.*）/, "") : "八字"}」。`); }
        else { selectNode(pre); toast("瀏覽器不讓網頁寫入剪貼簿，文字已經選好，請按 Ctrl+C（手機長按）複製。"); }
      });
      break;
    }
    case "theme": {
      const id = t.dataset.id;
      S.theme.id = id; applyTheme(); renderTheme();
      const nm = id === "auto" ? "跟隨系統" : id === "custom" ? "自訂" : (THEMES.find(x => x.id === id) || {}).name;
      toast(`已套用「${nm}」。`);
      const nb = document.querySelector(`.theme-card[data-id="${id}"]`); if (nb) nb.focus();
      break;
    }
    case "show-dev": S.ui.showDev = t.dataset.dev; renderTheme(); { const b = document.querySelector(`[data-act="show-dev"][data-dev="${t.dataset.dev}"]`); if (b) b.focus(); } break;
    case "show-lite": case "show-all": {
      const dev = S.ui.showDev || devNow();
      S.prefs.dyn = Object.assign({}, S.prefs.dyn, { [dev]: act === "show-lite" && dev === "phone" ? "dy" : "all" });
      setHide(dev, act === "show-lite" ? LITE.slice() : []); renderTheme();
      toast(`${DEV_NAME[dev]}已${act === "show-lite" ? "切換成精簡模式" : "恢復全部顯示"}。`);
      const b = document.querySelector(`[data-act="${act}"]`); if (b) b.focus(); break;
    }
    case "sha-reset": S.prefs.shaOpt = {}; savePrefs(); S.ui.shaOpen = true; renderTheme(); toast("神煞查法已恢復預設。"); { const b = document.querySelector('.sha-sw summary'); if (b) b.focus(); } break;
    case "hp-year": {
      const Y = +t.dataset.y;
      for (const pid of ["A", "B"]) { const st = panelState(pid); if (st.chart) S.hpSel[pid] = { dk: B.dayunIndexForYear(st.chart, Y), year: Y, mk: null, dn: null, hb: null }; }
      stripPos.clear(); renderHepan();
      const p = $(".hp-panels"); if (p) p.scrollIntoView({ block: "start" });
      toast(`兩邊都跳到 ${Y} 年。`); break;
    }
    case "cp-copy": {
      const cur = themeNow();
      S.theme.custom = { name: "自訂", bg: cur.bg, card: cur.card, ink: cur.ink, accent: cur.accent, bar: cur.bar, barInk: cur.barInk };
      S.theme.id = "custom"; applyTheme(); renderTheme();
      toast(`已把「${cur.name}」複製到自訂，可以逐一微調。`);
      break;
    }
  }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.matches('[data-act="tms"]')) { S.prefs.tms = t.checked; savePrefs(); rerenderPanels("pro"); return; }
  if (t.matches('[data-act="hp-cross"]')) { S.prefs.hpCross = t.checked; savePrefs(); stripPos.clear(); rerenderPanels("A"); const c = $('[data-act="hp-cross"]'); if (c) c.focus(); return; }
  if (t.matches("input[data-dyn]")) {
    const dev = S.ui.showDev || devNow();
    S.prefs.dyn = Object.assign({}, S.prefs.dyn, { [dev]: t.dataset.dyn }); savePrefs();
    toast(`${DEV_NAME[dev]}的細盤表改為「${(DYN_LABEL.find(x => x[0] === t.dataset.dyn) || [])[1]}」。`); return;
  }
  if (t.matches("input[data-sha]")) {
    S.prefs.shaOpt = Object.assign({}, S.prefs.shaOpt, { [t.dataset.sha]: t.dataset.v }); savePrefs();
    const o = B.shaOpt(S.prefs.shaOpt), n = B.SHA_OPTIONS.filter(it => o[it.k] !== B.SHA_DEFAULT[it.k]).length;
    const b = $('[data-act="sha-reset"]'); if (b) b.disabled = !n;
    const st = $("#sha-state"); if (st) st.textContent = n ? `已改 ${n} 項` : "目前全用預設";
    return;
  }
  if (t.matches("input[data-show]")) {
    const dev = S.ui.showDev || devNow(), set = new Set(hideList(dev)), k = t.dataset.show;
    if (t.checked) set.delete(k); else set.add(k);
    setHide(dev, SHOW_GROUPS.flatMap(g => g.items.map(i => i[0])).filter(x => set.has(x)));
    return;
  }
  if (!t.closest("#f-form")) return;
  if (t.id === "f-sy" || t.id === "f-sm") rebuildDays();
  if (t.id === "f-ly") rebuildLunarMonths();
  if (t.id === "f-lm") rebuildLunarDays();
  if (t.id === "f-place") { if (t.value !== "custom") setPlaceByIndex(+t.value); }
  if (t.id === "f-lon" || t.id === "f-lat") $("#f-place").value = "custom";
  if (t.id === "f-save") { S.prefs.autosave = t.checked; savePrefs(); }
  if (t.id === "f-tz") { S.candPick = null; if (S.mode === "sizhu") renderCands(); }
  if (t.name === "f-cand") S.candPick = +t.value;
  updatePreview();
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.matches('input[type="range"][data-wg]')) { onWeightInput(t); return; }
  if (t.matches('input[type="color"][data-cp]')) { onCustomColor(t); return; }
  if (t.id === "f-gzq") { if (!e.isComposing) onGzText(); return; }
  if (t.id === "case-filter") { S.ui.filter = t.value.trim(); const pos = t.selectionStart; renderCases(); const f = $("#case-filter"); if (f) { f.focus(); try { f.setSelectionRange(pos, pos); } catch (x) { /* 無妨 */ } } return; }
  if (t.id === "f-lon" || t.id === "f-lat" || t.id === "f-name") { if (t.id !== "f-name") $("#f-place").value = "custom"; updatePreview(); }
});
document.addEventListener("compositionend", e => { if (e.target && e.target.id === "f-gzq") onGzText(); });
document.addEventListener("copy", e => {
  const text = tableCopyText(document.getSelection());
  if (text == null || !e.clipboardData) return;
  e.clipboardData.setData("text/plain", text);
  e.preventDefault();
});
document.addEventListener("toggle", e => { if (e.target.matches && e.target.matches("details.sha-sw")) S.ui.shaOpen = e.target.open; }, true);
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#modal").hidden) closeModal();
  if (e.key === "Enter" && e.target.id && e.target.id.startsWith("rn-")) { const b = document.querySelector(`[data-act="case-rename-save"][data-id="${e.target.id.slice(3)}"]`); if (b) b.click(); }
});
$("#f-form").addEventListener("submit", e => { e.preventDefault(); submitForm(); });

/* ---------- 啟動 ----------
   先畫框架（導覽列與目前頁的佔位），下一個畫面再算命盤；看到哪頁才算哪頁。 */
const HEAVY = ["basic", "pro", "hepan", "cases"];
function showFrame(page) {
  S.page = page;
  $$(".page").forEach(p => { p.hidden = p.id !== "page-" + page; });
  $$(".nav-item").forEach(b => b.setAttribute("aria-current", b.dataset.page === page ? "page" : "false"));
  const box = page === "cases" ? $("#cases-card") : $("#page-" + page);
  if (box) box.innerHTML = `<div class="${page === "cases" ? "" : "card "}loading" aria-busy="true"><span class="ld-bar"></span><span>${page === "cases" ? "正在讀取案例…" : "正在排盤…"}</span></div>`;
}
function init() {
  applyTheme();
  applyHide();
  const saved = LS.get("bazi.cur.v1", null);
  if (saved && validCase(saved.c)) setCurrent(saved.c, saved.saved);
  Store.sort();
  checkCurSaved();
  Store.subs.add(() => {
    renderSync();
    checkCurSaved();
    if (S.page === "cases" && S.ui.casesRev !== Store.rev) renderCases();
    if (S.page === "hepan" && !S.hepan.started) renderHepan();
  });
  renderSync();
  let page = (location.hash || "").replace("#", "");
  if (!PAGES.includes(page)) page = LS.get("bazi.page", "input");
  if (!PAGES.includes(page) || ((page === "basic" || page === "pro") && !S.cur)) page = "input";
  if (HEAVY.includes(page)) {
    showFrame(page);
    const boot = () => { if (!S.booted) go(page, { keepScroll: true }); };
    if (window.requestAnimationFrame) requestAnimationFrame(() => setTimeout(boot, 0)); else setTimeout(boot, 0);
  } else go(page);
  setInterval(() => tickNow(false), 1000);
  Store.initCloud();
}
init();
})();
