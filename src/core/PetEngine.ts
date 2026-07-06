// ============================================================================
// PetEngine.ts  学習相棒の状態導出（純粋関数）
// XPは学習で増え・サボると減る。Lv100で最大。大進化4段階＋レベルで連続強化。
// ============================================================================
import type { User, PetState } from '../types'
import {
  PET_MAX_LEVEL,
  PET_XP_BASE,
  PET_XP_STEP,
  PET_DECAY_PER_DAY,
  PET_FORM_THRESHOLDS,
  PET_MOOD_DAYS,
  type PetMood,
  type PetSpecies,
} from '../config/petConfig'

// ---- 日付ユーティリティ ----
function parseDay(s: string): number {
  const [y, m, d] = s.split('-').map(Number)
  return Date.UTC(y, (m || 1) - 1, d || 1, 12)
}
export function diffDays(a: string, b: string): number {
  return Math.round((parseDay(a) - parseDay(b)) / 86400000)
}
export function addDays(s: string, n: number): string {
  const t = parseDay(s) + n * 86400000
  const d = new Date(t)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ---- XP ↔ レベル ----
/** Lv L → L+1 に必要なXP */
export function xpToNext(level: number): number {
  return PET_XP_BASE + PET_XP_STEP * (level - 1)
}
/** Lv `level` に到達するのに必要な累計XP（Lv1=0） */
export function xpForLevel(level: number): number {
  let sum = 0
  for (let l = 1; l < level; l++) sum += xpToNext(l)
  return sum
}
/** Lv100到達に必要な累計XP（XPの上限） */
export const PET_MAX_XP = xpForLevel(PET_MAX_LEVEL)

/** 累計XPから現在レベル(1..100)を返す */
export function levelFromXp(xp: number): number {
  let level = 1
  let remain = Math.max(0, xp)
  while (level < PET_MAX_LEVEL && remain >= xpToNext(level)) {
    remain -= xpToNext(level)
    level++
  }
  return level
}

/** 現レベル内の進捗 {level, into, need, ratio} */
export function levelProgress(xp: number): { level: number; into: number; need: number; ratio: number } {
  const level = levelFromXp(xp)
  if (level >= PET_MAX_LEVEL) return { level, into: 1, need: 1, ratio: 1 }
  const into = Math.max(0, xp) - xpForLevel(level)
  const need = xpToNext(level)
  return { level, into, need, ratio: Math.min(1, Math.max(0, into / need)) }
}

/** レベルから大進化フォーム(1..4)を返す */
export function petForm(level: number): number {
  let form = 1
  for (let i = 0; i < PET_FORM_THRESHOLDS.length; i++) {
    if (level >= PET_FORM_THRESHOLDS[i]) form = i + 1
  }
  return form
}

// ---- 気分（最終学習日からの経過日数）----
export function lastActiveDate(user: User): string | null {
  const hist = user.dailyHistory ?? {}
  let latest: string | null = null
  for (const [day, count] of Object.entries(hist)) {
    if (count > 0 && (latest === null || day > latest)) latest = day
  }
  if (user.todayAnswered > 0 && (latest === null || user.todayAnsweredDate > latest)) {
    latest = user.todayAnsweredDate
  }
  return latest
}
export function daysSinceLastActive(user: User, today: string): number | null {
  const last = lastActiveDate(user)
  if (!last) return null
  return Math.max(0, diffDays(today, last))
}
export function petMood(user: User, today: string): PetMood {
  const days = daysSinceLastActive(user, today)
  if (days === null) return 'normal'
  if (days <= PET_MOOD_DAYS.happyMax) return 'happy'
  if (days <= PET_MOOD_DAYS.normalMax) return 'normal'
  if (days <= PET_MOOD_DAYS.hungryMax) return 'hungry'
  return 'sad'
}

/** アクティブな相棒を取り出す */
export function activePet(user: User): PetState {
  return user.pets[user.activePet] ?? user.pets[0]
}

// ---- サボりによるXP減衰（完了した日だけ課金。当日は未評価）----
// 育成中(アクティブ)の1体だけ減衰する。控えの相棒は一時停止＝減らさない。
/** 経過した「学習しなかった完了日」分だけアクティブ相棒のXPを減らした user を返す */
export function settlePetDecay(user: User, today: string): User {
  const idx = user.activePet
  const pet = user.pets[idx]
  if (!pet) return user
  const lastCompleted = addDays(today, -1)
  const from = pet.lastTickDate || lastCompleted // 新規は前日基準＝遡って罰しない
  const gap = diffDays(lastCompleted, from)
  const setTick = (p: PetState, xp: number) => user.pets.map((q, i) => (i === idx ? { ...p, xp, lastTickDate: lastCompleted } : q))
  if (gap <= 0) {
    if (pet.lastTickDate !== lastCompleted) return { ...user, pets: setTick(pet, pet.xp) }
    return user
  }
  let missed = 0
  const hist = user.dailyHistory ?? {}
  for (let i = 1; i <= Math.min(gap, 90); i++) {
    const d = addDays(from, i)
    if (!(hist[d] > 0)) missed++
  }
  const xp = Math.max(0, pet.xp - missed * PET_DECAY_PER_DAY)
  return { ...user, pets: setTick(pet, xp) }
}

export interface PetView {
  species: PetSpecies | null
  xp: number
  level: number
  form: number
  mood: PetMood
  /** 現レベル内の進捗率(0-1) */
  progress: number
  /** レベルアップまでの残りXP（最大レベルは0） */
  toNext: number
  maxed: boolean
  /** 前回見たフォームより進化した */
  evolved: boolean
}

export function petView(user: User, today: string): PetView {
  const pet = activePet(user)
  const xp = Math.max(0, pet.xp)
  const level = levelFromXp(xp)
  const form = petForm(level)
  const prog = levelProgress(xp)
  return {
    species: pet.species,
    xp,
    level,
    form,
    mood: petMood(user, today),
    progress: prog.ratio,
    toNext: level >= PET_MAX_LEVEL ? 0 : prog.need - prog.into,
    maxed: level >= PET_MAX_LEVEL,
    evolved: form > (pet.formSeen ?? 0) && (pet.formSeen ?? 0) > 0,
  }
}
