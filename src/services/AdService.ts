// ============================================================================
// AdService  AdMob 広告（リワード / インタースティシャル）のラッパー
//   - ネイティブ(iOS/Android)でのみ動作。Web(PWA)では全メソッドが安全に no-op。
//   - 失敗しても決してゲームを止めない（広告はベストエフォート）。
//   - 現在は Google 公式「テスト広告ID」を使用。本番は下記 PROD_IDS を記入し
//     USE_TEST_ADS = false にするだけで切替わる。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import {
  AdMob,
  RewardAdPluginEvents,
  type AdMobRewardItem,
} from '@capacitor-community/admob'

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
const USE_TEST_ADS = true

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

export const AdService = {
  /** 広告が動作しうる環境か（ネイティブ）。UIの広告導線の表示判定に使う */
  isSupported(): boolean {
    return isNative()
  },

  /** 起動時に一度呼ぶ（native以外・失敗時は静かに無視） */
  async init(): Promise<void> {
    if (!isNative()) return
    try {
      await ensureInit()
    } catch (e) {
      console.warn('[AdService] init failed', e)
    }
  },

  /**
   * リワード動画を表示し、最後まで見て報酬を得たら true を返す。
   * ネイティブ以外・ロード失敗・途中閉じは false。
   */
  async showRewarded(): Promise<boolean> {
    if (!isNative()) return false
    try {
      await ensureInit()
      let earned = false
      const handle = await AdMob.addListener(
        RewardAdPluginEvents.Rewarded,
        (_item: AdMobRewardItem) => {
          earned = true
        },
      )
      await AdMob.prepareRewardVideoAd({ adId: currentIds().rewarded, isTesting: USE_TEST_ADS })
      await AdMob.showRewardVideoAd()
      await handle.remove()
      return earned
    } catch (e) {
      console.warn('[AdService] rewarded failed', e)
      return false
    }
  },

  /** インタースティシャル（全画面）広告を表示。native以外・失敗時は静かに無視 */
  async showInterstitial(): Promise<void> {
    if (!isNative()) return
    try {
      await ensureInit()
      await AdMob.prepareInterstitial({ adId: currentIds().interstitial, isTesting: USE_TEST_ADS })
      await AdMob.showInterstitial()
    } catch (e) {
      console.warn('[AdService] interstitial failed', e)
    }
  },
}
