import type { BattleResult, User } from '../../types'
import { opponents } from '../../data/ranking.mock'

export const BATTLE_QUESTIONS = 20
export const BATTLE_ENTRY_FEE = 20

/** 1問ごとの回答記録（速度計算用） */
export interface BattleAnswerLog {
  correct: boolean
  /** 回答にかかった時間(ms) */
  timeMs: number
}

/**
 * スコア計算: 正解1問=100点。速度ボーナスは早いほど加点（最大+50/問）。
 */
export function computeScore(logs: BattleAnswerLog[]): { score: number; correct: number } {
  let score = 0
  let correct = 0
  for (const log of logs) {
    if (log.correct) {
      correct += 1
      const speedBonus = Math.max(0, 50 - Math.floor(log.timeMs / 100))
      score += 100 + speedBonus
    }
  }
  return { score, correct }
}

/** Elo に近い相手を選ぶ（初心者狩り防止の将来設計の入口） */
export function pickOpponent(userElo: number): (typeof opponents)[number] {
  return [...opponents].sort((a, b) => Math.abs(a.elo - userElo) - Math.abs(b.elo - userElo))[0]
}

/** CPU相手のスコアを擬似生成する（accuracy と多少の乱数） */
export function simulateOpponentScore(opponent: (typeof opponents)[number]): { score: number; correct: number } {
  let score = 0
  let correct = 0
  for (let i = 0; i < BATTLE_QUESTIONS; i++) {
    if (Math.random() < opponent.accuracy) {
      correct += 1
      const speedBonus = Math.floor(Math.random() * 40) + 10
      score += 100 + speedBonus
    }
  }
  return { score, correct }
}

/** Elo変動計算（K=32の簡易版）。勝ちは最低+1、負けは最大-1に丸める。 */
export function computeEloDelta(myElo: number, oppElo: number, win: boolean): number {
  const expected = 1 / (1 + 10 ** ((oppElo - myElo) / 400))
  const actual = win ? 1 : 0
  const raw = Math.round(32 * (actual - expected))
  return win ? Math.max(1, raw) : Math.min(-1, raw)
}

/** バトル結果を確定する（報酬・Elo込み）。myElo は実ユーザーのレートを渡す。 */
export function resolveBattle(
  logs: BattleAnswerLog[],
  opponent: (typeof opponents)[number],
  myElo: number,
): BattleResult {
  const me = computeScore(logs)
  const opp = simulateOpponentScore(opponent)
  const win = me.score >= opp.score
  const eloDelta = computeEloDelta(myElo, opponent.elo, win)
  const gainedCoin = win ? 60 : 10
  return {
    win,
    myScore: me.score,
    opponentScore: opp.score,
    opponentName: opponent.name,
    myCorrect: me.correct,
    gainedCoin,
    eloDelta,
  }
}

/** バトル結果をユーザーに反映する（Elo/Coin/戦績）。参加費は開始時に別途徴収。 */
export function applyBattleResult(user: User, result: BattleResult): User {
  const coin = result.gainedCoin
  return {
    ...user,
    eloRating: Math.max(100, user.eloRating + result.eloDelta),
    coin: user.coin + coin,
    todayCoin: user.todayCoin + coin,
    lifetimeCoin: user.lifetimeCoin + coin,
    battleWins: user.battleWins + (result.win ? 1 : 0),
    battleLosses: user.battleLosses + (result.win ? 0 : 1),
  }
}
