# 多言語対応(英語母語・中国語ターゲット) 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 英語母語ユーザーがWordQuestのUIを英語で操作し、中国語を英語の訳・英訳例文で学べるようにする(HSK1パイロット→拡大)。

**Architecture:** UI文言をロケール辞書(`ja`/`en`)に切り出し `t()` で参照。Question に `glosses`/`exampleTranslations`(ロケール別)を後方互換で追加。中国語→英語グロスはCC-CEDICT×検証済み日本語訳のクロスで生成し三重検証。英語ロケールでは英語グロスで4択をランタイム生成、未整備語は出題除外。locale=ja時は全挙動が現状不変。

**Tech Stack:** React + TypeScript + Vite + Tailwind。テストは `npx -y tsx` の机上実行。

**Spec:** docs/superpowers/specs/2026-07-06-i18n-english-native-design.md

---

### Task 1: ロケール基盤(型・辞書・t()・locale決定)

**Files:**
- Create: `src/i18n/types.ts`, `src/i18n/ja.ts`, `src/i18n/en.ts`, `src/i18n/index.ts`
- Create: `tools/test-i18n.ts`

- [ ] **Step 1: ロケール型と辞書キーの土台**

```ts
// src/i18n/types.ts
export type Locale = 'ja' | 'en'
export const LOCALES: Locale[] = ['ja', 'en']
/** 全画面共通のUI文言キー。ja/en は同一キー集合を持つこと。 */
export interface Strings {
  'nav.home': string; 'nav.quiz': string; 'nav.study': string; 'nav.rank': string; 'nav.profile': string
  'home.startQuiz': string; 'home.listening': string; 'home.dailyGoal': string
  'quiz.pickMeaning': string; 'quiz.correct': string; 'quiz.next': string; 'quiz.result': string
  'listening.pickBlank': string; 'listening.pickMeaning': string; 'common.report': string
}
```

- [ ] **Step 2: 日本語辞書(既存文言を移設)**

```ts
// src/i18n/ja.ts
import type { Strings } from './types'
export const ja: Strings = {
  'nav.home': 'ホーム', 'nav.quiz': 'クイズ', 'nav.study': 'まなび', 'nav.rank': 'ランク', 'nav.profile': 'プロフ',
  'home.startQuiz': '▶ クイズをはじめる', 'home.listening': '🎧 リスニング', 'home.dailyGoal': '今日の目標',
  'quiz.pickMeaning': '意味を選ぼう', 'quiz.correct': '正解', 'quiz.next': '次の問題へ →', 'quiz.result': '結果を見る',
  'listening.pickBlank': '文を聴いて、空欄に入る単語を選ぼう', 'listening.pickMeaning': '音声を聴いて、意味を選ぼう', 'common.report': '⚠️ この単語の誤りを報告',
}
```

- [ ] **Step 3: 英語辞書(同一キー)**

```ts
// src/i18n/en.ts
import type { Strings } from './types'
export const en: Strings = {
  'nav.home': 'Home', 'nav.quiz': 'Quiz', 'nav.study': 'Learn', 'nav.rank': 'Rank', 'nav.profile': 'Profile',
  'home.startQuiz': '▶ Start quiz', 'home.listening': '🎧 Listening', 'home.dailyGoal': "Today's goal",
  'quiz.pickMeaning': 'Choose the meaning', 'quiz.correct': 'Correct', 'quiz.next': 'Next →', 'quiz.result': 'See results',
  'listening.pickBlank': 'Listen and pick the missing word', 'listening.pickMeaning': 'Listen and choose the meaning', 'common.report': '⚠️ Report an error',
}
```

- [ ] **Step 4: locale決定と t() 提供**

```ts
// src/i18n/index.ts
import { ja } from './ja'
import { en } from './en'
import type { Locale, Strings } from './types'

const DICTS: Record<Locale, Strings> = { ja, en }
const KEY = 'wordquest.locale'

export function detectLocale(): Locale {
  const saved = localStorage.getItem(KEY)
  if (saved === 'ja' || saved === 'en') return saved
  return (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en'
}
export function setLocale(l: Locale): void { localStorage.setItem(KEY, l) }
export function makeT(locale: Locale) {
  const dict = DICTS[locale] ?? ja
  return (key: keyof Strings): string => dict[key] ?? ja[key] ?? String(key)
}
```

