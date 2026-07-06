# 学習相棒（育成キャラ・案C）設計

**Goal:** 学ぶと育ち・サボると寂しがる相棒キャラをホームに常駐させ、毎日開く情緒的フックにする。

**方針:** プロシージャルSVG（絵柄アセット不要・コード生成）。成長と気分は既存の学習/ストリークデータから導出し、新規保存は最小限。

## 状態の導出（既存データ流用）

### 成長段階 stage 1..5
- 指標: `user.learnedQuestionIds.length`（一度でも正解した語＝育てた語数、全言語合算）。
- しきい値(config): `[0, 10, 40, 120, 300]` → 累積がこの値以上で段階が上がる。
- 段階名(ja): たまご / ひな / わか / せいちょう / でんせつ。en: Egg / Chick / Young / Grown / Legend。
- 次段階までの進捗率をプログレスバーで表示。

### 気分 mood: happy / normal / hungry / sad
- 最終学習日 = `dailyHistory` のうち値>0の最新日付（無ければ null）。
- `days` = 今日 − 最終学習日。
  - 今日学習済(days<=0) → happy、1日 → normal、2日 → hungry、3日以上 → sad。
  - 履歴なし(新規) → normal（さみしい表示にしない）。
- 気分メッセージ（相棒のセリフ）を i18n で表示。

## 進化演出
- `user.petStageSeen`（数値, migrate で 0 既定）を追加。現在 stage が petStageSeen を上回ったら
  ウィジェットに「✨ しんか！」バッジを出し、タップ等で petStageSeen を更新（記録用の最小実装）。

## ファイル構成
- `src/config/petConfig.ts` … stageThresholds, 段階数, 気分しきい値。
- `src/core/PetEngine.ts`（純粋関数）… `petStage(learnedCount)`, `petMood(user, todayStr)`,
  `petView(user, todayStr)`（{stage, mood, learned, nextAt, progress, evolved}）, `daysSinceLastActive`。
- `src/components/PetSprite.tsx` … stage×mood を受けて相棒SVGを返す（モックの図形を関数化）。
- `src/components/PetWidget.tsx` … Sprite＋名前＋段階＋進捗＋気分メッセージ。タップで弾む＋「まなぶ」誘導。
- `src/screens/HomeScreen.tsx` … 最上部（ヒーロー直後）に PetWidget を配置。
- i18n(ja/en) … 名前・段階名・気分メッセージ・進化ラベル。
- `src/types` / defaultUser / GameContext.migrate … `petStageSeen` 追加。

## 将来余地（今回スコープ外・YAGNI）
- 着せ替え/色替え（既存ショップ・見た目のみ）、リネーム、育てた子コレクション、鳴き声。

## テスト
- PetEngine: 段階しきい値の境界、気分の日数境界、履歴なし=normal、進化検知。
