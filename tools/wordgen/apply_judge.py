#!/usr/bin/env python3
"""AI判定の結果を取り込み、合格語だけを次の段へ回す。
使い方: python3 apply_judge.py pl 1   # 1人目の結果を取り込み、2人目用バッチを作る
判定ファイル: .cache/j<stage>_<code>/*.txt  (語<TAB>OK / 語<TAB>FIX<TAB>ja<TAB>en / 語<TAB>NG<TAB>理由)
"""
import json, os, sys, glob, collections, math
HERE=os.path.dirname(os.path.abspath(__file__)); CACHE=os.path.join(HERE,'.cache')
code, stage = sys.argv[1], int(sys.argv[2])
N = {1:250, 2:225}.get(stage, 225)      # 次の段の1バッチ語数
pool = json.load(open(os.path.join(CACHE, f'j{stage}-{code}.json'), encoding='utf-8'))
by = {r['word']: r for r in pool}

verdict = {}
for f in sorted(glob.glob(os.path.join(CACHE, f'j{stage}_{code}', '*.txt'))):
    for line in open(f, encoding='utf-8'):
        p = line.rstrip('\n').split('\t')
        if len(p) < 2 or p[0] not in by:
            continue
        verdict[p[0]] = p[1:]

tally = collections.Counter()
kept = []
for w, r in by.items():
    v = verdict.get(w)
    if v is None:
        tally['未判定'] += 1
        continue
    k = v[0].strip().upper()
    if k == 'OK':
        tally['OK'] += 1; kept.append(r)
    elif k == 'FIX' and len(v) >= 3 and v[1].strip() and v[2].strip():
        tally['FIX'] += 1
        r = dict(r); r['ja'] = v[1].strip()[:12]; r['en_clean'] = v[2].strip()
        kept.append(r)
    else:
        tally['NG'] += 1

# 修正で生じた重複を再度つぶす
for key in ('ja', 'en_clean'):
    g = collections.defaultdict(list)
    for r in kept: g[r[key]].append(r)
    kept = [sorted(v, key=lambda x: -x.get('zipf', 0))[0] for v in g.values()]
kept.sort(key=lambda r: (-r.get('score', 0), -r.get('zipf', 0)))

judged = tally['OK'] + tally['FIX'] + tally['NG']
rate = (tally['OK'] + tally['FIX']) / judged * 100 if judged else 0
print(f"{code} 第{stage}判定: 判定 {judged} 語中 合格 {tally['OK']+tally['FIX']} 語 = {rate:.1f}% "
      f"(そのまま{tally['OK']} / 訳を修正{tally['FIX']} / 不採用{tally['NG']} / 未判定{tally['未判定']})")
print(f"  重複整理後の残り: {len(kept)} 語")

nxt = stage + 1
json.dump(kept, open(os.path.join(CACHE, f'j{nxt}-{code}.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
bdir = os.path.join(CACHE, f'batches{nxt}_{code}'); os.makedirs(bdir, exist_ok=True)
for f in glob.glob(os.path.join(bdir, '*')): os.remove(f)
for i in range(0, len(kept), N):
    with open(os.path.join(bdir, f'{code}-{i//N+1:02d}.txt'), 'w', encoding='utf-8') as fh:
        for r in kept[i:i+N]:
            fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\t{r['en_clean']}\n")
print(f"  → 第{nxt}判定用に {math.ceil(len(kept)/N)} バッチを作成")
