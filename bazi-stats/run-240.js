// 1804–2043 四輪甲子：為圖表頁產生其他資料表：四輪對比、各月拆分、240 年重現次數、稀有組合分布、流通對比
const fs = require('fs');
const path = require('path');
const { B, v3 } = require('./model.js');
const sheng = (a, b) => (a + 1) % 5 === b || (b + 1) % 5 === a;
const chain = s => { const on = s.map(x => x >= 0.08); if (on.every(Boolean)) return 5; let b = 0; for (let i = 0; i < 5; i++) { let k = 0; while (k < 5 && on[(i + k) % 5]) k++; b = Math.max(b, k); } return b; };
const posFlow = p => { const g = p.map(x => B.ganWx(x % 10)), z = p.map(x => B.ganWx(B.CANG[x % 12][0])); let n = 0; for (let i = 0; i < 3; i++) { if (sheng(g[i], g[i + 1])) n++; if (sheng(z[i], z[i + 1])) n++; } for (let i = 0; i < 4; i++) if (sheng(g[i], z[i])) n++; return n; };

const seen = new Map(), cyc = {}, months = {};
for (let Y = 1804; Y <= 2043; Y++) {
  const yi = B.yearGZ(Y), ci = Math.floor((Y - 1804) / 60), gz = B.gzName(yi);
  let n = 0, e = 0;
  for (let t = Date.UTC(Y, 0, 25); t <= Date.UTC(Y + 1, 1, 10); t += 864e5) {
    const d = new Date(t);
    for (let hh = 0; hh < 24; hh += 2) {
      const c = B.buildChart({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh, sex: 'm' });
      if (c.pillars[0] !== yi) continue;
      const p = c.pillars, k = ((p[0] * 60 + p[1]) * 60 + p[2]) * 60 + p[3];
      let r = seen.get(k);
      if (!r) { const s = v3(p); r = { n: 0, p, ext: Math.max(...s) >= 0.5, chain: chain(s), pos: posFlow(p), mb: p[1] % 12 }; seen.set(k, r); }
      r.n++; n++; if (r.ext) e++;
      if (ci === 3) { const mk = gz + '|' + B.gzName(p[1]); const m = months[mk] = months[mk] || { gz, monthGz: B.gzName(p[1]), month: B.ZHI[p[1] % 12], order: (p[1] % 12 + 10) % 12, n: 0, e: 0 }; m.n++; if (r.ext) m.e++; }
    }
  }
  (cyc[gz] = cyc[gz] || { gz, order: yi + 1 })['c' + (ci + 1)] = +(e / n).toFixed(4);
}
const all = [...seen.values()], rare = all.filter(r => r.n === 1);
fs.writeFileSync(path.join(__dirname, 'data', 'cycles.json'), JSON.stringify(Object.values(cyc).sort((a, b) => a.order - b.order)));
fs.writeFileSync(path.join(__dirname, 'data', 'months.json'), JSON.stringify(Object.values(months).map(m => ({ gz: m.gz, monthGz: m.monthGz, month: m.month, order: m.order + 1, ext: +(m.e / m.n).toFixed(4), charts: m.n }))));
const hist = [1, 2, 3].map(t => ({ times: t, combos: all.filter(r => r.n === t).length }));
fs.writeFileSync(path.join(__dirname, 'data', 'recurrence.json'), JSON.stringify(hist));
const byM = B.ZHI.map((z, i) => ({ month: z, order: (i + 10) % 12 + 1, rare: rare.filter(r => r.mb === i).length, all: all.filter(r => r.mb === i).length })).sort((a, b) => a.order - b.order);
fs.writeFileSync(path.join(__dirname, 'data', 'rare-months.json'), JSON.stringify(byM));
const byS = B.GAN.map((g, i) => ({ stem: g, rare: rare.filter(r => r.p[2] % 10 === i).length }));
fs.writeFileSync(path.join(__dirname, 'data', 'rare-stems.json'), JSON.stringify(byS));
const share = (arr, f) => +(arr.filter(f).length / arr.length).toFixed(4);
const flow = [
  ['五行周流', r => r.chain === 5], ['連四行', r => r.chain === 4], ['連三行', r => r.chain === 3], ['只有兩行相生', r => r.chain === 2], ['一組相生都沒有', r => r.chain < 2],
  ['位置相生 6 組以上', r => r.pos >= 6], ['位置相生 3 到 5 組', r => r.pos >= 3 && r.pos <= 5], ['位置相生 1 到 2 組', r => r.pos >= 1 && r.pos <= 2], ['位置相生 0 組', r => r.pos === 0], ['極端盤', r => r.ext]
].map(([label, f], i) => ({ metric: label, order: i + 1, rare: share(rare, f), all: share(all, f) }));
fs.writeFileSync(path.join(__dirname, 'data', 'flow.json'), JSON.stringify(flow));
console.log('done', all.length, rare.length, Object.keys(months).length);
