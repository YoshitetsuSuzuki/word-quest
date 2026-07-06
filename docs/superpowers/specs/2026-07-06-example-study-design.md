# 例文暗記モード 設計書

日付: 2026-07-06 / 承認: よしてつ様(A＋B・リーディング穴埋め・音声は任意)

## 目的
単語だけでなく**例文で覚える**モードを追加し、定着と実用力を高める。単語帳(マイ)はそのまま、別項目として「例文暗記」を置く。英語・中国語(HSK1-5)は全語に書き下ろし例文があり、日本語は今後。

## スコープ
- まなび(StudyScreen)に「📖 例文で覚える」カードを追加(現在ジャンルに例文付き語があるときのみ表示)。
- 出題対象(A＋B): マイ単語帳★の語で例文を持つもの(A)を優先し、足りなければジャンルの例文付き語からランダム(B)で補充。10問。
- 形式: リーディング穴埋め。例文を空欄つきで表示＋訳(母語ja/en)。空欄語を4択(正解=例文中の実形と完全一致)。音声は自動再生せず🔊で任意。正誤で既存の報酬・復習キューに連動。

## 実装(既存機構の再利用)
- `nav.tsx`: `quizMode` union に `'example'` を追加。
- `QuestionEngine.buildExampleSession(category, count, deckIds, locale)`: 例文＋exampleForm を持つ語のうち、deckIds(この言語の★語)を優先し、不足分をカテゴリの例文語から補充。locale='en' 時は glosses.en を持つ語に限定(中韓日で英語未整備語を英語圏に出さない)。withShuffledChoices を適用。
- `App.tsx`: `screen==='quiz' && (quizMode==='listening'||quizMode==='example')` で ListeningScreen を表示。
- `ListeningScreen`:
  - セッション構築: `quizMode==='example'` のとき `engine.buildExampleSession(category, SIZE, customIds ?? [], locale)`(customIds に★語の例文idを渡す)。それ以外は従来の buildListeningSession。
  - 自動再生: `quizMode==='example'` のときは出題時の自動 speak を行わない(replayボタンは有効)。
  - 回答形式: example モードは4択固定(effectiveStyle='choice')。
  - 見出し(t('listening.label'))は example 用に「📖 例文」を出す。
- `StudyScreen`: 「📖 例文で覚える」カード → `setQuizMode('example')`、customIds に「現在ジャンルの★語で例文を持つ id 配列」(無ければ null)をセット、navigate('quiz')。
- i18n: `study.exampleStudy`(ja「📖 例文で覚える」/en「📖 Study with examples」)、`study.exampleHint`(ja「例文の穴埋めで定着」/en「Fill-in-the-blank from examples」)、`listening.exampleLabel`(ja「📖 例文」/en「📖 Examples」)。

## エッジ
- 例文付き語が10未満でも buildExampleSession はある分だけ返す(空なら まなびカード自体を出さない or 案内)。ListeningScreen の built/空プール対策は既存流用。
- locale=ja では従来どおり(挙動不変)。

## テスト
- プレビュー: ja/en 各ロケール、★あり/なしで まなび→例文で覚える→穴埋め4択・採点・訳表示・音声任意。ja不変。
- ビルド・i18nキー一致。

## 対象外
- 例文フラッシュカード(表=例文/裏=訳)形式は今回見送り(穴埋め型に一本化)。
- 日本語の例文(まだ無い)。
