import json, os, sys, glob, math
CACHE='.cache'
code=sys.argv[1]; need=int(sys.argv[2]); N=int(sys.argv[3]) if len(sys.argv)>3 else 350
rows=json.load(open(os.path.join(CACHE,f'cand-{code}.json'),encoding='utf-8'))
# 3工程の合格率 約72% を見込んで多めに投入
cap=min(len(rows), int(need/0.72)+100)
rows=rows[:cap]
bdir=os.path.join(CACHE,f'batches_{code}'); os.makedirs(bdir,exist_ok=True)
for f in glob.glob(os.path.join(bdir,'*')): os.remove(f)
for i in range(0,len(rows),N):
    with open(os.path.join(bdir,f'{code}-{i//N+1:02d}.txt'),'w',encoding='utf-8') as fh:
        for r in rows[i:i+N]: fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\t{r['en_clean']}\n")
json.dump(rows, open(os.path.join(CACHE,f'j1-{code}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(f"{code}: 投入 {len(rows)} 語 / {math.ceil(len(rows)/N)} バッチ (1バッチ{N}語)")