- [ ] **Step 5: キー集合一致の机上テスト**

```ts
// tools/test-i18n.ts — npx -y tsx tools/test-i18n.ts
import { ja } from '../src/i18n/ja'
import { en } from '../src/i18n/en'
const jk = Object.keys(ja).sort(), ek = Object.keys(en).sort()
const missingEn = jk.filter((k) => !(k in en))
const missingJa = ek.filter((k) => !(k in ja))
if (missingEn.length || missingJa.length) {
  console.error('KEY MISMATCH  missing in en:', missingEn, ' missing in ja:', missingJa)
  process.exit(1)
}
console.log('i18n keys OK:', jk.length)
```

- [ ] **Step 6: テスト実行**

Run: `cd /Users/yoshitetsu/英単語資産アプリ && npx -y tsx tools/test-i18n.ts`
Expected: `i18n keys OK: <n>`

- [ ] **Step 7: コミット**

```bash
git add src/i18n tools/test-i18n.ts
git commit -m "feat: i18n foundation (locale detect, ja/en dicts, t())"
```

---

### Task 2: nav に locale を載せ、アプリに配線

**Files:**
- Modify: `src/state/nav.tsx`, `src/App.tsx`

- [ ] **Step 1: NavApi に locale/t を追加**(`src/state/nav.tsx`、`import type { Strings }` と `Locale` を i18n から import)

nav.tsx の interface に追記:
```ts
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof Strings) => string
```
ファイル冒頭に:
```ts
import type { Locale, Strings } from '../i18n/types'
```

- [ ] **Step 2: App.tsx で locale state と t を生成し Provider に渡す**

App.tsx の import に追加:
```ts
import { detectLocale, setLocale as persistLocale, makeT } from './i18n'
import type { Locale } from './i18n/types'
```
state 追加(既存 useState 群の近く):
```ts
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale())
  const setLocale = (l: Locale) => { setLocaleState(l); persistLocale(l) }
  const t = makeT(locale)
```
NavContext.Provider の value に `locale, setLocale, t,` を追加。

- [ ] **Step 3: ビルド確認**

Run: `npm run build`
Expected: 型エラーゼロ・✓ built

- [ ] **Step 4: コミット**

```bash
git add src/state/nav.tsx src/App.tsx
git commit -m "feat: wire locale + t through nav context"
```

---

### Task 3: UI文言の差し替え(全画面)

**Files:**
- Modify: `src/components/BottomNav.tsx`, `src/screens/HomeScreen.tsx`, `src/screens/QuizScreen.tsx`, `src/screens/ListeningScreen.tsx`, `src/screens/StudyScreen.tsx`, `src/screens/ProfileScreen.tsx`, `src/screens/RankingScreen.tsx`, `src/screens/BattleScreen.tsx`, `src/screens/RaidScreen.tsx`, `src/screens/MissionsScreen.tsx`, `src/screens/ShopScreen.tsx`, `src/components/OnboardingModal.tsx`, `src/components/LoginBonusModal.tsx`, `src/components/CelebrationOverlay.tsx`, `src/components/DailyLoopCard.tsx`, `src/components/WeeklyChart.tsx`, `src/components/TopBar.tsx`
- Modify: `src/i18n/types.ts`, `src/i18n/ja.ts`, `src/i18n/en.ts`(キー追加)

**方針**: 各ファイルで日本語リテラルを洗い出し、`Strings` にキーを追加(ja=既存文言/en=英訳)し、`const { t } = useNav()` を使って `t('...')` に置換する。1画面=1ステップ+コミットで進める。以下は BottomNav を例に、他画面も同型で行う。

- [ ] **Step 1: BottomNav を置換**

