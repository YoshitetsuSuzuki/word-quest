# 日本語を学習ターゲットに追加(英語圏向け) 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 英語圏ユーザーが日本語(JLPT N5)を英語の訳で学べる新カテゴリ `japanese` を追加する(クイズ先行・N5パイロット)。

**Architecture:** 中国語英語パイロットの器(glosses/localizedChoices/出題フィルタ/空プール対策)を再利用。新カテゴリ `japanese` を型・カタログ・音声・リポジトリに配線し、JMdict(JP→EN)を語義の確定に使う。カテゴリの母語別出しわけは `availableLocales` でデータ駆動化。ja母語には非表示。

**Tech Stack:** React+TS+Vite。データ生成は node スクリプト。JMdict `.cache/jmdict-eng-common-3.6.2.json`。

**Spec:** docs/superpowers/specs/2026-07-06-japanese-target-design.md

**各実装エージェントへ厳守事項:** サブエージェント委譲は禁止(単独完遂)。作業ディレクトリ /Users/yoshitetsu/英単語資産アプリ、ブランチ main。各コミット末尾に空行+`Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`。

---

### Task 1: 新カテゴリ `japanese` の配線(データはまだ無し・coming soon)

**Files:** `src/types/index.ts`, `src/data/categories.ts`, `src/screens/HomeScreen.tsx`, `src/screens/StudyScreen.tsx`, `src/utils/speech.ts`, `src/repositories/LocalQuestionRepository.ts`, `src/i18n/{types,ja,en}.ts`

- [ ] **Step 1: Category union に japanese を追加**

`src/types/index.ts`:
```ts
export type Category =
  | 'english'
  | 'chinese'
  | 'korean'
  | 'japanese'
```

- [ ] **Step 2: categories.ts に availableLocales とエントリ追加**

`src/data/categories.ts` の `CategoryInfo` に `availableLocales` を追加し、各カテゴリに設定。Locale型を import。
```ts
import type { Category } from '../types'
import type { Locale } from '../i18n/types'

export interface CategoryInfo {
  id: Category
  label: string
  emoji: string
  available: boolean
  /** その母語(UI言語)で学習対象として表示するロケール */
  availableLocales: Locale[]
}

export const categories: CategoryInfo[] = [
  { id: 'english', label: '英単語', emoji: '🇬🇧', available: true, availableLocales: ['ja'] },
  { id: 'chinese', label: '中国語', emoji: '🇨🇳', available: true, availableLocales: ['ja', 'en'] },
  { id: 'korean', label: '韓国語', emoji: '🇰🇷', available: true, availableLocales: ['ja'] },
  { id: 'japanese', label: '日本語', emoji: '🇯🇵', available: false, availableLocales: ['en'] },
]
```
(available:false = データ投入まで「coming soon」。Task 4 で true に)

- [ ] **Step 3: HomeScreen をデータ駆動フィルタに置換**

`src/screens/HomeScreen.tsx`。現在の `localeCats` 定義を差し替え:
```ts
  const localeCats = categories.filter((c) => c.availableLocales.includes(locale))
```
`catNameKey`(17行目付近)に japanese を追加:
```ts
const catNameKey = (id: string) =>
  (id === 'chinese' ? 'cat.chinese' : id === 'korean' ? 'cat.korean' : id === 'japanese' ? 'cat.japanese' : 'cat.english') as keyof Strings
```
`levelLabel`(41行目付近)を japanese の JLPT 表示に対応(N5=Lv1 … N1=Lv5):
```ts
  const levelLabel = (n: number) =>
    category === 'chinese' ? `HSK${n}` : category === 'japanese' ? `N${6 - n}` : `Lv${n}`
```
習得率 `prefix`(48行目付近)に japanese を追加:
```ts
  const prefix = category === 'chinese' ? 'zh' : category === 'korean' ? 'ko' : category === 'japanese' ? 'jp' : 'en'
```

- [ ] **Step 4: StudyScreen も同様に japanese 対応**

`src/screens/StudyScreen.tsx`:
- `catNameKey`(19行目付近)に japanese→'cat.japanese' を追加(HomeScreen と同じ式)。
- `CAT_PREFIX` 定数に `japanese: 'jp'` を追加。
- `levelLabel`(116行目付近)を `category === 'chinese' ? \`HSK${n}\` : category === 'japanese' ? \`N${6 - n}\` : \`Lv${n}\`` に。

- [ ] **Step 5: speech.ts に ja-JP を追加**

