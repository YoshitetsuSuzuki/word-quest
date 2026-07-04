import type { RewardConfig } from '../types'
import { rewardConfig } from '../data/rewards.config'

/**
 * レベル・XP進行の計算エンジン。
 * XPは累積値ではなく「現在レベル内のXP」として扱い、閾値を超えたらレベルアップ。
 */
export class ProgressEngine {
  constructor(private config: RewardConfig = rewardConfig) {}

  /** 指定レベルから次レベルへ必要なXP */
  requiredXp(level: number): number {
    return this.config.levelCurve(level)
  }

  /**
   * XPを加算し、レベルアップを解決する。
   * @returns 更新後の level / xp（レベル内XP） / 何レベル上がったか
   */
  applyXp(level: number, xp: number, gainedXp: number): { level: number; xp: number; leveledUp: boolean; levelsGained: number } {
    let curLevel = level
    let curXp = xp + gainedXp
    let levelsGained = 0

    while (curXp >= this.requiredXp(curLevel)) {
      curXp -= this.requiredXp(curLevel)
      curLevel += 1
      levelsGained += 1
    }

    return { level: curLevel, xp: curXp, leveledUp: levelsGained > 0, levelsGained }
  }
}

export const progressEngine = new ProgressEngine()