`src/i18n/types.ts` の Strings に nav.* は定義済み。BottomNav.tsx を:
```tsx
import { useNav } from '../state/nav'
export function BottomNav() {
  const { screen, navigate, t } = useNav()
  const items = [
    { screen: 'home', label: t('nav.home'), icon: '🏠' },
    { screen: 'quiz', label: t('nav.quiz'), icon: '📝' },
    { screen: 'study', label: t('nav.study'), icon: '📚' },
    { screen: 'ranking', label: t('nav.rank'), icon: '🏆' },
    { screen: 'profile', label: t('nav.profile'), icon: '👤' },
  ] as const
  // ...既存のレンダリングで item.label を使用
}
```
Run: `npm run build` → ✓ built。Commit: `git commit -am "i18n: BottomNav"`.

- [ ] **Step 2〜N: 残り各画面を同型で置換(1画面ごとにキー追加→t()置換→build→commit)**

各画面の主な文言と英訳の対応表(この表に沿ってキー追加):
- HomeScreen: "▶ クイズをはじめる"→"Start quiz", "今日の目標"→"Today's goal", "の習得"→"learned", "🔥 N日連続学習中"→"🔥 N-day streak", "学習ジャンル"→"Language", "レベル"→"Level", "おまかせ"→"Mixed"
- QuizScreen: "意味を選ぼう"→"Choose the meaning", "難易度"→"Difficulty", "正解:"→"Answer:", "例:"→"e.g.", "次の問題へ →"→"Next →", "結果を見る"→"See results", "セッション完了！"→"Session complete!", "正解数"→"Correct", "獲得コイン"→"Coins", "最大コンボ"→"Max combo", "ホームへ"→"Home", "もう一度"→"Again"
- ListeningScreen: 説明文3種→ Task1の listening.* を使用, "リスニング完了！"→"Listening complete!", "答え合わせ"→"Check", "聞こえた単語を入力"→"Type the word you heard", "⌨️ 入力"→"⌨️ Type", "🔤 4択"→"🔤 Choices"
- StudyScreen: "まなび・"→"Learn · ", "📖 図鑑"→"📖 Collection", "今日の復習"→"Review", "弱点特訓"→"Weak spots", "苦手"→"Weak", "単語帳"→"Learned", "マイ"→"My deck"
- ProfileScreen: "⚙️ 設定"→"⚙️ Settings", "🗣️ 発音の自動再生"→"🗣️ Auto-play audio", "🔔 効果音"→"🔔 Sound effects", "🎵 BGM"→"🎵 Music", "📮 誤りの報告・ご要望"→"📮 Report / feedback", "データを初期化"→"Reset data", 各統計ラベル
- RankingScreen/BattleScreen/RaidScreen/MissionsScreen/ShopScreen: 見出し・ボタン・状態文言
- OnboardingModal: タイトル/説明/名前入力/"名前なしで始める"→"Start without a name"、**母語選択UIはTask4で追加**
- LoginBonusModal: "ログインボーナス"→"Login bonus", "N日連続ログイン中！"→"N-day login streak!", "受け取る"→"Claim"
- CelebrationOverlay: "LEVEL UP!"(既英語), "実績解除"→"Achievement", "RAID CLEAR!"(既), "STREAK!"(既), "タップして続ける"→"Tap to continue"
- DailyLoopCard: "📅 今日の一式"→"📅 Today's set", "今日のN問"→"N questions today", "今日の単語を見る"→"See word of the day", "ログインボーナス"→"Login bonus", "今日の単語"→"Word of the day", 警告文
- WeeklyChart: "この1週間"→"This week"
- TopBar: レベル/コイン表記(数値中心なら変更小)

各ステップ末で `npm run build`(✓)→ `git commit -am "i18n: <画面名>"`。

- [ ] **Step 最終: 全文言置換後、日本語リテラル残存チェック**

