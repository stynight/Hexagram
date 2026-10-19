/* ===== 介面 ===== */
(() => {
"use strict";
const Y = Liuyao, C = Y.Cal;
const { GAN, ZHI, WX } = Y;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad2 = n => String(n).padStart(2, "0");
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 無痕或封鎖 */ } }
};
/* 原文裡有兩處是使用者避用的那個字，資料中以〓佔位；顯示時依設定換成□或原字 */
const AVOID_MARK = "〓";
const AVOID_CHAR = String.fromCharCode(0x63A5);
const Y_MIN = 1901, Y_MAX = 2099;

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
const THEME_PROPS = ["--bg", "--card", "--ink", "--accent", "--on-accent", "--bar", "--bar-ink", "--mu", "--huo", "--tu", "--jin", "--shui", "--danger", "--good", "--warn", "--shadow", "color-scheme"];
function rgbOf(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return [128, 128, 128]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function lumOf(h) { const c = rgbOf(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
const contrastOf = (a, b) => { const x = lumOf(a), y = lumOf(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const themeIsDark = t => lumOf(t.card) < 0.3;
function themeVars(t) {
  const dark = themeIsDark(t), wx = dark ? WX_DARK : WX_LIGHT;
  return {
    "--bg": t.bg, "--card": t.card, "--ink": t.ink, "--accent": t.accent,
    "--on-accent": contrastOf(t.accent, "#FFFFFF") >= contrastOf(t.accent, "#111111") ? "#FFFFFF" : "#111111",
    "--bar": t.bar, "--bar-ink": t.barInk,
    "--mu": wx.mu, "--huo": wx.huo, "--tu": wx.tu, "--jin": wx.jin, "--shui": wx.shui,
    "--danger": dark ? "#FF7B6E" : "#B42318", "--good": dark ? "#5BC98A" : "#1F7A45", "--warn": dark ? "#F0B45A" : "#A45D00",
    "--shadow": dark ? "0 1px 2px rgba(0,0,0,.35), 0 6px 18px rgba(0,0,0,.25)" : "0 1px 2px rgba(20,24,32,.05), 0 6px 18px rgba(20,24,32,.05)",
    "color-scheme": dark ? "dark" : "light"
  };
}
function applyTheme() {
  const st = document.documentElement.style;
  THEME_PROPS.forEach(p => st.removeProperty(p));
  const t = THEMES.find(x => x.id === S.theme.id);
  const vars = t ? themeVars(t) : null;
  if (vars) for (const k in vars) st.setProperty(k, vars[k]);
  LS.set("liuyao.theme.v1", S.theme);
  LS.set("liuyao.theme.vars", vars);
}

/* ---------- 狀態 ---------- */
const draft = LS.get("liuyao.draft.v1", {});
const S = {
  page: "input",
  method: ["number", "manual", "time"].includes(draft.method) ? draft.method : "number",
  nums: Array.isArray(draft.nums) && draft.nums.length === 3 ? draft.nums.map(String) : ["", "", ""],
  manual: Array.isArray(draft.manual) && draft.manual.length === 6 ? draft.manual.map(v => [6, 7, 8, 9].includes(v) ? v : null) : [null, null, null, null, null, null],
  q: typeof draft.q === "string" ? draft.q : "",
  tzMode: draft.tzMode == null ? "auto" : draft.tzMode,
  zishi: draft.zishi !== false,
  chart: null, snap: null, curCaseId: null,
  focus: null, sel: null,
  prefs: Object.assign({ avoid: true, score: true, top: 5, full: false }, LS.get("liuyao.prefs.v1", {})),
  theme: Object.assign({ id: "auto" }, LS.get("liuyao.theme.v1", {})),
  ui: { editing: null, confirming: null }
};
if (S.theme.id !== "auto" && !THEMES.some(t => t.id === S.theme.id)) S.theme.id = "auto";
const savePrefs = () => LS.set("liuyao.prefs.v1", S.prefs);
const saveDraft = () => LS.set("liuyao.draft.v1", { method: S.method, nums: S.nums, manual: S.manual, q: S.q, tzMode: S.tzMode, zishi: S.zishi });

/* ---------- 卦例存放：本機＋（發布成 Artifact 登入時）帳戶 ---------- */
const Cases = {
  list: LS.get("liuyao.cases.v1", []).filter(c => c && c.id && Array.isArray(c.lines)),
  status: "local", col: null, known: new Set(), subs: [],
  on(fn) { this.subs.push(fn); }, emit() { this.subs.forEach(f => f()); },
  sort() { this.list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },
  saveLocal() { LS.set("liuyao.cases.v1", this.list); },
  get(id) { return this.list.find(c => c.id === id) || null; },
  async put(c) {
    c.updatedAt = Date.now();
    const i = this.list.findIndex(x => x.id === c.id);
    if (i >= 0) this.list[i] = c; else this.list.unshift(c);
    this.sort(); this.saveLocal(); this.emit();
    if (this.col) { try { await this.col.doc(c.id).set(JSON.parse(JSON.stringify(c))); } catch (e) { toast("帳戶存檔沒有成功，這筆先存在本瀏覽器。"); } }
  },
  async remove(id) {
    this.list = this.list.filter(c => c.id !== id); this.saveLocal(); this.emit();
    if (this.col) { try { await this.col.doc(id).delete(); } catch (e) { toast("帳戶裡的刪除沒有成功，稍後再試一次。"); } }
  },
  async initCloud() {
    const cl = window.claude;
    if (!cl || typeof cl.use !== "function") return;
    try {
      const [db, user] = await Promise.all([cl.use("db"), cl.use("user")]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      const col = db.doc("data/users/" + uid + "/liuyao").collection("cases");
      let synced = false;
      col.onSnapshot(snap => {
        if (!synced && snap.metadata.fromCache) return;
        const remote = snap.docs.map(d => d.data()).filter(x => x && x.id && Array.isArray(x.lines));
        if (!synced) {
          synced = true;
          const ids = new Set(remote.map(c => c.id));
          const missing = this.list.filter(c => !ids.has(c.id));
          (async () => { for (const c of missing) { try { await col.doc(c.id).set(JSON.parse(JSON.stringify(c))); } catch (e) { /* 留在本機 */ } } })();
          this.list = remote.map(x => JSON.parse(JSON.stringify(x))).concat(missing);
        } else {
          const pending = this.list.filter(c => !remote.some(r => r.id === c.id) && !this.known.has(c.id));
          this.list = remote.map(x => JSON.parse(JSON.stringify(x))).concat(pending);
        }
        this.known = new Set(remote.map(r => r.id));
        this.sort(); this.saveLocal(); this.status = "cloud"; this.emit();
      }, () => { this.col = null; this.status = "local"; this.emit(); });
      this.col = col;
    } catch (e) { /* 留在本機 */ }
  }
};
Cases.on(() => { if (S.page === "cases") renderCases(); if (S.page === "chart") renderChart(); });

/* ---------- 小工具 ---------- */
let toastTimer = null;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2600); }
function openModal(html) { const m = $("#modal"); m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true">${html}</div>`; m.hidden = false; }
function closeModal() { const m = $("#modal"); m.hidden = true; m.innerHTML = ""; }
function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch (e) { return false; }
}
async function copyText(text, okMsg) {
  /* 先試剪貼簿 API（1.5 秒沒回應就當作不能用），再試舊式複製，都不行才開對話框讓使用者自己複製 */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await Promise.race([navigator.clipboard.writeText(text), new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1500))]);
      toast(okMsg); return;
    } catch (e) { /* 改用其他方式 */ }
  }
  if (legacyCopy(text)) { toast(okMsg); return; }
  openModal(`<div class="card-head"><div class="card-title">複製文字</div><button type="button" class="btn btn-sm" data-act="modal-close">關閉</button></div>
    <textarea id="copy-area" readonly>${esc(text)}</textarea>
    <div class="modal-acts"><span class="hint" style="margin-right:auto">這個環境不讓網頁寫剪貼簿，已幫你全選，按 Ctrl+C（手機長按）複製。</span></div>`);
  const ta = $("#copy-area"); ta.focus(); ta.select();
}
const localTzAt = d => -new Date(d.y, d.m - 1, d.d, d.hh, d.mi).getTimezoneOffset() / 60;
function tzText(tz) { const a = Math.abs(tz), h = Math.floor(a), m = Math.round((a - h) * 60); return `UTC${tz < 0 ? "−" : "+"}${h}${m ? ":" + pad2(m) : ""}`; }
const TZS = (() => { const a = []; for (let x = -12; x <= 14; x += 0.5) a.push(x); a.push(5.75, 8.75, 12.75); return a.sort((p, q) => p - q); })();
const wxSpan = (w, txt) => `<span class="w${w}">${txt}</span>`;
const gzHTML = (g, b) => `<span class="gz"><span class="dim">${GAN[g]}</span>${wxSpan(Y.zhiWx(b), ZHI[b] + WX[Y.zhiWx(b)])}</span>`;
const yaoHTML = (yang, mv, cls = "") => `<span class="yao${mv ? " mv" : ""}${cls ? " " + cls : ""}" aria-hidden="true">${yang ? "<i></i>" : "<i></i><i></i>"}</span>`;
function guaMini(bits, mvSet) { let h = ""; for (let k = 0; k < 6; k++) h += yaoHTML((bits >> k) & 1, mvSet && mvSet.has(k)); return `<span class="gua-mini" aria-hidden="true">${h}</span>`; }
function txt(s) {
  const e = esc(s);
  if (!e.includes(AVOID_MARK)) return e;
  return e.split(AVOID_MARK).join(S.prefs.avoid ? `<span class="avoid" title="原文此字依避字設定以□代替，可在「設定」改回原字">□</span>` : AVOID_CHAR);
}
const plain = s => String(s).split(AVOID_MARK).join(S.prefs.avoid ? "□" : AVOID_CHAR);
const fmtDate = d => `${d.y}-${pad2(d.m)}-${pad2(d.d)} ${pad2(d.hh)}:${pad2(d.mi)}`;
const fmtClockJD = (jd, tz) => { const c = C.jdToClock(jd + tz / 24); return `${c.m}-${pad2(c.d)} ${pad2(c.hh)}:${pad2(c.mi)}`; };

