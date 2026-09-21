# 第8段階: 元データを変更していないことの確認

## 判定

**元データに変更あり（要確認）**

## public/wordbank/ 配下の変更

```
?? public/wordbank/indonesian/
?? public/wordbank/malay/
?? public/wordbank/turkish/
?? public/wordbank/urdu/
```

## 今回のチェックで作成したファイル

- `tools/release-check/` … 検査コード（stage1〜8）
- `release-check/` … 検査レポート

いずれも監査レポートとテストコードのみ。アプリのソースコードと単語データは変更していない。

## git status（全体）

```
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
 M src/i18n/en.ts
 M src/i18n/ja.ts
 M tools/release-check/stage2-engine.test.ts
?? public/wordbank/indonesian/
?? public/wordbank/malay/
?? public/wordbank/turkish/
?? public/wordbank/urdu/
```