Run: `grep -rnP "[\\x{3040}-\\x{30ff}\\x{4e00}-\\x{9fff}]" src/screens src/components | grep -v "i18n" | grep -vE "//|/\\*"`
Expected: UI表示文字列としての日本語リテラルが残っていない(コメント・カテゴリ名等の非UIは可)。残ればキー化。
Commit: `git commit -am "i18n: sweep remaining UI strings"`.

---

### Task 4: オンボーディングに母語選択を追加

**Files:**
- Modify: `src/components/OnboardingModal.tsx`, `src/i18n/{types,ja,en}.ts`

- [ ] **Step 1: 母語選択ステップを追加**

OnboardingModal に、最初のステップとして言語選択(日本語 / English)を表示。選択で `setLocale(l)` を呼び、以降のオンボーディング文言も即 `t()` で切替。キー追加: `onboarding.chooseLang`→("言語を選ぶ"/"Choose your language")。

```tsx
const { locale, setLocale, t } = useNav()
// 最初の画面:
<div className="grid grid-cols-2 gap-3">
  <button className={`btn-ghost py-4 ${locale==='ja'?'ring-2 ring-accent':''}`} onClick={()=>setLocale('ja')}>日本語</button>
  <button className={`btn-ghost py-4 ${locale==='en'?'ring-2 ring-accent':''}`} onClick={()=>setLocale('en')}>English</button>
</div>
```

- [ ] **Step 2: Profileに母語切替も追加**(設定カード内)

ProfileScreen 設定カードに言語トグル(日本語/English)を追加し `setLocale` を呼ぶ。キー: `settings.language`→("言語"/"Language")。

- [ ] **Step 3: build + プレビュー確認 + コミット**

Run: `npm run build`。プレビューで en に切替→UIが英語化を確認。
Commit: `git commit -am "feat: language picker in onboarding and settings"`.

---

### Task 5: Question の訳スキーマ拡張とロケール別表示

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/core/QuestionEngine.ts`
- Modify: `src/screens/QuizScreen.tsx`, `src/screens/ListeningScreen.tsx`

- [ ] **Step 1: 型に glosses / exampleTranslations を追加**

`src/types/index.ts` の Question に:
```ts
  /** ロケール別の訳語(未指定ロケールは answer にフォールバック) */
  glosses?: Partial<Record<'ja' | 'en', string>>
  /** 例文の訳文のロケール別(exampleForm はターゲット言語なのでロケール非依存) */
  exampleTranslations?: Partial<Record<'ja' | 'en', string>>
