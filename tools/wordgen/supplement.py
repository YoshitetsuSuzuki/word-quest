import json, os, glob, collections
CACHE='.cache'
v3={r['word']:r for r in json.load(open(os.path.join(CACHE,'v3-hi.json'),encoding='utf-8'))}
sel={r['word']:r for r in json.load(open(os.path.join(CACHE,'selected-hi.json'),encoding='utf-8'))}
final=json.load(open(os.path.join(CACHE,'final-hi.json'),encoding='utf-8'))
used_words={r['word'] for r in final}
used_en={r['en'] for r in final}
used_ja={r['ja_final'] for r in final}
wd=json.load(open(os.path.join(CACHE,'wikidata-hi.json'),encoding='utf-8'))
# 既に検証済みで不合格だった語も除外
judged=set()
for f in glob.glob(os.path.join(CACHE,'verdicts2','hi-*.json')):
    for v in json.load(open(f,encoding='utf-8')):
        if v.get('word'): judged.add(v['word'])

import re
def norm(s): return re.sub(r'\s+','',s)
cands=[]
for w,r in v3.items():
    if w in used_words or w in judged: continue
    if r['en'] in used_en: continue          # 既出の概念は入れない
    if r['ja'] in used_ja: continue          # 既出の訳も入れない
    g=r['en_gloss'].split(',')[0].split(';')[0].strip()
    if g.count('(')!=g.count(')') or len(g)>40: continue
    c=wd.get(r['en']) or []
    wd_word=any(norm(x['target'])==norm(w) for x in c)
    wd_ja=any(r['ja'] and (r['ja'] in x['ja'] or x['ja'] in r['ja']) for x in c)
    score=(3 if r['both'] else 0)+(2 if wd_word else 0)+(1 if r['in_a'] else 0)+(1 if r['ja_src']=='アプリ検証済み' else 0)+(1 if wd_ja else 0)
    cands.append({**r,'wd_word':wd_word,'score':score,'_ans':g})
# 1概念1語に絞る
by=collections.defaultdict(list)
for c in cands: by[c['en']].append(c)
uniq=[sorted(g,key=lambda x:-x['score'])[0] for g in by.values()]
uniq.sort(key=lambda x:-x['score'])
top=uniq[:1800]
json.dump(top, open(os.path.join(CACHE,'supplement-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
bdir=os.path.join(CACHE,'batches4'); os.makedirs(bdir,exist_ok=True)
for f in glob.glob(os.path.join(bdir,'*')): os.remove(f)
N=200
for i in range(0,len(top),N):
    with open(os.path.join(bdir,f'hi-sup-{i//N+1:02d}.txt'),'w',encoding='utf-8') as fh:
        for r in top[i:i+N]: fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\n")
print(f"追加候補: {len(top)} 語 / {(len(top)+N-1)//N} バッチ")
print(f"  (未検証の残り候補から、既出の概念・訳と重ならないものを選抜)")
print("  スコア分布:", dict(sorted(collections.Counter(r['score'] for r in top).items(), reverse=True)))
