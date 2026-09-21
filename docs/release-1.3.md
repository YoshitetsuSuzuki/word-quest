# v1.3 提出メモ（2026-09-21）

- バージョン: **1.3** / ビルド: **7**
- Bundle ID: `com.infinitygames.wordquest` / Apple ID: `6792366503`
- 収録: **全22言語 64,620語**（v1.2 は16言語 50,254語）

---

## 「このバージョンの新機能」

### 日本語

```
■ 6言語を追加しました（全22言語・64,620語）
ベトナム語・トルコ語・インドネシア語・マレー語・ウルドゥー語・エスペラントを
追加しました。どの言語も、辞書から作った候補をAI3人の全員一致で絞り、
最後に工程に関わっていない監査人が200語を抜き取って検証しています。

■ フレンドをホームから開けるようにしました
ランキング画面の奥にあって見つけにくかったので、ホームに要約カードを出します。
つつかれていれば件数が出ます。

■ 発音の自動再生をクイズ中に切り替えられます
設定の奥まで行かなくても、スピーカーの隣の「自動」を押すだけで止められます。

■ 配色テーマを3つから選べます
夜空・森・夕焼け。設定から切り替えられます。

■ 結果を画像で共有できます
Instagramのストーリーなどに載せられる縦長の画像を作ります。

■ そのほか
・韓国語の一部で、4択に別の言語の選択肢が混ざっていた不具合を直しました
・言語によって習得率や復習の件数が正しく出ていなかった不具合を直しました
・端末に音声が無い言語では、リスニングを出さないようにしました
```

### English

```
■ Six new languages (22 languages, 64,620 words)
Vietnamese, Turkish, Indonesian, Malay, Urdu and Esperanto. Every language goes
through the same pipeline: dictionary-derived candidates, three AI reviewers who
must agree unanimously, then a 200-word spot check by an independent auditor.

■ Friends is now on the home screen
It was buried in the ranking screen. The home card shows who hasn't studied today
and how many nudges are waiting for you.

■ Toggle pronunciation autoplay during a quiz
No need to dig into settings — tap "Auto" next to the speaker.

■ Three colour themes
Night, Forest and Sunset. Switch from settings.

■ Share your results as an image
Creates a vertical image you can post to Instagram Stories.

■ Fixes
・Korean quizzes sometimes mixed other languages into the four choices
・Mastery percentage and review counts were wrong for some languages
・Listening mode is hidden for languages with no voice on your device
```

---

## App のプライバシー

**変更不要。** v1.2 で申告した4種（ユーザーID・その他のユーザーコンテンツ・
使用状況データ・診断）のまま。v1.3 で新しく集めるデータは無い。

## 提出の手順

1. **Xcode で Archive**
   - `npm run ios` で Xcode が開く（build:app → cap sync まで走る）
   - デバイス選択を「**Any iOS Device (arm64)**」にする（シミュレータのままだと Archive が出ない）
   - Product → Archive
2. **Distribute App → App Store Connect → Upload**
   - 輸出コンプライアンスは Info.plist の `ITSAppUsesNonExemptEncryption = false` で聞かれない
3. **処理完了を待つ**（5〜30分）
4. **ASC で「+ バージョンまたはプラットフォーム」→ 1.3 を作成**
   - 「このバージョンの新機能」に上記を貼る
   - ビルドに **build 7** を選ぶ
   - スクリーンショットは v1.2 のものが引き継がれる
5. **「審査へ提出」**

## 審査で見られそうな点

- 機能の追加はフレンド導線・テーマ・画像共有のみで、v1.2 から**新たな権限要求は無い**。
- 画像共有は端末内で canvas から生成し、一時領域(Cache)に書いて共有シートへ渡すだけ。
  外部送信は無い。
- AdMob は v1.2 時点で本番の広告ユニットIDを入れて出荷済み。**本バージョンでの変更は無い**。

## 今回ふさいだ穴（社内向けの記録）

出荷済みだった不具合が2件あった。詳しくは commit 10212ef。
- 韓国語 1,248語で、日本語の4択に英単語が混ざっていた
- 学習記録をIDの接頭辞で見分けていたが対応表が画面ごとに手書きで、
  まなび画面で12言語・ホーム画面で6言語が英語の記録を拾っていた

再発防止として `CATEGORY_ID_PREFIX` を単一の正とし、
実データと突き合わせる `category-prefix.test.ts` を追加した。
リリース前検査(stage1/3-4/6-8)の対象も10言語→22言語に広げた。
