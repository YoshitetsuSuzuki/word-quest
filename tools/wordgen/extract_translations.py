#!/usr/bin/env python3
"""
extract_translations.py  英語Wiktionary(kaikki)の対訳表から、対象言語の候補語を抽出する。

考え方:
  このアプリが持つ「検証済み英単語 + 日本語訳」(public/wordbank/english/) を意味の土台にし、
  英語見出し語の translations から対象言語の語を引く。
  逆向き(対象言語→英語→日本語)だと同綴異義語で取り違えるため、必ずこの向きで引く。

出力: .cache/candidates-<lang>.json
  [{ en, ja, difficulty, ipa_en, sense, target, target_roman }, ...]

使い方: python3 extract_translations.py hi        # ヒンディー語
        python3 extract_translations.py ar tl hi  # まとめて
"""
import json
import gzip
import glob
import re
import sys
import os
import collections

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
EN_DICT = os.path.join(CACHE, 'kaikki-English.jsonl.gz')

# 対象言語コード -> 表示名（kaikki の translations[].code と一致させる）
LANGS = {
    'hi': 'ヒンディー語', 'ar': 'アラビア語', 'tl': 'タガログ語',
    'it': 'イタリア語', 'tr': 'トルコ語', 'vi': 'ベトナム語',
    'id': 'インドネシア語', 'th': 'タイ語',
    'pl': 'ポーランド語', 'ru': 'ロシア語', 'pt': 'ポルトガル語',
    'ko': '韓国語', 'es': 'スペイン語', 'fr': 'フランス語', 'de': 'ドイツ語',
}


def load_english_wordbank():
    """{英単語: {ja, difficulty, ipa}} を返す（このアプリの検証済みデータ）"""
    out = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'public/wordbank/english/level-*.json'))):
        for q in json.load(open(f, encoding='utf-8')):
            m = re.match(r'^「(.+?)」', q.get('prompt', ''))
            if not m:
                continue
            w = m.group(1).strip().lower()
            # 同じ語が複数レベルにある場合は、やさしい方(先に出た方)を優先
            if w in out:
                continue
            out[w] = {
                'ja': q.get('answer', ''),
                'difficulty': q.get('difficulty', 1),
                'ipa': q.get('pronunciation', ''),
                'verified': bool(q.get('verified')),
            }
    return out


def main(codes):
    wb = load_english_wordbank()
    print(f'英単語データ: {len(wb)} 語を意味の土台にします')
    want = set(codes)
    # lang -> en_word -> [records]
    hits = {c: collections.defaultdict(list) for c in want}
    seen_entries = 0

    with gzip.open(EN_DICT, 'rt', encoding='utf-8') as fh:
        for line in fh:
            try:
                d = json.loads(line)
            except Exception:
                continue
            seen_entries += 1
            w = (d.get('word') or '').strip().lower()
            if w not in wb:
                continue
            trs = d.get('translations') or []
            if not trs:
                continue
            pos = d.get('pos', '')
            for t in trs:
                c = t.get('code')
                if c not in want:
                    continue
                tw = (t.get('word') or '').strip()
                if not tw:
                    continue
                hits[c][w].append({
                    'target': tw,
                    'roman': t.get('roman', ''),
                    'sense': (t.get('sense') or '')[:120],
                    'pos': pos,
                    'tags': t.get('tags') or [],
                })

    os.makedirs(CACHE, exist_ok=True)
    for c in sorted(want):
        rows = []
        for en, cands in hits[c].items():
            info = wb[en]
            rows.append({
                'en': en,
                'ja': info['ja'],
                'difficulty': info['difficulty'],
                'ipa_en': info['ipa'],
                'en_verified': info['verified'],
                'candidates': cands,
            })
        rows.sort(key=lambda r: (r['difficulty'], r['en']))
        out = os.path.join(CACHE, f'candidates-{c}.json')
        json.dump(rows, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        n_multi = sum(1 for r in rows if len(r['candidates']) > 1)
        print(f'{LANGS.get(c, c):<12} 見出し {len(rows):>5} 語 / 訳候補が複数ある語 {n_multi:>5} → {os.path.relpath(out, ROOT)}')
    print(f'(英語辞書 {seen_entries} 見出しを走査)')


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a in LANGS]
    if not args:
        print('使い方: python3 extract_translations.py hi ar tl ...')
        sys.exit(1)
    main(args)
