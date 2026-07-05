import type { AchievementDef } from '../types'

/** 実績定義（データ駆動） */
export const achievements: AchievementDef[] = [
  { id: 'a-first-correct', title: '記念すべき一歩', description: '初めて正解した', emoji: '🌱', condition: { kind: 'firstCorrect' }, rewardCoin: 20 },
  { id: 'a-combo-10', title: 'コンボマスター', description: '10連続で正解した', emoji: '🔥', condition: { kind: 'comboReach', value: 10 }, rewardCoin: 60 },
  { id: 'a-correct-50', title: '五十の壁', description: '累計50問正解した', emoji: '📗', condition: { kind: 'totalCorrect', value: 50 }, rewardCoin: 40 },
  { id: 'a-correct-100', title: '百問繚乱', description: '累計100問正解した', emoji: '💯', condition: { kind: 'totalCorrect', value: 100 }, rewardCoin: 100 },
  { id: 'a-correct-500', title: '五百の探究者', description: '累計500問正解した', emoji: '📚', condition: { kind: 'totalCorrect', value: 500 }, rewardCoin: 300 },
  { id: 'a-correct-1000', title: '千問の賢者', description: '累計1000問正解した', emoji: '🎓', condition: { kind: 'totalCorrect', value: 1000 }, rewardCoin: 600 },
  { id: 'a-battle-win-1', title: '初勝利', description: '初めてバトルに勝利した', emoji: '⚔️', condition: { kind: 'battleWin', value: 1 }, rewardCoin: 50 },
  { id: 'a-raid-1', title: 'レイド参戦', description: '初めてレイドに参加した', emoji: '🛡️', condition: { kind: 'raidJoin', value: 1 }, rewardCoin: 40 },
  { id: 'a-login-7', title: '週間皆勤賞', description: '7日連続でログインした', emoji: '📅', condition: { kind: 'loginStreak', value: 7 }, rewardCoin: 120 },
]
