# 日本語を学習ターゲットに追加(英語圏向け) 設計書

日付: 2026-07-06 / 承認: よしてつ様(JLPT級・読みローマ字＋かな・N5クイズ先行・例文は次フェーズ・availableLocalesでデータ駆動化)

## 目的

英語圏ユーザーが**日本語**を英語の訳で学べるようにする(世界最大級の日本語学習需要)。JP→ENは高品質オープン辞書 JMdict(.cache に既存)が使えるため、正確性100%基準を満たしやすい。

## スコープ(v1: N5パイロット)

- 新カテゴリ `japanese` を追加。**JLPT N5(約700語)でクイズ**(日本語の音→英語で意味を4択)。
- 読み=かな＋ローマ字併記。TTS=ja-JP。訳=英語(JMdict由来・検証済み)。
- **ja母語には非表示**(日本語話者は日本語を学ばない)。英語ロケールでのみ表示。
- 例文＋リスニング穴埋め(Tatoeba日英)は**次フェーズ**(対象外)。N4-N1拡大も次フェーズ。

## 制約

- 正確性100%(独立辞書=JMdict と突合・検証エージェント＋人手検品、曖昧・辞書なしは非出荷)。
- localStorage完結・サーバーレス・データ駆動。後方互換(既存の日本語/英語ユーザー体験を壊さない)。

## アーキテクチャ

### 1. Category 追加
- `src/types/index.ts` の `Category` union に `'japanese'` を追加。
- `src/data/categories.ts` に `{ id:'japanese', label:'日本語', emoji:'🇯🇵', available:true, availableLocales:['en'] }` を追加。

### 2. 母語別カテゴリ出しわけをデータ駆動化
- `CategoryInfo` に `availableLocales: Locale[]` を追加(その母語で学習対象として出すロケール)。
  - english: `['ja']` / chinese: `['ja','en']` / korean: `['ja']` / japanese: `['en']`
- `HomeScreen`: 現在の `locale==='ja' ? categories : categories.filter(id==='chinese')` を
  `categories.filter(c => c.availableLocales.includes(locale))` に置換。非対応カテゴリからの自動切替ロジックはそのまま活かす(先頭の availableLocals カテゴリへ)。

### 3. 日本語データ生成(JMdict × JLPT)
- 入力: (a) オープンな JLPT 単語リスト(語・読み(かな)・級)を `.cache/jlpt-*.` 等に取得。取得元はCC/パブリックの一覧(例: JMdict由来のJLPTタグ付き一覧や公開vocabリスト。ライセンスをCREDITS.mdに明記)。(b) `.cache/jmdict-eng-3.6.2.json`(JP→EN)。
- `tools/build-japanese.mjs`(新規):
  - JLPTリストから各語(見出し表記＋かな読み＋級)を取得。
  - JMdictでその見出し(または読み)を引き、英語gloss候補を得る。
  - 英語訳(gloss)は `tools/gloss.en.japanese.json`(見出し→英語)を**確定版として読む**(生成は検証エージェント。build自体はcandidatesも吐ける)。
  - Question生成: prompt=`「${word}」の意味は？`(枠は日本語固定だが、英語ロケールでは単語のみ表示=中国語と同じ挙動)、answer=英語gloss、glosses={en:英語gloss}、pronunciation=`${かな} (${romaji})`、difficulty=級(N5=1..N1=5)、category='japanese'、verified=true(gloss確定語のみ)。
  - romaji はJLPTリストにあればそれ、無ければ かな→ヘボン式ローマ字変換(build内の簡易変換関数、韓国語RRと同様の方針。長音・促音・拗音を扱う)。
  - 出力: `public/wordbank/japanese/level-{1..5}.json` ＋ manifest。ダミー選択肢は英語gloss同士(既存 pickDistractors 相当)。
- 英語訳の確定: 検証エージェント(委譲禁止・単独)が JMdict候補から最頻・中心義を1つ選び `tools/gloss.en.japanese.json` を作る(surname/古語/専門義は避け、N5学習者の中心義)。曖昧・不適は除外(非出荷)。凜が抜き取り検品。

### 4. TTS
- `src/utils/speech.ts` の言語マップに `japanese → 'ja-JP'` を追加。`speakWord` がカテゴリ日本語で ja-JP 読み上げ。

### 5. 表示
- 既存のロケール対応(Task群)で、英語ロケールでは prompt=単語のみ・選択肢=英語gloss・出題プール=glosses.en保有語、が自動で効く。
- 空プール対策(built フラグ)も既存でカバー。

## データフロー
- 起動時 locale 決定。en ロケールで categories が chinese/japanese を表示。
- japanese選択→ ensureCategory('japanese')→ level JSON 遅延読込→ クイズは英語gloss4択・ja-JP音声。

## エラー処理・エッジ
- gloss.en.japanese.json が無い語は verified=false or 非生成 → 英語ロケールで非出題(誤訳を出さない)。
- romaji変換の失敗語はローマ字省略しかな読みのみ(表示は成立)。
- ja母語では japanese カテゴリを一切出さない(availableLocales に 'ja' が無い)。

## テスト
- i18n: cat.japanese キー(ja"日本語"/en"Japanese")追加、ja/en一致テスト。
- build-japanese: 生成語数・glosses.en付与数・romaji整形を確認する机上出力。
- プレビュー実機: en ロケールで japanese 選択→クイズが英語4択・日本語音声・読み(かな+romaji)表示・採点OK。ja ロケールで japanese が出ないこと。

## 実装フェーズ(v1)
1. Category型/categories.ts に japanese と availableLocales 追加、HomeScreen をデータ駆動化、speech.ts に ja-JP。i18n cat.japanese。
2. JLPTリスト取得 + tools/build-japanese.mjs(candidates含む)。CREDITS.md追記。
3. 英語gloss確定(N5)= gloss.en.japanese.json、検証。
4. build組込み・プレビュー確認・デプロイ(N5クイズ英語パイロット)。

## 対象外(YAGNI)
- 例文・リスニング穴埋め(次フェーズ: Tatoeba日英)。
- N4-N1拡大(次フェーズ)。
- 漢字書き取り・手書き認識。
- 英語以外の母語(スキーマ availableLocales で将来追加可)。

## 関連
- 中国語英語パイロット(docs/.../2026-07-06-i18n-english-native-design.md)の器(glosses/localizedChoices/出題フィルタ/空プール対策)を再利用。
