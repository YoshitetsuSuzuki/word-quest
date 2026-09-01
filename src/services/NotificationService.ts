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

/** 毎日のリマインド通知ID（固定。再スケジュール時に上書きするため） */
const DAILY_ID = 1001
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
}
