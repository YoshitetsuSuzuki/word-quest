import json, glob, os, collections
CACHE='.cache'
sel={r['word']:r for r in json.load(open(os.path.join(CACHE,'selected-hi.json'),encoding='utf-8'))}
verd={}
for f in sorted(glob.glob(os.path.join(CACHE,'verdicts2','hi-*.json'))):
    try: data=json.load(open(f,encoding='utf-8'))
    except Exception as e: print(f"  読めず: {f} {e}"); continue
    for v in data:
        w=v.get('word')
        if w: verd[w]=v
c=collections.Counter(v['verdict'] for v in verd.values())
print(f"判定回収: {len(verd)} / 対象 {len(sel)}")
print(f"  OK {c['OK']} / NG {c['NG']} / UNSURE {c['UNSURE']}  → 1次合格率 {c['OK']/max(len(verd),1)*100:.1f}%")

ok=[]; repair=[]
for w,r in sel.items():
    v=verd.get(w)
    if not v: continue
    if v['verdict']=='OK':
        ok.append({**r,'ja_final':r['ja'],'stage':'1次OK'})
    elif v['verdict']=='NG' and (v.get('correct_ja') or '').strip():
        fix=v['correct_ja'].strip()
        if 1<=len(fix)<=12 and not any(ch in fix for ch in '〈〉《》()（）='):
            repair.append({**r,'ja_final':fix,'stage':'修正'})
print(f"\n1次OK: {len(ok)} 語")
print(f"修正候補(AIが正しい訳を提示): {len(repair)} 語 → 再検証へ")
json.dump(ok, open(os.path.join(CACHE,'ok-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
json.dump(repair, open(os.path.join(CACHE,'repair-hi.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
bdir=os.path.join(CACHE,'batches3'); os.makedirs(bdir,exist_ok=True)
for f in glob.glob(os.path.join(bdir,'*')): os.remove(f)
N=200
for i in range(0,len(repair),N):
    with open(os.path.join(bdir,f'hi-fix-{i//N+1:02d}.txt'),'w',encoding='utf-8') as fh:
        for r in repair[i:i+N]: fh.write(f"{r['word']}\t{r['pos']}\t{r['ja_final']}\n")
print(f"再検証バッチ: {(len(repair)+N-1)//N} 個")
