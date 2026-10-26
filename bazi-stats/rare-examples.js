// 1804–2043：只出現一次的四柱組合落在哪裡（離節氣多遠、哪個月、哪個時辰），並挑幾個例子
const { B, v3, eachChart } = require('./model.js');
const seen = new Map();
for (let Y = 1804; Y <= 2043; Y++) eachChart(Y, (c, d, hh) => {
  const p = c.pillars, k = ((p[0] * 60 + p[1]) * 60 + p[2]) * 60 + p[3];
  const rec = seen.get(k);
  if (rec) { rec.n++; return; }
  seen.set(k, { n: 1, p, date: `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()} ${hh}時`,
    fromJie: c.jdUT - c.prevJie.jd, toJie: c.nextJie.jd - c.jdUT });
});
const rare = [...seen.values()].filter(r => r.n === 1);
const edge = r => Math.min(r.fromJie, r.toJie);
console.log('只出現一次的組合', rare.length, '種；離最近節氣最近的是', Math.min(...rare.map(edge)).toFixed(1), '天');
const by = (f, keys) => keys.map(k => k + rare.filter(r => f(r) === k).length).join(' ');
console.log('月支：', by(r => B.ZHI[r.p[1] % 12], B.ZHI));
console.log('時支：', by(r => B.ZHI[r.p[3] % 12], B.ZHI));
console.log('日干：', by(r => B.GAN[r.p[2] % 10], B.GAN));
const ext = rare.filter(r => Math.max(...v3(r.p)) >= 0.5);
console.log('其中極端盤', ext.length);
rare.filter((_, i) => i % Math.floor(rare.length / 8) === 0).slice(0, 8)
  .forEach(r => console.log(' ', r.p.map(B.gzName).join(' '), r.date, '距節', edge(r).toFixed(1), '天'));
