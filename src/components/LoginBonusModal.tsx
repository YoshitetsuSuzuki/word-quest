import { useState } from 'react'
import { useGame } from '../state/GameContext'

/** 起動時のログインボーナス表示 */
export function LoginBonusModal() {
  const { loginBonus } = useGame()
  const [closed, setClosed] = useState(false)
  if (!loginBonus || closed) return null

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
        <button className="btn-primary mt-6 w-full py-3" onClick={() => setClosed(true)}>
          受け取る
        </button>
      </div>
    </div>
  )
}
