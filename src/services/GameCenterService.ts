// ============================================================================
// GameCenterService  Apple Game Center 連携（本物のランキング・実績）
//   - iOS ネイティブでのみ動作。Web/Android では安全に no-op。
//   - 自前の軽量 Capacitor プラグイン(ios/App/App/GameCenterPlugin.swift)を
//     registerPlugin で束ねる。第三者プラグインに依存しない（Capacitor 8準拠）。
//   - 4.3(a)対策: モックではなく本物の Game Center リーダーボード/実績を実装し、
//     "テンプレではない本物のプラットフォーム統合" を示す。
//
//   ▼ ネイティブ設定は docs/game-center-setup.md 参照
//     1. Xcode で App ターゲットに Game Center capability を追加
//     2. GameCenterPlugin.swift を App ターゲットに追加
//     3. App Store Connect でリーダーボード/実績を下記IDで作成
// ============================================================================
import { registerPlugin } from '@capacitor/core'
import { Capacitor } from '@capacitor/core'

// App Store Connect で作成するリーダーボードID（Swift 側と一致させる）
export const LEADERBOARD = {
  weekly: 'wordquest.weekly', // 週間ポイント
  lifetime: 'wordquest.lifetime', // 累計正解数
}
// App Store Connect で作成する実績ID（在庫は少数から。増やしてもよい）
export const GC_ACHIEVEMENT = {
  correct100: 'wordquest.ach.correct100',
  correct1000: 'wordquest.ach.correct1000',
  streak7: 'wordquest.ach.streak7',
  streak30: 'wordquest.ach.streak30',
}

/** ネイティブ Swift プラグインのインターフェース */
export interface GameCenterPlugin {
  isAvailable(): Promise<{ available: boolean }>
  signIn(): Promise<{ authenticated: boolean }>
  submitScore(options: { leaderboardId: string; score: number }): Promise<void>
  reportAchievement(options: { achievementId: string; percentComplete: number }): Promise<void>
  showLeaderboard(options: { leaderboardId?: string }): Promise<void>
  showAchievements(): Promise<void>
  requestReview(): Promise<void>
}

// Web 実装は全メソッド no-op（registerPlugin の web フォールバック）
const Native = registerPlugin<GameCenterPlugin>('GameCenter', {
  web: {
    isAvailable: async () => ({ available: false }),
    signIn: async () => ({ authenticated: false }),
    submitScore: async () => {},
    reportAchievement: async () => {},
    showLeaderboard: async () => {},
    showAchievements: async () => {},
    requestReview: async () => {},
  },
})

function isIOS(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
  } catch {
    return false
  }
}

let authed = false

export const GameCenterService = {
  /** 対応環境か（iOSネイティブのみ）。ボタン表示の可否に使う。 */
  isSupported(): boolean {
    return isIOS()
  },

  /** Game Center にサインイン（起動時に1回）。成功で以降のスコア送信が有効。 */
  async signIn(): Promise<boolean> {
    if (!isIOS()) return false
    try {
      const { available } = await Native.isAvailable()
      if (!available) return false
      const { authenticated } = await Native.signIn()
      authed = authenticated
      return authenticated
    } catch {
      return false
    }
  },

  /** スコアをリーダーボードへ送信（失敗は無視）。 */
  async submitScore(leaderboardId: string, score: number): Promise<void> {
    if (!isIOS() || !authed || !Number.isFinite(score)) return
    try {
      await Native.submitScore({ leaderboardId, score: Math.max(0, Math.round(score)) })
    } catch {
      // ベストエフォート
    }
  },

  /** 実績の達成度を報告（0-100）。 */
  async reportAchievement(achievementId: string, percentComplete: number): Promise<void> {
    if (!isIOS() || !authed) return
    try {
      await Native.reportAchievement({ achievementId, percentComplete: Math.min(100, Math.max(0, percentComplete)) })
    } catch {
      // ベストエフォート
    }
  },

  /** Game Center 標準のリーダーボードUIを開く。 */
  async showLeaderboard(leaderboardId?: string): Promise<void> {
    if (!isIOS()) return
    try {
      await Native.showLeaderboard({ leaderboardId })
    } catch {
      // 無視
    }
  },

  /** Game Center 標準の実績UIを開く。 */
  async showAchievements(): Promise<void> {
    if (!isIOS()) return
    try {
      await Native.showAchievements()
    } catch {
      // 無視
    }
  },

  /** App Store レビュー依頼ダイアログをOSに要求する（出すかはOS判断）。 */
  async requestReview(): Promise<void> {
    if (!isIOS()) return
    try {
      await Native.requestReview()
    } catch {
      // 無視
    }
  },
}
