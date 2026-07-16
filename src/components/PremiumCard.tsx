import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { featureFlags } from '../config/featureFlags'
import { PurchaseService } from '../services/PurchaseService'

/**
 * 「広告除去＋プレミアム」買い切りカード。
 * - featureFlags.purchaseEnabled が false なら非表示。
 * - ネイティブ＋APIキー設定時のみ実購入が可能。Webでは案内のみ表示。
 * - 起動時にストアの購入状態と同期し、購入済みなら adsRemoved を反映。
 */
export function PremiumCard() {
  const { user, setAdsRemoved } = useGame()
  const { t } = useNav()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const available = PurchaseService.isAvailable()

  useEffect(() => {
    if (!available) return
    let alive = true
    void PurchaseService.hasPremium().then((has) => {
      if (alive && has) setAdsRemoved(true)
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!featureFlags.purchaseEnabled) return null

  const buy = async () => {
    setBusy(true)
    setMsg(null)
    const r = await PurchaseService.purchaseRemoveAds()
    if (r.ok) setAdsRemoved(true)
    setBusy(false)
  }

  const restore = async () => {
    setBusy(true)
    setMsg(null)
    const ok = await PurchaseService.restore()
    if (ok) setAdsRemoved(true)
    else setMsg(t('shop.restoreFail'))
    setBusy(false)
  }

  return (
    <div className="card p-3 flex items-center gap-3 ring-1 ring-white/15">
      <div className="w-11 h-11 shrink-0 rounded-lg bg-panel2 grid place-items-center text-lg">✨</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{t('shop.premium')}</div>
        <div className="text-[11px] text-white/45">{t('shop.premiumDesc')}</div>
        {user.adsRemoved ? (
          <div className="text-[11px] text-success font-bold mt-0.5">{t('shop.premiumActive')}</div>
        ) : available ? (
          <button className="text-[11px] text-white/50 underline mt-0.5" disabled={busy} onClick={restore}>
            {t('shop.restore')}
          </button>
        ) : (
          <div className="text-[11px] text-white/40 mt-0.5">{t('shop.premiumAppOnly')}</div>
        )}
        {msg && <div className="text-[11px] text-white/60 mt-0.5">{msg}</div>}
      </div>
      <div className="shrink-0">
        {user.adsRemoved ? (
          <span className="text-xs font-bold text-success px-2">✓</span>
        ) : (
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={!available || busy} onClick={buy}>
            {busy ? '…' : t('shop.buy')}
          </button>
        )}
      </div>
    </div>
  )
}
