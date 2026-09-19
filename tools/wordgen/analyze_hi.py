import json, collections
CACHE='.cache/'
# 1) 辞書を索引化
idx=collections.defaultdict(list)
n=0
for line in open(CACHE+'kaikki-Hindi.jsonl',encoding='utf-8'):
    try: d=json.loads(line)
    except: continue
    n+=1
    idx[d.get('word','')].append(d)
print(f"辞書: {n} 見出し / ユニーク語 {len(idx)}")

# 2) 頻度リスト
freq=[l.split()[0] for l in open(CACHE+'hi_50k.txt',encoding='utf-8') if l.strip()]
print(f"頻度リスト: {len(freq)} 語")

POS_OK={'noun','verb','adj','adv'}
def clean_senses(entry):
    out=[]
    for s in entry.get('senses',[]):
        g=s.get('glosses') or []
        if not g: continue
        tags=set(s.get('tags') or [])
        if tags & {'obsolete','archaic','rare','vulgar','offensive','slang'}: continue
        out.append(g[0])
    return out

found=0; usable=0; pos_count=collections.Counter(); ipa_count=0; samples=[]
for w in freq:
    ents=idx.get(w)
    if not ents: continue
    found+=1
    best=None
    for e in ents:
        if e.get('pos') in POS_OK and clean_senses(e):
            best=e; break
    if not best: continue
    usable+=1
    pos_count[best['pos']]+=1
    ipa=[s.get('ipa') for s in (best.get('sounds') or []) if s.get('ipa')]
    if ipa: ipa_count+=1
    if len(samples)<15:
        samples.append((w,best['pos'],clean_senses(best)[:2],ipa[:1]))

print(f"辞書に存在: {found} 語 ({found/len(freq)*100:.0f}%)")
print(f"内容語として使える: {usable} 語 ({usable/len(freq)*100:.0f}%)")
print(f"品詞内訳: {dict(pos_count)}")
print(f"IPA発音あり: {ipa_count} 語 ({ipa_count/max(usable,1)*100:.0f}%)")
print("\n--- サンプル15件 ---")
for w,p,g,i in samples:
    print(f"{w:<12} {p:<6} {str(g)[:70]:<70} {i}")
