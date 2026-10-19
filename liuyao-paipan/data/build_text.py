# 組合《周易》原文：卦辭、爻辭、用九用六、大象取 opencode-tianji（ctext 系）並依三方比對修正；小象取維基文庫《周易》並依《周易本義》《周易正義》修正
import json, re, difflib, os
HERE = os.path.dirname(os.path.abspath(__file__))
ref = json.load(open(os.path.join(HERE, 'sources', 'ref_ctext_benyi.json'), encoding='utf-8'))
NAMES = '乾 坤 屯 蒙 需 訟 師 比 小畜 履 泰 否 同人 大有 謙 豫 隨 蠱 臨 觀 噬嗑 賁 剝 復 无妄 大畜 頤 大過 坎 離 咸 恆 遯 大壯 晉 明夷 家人 睽 蹇 解 損 益 夬 姤 萃 升 困 井 革 鼎 震 艮 漸 歸妹 豐 旅 巽 兌 渙 節 中孚 小過 既濟 未濟'.split()
def readB(fn, kinds):
    cur = None; d = {}; order = []
    for line in open(fn, encoding='utf-8'):
        line = line.rstrip('\n')
        if line.startswith('#'): cur = line[1:]; d[cur] = {k: [] for k in kinds}; order.append(cur)
        elif line[:2] in tuple(k + ' ' for k in kinds): d[cur][line[0]].append(line[2:])
    return [d[k] for k in order]
BX = readB(os.path.join(HERE, 'sources', 'wikisource_zhouyi_xiaoxiang.txt'), 'X')
LAB = re.compile(r'^(初[六九]|[六九][二三四五]|上[六九]|用[六九])[：，]')
def once(s, old, new, where):
    assert s.count(old) == 1, (where, old, s)
    return s.replace(old, new)
# 卦辭、爻辭、大象的修正：(卦序, 欄位, 原字串, 新字串, 依據)
PATCH = [
    (10, 'D', '安民志', '定民志', '本義、維基、正義皆作「定」'),
    (10, 'D', '以辨上下', '以辯上下', '本義、正義作「辯」'),
    (17, 2, '系小子', '係小子', '本義、維基'), (17, 3, '系丈夫', '係丈夫', '本義、維基'), (17, 6, '拘系之', '拘係之', '本義、維基'),
    (21, 3, '噬臘肉', '噬腊肉', '本義作「腊」（音昔，乾肉）'),
    (23, 1, '剝床', '剝牀', '本義、維基'), (23, 2, '剝床', '剝牀', '本義、維基'), (23, 4, '剝床', '剝牀', '本義、維基'),
    (23, 'D', '山附地上', '山附於地', '本義、正義'),
    (25, 2, '不耕獲', '不耕穫', '本義、維基'),
    (28, 5, '老婦得士夫', '老婦得其士夫', '本義、維基'),
    (34, 'D', '非禮勿履', '非禮弗履', '本義、維基'),
    (35, 4, '晉如碩鼠', '晉如鼫鼠', '本義、維基、正義'),
    (36, 4, '出于門庭', '于出門庭', '本義、維基'),
    (37, 5, '勿恤，往吉', '勿恤，吉', '本義、維基'),
    (41, 1, '巳事遄往', '已事遄往', '本義、小象；正義疏「巳，竟也」即已'),
    (41, 6, '貞吉，有攸往', '貞吉，利有攸往', '本義、維基'),
    (43, 'D', '澤上于天', '澤上於天', '本義、正義'),
    (47, 2, '利用享祀', '利用亨祀', '本義、維基'),
    (48, 2, '瓮敝漏', '甕敝漏', '本義、正義'),
    (57, 'G', '小亨，利攸往', '小亨，利有攸往', '本義、維基'),
    (57, 2, '巽在床下', '巽在牀下', '本義、維基'), (57, 6, '巽在床下', '巽在牀下', '本義、維基'),
    (63, 'D', '預防', '豫防', '本義、維基'),
]
# 小象的修正（底本：維基文庫《周易》各卦頁）
XPATCH = [
    (4, 6, '利禦寇，上下順也', '利用禦寇，上下順也', '本義'),
    (13, 4, '乘其庸', '乘其墉', '本義；與爻辭一致'), (13, 5, '言相剋也', '言相克也', '本義'),
    (14, 2, '大轝以載', '大車以載', '本義；與爻辭一致'), (14, 4, '明辨晰也', '明辨晳也', '本義'), (14, 6, '自天佑也', '自天祐也', '本義；與爻辭一致'),
    (17, 2, '系小子', '係小子', '本義'), (17, 3, '系丈夫', '係丈夫', '本義'), (17, 6, '拘系之', '拘係之', '本義'),
    (20, 2, '窺觀', '闚觀', '本義；與爻辭一致'),
    (24, 1, '以修身也', '以脩身也', '本義'),
    (29, 4, '剛柔濟也', '剛柔際也', '本義'),
    (40, 3, '亦可丑也，自我致戎，又誰咎也。', '亦可醜也。自我致戎，又誰咎也？', '本義、正義'),
    (41, 5, '自上佑也', '自上祐也', '本義'),
    (43, 2, '莫夜有戎，得中道也', '有戎勿恤，得中道也', '本義'),
    (44, 1, '系于金柅', '繫于金柅', '本義；與爻辭一致'), (44, 5, '志不捨命也', '志不舍命也', '本義'),
    (47, 3, '據于蒺藜', '據于蒺蔾', '本義；與爻辭一致'),
    (48, 4, '修井也', '脩井也', '本義'),
    (55, 6, '窺其戶', '闚其戶', '本義；與爻辭一致'),
    (59, 2, '渙奔其機', '渙奔其机', '本義；與爻辭一致'),
    (60, 2, '不出門庭，失時極也', '不出門庭凶，失時極也', '本義'),
    (61, 3, '可鼓或罷', '或鼓或罷', '本義'),
]
GLYPH = {'無': '无', '羣': '群'}
def glyph(s): return ''.join(GLYPH.get(c, c) for c in s)
out = []
for k, g in enumerate(ref):
    i = k + 1; nm = NAMES[k]
    assert g['i'] == i
    G = g['guaci']
    G = re.sub(r'^[^：，]{1,2}[：，]', '', G) if re.match(r'^(%s|%s)[：，]' % (re.escape(nm), {'恆': '恒'}.get(nm, nm)), G) else G
    Y = list(g['yao']); D = g['daxiang']
    X = list(BX[k]['X'])
    for (pi, f, a, b, why) in PATCH:
        if pi != i: continue
        if f == 'G': G = once(G, a, b, (i, f))
        elif f == 'D': D = once(D, a, b, (i, f))
        else: Y[f - 1] = once(Y[f - 1], a, b, (i, f))
    for (pi, f, a, b, why) in XPATCH:
        if pi == i: X[f - 1] = once(X[f - 1], a, b, (i, f))
    labels = [LAB.match(y).group(1) for y in Y]
    Yt = [LAB.sub('', y) for y in Y]
    X = [glyph(x) for x in X]; Yt = [glyph(y) for y in Yt]; G = glyph(G); D = glyph(D)
    rec = {'i': i, 'n': nm, 'g': G, 'lab': labels[:6], 'y': Yt[:6], 'd': D, 'x': X[:6]}
    if i <= 2:
        assert labels[6] == ('用九' if i == 1 else '用六')
        rec['yy'] = Yt[6]; rec['yx'] = X[6]
    assert len(rec['y']) == 6 and len(rec['x']) == 6, (i, len(rec['y']), len(rec['x']))
    out.append(rec)
