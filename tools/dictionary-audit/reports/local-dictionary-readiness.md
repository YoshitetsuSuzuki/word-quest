# 現行パイプライン調査（第1段階）

作成: 2026-07-16 / 対象: tools/dictionary-audit/（既存を作り直さず拡張する前提の現状把握）

## 既存の辞書ローダー
`shared/dictionary-loader.mjs`。Wiktionary REST API（en.wiktionary.org）＋ CC-CEDICT(ローカル)。正規化返り値 `{found,status,source,license,entries:[{pos,glosses,ipa}]}`。レート制御(約1req/s)＋429リトライ＋キャッシュ。

## 既存キャッシュ方式
`cache/<source>/<lang>/<base64url(word)>.json`。ネット取得成功時のみ保存。エラー/未取得は保存せず(再試行可)。`cache/` は `.gitignore` 済み。

## 既存の言語設定
`config/languages.json`。9言語＋将来5言語。`structure`(ja_answer/pivot)・`wiktLang`・`sources`・`posMap`・`sampling`。

## 既存のCLI引数
`--all / --limit / --offset / --ids / --no-net`（run-all も同様）。本拡張で `--local-only / --resume / --restart / --batch-size` を追加。

## 現在の照合項目
見出し語・品詞・英語グロス・日本語訳・発音・例文（`shared/matcher/gloss-checker/pronunciation-checker/example-checker`）。日本語訳と発音はネットWiktionaryにIPA/JAが乏しく `not_checked` が多い。

## 現在ネットアクセスが必須な処理
Wiktionary REST 取得（`dictionary-loader.lookupWiktionary`）。キャッシュ未ヒット時のみネット。

## ローカル辞書へ切り替え可能な処理
見出し・品詞・英語グロス・発音の照合は、正規化済みローカル辞書（Kaikki/CC-CEDICT/WordNet）で完全にオフライン化可能。→ 本拡張で `--local-only` を新設し、`shared/local-engine.mjs`＋`index-store` に切替。

## 修正が必要（＝拡張した）ファイル
- `shared/runner.mjs`: `--local-only/--resume/--restart/--batch-size` を parseArgs に追加、localOnly 時 `local-engine` へ委譲。
- `run-all.mjs`: localOnly 時に `full-reporter` で全件レポート生成。
- `shared/example-checker.mjs`: 安全性判定を単語境界一致へ（部分文字列誤検知を除去）。
- 新規: download/verify/normalize/build-indexes、`shared/index-store`・`shared/local-engine`・`shared/full-reporter`・`shared/normalizers/*`、`config/sources.json`・`config/dictionary-sources-verified.json`。

## 実データ件数（再集計）
英8136/中4201/韓1529/西1948/独1919/仏1948/葡150/波150/露150 = **20,131**（指定と一致）。
