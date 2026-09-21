# 第8段階: 元データを変更していないことの確認

## 判定

**元データに変更あり（要確認）**

## public/wordbank/ 配下の変更

```
 M public/wordbank/bengali/level-1.json
 M public/wordbank/bengali/level-2.json
 M public/wordbank/bengali/level-3.json
 M public/wordbank/chinese/level-1.json
 M public/wordbank/chinese/level-2.json
 M public/wordbank/chinese/level-3.json
 M public/wordbank/chinese/level-4.json
 M public/wordbank/chinese/level-5.json
 M public/wordbank/english/level-1.json
 M public/wordbank/english/level-2.json
 M public/wordbank/english/level-3.json
 M public/wordbank/english/level-4.json
 M public/wordbank/english/level-5.json
 M public/wordbank/english/level-6.json
 M public/wordbank/english/level-7.json
 M public/wordbank/french/level-1.json
 M public/wordbank/french/level-2.json
 M public/wordbank/french/level-3.json
 M public/wordbank/french/level-4.json
 M public/wordbank/french/level-5.json
 M public/wordbank/german/level-1.json
 M public/wordbank/german/level-2.json
 M public/wordbank/german/level-3.json
 M public/wordbank/german/level-4.json
 M public/wordbank/german/level-5.json
 M public/wordbank/italian/level-1.json
 M public/wordbank/italian/level-2.json
 M public/wordbank/italian/level-3.json
 M public/wordbank/japanese/level-1.json
 M public/wordbank/japanese/level-2.json
 M public/wordbank/japanese/level-3.json
 M public/wordbank/japanese/level-4.json
 M public/wordbank/japanese/level-5.json
 M public/wordbank/korean/level-1.json
 M public/wordbank/korean/level-2.json
 M public/wordbank/korean/level-3.json
 M public/wordbank/polish/level-1.json
 M public/wordbank/polish/level-2.json
 M public/wordbank/polish/level-3.json
 M public/wordbank/russian/level-1.json
 M public/wordbank/russian/level-2.json
 M public/wordbank/russian/level-3.json
```

## 今回のチェックで作成したファイル

- `tools/release-check/` … 検査コード（stage1〜8）
- `release-check/` … 検査レポート

いずれも監査レポートとテストコードのみ。アプリのソースコードと単語データは変更していない。

## git status（全体）

```
M public/wordbank/bengali/level-1.json
 M public/wordbank/bengali/level-2.json
 M public/wordbank/bengali/level-3.json
 M public/wordbank/chinese/level-1.json
 M public/wordbank/chinese/level-2.json
 M public/wordbank/chinese/level-3.json
 M public/wordbank/chinese/level-4.json
 M public/wordbank/chinese/level-5.json
 M public/wordbank/english/level-1.json
 M public/wordbank/english/level-2.json
 M public/wordbank/english/level-3.json
 M public/wordbank/english/level-4.json
 M public/wordbank/english/level-5.json
 M public/wordbank/english/level-6.json
 M public/wordbank/english/level-7.json
 M public/wordbank/french/level-1.json
 M public/wordbank/french/level-2.json
 M public/wordbank/french/level-3.json
 M public/wordbank/french/level-4.json
 M public/wordbank/french/level-5.json
 M public/wordbank/german/level-1.json
 M public/wordbank/german/level-2.json
 M public/wordbank/german/level-3.json
 M public/wordbank/german/level-4.json
 M public/wordbank/german/level-5.json
 M public/wordbank/italian/level-1.json
 M public/wordbank/italian/level-2.json
 M public/wordbank/italian/level-3.json
 M public/wordbank/japanese/level-1.json
 M public/wordbank/japanese/level-2.json
 M public/wordbank/japanese/level-3.json
 M public/wordbank/japanese/level-4.json
 M public/wordbank/japanese/level-5.json
 M public/wordbank/korean/level-1.json
 M public/wordbank/korean/level-2.json
 M public/wordbank/korean/level-3.json
 M public/wordbank/polish/level-1.json
 M public/wordbank/polish/level-2.json
 M public/wordbank/polish/level-3.json
 M public/wordbank/russian/level-1.json
 M public/wordbank/russian/level-2.json
 M public/wordbank/russian/level-3.json
 M release-check/data-integrity.json
 M release-check/manual-sample.csv
 M release-check/manual-sample.json
 M release-check/no-data-mutation.md
 M release-check/question-engine-test.json
 M release-check/unresolved-items.json
 M release-check/unresolved-items.md
 M src/data/categories.ts
 M src/screens/BattleScreen.tsx
 M src/screens/HomeScreen.tsx
 M src/screens/ListeningScreen.tsx
 M src/screens/QuizScreen.tsx
 M src/screens/RaidScreen.tsx
 M src/screens/StudyScreen.tsx
 M tools/release-check/stage1-integrity.mjs
?? tools/release-check/category-prefix.test.ts
```
