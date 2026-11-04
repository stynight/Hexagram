// 把 data/xing.json、data/xing-months.json 內嵌進 xing.template.html，寫出 xing.html（單一 HTML，打開就能看）
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const html = read('xing.template.html')
  .replace('__PILLARS__', () => read('data/xing.json').trim())
  .replace('__MONTHS__', () => read('data/xing-months.json').trim());
fs.writeFileSync(path.join(__dirname, 'xing.html'), html);
console.log('寫好 xing.html');
