# デイリーリテンション機構 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「🔥学習ストリーク」を背骨に、損失回避・報酬期待・成長可視化・新鮮さの4装置を統合したデイリーループ(3分)を実装する。

**Architecture:** 純関数 `StreakEngine` がストリーク判定を担い、`GameContext.answerQuestion` が閾値到達時に呼び出す。数値・報酬は `src/data/streak.config.ts` に集約(データ駆動)。UIはホームの「デイリーループカード」を中心に、既存のログボ/ミッション/ショップへ最小の追記を行う。全てlocalStorage完結。

**Tech Stack:** React + TypeScript + Vite + Tailwind(既存)。テストは `npx -y tsx` で純関数を机上実行。

**Spec:** docs/superpowers/specs/2026-07-06-daily-retention-design.md

---

### Task 1: ストリーク設定とStreakEngine(純関数)+テスト

**Files:**
- Create: `src/data/streak.config.ts`
- Create: `src/core/StreakEngine.ts`
- Create: `tools/test-streak.ts`(机上テスト)

- [ ] **Step 1: 設定ファイルを作成**

```ts
// src/data/streak.config.ts
/** 学習ストリークの設定(データ駆動)。数値・節目はここで調整する。 */
export const streakConfig = {
  /** この問数を1日に解くと「今日のスタンプ」獲得=ストリーク継続 */
  dailyGoal: 10,
  /** ストリークフリーズの価格と最大ストック */
  freezePrice: 500,
  freezeMax: 2,
  /** 節目報酬。titleId はショップ称号(limited)のid。nullはコインのみ */
  milestones: [
    { days: 3, coin: 100, titleId: null },
    { days: 7, coin: 300, titleId: 's-title-streak7' },
    { days: 14, coin: 600, titleId: null },
    { days: 30, coin: 1500, titleId: 's-title-streak30' },
    { days: 50, coin: 3000, titleId: null },
    { days: 100, coin: 8000, titleId: 's-title-streak100' },
    { days: 365, coin: 30000, titleId: 's-title-streak365' },
  ] as { days: number; coin: number; titleId: string | null }[],
}
```

- [ ] **Step 2: StreakEngine を作成**

```ts
// src/core/StreakEngine.ts
// 学習ストリークの純関数ロジック。UI・保存に依存しない(机上テスト可能)。
import { streakConfig } from '../data/streak.config'

export interface StreakState {
  studyStreak: number
  longestStudyStreak: number
  /** 最後にスタンプを獲得した日(YYYY-MM-DD)。'' は未獲得 */
  lastStudyDate: string
  streakFreezes: number
}

export interface StampResult {
  state: StreakState
  /** フリーズを自動消費したか */
  usedFreeze: boolean
  /** ストリークが伸びた(開始含む)か */
  extended: boolean
}

/** YYYY-MM-DD 同士の日数差(b - a) */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}

/**
 * 今日のスタンプ獲得時のストリーク更新。
 * - 前回から1日 → +1 / 2日かつフリーズ保有 → フリーズ消費して+1 / それ以外 → 1にリセット
 * - 同日再獲得・端末日付の巻き戻し(gap<=0)は何もしない
 */
export function applyStamp(s: StreakState, today: string): StampResult {
  if (s.lastStudyDate === today) return { state: s, usedFreeze: false, extended: false }
  let streak: number
  let freezes = s.streakFreezes
  let usedFreeze = false
  if (s.lastStudyDate === '') {
    streak = 1
  } else {
    const gap = daysBetween(s.lastStudyDate, today)
    if (gap <= 0) return { state: s, usedFreeze: false, extended: false }
    if (gap === 1) streak = s.studyStreak + 1
    else if (gap === 2 && freezes > 0) {
      freezes -= 1
      usedFreeze = true
      streak = s.studyStreak + 1
    } else streak = 1
  }
  return {
    state: {
      studyStreak: streak,
      longestStudyStreak: Math.max(s.longestStudyStreak, streak),
      lastStudyDate: today,
      streakFreezes: freezes,
    },
    usedFreeze,
    extended: true,
  }
}

/** 到達済みで未受領の節目(日数昇順)を返す */
export function reachedMilestones(streak: number, claimed: number[]): number[] {
  return streakConfig.milestones
    .map((m) => m.days)
    .filter((d) => d <= streak && !claimed.includes(d))
    .sort((a, b) => a - b)
}
```

