import type { RewardConfig } from '../types'

/**
 * 報酬計算の設定（データ駆動）。
 * 数値を変えるだけでゲームバランスを調整できる。
 */
export const rewardConfig: RewardConfig = {
  baseXp: 10,
  baseCoin: 5,
  difficultyMultiplier: {
    1: 1.0,
    2: 1.2,
    3: 1.5,
    4: 1.8,
    5: 2.2,
  },
  // combo 0-1問目=1.0倍, 2連=1.2倍, ... 10連以上=3.0倍
  comboMultipliers: [1.0, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 2.8, 3.0],
  // レベルアップに必要なXP。緩やかな二次カーブ。
  levelCurve: (level: number) => 50 + (level - 1) * 40 + Math.floor((level - 1) ** 2 * 6),
}
