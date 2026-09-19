import json, re, os, glob, collections, sys
CACHE='.cache'; ROOT='../..'
code=sys.argv[1] if len(sys.argv)>1 else 'hi'
NAME={'hi':'Hindi','ar':'Arabic','tl':'Tagalog'}[code]

# --- 1) 日本語訳の土台: ①当アプリの検証済み英単語 ②英和辞書EJDict
wb={}
for f in sorted(glob.glob(os.path.join(ROOT,'public/wordbank/english/level-*.json'))):
    for q in json.load(open(f,encoding='utf-8')):
        m=re.match(r'^「(.+?)」',q.get('prompt',''))
        if m and q.get('verified'): wb.setdefault(m.group(1).lower(), q['answer'])
ej={}
for line in open(os.path.join(ROOT,'.cache','ejdict-all.txt'),encoding='utf-8'):
    if '\t' in line:
        w,m=line.rstrip('\n').split('\t',1); ej.setdefault(w.strip().lower(), m.strip())

def ja_of(en_gloss, pos):
    head=re.split(r'[;,/(]', en_gloss)[0].strip().lower()
    head=re.sub(r'^(to|a|an|the)\s+','',head)
    if head in wb: return wb[head], head, 'アプリ検証済み'
    m=ej.get(head) or (ej.get(head.split()[-1]) if ' ' in head else None)
    if not m: return '', head, ''
    core=re.findall(r'『(.+?)』', m)
    cands=core if core else [re.sub(r'\([^)]*\)','',x).strip() for x in re.split(r'[/;]', m)]
    cands=[c for c in cands if c]
    if pos=='noun':   # 名詞なのに動詞形の訳(〜する/〜る)が先頭なら、名詞らしい候補を優先
        nouny=[c for c in cands if not re.search(r'(する|れる|られる)$', c)]
        if nouny: cands=nouny
    return (cands[0][:20] if cands else ''), head, 'EJDict'

# --- 2) 対象言語の辞書(意味の正)
BAD_POS={'conj','prep','postp','particle','pron','num','det','intj','prefix','suffix','character','punct','symbol','name','phrase','proverb'}
OK_POS={'noun','verb','adj','adv'}
BAD_TAG={'obsolete','archaic','rare','dialectal','slang','vulgar','offensive','nonstandard','misspelling'}
SKIP=re.compile(r'^(inflection|alternative|plural of|singular of|synonym of|romanization|abbreviation)',re.I)
ents=collections.defaultdict(list)
for line in open(os.path.join(CACHE,f'kaikki-{NAME}.jsonl'),encoding='utf-8'):
    try: d=json.loads(line)
    except: continue
    if d.get('word'): ents[d['word']].append(d)
def entry_of(w):
    es=ents.get(w) or []
    if not es or any(e.get('pos') in BAD_POS for e in es): return None
    ok=[]
    for e in es:
        if e.get('pos') not in OK_POS: continue
        gl=[(s.get('glosses') or [None])[0] for s in e.get('senses',[])
            if (s.get('glosses') and not SKIP.match(s['glosses'][0]) and not set(s.get('tags') or []) & BAD_TAG)]
        if gl: ok.append((e,gl))
    if not ok or (len(ok)>1 and len({e['pos'] for e,_ in ok})>1): return None
    e,gl=ok[0]
    if len(gl)>3 or len(gl[0].split())>4: return None
    ipa=[s.get('ipa') for s in (e.get('sounds') or []) if s.get('ipa')]
    return {'pos':e['pos'],'gloss':gl[0],'glosses':gl,'ipa':ipa[0] if ipa else ''}

# --- 3) 候補語: 対訳表(A)と辞書(B)の和集合。Aは"照合"に使う
a_map=collections.defaultdict(set)   # 対象語 -> 対訳元の英単語
for r in json.load(open(os.path.join(CACHE,f'candidates-{code}.json'),encoding='utf-8')):
    for c in r['candidates']: a_map[c['target']].add(r['en'])
freq={}
if code=='hi':
    for i,l in enumerate(open(os.path.join(CACHE,'hi_50k.txt'),encoding='utf-8')):
        p=l.split()
        if p: freq.setdefault(p[0],i+1)

rows=[]
for w in set(list(a_map.keys()) + list(ents.keys())):
    e=entry_of(w)
    if not e: continue
    ja, head, src = ja_of(e['gloss'], e['pos'])
    if not ja: continue
    # 双方向一致: 対訳表の英単語が、辞書の語義にも現れるか
    both = bool(a_map.get(w) and any(re.search(rf'\b{re.escape(x)}\b', ' '.join(e['glosses']).lower()) for x in a_map[w]))
    rows.append({'word':w,'pos':e['pos'],'ipa':e['ipa'],'en':head,'en_gloss':e['gloss'],
                 'ja':ja,'ja_src':src,'both':both,'freq':freq.get(w,0),'in_a':bool(a_map.get(w))})
rows.sort(key=lambda r:(not r['both'], r['freq']==0, r['freq']))
json.dump(rows, open(os.path.join(CACHE,f'v2-{code}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
n_both=sum(1 for r in rows if r['both'])
print(f"=== {NAME} 第2版 ===")
print(f"候補総数: {len(rows)} 語")
print(f"  うち双方向一致(対訳表と辞書が一致・最高信頼): {n_both} 語")
print(f"  日本語訳の出どころ: アプリ検証済み {sum(1 for r in rows if r['ja_src']=='アプリ検証済み')} / EJDict {sum(1 for r in rows if r['ja_src']=='EJDict')}")
print("\n--- 双方向一致の上位12件 ---")
for r in [x for x in rows if x['both']][:12]:
    print(f"  {r['word']:<12} {r['ja']:<10} ({r['en_gloss'][:28]:<28}) {r['ja_src']}")
print("\n--- 先ほど誤っていた語の再判定 ---")
for w in ['वृत्तान्त','मदद','मतलब','सच','युग','आगमन','ओर']:
    hit=[r for r in rows if r['word']==w]
    print(f"  {w:<12} → {hit[0]['ja'] if hit else '(除外)':<10} {hit[0]['en_gloss'][:30] if hit else ''}")
