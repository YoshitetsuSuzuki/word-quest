import type { MissionDef } from '../types'

/** デイリーミッション定義（データ駆動）。項目・報酬はここで自由に増減できる。 */
export const dailyMissions: MissionDef[] = [
  { id: 'm-correct-10', title: '10問正解する', type: 'answerCorrect', target: 10, rewardCoin: 50, rewardXp: 30 },
  { id: 'm-battle-1', title: 'バトルを1回プレイ', type: 'playBattle', target: 1, rewardCoin: 40, rewardXp: 20 },
  { id: 'm-raid-1', title: 'レイドに参加する', type: 'joinRaid', target: 1, rewardCoin: 40, rewardXp: 20 },
  { id: 'm-login-3', title: '3日連続でログイン', type: 'loginStreak', target: 3, rewardCoin: 80, rewardXp: 40 },
]

/** 日替わりチャレンジ候補(日付シードで1件選ばれ、報酬は通常より高め) */
export const dailyChallengePool: MissionDef[] = [
  { id: 'c-correct-15', title: '⭐15問正解する', type: 'answerCorrect', target: 15, rewardCoin: 120, rewardXp: 60 },
  { id: 'c-correct-20', title: '⭐20問正解する', type: 'answerCorrect', target: 20, rewardCoin: 150, rewardXp: 80 },
  { id: 'c-correct-25', title: '⭐25問正解する', type: 'answerCorrect', target: 25, rewardCoin: 180, rewardXp: 100 },
  { id: 'c-battle-2', title: '⭐バトルを2回プレイ', type: 'playBattle', target: 2, rewardCoin: 140, rewardXp: 70 },
]

/** 今日のチャレンジ(日付シードで決定的に選出) */
export function dailyChallengeFor(dateStr: string): MissionDef {
  let h = 0
  for (let i = 0; i < dateStr.length; i++) h = (h * 31 + dateStr.charCodeAt(i)) >>> 0
  return dailyChallengePool[h % dailyChallengePool.length]
}
