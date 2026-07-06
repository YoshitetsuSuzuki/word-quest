# ワードバンク データ出典・ライセンス

英単語データ（`wordbank/english/`）は、以下の資料を `tools/build-wordbank.mjs` で
加工・生成したものです。頻出コア語は `tools/overrides.english.json`（人手検証済み）で上書きしています。

## 英単語 → 日本語訳（主要ソース）

- **EJDict（英和辞書）** — パブリックドメイン（著作権なし）
  - https://github.com/kujirahand/EJDict
  - 英単語が見出しの英和辞書。先頭の語義（`『』`が核となる訳語）を素直に1対1で採用。
  - 固有名詞は大文字見出しのため、小文字語のみ照合することで自動的に除外している。
- **ipa-dict (en_US)** — Open license（MIT）※発音記号（IPA）の付与
  - https://github.com/open-dict-data/ipa-dict

## 例文（英日対訳）

- **Tatoeba** — CC-BY 2.0 FR（https://tatoeba.org/）
  - https://downloads.tatoeba.org/exports/per_language/ の eng/jpn エクスポート
    （eng_sentences / jpn_sentences / eng-jpn_links）を使用。
  - 人間が書いた英日対訳文ペアをそのまま採用（文の改変・自作はしていない）。
  - `tools/build-examples-english.mjs` が単語ごとに最適な1文を選定し、
    `Question.example` に「英文 — 日本語訳」形式で付与している。

## 出題語の選定・級分け

- **NGSL (New General Service List)** — Browne, Culligan & Phillips（CC BY-SA）
  - 学習者向けの核語彙。http://www.newgeneralservicelist.org/
- **google-10000-english** — Google Trillion Word Corpus 由来の頻度リスト（MIT）※NGSL超の拡張
  - https://github.com/first20hours/google-10000-english
- **FrequencyWords (en_50k, 2018)** — Hermit Dave（CC BY 4.0）※Lv6-7 候補プール拡張
  - https://github.com/hermitdave/FrequencyWords （OpenSubtitles 2018 コーパス由来の頻度リスト）
  - Lv6-7 は全語 `verified:false` の候補プールであり、人手レビューで昇格するまで出題されません。

## 品質に関する注記

- 訳語は英和辞書の主要語義に基づく1対1対応で、違和感の少ない自然な訳になっています。
- 頻出コア語（約220語）は `overrides.english.json` で人手検証済みの訳に固定。
- 稀に、裾野の語で「語義がやや専門的」「ダミー選択肢の分野が揃わない」場合があります。
  overrides への追記で継続的に改善できます。
- 例文は Tatoeba の対訳ペアから機械選定したもので、約9割の検証済み語に付与済み。
  同綴り異義語（saw/left 等の不規則過去形と同綴りの見出し語）は語義の取り違えを
  避けるため意図的に例文を付与していません。

---

# 日本語（`wordbank/japanese/`）

日本語学習ターゲット（JLPT N5）は `tools/build-japanese.mjs` で生成します。

## 出題語の選定・級分け

- **JLPT N5 語彙リスト** — jamsinclair/open-anki-jlpt-decks（MIT ライセンス）
  - https://github.com/jamsinclair/open-anki-jlpt-decks
  - `src/n5.csv`（列: expression, reading, meaning, tags, guid）から
    表記(expression)と読み(reading=かな)を抽出し、level は N5=1 固定で採用。
  - 再取得手順（`.cache` は git 管理外のため）:
    ```
    curl -sL https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/master/src/n5.csv -o .cache/jlpt-n5.csv
    ```
    上記CSVを `[{ word, kana, level:1 }]` に正規化して `.cache/jlpt-n5.json` に保存。

## 英語グロス（意味）

- **JMdict（JP→EN 辞書）** — EDRDG（Electronic Dictionary Research and Development Group）
  - ライセンス: **CC BY-SA 4.0**（https://www.edrdg.org/edrdg/licence.html）
  - https://github.com/scriptin/jmdict-simplified の
    `jmdict-eng-common-3.6.2.json`（common語のみ、構造: `data.words[]`）を使用。
  - 各 JLPT 語を表記（無ければかな）で JMdict 照合し、先頭 sense 中心に
    英語 gloss 候補（最大4件・重複除去）を `tools/gloss.en.japanese.candidates.json` に出力。
  - 英訳の確定（`tools/gloss.en.japanese.json`）は別タスク。確定版が存在する見出しのみ
    Question 化して出荷する（現時点では 0 語）。
  - 発音は かな→ヘボン式ローマ字（マクロン不使用の可読性優先変換）で付与。

---

# スペイン語（`wordbank/spanish/`）

