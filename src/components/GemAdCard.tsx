import { useState } from 'react'
import { useGame, GEM_AD_DAILY_MAX } from '../state/GameContext'
import { useNav } from '../state/nav'
import { featureFlags } from '../config/featureFlags'
import { AdService } from '../services/AdService'

/**
 * 動画広告で💎ジェムを1個もらうカード（1日 GEM_AD_DAILY_MAX 回まで）。
 * ジェムは伝説の相棒に使う希少通貨＝「足りていないもの」なので、
 * 余剰通貨のコインより報酬としての価値が高い。
 * 広告OFF・プレミアム購入済み・Webでは非表示。
 */
export function GemAdCard() {
  const { user, grantGemByAd, gemAdRemaining } = useGame()
  const { t } = useNav()
  const [busy, setBusy] = useState(false)

  const available = featureFlags.adsEnabled && !user.adsRemoved && AdService.isSupported()
  if (!available) return null

  const remaining = gemAdRemaining()

  const watch = async () => {
    setBusy(true)
    const earned = await AdService.showRewarded()
    if (earned) grantGemByAd()
    setBusy(false)
  }

  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="w-11 h-11 shrink-0 rounded-lg bg-panel2 grid place-items-center text-lg">💎</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm">{t('ad.getGem')}</div>
        <div className="text-[11px] text-white/45">{t('ad.getGemDesc')}</div>
        <div className="text-[11px] text-accent2 font-bold mt-0.5">
          {remaining > 0
            ? `${t('shop.owned')} 💎${user.gems} ・ ${remaining} / ${GEM_AD_DAILY_MAX}`
            : t('ad.getGemDone')}
        </div>
      </div>
      <button className="btn-primary px-3 py-1.5 text-xs shrink-0" disabled={busy || remaining <= 0} onClick={watch}>
        {busy ? '…' : '📺'}
      </button>
    </div>
  )
}
