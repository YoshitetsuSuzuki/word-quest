import type { User, AchievementDef } from '../../types'
import { achievements } from '../../data/achievements.config'

/** 実績判定時の一時的なシグナル（永続化されない現在イベント文脈） */
export interface AchievementContext {
  comboCount?: number
  raidJoined?: boolean
}

function isMet(def: AchievementDef, user: User, ctx: AchievementContext): boolean {
  const c = def.condition
  switch (c.kind) {
    case 'firstCorrect':
      return user.totalCorrect >= 1
    case 'comboReach':
      return (ctx.comboCount ?? 0) >= c.value
    case 'totalCorrect':
      return user.totalCorrect >= c.value
    case 'battleWin':
      return user.battleWins >= c.value
    case 'raidJoin':
      return (ctx.raidJoined ?? false) || user.raidState.myContribution >= 1
    case 'loginStreak':
      return user.streakDays >= c.value
  }
}

/**
 * 現在のユーザー状態から新たに解除された実績を判定し、
 * 実績と報酬Coinを付与したユーザーを返す。
 */
export function evaluateAchievements(
  user: User,
  ctx: AchievementContext = {},
): { user: User; unlocked: AchievementDef[] } {
  const already = new Set(user.achievements.map((a) => a.id))
  const unlocked: AchievementDef[] = []
  let coinBonus = 0
  const now = Date.now()

  for (const def of achievements) {
    if (already.has(def.id)) continue
    if (isMet(def, user, ctx)) {
      unlocked.push(def)
      coinBonus += def.rewardCoin
    }
  }

  if (unlocked.length === 0) return { user, unlocked }

  return {
    user: {
      ...user,
      coin: user.coin + coinBonus,
      todayCoin: user.todayCoin + coinBonus,
      lifetimeCoin: user.lifetimeCoin + coinBonus,
      achievements: [...user.achievements, ...unlocked.map((d) => ({ id: d.id, unlockedAt: now }))],
    },
    unlocked,
  }
}
