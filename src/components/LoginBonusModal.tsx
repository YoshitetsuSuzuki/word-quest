import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { LOGIN_CYCLE } from '../state/loginLogic'

/** 起動時のログインボーナス表示(7日サイクルカレンダーつき) */
export function LoginBonusModal() {
  const { loginBonus } = useGame()
  const [closed, setClosed] = useState(false)
  if (!loginBonus || closed) return null

  const todayIdx = (loginBonus.streak - 1) % LOGIN_CYCLE.length

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/70 backdrop-blur-sm p-6">
      <div className="card p-6 text-center max-w-xs w-full animate-pop">
        <div className="text-5xl mb-2">🎁</div>
        <div className="text-xl font-black text-gold">ログインボーナス</div>
        <div className="mt-1 text-sm text-white/70">{loginBonus.streak}日連続ログイン中！</div>
        <div className="mt-4 flex items-center justify-center gap-2 text-2xl font-black">
          <span>🪙</span>
          <span className="text-gold">+{loginBonus.coin}</span>
        </div>

        {/* 7日サイクルカレンダー */}
        <div className="mt-4 grid grid-cols-7 gap-1">
          {LOGIN_CYCLE.map((coin, i) => {
            const isToday = i === todayIdx
            const isPast = i < todayIdx
            return (
              <div
                key={i}
                className={`rounded-lg py-1.5 text-[9px] font-bold border ${
                  isToday
                    ? 'bg-gold/20 border-gold text-gold ring-1 ring-gold'
                    : isPast
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-panel2 border-white/10 text-white/40'
                }`}
              >
                <div>{i === LOGIN_CYCLE.length - 1 ? '🎁' : isPast ? '✓' : `${i + 1}日`}</div>
                <div className="mt-0.5">{coin}</div>
              </div>
            )
          })}
        </div>

        <button className="btn-primary mt-6 w-full py-3" onClick={() => setClosed(true)}>
          受け取る
        </button>
      </div>
    </div>
  )
}
