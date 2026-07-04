import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { buildRanking, myRank } from '../modules/ranking/rankingLogic'
import type { RankingKind } from '../types'

const tabs: { kind: RankingKind; label: string; unit: string }[] = [
  { kind: 'coin', label: 'コイン', unit: '🪙' },
  { kind: 'elo', label: 'レート', unit: 'pt' },
  { kind: 'todayCoin', label: '今日', unit: '🪙' },
  { kind: 'totalCorrect', label: '正解数', unit: '問' },
]

export function RankingScreen() {
  const { user } = useGame()
  const [kind, setKind] = useState<RankingKind>('coin')
  const entries = buildRanking(user, kind)
  const rank = myRank(entries)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">🏆 ランキング</h2>

      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.kind}
            onClick={() => setKind(t.kind)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
              kind === t.kind ? 'bg-accent text-white' : 'bg-panel2 text-white/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card p-3 flex items-center justify-between">
        <span className="text-sm text-white/60">あなたの順位</span>
        <span className="text-lg font-black text-accent2">{rank} 位</span>
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
              {e.name} {e.isMe && <span className="text-[10px] text-accent2">(あなた)</span>}
            </div>
            <div className="font-black tabular-nums">
              {e.value.toLocaleString()}
              <span className="text-xs text-white/40 ml-1">{tabs.find((t) => t.kind === kind)?.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
