import type { User } from '../types'
import { todayStr } from './dateUtils'
import { getTodaysBoss } from '../data/raids.config'

/** 新規ユーザーの初期状態を生成する */
export function createDefaultUser(name = 'Player'): User {
  const today = todayStr()
  return {
    id: `u-${Date.now().toString(36)}`,
    name,
    xp: 0,
    level: 1,
    coin: 0,
    eloRating: 1200,
    streakDays: 0,
    totalCorrect: 0,
    totalAnswered: 0,
    learnedQuestionIds: [],
    reviewQueue: [],
    achievements: [],
    lastLoginDate: '',
    battleWins: 0,
    battleLosses: 0,
    todayCoin: 0,
    todayCoinDate: today,
    ownedItemIds: [],
    equipped: {},
    missionState: { date: today, progress: {}, claimed: [] },
    raidState: { date: today, bossId: getTodaysBoss(today).id, myContribution: 0, claimed: false },
    wordStats: {},
    customDeck: [],
    masteredIds: [],
    todayAnswered: 0,
    todayAnsweredDate: today,
    studyStreak: 0,
    longestStudyStreak: 0,
    lastStudyDate: '',
    streakFreezes: 0,
    claimedStreakMilestones: [],
    dailyHistory: {},
    todayWordSeenDate: '',
    pets: [{ name: '', species: null, xp: 0, lastTickDate: '', formSeen: 0 }],
    activePet: 0,
    gems: 0,
    ownedSpecies: [],
  }
}
