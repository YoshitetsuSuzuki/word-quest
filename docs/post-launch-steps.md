# 公開後のやることリスト（ちりつも単語 / 2026-08-19 承認）

App Store 公開: https://apps.apple.com/app/id6792366503
Apple ID: 6792366503 / Bundle ID: com.infinitygames.wordquest

推奨順序: ② 本番広告 → ① 15%登録 → ③ Game Center → ④ 買い切り課金

---

## ② AdMob 本番広告オン（最優先・実際にお金が入る）

### あなたの作業（AdMob管理画面）
1. https://apps.admob.com にログイン
2. 左メニュー **「アプリ」** → **ちりつも単語（iOS）** を選ぶ
   - まだ無ければ「アプリを追加」→「はい、App Storeに公開済み」→ アプリ名で検索して選択
3. **「アプリストアにリンク」** を実行（App Store の実アプリと紐付け）
4. AdMob側の審査を待つ（**数日**。承認されるとメールが来る）

### 承認されたら → 凜に「AdMob承認された」と伝える
凜がやること:
- `src/services/AdService.ts` の `USE_TEST_ADS = true` → **false** に変更
- ビルド番号を 5 に上げる
- `npm run build:app && npx cap sync ios`

### そのあと あなたの作業（Xcode）
1. `ios/App/App.xcodeproj` を開く
2. デバイス選択 = **Any iOS Device (arm64)**
3. **Product → Archive**
4. **Distribute App → App Store Connect → Upload**
5. App Store Connect →「+ バージョンまたはプラットフォーム」→ **1.1** を作成
6. ビルド 5 を選択 → 「新機能」に更新内容を記入 → **審査へ提出**

⚠️ 重要: 承認前に USE_TEST_ADS=false にしてはいけない（自分でタップすると規約違反）

---

## ① App Store Small Business Program 登録（手数料 30%→15%）

### あなたの作業（App Store Connect）
1. https://appstoreconnect.apple.com → 上部 **「ビジネス」**
2. **「App Store Small Business Program」** を探して開く
3. 条件（前年の収益100万ドル未満）に同意して申し込む
4. 承認まで **約15日**

### 事前に必要なもの
- **有料アプリ契約への署名**（ビジネス → 契約 → 有料アプリ契約 が「新規」のままなので署名が必要）
- そのために: 法人情報の更新 / 銀行口座 / 税務情報（マイナンバー等）の登録

※ 課金（④）を始める前に済ませておけば間に合う

---

## ③ Game Center を有効化（待機中の下書きを提出）

すでに App Store Connect に作成済み・提出待ちの状態:
- リーダーボード 2件（wordquest.weekly / wordquest.lifetime）
- 達成項目 4件（ach.correct100 / correct1000 / streak7 / streak30）

### あなたの作業
②または④で **新しいバージョン（1.1など）を提出するとき**に、
- バージョンページの **Game Center チェックボックスがONのまま**であることを確認
- Game Center の「提出物の下書き」の **「審査へ提出」** が押せるようになっているはずなので提出
- これでランキング・実績が実際に動くようになる

---

## ④ 広告除去の買い切りを追加（課金開始）

### あなたの作業1: 商品を作る（App Store Connect）
1. アプリ → 左メニュー **「アプリ内購入」**
2. **「+」** → **非消耗型（Non-Consumable）** を選択
3. 入力:
   - 参照名: `Remove Ads`
   - **製品ID**: `com.infinitygames.wordquest.removeads`
   - 価格: 例 ¥300（お好みで）
   - 表示名: `広告を非表示`
   - 説明: `一度の購入で広告をすべて非表示にします。`
   - **審査用スクリーンショット**: 購入画面のスクショが必須（凜が用意可）
4. 保存

### あなたの作業2: RevenueCat 設定
1. https://app.revenuecat.com でアカウント作成（無料枠あり）
2. プロジェクト作成 → **Apple App Store** アプリを追加
   - Bundle ID: `com.infinitygames.wordquest`
   - **アプリ内課金キー（.p8）が必須**（SDK v5+ / StoreKit 2 では未設定だと購入が記録されない）
     - App Store Connect →「ユーザとアクセス」→「統合」→「アプリ内課金」→ キーを生成 → **.p8 は1回しかダウンロードできない**
     - 同じ画面の **Issuer ID** を控える
     - RevenueCat → Apps → iOSアプリ →「In-app purchase key configuration」に .p8 をアップロード＋Issuer ID を入力 → 保存
3. **Products** に `com.infinitygames.wordquest.removeads` を登録
4. **Entitlements** に `premium` を作成し、上の商品を紐付け
5. **API Keys** → Apple 用の **公開APIキー**（appl_ で始まる）をコピー

### そのキーを凜に渡す
凜がやること:
- `src/services/PurchaseService.ts` の `API_KEYS.ios` にキーを設定
- これで `PremiumCard` が自動的に再表示される（課金UIが復活）
- ビルド番号を上げてビルド

### そのあと あなたの作業
- Xcode で Archive → Upload
- App Store Connect で新バージョンを作り、**アプリ内購入も一緒に審査へ提出**

---

## 参考: 残っている改善タスク（急ぎではない）

- コンテンツ文言 約100件の英語化（ショップ/実績/ミッション/レイド等が英語UIでも日本語のまま）
- iOS ホーム画面ウィジェット（コードは実装済み、Xcodeでターゲット追加のみ）→ docs/ios-widget-setup.md
- Android版（Play Console でのリリース）
