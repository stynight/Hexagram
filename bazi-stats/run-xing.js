// 1804–2043 四輪甲子：v3（不算刑）和 v4（加刑）的極端盤比例對比 → data/xing.json、data/xing-months.json
const fs = require('fs'), path = require('path');
const { B, v3 } = require('./model.js');
const { v4 } = require('./model-xing.js');

const pil = {}, months = {};
for (let Y = 1804; Y <= 2043; Y++) {
  const yi = B.yearGZ(Y), gz = B.gzName(yi), ci = Math.floor((Y - 1804) / 60);
  const r = pil[gz] = pil[gz] || { gz, order: yi + 1, n: [0, 0, 0, 0], e3: [0, 0, 0, 0], e4: [0, 0, 0, 0] };
  for (let t = Date.UTC(Y, 0, 25); t <= Date.UTC(Y + 1, 1, 10); t += 864e5) {
    const d = new Date(t);
    for (let hh = 0; hh < 24; hh += 2) {
      const c = B.buildChart({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh, sex: 'm' });
      if (c.pillars[0] !== yi) continue;
      const a = Math.max(...v3(c.pillars)) >= 0.5, b = Math.max(...v4(c.pillars, c.siling)) >= 0.5;
      r.n[ci]++; if (a) r.e3[ci]++; if (b) r.e4[ci]++;
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
  const o = { gz: r.gz, order: r.order, v3: f(S(r.e3) / S(r.n)), v4: f(S(r.e4) / S(r.n)) };
  for (let k = 0; k < 4; k++) o['c' + (k + 1)] = f(r.e4[k] / r.n[k]);
  return o;
});
fs.writeFileSync(path.join(__dirname, 'data', 'xing.json'), JSON.stringify(rows));
fs.writeFileSync(path.join(__dirname, 'data', 'xing-months.json'), JSON.stringify(Object.values(months).map(m => ({
  gz: m.gz, monthGz: m.monthGz, order: m.order, v3: f(m.e3 / m.n), v4: f(m.e4 / m.n), charts: m.n }))));
console.log('寫好 data/xing.json、data/xing-months.json，', rows.length, '個年柱');
