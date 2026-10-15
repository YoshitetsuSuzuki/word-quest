# Google Play ストア掲載情報（ちりつも単語）

作成: 2026-09-30 / 更新: 2026-10-11 / 対象: versionName **1.4** / versionCode **8**
AAB: **`~/Desktop/WordQuest-1.4-build8-noads.aab`** ／ 素材: `~/Desktop/play-assets/`

> ⚠️ **初回リリースは広告を出さない。** AdMob はアカウント不承認、後継の LevelPlay は
> Android 未導入のため、広告導線を出すと no-fill で「押しても何も起きないボタン」になる。
> `featureFlags.adsEnabled` を Android のみ false にしてある（commit a863362）。
> アプリ内購入も RevenueCat のキー未設定のため購入導線は自動で非表示。

---

## 1. ストアの設定

| 項目 | 値 |
|---|---|
| アプリ名（30字以内） | `ちりつも単語` |
| デフォルトの言語 | 日本語 |
| アプリ / ゲーム | **アプリ** |
| 無料 / 有料 | **無料**（※一度「無料」で公開すると有料には変更できない） |
| カテゴリ | 教育 |
| タグ | 語学学習、単語、学習ゲーム |
| メール | `yoshitetsugames21@gmail.com`（全アプリ共通の窓口） |
| ウェブサイト | `https://01-infinity.com` |
| プライバシーポリシー | `https://yoshitetsusuzuki.github.io/word-quest/privacy.html` |

## 2. 簡単な説明（80字以内）

```
語学学習アプリ。英語・韓国語・中国語など全22言語64,620語の単語を、1日5分の4択で。
```
（46字）

> ⚠️ 検索結果でアプリ名の下に出る。小さい端末では**最初の50字で切れる**ので、
> そこに「語学学習」「22言語」「単語」が入るよう前に寄せてある。

## 3. 詳しい説明（4000字以内）

**設計方針**（2026-10-15 に ASO を調査して改稿）
- Google Play は**説明文全体を検索インデックス**する（App Store と違いキーワード欄が無い）
  → **言語名を本文に列挙**し、「韓国語 アプリ」等で引っかかるようにする
- 「このアプリについて」を展開しないと見えないため、**冒頭3行に要点を全部入れる**
- `最高` `No.1` `新登場` 等の誇張表現と「今すぐダウンロード」等のCTAは**規約で避ける**
- キーワードの詰め込みは逆効果。自然な文章の中に置く

```
語学学習を、単語から。全22言語・64,620語を収録した単語アプリです。
英語・中国語・韓国語・スペイン語からアラビア語・ベトナム語まで、1日5分の4択で語彙を増やせます。
文字が読めない段階から始められるよう、言語ごとに「はじめかた」と文字一覧を用意しました。

▼ 収録している22言語
英語／中国語／韓国語／スペイン語／フランス語／ドイツ語／イタリア語／ポルトガル語／
ロシア語／ポーランド語／トルコ語／ヒンディー語／ベンガル語／ウルドゥー語／アラビア語／
タガログ語／インドネシア語／マレー語／ベトナム語／モンゴル語／エスペラント
英語話者向けに日本語も学べます。

■ 文字が読めないところから始められます
「韓国語を始めたいのに、안녕하세요 が読めない」
そこでつまずく人のために、言語ごとの「はじめかた」を用意しました。
どんな文字があるのか、どう読むのか、語順はどうなっているのか、まず言える挨拶は何か。
その言語を初めて選んだときに自動で開きます。

■ 覚える文字の一覧
ハングルは40個、かなは46個、アラビア文字は28個。
「見慣れない模様」が「数えられる部品」に変わります。
ㅎ + ㅏ + ㄴ → 한 のように、部品から1文字ができる様子も図で見せます。
中国語は漢字が多いため、拼音（ピンイン）の読み方と、やさしい単語の読みを載せています。

■ 訳の正しさに手間をかけています
辞書から機械的に引いた訳をそのまま載せてはいません。
複数の判定を通し、そのうえで別の監査者が抜き取りで検算しています。
「辞書の硬い言葉がそのまま入っている」「最頻出の意味が抜けている」を、
1件ずつ潰してきました。

■ 単語学習のしくみ
・4択クイズで、意味と読みをまとめて覚えます
・間違えた単語だけを集めて復習できます
・発音を聞けます（端末に音声がある言語）
・レベル別に区切ってあるので、どこから始めても迷いません
・例文で使い方を確認できます

■ 続けるための仕組み
・相棒が育ちます。解くほど経験値が入り、進化します
・連続学習日数が積み上がります
・友達とコードを交換すると、連続日数と今週の語数を並べて見られます
・1日の目標は10問・20問・30問から選べます。あとから変えられます

■ こんな方に
・英単語や第二外国語の語彙を増やしたい
・旅行や留学の前に、現地の言葉を覚えておきたい
・独学で語学を始めたが、文字の段階で止まっている
・通勤・通学の5分を学習にあてたい

ちりも積もれば山となる。その積もり方が目に見えるように作りました。

―――
・バナー広告や全画面の差し込み広告は入れていません
・ダウンロード後はオフラインでも学習できます
・お問い合わせ: yoshitetsugames21@gmail.com
```

