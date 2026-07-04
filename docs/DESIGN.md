# WordQuest — 設計ドキュメント

英単語学習ゲームのMVP。将来的に中国語・歴史・資格・SPIへ横展開できる
**汎用学習ゲームプラットフォーム**として設計している。

## 設計思想（3層 + データ駆動）

```
UI層 (screens/components)
  ↓ 依存
Module層 (modules/*  ← Feature Flagで ON/OFF)
  ↓ 依存
Core層 (core/*  ← 英単語を知らない汎用エンジン)
  ↓ 依存
Repository層 (repositories/*  ← localStorage実装、将来Supabaseへ差替)
  ↑ 供給
Data層 (data/*  ← mockData & 設定JSON。コード改変なしで調整可能)
```

- **Core層は Question 型だけを扱う**。`category` を増やすだけで他ジャンルへ展開できる。
- **Repository層で永続化を抽象化**。`repositories/index.ts`（Composition Root）の実装を
  差し替えるだけでサーバー移行できる（依存性逆転）。
- **報酬・ミッション・レイド・実績・ショップは全て `data/*.config.ts`**。
  数値・項目をコードを触らず変更できる。
- **Feature Flag**（`config/featureFlags.ts`）で各Moduleを ON/OFF。

## ディレクトリ

| パス | 役割 |
|------|------|
| `src/types` | 全型定義（Question, User, 各設定型） |
| `src/core` | QuestionEngine / AnswerChecker / RewardEngine / ProgressEngine / ReviewScheduler |
| `src/repositories` | IUserRepository / IQuestionRepository と localStorage実装 |
| `src/data` | 英単語mockData、報酬・ミッション・レイド・実績・ショップ・ランキングの設定 |
| `src/config` | featureFlags |
| `src/state` | GameContext（全ロジックの合成点）、nav、defaultUser、login/date utils |
| `src/modules` | battle / raid / mission / ranking / shop / achievement のロジック |
| `src/screens` | Home / Quiz / Battle / Raid / Ranking / Profile / Shop / Missions |
| `src/components` | TopBar / BottomNav / ProgressBar / 各種演出オーバーレイ |

## 実装済みMVP機能

学習（4択・XP・レベル・Coin・コンボ・復習・間隔反復SM-2 lite）／非同期バトル（20問・
速度スコア・Elo）／レイド（ダミー集計・攻撃・報酬）／デイリーミッション／ログインボーナス／
ランキング4種／プロフィール／実績6種／ショップ（見た目のみ・Pay to Winなし）。

### 多カテゴリ（横展開実証済み）

英単語（50語）に加え **中国語（30語）** を実装。`data/buildQuestions.ts` の共通ビルダーと
`data/categories.ts` のカタログにより、Core/Engine/Repository を一切変更せず新ジャンルを追加可能。
ホームのジャンルセレクタで切替でき、Quiz/Battle/Raid が選択カテゴリを参照する。

### PWA（インストール可能・オフライン動作）

`vite-plugin-pwa`（generateSW）で Service Worker と manifest を自動生成。スマホのホーム画面に
追加でき、オフラインでも起動する。アイコンは `public/pwa-*.png`（`scripts/gen-icons` で生成）。

## 将来の拡張ポイント（未実装・余地のみ確保）

- `Category` に chinese/history/spi/certification を追加 → `data/questions.*.ts` を用意し
  `LocalQuestionRepository` に合流。
- `SupabaseUserRepository` / `SupabaseQuestionRepository` を実装し Composition Root を差替。
- リアルタイム対戦・クラン・フレンド等はMVPでは意図的に未実装。

## 開発

```bash
npm install
npm run dev     # 開発サーバー
npm run build   # 型チェック + 本番ビルド（通過確認済み）
```
