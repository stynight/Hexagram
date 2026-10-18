/* 組裝單一 HTML：dist/artifact.html（給 Artifact 發布，無外殼）與 dist/bazi.html（可獨立打開的完整檔） */
const fs = require("fs");
const path = require("path");
const rd = f => fs.readFileSync(path.join(__dirname, "src", f), "utf8");
const css = rd("style.css"), engine = rd("engine.js"), app = rd("app.js");
let shell = rd("shell.html");
shell = shell.replace("/*__CSS__*/", () => css).replace("/*__ENGINE__*/", () => engine).replace("/*__APP__*/", () => app);
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
fs.writeFileSync(path.join(__dirname, "dist", "bazi.html"), full);
const kb = n => (n / 1024).toFixed(1) + " KB";
console.log("artifact.html", kb(Buffer.byteLength(shell)), "| bazi.html", kb(Buffer.byteLength(full)));
// 禁用字檢查（U+63A5）
const bad = (shell.match(/\u63A5/g) || []).length;
if (bad) { console.error(`發現 ${bad} 個禁用字（U+63A5），請改寫。`); process.exitCode = 1; }
