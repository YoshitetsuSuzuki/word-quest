import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { todayStr } from '../state/dateUtils'
import {
  LEAGUES,
  MAX_TIER,
  PROMOTE_ZONE,
  RELEGATE_ZONE,
  standings,
  myRank,
  daysLeftInWeek,
} from '../modules/league/leagueLogic'

/** 週次リーグ：同ランク帯で1週間ポイントを競う。上位は昇格・下位は降格。 */
export function LeagueScreen() {
  const { user } = useGame()
  const { navigate } = useNav()
  const league = LEAGUES[user.leagueTier] ?? LEAGUES[0]
  const list = standings(user)
  const rank = myRank(list)
  const daysLeft = daysLeftInWeek(todayStr())
  const size = list.length

  return (
    <div className="space-y-4 animate-slideUp">
      <button onClick={() => navigate('home')} className="text-white/50 text-sm">← ホーム</button>

      {/* ヘッダー */}
      <div className="card p-5 text-center">
        <div className="text-5xl">{league.emoji}</div>
        <div className="text-xl font-black mt-1">{league.name}リーグ</div>
        <div className="text-xs text-white/50 mt-1">
          {user.leagueTier < MAX_TIER ? `上位${PROMOTE_ZONE}人が昇格` : '最上位リーグ'}
          ・残り{daysLeft}日
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-sm">
          <span className="text-white/50">あなたは</span>
          <span className="font-black text-2xl text-gold">{rank}位</span>
          <span className="text-white/50">/ {size}人</span>
        </div>
      </div>

      {/* 昇格ライン説明 */}
      <div className="flex justify-between text-[11px] text-white/40 px-1">
        <span className="text-success font-bold">▲ 昇格圏 (1〜{PROMOTE_ZONE}位)</span>
        {user.leagueTier > 0 && <span className="text-danger font-bold">降格圏 ({size - RELEGATE_ZONE + 1}〜{size}位) ▼</span>}
      </div>

      {/* 順位表 */}
      <div className="space-y-1.5">
        {list.map((s, i) => {
          const pos = i + 1
          const inPromote = pos <= PROMOTE_ZONE && user.leagueTier < MAX_TIER
          const inRelegate = pos > size - RELEGATE_ZONE && user.leagueTier > 0
          return (
            <div
              key={s.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                s.isMe
                  ? 'bg-accent/15 border-accent'
                  : inPromote
                    ? 'bg-success/10 border-success/30'
                    : inRelegate
                      ? 'bg-danger/10 border-danger/25'
                      : 'bg-panel2 border-white/5'
              }`}
            >
              <span className={`w-6 text-center font-black ${pos <= 3 ? 'text-gold' : 'text-white/50'}`}>{pos}</span>
              <span className={`flex-1 font-bold truncate ${s.isMe ? 'text-white' : 'text-white/80'}`}>
                {s.isMe ? 'あなた' : s.name}
              </span>
              <span className="font-black tabular-nums">{s.points.toLocaleString()}</span>
              <span className="text-[10px] text-white/30">pt</span>
            </div>
          )
        })}
      </div>

      <button className="btn-primary w-full py-3.5" onClick={() => navigate('home')}>
        クイズでポイントを稼ぐ →
      </button>
      <p className="text-center text-[11px] text-white/35">正解で得たXPがそのまま今週のリーグポイントになります。</p>
    </div>
  )
}
