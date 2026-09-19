#!/usr/bin/env python3
"""追加投入分の判定結果を取り込む。既に確定した語・訳との重複も除く。
使い方: python3 apply_sup.py ru 2   # j2b_ru の結果 → j3b-ru.json + batches3b_ru
"""
import json,glob,os,sys,collections,math
CACHE='.cache'
code,stage=sys.argv[1],int(sys.argv[2])
N={1:250,2:225}.get(stage,225)
pool=json.load(open(f'{CACHE}/j{stage}b-{code}.json',encoding='utf-8'))
by={r['word']:r for r in pool}
verdict={}
for f in sorted(glob.glob(f'{CACHE}/j{stage}b_{code}/*.txt')):
    for line in open(f,encoding='utf-8'):
        p=line.rstrip('\n').split('\t')
        if len(p)>=2 and p[0] in by: verdict[p[0]]=p[1:]
tally=collections.Counter(); kept=[]
for w,r in by.items():
    v=verdict.get(w)
    if v is None: tally['未判定']+=1; continue
    k=v[0].strip().upper()
    if k=='OK': tally['OK']+=1; kept.append(r)
    elif k=='FIX' and len(v)>=3 and v[1].strip() and v[2].strip():
        tally['FIX']+=1; r=dict(r); r['ja']=v[1].strip()[:12]; r['en_clean']=v[2].strip(); kept.append(r)
    else: tally['NG']+=1
done=json.load(open(f'{CACHE}/j4-{code}.json',encoding='utf-8'))
ban_ja={r['ja'] for r in done}; ban_en={r['en_clean'] for r in done}; ban_w={r['word'] for r in done}
kept=[r for r in kept if r['word'] not in ban_w and r['ja'] not in ban_ja and r['en_clean'] not in ban_en]
for key in ('ja','en_clean'):
    g=collections.defaultdict(list)
    for r in kept: g[r[key]].append(r)
    kept=[sorted(v,key=lambda x:-x.get('zipf',0))[0] for v in g.values()]
kept.sort(key=lambda r:(-r.get('score',0),-r.get('zipf',0)))
judged=tally['OK']+tally['FIX']+tally['NG']
print(f"{code} 追加分 第{stage}判定: {judged} 語中 合格 {tally['OK']+tally['FIX']} 語 = {(tally['OK']+tally['FIX'])/judged*100:.1f}%")
print(f"  重複整理後の残り: {len(kept)} 語")
nxt=stage+1
json.dump(kept,open(f'{CACHE}/j{nxt}b-{code}.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
bdir=f'{CACHE}/batches{nxt}b_{code}'; os.makedirs(bdir,exist_ok=True)
for f in glob.glob(f'{bdir}/*'): os.remove(f)
for i in range(0,len(kept),N):
    with open(f'{bdir}/{code}-{i//N+1:02d}.txt','w',encoding='utf-8') as fh:
        for r in kept[i:i+N]: fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\t{r['en_clean']}\n")
print(f'  → 第{nxt}判定用に {math.ceil(len(kept)/N)} バッチ')
