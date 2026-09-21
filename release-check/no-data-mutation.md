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
M public/guide/korean.json
 M release-check/manual-sample.json
 M release-check/question-engine-test.json
 M release-check/unresolved-items.json
 M release-check/unresolved-items.md
?? public/guide/arabic.json
?? public/guide/bengali.json
?? public/guide/chinese.json
?? public/guide/english.json
?? public/guide/esperanto.json
?? public/guide/french.json
?? public/guide/german.json
?? public/guide/hindi.json
?? public/guide/indonesian.json
?? public/guide/italian.json
?? public/guide/japanese.json
?? public/guide/malay.json
?? public/guide/mongolian.json
?? public/guide/polish.json
?? public/guide/portuguese.json
?? public/guide/russian.json
?? public/guide/spanish.json
?? public/guide/tagalog.json
?? public/guide/turkish.json
?? public/guide/urdu.json
?? public/guide/vietnamese.json
?? tools/release-check/guide.test.ts
```
