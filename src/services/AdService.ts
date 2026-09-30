// ============================================================================
// AdService  広告の「唯一の窓口」。画面は AdMob も maio も LevelPlay も知らない。
//
//   画面 ──► AdService ──► AdProvider（AdMob / maio / LevelPlay / Noop）──► 各社SDK
//
//   - ネイティブ(iOS/Android)でのみ動作。Web(PWA)では全メソッドが安全に no-op。
//   - 失敗しても決してゲームを止めない（広告はベストエフォート）。
//   - 広告会社を替えるときに触るのは `provider()` の1か所と、プロバイダ1ファイルだけ。
//
// ⚠️ 広告会社固有のもの（ユニットID・テスト/本番切替・npa 等）はこのファイルに書かない。
//    すべて `ads/AdMobProvider.ts` のような各社のファイルに閉じ込める。
//
// 姉妹アプリ PawPlanet の `Ads/AdManager.swift` と同じ役割・同じ約束で揃えてある。
// ============================================================================
import { AdMobProvider } from './ads/AdMobProvider'
import { NoopAdProvider, type AdProvider } from './ads/types'

export { AdMetrics } from './ads/AdMetrics'
export type { AdFormat, AdOutcome, AdProvider } from './ads/types'

/**
 * いま使う広告会社。
 *
 * **広告会社を足すときに触る唯一の場所。**
 * maio / LevelPlay の SDK が入ったら、ここを差し替えるだけで全画面が切り替わる。
 * 使えない会社を指しても NoopAdProvider に落ちるので、広告なしで正常動作する。
 */
function provider(): AdProvider {
  const p = AdMobProvider
  return p.isAvailable() ? p : NoopAdProvider
}

/**
 * インタースティシャルを出す頻度（その場所を N 回終えるごとに1回）。
 * 場所ごとに独立カウント。0 にするとその場所では出さない。
 * 学習アプリは「また明日開く」ことが収益の源泉なので、出しすぎないこと。
 *
 * これは広告会社に依らない**こちらの方針**なので、AdService 側に置く。
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

export const AdService = {
  /** 広告が動作しうる環境か。UIの広告導線の表示判定に使う */
  isSupported(): boolean {
    return provider().isAvailable()
  },

  /** 起動時に一度呼ぶ（native以外・失敗時は静かに無視） */
  async init(): Promise<void> {
    await provider().init()
  },

  /** 直前の showRewarded が「広告を出せずに」失敗したか(途中閉じと区別するため) */
  rewardedLoadFailed: false,

  /**
   * リワード動画を表示し、最後まで見て報酬を得たら true を返す。
   * ネイティブ以外・ロード失敗・途中閉じは false。
   */
  async showRewarded(): Promise<boolean> {
    // 旧実装と同じ順序で初期化する（Web では false のまま返す）。
    this.rewardedLoadFailed = false
    const p = provider()
    if (!p.isAvailable()) return false
    const outcome = await p.showRewarded()
    // 「出せなかった」だけを区別する。途中で閉じた場合は失敗扱いにしない。
    this.rewardedLoadFailed = outcome === 'unavailable'
    return outcome === 'completed'
  },

  /**
   * セッション終了地点から呼ぶ。場所ごとに独立カウントし、N回に1回だけ全画面広告を出す。
   * 表示可否(広告ON・プレミアム未購入)の判定は呼び出し側（useInterstitial）で行う。
   */
  async maybeShowInterstitial(place: InterstitialPlace): Promise<void> {
    if (!provider().isAvailable()) return
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
    await provider().showInterstitial()
  },
}