/* =========================================================
   起卦頁
   ========================================================= */
function opt(v, t, sel) { return `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(t)}</option>`; }
function buildDateOptions() {
  let h = ""; for (let y = Y_MIN; y <= Y_MAX; y++) h += opt(y, y + "年"); $("#f-y").innerHTML = h;
  h = ""; for (let m = 1; m <= 12; m++) h += opt(m, m + "月"); $("#f-m").innerHTML = h;
  h = ""; for (let x = 0; x < 24; x++) h += opt(x, pad2(x) + "時"); $("#f-hh").innerHTML = h;
  h = ""; for (let x = 0; x < 60; x++) h += opt(x, pad2(x) + "分"); $("#f-mi").innerHTML = h;
  $("#f-tz").innerHTML = opt("auto", "本機時區") + TZS.map(t => opt(t, tzText(t))).join("");
}
function fillDays(keep) {
  const y = +$("#f-y").value, m = +$("#f-m").value, n = C.monthLen(y, m);
  let h = ""; for (let d = 1; d <= n; d++) h += opt(d, d + "日");
  $("#f-d").innerHTML = h;
  $("#f-d").value = String(Math.min(keep || 1, n));
}
function setDate(d) {
  $("#f-y").value = String(Math.min(Y_MAX, Math.max(Y_MIN, d.y))); $("#f-m").value = String(d.m); fillDays(d.d);
  $("#f-hh").value = String(d.hh); $("#f-mi").value = String(d.mi);
}
function nowDate() { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() + 1, d: n.getDate(), hh: n.getHours(), mi: n.getMinutes() }; }
const readDate = () => ({ y: +$("#f-y").value, m: +$("#f-m").value, d: +$("#f-d").value, hh: +$("#f-hh").value, mi: +$("#f-mi").value });
const tzFor = d => S.tzMode === "auto" ? localTzAt(d) : +S.tzMode;
function currentMoment() { const d = readDate(); return Y.moment(Object.assign({}, d, { tz: tzFor(d), zishi: S.zishi ? "day23" : "split" })); }
function currentCast(mom) {
  if (S.method === "number") {
    const filled = S.nums.filter(x => String(x).trim() !== "").length;
    if (filled < 3) return { error: filled ? "還差" + (3 - filled) + "個數字" : "請填三個數字", soft: true };
    return Y.castNumbers(...S.nums);
  }
  if (S.method === "manual") {
    const left = S.manual.filter(v => v == null).length;
    if (left) return { error: `還有 ${left} 個爻沒選`, soft: true };
    return Y.castManual(S.manual);
  }
  return Y.castTime(mom);
}
const PICKS = [[7, "少陽", "⚊"], [8, "少陰", "⚋"], [9, "老陽", "○"], [6, "老陰", "✕"]];
function renderPicker() {
  let h = "";
  for (let k = 5; k >= 0; k--) {
    const v = S.manual[k];
    h += `<div class="pick-row"><span class="pl">${Y.POS_SHORT[k]}</span><div class="pick-btns">` +
      PICKS.map(([val, name, sym]) => `<button type="button" data-act="pick" data-pos="${k}" data-v="${val}" aria-pressed="${v === val}" aria-label="${Y.POS_SHORT[k]}${name}"><span class="sym">${sym}</span>${name}</button>`).join("") +
      `</div><span class="mini">${v == null ? '<span class="hint">未選</span>' : yaoHTML(Y.isYang(v), Y.isMoving(v))}</span></div>`;
  }
  $("#f-picker").innerHTML = h;
}
function triText(t) { return `${Y.TRI_NAME[t]}（${Y.TRI_XIANG[t]}）`; }
function renderInputPreview() {
  ["number", "manual", "time"].forEach(m => { $("#m-" + m).hidden = S.method !== m; $("#m-btn-" + m).setAttribute("aria-pressed", String(S.method === m)); });
  let mom, err = null;
  try { mom = currentMoment(); } catch (e) { err = "日期時間無法換算"; }
  const pv = $("#f-preview");
  if (mom) {
    const L = mom.lunar, tz = mom.tz;
    const zi = mom.lateZi ? (S.zishi ? "（23 點後，已換日）" : "（夜子時，日柱不換）") : "";
    pv.innerHTML = `<div class="pv-gz">${mom.pillars.map(Y.gzName).join("　")}</div>
      <div class="pv-kv"><span class="k">四柱</span><span>${Y.gzName(mom.yearIdx)}年 ${Y.gzName(mom.monthIdx)}月 ${Y.gzName(mom.dayIdx)}日 ${Y.gzName(mom.hourIdx)}時${zi}</span>
      <span class="k">月建日辰</span><span>月建 ${ZHI[mom.monthBranch]}${WX[Y.zhiWx(mom.monthBranch)]}，日辰 ${Y.gzName(mom.dayIdx)}，旬空 ${mom.xunkong.map(b => ZHI[b]).join("")}</span>
      <span class="k">農曆</span><span>${L ? esc(C.lunarText(L)) : "—"}</span>
      <span class="k">節氣</span><span>${esc(mom.prevJie.name)} ${fmtClockJD(mom.prevJie.jd, tz)} 之後，${esc(mom.nextJie.name)} ${fmtClockJD(mom.nextJie.jd, tz)} 之前</span>
      <span class="k">時區</span><span>${tzText(tz)}${S.tzMode === "auto" ? "（本機）" : ""}</span></div>`;
  } else pv.innerHTML = `<span class="err">${esc(err)}</span>`;
  const cast = mom ? currentCast(mom) : { error: err };
  const st = $("#f-steps"), gv = $("#f-gua"), go = $("#f-go");
  if (cast.error) {
    st.innerHTML = `<span class="${cast.soft ? "" : "err"}">${esc(cast.error)}</span>`;
    gv.innerHTML = `<span class="hint">填好之後，這裡會先顯示本卦與變卦。</span>`;
    go.disabled = true;
    return;
  }
  go.disabled = false;
  const det = cast.detail;
  if (det.steps) {
    st.innerHTML = det.steps.map(s => `<div class="st"><b>${s.label}</b><span>${esc(s.expr)} 餘 ${s.rem}</span><span class="res">${s.tri != null ? triText(s.tri) : (s.use === 6 ? "上爻" : Y.POS_SHORT[s.use - 1])}</span></div>`).join("");
  } else st.innerHTML = `<div class="st"><b>六爻</b><span>${cast.lines.slice().reverse().map(v => Y.YAO_LABEL[v]).join("、")}（上爻→初爻）</span><span></span></div>`;
  let bits = 0, cbits = 0; const mv = new Set();
  cast.lines.forEach((v, k) => { if (Y.isYang(v)) bits |= 1 << k; if (Y.isMoving(v)) mv.add(k); });
  cbits = bits; mv.forEach(k => { cbits ^= 1 << k; });
  const b1 = Y.hexInfo(bits);
  gv.innerHTML = `<span class="pv-one">${guaMini(bits, mv)}<span class="nm">${b1.full}</span></span>` + (mv.size ? `<span class="arrow" aria-label="變">→</span><span class="pv-one">${guaMini(cbits)}<span class="nm">${Y.hexInfo(cbits).full}</span></span>` : `<span class="hint">靜卦（無動爻）</span>`);
}
function castNow() {
  const mom = currentMoment();
  const cast = currentCast(mom);
  if (cast.error) { toast(cast.error); return; }
  const d = readDate();
  S.snap = { method: S.method, nums: S.nums.slice(), manual: S.method === "manual" ? S.manual.slice() : null, lines: cast.lines.slice(), date: d, tzMode: S.tzMode, tz: mom.tz, zishi: S.zishi, q: S.q.trim() };
  S.chart = Y.build(cast, mom);
  S.curCaseId = null; S.focus = null; S.sel = null;
  LS.set("liuyao.last.v1", S.snap);
  go("chart");
}
function chartFromSnap(sn) {
  const mom = Y.moment(Object.assign({}, sn.date, { tz: sn.tz, zishi: sn.zishi === false ? "split" : "day23" }));
  let cast;
  if (sn.method === "number" && sn.nums) cast = Y.castNumbers(...sn.nums);
  else if (sn.method === "time") cast = Y.castTime(mom);
  else cast = Y.castManual(sn.lines);
  if (!cast || cast.error || JSON.stringify(cast.lines) !== JSON.stringify(sn.lines)) cast = Object.assign(Y.castManual(sn.lines), { detail: { method: sn.method || "manual" } });
  return Y.build(cast, mom);
}
function loadSnapToForm(sn) {
  S.method = sn.method || "manual"; S.nums = (sn.nums || ["", "", ""]).map(String);
  S.manual = sn.method === "manual" ? sn.lines.slice() : S.manual;
  S.q = sn.q || ""; S.tzMode = sn.tzMode == null ? "auto" : sn.tzMode; S.zishi = sn.zishi !== false;
  $("#f-n1").value = S.nums[0]; $("#f-n2").value = S.nums[1]; $("#f-n3").value = S.nums[2]; $("#f-q").value = S.q;
  setDate(sn.date); $("#f-tz").value = String(S.tzMode); $("#f-zs").checked = S.zishi;
  renderPicker(); saveDraft();
}