- [ ] **Step 3: 机上テストを書く**

```ts
// tools/test-streak.ts — npx -y tsx tools/test-streak.ts で実行
import { applyStamp, daysBetween, reachedMilestones, type StreakState } from '../src/core/StreakEngine'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) {
    failed++
    console.error('FAIL', name, 'got', got, 'want', want)
  } else console.log('ok  ', name)
}

const base: StreakState = { studyStreak: 5, longestStudyStreak: 8, lastStudyDate: '2026-07-05', streakFreezes: 1 }

eq('daysBetween', daysBetween('2026-07-05', '2026-07-06'), 1)
eq('連続日 +1', applyStamp(base, '2026-07-06').state.studyStreak, 6)
eq('連続日 longest更新なし', applyStamp(base, '2026-07-06').state.longestStudyStreak, 8)
eq('初回は1', applyStamp({ ...base, lastStudyDate: '', studyStreak: 0 }, '2026-07-06').state.studyStreak, 1)
eq('同日は変化なし', applyStamp(base, '2026-07-05').extended, false)
eq('巻き戻しは維持', applyStamp(base, '2026-07-04').state.studyStreak, 5)
const frozen = applyStamp(base, '2026-07-07') // 1日飛ばし・フリーズ1
eq('フリーズで継続', frozen.state.studyStreak, 6)
eq('フリーズ消費', frozen.state.streakFreezes, 0)
eq('フリーズ使用フラグ', frozen.usedFreeze, true)
eq('フリーズ無しはリセット', applyStamp({ ...base, streakFreezes: 0 }, '2026-07-07').state.studyStreak, 1)
eq('3日空きはフリーズ温存でリセット', applyStamp(base, '2026-07-08'), {
  state: { studyStreak: 1, longestStudyStreak: 8, lastStudyDate: '2026-07-08', streakFreezes: 1 },
  usedFreeze: false,
  extended: true,
})
eq('longest更新', applyStamp({ ...base, studyStreak: 8 }, '2026-07-06').state.longestStudyStreak, 9)
eq('節目: 7到達で3,7', reachedMilestones(7, []), [3, 7])
eq('節目: 受領済み除外', reachedMilestones(7, [3]), [7])
eq('節目: 未到達なし', reachedMilestones(2, []), [])

if (failed > 0) process.exit(1)
console.log('ALL PASS')
```

- [ ] **Step 4: テスト実行**

Run: `cd /Users/yoshitetsu/英単語資産アプリ && npx -y tsx tools/test-streak.ts`
Expected: `ALL PASS`(失敗時は exit 1)

- [ ] **Step 5: コミット**

```bash
git add src/data/streak.config.ts src/core/StreakEngine.ts tools/test-streak.ts
git commit -m "feat: add StreakEngine (pure) with config and desk tests"
```

---

### Task 2: User拡張・migrate・answerQuestionへの組み込み

**Files:**
- Modify: `src/types/index.ts`(Userに7フィールド追加)
- Modify: `src/state/GameContext.tsx`(migrate補完・answerQuestion内でスタンプ判定・Celebration拡張)

- [ ] **Step 1: User型にフィールドを追加**(`todayAnsweredDate: string` の直後)

