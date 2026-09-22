# v1.4 提出メモ（2026-09-22）

- バージョン: **1.4** / ビルド: **8**
- Bundle ID: `com.infinitygames.wordquest` / Apple ID: `6792366503`
- v1.3（build 7）は 2026-09-21 に承認・公開済み。その上に積む更新。

## 中身

**各言語の「はじめかた」ガイド、ただ1つ。**
韓国語を初めて開いた人がハングルを読めないまま4択を迫られる、という入口の悪さを直すもの。

- `public/guide/<category>.json` に ja / en の2本立てで22言語ぶん
- 構成: ひとこと → もじ（＋組み立て図）→ **もじ一覧** → よみかた → ごじゅん → あいさつ5つ → さいしょの壁
- ジャンルを初めて選んだときに自動で開く（`localStorage: wordquest.guide.seen`）。
  以降はホームの「はじめかた」から
- 文字一覧は合計646マス。文字が有限な言語は全部載せ、
  中国語は漢字の代わりにピンインの読み方＋例語、
  ラテン文字の言語は「ローマ字と読みがずれる字」だけを出す

**語彙データは v1.3 から変更なし**（全22言語 64,620語）。

## 「このバージョンの新機能」

### 日本語

```
■ 各言語に「はじめかた」を用意しました
韓国語を初めて開いたとき、ハングルが読めないまま問題が始まる——
この入口の悪さを直しました。全22言語それぞれに、文字・読み方・語順・
あいさつ5つ・最初の壁をまとめたページを付けています。

■ 文字の一覧を見られます
ハングルは40個、かなは46個、アラビア文字は28個。
「覚えるのはこれで全部」と目で分かるように、字の一覧と読みを並べました。
漢字は数が多いので、中国語はピンインの読み方と、やさしい単語に読みを
振ったものを載せています。

■ 組み立て式の文字は、その様子を図で
ハングル・デーヴァナーガリー・アラビア文字・ベンガル文字などは、
ㅎ + ㅏ + ㄴ → 한 のように、部品から1文字ができる様子を見せます。

■ 開き方
ジャンルを初めて選んだときに一度だけ開きます。
そのあとはホームの「はじめかた」からいつでも読み返せます。
```

### English

```
■ Getting started, for every language
Open Korean for the first time and the quiz used to begin before you
could read a single letter. Each of the 22 languages now has a page
covering the script, the sounds, word order, five greetings, and the
one thing that trips up every beginner.

■ See all the letters at once
40 for Hangul, 46 for kana, 28 for Arabic. The chart lists every letter
with its sound, so you can see that this really is all of them.
Chinese has too many characters for that, so it shows how to read pinyin
instead, plus easy words with their readings.

■ Watch a character get built
For Hangul, Devanagari, Arabic, Bengali and others, a diagram shows the
parts combining into one character — ㅎ + ㅏ + ㄴ → 한.

■ Where to find it
It opens once, the first time you pick a language. After that it lives
under "Getting started" on the home screen.
```

## App のプライバシー

**変更なし**。ガイドはアプリに同梱した静的ファイルで、通信も収集も発生しない。

## 提出の手順（v1.3 と同じ・CLI で完結する）

```bash
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath /tmp/wq14.xcarchive archive
xcodebuild -exportArchive -archivePath /tmp/wq14.xcarchive \
  -exportOptionsPlist ExportOptions.plist -exportPath /tmp/wq14
```
`ExportOptions.plist` は `method: app-store-connect` / `destination: upload`。

そのあと App Store Connect で
「+ バージョンまたはプラットフォーム」→ 1.4 →「新機能」に上記を貼る → build 8 を選ぶ → 審査へ提出。

## 検査の記録（提出前）

- tsc / build / cap sync: OK
- リリース検査8本: すべて PASS（critical 0）
- ガイドの中身: 22言語を2巡、独立に監査。2巡目で critical 0