/* =========================================================
   排盤頁
   ========================================================= */
const methodText = (sn, ch) => {
  if (!sn) return "";
  if (sn.method === "number") return `數字 ${sn.nums.join("、")}`;
  if (sn.method === "time") { const d = ch.cast.detail; return d && d.steps ? `時間（年${ZHI[d.yb]}${d.Y}＋${d.leap ? "閏" : ""}${d.M}月＋${d.D}日＋時${d.H}）` : "時間"; }
  return "手動六爻";
};
function emptyHTML(title, body) {
  return `<div class="card empty"><div class="card-title">${esc(title)}</div><p>${esc(body)}</p><button type="button" class="btn btn-gold" data-act="go" data-page="input">去起卦</button></div>`;
}
function lineTags(ch, k) {
  const s = ch.summary[k];
  const a = s.tags.map(t => `<span class="chip ${t.k}">${esc(t.t)}</span>`).join("");
  const b = s.hua.length ? `<span class="tagsep" aria-hidden="true"></span>` + s.hua.map(t => `<span class="chip ${t.k}">${esc(t.t)}</span>`).join("") : "";
  return a + b;
}
function fuHTML(F) {
  if (!F) return "";
  const tags = [];
  if (F.kong) tags.push("空");
  if (F.month.key === "po") tags.push("月破");
  if (F.day === "lin") tags.push("臨日"); else if (F.day === "chong") tags.push("日沖"); else if (F.day === "he") tags.push("日合");
  return `<span class="hint">伏</span> <b>${F.qin}</b>${GAN[F.g]}${wxSpan(F.wx, ZHI[F.b] + WX[F.wx])}${tags.length ? `<span class="dim">（${tags.join("、")}）</span>` : ""}`;
}
function renderChart() {
  const pg = $("#page-chart");
  const ch = S.chart;
  if (!ch) { pg.innerHTML = emptyHTML("還沒有排盤", "先到「起卦」選起卦方式，按「開始排盤」。"); return; }
  const { ben, bian, mom } = ch;
  const mv = new Set(ch.moving);
  const tz = mom.tz, d = S.snap ? S.snap.date : null;
  const saved = S.curCaseId && Cases.get(S.curCaseId);
  const tagG = h => [h.pair ? h.pair + "卦" : "", h.gen >= 6 ? h.genName + "卦" : ""].filter(Boolean).map(t => `<span class="chip gold">${t}</span>`).join(" ");
  let h = `<div class="hbar">
    <div class="hbar-gua">
      <div class="hg">${guaMini(ben.bits, mv)}<div><div class="hg-name">${ben.full}</div><div class="hg-sub">${ben.palaceName}宮${ben.genName} ${tagG(ben)}</div></div></div>
      ${bian ? `<span class="hg-arrow" aria-hidden="true">→</span><div class="hg">${guaMini(bian.bits)}<div><div class="hg-name">${bian.full}</div><div class="hg-sub">${bian.palaceName}宮${bian.genName} ${tagG(bian)}</div></div></div>` : `<span class="hg-sub">靜卦，無動爻</span>`}
    </div>
    <div class="hbar-acts">
      <button type="button" class="hbtn" id="c-save" data-act="save-case"${saved ? " disabled" : ""}>${saved ? "已存在卦例" : "存成卦例"}</button>
      <button type="button" class="hbtn" id="c-copy" data-act="copy-chart">複製文字盤</button>
      <button type="button" class="hbtn" id="c-edit" data-act="go" data-page="input">改起卦</button>
    </div>
    ${S.snap && S.snap.q ? `<div class="q"><span class="k">占事</span>${esc(S.snap.q)}</div>` : ""}
    <div class="hbar-meta">
      ${d ? `<span><span class="k">時間</span>${fmtDate(d)}（${tzText(tz)}）</span>` : ""}
      <span><span class="k">四柱</span>${Y.gzName(mom.yearIdx)}年 ${Y.gzName(mom.monthIdx)}月 ${Y.gzName(mom.dayIdx)}日 ${Y.gzName(mom.hourIdx)}時</span>
      <span><span class="k">旬空</span>${mom.xunkong.map(b => ZHI[b]).join("")}</span>
      <span><span class="k">農曆</span>${mom.lunar ? esc(C.lunarText(mom.lunar).replace(/^\d+年/, "")) : "—"}</span>
      <span><span class="k">節氣</span>${esc(mom.prevJie.name)}後</span>
      <span><span class="k">起卦</span>${esc(methodText(S.snap, ch))}</span>
    </div>
  </div>`;
  let rows = "";
  for (let k = 5; k >= 0; k--) {
    const L = ch.lines[k];
    const sy = L.shi ? `<span class="sy shi" title="世爻">世</span>` : L.ying ? `<span class="sy ying" title="應爻">應</span>` : `<span class="sy none"></span>`;
    const mk = L.moving ? (L.yang ? "○" : "✕") : "";
    const cls = (S.focus === k ? " is-focus" : "") + (S.sel != null && relMarks().has(k) ? " is-mark" : "");
    rows += `<div class="pan-row${cls}" data-act="focus" data-pos="${k}" role="button" tabindex="0" aria-pressed="${S.focus === k}" aria-label="${Y.POS_SHORT[k]}，點一下聚焦相關關係">
      <div class="c-shen">${L.shen}</div>
      <div class="c-fu">${fuHTML(L.fu)}</div>
      <div class="c-ben"><span class="qin">${L.qin}</span>${gzHTML(L.g, L.b)}</div>
      <div class="c-yao">${yaoHTML(L.yang, L.moving)}<span class="mvk" title="${L.moving ? (L.yang ? "老陽，動" : "老陰，動") : ""}">${mk}</span>${sy}</div>
      <div class="c-bian">${L.moving ? `${yaoHTML(!L.yang, false)}<span class="qin">${L.change.qin}</span>${gzHTML(L.change.g, L.change.b)}` : ""}</div>
      <div class="c-tags">${lineTags(ch, k)}</div>
    </div>`;
  }
  const pan = `<div class="card pan-card">
    <div class="pan">
      <div class="pan-head"><span>六神</span><span class="h-fu">伏神</span><span class="h-ben">本卦 ${ben.name}</span><span>爻</span><span class="h-bian">${bian ? "變卦 " + bian.name : "變卦"}</span></div>
      ${rows}
    </div>
    <div class="pan-foot"><span>○ 老陽動　✕ 老陰動</span><span>六親以${ben.palaceName}宮${WX[ben.palaceWx]}為我</span><span>六神依日干${GAN[mom.dayStem]}起</span><span>點一爻可聚焦它的關係</span></div>
  </div>`;
  h += `<div class="chart-grid">${pan}${relCardHTML(ch)}</div>`;
  pg.innerHTML = h;
}
function relMarks() {
  const set = new Set();
  if (S.sel == null || !S.chart) return set;
  const r = S.chart.relations.find(x => x.id === S.sel);
  if (r) { if (r.pos != null) set.add(r.pos); if (r.apos != null) set.add(r.apos); }
  return set;
}
const GROUP_NAME = { hc: "合沖", sk: "生剋", kong: "旬空" };
function relHTML(r, top) {
  const dim = S.focus != null && !(r.pos === S.focus || r.apos === S.focus) ? " is-dim" : "";
  const sel = S.sel === r.id ? " is-sel" : "";
  return `<div class="rel${top ? " is-top" : ""}${dim}${sel}" data-act="rel" data-id="${r.id}" role="button" tabindex="0" aria-pressed="${S.sel === r.id}">
    <div class="rel-power" title="力量 ${r.score}"><div class="rel-bar"><i style="width:${r.score}%"></i></div>${S.prefs.score ? `<span class="rel-score">${r.score}</span>` : ""}</div>
    <div class="rel-title"><span class="verdict ${r.group}">${esc(r.verdict)}</span><span>${esc(r.title)}</span></div>
    <div class="rel-note">${esc(r.note)}</div>
  </div>`;
}
function relCardHTML(ch) {
  const R = ch.relations;
  const topN = Math.max(1, Math.min(8, S.prefs.top | 0));
  const top = R.slice(0, topN);
  const topIds = new Set(top.map(r => r.id));
  const all = g => R.filter(r => r.group === g);
  const sec = (g) => {
    const list = all(g), rest = list.filter(r => !topIds.has(r.id));
    if (!list.length) return "";
    const inTop = list.length - rest.length;
    return `<section class="rel-sec" id="rs-${g}"><h3>${GROUP_NAME[g]}<small>${list.length} 條${inTop ? `，其中 ${inTop} 條已排在最要緊，其餘依力量排序` : "，依力量排序"}</small></h3>${rest.length ? rest.map(r => relHTML(r, false)).join("") : `<p class="hint" style="padding:0 20px 6px">都已列在最要緊。</p>`}</section>`;
  };
  const jump = ["hc", "sk", "kong"].filter(g => all(g).length).map(g => `<button type="button" data-act="jump" data-sec="rs-${g}">${GROUP_NAME[g]}<b>${all(g).length}</b></button>`).join("");
  const focusBar = S.focus != null ? `<div class="focusbar"><span>聚焦：${Y.POS_SHORT[S.focus]}${ch.lines[S.focus].shi ? "（世）" : ch.lines[S.focus].ying ? "（應）" : ""}，其他關係變淡但都還在</span><button type="button" class="btn btn-sm" data-act="focus-clear">取消聚焦</button></div>` : "";
  return `<div class="card rel-card">
    <div class="card-head"><div class="card-title">關係清單<small>共 ${R.length} 條；先論合沖、再論生剋，每條都列</small></div></div>
    <div class="rel-jump" role="navigation" aria-label="跳到分類"><button type="button" data-act="jump" data-sec="rs-top">最要緊<b>${top.length}</b></button>${jump}</div>
    ${focusBar}
    <section class="rel-sec" id="rs-top"><h3>最要緊<small>力量最強的 ${top.length} 條</small></h3>${top.map(r => relHTML(r, true)).join("")}</section>
    ${sec("hc")}${sec("sk")}${sec("kong")}
    <details class="rule-note"><summary>力量怎麼算、規則出處</summary>
      <ul>
        <li>力量 0–100：施力者（日辰、月建最強，其次變爻對本位動爻，再次動爻、暗動爻，靜爻最弱）× 關係類型 × 施力爻的旺衰。旺衰以月令為主，日辰生扶、回頭生、化進加分，日剋、合絆、回頭剋、化退、化空、化破、化墓絕減分。</li>
        <li>同分時合沖排在生剋前。左邊色條是力量，數字可在「設定」關掉。</li>
        <li>暗動、日破、沖散、合起、合絆、月破、月合、旬空、生旺墓絕、變爻只生剋本位、靜爻旺相可生剋休囚、三合成局條件、反伏：依《增刪卜易》各章。</li>
        <li>進神退神：亥化子、寅化卯、巳化午、申化酉、丑化辰、辰化未、未化戌、戌化丑為進，反之為退（《增刪卜易·進神退神章》）。</li>
        <li>飛伏：伏剋飛神為出暴、飛來剋伏反傷身、伏去生飛名洩氣、飛來生伏得長生、飛伏比和為有助（《卜筮正宗》）。卦反吟：乾巽、坎離、艮坤、震兌互變；伏吟：乾震互變。</li>
        <li>長生取水土同宮：土長生申、旺子、墓辰、絕巳。</li>
      </ul>
    </details>
  </div>`;
}

