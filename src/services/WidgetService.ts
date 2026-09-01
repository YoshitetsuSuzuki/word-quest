// ============================================================================
// WidgetService  ホーム画面ウィジェットへのデータ橋渡し
//   - App Group を共有した @capacitor/preferences 経由で、連続記録・今日の進捗・
//     今日の1語 を書き出す。ネイティブの WidgetKit 拡張がこれを読んで表示する。
//   - App Group が未設定でも、Web でも、安全に no-op（失敗を握りつぶす）。
//   - 個人情報は書き出さない（学習の進捗と1語のみ）。
//
//   ▼ ネイティブ側の設定（Xcodeで一度だけ・下記 docs/ios-widget-setup.md 参照）
//     1. Widget Extension ターゲットを追加
//     2. App と Widget の両方に App Group `group.com.infinitygames.wordquest` を付与
//     3. Info の設定で Preferences の group を合わせる
// ============================================================================
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

/** App と Widget で共有する App Group 名。Xcode の Capability と一致させること。 */
export const WIDGET_APP_GROUP = 'group.com.infinitygames.wordquest'
/** ウィジェットが読むキー（Swift 側の UserDefaults キーと一致させる） */
const WIDGET_KEY = 'widgetData'

export type WidgetPayload = {
  streak: number // 連続学習日数
  todayAnswered: number // 今日解いた問題数
  dailyGoal: number // 今日の目標問数
  word: string // 今日の1語（見出し）
  meaning: string // その意味
  updatedAt: number // 更新時刻(ms)
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

let configured = false
async function ensureGroup(): Promise<void> {
  if (configured || !isNative()) return
  try {
    // iOS: App Group の UserDefaults を使う。Widget から同じ suite を読める。
    await Preferences.configure({ group: WIDGET_APP_GROUP })
    configured = true
  } catch {
    // 未設定でも通常の保存にフォールバックする（ウィジェットは静的表示のまま）
  }
}

export const WidgetService = {
  /** ウィジェット表示データを書き出す（ネイティブのみ実効・失敗は無視）。 */
  async update(data: WidgetPayload): Promise<void> {
    if (!isNative()) return
    try {
      await ensureGroup()
      await Preferences.set({ key: WIDGET_KEY, value: JSON.stringify(data) })
    } catch {
      // ウィジェット更新失敗はアプリ動作に影響させない
    }
  },
}