英語圏ユーザーがスペイン語を **英語の訳（gloss）** で学べるターゲットです。
`tools/build-spanish.mjs` で生成します。方式は中国語/日本語の英語グロスと同じ
「権威辞書を錨に中心義を確定」です。正確性優先で、辞書に無い語・中心義が
曖昧な語（形容詞の女性形屈折など）は非出荷にしています。

## 出題語の選定・級分け

- **FrequencyWords (es_50k, 2018)** — Hermit Dave（**CC BY 4.0**）
  - https://github.com/hermitdave/FrequencyWords （OpenSubtitles 2018 コーパス由来の頻度リスト）
  - 再取得手順（`.cache` は git 管理外のため）:
    ```
    curl -sL https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt -o .cache/es_50k.txt
    ```
  - 形式は `word count`（頻度順）。小文字化・スペイン語文字のみ・3文字以上・
    高頻度機能語（冠詞/前置詞/代名詞/接続詞/助動詞など）除外でフィルタし、
    頻度順に上位から中心義が確定した語を採用。Lv1〜Lv5 へ概ね均等分割。

## 英語グロス（意味）

- **Wiktionary / Wiktextract（kaikki.org）Spanish** — テキストは **CC BY-SA 4.0**
  - https://kaikki.org/dictionary/Spanish/ （Wiktextract による Wiktionary の機械可読化データ）
  - 再取得手順:
    ```
    curl -sL https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl -o .cache/es_dict.jsonl
    ```
  - 1行1エントリの JSONL（`word` / `pos` / `senses[].glosses[]` / `senses[].tags[]`）。
    各候補語を辞書照合し、品詞優先（動詞→名詞→形容詞→副詞→数詞）で
    英語の中心義1つを確定。動詞は `to ...` 形、名詞は素の名詞、形容詞は形容詞。
    括弧注記・用例・obsolete/archaic/slang/dialectal 等のタグ付き語義・
    活用形注記（"only used in ...", "form of ..."）・スラッシュ併記綴りは除外。
  - `tools/gloss.en.spanish.json`（`{ スペイン語: english gloss }`）が確定訳。
    Question 化して出荷するのはこの確定版に存在する見出しのみで、全て `verified:true`。

## 品質に関する注記

- 訳語は Wiktionary の中心義に基づく1対1対応。
- 形容詞の女性形屈折（nueva, alta, mala 等）は辞書が無関係な名詞義を先頭に持ち
  誤訳になるため、明示的に非出荷（cara=face, comida=food のような独立名詞は保持）。

---

# ドイツ語（`wordbank/german/`）

英語圏ユーザーがドイツ語を **英語の訳（gloss）** で学べるターゲットです。
`tools/build-german.mjs` で生成します。方式はスペイン語と同じ
「権威辞書（Wiktextract）を錨に中心義を確定」です。正確性優先で、辞書に無い語・
中心義が曖昧な語（活用形が同綴の稀な名詞義に化けるケースなど）は非出荷にしています。

## 出題語の選定・級分け

- **FrequencyWords (de_50k, 2018)** — Hermit Dave（**CC BY 4.0**）
  - https://github.com/hermitdave/FrequencyWords （OpenSubtitles 2018 コーパス由来の頻度リスト）
  - 再取得手順（`.cache` は git 管理外のため）:
    ```
    curl -sL https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt -o .cache/de_50k.txt
    ```
  - 形式は `word count`（頻度順）。小文字化・ドイツ語文字（a-zäöüß）のみ・3文字以上・
    高頻度機能語（冠詞/前置詞/代名詞/接続詞/助動詞とその活用形など）除外でフィルタし、
    頻度順に上位から中心義が確定した語を採用。Lv1〜Lv5 へ概ね均等分割（計 約2,000語）。
  - ドイツ語名詞は語頭大文字が正書法のため、**表示見出しは辞書の原表記**（名詞は大文字）を
    採用し、頻度リストとの突合のみ小文字化して行っている。

## 英語グロス（意味）

