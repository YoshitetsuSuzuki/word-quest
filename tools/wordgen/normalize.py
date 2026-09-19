#!/usr/bin/env python3
"""訳語の表記ゆれをならす（4択の選択肢として並べたとき見た目を揃えるため）。
監査で指摘: 動詞の先頭「を」/ 形容詞の「〜的」/ 副詞の「〜して」。
使い方: python3 normalize.py pl 4
"""
import json, os, sys, re, collections
HERE=os.path.dirname(os.path.abspath(__file__)); CACHE=os.path.join(HERE,'.cache')
code, stage = sys.argv[1], sys.argv[2]
path=os.path.join(CACHE,f'j{stage}-{code}.json')
rows=json.load(open(path,encoding='utf-8'))
n=collections.Counter()
for r in rows:
    ja, pos = r['ja'], r['pos']
    # 「を」以外の仮名は語頭に立ちうる(とげ/はちみつ/がん等)ので触らない
    if ja[:1] == 'を':
        ja=ja[1:]; n['先頭の「を」を削除']+=1
    if pos=='adj' and re.search(r'的$', ja):
        ja=ja+'な'; n['形容詞に「な」を付加']+=1
    if pos=='adv' and re.search(r'して$', ja):
        ja=ja[:-2]+'に'; n['副詞を「〜に」に統一']+=1
    if ja!=r['ja']: r['ja']=ja
json.dump(rows, open(path,'w',encoding='utf-8'), ensure_ascii=False, indent=1)
print(f'{code}: {len(rows)} 語を整形  ' + ('、'.join(f'{k}{v}件' for k,v in n.items()) or '修正なし'))
