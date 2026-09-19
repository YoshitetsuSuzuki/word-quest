import json, random, os
CACHE='.cache'
rows=json.load(open(os.path.join(CACHE,'v2-hi.json'),encoding='utf-8'))
random.seed(42)
S1=[r for r in rows if r['both']]
S2=[r for r in rows if not r['both'] and r['ja_src']=='アプリ検証済み']
S3=[r for r in rows if not r['both'] and r['ja_src']=='EJDict']
print(f"層1 双方向一致: {len(S1)} / 層2 アプリ訳のみ: {len(S2)} / 層3 EJDict訳: {len(S3)}")
sample=[]
for tag,pool in (('S1',S1),('S2',S2),('S3',S3)):
    pick=random.sample(pool, min(100,len(pool)))
    for r in pick: sample.append({**r,'stratum':tag})
random.shuffle(sample)
for i,r in enumerate(sample): r['idx']=i+1
json.dump(sample, open(os.path.join(CACHE,'sample-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
os.makedirs(os.path.join(CACHE,'batches'),exist_ok=True)
for b in range(6):
    part=sample[b*50:(b+1)*50]
    with open(os.path.join(CACHE,'batches',f'hi-batch{b+1}.txt'),'w',encoding='utf-8') as f:
        for r in part:
            f.write(f"{r['idx']}\t{r['word']}\t{r['pos']}\t{r['ja']}\n")
print(f"検証用: {len(sample)} 語を 6 バッチに分割 (.cache/batches/hi-batch1..6.txt)")
print("形式: 通し番号 / ヒンディー語 / 品詞 / 日本語訳（判定対象）")
