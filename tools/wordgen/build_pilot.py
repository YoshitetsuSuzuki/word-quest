import json, re, os, collections
CACHE='.cache'; ROOT='../..'
# --- 英和辞書(EJDict, パブリックドメイン)を読み込む
ej={}
for line in open(os.path.join(ROOT,'.cache','ejdict-all.txt'),encoding='utf-8'):
    if '\t' not in line: continue
    w,m = line.rstrip('\n').split('\t',1)
    ej.setdefault(w.strip().lower(), m.strip())
print(f"英和辞書(EJDict): {len(ej)} 見出し")

def ja_of(en_gloss):
    """英語の語義から日本語訳を引く。『』で囲まれた核の訳語を優先する。"""
    head = re.split(r'[;,/(]', en_gloss)[0].strip().lower()
    head = re.sub(r'^(to|a|an|the)\s+','',head)
    m = ej.get(head)
    if not m and ' ' in head:            # 複合語は最後の語で再挑戦
        m = ej.get(head.split()[-1])
    if not m: return '', head
    core = re.findall(r'『(.+?)』', m)
    if core: return core[0], head
    first = re.split(r'[/;]', m)[0]
    first = re.sub(r'\([^)]*\)','',first).strip()
    return first[:20], head

# --- 入口A: 英語起点(このアプリの検証済み英単語 → 対訳表)
A=[]
for r in json.load(open(os.path.join(CACHE,'candidates-hi.json'),encoding='utf-8')):
    if not r['en_verified']: continue
    c=r['candidates'][0]
    A.append({'source':'A:英語起点','word':c['target'],'roman':c.get('roman',''),
              'en':r['en'],'ja':r['ja'],'ipa':'', 'sense':c.get('sense','')})
# --- 入口B: 辞書起点(同綴異義を除外済み) + EJDictで日本語訳
B=[]
for r in json.load(open(os.path.join(CACHE,'target-hi.json'),encoding='utf-8')):
    ja, head = ja_of(r['gloss'])
    if not ja: continue
    B.append({'source':'B:辞書起点','word':r['word'],'roman':'','en':head,'ja':ja,
              'ipa':r['ipa'],'sense':r['gloss'],'freq':r['freq']})
print(f"入口A(英語起点・検証済み): {len(A)} 語")
print(f"入口B(辞書起点+英和辞書): {len(B)} 語  ※日本語訳が引けたものだけ")

# --- パイロット300語: Aを優先し、Bは頻度上位から。重複は除く
seen=set(); pilot=[]
for r in A:
    if r['word'] in seen: continue
    seen.add(r['word']); pilot.append(r)
    if len(pilot)>=150: break
for r in sorted(B,key=lambda x:(x['freq']==0,x['freq'])):
    if r['word'] in seen: continue
    seen.add(r['word']); pilot.append(r)
    if len(pilot)>=300: break
json.dump(pilot, open(os.path.join(CACHE,'pilot-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
print(f"\nパイロット: {len(pilot)} 語 (A {sum(1 for p in pilot if p['source'].startswith('A'))} / B {sum(1 for p in pilot if p['source'].startswith('B'))})")
print("\n--- 各入口からサンプル8件 ---")
for tag in ('A','B'):
    print(f"[{tag}]")
    for p in [x for x in pilot if x['source'].startswith(tag)][:8]:
        print(f"  {p['word']:<12} {p['ja']:<12} (en:{p['en']})")