/* 文字盤 */
function chartPlainText(ch) {
  const { ben, bian, mom } = ch, d = S.snap ? S.snap.date : null;
  const L = [];
  L.push(`六爻排盤｜${ben.full}${bian ? "之" + bian.full : "（靜卦）"}`);
  if (S.snap && S.snap.q) L.push(`占事：${S.snap.q}`);
  if (d) L.push(`時間：${fmtDate(d)}（${tzText(mom.tz)}）　農曆${mom.lunar ? C.lunarText(mom.lunar).replace(/^\d+年/, "") : "—"}`);
  L.push(`四柱：${Y.gzName(mom.yearIdx)}年 ${Y.gzName(mom.monthIdx)}月 ${Y.gzName(mom.dayIdx)}日 ${Y.gzName(mom.hourIdx)}時　旬空：${mom.xunkong.map(b => ZHI[b]).join("")}`);
  L.push(`起卦：${methodText(S.snap, ch)}`);
  L.push(`本卦：${ben.full}（${ben.palaceName}宮${ben.genName}${ben.pair ? "，" + ben.pair : ""}）${bian ? `　變卦：${bian.full}（${bian.palaceName}宮${bian.genName}${bian.pair ? "，" + bian.pair : ""}）` : ""}`);
  L.push("");
  for (let k = 5; k >= 0; k--) {
    const x = ch.lines[k];
    const sy = x.shi ? "世" : x.ying ? "應" : "　";
    const mk = x.moving ? (x.yang ? "○" : "✕") : "　";
    const fu = x.fu ? `伏${x.fu.qin}${GAN[x.fu.g]}${ZHI[x.fu.b]}${WX[x.fu.wx]}` : "";
    const tags = ch.summary[k].tags.map(t => t.t).concat(ch.summary[k].hua.map(t => t.t));
    L.push(`${x.shen}　${x.qin}${GAN[x.g]}${ZHI[x.b]}${WX[x.wx]} ${x.yang ? "⚊" : "⚋"}${mk}${sy}${x.moving ? `　→ ${x.change.qin}${GAN[x.change.g]}${ZHI[x.change.b]}${WX[x.change.wx]}` : ""}${fu ? "　" + fu : ""}${tags.length ? "　［" + tags.join("、") + "］" : ""}`);
  }
  L.push("");
  L.push("關係（依力量排序）：");
  ch.relations.forEach((r, i) => L.push(`${i + 1}. [${GROUP_NAME[r.group]}｜${r.score}] ${r.title}：${r.verdict}`));
  return L.join("\n");
}