## 3.5 英語版の掲載文（en-US）

全世界配信するなら日本語だけでは取りこぼす。Play Console の
「ストアの掲載 → メインのストアの掲載情報 → 翻訳を管理 → 英語（米国）」から追加する。

### アプリ名（30字以内）

```
Chiritsumo Tango
```
（16字）※ 発見性を上げるなら `Chiritsumo Tango: 22 Languages`（ちょうど30字）も可。
ブランドの一貫性を取るなら前者。アプリ内の英語表示名も `Chiritsumo Tango`。

### 簡単な説明（80字以内）

```
22 languages, 64,620 words. Begin even if you can't read a single letter yet.
```
（77字）

### 詳しい説明（4000字以内）

```
You wanted to try Korean. You opened an app, saw 안녕하세요, couldn't read a single
character, and closed it again.

Chiritsumo Tango exists to remove that first failure.

■ No language throws you straight into multiple choice
Every one of the 22 languages has a "Getting Started" page. What characters exist.
How they sound. How word order works. The first greeting you can actually say.
And where beginners usually stumble. It opens by itself the first time you pick
a language.

■ Here is every character you need
We list them all. Hangul has 40. Japanese kana, 46. The Arabic script, 28.
What looked like unfamiliar patterns turns into a set you can count.
Diagrams show how parts combine into one character: ㅎ + ㅏ + ㄴ → 한.
Chinese has far too many characters for that, so instead you get how Pinyin is
read, plus easy words with their readings marked.

■ 22 languages, 64,620 words
English, Chinese, Korean, Spanish, French, German, Portuguese, Russian, Polish,
Hindi, Arabic, Tagalog, Italian, Mongolian, Bengali, Malay, Indonesian, Urdu,
Turkish, Vietnamese, Esperanto — and Japanese, for English speakers.

■ We take the translations seriously
Dictionary output is not shipped as-is. Every entry passes several independent
checks, and a separate auditor spot-checks the result afterwards. Stiff
dictionary phrasing, a missing primary meaning: we have closed them one at a time.

■ Built so that you come back
- A companion grows as you study. It gains experience and evolves
- Your streak counts up, day by day
- Trade codes with a friend and compare streaks and weekly word counts
- Collect only the words you got wrong and review those
- Hear pronunciation, for the languages your device can speak

■ Five minutes a day
Set your daily goal to 10, 20 or 30 questions. Change it whenever you like.
"Chiritsumo" comes from a Japanese saying: even dust, piled up, becomes a mountain.
We built this so that you can watch it pile.

---
- No banner ads. No full-screen interstitials.
- Works offline once downloaded.
- Contact: yoshitetsugames21@gmail.com
```

⚠️ 英語ロケールのスクリーンショットは未作成。日本語のものがそのまま使われる。
気になるなら後日 `VITE_DEMO` + 英語ロケールで撮り直す（`scripts/make_store_shots.py` が流用できる）。

## 4. グラフィック素材（`~/Desktop/play-assets/`）

| 素材 | ファイル | 仕様 | 状態 |
|---|---|---|---|
| アプリアイコン | `icon-512.png` | 512×512 / 32bit PNG（アルファ付き） | ✅ |
| フィーチャーグラフィック | `feature-graphic-1024x500.png` | 1024×500 | ✅ |
| スクリーンショット① | `01-home.png` | 1080×1920（9:16） | ✅ |
| スクリーンショット② | `02-guide.png` | 同上 | ✅ |
| スクリーンショット③ | `03-chart.png` | 同上 | ✅ |
| スクリーンショット④ | `04-quiz.png` | 同上 | ✅ |