```ts
  // --- 学習ストリーク(デイリーリテンション) ---
  /** 「1日にdailyGoal問回答した日」の連続日数 */
  studyStreak: number
  longestStudyStreak: number
  /** 最後にスタンプ獲得した日(YYYY-MM-DD)。'' は未獲得 */
  lastStudyDate: string
  /** ストリークフリーズ所持数(休んでも1日守られる) */
  streakFreezes: number
  /** 受領済みの節目(日数) */
  claimedStreakMilestones: number[]
  /** 日別回答数(直近14日でプルーニング)。週間グラフ用 */
  dailyHistory: Record<string, number>
  /** 「今日の単語」を見た日 */
  todayWordSeenDate: string
```

- [ ] **Step 2: migrate() に補完を追加**(GameContext.tsx の migrate、todayAnsweredDate 行の後)

```ts
    studyStreak: num(u.studyStreak ?? 0),
    longestStudyStreak: num(u.longestStudyStreak ?? 0),
    lastStudyDate: u.lastStudyDate ?? '',
    streakFreezes: num(u.streakFreezes ?? 0),
    claimedStreakMilestones: u.claimedStreakMilestones ?? [],
    dailyHistory: u.dailyHistory ?? {},
    todayWordSeenDate: u.todayWordSeenDate ?? '',
```

同時に `src/state/defaultUser.ts` にも同名フィールドの初期値(0/''/[]/{})を追加する。

- [ ] **Step 3: Celebration型に streak を追加**(GameContext.tsx)

```ts
export interface Celebration {
  kind: 'levelup' | 'raidClear' | 'achievement' | 'streak'
  level?: number
  achievement?: AchievementDef
  title?: string
  /** kind==='streak': 到達日数と報酬 */
  streakDays?: number
  streakCoin?: number
}
```

- [ ] **Step 4: answerQuestion にスタンプ判定を挿入**

`todayAnswered` 計算(`let u: User = {...}` ブロック)の直後に追加。import は
`import { applyStamp, reachedMilestones } from '../core/StreakEngine'`、
`import { streakConfig } from '../data/streak.config'`。

```ts
        // --- 日別履歴(週間グラフ用)。14日より古いキーは捨てる ---
        const dailyHistory: Record<string, number> = { ...u.dailyHistory, [today]: todayAnswered }
        for (const k of Object.keys(dailyHistory)) {
          if (daysBetween(k, today) > 14) delete dailyHistory[k]
        }
        u = { ...u, dailyHistory }

        // --- 学習ストリーク: 今日はじめて閾値に到達した瞬間にスタンプ ---
        let streakCelebration: Celebration | null = null
        if (todayAnswered >= streakConfig.dailyGoal && u.lastStudyDate !== today) {
          const res = applyStamp(
            {
              studyStreak: u.studyStreak,
              longestStudyStreak: u.longestStudyStreak,
              lastStudyDate: u.lastStudyDate,
              streakFreezes: u.streakFreezes,
            },
            today,
          )
          u = { ...u, ...res.state }
          // 節目報酬(コイン+限定称号)
          const reached = reachedMilestones(u.studyStreak, u.claimedStreakMilestones)
          if (reached.length > 0) {
            let coinGain = 0
            const titles: string[] = []
            for (const d of reached) {
              const m = streakConfig.milestones.find((x) => x.days === d)!
              coinGain += m.coin
              if (m.titleId && !u.ownedItemIds.includes(m.titleId)) titles.push(m.titleId)
            }
            u = {
              ...u,
              coin: u.coin + coinGain,
              todayCoin: u.todayCoin + coinGain,
              ownedItemIds: [...u.ownedItemIds, ...titles],
              claimedStreakMilestones: [...u.claimedStreakMilestones, ...reached],
            }
            streakCelebration = { kind: 'streak', streakDays: reached[reached.length - 1], streakCoin: coinGain }
          }
        }
```

`daysBetween` も StreakEngine から import する。既存の演出呼び出し
(`if (xpRes.leveledUp) setCelebration(...)`)の後に
`if (streakCelebration) setCelebration(streakCelebration)` を追加
(レベルアップと重なった場合はストリーク優先で上書きされてよい)。

- [ ] **Step 5: CelebrationOverlay に streak 分岐を追加**

