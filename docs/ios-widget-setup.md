# iOSホーム画面ウィジェット セットアップ手順

連続記録・今日の進捗・今日の1語をホーム画面に表示するウィジェットです。
コード（データ連携・SwiftUI本体）は実装済みで、**Xcodeでの「ターゲット追加」だけが手作業**です
（Xcodeプロジェクトへのターゲット追加は、GUIでないと安全に行えないため）。

所要時間: 10〜15分。ネイティブビルドが通れば完成します。

---

## 実装済みのもの（触らなくてよい）

- `src/services/WidgetService.ts` … アプリ→ウィジェットのデータ書き出し（App Group経由）
- `src/screens/HomeScreen.tsx` … ホーム表示時に連続記録・今日の1語を書き出す
- `ios/WordQuestWidget/WordQuestWidget.swift` … ウィジェット本体（SwiftUI）
- `@capacitor/preferences` … App Group対応の保存プラグイン（導入済み）

---

## 手順

### 1. Widget Extension ターゲットを追加
1. Xcodeで `ios/App/App.xcworkspace` を開く
2. メニュー **File → New → Target…**
3. **Widget Extension** を選び Next
4. Product Name: `WordQuestWidget` / Include Configuration Intent: **オフ** / Finish
5. 「Activate scheme?」は **Cancel**（Appスキームのまま）

### 2. 生成されたテンプレを差し替え
- 追加された `WordQuestWidget/WordQuestWidget.swift` の中身を、
  本リポジトリの `ios/WordQuestWidget/WordQuestWidget.swift` の内容で**丸ごと置き換える**
- テンプレの `Assets` や `Info.plist` はそのままでよい

### 3. App Group を両方のターゲットに付与（データ共有の要）
両方のターゲットで同じ App Group を有効にする：
1. **App** ターゲット → Signing & Capabilities → **+ Capability → App Groups**
2. `group.com.infinitygames.wordquest` を追加（チェックを入れる）
3. **WordQuestWidget** ターゲットでも同様に **App Groups** を追加し、同じ `group.com.infinitygames.wordquest` にチェック

> ⚠️ この App Group 名は `src/services/WidgetService.ts` の `WIDGET_APP_GROUP` と
> `WordQuestWidget.swift` の `appGroup` に一致済み。変える場合は3箇所すべて合わせること。

### 4. ディープリンク（ウィジェットのタップでアプリを開く）
ウィジェットは `wordquest://open` で開く設定。URLスキームを登録する：
1. **App** ターゲット → Info → **URL Types** → +
2. URL Schemes に `wordquest` を入力

（未登録でもウィジェット表示は動作します。タップ起動だけ効かなくなります）

### 5. ビルド
1. `npm run build:app && npx cap sync ios`
2. Xcodeで **App** スキームを実機ビルド
3. ホーム画面を長押し → **+** → WordQuest を追加

---

## 動作確認
- アプリのホーム画面を一度開く（＝データが書き出される）
- ホーム画面のウィジェットに「🔥連続日数」「今日の1語」「今日◯/◯」が出れば成功
- まだデータが無い場合は「今日の単語をやろう」の静的表示になる（正常）

## 任意: 即時更新
アプリでデータを書いた直後にウィジェットを更新したい場合、`AppDelegate` に一行：
```swift
import WidgetKit
// applicationDidBecomeActive などで
if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
```
未実装でも、ウィジェットは1時間ごと＋iOSの判断で自動更新されます。

## トラブルシュート
- **ウィジェットが「今日の単語をやろう」のまま** → App Group名の不一致が最有力。3箇所（TS/Swift/両ターゲットのCapability）を確認
- **ビルドエラー `No such module 'WidgetKit'`** → ターゲットのDeployment TargetがiOS 14以上か確認
- **データが古い** → アプリのホームを開き直す。即時更新が必要なら上記「任意: 即時更新」を追加
