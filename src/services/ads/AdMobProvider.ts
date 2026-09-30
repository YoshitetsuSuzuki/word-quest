// ============================================================================
// AdMob 1社ぶんのプロバイダ実装。
//
// ⚠️ このファイルは AdMob 固有のものを閉じ込める場所である。
//    広告ユニットID・テスト/本番の切替・npa などの AdMob 専用の概念は
//    すべてここに閉じ、AdService からは見えないようにしてある。
//    maio / LevelPlay を足すときは、隣に MaioProvider.ts を置くだけで済む。
//
// 中身の処理は、以前 AdService.ts に直接書かれていたものを**一字も変えずに**移設した。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import {
  AdMob,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob'
import { Analytics } from '../Analytics'
import { AdMetrics } from './AdMetrics'
import type { AdOutcome, AdProvider } from './types'

// Google公式のテスト広告ユニットID（アカウント不要で本物の広告UIを確認できる）
const TEST_IDS = {
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
  },
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  },
}

// 本番の広告ユニットID（AdMob発行済み）。USE_TEST_ADS = false のときに使われる
const PROD_IDS = {
  ios: {
    rewarded: 'ca-app-pub-2458111871576392/3190419474',
    interstitial: 'ca-app-pub-2458111871576392/2180590137',
  },
  android: {
    rewarded: 'ca-app-pub-2458111871576392/6558818840',
    interstitial: 'ca-app-pub-2458111871576392/3651931394',
  },
}

/**
 * ストア公開までは true（＝テスト広告）のままにする。
 *   - AdMobのアプリ審査はストア公開後に通るため、公開前は本番広告が配信されない
 *   - 開発中に本番広告を出して自分でタップすると規約違反（無効トラフィック）になる
 * ストア公開・AdMob承認後に false へ変更すれば、本番広告＝収益化が始まる。
 */
const USE_TEST_ADS = false

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function currentIds() {
  const set = USE_TEST_ADS ? TEST_IDS : PROD_IDS
  return Capacitor.getPlatform() === 'ios' ? set.ios : set.android
}

let initialized = false

async function ensureInit(): Promise<void> {
  if (!isNative() || initialized) return
  await AdMob.initialize()
  initialized = true
}

export const AdMobProvider: AdProvider = {
  id: 'admob',

  isAvailable(): boolean {
    return isNative()
  },

  async init(): Promise<void> {
    if (!isNative()) return
    try {
      await ensureInit()
    } catch (e) {
      console.warn('[AdMobProvider] init failed', e)
    }
  },

  async showRewarded(): Promise<AdOutcome> {
    if (!isNative()) return 'unavailable'
    AdMetrics.track('requested', { format: 'rewarded', provider: 'admob' })
    try {
      await ensureInit()
      let earned = false
      const handle = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (_item: AdMobRewardItem) => {
          earned = true
        },
      )
      // npa=true: 非パーソナライズ広告。ATT(トラッキング許可)を実装しない方針のため、
      // 広告のパーソナライズを行わない＝プライバシー申告で「トラッキングなし」で通せる。
      await AdMob.prepareRewardVideoAd({ adId: currentIds().rewarded, isTesting: USE_TEST_ADS, npa: true })
      AdMetrics.track('loaded', { format: 'rewarded', provider: 'admob' })
      await AdMob.showRewardVideoAd()
      await handle.remove()
      AdMetrics.track('shown', { format: 'rewarded', provider: 'admob' })
      Analytics.track('ad_shown', { type: 'rewarded', earned })
      AdMetrics.track(earned ? 'completed' : 'dismissedEarly', { format: 'rewarded', provider: 'admob' })
      return earned ? 'completed' : 'dismissedEarly'
    } catch (e) {
      // 在庫なし(no fill)・未承認・オフライン等で広告そのものを出せなかった
      AdMetrics.track('loadFailed', { format: 'rewarded', provider: 'admob' })
      console.warn('[AdMobProvider] rewarded failed', e)
      return 'unavailable'
    }
  },

  async showInterstitial(): Promise<AdOutcome> {
    if (!isNative()) return 'unavailable'
    AdMetrics.track('requested', { format: 'interstitial', provider: 'admob' })
    try {
      await ensureInit()
      await AdMob.prepareInterstitial({ adId: currentIds().interstitial, isTesting: USE_TEST_ADS, npa: true })
      AdMetrics.track('loaded', { format: 'interstitial', provider: 'admob' })
      await AdMob.showInterstitial()
      AdMetrics.track('shown', { format: 'interstitial', provider: 'admob' })
      Analytics.track('ad_shown', { type: 'interstitial' })
      AdMetrics.track('completed', { format: 'interstitial', provider: 'admob' })
      return 'completed'
    } catch (e) {
      AdMetrics.track('loadFailed', { format: 'interstitial', provider: 'admob' })
      console.warn('[AdMobProvider] interstitial failed', e)
      return 'unavailable'
    }
  },
}