/* =========================================================
   原文頁
   ========================================================= */
const ZY = idx => ZHOUYI[idx - 1];
function guaciHTML(h) {
  const t = ZY(h.kw);
  const startsWithName = t.g.startsWith(t.n) || (t.n === "坎" && t.g.startsWith("習坎"));
  return `<p class="tx">${startsWithName && t.n !== "坎" ? "" : `<span class="lab">${t.n}：</span>`}${txt(t.g)}</p>
    <p class="tx-xiang"><span class="lab">象曰：</span>${txt(t.d)}</p>`;
}
function yaoTextHTML(kw, k, withXiang) {
  const t = ZY(kw);
  return `<div class="tx-yao"><p class="tx"><span class="lab">${t.lab[k]}：</span>${txt(t.y[k])}</p>${withXiang ? `<p class="tx-xiang"><span class="lab">象曰：</span>${txt(t.x[k])}</p>` : ""}</div>`;
}
function renderText() {
  const pg = $("#page-text");
  const ch = S.chart;
  if (!ch) { pg.innerHTML = emptyHTML("還沒有排盤", "排盤之後，這裡會列出本卦、動爻、變卦的原文。"); return; }
  const { ben, bian } = ch;
  const all6 = ch.moving.length === 6 && (ben.kw === 1 || ben.kw === 2);
  let h = `<div class="texts">
    <div class="card card-pad" style="display:flex;gap:12px 20px;flex-wrap:wrap;align-items:center;justify-content:space-between">
      <div class="card-title">《周易》原文<small>卦辭、爻辭與象傳</small></div>
      <label class="switch"><input type="checkbox" id="t-full" data-act="toggle-full"${S.prefs.full ? " checked" : ""}> 同時列出本卦六爻全文</label>
    </div>
    <section class="card tx-sec"><h2>本卦　${ben.full}<small>${ben.palaceName}宮${ben.genName}・卦辭與大象</small></h2>${guaciHTML(ben)}</section>`;
  if (ch.moving.length) {
    h += `<section class="card tx-sec"><h2>動爻<small>爻辭與小象（${ch.moving.length} 爻動）</small></h2>
      ${ch.moving.map(k => yaoTextHTML(ben.kw, k, true)).join("")}
      ${all6 ? `<div class="tx-yao"><p class="tx"><span class="lab">${ben.kw === 1 ? "用九" : "用六"}：</span>${txt(ZY(ben.kw).yy)}</p><p class="tx-xiang"><span class="lab">象曰：</span>${txt(ZY(ben.kw).yx)}</p><p class="tx-note">六爻皆動，${ben.kw === 1 ? "乾" : "坤"}卦另有${ben.kw === 1 ? "用九" : "用六"}。</p></div>` : ""}
    </section>
    <section class="card tx-sec"><h2>變卦　${bian.full}<small>${bian.palaceName}宮${bian.genName}・卦辭與大象</small></h2>${guaciHTML(bian)}</section>
    <section class="card tx-sec"><h2>變卦對應爻辭<small>變卦中與動爻同位之爻</small></h2>${ch.moving.map(k => yaoTextHTML(bian.kw, k, true)).join("")}</section>`;
  } else {
    h += `<section class="card tx-sec"><h2>動爻</h2><p class="tx-note">靜卦，六爻皆不動，沒有爻辭可看；以本卦卦辭與大象為主。</p></section>`;
  }
  if (S.prefs.full) h += `<section class="card tx-sec"><h2>本卦六爻全文<small>${ben.full}</small></h2>${[0, 1, 2, 3, 4, 5].map(k => yaoTextHTML(ben.kw, k, true)).join("")}${(ben.kw === 1 || ben.kw === 2) ? `<div class="tx-yao"><p class="tx"><span class="lab">${ben.kw === 1 ? "用九" : "用六"}：</span>${txt(ZY(ben.kw).yy)}</p><p class="tx-xiang"><span class="lab">象曰：</span>${txt(ZY(ben.kw).yx)}</p></div>` : ""}</section>`;
  h += `<p class="hint">原文以《周易正義》系通行本為準，三個版本逐字比對後校正；校勘清單見倉庫 data/zhouyi_patches.json。</p></div>`;
  pg.innerHTML = h;
}

