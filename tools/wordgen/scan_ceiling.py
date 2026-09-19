import json, gzip, collections, os
CACHE='.cache'
WANT={'hi','ar','tl'}
cnt=collections.Counter(); words=collections.defaultdict(set)
store={c:collections.defaultdict(list) for c in WANT}
n=0
with gzip.open(os.path.join(CACHE,'kaikki-English.jsonl.gz'),'rt',encoding='utf-8') as fh:
    for line in fh:
        try: d=json.loads(line)
        except: continue
        n+=1
        trs=d.get('translations') or []
        if not trs: continue
        w=(d.get('word') or '').strip()
        if not w or ' ' in w: continue   # 複合語は除外
        pos=d.get('pos','')
        for t in trs:
            c=t.get('code')
            if c in WANT and t.get('word'):
                cnt[c]+=1; words[c].add(w.lower())
                store[c][w.lower()].append({'target':t['word'],'roman':t.get('roman',''),
                                            'sense':(t.get('sense') or '')[:100],'pos':pos})
print(f"英語辞書 {n} 見出しを走査")
for c in sorted(WANT):
    print(f"  {c}: 対訳のある英単語 {len(words[c]):>6} 語 / 対訳エントリ {cnt[c]:>7} 件")
    json.dump({k:v for k,v in store[c].items()}, open(os.path.join(CACHE,f'all-{c}.json'),'w',encoding='utf-8'), ensure_ascii=False)
