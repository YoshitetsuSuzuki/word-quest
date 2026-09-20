// ============================================================================
// NotificationService  ローカル通知（毎日の学習リマインド / ストリーク維持）
//   - ネイティブ(iOS/Android)でのみ動作。Web(PWA)では全メソッドが安全に no-op。
//   - サーバー不要・完全無料（端末内のローカル通知）。
//   - 失敗しても決してアプリを止めない（通知はベストエフォート）。
//   習慣化＝継続率＝収益の源泉。「今日を逃すと連続記録が途切れる」ことを
//   毎晩そっと知らせ、翌日の起動につなげる。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { COMEBACK_ID_BASE, COMEBACK_STEPS } from '../modules/comeback/comebackPlan'

/** 復帰通知の段数（キャンセル時に全IDを舐めるのに使う） */
const COMEBACK_COUNT = COMEBACK_STEPS.length

/** 毎日のリマインド通知ID（固定。再スケジュール時に上書きするため） */
const DAILY_ID = 1001
/** ストリーク危機通知ID（今日まだ学習していない夜にだけ鳴る単発通知） */
const STREAK_GUARD_ID = 1002
/** 週替わりリーグ結果通知ID（毎週月曜朝の繰り返し） */
const LEAGUE_ID = 1003
/** 既定のリマインド時刻（24h表記） */
const DEFAULT_HOUR = 20
const DEFAULT_MINUTE = 0

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const NotificationService = {
  /** 通知が使える環境か（ネイティブのみ） */
  isSupported(): boolean {
    return isNative()
  },

  /**
   * 通知の許可を求める。ユーザーが許可すれば true。
   * iOS は初回にOSのダイアログが出る。拒否時は false（以降 no-op）。
   */
  async requestPermission(): Promise<boolean> {
    if (!isNative()) return false
    try {
      const res = await LocalNotifications.requestPermissions()
      return res.display === 'granted'
    } catch {
      return false
    }
  },

  /** 現在の許可状態（ダイアログを出さずに確認） */
  async hasPermission(): Promise<boolean> {
    if (!isNative()) return false
    try {
      const res = await LocalNotifications.checkPermissions()
      return res.display === 'granted'
    } catch {
      return false
    }
  },

  /**
   * 毎日の学習リマインドを設定する。
   * @param title 通知タイトル
   * @param body  通知本文（ストリーク日数などを差し込んだ文言）
   * @param hour  時刻（時）。省略時は 20 時
   * @param minute 時刻（分）。省略時は 0 分
   */
  async scheduleDaily(title: string, body: string, hour = DEFAULT_HOUR, minute = DEFAULT_MINUTE): Promise<void> {
    if (!isNative()) return
    try {
      // 既存の同IDを消してから貼り直す（文言・時刻の変更を反映）
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] }).catch(() => {})
      await LocalNotifications.schedule({
        notifications: [
          {
            id: DAILY_ID,
            title,
            body,
            // 毎日 hour:minute に繰り返し（on を指定すると repeats: true で日次リピート）
            schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
          },
        ],
      })
    } catch {
      // 通知失敗はアプリ動作に影響させない
    }
  },

  /** リマインドを解除する（設定でOFFにした場合など） */
  async cancelDaily(): Promise<void> {
    if (!isNative()) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: DAILY_ID }] })
    } catch {
      // 無視
    }
  },

  /**
   * ストリーク危機通知を「今夜21:30」に単発でセットする。
   * 「今日まだ学習していない」ときだけ呼ぶ。学習したら cancelStreakGuard で解除。
   * 21:30を過ぎていたら何もしない（今日のチャンスは逃した扱い）。
   */
  async scheduleStreakGuard(title: string, body: string): Promise<void> {
    if (!isNative()) return
    try {
      const at = new Date()
      at.setHours(21, 30, 0, 0)
      if (at.getTime() <= Date.now()) return
      await LocalNotifications.cancel({ notifications: [{ id: STREAK_GUARD_ID }] }).catch(() => {})
      await LocalNotifications.schedule({
        notifications: [
          { id: STREAK_GUARD_ID, title, body, schedule: { at, allowWhileIdle: true } },
        ],
      })
    } catch {
      // ベストエフォート
    }
  },

  /** ストリーク危機通知を解除する（今日の学習を確認できたとき） */
  async cancelStreakGuard(): Promise<void> {
    if (!isNative()) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: STREAK_GUARD_ID }] })
    } catch {
      // 無視
    }
  },

  /**
   * 週替わりリーグの結果発表通知を毎週月曜8:00にセットする（繰り返し）。
   * リーグは週替わりで月曜に締まるため、結果を見に戻る動機を作る。
   */
  async scheduleLeagueResult(title: string, body: string): Promise<void> {
    if (!isNative()) return
    try {
      await LocalNotifications.cancel({ notifications: [{ id: LEAGUE_ID }] }).catch(() => {})
      await LocalNotifications.schedule({
        notifications: [
          {
            id: LEAGUE_ID,
            title,
            body,
            schedule: { on: { weekday: 2, hour: 8, minute: 0 }, repeats: true, allowWhileIdle: true },
          },
        ],
      })
    } catch {
      // ベストエフォート
    }
  },

  /**
   * 復帰通知（相棒が呼ぶ体の文面）をまとめてセットする。
   * 学習するたびに貼り直す設計。次に学習した時点で全部消えて、新しい最終学習日を
   * 基準に引き直されるので、継続している人には一通も届かない。
   */
  async scheduleComeback(items: { id: number; at: Date; title: string; body: string }[]): Promise<void> {
    if (!isNative()) return
    try {
      await this.cancelComeback()
      if (!items.length) return
      await LocalNotifications.schedule({
        notifications: items.map((x) => ({
          id: x.id,
          title: x.title,
          body: x.body,
          schedule: { at: x.at, allowWhileIdle: true },
        })),
      })
    } catch {
      // ベストエフォート
    }
  },

  /** 復帰通知を全部消す（学習を検知したとき・設定でOFFにしたとき） */
  async cancelComeback(): Promise<void> {
    if (!isNative()) return
    try {
      const ids = Array.from({ length: COMEBACK_COUNT }, (_, i) => ({ id: COMEBACK_ID_BASE + i }))
      await LocalNotifications.cancel({ notifications: ids })
    } catch {
      // 無視
    }
  },
}
