import { useGame } from '../state/GameContext'
import { progressEngine } from '../core/ProgressEngine'
import { ProgressBar } from './ProgressBar'
import { equippedTitle, equippedFrameClass } from '../modules/shop/shopLogic'

/** 画面上部の常設ステータス（レベル/XP/Coin） */
export function TopBar() {
  const { user } = useGame()
  const need = progressEngine.requiredXp(user.level)
  const title = equippedTitle(user)
  const frame = equippedFrameClass(user)

  return (
    <div className="sticky top-0 z-20 bg-night/80 backdrop-blur px-4 pt-3 pb-2 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div
          className={`w-11 h-11 shrink-0 rounded-full bg-accent/30 grid place-items-center text-lg font-black ring-2 ${frame ?? 'ring-accent/40'}`}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate">{user.name}</span>
            {title && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/20 text-gold font-bold shrink-0">
                {title}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-accent2 shrink-0">Lv.{user.level}</span>
            <ProgressBar ratio={user.xp / need} height={7} barClassName="bg-accent2" />
            <span className="text-[10px] text-white/50 shrink-0 tabular-nums">
              {user.xp}/{need}
            </span>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {user.gems > 0 && (
            <div className="flex items-center gap-1 bg-black/30 rounded-full px-2.5 py-1.5">
              <span className="text-base leading-none">💎</span>
              <span className="font-black tabular-nums text-sm text-accent2">{user.gems.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-black/30 rounded-full px-3 py-1.5">
            <span className="text-gold text-base leading-none">🪙</span>
            <span className="font-black tabular-nums text-sm">{user.coin.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
