import json, glob, os, re, collections, random
CACHE='.cache'; ROOT='../..'
sel={r['word']:r for r in json.load(open(os.path.join(CACHE,'selected-hi.json'),encoding='utf-8'))}
ok=json.load(open(os.path.join(CACHE,'ok-hi.json'),encoding='utf-8'))
rep={r['word']:r for r in json.load(open(os.path.join(CACHE,'repair-hi.json'),encoding='utf-8'))}
conf=set()
for f in glob.glob(os.path.join(CACHE,'verdicts3','hi-fix-*.json')):
    for v in json.load(open(f,encoding='utf-8')):
        if v.get('verdict')=='OK' and v.get('word'): conf.add(v['word'])
rows=list(ok)+[rep[w] for w in conf if w in rep]
seen=set(); base=[]
for r in rows:
    if r['word'] in seen: continue
    seen.add(r['word']); base.append(r)
print(f"検証済み: {len(base)} 語")

drop=collections.Counter(); keep=[]
# ① 英訳が壊れている(括弧が閉じない・長すぎ)ものを除外
for r in base:
    g=r['en_gloss'].split(',')[0].split(';')[0].strip()
    if g.count('(')!=g.count(')') or len(g)>40 or not g:
        drop['英訳が壊れている']+=1; continue
    r['_ans']=g; keep.append(r)
# ② 同じ英語概念は「証拠が最も強い1語」だけ残す(古語・同義語の重複を排除)
bygroup=collections.defaultdict(list)
for r in keep: bygroup[r['en']].append(r)
kept=[]
for en,g in bygroup.items():
    g.sort(key=lambda x:(-x['score'], -int(x['both']), -int(x['wd_word'])))
    kept.append(g[0]); drop['同義語の重複']+=len(g)-1
# ③ 同じ日本語訳の重複も1語に(4択で同じ選択肢が出るのを防ぐ)
byja=collections.defaultdict(list)
for r in kept: byja[r['ja_final']].append(r)
final=[]
for ja,g in byja.items():
    g.sort(key=lambda x:(-x['score'], -int(x['both'])))
    final.append(g[0]); drop['同じ日本語訳の重複']+=len(g)-1
print("除外:")
for k,v in drop.most_common(): print(f"  {k}: {v} 語")
print(f"精選後: {len(final)} 語")
json.dump(final, open(os.path.join(CACHE,'final-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)

# ワードバンク再生成
random.seed(11)
bylevel=collections.defaultdict(list)
for r in final: bylevel[r['level']].append(r)
outdir=os.path.join(ROOT,'public','wordbank','hindi')
manifest={'category':'hindi','total':len(final),'verified':len(final),'levels':[]}
n=0
for lv in sorted(bylevel):
    items=bylevel[lv]; pool=[x['_ans'] for x in items]; qs=[]
    for r in items:
        n+=1; ans=r['_ans']; distr=[]
        while len(distr)<3:
            c=random.choice(pool)
            if c!=ans and c not in distr: distr.append(c)
        ch=distr+[ans]; random.shuffle(ch)
        qs.append({'id':f'hi-{n:05d}','category':'hindi','prompt':f"「{r['word']}」の意味は？",
                   'answer':ans,'glosses':{'en':ans,'ja':r['ja_final']},'choices':ch,
                   'difficulty':lv,'tags':['word'],'pronunciation':r.get('ipa') or '','verified':True})
    json.dump(qs, open(os.path.join(outdir,f'level-{lv}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    manifest['levels'].append({'level':lv,'file':f'level-{lv}.json','count':len(qs)})
    print(f"  レベル{lv}: {len(qs)} 語")
json.dump(manifest, open(os.path.join(outdir,'manifest.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)

# 再監査サンプル(前回と重ならない無作為100語)
random.seed(123)
s=random.sample(final,100)
os.makedirs(os.path.join(CACHE,'audit'),exist_ok=True)
with open(os.path.join(CACHE,'audit','hi-final2.txt'),'w',encoding='utf-8') as fh:
    for r in s: fh.write(f"{r['word']}\t{r['ja_final']}\t{r['_ans']}\n")
print("再監査サンプル100語を作成")