/* =========================================================
   卦例頁
   ========================================================= */
function caseFromCurrent() {
  const ch = S.chart, sn = S.snap;
  const id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  return Object.assign({ id, title: sn.q || `${ch.ben.full}${ch.bian ? "之" + ch.bian.full : ""}`, createdAt: Date.now(),
    gua: `${ch.ben.full}${ch.bian ? " → " + ch.bian.full : ""}`, gz: ch.mom.pillars.map(Y.gzName).join(" ") }, JSON.parse(JSON.stringify(sn)));
}
async function saveCurrentCase() {
  if (!S.chart || !S.snap) { toast("先排一卦再存"); return; }
  if (S.curCaseId && Cases.get(S.curCaseId)) { toast("這一卦已經在卦例裡"); return; }
  const c = caseFromCurrent();
  S.curCaseId = c.id;
  await Cases.put(c);
  toast("已存成卦例");
  if (S.page === "chart") renderChart();
}
function openCase(id) {
  const c = Cases.get(id);
  if (!c) return;
  try {
    S.snap = { method: c.method, nums: c.nums, manual: c.manual, lines: c.lines, date: c.date, tzMode: c.tzMode, tz: c.tz, zishi: c.zishi, q: c.q || "" };
    S.chart = chartFromSnap(S.snap);
    S.curCaseId = id; S.focus = null; S.sel = null;
    LS.set("liuyao.last.v1", S.snap);
    loadSnapToForm(S.snap);
    go("chart");
  } catch (e) { toast("這筆卦例的資料不完整，打不開"); }
}
function renderCases() {
  const pg = $("#page-cases");
  const where = Cases.status === "cloud" ? "存在你的帳戶，換裝置也看得到" : "存在這個瀏覽器";
  let h = `<div class="card">
    <div class="listhead"><div class="card-title">卦例<small>${Cases.list.length} 筆，${where}</small></div>
      <div class="acts">
        <button type="button" class="btn btn-sm btn-gold" id="cs-save" data-act="save-case"${S.chart && !(S.curCaseId && Cases.get(S.curCaseId)) ? "" : " disabled"}>存目前這一卦</button>
        <button type="button" class="btn btn-sm" id="cs-export" data-act="export"${Cases.list.length ? "" : " disabled"}>匯出</button>
        <button type="button" class="btn btn-sm" id="cs-import" data-act="import">匯入</button>
      </div></div>`;
  if (!Cases.list.length) {
    h += `<div class="empty"><p>還沒有卦例。排盤後按「存成卦例」，或在這裡按「存目前這一卦」。匯入可讀回之前匯出的 JSON 檔。</p></div></div>`;
    pg.innerHTML = h; return;
  }
  h += `<div class="caselist">`;
  for (const c of Cases.list) {
    const editing = S.ui.editing === c.id, confirming = S.ui.confirming === c.id;
    const d = c.date;
    h += `<div class="case${S.curCaseId === c.id ? " is-cur" : ""}">
      <div><div class="case-name">${esc(c.title)}</div><div class="case-gua">${esc(c.gua || "")}</div>
        <div class="case-meta">${d ? fmtDate(d) : ""}　${esc(c.gz || "")}${c.q && c.q !== c.title ? "　占事：" + esc(c.q) : ""}</div></div>
      <div class="case-acts">
        <button type="button" class="btn btn-sm btn-gold" data-act="case-open" data-id="${c.id}">打開</button>
        <button type="button" class="btn btn-sm" data-act="case-edit" data-id="${c.id}">改名</button>
        <button type="button" class="btn btn-sm btn-danger" data-act="case-del" data-id="${c.id}">刪除</button>
      </div>
      ${editing ? `<div class="case-edit"><label class="sr-only" for="ce-${c.id}">新名稱</label><input class="field" id="ce-${c.id}" value="${esc(c.title)}" maxlength="80"><button type="button" class="btn btn-sm btn-gold" data-act="case-rename" data-id="${c.id}">儲存</button><button type="button" class="btn btn-sm" data-act="case-cancel">取消</button></div>` : ""}
      ${confirming ? `<div class="case-confirm"><span>確定刪除「${esc(c.title)}」？刪了無法復原。</span><button type="button" class="btn btn-sm btn-danger solid" data-act="case-del-yes" data-id="${c.id}">刪除</button><button type="button" class="btn btn-sm" data-act="case-cancel">取消</button></div>` : ""}
    </div>`;
  }
  h += `</div></div>`;
  pg.innerHTML = h;
  if (S.ui.editing) { const f = $("#ce-" + S.ui.editing); if (f) { f.focus(); f.select(); } }
}
async function exportCases() {
  const data = JSON.stringify({ app: "liuyao-paipan", version: 1, exportedAt: new Date().toISOString(), cases: Cases.list }, null, 1);
  const name = `liuyao-cases-${new Date().toISOString().slice(0, 10)}.json`;   // 檔名用英數，避免部分瀏覽器把中文檔名換成 download
  const cl = window.claude;
  if (cl && typeof cl.use === "function") {
    try {
      const dl = await cl.use("downloads");
      if (dl) { await dl.save({ filename: name, data }); toast("已交給下載"); return; }
    } catch (e) { if (e && e.code === "declined") return; }
  }
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast("已下載 " + name);
  } catch (e) { copyText(data, "已複製 JSON"); }
}
async function importCases(file) {
  try {
    const obj = JSON.parse(await file.text());
    const arr = Array.isArray(obj) ? obj : obj.cases;
    if (!Array.isArray(arr)) throw new Error("bad");
    let n = 0;
    for (const c of arr) {
      if (!c || !c.id || !Array.isArray(c.lines) || c.lines.length !== 6 || !c.date) continue;
      if (Cases.get(c.id)) continue;
      await Cases.put(c); n++;
    }
    toast(n ? `匯入 ${n} 筆卦例` : "沒有新的卦例可匯入");
  } catch (e) { toast("這個檔案讀不出卦例，請選之前匯出的 JSON"); }
}

