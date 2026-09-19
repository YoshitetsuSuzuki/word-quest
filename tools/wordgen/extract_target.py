import json, re, collections, sys, os
CACHE='.cache'
NAME={'hi':'Hindi','ar':'Arabic','tl':'Tagalog'}
code=sys.argv[1]
# 機能語・代名詞などは同綴異義が多いので、その語自体を丸ごと除外する
BAD_POS={'conj','prep','postp','particle','pron','num','det','intj','prefix','suffix','infix','character','punct','symbol','name','phrase','proverb'}
OK_POS={'noun','verb','adj','adv'}
BAD_TAG={'obsolete','archaic','rare','dialectal','slang','vulgar','offensive','nonstandard','misspelling'}
SKIP_GLOSS=re.compile(r'^(inflection|alternative (form|spelling)|plural of|singular of|obsolete|misspelling|synonym of|romanization|abbreviation)', re.I)

entries=collections.defaultdict(list)
for line in open(os.path.join(CACHE,f'kaikki-{NAME[code]}.jsonl'),encoding='utf-8'):
    try: d=json.loads(line)
    except: continue
    w=d.get('word')
    if w: entries[w].append(d)

freq={}
fp=os.path.join(CACHE,'hi_50k.txt')
if code=='hi' and os.path.exists(fp):
    for i,l in enumerate(open(fp,encoding='utf-8')):
        p=l.split()
        if p: freq.setdefault(p[0], i+1)

def clean(e):
    out=[]
    for s in e.get('senses',[]):
        g=(s.get('glosses') or [None])[0]
        if not g or SKIP_GLOSS.match(g): continue
        if set(s.get('tags') or []) & BAD_TAG: continue
        out.append(g)
    return out

rows=[]; dropped=collections.Counter()
for w, ents in entries.items():
    if any(e.get('pos') in BAD_POS for e in ents):
        dropped['機能語を含む'] += 1; continue
    cands=[e for e in ents if e.get('pos') in OK_POS and clean(e)]
    if not cands:
        dropped['内容語の語義なし'] += 1; continue
    if len(cands)>1 and len({e['pos'] for e in cands})>1:
        dropped['品詞が複数(同綴異義)'] += 1; continue
    e=cands[0]; gl=clean(e)
    if len(gl)>3:
        dropped['語義が4つ以上(多義)'] += 1; continue
    g=gl[0]
    if len(g.split())>4:
        dropped['語義が長文'] += 1; continue
    ipa=[s.get('ipa') for s in (e.get('sounds') or []) if s.get('ipa')]
    rows.append({'word':w,'pos':e['pos'],'gloss':g,'glosses':gl,'ipa':ipa[0] if ipa else '',
                 'freq':freq.get(w,0)})

rows.sort(key=lambda r:(r['freq']==0, r['freq']))
json.dump(rows, open(os.path.join(CACHE,f'target-{code}.json'),'w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f"=== {NAME[code]} 辞書からの抽出 ===")
print(f"辞書の総語数: {len(entries)}")
for k,v in dropped.most_common(): print(f"  除外 {k}: {v}")
print(f"残った候補: {len(rows)} 語 (うち頻度リスト掲載 {sum(1 for r in rows if r['freq'])} 語)")
print("\n--- 上位15件(頻度順) ---")
for r in rows[:15]:
    print(f"{r['word']:<12} {r['pos']:<5} {r['gloss'][:40]:<40} 頻度#{r['freq'] or '-'}")
