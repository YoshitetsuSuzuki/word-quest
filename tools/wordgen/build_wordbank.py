import json, glob, os, random, collections, re
CACHE='.cache'; ROOT='../..'
ok=json.load(open(os.path.join(CACHE,'ok-hi.json'),encoding='utf-8'))
rep={r['word']:r for r in json.load(open(os.path.join(CACHE,'repair-hi.json'),encoding='utf-8'))}
conf=set()
for f in glob.glob(os.path.join(CACHE,'verdicts3','hi-fix-*.json')):
    for v in json.load(open(f,encoding='utf-8')):
        if v.get('verdict')=='OK' and v.get('word'): conf.add(v['word'])
final=list(ok)+[rep[w] for w in conf if w in rep]
# 重複語を除去（先に出たものを優先）
seen=set(); rows=[]
for r in final:
    if r['word'] in seen: continue
    seen.add(r['word']); rows.append(r)
print(f"最終データ: {len(rows)} 語 (1次OK {len(ok)} + 修正確定 {len(final)-len(ok)})")

random.seed(11)
bylevel=collections.defaultdict(list)
for r in rows: bylevel[r['level']].append(r)
outdir=os.path.join(ROOT,'public','wordbank','hindi'); os.makedirs(outdir,exist_ok=True)
manifest={'category':'hindi','total':len(rows),'verified':len(rows),'levels':[]}
n=0
for lv in sorted(bylevel):
    items=bylevel[lv]
    pool=[x['en_gloss'].split(',')[0].split(';')[0].strip() for x in items]
    qs=[]
    for r in items:
        n+=1
        ans=r['en_gloss'].split(',')[0].split(';')[0].strip()
        distr=[]
        while len(distr)<3:
            c=random.choice(pool)
            if c!=ans and c not in distr: distr.append(c)
        ch=distr+[ans]; random.shuffle(ch)
        qs.append({
            'id': f'hi-{n:05d}', 'category':'hindi',
            'prompt': f"「{r['word']}」の意味は？",
            'answer': ans,
            'glosses': {'en': ans, 'ja': r['ja_final']},
            'choices': ch,
            'difficulty': lv,
            'tags': ['word'],
            'pronunciation': r.get('ipa') or '',
            'verified': True,
        })
    f=f'level-{lv}.json'
    json.dump(qs, open(os.path.join(outdir,f),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
    manifest['levels'].append({'level':lv,'file':f,'count':len(qs)})
    print(f"  レベル{lv}: {len(qs)} 語 → public/wordbank/hindi/{f}")
json.dump(manifest, open(os.path.join(outdir,'manifest.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"manifest.json を出力 (total {len(rows)})")
print("\n--- サンプル3件 ---")
for q in json.load(open(os.path.join(outdir,'level-1.json'),encoding='utf-8'))[:3]:
    print(f"  {q['prompt']} → {q['glosses']['ja']} / {q['answer']}  {q['pronunciation']}")
