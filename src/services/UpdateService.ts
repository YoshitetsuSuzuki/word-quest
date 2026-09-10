// ============================================================================
// UpdateService  アップデートのお知らせ（サーバー不要・コスト0）
//   - AppleのiTunes Lookup APIでApp Storeの最新バージョンを1日1回だけ照会し、
//     実行中バージョンより新しければホームにバナーを出す材料を返す。
//   - ネイティブのみ(CapacitorHttpでCORS回避)。Web版はストア誘導が不要なので no-op。
//   - 失敗しても静かに何もしない（お知らせはベストエフォート）。
// ============================================================================
import { Capacitor, CapacitorHttp } from '@capacitor/core'

const APP_ID = '6792366503'
export const STORE_URL = `https://apps.apple.com/jp/app/id${APP_ID}`
const CHECKED_KEY = 'wordquest.update.checkedAt'
const LATEST_KEY = 'wordquest.update.latest'
const DISMISS_KEY = 'wordquest.update.dismissed'
const DAY_MS = 24 * 60 * 60 * 1000

function current(): string {
  return (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.0.0'
}

/** "1.2.0" 形式を数値比較。a > b なら正 */
function cmp(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export const UpdateService = {
  /** 起動時に1日1回だけストアの最新バージョンを取得してキャッシュする */
  async checkOnce(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return
    try {
      const last = Number(localStorage.getItem(CHECKED_KEY) ?? 0)
      if (Date.now() - last < DAY_MS) return
      localStorage.setItem(CHECKED_KEY, String(Date.now()))
      const res = await CapacitorHttp.get({
        url: `https://itunes.apple.com/lookup?id=${APP_ID}&country=jp`,
        connectTimeout: 8000,
        readTimeout: 8000,
      })
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
      const v = data?.results?.[0]?.version
      if (typeof v === 'string' && v) localStorage.setItem(LATEST_KEY, v)
    } catch {
      // オフライン等。次の機会に任せる
    }
  },

  /** バナーに出すべき新バージョンがあれば返す（既読・同等以下・未取得は null） */
  availableUpdate(): string | null {
    try {
      const latest = localStorage.getItem(LATEST_KEY)
      if (!latest) return null
      if (cmp(latest, current()) <= 0) return null
      if (localStorage.getItem(DISMISS_KEY) === latest) return null
      return latest
    } catch {
      return null
    }
  },

  /** このバージョンのお知らせを閉じる（次のバージョンが出ればまた表示） */
  dismiss(latest: string): void {
    try {
      localStorage.setItem(DISMISS_KEY, latest)
    } catch {
      // 無視
    }
  },
}
