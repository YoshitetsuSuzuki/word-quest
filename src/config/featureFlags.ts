import { Capacitor } from '@capacitor/core'
import type { FeatureFlags } from '../types'

/**
 * Android の初回リリースは広告導線を出さない。
 *
 * AdMob はアカウントが不承認のまま使えず、後継として選定した LevelPlay SDK は
 * まだ Android に入っていない。この状態で広告ボタンを出すと在庫ゼロ（no-fill）で
 * 「押しても何も起きないボタン」になり、初回リリースの印象を損なう。
 *
 * LevelPlay を Android へ導入した時点でこの分岐ごと削除し、adsEnabled: true に戻す。
 * iOS の挙動は一切変えない（iOS は従来どおり広告導線を出す）。
 */
const ADS_ENABLED = Capacitor.getPlatform() !== 'android'

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
  // 広告・課金はネイティブ(iOS/Android)アプリのみ実動作。Web(PWA)では自動スキップされる。
  // Android は広告会社が未確定のため当面 false（上の ADS_ENABLED を参照）。
  adsEnabled: ADS_ENABLED,
  purchaseEnabled: true,
  // 確実な訳の語だけを出題（レビュー拡大に伴い対象が増える）。品質最優先のため既定ON。
  verifiedOnly: true,
}
