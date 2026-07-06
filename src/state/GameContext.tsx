import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { User, Question, AnswerOutcome, BattleResult, AchievementDef, Category, PetSpeciesId, PetState } from '../types'
import { userRepository, questionRepository } from '../repositories'
import { QuestionEngine } from '../core/QuestionEngine'
import { rewardEngine } from '../core/RewardEngine'
import { progressEngine } from '../core/ProgressEngine'
import { AnswerChecker } from '../core/AnswerChecker'
import { ReviewScheduler } from '../core/ReviewScheduler'
import { createDefaultUser } from './defaultUser'
import { applyLoginBonus } from './loginLogic'
import { todayStr } from './dateUtils'
import { addMissionProgress, syncLoginStreakMissions, claimMission as claimMissionLogic, ensureMissionDay } from '../modules/mission/missionLogic'
import { contributeRaid, ensureRaidDay, claimRaid as claimRaidLogic } from '../modules/raid/raidLogic'
import { applyBattleResult } from '../modules/battle/battleLogic'
import { buyItem as buyItemLogic, equipItem as equipItemLogic } from '../modules/shop/shopLogic'
import { evaluateAchievements, type AchievementContext } from '../modules/achievement/achievementLogic'
import { applyStamp, reachedMilestones, daysBetween } from '../core/StreakEngine'
import { settlePetDecay, PET_MAX_XP } from '../core/PetEngine'
import { PET_MAX_PETS, PET_SLOT_COST } from '../config/petConfig'
import { streakConfig } from '../data/streak.config'

const questionEngine = new QuestionEngine(questionRepository)

/** 画面横断の演出通知 */
export interface Celebration {
  kind: 'levelup' | 'raidClear' | 'achievement' | 'streak'
  level?: number
  achievement?: AchievementDef
  title?: string
  /** kind==='streak': 到達日数と報酬コイン */
  streakDays?: number
  streakCoin?: number
}

interface GameApi {
  user: User
  engine: QuestionEngine
  /** 起動時に付与されたログインボーナス（初回表示用） */
  loginBonus: { coin: number; streak: number } | null
  celebration: Celebration | null
  dismissCelebration: () => void

  /** カテゴリの問題データをロード（済みなら即完了） */
  ensureCategory: (c: Category) => Promise<void>
  /** カテゴリがロード済みか（読込完了でtrueになり再描画される） */
  isCategoryReady: (c: Category) => boolean

  answerQuestion: (q: Question, selected: string, comboCount: number) => AnswerOutcome
  /** ストリークフリーズ購入(コイン消費、最大ストックまで) */
  buyStreakFreeze: () => boolean
  /** 「今日の単語」を既読にする */
  markTodayWordSeen: () => void
  applyRewardXp: (xp: number) => void
  finishBattle: (result: BattleResult) => void
  chargeBattleFee: (fee: number) => boolean
  claimMission: (id: string) => { ok: boolean; rewardCoin: number; rewardXp: number }
  claimRaid: () => { ok: boolean; rewardCoin: number; rewardXp: number; title?: string }
  buyItem: (id: string) => { ok: boolean; reason?: string }
  equipItem: (id: string) => void
  /** 自分専用の単語帳に追加/削除（タップで暗記カードを作る） */
  toggleDeck: (questionId: string) => void
  toggleMastered: (questionId: string) => void
  choosePetStarter: (species: PetSpeciesId) => void
  markPetForm: (form: number) => void
  setActivePet: (index: number) => void
  /** 2体目以降をコインで解放（成功時 true）。上限到達/コイン不足は false */
  buyPetSlot: () => boolean
  /** プレイヤー名を変更（オンボーディング等） */
  setName: (name: string) => void
  resetAll: () => void
}

const GameContext = createContext<GameApi | null>(null)

/** XPを加算しレベルアップを解決して user を返す（演出通知は呼び出し側で） */
function grantXp(user: User, xp: number): { user: User; leveledUp: boolean; newLevel: number } {
  const r = progressEngine.applyXp(user.level, user.xp, xp)
  return { user: { ...user, level: r.level, xp: r.xp }, leveledUp: r.leveledUp, newLevel: r.level }
}

