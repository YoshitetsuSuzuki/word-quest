# dictionary-audit — 自動辞書照合・品質保証パイプライン

10万語規模でも品質を維持するための、**非破壊**の外部辞書照合QAパイプライン。
元データ（`public/wordbank/`）は**一切変更しない**。照合・検証・レポート生成のみを自動化する。

## 原則（厳守）

1. 元データを書き換えない（読み取りのみ）
2. 辞書本文をコピー/再配布しない（**照合専用**）
3. 辞書未確認を「確認済み」にしない → `not_checked` を維持
4. 存在しない辞書情報・URL・ライセンスを書かない
5. 使用辞書のライセンスを記録する（`config/licenses.json`）
6. 取得した辞書レスポンスは `cache/` にキャッシュ（再実行を高速化・API負荷減）
7. API制限を考慮（レート制限 約1req/s＋429バックオフ再試行）
8. 10万語でも動く（サンプリング/バッチ/オフセット/キャッシュ/順次処理）

## ディレクトリ

```
tools/dictionary-audit/
  README.md
  config/
    languages.json     # 言語別設定(構造・辞書ソース・品詞マップ)。将来言語もここに追記
    licenses.json      # 辞書ライセンス台帳
  cache/               # 辞書レスポンスのキャッシュ(gitignore)
  reports/             # 生成レポート(<lang>.json/.md, summary.json/.md)
  shared/
    dictionary-loader.mjs      # 辞書取得+キャッシュ+レート制御(Wiktionary REST / CC-CEDICT)
    matcher.mjs                # 見出し存在・品詞一致
    gloss-checker.mjs          # 英語グロス・日本語訳
    example-checker.mjs        # 例文(文法/語義/訳/安全性)
    pronunciation-checker.mjs  # 発音
    reporter.mjs               # レポート/サマリ生成
    runner.mjs                 # 1言語実行の共通ロジック
  check-english.mjs 〜 check-russian.mjs   # 各言語CLI(9言語)
  run-all.mjs                              # 全言語→summary
```

## 使い方

```bash
# 1言語(既定は先頭40件サンプル。API負荷に配慮)
node tools/dictionary-audit/check-english.mjs
node tools/dictionary-audit/check-chinese.mjs

# 全件 / 件数指定 / 開始位置 / 個別ID / ネット無効(キャッシュのみ)
node tools/dictionary-audit/check-english.mjs --all
node tools/dictionary-audit/check-english.mjs --limit 200 --offset 400
node tools/dictionary-audit/check-english.mjs --ids en-00042,en-00048
node tools/dictionary-audit/check-english.mjs --no-net

# 全言語→ reports/summary.json / summary.md
node tools/dictionary-audit/run-all.mjs --limit 50
```

## 判定項目（各単語）

| 項目 | 状態 |
|---|---|
| 1 見出し語存在 | matched / not_found / multiple_entries / not_checked |
| 2 品詞一致 | exact / compatible / different / missing / not_checked |
| 3 英語グロス | exact / partial / different / not_applicable / not_checked |
| 4 日本語訳 | exact / compatible / different / not_applicable / **not_checked**(JA辞書未配置) |
| 5 発音 | matched / different / missing / not_applicable / not_checked |
| 6 例文 | grammar_ok / sense_ok / translation_ok / **unsafe** / review / missing / not_applicable |

総合判定 `verdict`: **critical**（危険例文/見出し無/品詞相違/英語義相違）/ **review**（未確認・部分一致等）/ **ok**。

## 対応辞書と言語

- **Wiktionary REST API**（英語版・全言語の英語定義/品詞）: 主力。CC-BY-SA。ネット必要・レート制限あり。
- **CC-CEDICT**（中国語・拼音/gloss）: `cache/cedict_ts.u8` にローカル配置時のみ。
- **WordNet / Kaikki**: ローカル配置時に有効化する拡張枠（IPA照合や英語第2ソース）。未配置なら使用しない。

| 言語 | 構造 | 辞書 |
|---|---|---|
| English/Chinese/Korean | ja_answer(和訳/例文/発音/品詞あり) | Wiktionary(+CEDICT:中) |
| Spanish/German/French/Portuguese/Polish/Russian | pivot(answer=英語, glosses{en,ja}) | Wiktionary |

未対応（将来追加可）: Italian, Dutch, Arabic, Thai, Vietnamese — `config/languages.json` に1エントリ追記＋`public/wordbank/<dir>` 用意で対応。

## 10万語運用

- 既定はサンプル照合。定期的に `--offset` をずらしてバッチ巡回、または夜間に `--all`。
- キャッシュにより再実行は高速。大規模はネットWiktionaryではなく**ローカルKaikki/CC-CEDICTダンプ**を配置して使うのが安全（レート制限回避・継承ライセンスは照合専用に限定）。
- レポートは言語別＋summaryで一致率・危険例文・要確認・重大件数を集計。

## ライセンス方針

照合専用なら継承義務は発生しにくい。辞書本文をアプリデータへ**取り込む**場合は、CC-BY-SA（Wiktionary/CEDICT/Kaikki）の継承に注意し、取り込みは CC-BY（Tatoeba）や寛容ライセンス（WordNet）を優先する。詳細は `config/licenses.json`。