/* =========================================================
   設定頁
   ========================================================= */
function renderSettings() {
  const pg = $("#page-settings");
  const sw = (t, label) => {
    const wx = themeIsDark(t) ? WX_DARK : WX_LIGHT;
    return `<button type="button" class="tc" data-act="theme" data-id="${t.id}" aria-pressed="${S.theme.id === t.id}">
      <span class="tc-prev" style="background:${t.bg}"><span class="b" style="background:${t.bar}"></span><span class="c" style="background:${t.card};color:${t.ink}"><i style="background:${t.accent}"></i><i style="background:${wx.mu}"></i><i style="background:${wx.huo}"></i></span></span>${esc(label || t.name)}</button>`;
  };
  pg.innerHTML = `<div class="card">
    <section class="set-sec"><h3>主題</h3>
      <div class="themes">
        <button type="button" class="tc" data-act="theme" data-id="auto" aria-pressed="${S.theme.id === "auto"}"><span class="tc-prev"><span class="b" style="background:linear-gradient(90deg,#1F2430 50%,#0B0C0E 50%)"></span><span class="c" style="background:linear-gradient(90deg,#FFFFFF 50%,#1A1C20 50%);color:#888">淺／深</span></span>跟隨系統</button>
        ${THEMES.map(t => sw(t)).join("")}
      </div>
    </section>
    <section class="set-sec"><h3>原文</h3>
      <label class="switch"><input type="checkbox" id="s-avoid" data-act="pref" data-k="avoid"${S.prefs.avoid ? " checked" : ""}> 原文避字：那個字以「□」代替（共兩處：晉卦辭、蒙卦九二小象）</label>
      <p class="hint">關掉就顯示原字。這個設定只影響畫面與複製出去的文字，程式碼裡不含那個字。</p>
    </section>
    <section class="set-sec"><h3>關係清單</h3>
      <label class="switch"><input type="checkbox" id="s-score" data-act="pref" data-k="score"${S.prefs.score ? " checked" : ""}> 顯示力量分數</label>
      <div class="range"><label for="s-top">「最要緊」列幾條</label><input type="range" id="s-top" min="3" max="8" step="1" value="${S.prefs.top}" data-act="pref-top"><output id="s-top-out" for="s-top">${S.prefs.top}</output></div>
      <p class="hint">「最要緊」只是把力量最強的幾條放在最上面；下方合沖、生剋、旬空三段仍然每條都列。</p>
    </section>
    <section class="set-sec"><h3>關於</h3>
      <p class="hint">節氣用 VSOP87 截斷級數、農曆用 Meeus 真朔與中氣置閏，曆算與同倉庫的八字排盤相同，並和 lunar-javascript 對過 1901–2099 年。排盤規則以《增刪卜易》為主，進退神、飛伏生剋、卦反吟伏吟參《卜筮正宗》。可用年份 ${Y_MIN}–${Y_MAX}。</p>
    </section>
  </div>`;
}