```

- [ ] **Step 2: 表示訳・例文訳のヘルパを QuestionEngine に追加**

```ts
// QuestionEngine 内(Locale は 'ja'|'en')
localizedGloss(q: Question, locale: 'ja' | 'en'): string {
  return q.glosses?.[locale] ?? q.answer
}
localizedExample(q: Question, locale: 'ja' | 'en'): { text: string; translation: string } | null {
  if (!q.example) return null
  const i = q.example.indexOf(' — ')
  const text = i >= 0 ? q.example.slice(0, i) : q.example
  const jaTr = i >= 0 ? q.example.slice(i + 3) : ''
  const translation = q.exampleTranslations?.[locale] ?? (locale === 'ja' ? jaTr : jaTr)
  return { text, translation }
}
/** 英語ロケール等で、その語の glosses[locale] とダミー3つ(同カテゴリ)で4択を作る */
localizedChoices(q: Question, locale: 'ja' | 'en'): string[] {
  const correct = this.localizedGloss(q, locale)
  const pool = this.repo.getByCategory(q.category)
    .filter((o) => o.id !== q.id && (o.glosses?.[locale] ?? o.answer))
    .map((o) => this.localizedGloss(o, locale))
  const used = new Set([correct]); const out: string[] = []
  for (const g of shuffle(pool)) { if (out.length >= 3) break; if (!used.has(g)) { used.add(g); out.push(g) } }
  return shuffle([correct, ...out])
}
```
(`shuffle` は QuestionEngine 内の既存関数を使用)

- [ ] **Step 3: QuizScreen をロケール対応**

QuizScreen で `const { locale } = useNav()`、`const { engine } = useGame()`。選択肢は `locale==='ja' ? q.choices : engine.localizedChoices(q, locale)` を state に保持して表示。正解判定は `choice === engine.localizedGloss(q, locale)`。解説の "正解:" は `engine.localizedGloss(q, locale)`、例文は `engine.localizedExample(q, locale)` で `text`＋`translation` を表示。

- [ ] **Step 4: ListeningScreen をロケール対応**

穴埋め文の訳は `engine.localizedExample(q, locale).translation`、回答後の意味表示は `engine.localizedGloss(q, locale)`。空欄語(exampleForm)・4択(wordChoices)はターゲット言語のままで不変。

- [ ] **Step 5: 後方互換の机上確認 + build + コミット**

locale=ja のとき localizedGloss==answer・localizedExample.translation==従来訳 になることを机上テスト(tools/test-i18n.ts に数ケース追記)。
Run: `npm run build` → ✓。Commit: `git commit -am "feat: locale-aware glosses/examples/choices in quiz & listening"`.

---

### Task 6: 出題プールのロケール・フィルタ

**Files:**
- Modify: `src/core/QuestionEngine.ts`

- [ ] **Step 1: buildSession/buildListeningSession に locale を渡し、未整備語を除外**

英語ロケールでは `glosses.en` を持つ語だけ出題する(未整備語を英語圏ユーザーに出さない)。

```ts
buildSession(category: Category, count: number, level = 0, locale: 'ja' | 'en' = 'ja'): Question[] {
  const full = this.repo.getByCategory(category)
    .filter((q) => locale === 'ja' || (q.glosses?.en))
  let pool = level > 0 ? full.filter((q) => q.difficulty === level) : full
  if (pool.length < count) pool = full
  return shuffle(pool).slice(0, count).map((q) => this.withShuffledChoices(q))
}
```
buildListeningSession も同様に `.filter(locale==='ja' || glosses.en)` を追加。呼び出し側(QuizScreen/ListeningScreen)で `engine.buildSession(category, N, studyLevel, locale)` に変更。

- [ ] **Step 2: build + コミット**

Run: `npm run build` → ✓。Commit: `git commit -am "feat: exclude words without target-locale gloss from sessions"`.

---

### Task 7: 中国語→英語グロス生成(HSK1)

**Files:**
- Create: `tools/build-en-gloss.chinese.mjs`, `tools/gloss.en.chinese.json`(生成物)
- Modify: `tools/build-chinese.mjs`

- [ ] **Step 1: CC-CEDICT×日本語訳で英語義を選ぶスクリプト**

`tools/build-en-gloss.chinese.mjs`:
- `.cache/cedict.txt` をパースし `hanzi(簡体) -> [english glosses]` を作る(CC-CEDICT行形式 `trad simp [pin] /gloss1/gloss2/` を読む。simplified列で引く)。
- `tools/meanings.chinese.json`(hanzi→日本語訳)を読む。
- 各 hanzi について、英語義候補から「日本語訳と意味的に最も近いもの」を選ぶ。v1の選定ロジック: 候補が1つならそれ。複数なら、まず短く一般的な語義(冠詞 to/a を除いた語)を優先し、**最終確定はエージェント検証に委ねる**ため、ここでは候補上位3件を `{hanzi:{cand:[...], pick:候補0}}` の形で `tools/gloss.en.chinese.candidates.json` に出力する。
- 注: この確定はTask8の検証エージェントが行う。本スクリプトは候補生成まで。

- [ ] **Step 2: 候補生成を実行し件数確認**

Run: `node tools/build-en-gloss.chinese.mjs`
Expected: HSK1(487語)の候補数と、CC-CEDICTに無い語のリストを出力。

- [ ] **Step 3: build-chinese.mjs に glosses.en を組込む**

`build-chinese.mjs` が `tools/gloss.en.chinese.json`({hanzi:"english"}) を読み、存在すれば `question.glosses = { en: gloss }` を付与(ja側は既存 answer が担うので glosses.ja は付けなくてよい)。ファイルが無ければ従来通り(en無し)。

- [ ] **Step 4: build + コミット(候補まで)**

Run: `node tools/build-chinese.mjs`(gloss.en.chinese.json はまだ無いので en 付与ゼロ・不変を確認)。
Commit: `git add tools/build-en-gloss.chinese.mjs tools/build-chinese.mjs && git commit -m "feat: CC-CEDICT english gloss candidate generation for Chinese"`.

---

### Task 8: 英語グロスの検証・確定(HSK1)

**Files:**
- Create: `tools/gloss.en.chinese.json`(確定版)

- [ ] **Step 1: 検証エージェントで確定**

独立エージェント(委譲禁止・単独)に `tools/gloss.en.chinese.candidates.json` と各語の日本語訳を渡し、各 hanzi について「日本語訳の語義に一致する英語グロス」を1つ確定させる。判定不能・CC-CEDICTに適訳が無い語は**除外**(gloss.en.chinese.json に含めない=英語ロケールで非表示)。出力 `tools/gloss.en.chinese.json` = `{ hanzi: "english gloss" }`。凜が抜き取り検品。

- [ ] **Step 2: build + プレビュー確認**

Run: `node tools/build-chinese.mjs && npm run build`。
プレビューで locale=en・中国語クイズ→選択肢が英語グロス、未整備語が出ないことを確認。
Commit: `git add tools/gloss.en.chinese.json public/wordbank/chinese && git commit -m "feat: verified English glosses for Chinese HSK1"`.

---

### Task 9: 中国語例文の英訳(HSK1)

**Files:**
- Create: `tools/example-tr.en.chinese.json`
- Modify: `tools/build-chinese.mjs`

- [ ] **Step 1: 例文英訳を執筆・検証**

独立エージェント(委譲禁止・単独)が、HSK1各語の中国語例文(既存 examples.custom.chinese.json の ex 中文部)を英訳。中文＋既存日本語訳の2つを手掛かりにし、自然で忠実な英訳を作る。独立検証＋凜検品。出力 `tools/example-tr.en.chinese.json` = `{ hanzi: "English translation of the sentence" }`。

- [ ] **Step 2: build-chinese.mjs で exampleTranslations.en を付与**

`build-chinese.mjs` が `example-tr.en.chinese.json` を読み、`question.exampleTranslations = { en: ... }` を付与(example がある語のみ)。

- [ ] **Step 3: build + プレビュー確認 + コミット**

Run: `node tools/build-chinese.mjs && npm run build`。プレビューで locale=en・中国語リスニング→穴埋め文の英訳が表示されることを確認。
Commit: `git add tools/example-tr.en.chinese.json tools/build-chinese.mjs public/wordbank/chinese && git commit -m "feat: English example translations for Chinese HSK1"`.

---

### Task 10: 統合検証・デプロイ(HSK1英語パイロット)

- [ ] **Step 1: 机上テスト** — `npx -y tsx tools/test-i18n.ts`(keys OK)
- [ ] **Step 2: 全体ビルド** — `npm run build`(✓)
- [ ] **Step 3: プレビューE2E**
  1. 初回(localStorageクリア)→ ブラウザ言語en相当で英語UI、オンボーディングで言語選択
  2. locale=en・中国語クイズ: プロンプト/選択肢/解説が英語、正解判定OK
  3. locale=en・中国語リスニング: 説明・例文英訳が英語、穴埋め4択(中国語語)で採点OK
  4. locale=ja に戻すと全挙動が従来通り(日本語)
  5. 英語グロス未整備の語が英語ロケールで出題されない
- [ ] **Step 4: デプロイ** — `git push`(失敗時 `gh workflow run deploy.yml`)
- [ ] **Step 5: メモリ更新** — wordquest-app.md に英語母語パイロットの要点を追記

---

### 拡大フェーズ(HSK1確認後・別サイクル)
- Task7-9 を HSK2-5 に展開(英語グロス＋例文英訳)。
- 将来: 母語 es 等を Strings と glosses に追加(スキーマは対応済み)。
