import type { FeatureFlags } from '../types'

/**
 * 機能のON/OFF。各Moduleはこのフラグで表示・動作を切り替える。
 * 将来イベント等でリモート設定に差し替え可能。
 */
export const featureFlags: FeatureFlags = {
  battleEnabled: true,
  raidEnabled: true,
  rankingEnabled: true,
  shopEnabled: true,
  missionsEnabled: true,
  achievementsEnabled: true,
  reviewEnabled: true,
}
