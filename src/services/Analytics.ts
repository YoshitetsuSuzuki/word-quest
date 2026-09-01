// ============================================================================
// Analytics  端末内・プライバシー保護型の計測
//   - データは一切外部送信しない（localStorage のみ）。ゆえに追跡ではない。
//   - 目的は「開発者が自分の端末 / TestFlight で継続率とファネルを把握する」こと。
//     全ユーザーの集計値は App Store Connect / Play Console / AdMob の管理画面で見る。
//   - 将来バックエンドを足すなら、ここで貯めたイベントをそのまま送れる作りにしてある。
// ============================================================================

const KEY = 'wordquest.metrics.v1'
const MAX_EVENTS = 500 // リングバッファ上限（端末を圧迫しない）

export type MetricEvent = { t: number; e: string; p?: Record<string, number | string | boolean> }

type Store = {
  firstLaunch: number // 最初の起動時刻(ms)
  lastActive: number // 最後にアクティブだった時刻
  activeDays: string[] // アクティブだった日付(YYYY-MM-DD)の集合
  sessions: number // セッション数（起動回数）
  counters: Record<string, number> // ファネル用の累積カウンタ
  events: MetricEvent[] // 直近イベント（リングバッファ）
}

function todayStr(now: number): string {
  // 端末ローカル日付。new Date(now) はモジュールの制約を避けるため引数付きで使う。
  const d = new Date(now)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Store
  } catch {
    // 壊れていたら作り直す
  }
  return { firstLaunch: 0, lastActive: 0, activeDays: [], sessions: 0, counters: {}, events: [] }
}

function save(s: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 保存失敗はアプリ動作に影響させない
  }
}

let started = false

export const Analytics = {
  /** アプリ起動時に1回呼ぶ。セッション数・初回起動・アクティブ日を記録する。 */
  startSession(now = Date.now()): void {
    if (started) return
    started = true
    const s = load()
    if (!s.firstLaunch) s.firstLaunch = now
    s.lastActive = now
    s.sessions += 1
    const today = todayStr(now)
    if (!s.activeDays.includes(today)) s.activeDays.push(today)
    if (s.activeDays.length > 400) s.activeDays = s.activeDays.slice(-400)
    save(s)
    this.track('session_start')
  },

  /** 任意イベントを記録。p にはプリミティブのみ（個人情報は入れない）。 */
  track(e: string, p?: Record<string, number | string | boolean>, now = Date.now()): void {
    const s = load()
    s.lastActive = now
    s.counters[e] = (s.counters[e] ?? 0) + 1
    s.events.push({ t: now, e, p })
    if (s.events.length > MAX_EVENTS) s.events = s.events.slice(-MAX_EVENTS)
    save(s)
  },

  /** 生データを取得（デバッグ表示用）。 */
  raw(): Store {
    return load()
  },

  /**
   * 集計サマリ（継続率・ファネル）を計算して返す。
   * D1: 初回起動の翌日にアクティブだったか。D7: 初回から7日目までにアクティブ日が複数あるか。
   */
  summary(now = Date.now()): {
    firstLaunch: string
    daysSinceInstall: number
    activeDays: number
    sessions: number
    d1Retained: boolean
    returned: boolean
    counters: Record<string, number>
    quizCompletionRate: number
    adToPurchaseRate: number
  } {
    const s = load()
    const first = s.firstLaunch || now
    const dayMs = 24 * 60 * 60 * 1000
    const daysSinceInstall = Math.floor((now - first) / dayMs)
    const firstDay = todayStr(first)
    const nextDay = todayStr(first + dayMs)
    const d1Retained = s.activeDays.includes(nextDay)
    const returned = s.activeDays.filter((d) => d !== firstDay).length > 0
    const qs = s.counters['quiz_start'] ?? 0
    const qc = s.counters['quiz_complete'] ?? 0
    const ad = s.counters['ad_shown'] ?? 0
    const buy = s.counters['purchase_success'] ?? 0
    return {
      firstLaunch: firstDay,
      daysSinceInstall,
      activeDays: s.activeDays.length,
      sessions: s.sessions,
      d1Retained,
      returned,
      counters: s.counters,
      quizCompletionRate: qs ? Math.round((qc / qs) * 100) : 0,
      adToPurchaseRate: ad ? Math.round((buy / ad) * 1000) / 10 : 0,
    }
  },

  /** 計測データを消去（デバッグ用）。 */
  reset(): void {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // 無視
    }
    started = false
  },
}
