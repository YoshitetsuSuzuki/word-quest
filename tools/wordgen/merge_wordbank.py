#!/usr/bin/env python3
"""検証を通った語を、既存のワードバンクへ追加する。
既存語はそのまま残し、新語だけを難易度別に振り分けて追記する。
使い方: python3 merge_wordbank.py pl 4     # j4-pl.json を polish へ
"""
import json, os, sys, glob, random, collections, re
HERE=os.path.dirname(os.path.abspath(__file__)); CACHE=os.path.join(HERE,'.cache')
ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
CAT={'pl':('polish','pl'),'ru':('russian','ru'),'pt':('portuguese','pt'),'ko':('korean','ko'),
     'es':('spanish','es'),'fr':('french','fr'),'de':('german','de')}
code, stage = sys.argv[1], sys.argv[2]
category, prefix = CAT[code]
outdir=os.path.join(ROOT,'public','wordbank',category)
rows=json.load(open(os.path.join(CACHE,f'j{stage}-{code}.json'),encoding='utf-8'))

# 既存の語・IDを読み込む
existing={}; used_ids=set(); existing_words=set()
for f in sorted(glob.glob(os.path.join(outdir,'level-*.json'))):
    lv=int(re.search(r'level-(\d+)',f).group(1))
    qs=json.load(open(f,encoding='utf-8'))
    existing[lv]=qs
    for q in qs:
        used_ids.add(q['id'])
        m=re.match(r'^「(.+?)」', q.get('prompt',''))
        if m: existing_words.add(m.group(1))

# 難易度: 使用頻度が高いほどやさしい。しきい値だと偏る言語があるので
# 頻度順に並べて3等分する（どの言語でも配分が揃う）
fresh=[]
for r in rows:
    if r['word'] in existing_words: continue
    existing_words.add(r['word'])
    fresh.append(r)
fresh.sort(key=lambda r: -r.get('zipf', 0))
new=collections.defaultdict(list)
third=max(1, (len(fresh)+2)//3)
for i, r in enumerate(fresh):
    new[min(3, i//third + 1)].append(r)

random.seed(7)
nid=0
def next_id():
    global nid
    while True:
        nid+=1
        i=f'{prefix}-{nid:05d}'
        if i not in used_ids:
            used_ids.add(i); return i

added=0
for lv in (1,2,3):
    items=new.get(lv,[])
    if not items: continue
    # 誤答は同じレベルの語から作る（難易度がちぐはぐにならないように）
    pool=[x['en_clean'] for x in items] or [x['answer'] for x in existing.get(lv,[])]
    for r in items:
        ans=r['en_clean']
        distr=[]
        guard=0
        while len(distr)<3 and guard<200:
            guard+=1
            c=random.choice(pool)
            if c!=ans and c not in distr: distr.append(c)
        ch=distr+[ans]; random.shuffle(ch)
        existing.setdefault(lv,[]).append({
            'id': next_id(), 'category': category,
            'prompt': f"「{r['word']}」の意味は？",
            'answer': ans,
            'glosses': {'en': ans, 'ja': r['ja']},
            'choices': ch,
            'difficulty': lv,
            'tags': ['word'],
            'pronunciation': r.get('ipa') or '',
            'verified': True,
        })
        added+=1

total=0
manifest={'category':category,'levels':[]}
for lv in sorted(existing):
    qs=existing[lv]; total+=len(qs)
    f=f'level-{lv}.json'
    json.dump(qs, open(os.path.join(outdir,f),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
    manifest['levels'].append({'level':lv,'file':f,'count':len(qs)})
    print(f'  レベル{lv}: {len(qs)} 語')
manifest['total']=total; manifest['verified']=total; manifest['jaVerified']=total
manifest['source']='curated core + dictionary-derived (3-judge AI verified)'
json.dump(manifest, open(os.path.join(outdir,'manifest.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{category}: {added} 語を追加 → 合計 {total} 語')
