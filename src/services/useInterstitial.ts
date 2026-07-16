import { useGame } from '../state/GameContext'
import { featureFlags } from '../config/featureFlags'
import { AdService, type InterstitialPlace } from './AdService'

/**
 * セッション終了地点で全画面広告を出すためのフック。
 * 「広告ON」かつ「プレミアム未購入」かつ「ネイティブ」のときだけ、
 * 場所ごとの頻度(INTERSTITIAL_EVERY)に従って数回に1回表示する。
 *
 *   const showInterstitial = useInterstitial()
 *   await showInterstitial('match')  // 表示しない場合も即座に解決する
 */
export function useInterstitial() {
  const { user } = useGame()
  return async (place: InterstitialPlace): Promise<void> => {
    if (!featureFlags.adsEnabled || user.adsRemoved) return
    await AdService.maybeShowInterstitial(place)
  }
}
