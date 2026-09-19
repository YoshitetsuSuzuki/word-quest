import json, glob, os, collections
CACHE='.cache'
sample={r['word']:r for r in json.load(open(os.path.join(CACHE,'sample-hi.json'),encoding='utf-8'))}
verd={}
for f in sorted(glob.glob(os.path.join(CACHE,'verdicts','hi-batch*.json'))):
    for v in json.load(open(f,encoding='utf-8')):
        w=v.get('word')
        if w: verd[w]=v
print(f"判定を回収: {len(verd)} 語 / サンプル {len(sample)} 語")
missing=[w for w in sample if w not in verd]
if missing: print(f"  未判定: {len(missing)} 語 {missing[:5]}")

tally=collections.defaultdict(collections.Counter)
for w,r in sample.items():
    v=verd.get(w)
    if not v: continue
    tally[r['stratum']][v['verdict']] += 1
    tally['全体'][v['verdict']] += 1
LABEL={'S1':'層1 双方向一致','S2':'層2 アプリ訳','S3':'層3 EJDict訳','全体':'合計'}
print(f"\n{'層':<16}{'OK':>6}{'NG':>6}{'UNSURE':>8}{'正解率':>9}")
print('-'*46)
for k in ('S1','S2','S3','全体'):
    c=tally[k]; n=sum(c.values())
    if not n: continue
    print(f"{LABEL[k]:<16}{c['OK']:>6}{c['NG']:>6}{c['UNSURE']:>8}{c['OK']/n*100:>8.1f}%")
# NGの理由を分類
reasons=collections.Counter()
for w,v in verd.items():
    if v['verdict']!='NG': continue
    note=(v.get('note') or '')
    ja=sample.get(w,{}).get('ja','')
    if any(s in ja for s in '〈〉《》〔〕=,'): reasons['訳語の破損・記号混入']+=1
    elif sample.get(w,{}).get('pos')=='noun' and ja.endswith(('る','う','た')): reasons['品詞不一致']+=1
    elif ' ' in w: reasons['複合語の訳が不完全']+=1
    else: reasons['意味の取り違え・稀語']+=1
print("\n--- NGの内訳(機械分類) ---")
for k,v in reasons.most_common(): print(f"  {k}: {v} 件")
json.dump({'tally':{k:dict(v) for k,v in tally.items()}}, open(os.path.join(CACHE,'accuracy-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
