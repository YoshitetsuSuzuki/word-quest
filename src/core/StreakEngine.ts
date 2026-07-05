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