⚠️ 端末の生スクショ（1080×2400）は **最大辺が最小辺の2倍を超えるため Play の要件違反**。
必ず 1080×1920 に作り直したものを使う。

## 5. データセーフティ申告（iOS のプライバシー申告と同じ結論にする）

### 収集するデータ

> **2026-10-15 実際に申告した内容に差し替え済み。** 以前の版は広告IDを「いいえ」としていたが、
> 実物の AAB に `AD_ID` 権限と `MobileAdsInitProvider` があり、`AdService.init()` が
> `featureFlags.adsEnabled` を見ずに無条件で走るため **Android でも AdMob SDK は初期化される**。
> 過少申告は違反になるため「収集あり・共有あり」で申告した。詳細は [[wordquest-known-traps]] の7番。

| 種類 | 収集 | 目的 | 必須か | 共有 |
|---|---|---|---|---|
| 名前（表示名） | はい | アプリの機能 | **任意**（フレンド参加時のみ） | しない |
| アプリのアクティビティ（アプリでのインタラクション） | はい | アプリの機能 | **任意**（同上） | しない |
| デバイスまたはその他のID（広告ID） | **はい** | **広告またはマーケティング** | **必須** | **する** |

※ フレンドコードは「名前」とは別項目を立てず、表示名の一部として扱った（Play の分類に
「ユーザーID」に当たる独立項目がなく、過剰に項目を増やすと掲載が不正確になるため）。

### 回答のポイント
- **データは転送時に暗号化されますか** → **はい**（Supabase へ HTTPS）
- **データの削除をリクエストできますか** → **はい**。削除用 URL は
  `https://yoshitetsusuzuki.github.io/word-quest/privacy.html`。
  **アプリ内に退会機能は無い**ので、プライバシーポリシーに「件名『データ削除希望』＋
  フレンドコードをメール → 30日以内に削除」の手順と保持期間を明記して条件を満たした
- **トラッキング目的の利用** → **なし**。広告は `npa: true`（非パーソナライズ）で配信するため広告IDと結び付けない
- フレンド機能は**明示的に「参加する」を押すまで一切送信しない**。押さなければ収集ゼロ

## 6. コンテンツのレーティング

- カテゴリ: **教育**
- 暴力・性的表現・下品な表現・薬物・ギャンブル: **いずれも なし**
  （全22言語64,620語を機械検査済み。露骨語は検出・除去済み）
- ユーザー コンテンツの共有: **なし**。設問が挙げるのは音声通信・SMS・画像/オーディオの共有の
  4手段で、本アプリはいずれも持たない（表示名が見えるだけ、つつきは定型文）
- アプリは主にニュースまたは教育商品か: **はい**（ストアのカテゴリも教育アプリ）
- ユーザーの現在地の共有: なし
- デジタル購入: **なし**（初回リリースは IAP 商品を登録しておらず購入導線も非表示。
  ⚠️ 課金を足すときに**レーティングを再回答すること**。Play Console 側で商品登録の作業が
  必ず発生するので、そのタイミングで思い出せる）

## 6.5 広告の申告（アプリのコンテンツ → 広告）

**「はい、広告が含まれています」と申告する。**

初回ビルドでは広告は1つも表示されないが、数週間のうちに LevelPlay を入れる予定であり、
そのときは**アプリの更新だけ**で広告が出る＝申告の更新を忘れると規約違反になる。
いま「はい」にしておけば、後から申告を触る必要がない。代償は掲載ページに付く
「広告を含む」ラベルのみ。

（デジタル購入を「なし」にするのとは判断が分かれるが、課金は Play Console 側で
商品を登録する作業が必ず挟まるため、その場でレーティングを直せる＝忘れにくい。）

## 7. 提出前の最終チェック

- [ ] AAB が最新か（`versionCode 8` / 広告オフ版 `-noads`）
- [ ] 組織アカウントの登録完了（D-U-N-S・組織ウェブサイト）
- [ ] プライバシーポリシーURL が生きているか
- [ ] データセーフティを上記どおり回答
- [ ] コンテンツレーティングのアンケート完了
- [ ] 価格と配信国の設定
