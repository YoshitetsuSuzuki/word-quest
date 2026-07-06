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
