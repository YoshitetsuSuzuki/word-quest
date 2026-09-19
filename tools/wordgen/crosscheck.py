#!/usr/bin/env python3
"""
crosscheck.py  対訳候補を「対象言語側の辞書」と突き合わせて機械検証する（1段目のチェック）。

手順:
  extract_translations.py が作った candidates-<lang>.json の各候補語を、
  対象言語の辞書(kaikki-<Lang>.jsonl)で引き直し、語義に元の英単語が現れるか確認する。
  双方向で一致した語だけが「機械的に確実」。残りは AI 検証(2段目)へ回す。

判定:
  A … 対象語が辞書にあり、語義が元の英単語と一致（最も確実）
  B … 対象語は辞書にあるが、語義が一致しない（AI検証へ）
  C … 対象語が辞書に無い（AI検証へ。活用形・方言・表記ゆれの可能性）

出力: .cache/checked-<lang>.json ＋ 画面に集計
使い方: python3 crosscheck.py hi
"""
import json
import os
import re
import sys
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')

# 言語コード -> kaikki のファイル名に使う言語名
DICT_NAME = {
    'hi': 'Hindi', 'ar': 'Arabic', 'tl': 'Tagalog', 'it': 'Italian',
    'tr': 'Turkish', 'vi': 'Vietnamese', 'id': 'Indonesian', 'th': 'Thai',
    'pl': 'Polish', 'ru': 'Russian', 'pt': 'Portuguese', 'ko': 'Korean',
    'es': 'Spanish', 'fr': 'French', 'de': 'German',
}

STRIP_RE = re.compile(r'[\(\)\[\],;:.!?"“”]')


def norm_words(text):
    """語義文を単語集合に落とす（表記ゆれを吸収するための素朴な正規化）"""
    t = STRIP_RE.sub(' ', (text or '').lower())
    return set(w for w in t.split() if w)


def load_target_dict(code):
    """対象言語辞書を {語: [語義文,...]} に索引化"""
    path = os.path.join(CACHE, f'kaikki-{DICT_NAME[code]}.jsonl')
    idx = collections.defaultdict(list)
    with open(path, encoding='utf-8') as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except Exception:
                continue
            w = d.get('word')
            if not w:
                continue
            for s in d.get('senses', []):
                for g in (s.get('glosses') or []):
                    idx[w].append(g)
    return idx


def judge(en_word, target, idx):
    """A/B/C 判定と、根拠になった語義を返す"""
    glosses = idx.get(target)
    if not glosses:
        # 表記ゆれ（ダイアクリティカル記号や冠詞つき）を軽く吸収して再挑戦
        alt = target.strip().strip('ـ')
        glosses = idx.get(alt)
        if not glosses:
            return 'C', ''
    want = en_word.lower()
    for g in glosses:
        gw = norm_words(g)
        if want in gw:
            return 'A', g
    # 「to eat」のような不定詞表記、複合語の一部一致も許容する
    for g in glosses:
        if re.search(rf'\b{re.escape(want)}\b', (g or '').lower()):
            return 'A', g
    return 'B', glosses[0] if glosses else ''


def main(code):
    cand_path = os.path.join(CACHE, f'candidates-{code}.json')
    rows = json.load(open(cand_path, encoding='utf-8'))
    idx = load_target_dict(code)
    print(f'対象言語の辞書: {len(idx)} 語を索引化')

    out = []
    tally = collections.Counter()
    for r in rows:
        best = None
        for c in r['candidates']:
            verdict, evidence = judge(r['en'], c['target'], idx)
            c['verdict'] = verdict
            c['evidence'] = evidence[:120]
            # A を最優先、無ければ B、最後に C
            rank = {'A': 0, 'B': 1, 'C': 2}[verdict]
            if best is None or rank < best[0]:
                best = (rank, c)
        r['best'] = best[1] if best else None
        r['verdict'] = r['best']['verdict'] if r['best'] else 'C'
        tally[r['verdict']] += 1
        out.append(r)

    json.dump(out, open(os.path.join(CACHE, f'checked-{code}.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    total = sum(tally.values())
    print(f'\n=== 1段目(辞書どうしの突き合わせ) {code} ===')
    for v, label in (('A', '双方向一致（機械的に確実）'), ('B', '語義が不一致（AI検証へ）'), ('C', '辞書に無い（AI検証へ）')):
        n = tally[v]
        print(f'  {v}: {n:>5} 語 ({n/total*100:>5.1f}%)  {label}')
    print(f'  合計: {total} 語')


if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in DICT_NAME:
        print('使い方: python3 crosscheck.py hi')
        sys.exit(1)
    main(sys.argv[1])
