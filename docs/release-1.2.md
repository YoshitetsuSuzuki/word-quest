# v1.2 提出メモ（2026-09-20）

- バージョン: **1.2** / ビルド: **6**
- Bundle ID: `com.infinitygames.wordquest` / Apple ID: `6792366503`
- プライバシーポリシー: https://yoshitetsusuzuki.github.io/word-quest/privacy.html （改訂版を公開済み）

---

## 「このバージョンの新機能」

### 日本語

```
■ 全16言語5万語を総点検しました
収録している50,254語すべてを見直し、1,400件を超える訳語を修正しました。
「最頻出の意味が抜けている」「辞書の硬い言葉がそのまま入っている」といった
問題をひとつずつ潰しています。発音表記も、空欄をすべて埋め、誤りを直しました。

■ フレンド機能を追加しました
友達とコードを交換すると、連続学習日数と今週の学習語数を並べて見られます。
今日まだ学習していない友達には「つつく」ことができ、送った側にも受け取った側にも
コインが入ります。参加は任意です。

■ 相棒が呼んでくれるようになりました
しばらく開いていないと、相棒が声をかけてくれます。
覚えた単語は消えません。いつ戻ってきても、続きから始められます。

■ そのほか
・端末に音声が無い言語では、再生ボタンを表示しないようにしました
・読みにくい発音記号は既定で隠すようにしました（設定で表示できます）
```

### English

```
■ Swept all 16 languages
We reviewed every one of the 50,254 words and corrected more than 1,400
glosses — missing common meanings, stiff dictionary wording, and the like.
Every blank pronunciation has been filled in and notation errors fixed.

■ Friends
Exchange codes with a friend to compare study streaks and weekly word counts.
Nudge a friend who hasn't studied today — both of you get coins. Opt-in.

■ Your buddy calls for you
If you've been away a while, your buddy will reach out.
Your words don't disappear. Pick up wherever you left off.

■ Also
・The speak button is hidden for languages with no voice on your device
・Hard-to-read phonetic symbols are hidden by default (toggle in settings)
```

---

## App のプライバシー（**変更が必須**）

v1.1 までは「データを収集しない」。フレンド機能により以下3種の申告が必要。

| データの種類 | 目的 | 身元へのリンク | トラッキング |
|---|---|---|---|
| ユーザーID（フレンドコード） | Appの機能 | あり | なし |
| その他のユーザーコンテンツ（表示名） | Appの機能 | あり | なし |
| 使用状況データ（学習記録） | Appの機能 | あり | なし |

いずれも**トラッキングには使わない**（広告IDと結び付けない）。

---

## 提出の手順

1. **App Store Connect でプライバシー回答を更新**（App 単位。先に済ませておく）
2. **Xcode で Archive**
   - Xcode を開く: `npm run ios`
   - デバイス選択を「Any iOS Device (arm64)」にする（シミュレータのままだと Archive が出ない）
   - Product → Archive
3. **Distribute App → App Store Connect → Upload**
   - 輸出コンプライアンスは Info.plist に `ITSAppUsesNonExemptEncryption = false` を入れたので聞かれない
4. **処理完了を待つ**（5〜30分）
5. **ASC で「+ バージョンまたはプラットフォーム」→ 1.2 を作成**
   - 「このバージョンの新機能」に上記を貼る
   - ビルドに build 6 を選択
   - スクリーンショットは v1.1 のものが引き継がれる。フレンド画面を足すなら差し替え
6. **「審査へ提出」**

## 審査で見られそうな点

- **ガイドライン 1.2（UGC）**: 自由入力は表示名のみ。不適切語フィルタ・通報（mailto）・
  非表示を実装済み。フレンドは相互追加でしか繋がらず、見知らぬ人と繋がる導線は無い。
- **5.1.1（データ収集）**: フレンド機能は明示的な「参加する」ボタンを押すまで一切送信しない。
- **プライバシーポリシー**: フレンド機能で保存する4項目を列挙済み。

## 注意（PawPlanet で踏んだ罠）

- `TARGETED_DEVICE_FAMILY = 1`（iPhone専用）を確認済み。iPad スクショは要求されないはず。
- 承認後、「価格および配信状況 → Appの配信状況」で配信国が設定されているか確認すること。
  v1.1 で設定済みのはずだが、承認されても配信されない事故が PawPlanet で起きている。
