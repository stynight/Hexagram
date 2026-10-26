// 1984–2043 一輪甲子：每個年柱的熵、極端盤、缺一行、五行偏向 → data/sixty-pillars.json
const fs = require('fs'), path = require('path');
const { B, v2, v3, purity, ent, eachChart } = require('./model.js');
const WX = ['木', '火', '土', '金', '水'], K = ['wood', 'fire', 'earth', 'metal', 'water'];
const YIQI = new Set(['甲寅', '乙卯', '丙午', '丁巳', '戊辰', '戊戌', '己丑', '己未', '庚申', '辛酉', '壬子', '癸亥']);
const rows = [];
for (let Y = 1984; Y <= 2043; Y++) {
  const yi = B.yearGZ(Y), gz = B.gzName(yi);
  const a = { n: 0, e2: 0, x2: 0, e3: 0, x3: 0, miss: 0, ext: [0, 0, 0, 0, 0], mis: [0, 0, 0, 0, 0], avg: [0, 0, 0, 0, 0] };
  eachChart(Y, c => {
    const s2 = v2(c.pillars), s3 = v3(c.pillars); a.n++;
    a.e2 += ent(s2); if (Math.max(...s2) >= 0.5) a.x2++;
    a.e3 += ent(s3); const mx = Math.max(...s3); if (mx >= 0.5) { a.x3++; a.ext[s3.indexOf(mx)]++; }
    let missed = false; s3.forEach((x, e) => { a.avg[e] += x; if (x < 0.02) { a.mis[e]++; missed = true; } }); if (missed) a.miss++;
  });
  const o = { gz, order: yi + 1, xun: B.gzName(yi - yi % 10) + '旬', stem: gz[0], branch: gz[1], yiqi: YIQI.has(gz), sampleYear: Y, charts: a.n,
    purity: +purity(yi).toFixed(4), ent: +(a.e3 / a.n).toFixed(4), ext: +(a.x3 / a.n).toFixed(4), miss: +(a.miss / a.n).toFixed(4),
    entV2: +(a.e2 / a.n).toFixed(4), extV2: +(a.x2 / a.n).toFixed(4),
    lean: a.x3 ? WX[a.ext.indexOf(Math.max(...a.ext))] : '—', missTop: WX[a.mis.indexOf(Math.max(...a.mis))] };
  K.forEach((k, j) => { o['avg_' + k] = +(a.avg[j] / a.n).toFixed(4); o['ext_' + k] = +(a.ext[j] / a.n).toFixed(4); o['miss_' + k] = +(a.mis[j] / a.n).toFixed(4); });
  rows.push(o);
}
rows.sort((x, y) => x.order - y.order);
fs.writeFileSync(path.join(__dirname, 'data', 'sixty-pillars.json'), JSON.stringify(rows));
console.log('寫好 data/sixty-pillars.json，', rows.length, '個年柱');