```ts
  } else if (celebration.kind === 'streak') {
    title = 'STREAK!'
    emoji = '🔥'
    sub = `${celebration.streakDays}日連続学習を達成！ +🪙${celebration.streakCoin}`
  }
```

- [ ] **Step 6: GameApi に buyStreakFreeze と markTodayWordSeen を追加**

interface GameApi に:

```ts
  /** ストリークフリーズ購入(コイン消費、最大ストックまで) */
  buyStreakFreeze: () => boolean
  /** 「今日の単語」を既読にする */
  markTodayWordSeen: () => void
```

api 実装(answerQuestion の後に追加):

```ts
      buyStreakFreeze: () => {
        if (user.streakFreezes >= streakConfig.freezeMax) return false
        if (user.coin < streakConfig.freezePrice) return false
        setUser({ ...user, coin: user.coin - streakConfig.freezePrice, streakFreezes: user.streakFreezes + 1 })
        return true
      },
      markTodayWordSeen: () => {
        if (user.todayWordSeenDate !== todayStr()) setUser({ ...user, todayWordSeenDate: todayStr() })
      },
```

- [ ] **Step 7: ビルド確認とコミット**

Run: `npm run build` → 型エラーゼロで成功
```bash
git add src/types/index.ts src/state/GameContext.tsx src/state/defaultUser.ts src/components/CelebrationOverlay.tsx
git commit -m "feat: study streak state, stamp on daily goal, milestone rewards"
```

---

### Task 3: 今日の単語(エンジン+ホームUI)とデイリーループカード

**Files:**
- Modify: `src/core/QuestionEngine.ts`(questionOfTheDay 追加)
- Create: `src/components/DailyLoopCard.tsx`
- Modify: `src/screens/HomeScreen.tsx`(カード設置・ストリーク警告)

- [ ] **Step 1: QuestionEngine に日替わり選出を追加**

```ts
  /** 「今日の単語」: 日付+カテゴリから決定的に1語選ぶ(全ユーザー同日同語) */
  questionOfTheDay(category: Category, dateStr: string): Question | undefined {
    const pool = this.repo.getByCategory(category)
    if (pool.length === 0) return undefined
    let h = 0
    const seed = `${dateStr}:${category}`
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    return pool[h % pool.length]
  }
```

- [ ] **Step 2: DailyLoopCard コンポーネントを作成**

3ステップ(10問 / 今日の単語 / ログボ)+ストリーク表示+喪失警告+今日の単語の展開表示。

