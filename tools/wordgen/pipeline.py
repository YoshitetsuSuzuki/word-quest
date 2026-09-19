#!/usr/bin/env python3
"""
pipeline.py  言語コードを渡すと、AI検証にかける候補語を機械工程だけで作る。

ヒンディー語で99%を達成した手順の 1〜4 を汎用化したもの:
  1. 対象言語の辞書から、同綴異義語・機能語・多義語・複合語を除外して候補を作る
  2. 日本語訳は「当アプリの検証済み英単語」→「EJDict」の順で引き、品詞の整合も見る
  3. wordfreq で現代の使用頻度が低い語(古語・造語・方言)を落とす  ★最重要
  4. 1英語概念1語・1日本語訳1語に絞り、既存収録語は除外する
出力: .cache/cand-<code>.json と .cache/batches_<code>/*.txt (AI検証用)

使い方: python3 pipeline.py ko es fr de pt ru pl
"""
import json
import os
import re
import sys
import glob
import collections

from wordfreq import zipf_frequency

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.cache')
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

# 言語コード -> (kaikkiの辞書名, アプリ内カテゴリ名)
LANGS = {
    'ko': ('Korean', 'korean'), 'es': ('Spanish', 'spanish'), 'fr': ('French', 'french'),
    'de': ('German', 'german'), 'pt': ('Portuguese', 'portuguese'), 'ru': ('Russian', 'russian'),
    'pl': ('Polish', 'polish'), 'hi': ('Hindi', 'hindi'), 'ar': ('Arabic', 'arabic'),
    'tl': ('Tagalog', 'tagalog'), 'it': ('Italian', 'italian'),
    'mn': ('Mongolian', 'mongolian'), 'bn': ('Bengali', 'bengali'),
}
BAD_POS = {'conj', 'prep', 'postp', 'particle', 'pron', 'num', 'det', 'intj', 'prefix',
           'suffix', 'infix', 'character', 'punct', 'symbol', 'name', 'phrase', 'proverb', 'article'}
OK_POS = {'noun', 'verb', 'adj', 'adv'}
BAD_TAG = {'obsolete', 'archaic', 'rare', 'dialectal', 'slang', 'vulgar', 'offensive',
           'nonstandard', 'misspelling', 'historical', 'poetic', 'literary'}
SKIP = re.compile(r'^(inflection|alternative|plural of|singular of|synonym of|romanization|'
                  r'abbreviation|initialism|acronym|feminine of|masculine of|diminutive of|'
                  r'obsolete|past participle|present participle|gerund)', re.I)
BAD_CHAR = re.compile(r'[〈〉《》〔〕（）()=\[\]A-Za-z0-9…‥·]')
ZIPF_MIN = 2.0   # 現代語のしきい値（これ未満は古語・造語・方言とみなす）


# wordfreq が使えない言語(韓国語など)は、頻度リストの順位で代用する
_FREQ_LIST = {}


def _load_freq_list(code):
    if code in _FREQ_LIST:
        return _FREQ_LIST[code]
    path = os.path.join(CACHE, f'{code}_50k.txt')
    d = {}
    if os.path.exists(path):
        for i, line in enumerate(open(path, encoding='utf-8')):
            p = line.split()
            if p:
                d.setdefault(p[0], i + 1)
    _FREQ_LIST[code] = d
    return d


def _rank_to_score(rank):
    """順位1位を6.0、5万位を2.0あたりに写す"""
    import math
    return max(0.0, 6.0 - math.log10(max(rank, 1)) * 0.9)


_STEM_BEST = {}


def _korean_stem_rank(word, freq):
    """韓国語の用言は辞書形「〜다」が字幕コーパスにほぼ出ない。
    語幹から始まる活用形の最上位順位で代用する。"""
    if not word.endswith('다') or len(word) < 2:
        return None
    stem = word[:-1]
    if stem in _STEM_BEST:
        return _STEM_BEST[stem]
    best = None
    for k, r in freq.items():
        if k.startswith(stem) and (best is None or r < best):
            best = r
    _STEM_BEST[stem] = best
    return best


# wordfreq が持たない言語。指定しても近い言語にすり替えられて無意味な値になるため、
# 自前の頻度リスト(.cache/<code>_50k.txt)だけを使う。
NO_WORDFREQ = {'mn'}