json.dump(out, open(os.path.join(HERE, 'zhouyi.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
# 依據清單
notes = [{'卦序': p[0], '欄': p[1], '原': p[2], '改': p[3], '依據': p[4]} for p in PATCH] + [{'卦序': p[0], '欄': '小象%s' % p[1], '原': p[2], '改': p[3], '依據': p[4]} for p in XPATCH]
json.dump(notes, open(os.path.join(HERE, 'zhouyi_patches.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ok', len(out), 'patches', len(notes))
# 重新與本義比對，列出剩餘差異（應只剩異體字與版本取捨）
PUN = '，。；：！？、「」『』（）《》〈〉 　'
def strip(s): return ''.join(c for c in s if c not in PUN)
VAR = dict(zip('黄恒嵗頥䝉乗説户徳壮羣彚賔宫内髙逺朶耊兹衆来愠㝠懐隂𤣥𤼵無彊勅闗甁厯畱莅冦聴絶他',
               '黃恆歲頤蒙乘說戶德壯群彙賓宮內高遠朵耋茲眾來慍冥懷陰玄發无強敕關瓶歷留蒞寇聽絕它'))
def nv(s): return ''.join(VAR.get(c, c) for c in s)
left = []
for rec, g in zip(out, ref):
    pairs = [('卦辭', rec['g'], g['bx_guaci'])] + [('爻%d' % (j + 1), rec['y'][j], LAB.sub('', g['bx_yao'][j])) for j in range(6)] + [('大象', rec['d'], g['bx_daxiang'])]
    pairs += [('小象', ''.join(rec['x']), ''.join(g['bx_xiaoxiang']))]
    for tag, mine, a in pairs:
        m, b = nv(strip(mine)), nv(strip(a))
        if tag == '卦辭' and m.startswith(nv(rec['n'])) and not b.startswith(nv(rec['n'])): m = m[len(nv(rec['n'])):]
        if m != b:
            sm = difflib.SequenceMatcher(None, m, b, autojunk=False)
            left.append((rec['i'], rec['n'], tag, [(op, m[i1:i2], b[j1:j2]) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != 'equal']))
for l in left: print(*l)
