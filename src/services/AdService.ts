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

/**
 * インタースティシャルを出す頻度（その場所を N 回終えるごとに1回）。
 * 場所ごとに独立カウント。0 にするとその場所では出さない。
 * 学習アプリは「また明日開く」ことが収益の源泉なので、出しすぎないこと。
 */
export const INTERSTITIAL_EVERY = {
  /** クイズ(通常/スピード/リスニング/表現/復習)の結果→ホーム。主要導線なので控えめに */
  quiz: 5,
  /** クイズ結果→もう1回。連続プレイの勢いを削がないよう更に控えめ */
  quizAgain: 10,
  /** ペア合わせの結果→ホーム / もう一回 */
  match: 10,
  /** バトルの結果→ホーム */
  battle: 10,
  /** レイドで実際に攻撃した後の離脱 */
  raid: 10,
  /**
   * まなびで一定数の単語をチェックした人が画面を離れるとき。
   * 発火自体を STUDY_AD_AFTER 件のチェックで絞っているため、ここは 1(=離脱毎) でよい。
   */
  study: 1,
} as const

export type InterstitialPlace = keyof typeof INTERSTITIAL_EVERY

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

  /**
   * セッション終了地点から呼ぶ。場所ごとに独立カウントし、N回に1回だけ全画面広告を出す。
   * 表示可否(広告ON・プレミアム未購入)の判定は呼び出し側（useInterstitial）で行う。
   */
  async maybeShowInterstitial(place: InterstitialPlace): Promise<void> {
    if (!isNative()) return
    const everyN = INTERSTITIAL_EVERY[place]
    if (!everyN || everyN <= 0) return
    try {
      const key = `wordquest.adCount.${place}`
      const n = (Number(localStorage.getItem(key)) || 0) + 1
      localStorage.setItem(key, String(n))
      if (n % everyN !== 0) return
      await this.showInterstitial()
    } catch (e) {
      console.warn('[AdService] maybeShowInterstitial failed', e)
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