/* =========================================================
   導覽與事件
   ========================================================= */
function go(page) {
  S.page = page;
  $$(".nav-item").forEach(b => b.setAttribute("aria-current", b.dataset.page === page ? "page" : "false"));
  ["input", "chart", "text", "cases", "settings"].forEach(p => { $("#page-" + p).hidden = p !== page; });
  if (page === "input") renderInputPreview();
  else if (page === "chart") renderChart();
  else if (page === "text") renderText();
  else if (page === "cases") renderCases();
  else if (page === "settings") renderSettings();
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (act === "go") { go(el.dataset.page); return; }
  if (act === "method") { S.method = el.dataset.method; saveDraft(); renderInputPreview(); return; }
  if (act === "pick") {
    const k = +el.dataset.pos, v = +el.dataset.v;
    S.manual[k] = S.manual[k] === v ? null : v; saveDraft(); renderPicker(); renderInputPreview();
    const again = $(`[data-act="pick"][data-pos="${k}"][data-v="${v}"]`); if (again) again.focus();
    return;
  }
  if (act === "clear-lines") { S.manual = [null, null, null, null, null, null]; saveDraft(); renderPicker(); renderInputPreview(); return; }
  if (act === "now") { setDate(nowDate()); renderInputPreview(); return; }
  if (act === "focus") { const k = +el.dataset.pos; S.focus = S.focus === k ? null : k; renderChart(); return; }
  if (act === "focus-clear") { S.focus = null; renderChart(); return; }
  if (act === "jump") { const t = document.getElementById(el.dataset.sec); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (act === "rel") { const id = +el.dataset.id; S.sel = S.sel === id ? null : id; renderChart(); return; }
  if (act === "save-case") { saveCurrentCase(); return; }
  if (act === "copy-chart") { if (S.chart) copyText(plain(chartPlainText(S.chart)), "已複製文字盤"); return; }
  if (act === "modal-close") { closeModal(); return; }
  if (act === "case-open") { openCase(el.dataset.id); return; }
  if (act === "case-edit") { S.ui.editing = el.dataset.id; S.ui.confirming = null; renderCases(); return; }
  if (act === "case-cancel") { S.ui.editing = null; S.ui.confirming = null; renderCases(); return; }
  if (act === "case-rename") {
    const c = Cases.get(el.dataset.id), f = $("#ce-" + el.dataset.id);
    const name = f ? f.value.trim() : "";
    if (!name) { toast("名稱不能空白"); return; }
    if (c) { S.ui.editing = null; Cases.put(Object.assign({}, c, { title: name })); toast("已改名"); }
    return;
  }
  if (act === "case-del") { S.ui.confirming = el.dataset.id; S.ui.editing = null; renderCases(); return; }
  if (act === "case-del-yes") {
    const id = el.dataset.id; S.ui.confirming = null;
    if (S.curCaseId === id) S.curCaseId = null;
    Cases.remove(id); toast("已刪除"); return;
  }
  if (act === "export") { exportCases(); return; }
  if (act === "import") { $("#f-import").click(); return; }
  if (act === "theme") { S.theme.id = el.dataset.id; applyTheme(); renderSettings(); return; }
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !$("#modal").hidden) { closeModal(); return; }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
  if (e.key === "Enter" && e.target.matches && e.target.matches(".case-edit .field")) { const b = e.target.parentElement.querySelector('[data-act="case-rename"]'); if (b) b.click(); }
});
$("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset && el.dataset.act === "pref") { S.prefs[el.dataset.k] = el.checked; savePrefs(); if (S.page === "settings") renderSettings(); return; }
  if (el.dataset && el.dataset.act === "toggle-full") { S.prefs.full = el.checked; savePrefs(); renderText(); return; }
  if (el.id === "f-import") { const f = el.files && el.files[0]; if (f) importCases(f); el.value = ""; return; }
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset && el.dataset.act === "pref-top") { S.prefs.top = +el.value; $("#s-top-out").textContent = el.value; savePrefs(); return; }
});
["f-n1", "f-n2", "f-n3"].forEach((id, i) => {
  $("#" + id).addEventListener("input", e => {
    const v = e.target.value.replace(/[^\d]/g, "");
    if (v !== e.target.value) e.target.value = v;
    S.nums[i] = v; saveDraft(); renderInputPreview();
  });
});
$("#f-q").addEventListener("input", e => { S.q = e.target.value; saveDraft(); });
$("#f-y").addEventListener("change", () => { fillDays(+$("#f-d").value); renderInputPreview(); });
$("#f-m").addEventListener("change", () => { fillDays(+$("#f-d").value); renderInputPreview(); });
["f-d", "f-hh", "f-mi"].forEach(id => $("#" + id).addEventListener("change", renderInputPreview));
$("#f-tz").addEventListener("change", e => { S.tzMode = e.target.value === "auto" ? "auto" : +e.target.value; saveDraft(); renderInputPreview(); });
$("#f-zs").addEventListener("change", e => { S.zishi = e.target.checked; saveDraft(); renderInputPreview(); });
$("#f-form").addEventListener("submit", e => { e.preventDefault(); castNow(); });

/* ---------- 開始 ---------- */
buildDateOptions();
setDate(nowDate());
$("#f-tz").value = String(S.tzMode);
if (!$("#f-tz").value) { S.tzMode = "auto"; $("#f-tz").value = "auto"; }
$("#f-zs").checked = S.zishi;
$("#f-n1").value = S.nums[0]; $("#f-n2").value = S.nums[1]; $("#f-n3").value = S.nums[2]; $("#f-q").value = S.q;
renderPicker();
const last = LS.get("liuyao.last.v1", null);
if (last && Array.isArray(last.lines) && last.date) { try { S.snap = last; S.chart = chartFromSnap(last); } catch (e) { S.snap = null; S.chart = null; } }
applyTheme();
const startPage = (location.hash || "").replace("#", "");
go(["input", "chart", "text", "cases", "settings"].includes(startPage) ? startPage : "input");
Cases.initCloud();
window.__liuyao = { S, Cases, go, castNow };   // 給自動測試用
})();
