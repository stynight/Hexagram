// 五行力量模型。
// v2：天干各 1 份，地支按人元司令天數分給藏干，月令加倍。
// v3：在 v2 上加入合、會、沖、剋、害（規則見 README）。
const path = require('path');
const B = require(path.join(__dirname, '..', 'bazi-paipan', 'src', 'engine.js'));

const SILING = {
  2: [[4, 7], [2, 7], [0, 16]], 3: [[0, 10], [1, 20]], 4: [[1, 9], [9, 3], [4, 18]],
  5: [[4, 5], [6, 9], [2, 16]], 6: [[2, 10], [5, 9], [3, 11]], 7: [[3, 9], [1, 3], [5, 18]],
  8: [[5, 7], [4, 3], [8, 3], [6, 17]], 9: [[6, 10], [7, 20]], 10: [[7, 9], [3, 3], [4, 18]],
  11: [[4, 7], [0, 5], [8, 18]], 0: [[8, 10], [9, 20]], 1: [[9, 9], [7, 3], [5, 18]]
};
const gw = g => B.ganWx(g);
const mainWx = z => gw(SILING[z].reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
const KU = new Set([1, 4, 7, 10]);                                   // 丑辰未戌
const HUA5 = { '0,5': 2, '1,6': 3, '2,7': 4, '3,8': 0, '4,9': 1 };   // 甲己土 乙庚金 丙辛水 丁壬木 戊癸火
const HUA6 = { '0,1': 2, '2,11': 0, '3,10': 1, '4,9': 3, '5,8': 4, '6,7': 2 };
const SANHE = [[8, 0, 4, 4], [11, 3, 7, 0], [2, 6, 10, 1], [5, 9, 1, 3]];   // 生、旺、墓、局五行
const SANHUI = [[2, 3, 4, 0], [5, 6, 7, 1], [8, 9, 10, 3], [11, 0, 1, 4]];
const key = (a, b) => (a < b ? a + ',' + b : b + ',' + a);
const ANHE = new Set(['1,2', '3,8', '6,11']);                       // 寅丑 卯申 午亥
const sum = v => v.reduce((a, b) => a + b, 0);
const F_CHONG = [1, 0.5, 0.25];   // 相鄰、隔一柱、年時遙對
const F_HE = [1, 0.3, 0];         // 合、害只認相鄰，隔一柱很弱

function baseVectors(p) {
  const S = p.map(gz => { const v = [0, 0, 0, 0, 0]; v[gw(gz % 10)] = 1; return v; });
  const Z = p.map((gz, i) => {
    const v = [0, 0, 0, 0, 0], k = i === 1 ? 2 : 1;
    for (const [g, d] of SILING[gz % 12]) v[gw(g)] += k * d / 30;
    return v;
  });
  return { S, Z };
}
function totals(S, Z) {
  const t = [0, 0, 0, 0, 0];
  for (const v of S.concat(Z)) v.forEach((x, e) => { t[e] += x; });
  return t;
}
function move(v, frac, to) { const t = sum(v); v.forEach((x, e) => { v[e] = x * (1 - frac); }); v[to] += frac * t; }
function scale(v, f) { v.forEach((x, e) => { v[e] = x * f; }); }

function v3(p) {
  const g = p.map(x => x % 10), z = p.map(x => x % 12);
  const { S, Z } = baseVectors(p);
  const monthWx = mainWx(z[1]);
  const stemWx = new Set(g.map(gw));
  const boundS = [0, 0, 0, 0], boundZ = [0, 0, 0, 0];

  // 1. 天干五合：只認相鄰。合住各留七成；月令是化神就化過去，否則那三成被絆住。
  for (let i = 0; i < 3; i++) {
    const hua = HUA5[key(g[i], g[i + 1])];
    if (hua === undefined) continue;
    boundS[i] = boundS[i + 1] = 1;
    for (const k of [i, i + 1]) {
      const amt = 0.3 * sum(S[k]); scale(S[k], 0.7);
      if (monthWx === hua) S[k][hua] += amt;
    }
  }
  // 2. 地支三會（完整）、三合（完整）、半合／拱合、六合
  for (const [a, b, c, e] of SANHUI) {
    if ([a, b, c].every(x => z.includes(x)))
      z.forEach((x, k) => { if (x === a || x === b || x === c) { move(Z[k], 0.5, e); boundZ[k] = 1; } });
  }
  for (const [sheng, wang, mu, e] of SANHE) {
    if ([sheng, wang, mu].every(x => z.includes(x))) {
      z.forEach((x, k) => { if (x === sheng || x === wang || x === mu) { move(Z[k], 0.4, e); boundZ[k] = 1; } });
      continue;
    }
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
      const f = F_HE[j - i - 1]; if (!f) continue;
      const pair = [z[i], z[j]];
      const hasWang = pair.includes(wang), other = pair.find(x => x !== wang);
      if (hasWang && (other === sheng || other === mu)) {            // 半合：旺地配生地或墓地
        const k = z[i] === wang ? j : i; move(Z[k], 0.2 * f, e); boundZ[i] = boundZ[j] = 1;
      } else if (pair.includes(sheng) && pair.includes(mu)) {         // 拱合：生墓相配，缺旺地
        move(Z[i], 0.1 * f, e); move(Z[j], 0.1 * f, e); boundZ[i] = boundZ[j] = 1;
      }
    }
  }
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const f = F_HE[j - i - 1]; if (!f || (z[i] + z[j]) % 12 !== 1) continue;
    const hua = HUA6[key(z[i], z[j])], canHua = monthWx === hua || stemWx.has(hua);
    for (const k of [i, j]) {
      const amt = 0.2 * f * sum(Z[k]); scale(Z[k], 1 - 0.2 * f);
      if (canHua) Z[k][hua] += amt;
    }
    boundZ[i] = boundZ[j] = 1;
  }
  // 暗合（寅丑、卯申、午亥）：藏干相合，只絆住一成，不化
  for (let i = 0; i < 3; i++) {
    if (!ANHE.has(key(z[i], z[i + 1]))) continue;
    scale(Z[i], 0.9); scale(Z[i + 1], 0.9); boundZ[i] = boundZ[i + 1] = 1;
  }

  // 3. 沖、害、剋：同時結算。雙方都受傷，傷害量取兩方五行總力較弱的那邊乘係數，
  //    所以衰的一方按比例傷得重，旺的一方傷得輕；被合住的地支受沖減半（貪合忘沖）。
  const T = totals(S, Z);
  const dmgZ = [0, 0, 0, 0], dmgS = [0, 0, 0, 0], kuZ = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    const d = j - i - 1;
    if ((z[i] + 6) % 12 === z[j]) {
      if (KU.has(z[i]) && KU.has(z[j])) { kuZ[i] += 0.15 * F_CHONG[d]; kuZ[j] += 0.15 * F_CHONG[d]; continue; } // 庫沖：開庫，只傷本氣土
      const L = 0.5 * F_CHONG[d] * Math.min(T[mainWx(z[i])], T[mainWx(z[j])]);
      dmgZ[i] += L * (boundZ[i] ? 0.5 : 1); dmgZ[j] += L * (boundZ[j] ? 0.5 : 1);
    } else if ((z[i] + z[j]) % 12 === 7 && F_HE[d]) {
      const L = 0.2 * F_HE[d] * Math.min(T[mainWx(z[i])], T[mainWx(z[j])]);
      dmgZ[i] += L; dmgZ[j] += L;
    }
    const ea = gw(g[i]), eb = gw(g[j]);
    if (HUA5[key(g[i], g[j])] !== undefined && d === 0) continue;     // 相鄰已合，合而不剋
    let ctrl = -1, tgt = -1;
    if ((ea + 2) % 5 === eb) { ctrl = i; tgt = j; } else if ((eb + 2) % 5 === ea) { ctrl = j; tgt = i; }
    if (ctrl < 0) continue;
    const c = g[i] % 2 === g[j] % 2 ? 0.35 : 0.2;                   // 同性相剋（七殺式）重，異性輕
    const L = c * F_CHONG[d] * Math.min(T[ea], T[eb]);
    dmgS[tgt] += L; dmgS[ctrl] += L / 2;
  }
  for (let k = 0; k < 4; k++) {
    const tz = sum(Z[k]); if (tz > 0 && dmgZ[k]) scale(Z[k], 1 - Math.min(dmgZ[k], 0.8 * tz) / tz);
    if (kuZ[k]) Z[k][2] *= 1 - Math.min(kuZ[k], 0.8);
    const ts = sum(S[k]); if (ts > 0 && dmgS[k]) scale(S[k], 1 - Math.min(dmgS[k], 0.8 * ts) / ts);
  }
  const t = totals(S, Z), all = sum(t);
  return t.map(x => x / all);
}
function v2(p) { const { S, Z } = baseVectors(p); const t = totals(S, Z), all = sum(t); return t.map(x => x / all); }

const ent = s => -s.reduce((a, x) => a + (x > 0 ? x * Math.log(x) : 0), 0) / Math.log(5);
function purity(yi) {
  const { S, Z } = baseVectors([yi, yi, yi, yi]);      // 只取年柱：天干 1 份 + 地支 1 份
  const v = S[0].map((x, e) => x + Z[0][e]);
  return Math.max(...v) / sum(v);
}

// 一年（立春到立春）每天十二個時辰各排一盤，對每盤呼叫 fn(chart)
function eachChart(Y, fn) {
  const yi = B.yearGZ(Y);
  for (let t = Date.UTC(Y, 0, 25); t <= Date.UTC(Y + 1, 1, 10); t += 864e5) {
    const d = new Date(t);
    for (let hh = 0; hh < 24; hh += 2) {
      const c = B.buildChart({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), hh, sex: 'm' });
      if (c.pillars[0] === yi) fn(c, d, hh);
    }
  }
}

module.exports = { B, v2, v3, purity, ent, eachChart };
