import json, os, re, glob, collections, sys
CACHE='.cache'; ROOT='../..'
code='hi'
rows=json.load(open(os.path.join(CACHE,f'v3-{code}.json'),encoding='utf-8'))
wd=json.load(open(os.path.join(CACHE,f'wikidata-{code}.json'),encoding='utf-8'))
# 英単語の難易度(既存アプリのレベル)
diff={}
for f in sorted(glob.glob(os.path.join(ROOT,'public/wordbank/english/level-*.json'))):
    for q in json.load(open(f,encoding='utf-8')):
        m=re.match(r'^「(.+?)」',q.get('prompt',''))
        if m: diff.setdefault(m.group(1).lower(), q['difficulty'])

def norm(s): return re.sub(r'\s+','',s)
sel=[]
for r in rows:
    w=r['word']; en=r['en']
    cands=wd.get(en) or []
    wd_word = any(norm(c['target'])==norm(w) for c in cands)
    wd_ja   = any(r['ja'] and (r['ja'] in c['ja'] or c['ja'] in r['ja']) for c in cands)
    d = diff.get(en, 9)
    score = (3 if r['both'] else 0) + (2 if wd_word else 0) + (1 if r['in_a'] else 0) \
          + (1 if r['ja_src']=='アプリ検証済み' else 0) + (1 if d<=4 else 0) + (1 if wd_ja else 0)
    sel.append({**r,'wd_word':wd_word,'wd_ja':wd_ja,'en_diff':d,'score':score})
sel.sort(key=lambda x:(-x['score'], x['en_diff']))
top=sel[:3500]
# レベル付け: 英単語の難易度から3段階へ
for r in top:
    r['level'] = 1 if r['en_diff']<=2 else (2 if r['en_diff']<=4 else 3)
json.dump(top, open(os.path.join(CACHE,f'selected-{code}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print("=== 証拠の強さごとの語数(選抜3,500語) ===")
c=collections.Counter(r['score'] for r in top)
for s in sorted(c, reverse=True):
    print(f"  スコア{s}: {c[s]:>5} 語")
print(f"\n  双方向一致あり: {sum(1 for r in top if r['both'])} / Wikidata一致: {sum(1 for r in top if r['wd_word'])}")
print(f"  レベル内訳: {dict(sorted(collections.Counter(r['level'] for r in top).items()))}")
# AI検証用バッチ(200語ずつ)
bdir=os.path.join(CACHE,'batches2'); os.makedirs(bdir,exist_ok=True)
for f in glob.glob(os.path.join(bdir,'*')): os.remove(f)
N=200
for i in range(0,len(top),N):
    part=top[i:i+N]
    with open(os.path.join(bdir,f'hi-{i//N+1:02d}.txt'),'w',encoding='utf-8') as fh:
        for r in part: fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\n")
print(f"  AI検証用: {len(top)} 語を {(len(top)+N-1)//N} バッチに分割")
print("\n--- 上位10件 ---")
for r in top[:10]: print(f"  {r['word']:<12} {r['ja']:<10} score{r['score']} (en:{r['en']})")