/** 旧バージョンの保存データに不足フィールドを補う（後方互換） */
function migrate(u: User): User {
  // NaN汚染の救済: Lv6/7報酬倍率が未定義だった期間に正解すると xp/coin が NaN になり
  // 加算で伝播した(修正済み)。汚染された保存値は 0 に戻す。
  const num = (v: number, d = 0) => (Number.isFinite(v) ? v : d)
  return {
    ...u,
    xp: num(u.xp),
    coin: num(u.coin),
    todayCoin: num(u.todayCoin),
    level: num(u.level, 1) || 1,
    wordStats: u.wordStats ?? {},
    customDeck: u.customDeck ?? [],
    masteredIds: u.masteredIds ?? [],
    todayAnswered: num(u.todayAnswered ?? 0),
    todayAnsweredDate: u.todayAnsweredDate ?? todayStr(),
    studyStreak: num(u.studyStreak ?? 0),
    longestStudyStreak: num(u.longestStudyStreak ?? 0),
    lastStudyDate: u.lastStudyDate ?? '',
    streakFreezes: num(u.streakFreezes ?? 0),
    claimedStreakMilestones: u.claimedStreakMilestones ?? [],
    dailyHistory: u.dailyHistory ?? {},
    todayWordSeenDate: u.todayWordSeenDate ?? '',
    // 旧: 単一 pet → 新: pets配列 に移行
    pets: (u.pets ?? ((u as unknown as { pet?: PetState }).pet ? [(u as unknown as { pet: PetState }).pet] : [{ species: null, xp: 0, lastTickDate: '', formSeen: 0 }])).map((p) => ({
      species: p?.species ?? null,
      xp: num(p?.xp ?? 0),
      lastTickDate: p?.lastTickDate ?? '',
      formSeen: num(p?.formSeen ?? 0),
    })),
    activePet: num(u.activePet ?? 0),
  }
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User>(() => {
    const loaded = migrate(userRepository.load() ?? createDefaultUser())
    // 起動時の日付リセット類
    let u = ensureMissionDay(ensureRaidDay(loaded))
    const login = applyLoginBonus(u)
    u = syncLoginStreakMissions(login.user)
    // 相棒: サボった日数ぶんXPを清算（当日は未評価）
    u = settlePetDecay(u, todayStr())
    return u
  })

  const [loginBonus, setLoginBonus] = useState<{ coin: number; streak: number } | null>(null)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const [readyCats, setReadyCats] = useState<Category[]>([])
  const loadingCats = useRef(new Set<Category>())
  const initRan = useRef(false)

  // 問題データのロード（多重ロード防止つき）
  const ensureCategory = async (c: Category) => {
    if (questionRepository.isLoaded(c) || loadingCats.current.has(c)) return
    loadingCats.current.add(c)
    try {
      await questionRepository.loadCategory(c)
      setReadyCats((prev) => (prev.includes(c) ? prev : [...prev, c]))
    } finally {
      loadingCats.current.delete(c)
    }
  }

  // 起動時に「前回選んだカテゴリ」を先読み（未設定なら英語）
  useEffect(() => {
    const saved = (localStorage.getItem('wordquest.category') as Category | null) ?? 'english'
    void ensureCategory(saved)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 起動時ログインボーナスの表示判定（初回マウントのみ）
  useEffect(() => {
    if (initRan.current) return
    initRan.current = true
    const loaded = userRepository.load()
    // createDefaultUser の場合や本日初回のみボーナス通知を出す
    if (loaded) {
      const login = applyLoginBonus(ensureRaidDay(ensureMissionDay(loaded)))
      if (login.isNewDay && login.bonusCoin > 0) {
        setLoginBonus({ coin: login.bonusCoin, streak: login.user.streakDays })
      }
    } else {
      // 新規ユーザーは streak=1 として初回ボーナス
      setLoginBonus({ coin: 20, streak: 1 })
    }
  }, [])

  // user が変わるたびに永続化
  useEffect(() => {
    userRepository.save(user)
  }, [user])

  const notifyAchievements = (unlocked: AchievementDef[]) => {
    if (unlocked.length > 0) {
      setCelebration({ kind: 'achievement', achievement: unlocked[0] })
    }
  }

  const api = useMemo<GameApi>(() => {
    return {
      user,
      engine: questionEngine,
      loginBonus,
      celebration,
      dismissCelebration: () => setCelebration(null),

      ensureCategory,
      isCategoryReady: (c: Category) => questionRepository.isLoaded(c),

      // 各アクションは memoized な `user` を基点に純粋計算し、
      // setUser には確定値を渡す。演出通知(setCelebration)は updater の外で呼ぶ。
      answerQuestion: (q, selected, comboCount) => {
        const { correct, correctAnswer } = AnswerChecker.check(q, selected)
        // 語ごとの正答率を更新（弱点特訓・苦手判定に使う）
        const prevStat = user.wordStats[q.id] ?? { c: 0, t: 0 }
        const wordStats = {
          ...user.wordStats,
          [q.id]: { c: prevStat.c + (correct ? 1 : 0), t: prevStat.t + 1 },
        }
        // デイリー目標: 日付が変わっていたらリセットしてから+1
        const today = todayStr()
        const todayAnswered = (user.todayAnsweredDate === today ? user.todayAnswered : 0) + 1
        let u: User = {
          ...user,
          totalAnswered: user.totalAnswered + 1,
          wordStats,
          todayAnswered,
          todayAnsweredDate: today,
        }

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

        // --- 復習キューの更新 ---
        const existing = u.reviewQueue.find((r) => r.questionId === q.id)
        if (correct) {
          if (existing) {
            u = {
              ...u,
              reviewQueue: u.reviewQueue.map((r) =>
                r.questionId === q.id ? ReviewScheduler.review(r, true) : r,
              ),
            }
          }
        } else {
          // 間違えた問題は復習キューへ
          if (existing) {
            u = {
              ...u,
              reviewQueue: u.reviewQueue.map((r) =>
                r.questionId === q.id ? ReviewScheduler.review(r, false) : r,
              ),
            }
          } else {
            u = { ...u, reviewQueue: [...u.reviewQueue, ReviewScheduler.create(q.id)] }
          }
        }

        if (!correct) {
          setUser(u)
          if (streakCelebration) setCelebration(streakCelebration)
          return {
            correct: false,
            correctAnswer,
            gainedXp: 0,
            gainedCoin: 0,
            comboCount: 0,
            leveledUp: false,
            newLevel: user.level,
            unlockedAchievements: [],
          }
        }

        // --- 正解時の報酬 ---
        const reward = rewardEngine.computeAnswerReward(q.difficulty, comboCount)
        const xpRes = grantXp(u, reward.xp)
        u = xpRes.user
        u = {
          ...u,
          coin: u.coin + reward.coin,
          todayCoin: u.todayCoin + reward.coin,
          totalCorrect: u.totalCorrect + 1,
          learnedQuestionIds: u.learnedQuestionIds.includes(q.id)
            ? u.learnedQuestionIds
            : [...u.learnedQuestionIds, q.id],
          // 相棒の経験値: アクティブ1体だけ、正解の報酬XPぶん増える(Lv100=PET_MAX_XP で頭打ち)
          pets: u.pets.map((p, i) => (i === u.activePet ? { ...p, xp: Math.min(PET_MAX_XP, p.xp + reward.xp) } : p)),
        }

        // --- レイド貢献（初回貢献ならミッションjoinRaidも進める） ---
        const wasZero = u.raidState.myContribution === 0
        u = contributeRaid(u, 1)
        if (wasZero) u = addMissionProgress(u, 'joinRaid', 1)

        // --- ミッション: 正解数 ---
        u = addMissionProgress(u, 'answerCorrect', 1)

        // --- 実績判定 ---
        const ctx: AchievementContext = { comboCount, raidJoined: true }
        const ach = evaluateAchievements(u, ctx)
        u = ach.user

        setUser(u)
        if (streakCelebration) setCelebration(streakCelebration)
        else if (xpRes.leveledUp) setCelebration({ kind: 'levelup', level: xpRes.newLevel })
        else notifyAchievements(ach.unlocked)

        return {
          correct: true,
          correctAnswer,
          gainedXp: reward.xp,
          gainedCoin: reward.coin,
          comboCount,
          leveledUp: xpRes.leveledUp,
          newLevel: xpRes.newLevel,
          unlockedAchievements: ach.unlocked,
        }
      },

      buyStreakFreeze: () => {
        if (user.streakFreezes >= streakConfig.freezeMax) return false
        if (user.coin < streakConfig.freezePrice) return false
        setUser({ ...user, coin: user.coin - streakConfig.freezePrice, streakFreezes: user.streakFreezes + 1 })
        return true
      },

      markTodayWordSeen: () => {
        if (user.todayWordSeenDate !== todayStr()) setUser({ ...user, todayWordSeenDate: todayStr() })
      },

      applyRewardXp: (xp) => {
        const r = grantXp(user, xp)
        setUser(r.user)
        if (r.leveledUp) setCelebration({ kind: 'levelup', level: r.newLevel })
      },

      chargeBattleFee: (fee) => {
        if (user.coin < fee) return false
        setUser({ ...user, coin: Math.max(0, user.coin - fee) })
        return true
      },

      finishBattle: (result) => {
        let u = applyBattleResult(user, result)
        u = addMissionProgress(u, 'playBattle', 1)
        const ach = evaluateAchievements(u, {})
        u = ach.user
        setUser(u)
        if (ach.unlocked.length > 0) notifyAchievements(ach.unlocked)
      },

      claimMission: (id) => {
        const r = claimMissionLogic(user, id)
        if (!r.claimed) return { ok: false, rewardCoin: 0, rewardXp: 0 }
        const xpRes = grantXp(r.user, r.rewardXp)
        setUser(xpRes.user)
        if (xpRes.leveledUp) setCelebration({ kind: 'levelup', level: xpRes.newLevel })
        return { ok: true, rewardCoin: r.rewardCoin, rewardXp: r.rewardXp }
      },

      claimRaid: () => {
        const r = claimRaidLogic(user)
        if (!r.claimed) return { ok: false, rewardCoin: 0, rewardXp: 0 }
        const xpRes = grantXp(r.user, r.rewardXp)
        setUser(xpRes.user)
        setCelebration({ kind: 'raidClear', title: r.rewardTitle })
        return { ok: true, rewardCoin: r.rewardCoin, rewardXp: r.rewardXp, title: r.rewardTitle }
      },

      buyItem: (id) => {
        const r = buyItemLogic(user, id)
        if (r.ok) setUser(r.user)
        return { ok: r.ok, reason: r.reason }
      },

      equipItem: (id) => {
        setUser(equipItemLogic(user, id))
      },

      setName: (name) => {
        const trimmed = name.trim().slice(0, 12)
        if (trimmed) setUser({ ...user, name: trimmed })
      },

      toggleDeck: (questionId) => {
        // 連続タップに耐えるため関数型更新（副作用なしの純粋なトグル）
        setUser((prev) => ({
          ...prev,
          customDeck: prev.customDeck.includes(questionId)
            ? prev.customDeck.filter((id) => id !== questionId)
            : [...prev.customDeck, questionId],
        }))
      },

      toggleMastered: (questionId) => {
        // 「覚えた」トグル（単語帳一覧の表示だけを制御。復習・図鑑には影響しない）
        setUser((prev) => ({
          ...prev,
          masteredIds: (prev.masteredIds ?? []).includes(questionId)
            ? prev.masteredIds.filter((id) => id !== questionId)
            : [...(prev.masteredIds ?? []), questionId],
        }))
      },

      choosePetStarter: (species) => {
        // アクティブ相棒のスターターを選ぶ（未選択時のみ有効）
        setUser((prev) => {
          const i = prev.activePet
          if (prev.pets[i]?.species) return prev
          return { ...prev, pets: prev.pets.map((p, j) => (j === i ? { ...p, species } : p)) }
        })
      },

      markPetForm: (form) => {
        // アクティブ相棒の進化演出を確認済みにする（前回見たフォームを更新）
        setUser((prev) => ({
          ...prev,
          pets: prev.pets.map((p, j) => (j === prev.activePet ? { ...p, formSeen: Math.max(p.formSeen ?? 0, form) } : p)),
        }))
      },

      setActivePet: (index) => {
        setUser((prev) => ({ ...prev, activePet: Math.max(0, Math.min(index, prev.pets.length - 1)) }))
      },

      buyPetSlot: () => {
        let ok = false
        setUser((prev) => {
          if (prev.pets.length >= PET_MAX_PETS || prev.coin < PET_SLOT_COST) return prev
          ok = true
          const pets = [...prev.pets, { species: null as PetSpeciesId | null, xp: 0, lastTickDate: '', formSeen: 0 }]
          return { ...prev, coin: prev.coin - PET_SLOT_COST, pets, activePet: pets.length - 1 }
        })
        return ok
      },

      resetAll: () => {
        userRepository.clear()
        const fresh = createDefaultUser(user.name)
        const login = applyLoginBonus(fresh)
        setUser(syncLoginStreakMissions(login.user))
        setCelebration(null)
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loginBonus, celebration, readyCats])

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGame(): GameApi {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