```tsx
// src/components/DailyLoopCard.tsx
import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { streakConfig } from '../data/streak.config'
import { todayStr } from '../state/dateUtils'
import { speakWord, wordFromPrompt, canSpeak } from '../utils/speech'

/** ホーム最上部の「今日の一式」カード。全部そろうと✨ */
export function DailyLoopCard() {
  const { user, engine, isCategoryReady, markTodayWordSeen } = useGame()
  const { category, navigate, setQuizMode, setCustomIds } = useNav()
  const [wordOpen, setWordOpen] = useState(false)

  const today = todayStr()
  const answered = user.todayAnsweredDate === today ? user.todayAnswered : 0
  const quizDone = answered >= streakConfig.dailyGoal
  const wordSeen = user.todayWordSeenDate === today
  const loginDone = user.lastLoginDate === today // 起動時に自動受取済み
  const allDone = quizDone && wordSeen && loginDone

  const q = isCategoryReady(category) ? engine.questionOfTheDay(category, today) : undefined
  const word = q ? wordFromPrompt(q.prompt) : ''

  const openWord = () => {
    setWordOpen((v) => !v)
    markTodayWordSeen()
  }

  const streakAtRisk = user.studyStreak >= 3 && !quizDone

  return (
    <div className={`card p-4 space-y-3 ${allDone ? 'ring-1 ring-success/50' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm">📅 今日の一式 {allDone && '✨コンプ！'}</h3>
        <span className="font-black text-gold">🔥 {user.studyStreak}日</span>
      </div>

      {streakAtRisk && (
        <div className="text-xs font-bold text-danger bg-danger/10 rounded-lg px-3 py-2">
          ⚠️ 🔥{user.studyStreak}日のストリークが今夜消えます！あと{streakConfig.dailyGoal - answered}問
        </div>
      )}

      <div className="space-y-2">
        <StepRow
          done={quizDone}
          label={`今日の${streakConfig.dailyGoal}問 (${Math.min(answered, streakConfig.dailyGoal)}/${streakConfig.dailyGoal})`}
          action={quizDone ? undefined : () => { setQuizMode('normal'); setCustomIds(null); navigate('quiz') }}
        />
        <StepRow done={wordSeen} label="今日の単語を見る" action={openWord} />
        <StepRow done={loginDone} label="ログインボーナス" />
      </div>

      {wordOpen && q && (
        <div className="bg-panel2 rounded-xl p-4 text-center animate-slideUp">
          <div className="text-xs text-white/40 mb-1">今日の単語</div>
          <div className="text-xl font-black">{word}</div>
          {q.pronunciation && <div className="text-accent2 font-mono font-bold text-sm mt-0.5">{q.pronunciation}</div>}
          <div className="mt-1 text-white/80">{q.answer}</div>
          {q.example && <div className="mt-2 text-xs text-white/50">{q.example}</div>}
          {canSpeak() && (
            <button onClick={() => speakWord(word, category)} className="mt-2 w-9 h-9 rounded-full bg-white/10 text-base">
              🔊
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function StepRow({ done, label, action }: { done: boolean; label: string; action?: () => void }) {
  return (
    <button
      onClick={action}
      disabled={!action}
      className="w-full flex items-center gap-2 text-sm text-left disabled:opacity-100"
    >
      <span className={`w-5 h-5 grid place-items-center rounded-full text-[11px] ${done ? 'bg-success text-white' : 'bg-white/10 text-white/40'}`}>
        {done ? '✓' : '·'}
      </span>
      <span className={done ? 'text-white/45 line-through' : 'font-bold'}>{label}</span>
      {action && !done && <span className="ml-auto text-accent2 text-xs font-bold">▶</span>}
    </button>
  )
}
```

- [ ] **Step 3: HomeScreen に設置**

import を追加し、ヘッダー(`<h1>...`の`<div>`)の直後・ジャンル選択の前に `<DailyLoopCard />` を挿入。
あわせてヘッダーの「🔥 {user.streakDays}日連続ログイン中」を「🔥 {user.studyStreak}日連続学習中」に変更
(学習ストリークを正とする。ログイン連続はログボ内部でのみ使用)。

- [ ] **Step 4: プレビュー検証とコミット**

プレビューで: カード表示 → 10問回答でステップ✓ & 🔥+1 → 今日の単語の開閉と既読化を確認。

```bash
git add src/core/QuestionEngine.ts src/components/DailyLoopCard.tsx src/screens/HomeScreen.tsx
git commit -m "feat: daily loop card with word-of-the-day and streak warning"
```

---

### Task 4: ログボ7日カレンダー

**Files:**
- Modify: `src/state/loginLogic.ts`(7日サイクルの金額テーブル)
- Modify: `src/components/LoginBonusModal.tsx`(カレンダーUI)

- [ ] **Step 1: loginLogic を7日サイクル化**

```ts
/** 7日サイクルのログインボーナス(7日目が豪華)。位置は (streakDays-1) % 7 */
export const LOGIN_CYCLE: number[] = [20, 30, 40, 50, 60, 80, 200]
```

`applyLoginBonus` の `bonusCoin` 計算を差し替え:

```ts
  const bonusCoin = LOGIN_CYCLE[(streakDays - 1) % LOGIN_CYCLE.length]
```

- [ ] **Step 2: LoginBonusModal に7マスカレンダーを追加**

既存モーダルの金額表示の下に、`LOGIN_CYCLE` を map した7マス(当日= ring 強調、
受取済み=✓、7日目マスは🎁アイコン)を表示。当日位置は `(streak - 1) % 7`。
モーダルのprops(coin, streak)は既存のまま流用。

- [ ] **Step 3: プレビュー検証とコミット**

localStorage の `lastLoginDate` を書き換えて新規ログイン扱いにし、モーダルにカレンダーが出ることを確認。

```bash
git add src/state/loginLogic.ts src/components/LoginBonusModal.tsx
git commit -m "feat: 7-day login bonus calendar cycle"
```

---

### Task 5: 週間グラフ(ホーム)と図鑑バー(まなび)

**Files:**
- Create: `src/components/WeeklyChart.tsx`
- Modify: `src/screens/HomeScreen.tsx`(今日の目標カードの下に設置)
- Modify: `src/screens/StudyScreen.tsx`(級別プログレスバー)

- [ ] **Step 1: WeeklyChart(CSSのみの棒グラフ)**

```tsx
// src/components/WeeklyChart.tsx
import { useGame } from '../state/GameContext'
import { streakConfig } from '../data/streak.config'

/** 直近7日の回答数バー。目標到達日は金色 */
export function WeeklyChart() {
  const { user } = useGame()
  const days: { key: string; label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ key, label: '日月火水木金土'[d.getDay()], count: user.dailyHistory[key] ?? 0 })
  }
  const max = Math.max(streakConfig.dailyGoal, ...days.map((d) => d.count))
  return (
    <div className="card p-4">
      <div className="text-xs text-white/45 font-bold mb-2">この1週間</div>
      <div className="flex items-end gap-2 h-16">
        {days.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`w-full rounded-t ${d.count >= streakConfig.dailyGoal ? 'bg-gold' : 'bg-accent2/70'}`}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
            <div className="text-[9px] text-white/40">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

注: `dailyHistory` のキー形式は `todayStr()` と同一(YYYY-MM-DD)であること。`todayStr()` の実装を確認し、
ゼロ埋め等が異なる場合はこのコンポーネント側を `todayStr` ベースの日付生成に合わせる。

- [ ] **Step 2: HomeScreen の「今日の目標&習得率」グリッドの直後に `<WeeklyChart />` を設置**

- [ ] **Step 3: StudyScreen に級別図鑑バー**

StudyScreen の先頭セクションに、現在カテゴリの級ごとの
`習得数(learnedQuestionIds ∩ その級のid) / 級の語数` を ProgressBar で並べる
「📖 図鑑」カードを追加する。級一覧は `engine.availableLevels(category)`、
級ごとの語は `engine` 経由(必要なら `QuestionEngine.byLevel(category, level)` を追加して
`repo.getByCategory(category).filter(q => q.difficulty === level)` を返す)。

- [ ] **Step 4: プレビュー検証とコミット**

```bash
git add src/components/WeeklyChart.tsx src/screens/HomeScreen.tsx src/screens/StudyScreen.tsx src/core/QuestionEngine.ts
git commit -m "feat: weekly answer chart and per-level collection bars"
```

---

### Task 6: 日替わりチャレンジ+ショップ(フリーズ・限定称号)

**Files:**
- Modify: `src/data/missions.config.ts`(日替わり生成)
- Modify: `src/modules/mission/missionLogic.ts`(日替わりを含む一覧取得)
- Modify: `src/data/shop.config.ts`(限定称号4種)
- Modify: `src/types/index.ts`(ShopItemDef.limited)
- Modify: `src/screens/ShopScreen.tsx`(フリーズ購入カード・limited除外)

- [ ] **Step 1: 日替わりチャレンジ定義**

missions.config.ts に追加:

```ts
/** 日替わりチャレンジ候補(日付シードで1件選ばれ、報酬は通常より高め) */
export const dailyChallengePool: MissionDef[] = [
  { id: 'c-listening-5', title: '⭐リスニングで5問正解', type: 'answerCorrect', target: 5, rewardCoin: 120, rewardXp: 60 },
  { id: 'c-combo-5', title: '⭐コンボ5を出す', type: 'answerCorrect', target: 5, rewardCoin: 120, rewardXp: 60 },
  { id: 'c-correct-20', title: '⭐20問正解する', type: 'answerCorrect', target: 20, rewardCoin: 150, rewardXp: 80 },
  { id: 'c-review-5', title: '⭐復習を5問こなす', type: 'answerCorrect', target: 5, rewardCoin: 120, rewardXp: 60 },
]

/** 今日のチャレンジ(日付シードで決定的に選出) */
export function dailyChallengeFor(dateStr: string): MissionDef {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0
  return dailyChallengePool[h % dailyChallengePool.length]
}
```

注: 進捗タイプは既存 `answerCorrect` を使う(専用タイプの追加はYAGNI。文言はテーマ性の演出)。
missionLogic の一覧取得箇所(getMissionViews)で `[...dailyMissions, dailyChallengeFor(todayStr())]` を
使うよう変更し、addMissionProgress も同リストを走査する。

- [ ] **Step 2: ショップに限定称号とフリーズ**

types: `ShopItemDef` に `limited?: boolean` を追加(限定=購入不可・獲得で所有)。
shop.config.ts に追加:

```ts
  { id: 's-title-streak7', name: '称号「七日の炎」', kind: 'title', price: 0, preview: '七日の炎', description: '7日連続学習の証', limited: true },
  { id: 's-title-streak30', name: '称号「月の求道者」', kind: 'title', price: 0, preview: '月の求道者', description: '30日連続学習の証', limited: true },
  { id: 's-title-streak100', name: '称号「百日の賢者」', kind: 'title', price: 0, preview: '百日の賢者', description: '100日連続学習の証', limited: true },
  { id: 's-title-streak365', name: '称号「一年の伝説」', kind: 'title', price: 0, preview: '一年の伝説', description: '365日連続学習の証', limited: true },
```

ShopScreen: 一覧表示から `limited && !owned` を除外(所有済みなら装備可能として表示)。
さらに「🧊 ストリークフリーズ」カードを商品リストの上に追加:
所持数 `{user.streakFreezes}/{streakConfig.freezeMax}`、ボタンで `buyStreakFreeze()`、
満杯またはコイン不足時は disabled と理由表示。

- [ ] **Step 3: ビルド+プレビュー検証+コミット**

チャレンジがミッション画面に「⭐」付きで出る・フリーズ購入で所持数が増える・満杯でdisabledを確認。

```bash
git add src/data/missions.config.ts src/modules/mission/missionLogic.ts src/data/shop.config.ts src/types/index.ts src/screens/ShopScreen.tsx
git commit -m "feat: daily challenge, streak freeze shop, limited streak titles"
```

---

### Task 7: 統合検証とデプロイ

- [ ] **Step 1: 全体ビルド** — `npm run build` 成功
- [ ] **Step 2: 机上テスト再実行** — `npx -y tsx tools/test-streak.ts` → ALL PASS
- [ ] **Step 3: プレビューでE2E確認**
  1. ホームにデイリーループカード・週間グラフが出る
  2. 10問回答 → スタンプ✓・🔥1日・(3日到達時)節目演出
  3. 今日の単語を開く → ✓
  4. ショップでフリーズ購入 → 所持数+1
  5. localStorage の `lastStudyDate` を2日前に書き換えて10問 → フリーズ自動消費で継続
  6. 旧ユーザーデータ(フィールド欠損)を読み込んでもクラッシュしない(migrate)
- [ ] **Step 4: デプロイ**

```bash
git push   # GitHub Pages 自動デプロイ(失敗時は gh workflow run deploy.yml)
```

- [ ] **Step 5: メモリ更新** — wordquest-app.md にリテンション実装済みの要点を追記
