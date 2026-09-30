// ============================================================================
// 広告の計測。いまは**端末内に数えるだけ**で、どこへも送らない。
// PawPlanet の `Ads/AdMetrics.swift` と同じ6指標・同じ考え方で揃えてある。
//
// 置いておく理由は、将来 maio と LevelPlay を実データで比較するため。
// プロバイダ名の次元を持っているので「admob のロード成功率」「maio の完了率」を
// 別々に数えられる。呼び出し側を触らずに送信先だけ足せる形にしてある。
//
// 記録するのは回数だけで、個人を特定しうる値は一切持たない
// （プライバシー申告を「収集なし」のまま維持するための前提でもある）。
//
// ここから作れる指標:
//   ロード成功率   = loaded / requested
//   リワード完了率 = completed / shown
//   表示回数       = shown（プロバイダ別・形式別）
//
// ⚠️ 取れないもの: クリック数と収益額。どちらも各社SDKのコールバック仕様が違い、
//    収益額は各社ダッシュボードにしか存在しない。ネットワーク非依存には数えられない。
// ============================================================================

export type AdMetricEvent =
  | 'requested'       // 広告を出そうとした
  | 'loaded'          // 在庫が取れた
  | 'loadFailed'      // 在庫なし・オフライン・未承認・タイムアウト
  | 'shown'           // 実際に表示された
  | 'completed'       // 最後まで見た（＝リワード獲得）
  | 'dismissedEarly'  // 途中で閉じられた

const PREFIX = 'wordquest.ad.metric.'

function bump(key: string): void {
  try {
    const n = Number(localStorage.getItem(key)) || 0
    localStorage.setItem(key, String(n + 1))
  } catch {
    /* 計測のためにアプリを止めない */
  }
}

export const AdMetrics = {
  /**
   * 1件記録する。全体・形式別・プロバイダ別の3通りで数える。
   * 失敗しても何もしない。
   */
  track(
    event: AdMetricEvent,
    opts: { format?: string; provider?: string } = {},
  ): void {
    bump(`${PREFIX}${event}.all`)
    if (opts.format) bump(`${PREFIX}${event}.fmt.${opts.format}`)
    if (opts.provider) bump(`${PREFIX}${event}.pv.${opts.provider}`)
  },

  /** いまの集計。デバッグ表示や将来の送信処理はここを読む。 */
  snapshot(): Record<string, number> {
    const out: Record<string, number> = {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (!k || !k.startsWith(PREFIX)) continue
        out[k.slice(PREFIX.length)] = Number(localStorage.getItem(k)) || 0
      }
    } catch {
      /* 無視 */
    }
    return out
  },

  /** 人が読む形に整えたもの（デバッグ表示用）。 */
  summaryLines(): string[] {
    const s = AdMetrics.snapshot()
    const n = (k: string) => s[k] ?? 0
    const rate = (a: number, b: number) =>
      b > 0 ? `${Math.round((a / b) * 100)}%` : '—'
    const requested = n('requested.all')
    const loaded = n('loaded.all')
    const shown = n('shown.all')
    const completed = n('completed.all')
    return [
      `リクエスト ${requested} / ロード成功 ${loaded}（${rate(loaded, requested)}）`,
      `表示 ${shown} / 完了 ${completed}（完了率 ${rate(completed, shown)}）`,
      `ロード失敗 ${n('loadFailed.all')} / 途中閉じ ${n('dismissedEarly.all')}`,
    ]
  },

  reset(): void {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(PREFIX)) keys.push(k)
      }
      for (const k of keys) localStorage.removeItem(k)
    } catch {
      /* 無視 */
    }
  },
}
