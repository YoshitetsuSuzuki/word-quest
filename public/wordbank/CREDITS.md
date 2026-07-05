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
- 例文は付与していません（将来 Tatoeba(CC BY) 等での追加を想定）。
