import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { buildRanking, myRank } from '../modules/ranking/rankingLogic'
import type { RankingKind } from '../types'
import type { Strings } from '../i18n/types'

const tabs: { kind: RankingKind; labelKey: keyof Strings; unitKey?: keyof Strings; unit?: string }[] = [
  { kind: 'coin', labelKey: 'rank.coin', unit: '🪙' },
  { kind: 'elo', labelKey: 'rank.elo', unit: 'pt' },
  { kind: 'todayCoin', labelKey: 'rank.today', unit: '🪙' },
  { kind: 'totalCorrect', labelKey: 'rank.correct', unitKey: 'rank.unit' },
]

export function RankingScreen() {
  const { user } = useGame()
  const { t } = useNav()
  const [kind, setKind] = useState<RankingKind>('coin')
  const entries = buildRanking(user, kind)
  const rank = myRank(entries)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">{t('rank.title')}</h2>

      <div className="flex gap-1.5">
        {tabs.map((tb) => (
          <button
            key={tb.kind}
            onClick={() => setKind(tb.kind)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              kind === tb.kind ? 'bg-accent text-white' : 'bg-panel2 text-white/50'
            }`}
          >
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      <div className="card p-3 flex items-center justify-between">
        <span className="text-sm text-white/60">{t('rank.yourRank')}</span>
        <span className="text-lg font-black text-accent2">{rank} {t('rank.rankSuffix')}</span>
      </div>

      <div className="space-y-2">
        {entries.slice(0, 20).map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              e.isMe ? 'bg-accent/25 ring-1 ring-accent' : 'bg-panel'
            }`}
          >
            <div className={`w-7 text-center font-black ${i < 3 ? 'text-gold' : 'text-white/40'}`}>
              {i + 1}
            </div>
            <div className="flex-1 font-bold truncate">
              {e.name} {e.isMe && <span className="text-[10px] text-accent2">{t('rank.you')}</span>}
            </div>
            <div className="font-black tabular-nums">
              {e.value.toLocaleString()}
              <span className="text-xs text-white/40 ml-1">{(() => { const tb = tabs.find((x) => x.kind === kind); return tb?.unitKey ? t(tb.unitKey) : tb?.unit })()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
