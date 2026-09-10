import { useEffect, useState } from 'react'
import { useNav } from '../state/nav'
import { UpdateService, STORE_URL } from '../services/UpdateService'

/**
 * 新バージョンのお知らせバナー（ホーム上部）。
 * タップでApp Storeを開く。✕でそのバージョンについては非表示。
 */
export function UpdateBanner() {
  const { t } = useNav()
  const [latest, setLatest] = useState<string | null>(null)

  useEffect(() => {
    void UpdateService.checkOnce().then(() => setLatest(UpdateService.availableUpdate()))
  }, [])

  if (!latest) return null

  return (
    <div className="card p-3 flex items-center gap-3 border border-accent2/40 bg-gradient-to-r from-accent/15 to-accent2/15">
      <div className="text-2xl">⬆️</div>
      <button
        className="flex-1 min-w-0 text-left"
        onClick={() => window.open(STORE_URL, '_blank')}
      >
        <div className="font-bold text-sm">{t('update.available')}（v{latest}）</div>
        <div className="text-[11px] text-accent2">{t('update.cta')} ▶</div>
      </button>
      <button
        onClick={() => { UpdateService.dismiss(latest); setLatest(null) }}
        aria-label="✕"
        className="shrink-0 w-7 h-7 grid place-items-center rounded-lg bg-white/10 text-white/50 text-sm"
      >
        ✕
      </button>
    </div>
  )
}
