import type { User } from './types'
import { createDefaultUser } from './state/defaultUser'
import { xpForLevel } from './core/PetEngine'
import { todayStr } from './state/dateUtils'
import { DEMO_LEARNED_IDS } from './demoLearned'

/**
 * App Store スクリーンショット用のデモ状態。
 * VITE_DEMO=1 のビルドでのみ localStorage に投入される（本番ビルドには一切影響しない）。
 * すべて通常プレイで到達可能な代表的な「よく遊んでいるユーザー」の状態。
 */
export function seedDemoUser(): User {
  const today = todayStr()
  const base = createDefaultUser('ハル')
  return {
    ...base,
    level: 8,
    xp: 120,
    coin: 1320,
    lifetimeCoin: 5840,
    todayCoin: 80,
    todayCoinDate: today,
    gems: 12,
    streakDays: 12,
    studyStreak: 12,
    longestStudyStreak: 18,
    lastStudyDate: today,
    lastLoginDate: today,
    totalCorrect: 642,
    totalAnswered: 810,
    learnedQuestionIds: DEMO_LEARNED_IDS,
    battleWins: 23,
    battleLosses: 9,
    eloRating: 1380,
    weeklyPoints: 340,
    leagueTier: 1,
    todayAnswered: 6,
    todayAnsweredDate: today,
    pets: [
      { name: 'リュウ', species: 'green', xp: xpForLevel(21) + 30, lastTickDate: today, formSeen: 2, fusion: 0, isNew: false },
    ],
    activePet: 0,
    ownedSpecies: ['green', 'fire'],
    ownedItemIds: ['s-title-scholar', 's-frame-silver'],
    equipped: { title: 's-title-scholar', frame: 's-frame-silver' },
  }
}

/** VITE_DEMO=1 のときだけ、localStorage にデモ状態とオンボード済みフラグを書き込む。 */
export function applyDemoSeedIfEnabled(): void {
  if (import.meta.env.VITE_DEMO !== '1') return
  try {
    localStorage.setItem('wordquest.user.v1', JSON.stringify(seedDemoUser()))
    localStorage.setItem('wordquest.onboarded', '1')
    localStorage.setItem('wordquest.category', 'english')
  } catch {
    /* no-op */
  }
}
