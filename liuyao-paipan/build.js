/* 組裝單一 HTML：dist/artifact.html（給 Artifact 發布，無外殼）與 dist/liuyao.html（可獨立打開的完整檔），
   並把獨立檔複製一份到資料夾根目錄的 liuyao.html。 */
const fs = require("fs");
const path = require("path");
const rd = f => fs.readFileSync(path.join(__dirname, "src", f), "utf8");
const AVOID = String.fromCharCode(0x63A5);           // 使用者避用的字（U+63A5）
const MARK = "〓";                                // 資料裡以〓佔位，畫面依設定顯示□或原字

/* 《周易》原文 → 精簡陣列 */
const zy = JSON.parse(fs.readFileSync(path.join(__dirname, "data", "zhouyi.json"), "utf8"));
if (zy.length !== 64) throw new Error("zhouyi.json 應有 64 卦");
const slim = zy.map(r => {
  const o = { n: r.n, g: r.g, lab: r.lab, y: r.y, d: r.d, x: r.x };
  if (r.yy) { o.yy = r.yy; o.yx = r.yx; }
  return o;
});
let dataJs = "const ZHOUYI = " + JSON.stringify(slim) + ";";
dataJs = dataJs.split(AVOID).join(MARK);

const css = rd("style.css"), cal = rd("calendar.js"), engine = rd("engine.js"), app = rd("app.js");
const strip = s => s.replace(/\nif \(typeof module !== "undefined"\) module\.exports = \w+;\s*$/, "\n");
let shell = rd("shell.html");
shell = shell.replace("/*__CSS__*/", () => css)
  .replace("/*__CAL__*/", () => strip(cal))
  .replace("/*__ENGINE__*/", () => strip(engine))
  .replace("/*__DATA__*/", () => dataJs)
  .replace("/*__APP__*/", () => app);
fs.mkdirSync(path.join(__dirname, "dist"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "dist", "artifact.html"), shell);
const cut = shell.indexOf('<div class="app">');
const head = shell.slice(0, cut), body = shell.slice(cut);
const full = `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);color-scheme:light}body{margin:0}img{max-width:100%}</style>
${head}</head>
<body>
${body}</body>
</html>
`;
fs.writeFileSync(path.join(__dirname, "dist", "liuyao.html"), full);
fs.writeFileSync(path.join(__dirname, "liuyao.html"), full);
const kb = n => (n / 1024).toFixed(1) + " KB";
console.log("artifact.html", kb(Buffer.byteLength(shell)), "| liuyao.html", kb(Buffer.byteLength(full)));
/* 禁用字檢查：原始碼與輸出都不能出現 U+63A5 */
let bad = 0;
for (const [name, s] of [["artifact.html", shell], ["liuyao.html", full], ["README.md", fs.existsSync(path.join(__dirname, "README.md")) ? fs.readFileSync(path.join(__dirname, "README.md"), "utf8") : ""]]) {
  const n = s.split(AVOID).length - 1;
  if (n) { console.error(`${name} 有 ${n} 個禁用字（U+63A5），請改寫。`); bad += n; }
}
if (bad) process.exitCode = 1;
