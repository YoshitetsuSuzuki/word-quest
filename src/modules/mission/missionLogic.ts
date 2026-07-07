import type { User, MissionType, MissionDef } from '../../types'
import { dailyMissions, dailyChallengeFor } from '../../data/missions.config'
import { todayStr } from '../../state/dateUtils'

/** 今日有効なミッション一覧(通常デイリー+日替わりチャレンジ) */
export function activeMissions(): MissionDef[] {
  return [...dailyMissions, dailyChallengeFor(todayStr())]
}

/** 日付が変わっていればミッション進捗をリセットする */
export function ensureMissionDay(user: User): User {
  const today = todayStr()
  if (user.missionState.date === today) return user
  return { ...user, missionState: { date: today, progress: {}, claimed: [] } }
}

/** 指定タイプのミッションに進捗を加算する */
export function addMissionProgress(user: User, type: MissionType, amount: number): User {
  const u = ensureMissionDay(user)
  const progress = { ...u.missionState.progress }
  for (const m of activeMissions()) {
    if (m.type === type) {
      progress[m.id] = Math.min(m.target, (progress[m.id] ?? 0) + amount)
    }
  }
  return { ...u, missionState: { ...u.missionState, progress } }
}

/** loginStreak系ミッションは連続日数を直接反映する（加算ではない） */
export function syncLoginStreakMissions(user: User): User {
  const u = ensureMissionDay(user)
  const progress = { ...u.missionState.progress }
  for (const m of dailyMissions) {
    if (m.type === 'loginStreak') {
      progress[m.id] = Math.min(m.target, user.streakDays)
    }
  }
  return { ...u, missionState: { ...u.missionState, progress } }
}

export interface MissionView {
  def: MissionDef
  progress: number
  completed: boolean
  claimed: boolean
}

/** UI表示用のミッション一覧を組み立てる */
export function getMissionViews(user: User): MissionView[] {
  const state = user.missionState
  return activeMissions().map((def) => {
    const progress = state.progress[def.id] ?? 0
    return {
      def,
      progress,
      completed: progress >= def.target,
      claimed: state.claimed.includes(def.id),
    }
  })
}

/** ミッション報酬を受け取る。受取可能なら Coin/XP を加算し claimed に記録。 */
export function claimMission(
  user: User,
  missionId: string,
): { user: User; claimed: boolean; rewardCoin: number; rewardXp: number } {
  const u = ensureMissionDay(user)
  const def = activeMissions().find((m) => m.id === missionId)
  if (!def) return { user: u, claimed: false, rewardCoin: 0, rewardXp: 0 }

  const progress = u.missionState.progress[missionId] ?? 0
  if (progress < def.target || u.missionState.claimed.includes(missionId)) {
    return { user: u, claimed: false, rewardCoin: 0, rewardXp: 0 }
  }

  return {
    user: {
      ...u,
      coin: u.coin + def.rewardCoin,
      todayCoin: u.todayCoin + def.rewardCoin,
      lifetimeCoin: u.lifetimeCoin + def.rewardCoin,
      missionState: { ...u.missionState, claimed: [...u.missionState.claimed, missionId] },
    },
    claimed: true,
    rewardCoin: def.rewardCoin,
    rewardXp: def.rewardXp,
  }
}
