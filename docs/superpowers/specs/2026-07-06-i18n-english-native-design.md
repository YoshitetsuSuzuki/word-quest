# 多言語対応(英語母語・中国語ターゲット) 設計書

日付: 2026-07-06 / 承認: よしてつ様(案A採用・HSK1パイロット先行)

## 目的

WordQuest を日本語話者専用から多言語アプリへ拡張する第一弾。**英語母語ユーザーが中国語を英語の訳で学べる**ようにする。UI全体も英語化。将来は同じ仕組みに母語(es/ko/…)を追加できる形にする。狙いは英語圏という桁違いに大きな市場への橋渡し(Duolingo級の普及)。

## スコープ(v1)

- **母語(UI＋訳の言語)**: 日本語(既存)＋英語(新規)
- **学習ターゲット**: 中国語のみ英語対応(英→中)。英語・韓国語ターゲットの他母語対応は対象外(将来)
- **パイロット**: 中国語HSK1(487語)で UI英語化＋英語グロス＋例文英訳を通し、品質確認後にHSK2-5へ拡大

## 制約

- 正確性100%が前提。訳は「独立辞書と突合＋人手/エージェント検証」で昇格(既存のverified方式を踏襲)
- localStorage完結・サーバーレス。データ駆動(コード改変なしで母語追加)
- 後方互換: 既存の日本語ユーザーの体験・データを壊さない
- Pay to Winなし等の既存方針は維持

## アーキテクチャ

### 1. UIのi18n

- 画面文言を `src/i18n/ja.ts` / `src/i18n/en.ts`(同一キー集合)に切り出す。
- `src/i18n/index.ts` が現在ロケールの辞書を返す `t(key)` を提供。`useT()` フックで各画面から参照。
- **母語(locale)の決定**: localStorage `wordquest.locale`。未設定時は `navigator.language` から推定(`ja*`→ja、それ以外→en)。オンボーディングに母語選択を追加。
- キー体系は画面/機能ごとに名前空間(例: `home.startQuiz`, `listening.pickBlank`)。
- 数量・語順の差はテンプレート関数で吸収(例: `t('home.mastery', {n, total})`)。

### 2. 訳の多言語スキーマ(コンテンツ)

- `Question.answer`(単一訳)は**後方互換のため残す**(=現ロケール既定訳、既存コード温存)。
- 新規に `Question.glosses?: Partial<Record<Locale, string>>` を追加。表示訳は「glosses[locale] があればそれ、無ければ answer」。
- 選択肢(choices)も母語依存になるため、ビルド時に**ロケール別に choices を生成**するのは肥大化する。→ ランタイムで「その語の glosses[locale] ＋ 同カテゴリ他語の glosses[locale] からダミー3つ」を生成する方式に寄せる。
  - 現状 choices はビルド時固定。v1では **英語ロケール時のみランタイム生成**(QuestionEngineに `localizedChoices(q, locale)` を追加)。日本語は既存の固定choicesを使い、挙動不変。
- 例文: `Question.example`(現地語文＋既定訳) に加え `exampleTranslations?: Partial<Record<Locale, string>>`(例文の訳文のみ、ロケール別)。表示時は現在ロケールの訳文に差し替える。`exampleForm`(空欄語)はターゲット言語の語なのでロケール非依存。

### 3. 中国語→英語データ生成(案A: 日本語訳を語義の錨に)

- 入力: `.cache/cedict.txt`(CC-CEDICT・中英)＋ `tools/meanings.chinese.json`(検証済み中→日)。
- `tools/build-en-gloss.chinese.mjs`(新規): 各中国語語について
  1. CC-CEDICT から英語義リストを取得(複数)
  2. 既存の日本語訳を「語義の錨」に、最も一致する英語義を選ぶ(日↔英の意味整合を判定)
  3. 選定結果を `tools/gloss.en.chinese.json`({ hanzi: "english gloss" }) に出力
- **エージェント検証＋凜検品**で昇格(HSK1と同じ三重体制)。CC-CEDICTに無い/曖昧な語は未確定として出さない(その語は英語ロケールで日本語にフォールバックせず非表示か、暫定で保留リスト)。
- `build-chinese.mjs` が `gloss.en.chinese.json` を読み、`Question.glosses.en` に格納。

### 4. 例文の英訳

- `tools/build-example-en.chinese.mjs`(新規)相当で、中国語例文の英訳を生成(中文＋既存和訳を手掛かり)。
- 執筆→独立検証→凜検品。`exampleTranslations.en` に格納。
- 未整備の語は英訳なしでよい(例文自体は中文＋空欄で成立、訳は補助)。

### 5. フォールバック方針

- 英語ロケールで `glosses.en` が無い語 → v1では**出題プールから除外**(verifiedと同じく「確実なものだけ出す」)。日本語へ勝手に混ぜない(英語圏ユーザーに日本語を見せない)。
- 例文英訳が無い語 → 英語ロケールのリスニングでは例文なし(音声→意味4択にフォールバック)か、当該語を出題しない。

## データフロー

- 起動時: locale を決定 → i18n辞書ロード。
- カテゴリ読込は既存通り。表示時に `glosses[locale] ?? answer`、例文訳は `exampleTranslations[locale] ?? (既定訳)`。
- 英語ロケールの中国語クイズ: `localizedChoices` が英語グロスで4択生成。

## エラー処理・エッジ

- locale未対応キー → `ja` にフォールバック(開発時に欠落キーを警告)。
- glosses.en 欠落 → 出題除外(上記)。
- 既存日本語ユーザー: locale=ja のとき全挙動が現状と完全一致であることを機械確認(スナップショット比較)。

## テスト

- i18n: `ja`/`en` の辞書キー集合が一致することを検査するテスト(欠落キーゼロ)。
- glossビルド: CC-CEDICT突合の純関数を机上テスト。
- プレビュー実機: 英語ロケールに切替→UIが英語→中国語クイズの選択肢が英語グロス→リスニングの例文英訳表示、を確認。
- 後方互換: locale=ja のスナップショットが不変。

## 実装フェーズ

1. i18nインフラ(辞書・t()・locale決定・オンボーディング母語選択)＋UI全文言の英語化
2. 訳スキーマ拡張(glosses/exampleTranslations)＋QuestionEngineの localizedChoices＋表示側の切替
3. 中国語→英語グロス生成(HSK1)＋検証＋build組込み
4. 中国語例文の英訳(HSK1)＋検証＋build組込み
5. プレビュー実機確認・デプロイ(HSK1英語パイロット)
6. 品質確認後 HSK2-5 へ拡大

## 対象外(YAGNI)

- 英語・韓国語ターゲットの多母語対応(将来)
- 英語以外の母語(es等。スキーマは追加可能な形にするが実装はしない)
- サーバー/翻訳API連携(静的データのみ)
- RTL言語対応

## 関連

- 既存のverified方式・書き下ろし例文パイプライン(三重レビュー)を踏襲。
- 現在進行中の「中国語リスニング穴埋め(HSK2-5例文)」とはデータ層(examples.custom.chinese)を共有するため、そちらの完了後に本作業のbuild組込みを重ねる。
