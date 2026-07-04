import type { User } from '../types'
import { todayStr, yesterdayStr } from './dateUtils'

export const DAILY_LOGIN_BASE_COIN = 20

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
  // 連続日数に応じた小さな上乗せ（最大+80）
  const bonusCoin = DAILY_LOGIN_BASE_COIN + Math.min(80, (streakDays - 1) * 10)

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