def modern_score(word, code):
    """現代で使われる語かを表す指標。wordfreq の zipf 値に揃える。"""
    if code in NO_WORDFREQ:
        freq = _load_freq_list(code)
        rank = freq.get(word) or (_korean_stem_rank(word, freq) if code == 'ko' else None)
        return _rank_to_score(rank) if rank else 0.0
    try:
        return zipf_frequency(word, code)
    except Exception:
        freq = _load_freq_list(code)
        rank = freq.get(word)
        if not rank and code == 'ko':
            rank = _korean_stem_rank(word, freq)
        if not rank:
            return 0.0
        return _rank_to_score(rank)


def load_ja_sources():
    """①当アプリの検証済み英単語 ②EJDict を読み込む"""
    wb = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'public/wordbank/english/level-*.json'))):
        for q in json.load(open(f, encoding='utf-8')):
            m = re.match(r'^「(.+?)」', q.get('prompt', ''))
            if m and q.get('verified'):
                wb.setdefault(m.group(1).lower(), q['answer'])
    ej = collections.defaultdict(list)
    for line in open(os.path.join(ROOT, '.cache', 'ejdict-all.txt'), encoding='utf-8'):
        if '\t' in line:
            w, m = line.rstrip('\n').split('\t', 1)
            ej[w.strip().lower()].append(m.strip())
    return wb, ej


def clean_ja(s):
    s = re.sub(r'《[^》]*》|〔[^〕]*〕|〈[^〉]*〉|\([^)]*\)|（[^）]*）', '', s)
    return s.split('・')[0].split(',')[0].split('、')[0].strip(' 　:：;；')


def ok_ja(s, pos):
    """訳語として使えるか（記号混入・品詞不一致を弾く）"""
    if not s or len(s) > 12 or BAD_CHAR.search(s):
        return False
    verbish = bool(re.search(r'(する|れる|られる|む|ぐ|ぶ|つ|ぬ|く|う|る)$', s))
    if pos == 'noun' and verbish and not re.search(r'(さ|み|け|り|物|者|人|事)$', s):
        return False
    if pos == 'verb' and not verbish:
        return False
    if pos == 'adj' and not re.search(r'(い|な|的)$', s):
        return False
    return True


def ja_of(head, pos, wb, ej):
    cands = []
    if head in wb:
        cands.append((wb[head], 'アプリ検証済み'))
    for m in ej.get(head, []):
        core = re.findall(r'『(.+?)』', m)
        for c in (core if core else re.split(r'[/;]', m)):
            cands.append((clean_ja(c), 'EJDict'))
    for s, src in cands:
        if ok_ja(s, pos):
            return s, src
    return '', ''


def clean_en(g):
    g = re.sub(r'\([^)]*\)', '', g)
    g = re.sub(r'\s+', ' ', g).strip(' ,;')
    return g.split(',')[0].split(';')[0].strip()


