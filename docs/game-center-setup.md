# Game Center セットアップ手順

本物のリーダーボード（週間ポイント・累計正解）と実績をGame Centerで提供します。
4.3(a)（スパム）対策として「テンプレではない本物のネイティブ機能」を示す狙いです。

コード（JS連携・Swiftプラグイン）は実装済み。**Xcodeでの登録とApp Store Connectでの枠作成**が手作業です。

---

## 実装済み（触らない）
- `src/services/GameCenterService.ts` … JS側の連携（サインイン・スコア送信・実績・UI表示）
- `ios/App/App/GameCenterPlugin.swift` … 自作Capacitorプラグイン（GameKit）
- `src/App.tsx` … 起動時にサインイン
- `src/screens/HomeScreen.tsx` … 週間ポイント/累計正解を送信＋実績報告
- `src/screens/LeagueScreen.tsx` … 「🏆 Game Centerのランキングを見る」ボタン

---

## 手順

### 1. Swiftプラグインをターゲットに追加
1. Xcodeで `ios/App/App.xcworkspace` を開く
2. 左のツリーで `App/App` を右クリック → **Add Files to "App"…**
3. `ios/App/App/GameCenterPlugin.swift` を選び、**Target: App にチェック**して追加
   （すでにツリーに表示されていれば、ファイルを選び右パネル File Inspector の Target Membership で App にチェック）

### 2. Game Center capability を有効化
1. App ターゲット → **Signing & Capabilities** → **+ Capability**
2. **Game Center** を追加

### 3. App Store Connect でリーダーボード/実績を作成
App Store Connect → WordQuest → 機能（Features）→ **Game Center**

**リーダーボード（2つ・クラシック型）** — IDは下記と完全一致させる：
| リーダーボードID | 表示名 | スコア形式 | 並び |
|---|---|---|---|
| `wordquest.weekly` | 週間ポイント / Weekly Points | 整数 | 高い順 |
| `wordquest.lifetime` | 累計正解 / Total Correct | 整数 | 高い順 |

**実績（4つ）** — IDは下記と一致：
| 実績ID | 内容 | ポイント |
|---|---|---|
| `wordquest.ach.correct100` | 累計100問正解 | 10 |
| `wordquest.ach.correct1000` | 累計1000問正解 | 30 |
| `wordquest.ach.streak7` | 7日連続学習 | 15 |
| `wordquest.ach.streak30` | 30日連続学習 | 25 |

> ID は `src/services/GameCenterService.ts` の `LEADERBOARD` / `GC_ACHIEVEMENT` と一致済み。
> 変える場合は両方合わせること。

### 4. ビルド
1. `npm run build:app && npx cap sync ios`
2. Xcodeで App スキームを実機ビルド（Game CenterはシミュレータでもサインインUIは出るが実機推奨）

---

## 動作確認
- アプリ起動時にGame Centerのサインイン表示が出る（初回）
- クイズを解いてホームに戻ると、週間ポイント/累計正解がリーダーボードへ送信される
- リーグ画面の「🏆 Game Centerのランキングを見る」で標準UIが開く
- 累計100問などに達すると実績バナーが出る

## プラグイン登録について
`GameCenterPlugin` は `CAPBridgedPlugin` 準拠のため、App ターゲットに含めればCapacitorが自動登録します。
もし `GameCenter` プラグインが見つからない旨のエラーが出る場合は、`ios/App/App/AppDelegate.swift` で
明示登録は不要ですが、ビルドにSwiftファイルがApp Membershipで含まれているかを再確認してください。

## トラブルシュート
- **サインインが出ない** → 実機の設定→Game Centerでサインイン。Sandbox環境（TestFlight/開発ビルド）ではサンドボックスアカウントを使う
- **スコアが反映されない** → リーダーボードIDの不一致が最有力。ASCの枠IDとGameCenterService.tsを照合
- **審査時** → Game Centerを使うアプリは、App Store Connectでリーダーボード/実績を「提出」状態にしておく（アプリ審査と同時に審査される）
