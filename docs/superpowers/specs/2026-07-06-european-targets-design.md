# スペイン語・フランス語・ドイツ語 学習ターゲット追加 設計書

日付: 2026-07-06 / 承認: よしてつ様(es/fr/de を英語圏向けに追加)

## 目的
英語圏ユーザーがスペイン語・フランス語・ドイツ語を英語の訳で学べるようにする(世界最大級の学習需要)。権威あるオープン辞書＋頻度リストがあるため、中韓日と同じ高精度で追加できる。

## スコープ(v1)
- 新カテゴリ `spanish` / `french` / `german`。**英語ロケールのみ表示**(availableLocales:['en'])。ja母語には非表示(まだ英語グロスのみ)。
- 各言語 頻度上位〜約1,500〜2,000語をパイロット。頻度帯で Lv1-5 に分割(Lv1=最頻)。
- 訳=英語(辞書由来・検証済み)。TTS=es-ES/fr-FR/de-DE。読み(IPA)は今回省略(綴りが比較的音に対応、TTSで補う)。
- 例文=次フェーズ(Tatoeba <lang>-eng)。今回はクイズ先行。

## データ源
- 頻度: hermitdave/FrequencyWords 2018 の `es_50k.txt` / `fr_50k.txt` / `de_50k.txt`(CC-BY 4.0、OpenSubtitles由来。英語 en_50k で使用済み)。`.cache/` に取得。
- 英語対訳辞書(錨): 優先 = Wiktextract(kaikki.org、Wiktionary機械可読・言語別JSONLに word＋英語sense)。代替 = FreeDict(spa-eng/fra-eng/deu-eng、TEI XML)。ライセンスはCREDITS.mdに明記(Wiktionary=CC-BY-SA、FreeDict=GPL/CC)。

## アーキテクチャ(既存の器を再利用)
### 1. 配線
- `src/types/index.ts` Category union に 'spanish'|'french'|'german' 追加。
- `src/data/categories.ts`: 各エントリ(emoji 🇪🇸/🇫🇷/🇩🇪、available、availableLocales:['en'])。
- `src/utils/speech.ts` と `ListeningScreen` の speechLang: spanish→es-ES / french→fr-FR / german→de-DE。
- `src/repositories/LocalQuestionRepository.ts` WORDBANK_CATEGORIES に3つ追加。
- `src/screens/HomeScreen.tsx` / `StudyScreen.tsx`: catNameKey に3言語、prefix(spanish→es, french→fr, german→de)。levelLabel は既定の `Lv{n}`。
- i18n: cat.spanish/french/german(ja/en)。

### 2. データ生成(言語ごと tools/build-<lang>.mjs)
- 頻度リストを読み、小文字化・アルファベット(各言語の文字)のみ・3文字以上・機能語(STOPWORDS)除外・頻度順。
- 辞書(Wiktextract/FreeDict)で各語→英語gloss。中心義1つを採用(名詞は素、動詞は to...、注記除去)。辞書に無い語はスキップ(=非出荷、誤りを出さない)。
- 頻度順に採り、上位を Lv1..Lv5 に分割(各~300-400語、計~1,500-2,000)。
- 確定英語gloss は `tools/gloss.en.<lang>.json`。build が読み Question を生成:
  - id:`<pref>-#####`(es-/fr-/de-)、category、prompt:`「<word>」の意味は？`(枠は日本語固定だが英語ロケールでは単語のみ表示=既存挙動)、answer=英語gloss、glosses:{en:gloss}、choices=英語gloss4択、difficulty=freq band、tags、verified:true。
  - 出力 `public/wordbank/<lang>/level-{1..5}.json` ＋ manifest。
- 固有名詞・卑語・断片は除外(既存英語パイプラインのブロック方針を流用)。

### 3. 検証
- 辞書が権威ソース=錨。曖昧・辞書なしは非出荷。生成後、各言語ランダム30語を人手(凜)抜き取り検品。必要なら独立検証エージェント。

## エッジ
- ja ロケールでは es/fr/de カテゴリ非表示(availableLocales に 'ja' 無し)。
- 英語グロス未整備語は英語ロケールでも出題除外(既存 buildSession の glosses.en フィルタ)。空プール対策も既存流用。

## テスト
- i18n キー一致。ビルド。プレビュー: en ロケールで es/fr/de 選択→クイズが英語4択・各言語TTS・採点OK。ja で非表示。

## 実装フェーズ
1. 配線(Category/categories/speech/repo/i18n/Home/Study)。available:false(coming soon)。
2. 言語ごと build-<lang>.mjs + データ取得 + gloss生成 + wordbank(3言語並行)。CREDITS追記。
3. 抜き取り/独立検証、available:true、プレビュー、デプロイ。
4. 拡大: 例文(Tatoeba)、語彙増、CEFR級。

## 対象外(YAGNI)
- 例文・リスニング穴埋め(次フェーズ)。IPA読み。es/fr/de 母語UI(将来)。性・活用の網羅(頻度語の見出し形のみ)。
