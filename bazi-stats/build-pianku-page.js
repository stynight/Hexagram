// 把 data/ 的七份資料和 d3 內嵌進 pianku.template.html，寫出 pianku.html（單一 HTML，打開就能看）
// d3 用 7.9.0 的 dist/d3.min.js：npm pack d3@7.9.0，解開後把路徑傳進來，例如
//   node build-pianku-page.js /path/to/package/dist/d3.min.js
// 不傳路徑時，沿用 pianku.html 裡已經內嵌的那一份。
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
let d3src;
if (process.argv[2]) d3src = fs.readFileSync(process.argv[2], 'utf8');
else {
  const old = read('pianku.html'), a = old.indexOf('<script>// https://d3js.org'), b = old.indexOf('</script>', a);
  if (a < 0) throw new Error('pianku.html 裡找不到內嵌的 d3，請傳入 d3.min.js 的路徑');
  d3src = old.slice(a + '<script>'.length, b);
}
const data = { PILLARS: 'sixty-pillars', MONTHS: 'months', CYCLES: 'cycles', RECURRENCE: 'recurrence', RAREMONTHS: 'rare-months', RARESTEMS: 'rare-stems', FLOW: 'flow' };
let html = read('pianku.template.html').replace('__D3__', () => d3src.trim());
for (const [k, f] of Object.entries(data)) html = html.replace('__' + k + '__', () => read('data/' + f + '.json').trim());
fs.writeFileSync(path.join(__dirname, 'pianku.html'), html);
console.log('寫好 pianku.html');