`src/utils/speech.ts`(44行目付近):
```ts
  const lang = category === 'chinese' ? 'zh-CN' : category === 'korean' ? 'ko-KR' : category === 'japanese' ? 'ja-JP' : 'en-US'
```
`src/screens/ListeningScreen.tsx`(87行目付近 speechLang)も同じ式に更新。

- [ ] **Step 6: リポジトリの対象カテゴリに japanese を追加**

`src/repositories/LocalQuestionRepository.ts`(12行目付近):
```ts
const WORDBANK_CATEGORIES = new Set<Category>(['english', 'chinese', 'korean', 'japanese'])
```

- [ ] **Step 7: i18n に cat.japanese 追加**

`src/i18n/types.ts` の Strings に `'cat.japanese': string` を追加(cat.* の並び)。`ja.ts` に `'cat.japanese': '日本語'`、`en.ts` に `'cat.japanese': 'Japanese'`。

- [ ] **Step 8: ビルド＆キー整合＆コミット**

Run: `cd /Users/yoshitetsu/英単語資産アプリ && npm run build` → ✓ built
Run: `npx -y tsx tools/test-i18n.ts` → i18n keys OK(ja/en一致)
```bash
git add src/types/index.ts src/data/categories.ts src/screens/HomeScreen.tsx src/screens/StudyScreen.tsx src/utils/speech.ts src/screens/ListeningScreen.tsx src/repositories/LocalQuestionRepository.ts src/i18n
git commit -m "feat: wire up 'japanese' category (data-driven locale availability); coming soon"
```

---

### Task 2: JLPT N5 語彙リスト取得 + build-japanese.mjs(候補生成)

**Files:** `.cache/`(取得物), `tools/build-japanese.mjs`(新規), `tools/gloss.en.japanese.candidates.json`(生成), `public/wordbank/CREDITS.md`

- [ ] **Step 1: JLPT N5 の語彙リストを取得**

オープンな JLPT N5 単語リスト(表記・かな読み・(あれば)ローマ字・級)を `.cache/jlpt-n5.json`(または .tsv/.csv)として取得する。候補ソース(順に試す):
  - `https://raw.githubusercontent.com/jamsinclair/open-anki-jlpt-decks/master/src/n5.csv`
  - `https://raw.githubusercontent.com/elzup/jlpt-word-list/master/src/n5.json`
  - 上記が取得不可なら、他の公開JLPT N5 vocabリスト(CC/公共)を探して取得。
取得形式(表記・読み)を実物で確認する。**どれも取得できない場合は BLOCKED として報告**(捏造しない)。ライセンス/出典を控える。

- [ ] **Step 2: build-japanese.mjs(候補生成＋wordbank生成)**

`tools/build-japanese.mjs`(新規)を作成:
1. `.cache/jlpt-n5.json` を読み、各語 `{ word(表記), kana(読み), level:1 }` の配列を作る(N5→level 1)。表記が無くかなのみの語は word=kana。
2. `.cache/jmdict-eng-common-3.6.2.json` を読む。構造: `words[]`、各 `w.kanji[].text` / `w.kana[].text` / `w.sense[].gloss[].text`(英語)。表記→英語gloss配列、かな→英語gloss配列 の索引を作る(sense順=重要度順で先頭を優先、`w.sense[].partOfSpeech` も保持)。
3. 各JLPT語について、表記(無ければかな)でJMdictを引き、英語gloss候補(先頭sense中心に最大4件)を集める。`tools/gloss.en.japanese.candidates.json` に `{ "見出し": { kana, cand:[...], pick:cand[0] } }` を書く。JMdictに無い語は candidates に含めず「JMdict無リスト」として報告。
4. かな→ヘボン式ローマ字変換関数 `kanaToRomaji(kana)` を実装(五十音・濁音・半濁音・拗音(きゃ等)・促音(っ=次子音重複)・長音(ー/おう→ō ではなく素直に o u でよい=学習者可読性優先)。変換不能文字はそのまま残す)。この関数は Task4 の wordbank 生成で使う。
5. **wordbank生成**: 確定版 `tools/gloss.en.japanese.json`(次タスク生成、{見出し:"english"})を try/catch で読み、存在する見出しだけを Question 化して `public/wordbank/japanese/level-{1..5}.json` ＋ manifest に出力する。Question:
   - id: `jp-${5桁連番}`, category:'japanese'
   - prompt: `「${word}」の意味は？`
   - answer: 英語gloss(確定版), glosses: { en: 英語gloss }
   - choices: shuffle([gloss, ...同カテゴリ英語glossのダミー3])(既存 build-chinese の pickDistractors 相当を実装)
   - difficulty: level(N5=1), tags: [品詞ラベル], pronunciation: `${kana} (${kanaToRomaji(kana)})`
   - verified: true
   - 確定版が無ければ questions=0(空)で生成(エラーにしない)。
