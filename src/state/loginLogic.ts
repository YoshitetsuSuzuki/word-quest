import type { User } from '../types'
import { todayStr, yesterdayStr } from './dateUtils'

export const DAILY_LOGIN_BASE_COIN = 20

/** 7日サイクルのログインボーナス(7日目が豪華)。位置は (streakDays-1) % 7 */
export const LOGIN_CYCLE: number[] = [20, 30, 40, 50, 60, 80, 200]

/**
 * ログインボーナス処理。アプリ起動時に一度だけ適用する。
 * - 連続ログインなら streakDays++ / 途切れたら 1 にリセット
 * - 日付が変わっていれば todayCoin をリセット
 * - 毎日 Coin を付与
 */
export function applyLoginBonus(user: User): { user: User; bonusCoin: number; isNewDay: boolean } {
  const today = todayStr()

  // todayCoin の日跨ぎリセット
  let u = user
  if (u.todayCoinDate !== today) {
    u = { ...u, todayCoin: 0, todayCoinDate: today }
  }

  if (u.lastLoginDate === today) {
    // 本日ログイン済み: ボーナスなし
    return { user: u, bonusCoin: 0, isNewDay: false }
  }

  const streakDays = u.lastLoginDate === yesterdayStr() ? u.streakDays + 1 : 1
  // 7日サイクルのカレンダー報酬(7日目が豪華)
  const bonusCoin = LOGIN_CYCLE[(streakDays - 1) % LOGIN_CYCLE.length]

  return {
    user: {
      ...u,
      streakDays,
      lastLoginDate: today,
      coin: u.coin + bonusCoin,
      todayCoin: u.todayCoin + bonusCoin,
    },
    bonusCoin,
    isNewDay: true,
  }
}
