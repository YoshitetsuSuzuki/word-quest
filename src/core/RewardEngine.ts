import type { Difficulty, RewardConfig } from '../types'
import { rewardConfig } from '../data/rewards.config'

/**
 * 報酬（XP/Coin）計算エンジン。すべて rewardConfig 由来のデータ駆動。
 */
export class RewardEngine {
  constructor(private config: RewardConfig = rewardConfig) {}

  private comboMultiplier(comboCount: number): number {
    const table = this.config.comboMultipliers
    if (comboCount <= 0) return table[0]
    return comboCount < table.length ? table[comboCount] : table[table.length - 1]
  }

  /**
   * 1問正解時の報酬を計算する。
   * @param difficulty 問題の難易度
   * @param comboCount 現在のコンボ数（この問題を含めた連続正解数）
   */
  computeAnswerReward(difficulty: Difficulty, comboCount: number): { xp: number; coin: number } {
    const diffMul = this.config.difficultyMultiplier[difficulty] ?? 1.0 // 未定義難易度でもNaNにしない

    const comboMul = this.comboMultiplier(comboCount)
    return {
      xp: Math.round(this.config.baseXp * diffMul * comboMul),
      coin: Math.round(this.config.baseCoin * diffMul * comboMul),
    }
  }
}

export const rewardEngine = new RewardEngine()
