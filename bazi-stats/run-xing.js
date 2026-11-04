// 1804–2043 四輪甲子：v3（不算刑）和 v4（加刑）的極端盤比例對比 → data/xing.json、data/xing-months.json
// xing.json 另附 v4 的缺一行、平均熵、五行比例、極端盤偏向（四輪合計），給結果頁的詳細面板用。
const fs = require('fs'), path = require('path');
const { B, v3, purity, ent } = require('./model.js');
const { v4 } = require('./model-xing.js');
const WX = ['木', '火', '土', '金', '水'], K = ['wood', 'fire', 'earth', 'metal', 'water'];
const YIQI = new Set(['甲寅', '乙卯', '丙午', '丁巳', '戊辰', '戊戌', '己丑', '己未', '庚申', '辛酉', '壬子', '癸亥']);

const pil = {}, months = {};
for (let Y = 1804; Y <= 2043; Y++) {
  const yi = B.yearGZ(Y), gz = B.gzName(yi), ci = Math.floor((Y - 1804) / 60);
  const r = pil[gz] = pil[gz] || { gz, yi, order: yi + 1, n: [0, 0, 0, 0], e3: [0, 0, 0, 0], e4: [0, 0, 0, 0],
    miss: 0, ent: 0, avg: [0, 0, 0, 0, 0], ext: [0, 0, 0, 0, 0], mis: [0, 0, 0, 0, 0] };
  for (let t = Date.UTC(Y, 0, 25); t <= Date.UTC(Y + 1, 1, 10); t += 864e5) {
    const d = new Date(t);
    for (let hh = 0; hh < 24; hh += 2) {
      const c = B.buildChart({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh, sex: 'm' });
      if (c.pillars[0] !== yi) continue;
      const s4 = v4(c.pillars, c.siling), mx = Math.max(...s4);
      const a = Math.max(...v3(c.pillars)) >= 0.5, b = mx >= 0.5;
      r.n[ci]++; if (a) r.e3[ci]++; if (b) { r.e4[ci]++; r.ext[s4.indexOf(mx)]++; }
      r.ent += ent(s4);
      let missed = false; s4.forEach((x, e) => { r.avg[e] += x; if (x < 0.02) { r.mis[e]++; missed = true; } }); if (missed) r.miss++;
      if (ci === 3) {
        const mk = gz + '|' + B.gzName(c.pillars[1]);
        const m = months[mk] = months[mk] || { gz, monthGz: B.gzName(c.pillars[1]), order: (c.pillars[1] % 12 + 10) % 12 + 1, n: 0, e3: 0, e4: 0 };
        m.n++; if (a) m.e3++; if (b) m.e4++;
      }
    }
  }
}
const f = x => +x.toFixed(4), S = v => v.reduce((a, b) => a + b, 0);
const rows = Object.values(pil).sort((a, b) => a.order - b.order).map(r => {
  const n = S(r.n);
  const o = { gz: r.gz, order: r.order, v3: f(S(r.e3) / n), v4: f(S(r.e4) / n) };
  for (let k = 0; k < 4; k++) o['c' + (k + 1)] = f(r.e4[k] / r.n[k]);
  Object.assign(o, { xun: B.gzName(r.yi - r.yi % 10) + '旬', yiqi: YIQI.has(r.gz), charts: n, purity: f(purity(r.yi)),
    miss: f(r.miss / n), ent: f(r.ent / n),
    lean: S(r.ext) ? WX[r.ext.indexOf(Math.max(...r.ext))] : '—', missTop: WX[r.mis.indexOf(Math.max(...r.mis))] });
  K.forEach((k, j) => { o['avg_' + k] = f(r.avg[j] / n); o['ext_' + k] = f(r.ext[j] / n); o['miss_' + k] = f(r.mis[j] / n); });
  return o;
});
fs.writeFileSync(path.join(__dirname, 'data', 'xing.json'), JSON.stringify(rows));
fs.writeFileSync(path.join(__dirname, 'data', 'xing-months.json'), JSON.stringify(Object.values(months).map(m => ({
  gz: m.gz, monthGz: m.monthGz, order: m.order, v3: f(m.e3 / m.n), v4: f(m.e4 / m.n), charts: m.n }))));
console.log('寫好 data/xing.json、data/xing-months.json，', rows.length, '個年柱');
