import type { User, RaidDef } from '../../types'
import { getTodaysBoss } from '../../data/raids.config'
import { todayStr } from '../../state/dateUtils'

/** 日付が変わっていれば今日のボスへリセットする */
export function ensureRaidDay(user: User): User {
  const today = todayStr()
  if (user.raidState.date === today) return user
  const boss = getTodaysBoss(today)
  return { ...user, raidState: { date: today, bossId: boss.id, myContribution: 0, claimed: false } }
}

/** 今日のボス定義を取得 */
export function getCurrentBoss(): RaidDef {
  return getTodaysBoss(todayStr())
}

export interface RaidView {
  boss: RaidDef
  myContribution: number
  /** 表示用の総進捗（擬似的な他プレイヤー分 + 自分の貢献）0..target */
  totalProgress: number
  target: number
  cleared: boolean
  claimed: boolean
  ratio: number // 0..1
}

/** UI表示用のレイド状況を組み立てる（ダミー集計） */
export function getRaidView(user: User): RaidView {
  const u = ensureRaidDay(user)
  const boss = getTodaysBoss(u.raidState.date)
  const base = Math.floor(boss.targetContribution * boss.baseProgressRatio)
  const total = Math.min(boss.targetContribution, base + u.raidState.myContribution)
  return {
    boss,
    myContribution: u.raidState.myContribution,
    totalProgress: total,
    target: boss.targetContribution,
    cleared: total >= boss.targetContribution,
    claimed: u.raidState.claimed,
    ratio: total / boss.targetContribution,
  }
}

/** レイドに貢献を加算する（クイズ正解時などに呼ぶ） */
export function contributeRaid(user: User, amount: number): User {
  const u = ensureRaidDay(user)
  return { ...u, raidState: { ...u.raidState, myContribution: u.raidState.myContribution + amount } }
}

/** レイド報酬を受け取る。クリア済みかつ未受取なら付与。 */
export function claimRaid(
  user: User,
): { user: User; claimed: boolean; rewardCoin: number; rewardXp: number; rewardTitle?: string } {
  const u = ensureRaidDay(user)
  const view = getRaidView(u)
  if (!view.cleared || u.raidState.claimed) {
    return { user: u, claimed: false, rewardCoin: 0, rewardXp: 0 }
  }
  const boss = view.boss
  return {
    user: {
      ...u,
      coin: u.coin + boss.rewardCoin,
      todayCoin: u.todayCoin + boss.rewardCoin,
      lifetimeCoin: u.lifetimeCoin + boss.rewardCoin,
      raidState: { ...u.raidState, claimed: true },
    },
    claimed: true,
    rewardCoin: boss.rewardCoin,
    rewardXp: boss.rewardXp,
    rewardTitle: boss.rewardTitle,
  }
}
