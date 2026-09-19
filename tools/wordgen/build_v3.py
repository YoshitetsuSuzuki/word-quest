import json, re, os, glob, collections, sys
CACHE='.cache'; ROOT='../..'
code=sys.argv[1] if len(sys.argv)>1 else 'hi'
NAME={'hi':'Hindi','ar':'Arabic','tl':'Tagalog'}[code]

wb={}
for f in sorted(glob.glob(os.path.join(ROOT,'public/wordbank/english/level-*.json'))):
    for q in json.load(open(f,encoding='utf-8')):
        m=re.match(r'^「(.+?)」',q.get('prompt',''))
        if m and q.get('verified'): wb.setdefault(m.group(1).lower(), q['answer'])
ej=collections.defaultdict(list)
for line in open(os.path.join(ROOT,'.cache','ejdict-all.txt'),encoding='utf-8'):
    if '\t' in line:
        w,m=line.rstrip('\n').split('\t',1); ej[w.strip().lower()].append(m.strip())

# --- 訳語のクリーニング（記号・説明断片を除去し、駄目なら捨てる）
BAD_CHAR=re.compile(r'[〈〉《》〔〕（）()=\[\]A-Za-z0-9…‥·]')
def clean_ja(s):
    s=re.sub(r'《[^》]*》|〔[^〕]*〕|〈[^〉]*〉|\([^)]*\)|（[^）]*）','',s)
    s=s.split('・')[0].split(',')[0].split('、')[0].strip(' 　:：;；')
    return s
def ok_ja(s, pos):
    if not s or len(s)>12: return False
    if BAD_CHAR.search(s): return False
    verbish=bool(re.search(r'(する|れる|られる|む|ぐ|ぶ|つ|ぬ|く|う|る)$', s))
    if pos=='noun' and verbish and not re.search(r'(さ|み|け|り|物|者|人|事)$', s): return False
    if pos=='verb' and not verbish: return False
    if pos=='adj' and not re.search(r'(い|な|的)$', s): return False
    return True

def ja_of(en_head, pos):
    cands=[]
    if en_head in wb: cands.append((wb[en_head],'アプリ検証済み'))
    for m in ej.get(en_head,[]):
        core=re.findall(r'『(.+?)』', m)
        for c in (core if core else re.split(r'[/;]', m)):
            cands.append((clean_ja(c),'EJDict'))
    for s,src in cands:
        if ok_ja(s,pos): return s,src
    return '',''

BAD_POS={'conj','prep','postp','particle','pron','num','det','intj','prefix','suffix','character','punct','symbol','name','phrase','proverb'}
OK_POS={'noun','verb','adj','adv'}
BAD_TAG={'obsolete','archaic','rare','dialectal','slang','vulgar','offensive','nonstandard','misspelling','historical','poetic','literary'}
SKIP=re.compile(r'^(inflection|alternative|plural of|singular of|synonym of|romanization|abbreviation|initialism|acronym)',re.I)
ents=collections.defaultdict(list)
for line in open(os.path.join(CACHE,f'kaikki-{NAME}.jsonl'),encoding='utf-8'):
    try: d=json.loads(line)
    except: continue
    if d.get('word'): ents[d['word']].append(d)

a_map=collections.defaultdict(set)
for r in json.load(open(os.path.join(CACHE,f'candidates-{code}.json'),encoding='utf-8')):
    for c in r['candidates']: a_map[c['target']].add(r['en'])

rows=[]; drop=collections.Counter()
for w,es in ents.items():
    if ' ' in w or '-' in w: drop['複合語']+=1; continue                 # 複合語は除外
    if any(e.get('pos') in BAD_POS for e in es): drop['機能語']+=1; continue
    ok=[]
    for e in es:
        if e.get('pos') not in OK_POS: continue
        gl=[(s.get('glosses') or [None])[0] for s in e.get('senses',[])
            if s.get('glosses') and not SKIP.match(s['glosses'][0]) and not set(s.get('tags') or []) & BAD_TAG]
        if gl: ok.append((e,gl))
    if not ok: drop['語義なし']+=1; continue
    if len(ok)>1 and len({e['pos'] for e,_ in ok})>1: drop['同綴異義']+=1; continue
    e,gl=ok[0]
    if len(gl)>2: drop['多義(3語義超)']+=1; continue
    head=re.sub(r'^(to|a|an|the)\s+','',re.split(r'[;,/(]',gl[0])[0].strip().lower())
    if ' ' in head: drop['英語側が句']+=1; continue
    if len(ej.get(head,[]))==0 and head not in wb: drop['英和辞書に無い']+=1; continue
    ja,src=ja_of(head,e['pos'])
    if not ja: drop['訳が基準未満']+=1; continue
    both=bool(a_map.get(w) and any(re.search(rf'\b{re.escape(x)}\b',' '.join(gl).lower()) for x in a_map[w]))
    ipa=[s.get('ipa') for s in (e.get('sounds') or []) if s.get('ipa')]
    rows.append({'word':w,'pos':e['pos'],'ipa':ipa[0] if ipa else '','en':head,'en_gloss':gl[0],
                 'ja':ja,'ja_src':src,'both':both,'in_a':bool(a_map.get(w))})
json.dump(rows,open(os.path.join(CACHE,f'v3-{code}.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
tier=collections.Counter('T1 双方向一致' if r['both'] else ('T2 対訳表に載る' if r['in_a'] else 'T3 辞書のみ') for r in rows)
print(f"=== {NAME} 第3版 ===")
for k,v in drop.most_common(): print(f"  除外 {k}: {v}")
print(f"残った候補: {len(rows)} 語")
for k,v in sorted(tier.items()): print(f"    {k}: {v} 語")
