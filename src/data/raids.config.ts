import type { RaidDef } from '../types'

/**
 * レイドボス定義（データ駆動）。
 * MVPではリアルタイム通信せず、日付でボスをローテーションし、
 * baseProgressRatio で「他プレイヤーの貢献」を擬似演出する。
 */
export const raidBosses: RaidDef[] = [
  { id: 'raid-slime', name: 'ボキャブラリー・スライム', nameEn: 'Vocabulary Slime', emoji: '🟢', targetContribution: 30, baseProgressRatio: 0.45, rewardCoin: 100, rewardXp: 60, rewardTitle: 'スライム討伐者', rewardTitleEn: 'Slime Slayer' },
  { id: 'raid-golem', name: 'グラマー・ゴーレム', nameEn: 'Grammar Golem', emoji: '🗿', targetContribution: 40, baseProgressRatio: 0.5, rewardCoin: 140, rewardXp: 80, rewardTitle: 'ゴーレム討伐者', rewardTitleEn: 'Golem Slayer' },
  { id: 'raid-dragon', name: 'イディオム・ドラゴン', nameEn: 'Idiom Dragon', emoji: '🐉', targetContribution: 50, baseProgressRatio: 0.55, rewardCoin: 200, rewardXp: 120, rewardTitle: 'ドラゴンスレイヤー', rewardTitleEn: 'Dragon Slayer' },
]

/** 日付文字列から今日のボスを決定的に選ぶ（全ユーザーで同じ想定） */
export function getTodaysBoss(dateStr: string): RaidDef {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0
  return raidBosses[hash % raidBosses.length]
}
