// ============================================================================
// ReviewPromptService  App Store レビュー依頼の「節度」係
//   - 実際のダイアログ表示は OS が最終判断する(年3回上限などApple側で制御)が、
//     アプリ側でも「機嫌が良い瞬間だけ・低頻度」に絞ることで星の質を上げる。
//   - 呼び出し条件(すべて満たすときだけOSに依頼):
//       1. 累計50問以上正解している(アプリの価値を体感済み)
//       2. 直前のセッション正答率が80%以上(気分が良い)
//       3. 前回依頼から60日以上 かつ 同一バージョンで未依頼
//   - iOSネイティブのみ。Webでは何もしない。
// ============================================================================
import { GameCenterService } from './GameCenterService'
import { Analytics } from './Analytics'

const LAST_ASK_KEY = 'wordquest.review.lastAskAt'
const LAST_VER_KEY = 'wordquest.review.lastAskVersion'
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000 // 60日

function appVersion(): string {
  return (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0'
}

export const ReviewPromptService = {
  /**
   * 節目でレビュー依頼を試みる。条件を満たさなければ何もしない。
   * @param sessionCorrect 直前セッションの正解数
   * @param sessionTotal   直前セッションの問題数
   * @param totalCorrect   累計正解数
   */
  maybeAsk(sessionCorrect: number, sessionTotal: number, totalCorrect: number): void {
    if (!GameCenterService.isSupported()) return
    if (totalCorrect < 50) return
    if (sessionTotal < 5 || sessionCorrect / sessionTotal < 0.8) return
    try {
      const last = Number(localStorage.getItem(LAST_ASK_KEY) ?? 0)
      if (Date.now() - last < COOLDOWN_MS) return
      if (localStorage.getItem(LAST_VER_KEY) === appVersion()) return
      localStorage.setItem(LAST_ASK_KEY, String(Date.now()))
      localStorage.setItem(LAST_VER_KEY, appVersion())
    } catch {
      return
    }
    Analytics.track('review_prompt', {})
    // 結果表示の直後に出すと体験を邪魔するため、余韻(1.5秒)を置いてから依頼する
    window.setTimeout(() => void GameCenterService.requestReview(), 1500)
  },
}
