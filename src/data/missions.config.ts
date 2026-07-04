import type { MissionDef } from '../types'

/** デイリーミッション定義（データ駆動）。項目・報酬はここで自由に増減できる。 */
export const dailyMissions: MissionDef[] = [
  { id: 'm-correct-10', title: '10問正解する', type: 'answerCorrect', target: 10, rewardCoin: 50, rewardXp: 30 },
  { id: 'm-battle-1', title: 'バトルを1回プレイ', type: 'playBattle', target: 1, rewardCoin: 40, rewardXp: 20 },
  { id: 'm-raid-1', title: 'レイドに参加する', type: 'joinRaid', target: 1, rewardCoin: 40, rewardXp: 20 },
  { id: 'm-login-3', title: '3日連続でログイン', type: 'loginStreak', target: 3, rewardCoin: 80, rewardXp: 40 },
]