6. コンソールに: JLPT語数、JMdict候補が得られた語数、JMdict無語数、(確定版があれば)生成Question数 を出力。

- [ ] **Step 3: 実行して候補生成を確認**

Run: `node tools/build-japanese.mjs`
Expected: candidates.json 生成、JLPT語数と候補数が出る。確定版はまだ無いので wordbank は 0 語(または未生成)。

- [ ] **Step 4: CREDITS 追記＆コミット**

`public/wordbank/CREDITS.md` に JLPT N5 リストの出典・ライセンスと JMdict(EDRDG, CC BY-SA)を追記。
```bash
git add tools/build-japanese.mjs tools/gloss.en.japanese.candidates.json public/wordbank/CREDITS.md .cache/jlpt-n5.json
git commit -m "feat: JLPT N5 list + build-japanese candidate generation (JMdict)"
```
(注: .cache が .gitignore 対象なら .cache は add されない。その場合はコミットから外し、再取得手順を CREDITS に明記)

- [ ] **Step 5: 報告**: JLPT語数、候補取得率、JMdict無語の例、kanaToRomaji のテスト例5件(さかな→sakana, きゃく→kyaku, がっこう→gakkou, せんせい→sensei, りょこう→ryokou)。

---

### Task 3: 英語グロスの検証・確定(N5)

**Files:** `tools/gloss.en.japanese.json`(生成), `public/wordbank/japanese/*`(再生成)

- [ ] **Step 1: 検証エージェントで確定**

`tools/gloss.en.japanese.candidates.json`({見出し:{kana,cand,pick}})の各語について、**N5学習者が最初に覚えるべき中心義**の英語gloss を1つ確定する。
- 候補から選ぶ。冗長注記((coll.)/(abbr.)/see also 等)や専門義・古語は避け、簡潔な中心義(名詞は素の名詞、動詞は "to ..." など)にする。
- kana(読み)も参照して同音異義の取り違えを防ぐ。
- 適切な候補が無い/曖昧な語は**除外**(非出荷=英語ロケールで非表示)。
出力 `tools/gloss.en.japanese.json` = { "見出し": "english gloss", ... }(整形JSON)。JSON構文を node で検証。

- [ ] **Step 2: build＆確認**

Run: `node tools/build-japanese.mjs`(確定版を読み wordbank 生成)→ 生成Question数を確認。
Run: `npm run build` → ✓ built。
`public/wordbank/japanese/manifest.json` の total/level-1 count を確認。

- [ ] **Step 3: セルフ検品＆コミット**

確定分からランダム30語を、kana↔英gloss で語義一致を目視確認(報告に含める)。
```bash
git add tools/gloss.en.japanese.json public/wordbank/japanese
git commit -m "feat: verified English glosses for Japanese JLPT N5"
```

---

### Task 4: 公開(available:true)・実機確認・デプロイ

**Files:** `src/data/categories.ts`

- [ ] **Step 1: japanese を有効化**

`src/data/categories.ts` の japanese エントリを `available: true` に変更。

- [ ] **Step 2: ビルド＆プレビューE2E**

Run: `npm run build` → ✓ built。preview_start(wordquest-dev)。
プレビューで localStorage を `wordquest.locale='en'` にしてリロード:
  1. ホームの学習ジャンルに 🇯🇵 Japanese が表示され選択できる
  2. Japanese選択→クイズ: 問題は日本語単語(枠なし)、読み(かな+romaji)表示、選択肢は英語、日本語音声(ja-JP)、採点OK
  3. レベルchipが N5..（存在級）表示
  4. `wordquest.locale='ja'` にリロード → Japanese が**出ない**(ja母語には非表示)、既存カテゴリは従来どおり
  5. 英語グロス未整備語が出題されない(空プールにならない)

- [ ] **Step 3: コミット＆デプロイ**

```bash
git add src/data/categories.ts && git commit -m "feat: enable Japanese (JLPT N5) learning target for English learners"
git push   # GitHub Pages 自動デプロイ(失敗時 gh workflow run deploy.yml)
```

- [ ] **Step 4: メモリ更新** — wordquest-app.md に日本語ターゲット(N5英語パイロット)の要点を追記。

---

### 拡大フェーズ(N5確認後・別サイクル)
- JLPT N4-N1 の語彙＋グロスへ拡大(同パイプライン)。
- 日本語の例文＋リスニング穴埋め(Tatoeba日英)。
- 将来: 他母語(es等)向けの日本語グロス。