def run(code, wb, ej):
    name, category = LANGS[code]
    dict_path = os.path.join(CACHE, f'kaikki-{name}.jsonl')
    if not os.path.exists(dict_path):
        print(f'{name}: 辞書が未取得のためスキップ')
        return
    # 既に収録済みの語（重複追加を防ぐ）
    existing = set()
    for f in glob.glob(os.path.join(ROOT, f'public/wordbank/{category}/level-*.json')):
        for q in json.load(open(f, encoding='utf-8')):
            m = re.match(r'^「(.+?)」', q.get('prompt', ''))
            if m:
                existing.add(m.group(1))
    # 英語起点の対訳表（照合用）
    a_map = collections.defaultdict(set)
    cf = os.path.join(CACHE, f'candidates-{code}.json')
    if os.path.exists(cf):
        for r in json.load(open(cf, encoding='utf-8')):
            for c in r['candidates']:
                a_map[c['target']].add(r['en'])

    ents = collections.defaultdict(list)
    for line in open(dict_path, encoding='utf-8'):
        try:
            d = json.loads(line)
        except Exception:
            continue
        if d.get('word'):
            ents[d['word']].append(d)

    rows = []
    drop = collections.Counter()
    for w, es in ents.items():
        if w in existing:
            drop['収録済み'] += 1
            continue
        if ' ' in w or '-' in w:
            drop['複合語'] += 1
            continue
        if any(e.get('pos') in BAD_POS for e in es):
            drop['機能語'] += 1
            continue
        ok = []
        for e in es:
            if e.get('pos') not in OK_POS:
                continue
            gl = [(s.get('glosses') or [None])[0] for s in e.get('senses', [])
                  if s.get('glosses') and not SKIP.match(s['glosses'][0])
                  and not set(s.get('tags') or []) & BAD_TAG]
            if gl:
                ok.append((e, gl))
        if not ok:
            drop['語義なし'] += 1
            continue
        if len(ok) > 1 and len({e['pos'] for e, _ in ok}) > 1:
            drop['同綴異義'] += 1
            continue
        e, gl = ok[0]
        # 語義は「to arrive; to come; to reach」のように同義語を並べることがある。
        # 語数を数えるのは「;」「,」で切った最初の語義だけにする(長文の誤判定を防ぐ)
        first_sense = re.split(r'[;,/(]', gl[0])[0].strip()
        if len(gl) > 2 or len(first_sense.split()) > 4:
            drop['多義・長文'] += 1
            continue
        if modern_score(w, code) < ZIPF_MIN:      # ★現代語フィルタ
            drop['現代で使われない'] += 1
            continue
        head = re.sub(r'^(to|a|an|the)\s+', '', re.split(r'[;,/(]', gl[0])[0].strip().lower())
        if ' ' in head:
            drop['英語側が句'] += 1
            continue
        ja, src = ja_of(head, e['pos'], wb, ej)
        if not ja:
            drop['訳が基準未満'] += 1
            continue
        en = clean_en(gl[0])
        if not en or '(' in en or len(en) > 28:
            drop['英訳が壊れている'] += 1
            continue
        both = bool(a_map.get(w) and any(re.search(rf'\b{re.escape(x)}\b', ' '.join(gl).lower())
                                         for x in a_map[w]))
        ipa = [s.get('ipa') for s in (e.get('sounds') or []) if s.get('ipa')]
        rows.append({'word': w, 'pos': e['pos'], 'ipa': ipa[0] if ipa else '', 'en': head,
                     'en_clean': en, 'ja': ja, 'ja_src': src, 'both': both,
                     'in_a': bool(a_map.get(w)), 'zipf': round(modern_score(w, code), 1),
                     'score': (3 if both else 0) + (1 if a_map.get(w) else 0)
                              + (1 if src == 'アプリ検証済み' else 0)})
    # 重複排除: 1英語概念1語 / 1日本語訳1語 / 1英訳1語
    def pick_unique(items, key):
        by = collections.defaultdict(list)
        for r in items:
            by[key(r)].append(r)
        return [sorted(g, key=lambda x: (-x['score'], -x['zipf']))[0] for g in by.values()]
    rows = pick_unique(rows, lambda r: r['en'])
    rows = pick_unique(rows, lambda r: r['ja'])
    rows = pick_unique(rows, lambda r: r['en_clean'])
    rows.sort(key=lambda r: (-r['score'], -r['zipf']))

    json.dump(rows, open(os.path.join(CACHE, f'cand-{code}.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    bdir = os.path.join(CACHE, f'batches_raw_{code}')  # 判定用(make_batches.py)と混ざらないよう別名
    os.makedirs(bdir, exist_ok=True)
    for f in glob.glob(os.path.join(bdir, '*')):
        os.remove(f)
    N = 200
    for i in range(0, len(rows), N):
        with open(os.path.join(bdir, f'{code}-{i//N+1:02d}.txt'), 'w', encoding='utf-8') as fh:
            for r in rows[i:i + N]:
                fh.write(f"{r['word']}\t{r['pos']}\t{r['ja']}\t{r['en_clean']}\n")
    print(f'{name:<12} 既存 {len(existing):>5} 語 → 追加候補 {len(rows):>5} 語 '
          f'({(len(rows)+N-1)//N} バッチ)  主な除外: '
          + ', '.join(f'{k}{v}' for k, v in drop.most_common(3)))


if __name__ == '__main__':
    codes = [a for a in sys.argv[1:] if a in LANGS]
    if not codes:
        print('使い方: python3 pipeline.py ko es fr de pt ru pl')
        sys.exit(1)
    wb, ej = load_ja_sources()
    print(f'日本語訳の土台: 検証済み英単語 {len(wb)} 語 / EJDict {len(ej)} 見出し\n')
    for c in codes:
        run(c, wb, ej)
