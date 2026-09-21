# 第8段階: 元データを変更していないことの確認

## 判定

**元データの変更なし**

## public/wordbank/ 配下の変更

なし。全10言語の単語データは1バイトも変更していない。

## 今回のチェックで作成したファイル

- `tools/release-check/` … 検査コード（stage1〜8）
- `release-check/` … 検査レポート

いずれも監査レポートとテストコードのみ。アプリのソースコードと単語データは変更していない。

## git status（全体）

```
M public/guide/bengali.json
 M public/guide/chinese.json
 M public/guide/esperanto.json
 M public/guide/french.json
 M public/guide/italian.json
 M public/guide/malay.json
 M public/guide/spanish.json
 M public/guide/tagalog.json
 M public/guide/vietnamese.json
 M release-check/data-integrity.json
 M release-check/data-integrity.md
 M release-check/no-data-mutation.md
 M release-check/question-engine-test.json
 M tools/release-check/stage1-integrity.mjs
```
