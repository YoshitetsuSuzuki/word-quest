# 第8段階: 元データを変更していないことの確認

## 判定

**元データに変更あり（要確認）**

## public/wordbank/ 配下の変更

```
 M public/wordbank/malay/level-2.json
 M public/wordbank/malay/level-3.json
 M public/wordbank/malay/manifest.json
 M public/wordbank/turkish/level-2.json
 M public/wordbank/turkish/level-3.json
 M public/wordbank/turkish/manifest.json
?? public/wordbank/esperanto/
?? public/wordbank/vietnamese/
```

## 今回のチェックで作成したファイル

- `tools/release-check/` … 検査コード（stage1〜8）
- `release-check/` … 検査レポート

いずれも監査レポートとテストコードのみ。アプリのソースコードと単語データは変更していない。

## git status（全体）

```
M public/wordbank/malay/level-2.json
 M public/wordbank/malay/level-3.json
 M public/wordbank/malay/manifest.json
 M public/wordbank/turkish/level-2.json
 M public/wordbank/turkish/level-3.json
 M public/wordbank/turkish/manifest.json
 M release-check/content-safety.json
 M release-check/content-safety.md
 M release-check/data-integrity.json
 M release-check/data-integrity.md
 M release-check/manual-sample.csv
 M release-check/manual-sample.json
 M release-check/question-engine-test.json
 M release-check/question-engine-test.md
 M release-check/unresolved-items.json
 M release-check/unresolved-items.md
 M src/data/categories.ts
 M src/i18n/en.ts
 M src/i18n/ja.ts
 M src/i18n/types.ts
 M src/repositories/LocalQuestionRepository.ts
 M src/types/index.ts
 M src/utils/speech.ts
 M tools/release-check/stage1-integrity.mjs
 M tools/release-check/stage2-engine.test.ts
 M tools/release-check/stage3-4-safety-assets.mjs
 M tools/release-check/stage6-8-sample-unresolved.mjs
 M tools/wordgen/merge_wordbank.py
 M tools/wordgen/pipeline.py
?? public/wordbank/esperanto/
?? public/wordbank/vietnamese/
```