- **Wiktionary / Wiktextract（kaikki.org）German** — テキストは **CC BY-SA 4.0**
  （Wiktionary 由来のため GFDL とのデュアルライセンス）
  - https://kaikki.org/dictionary/German/ （Wiktextract による Wiktionary の機械可読化データ）
  - 再取得手順（約1GBの JSONL。全ダウンロードせず curl でストリーム走査して該当行のみ抽出）:
    ```
    curl -sL https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl | \
      node .cache/extract-de-dict.mjs   # 小文字化見出し→{pos:{head,glosses[]}} 索引を .cache/de-gloss-index.json に生成
    ```
  - 1行1エントリの JSONL（`word` / `pos` / `senses[].glosses[]`）。抽出時に
    屈折・派生説明の gloss（gerund / plural of / inflection of / comparative of など）を除去。
  - build 側で品詞優先（動詞→形容詞→名詞→副詞）で英語の中心義1つを確定。
    動詞は `to ...` 形、名詞は素の名詞（大文字原表記）、形容詞は形容詞。
    括弧注記・定義文（5語以上や `:`・`e.g.` を含む説明）・比較級/最上級/派生の
    メタ説明（"comparative degree of", "female equivalent of", "agent noun of" 等）は非出荷。
  - `tools/gloss.en.german.json`（`{ ドイツ語(原表記): english gloss }`）が確定訳。
    Question 化して出荷するのはこの確定版に存在する見出しのみで、全て `verified:true`。

## 品質に関する注記

- 訳語は Wiktionary の中心義に基づく1対1対応。
- 機能語の活用形が同綴の稀な名詞/動詞義に化けるケース（einen→to unite、über→left over 等）は
  誤解を招くため、該当する高頻度機能語とその活用形を明示的に非出荷にしている。

---

# フランス語（`wordbank/french/`）— 英語圏ユーザー向け（仏→英）

英語圏ユーザーがフランス語を **英語の訳（gloss）** で学べるターゲットです。
`tools/build-french.mjs` で生成します。方式はスペイン語/ドイツ語と同じ
「権威辞書（Wiktextract）を錨に中心義を確定」です。prompt/answer/glosses.en は
すべて英語。正確性優先で、辞書に無い語・中心義が曖昧な語（過去分詞/現在分詞が
名詞化した同綴り語など）は非出荷にしています。

## 出題語の選定・級分け

- **FrequencyWords (fr_50k, 2018)** — Hermit Dave（**CC BY 4.0**）
  - https://github.com/hermitdave/FrequencyWords （OpenSubtitles 2018 コーパス由来の頻度リスト）
  - 再取得手順（`.cache` は git 管理外のため）:
    ```
    curl -sL https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/fr/fr_50k.txt -o .cache/fr_50k.txt
    ```
  - 形式は `word count`（頻度順）。小文字化・フランス語文字（アクセント含む）のみ・
    3文字以上・高頻度機能語（冠詞/前置詞/代名詞/接続詞/助動詞など）・卑語・固有名詞除外で
    フィルタし、頻度順に上位から中心義が確定した語を採用。Lv1〜Lv5 へ均等分割（各400語・計2,000語）。

## 英語グロス（意味）

- **Wiktionary / Wiktextract（kaikki.org）French** — テキストは **CC BY-SA 4.0**
  （Wiktionary 由来のため GFDL とのデュアルライセンス）
  - https://kaikki.org/dictionary/French/ （Wiktextract による Wiktionary の機械可読化データ）
  - 再取得手順（約560MBの JSONL）:
    ```
    curl -sL https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl -o .cache/kaikki-french.jsonl
    ```
  - `build-french.mjs` が初回にこの JSONL を索引化し `.cache/fr-en-index.json`
    （仏語見出し(小文字) → `[{gloss, pos, tags}]`）を生成・キャッシュする。
    活用形（`form-of` 等のタグが付く語形）は索引段階で除外。
  - POS（noun/verb/adj/adv）ごとに、辞書メタ記述・説明文になっている gloss を弾き、
    「クリーンな中心義を持つ sense 数が最多の POS」の先頭義を採用（同数時は adj>verb>noun>adv）。
    gloss は注記（括弧・角括弧・`;`以降・`, etc.`）を除去し、名詞は冠詞（a/an/the）を落として素に、
    動詞は `to ...` に正規化。5語超・説明文的な gloss は「曖昧」とみなし非出荷。
  - 頻出コア語で辞書の先頭義が最頻義とズレる語・同綴り異義（過去分詞/現在分詞が名詞化した語など）は、
    `build-french.mjs` 内の人手検証済みオーバーライドで中心義を固定、または非出荷（値 `null`）に指定。
  - `tools/gloss.en.french.json`（`{ フランス語: english gloss }`）が確定訳。
    Question 化して出荷するのはこの確定版に存在する見出しのみで、全て `verified:true`。

## 品質に関する注記

- 訳語は Wiktionary の中心義に基づく1対1対応。
- 過去分詞/現在分詞が同綴りの稀な名詞・専門義に化けるケース（donné→affordable、
  aimé→beloved 等）や、辞書先頭義が最頻義でない語（merci→mercy を thank you に、
  accord→chord を agreement に 等）は、明示的なオーバーライドで正しい中心義に固定
  または非出荷にしている。
