// ============================================================================
// PetEngine.ts  学習相棒の状態導出（純粋関数）
// 成長段階・気分は既存の学習/ストリークデータから導出する（新規保存は最小限）。
// ============================================================================
import type { User } from '../types'
import { PET_STAGE_THRESHOLDS, PET_MOOD_DAYS, type PetStage, type PetMood } from '../config/petConfig'

/** YYYY-MM-DD を UTC 正午の epoch(ms) に（DST影響を避ける） */
function parseDay(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1, 12)
}

/** 2つの YYYY-MM-DD の日数差（a - b, 日単位） */
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(a) - parseDay(b)) / 86400000)
}

/** 育てた語数から成長段階(1..5)を返す */
export function petStage(learnedCount: number): PetStage {
  let stage = 1
  for (let i = 0; i < PET_STAGE_THRESHOLDS.length; i++) {
    if (learnedCount >= PET_STAGE_THRESHOLDS[i]) stage = i + 1
  }
  return stage as PetStage
}

/** 次段階に必要な語数（最終段階なら null） */
export function nextStageAt(stage: PetStage): number | null {
  return stage >= 5 ? null : PET_STAGE_THRESHOLDS[stage]
}

/** dailyHistory から最終学習日(値>0の最新)を返す。無ければ null */
export function lastActiveDate(user: User): string | null {
  const hist = user.dailyHistory ?? {}
  let latest: string | null = null
  for (const [day, count] of Object.entries(hist)) {
    if (count > 0 && (latest === null || day > latest)) latest = day
  }
  // dailyHistory 未反映でも今日回答していれば今日を最終日とみなす
  if (user.todayAnswered > 0 && (latest === null || user.todayAnsweredDate > latest)) {
    latest = user.todayAnsweredDate
  }
  return latest
}

/** 最終学習日からの経過日数（履歴なしは null） */
export function daysSinceLastActive(user: User, today: string): number | null {
  const last = lastActiveDate(user)
  if (!last) return null
  return Math.max(0, diffDays(today, last))
}

/** 気分を返す。履歴なし(新規)は normal（さみしい表示にしない） */
export function petMood(user: User, today: string): PetMood {
  const days = daysSinceLastActive(user, today)
  if (days === null) return 'normal'
  if (days <= PET_MOOD_DAYS.happyMax) return 'happy'
  if (days <= PET_MOOD_DAYS.normalMax) return 'normal'
  if (days <= PET_MOOD_DAYS.hungryMax) return 'hungry'
  return 'sad'
}

export interface PetView {
  stage: PetStage
  mood: PetMood
  learned: number
  /** 次段階に必要な語数（最終段階は null） */
  nextAt: number | null
  /** 現段階内の進捗率(0-1)。最終段階は 1 */
  progress: number
  /** 前回見た段階より育った=進化演出フラグ */
  evolved: boolean
}

/** ホームウィジェット表示用の相棒ビューを組み立てる */
export function petView(user: User, today: string): PetView {
  const learned = user.learnedQuestionIds.length
  const stage = petStage(learned)
  const nextAt = nextStageAt(stage)
  const base = PET_STAGE_THRESHOLDS[stage - 1]
  const progress = nextAt === null ? 1 : Math.min(1, Math.max(0, (learned - base) / (nextAt - base)))
  const evolved = stage > (user.petStageSeen ?? 0) && (user.petStageSeen ?? 0) > 0
  return { stage, mood: petMood(user, today), learned, nextAt, progress, evolved }
}
