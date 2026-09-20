import { useMemo } from 'react'
import { useNav } from '../../state/nav'
import { useFriends } from './useFriends'
import { notStudiedToday } from './friendLogic'

/**
 * ホームに出すフレンドの要約カード。
 *
 * 当初はランキング画面のタブにだけ置いたが、作った本人が見つけられなかった。
 * 習慣形成が目的の機能を、毎日は開かない画面の奥に置いたのが誤りだったので、
 * 必ず見るホームへ出す。ランキング内のタブも残してある。
 */
export function FriendsHomeCard() {
  const { navigate, t } = useNav()
  const f = useFriends()
  const today = new Date().toLocaleDateString('sv-SE')

  const slacking = useMemo(() => notStudiedToday(f.friends, today), [f.friends, today])
  const top = useMemo(
    () => [...f.friends].sort((a, b) => b.streak - a.streak)[0],
    [f.friends],
  )

  const go = () => navigate('ranking')

  // 未参加: 何ができる機能なのかを一言で伝える
  if (!f.joined) {
    return (
      <button onClick={go} className="card p-3 w-full text-left active:scale-[0.99] transition">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{t('friendsCard.joinTitle')}</div>
            <div className="text-[11px] text-white/50 mt-0.5">{t('friendsCard.joinBody')}</div>
          </div>
          <span className="text-white/30">›</span>
        </div>
      </button>
    )
  }

  return (
    <button onClick={go} className="card p-3 w-full text-left active:scale-[0.99] transition">
      <div className="flex items-center gap-3">
        <span className="text-2xl">👥</span>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{t('friendsCard.title')}</div>
          <div className="text-[11px] text-white/50 mt-0.5 truncate">
            {f.pendingNudges.length > 0
              ? t('friendsCard.nudged').replace('%s', f.pendingNudges[0])
              : slacking.length > 0
                ? t('friendsCard.slacking').replace('%s', slacking[0].displayName || '友達')
                : top
                  ? t('friendsCard.top').replace('%s', top.displayName || '友達').replace('%d', String(top.streak))
                  : t('friendsCard.empty')}
          </div>
        </div>
        {/* つつかれていたら目立たせる。放置されないよう件数を出す */}
        {f.pendingNudges.length > 0 && (
          <span className="shrink-0 px-2 py-0.5 rounded-full bg-accent2 text-night text-[11px] font-black">
            👋 {f.pendingNudges.length}
          </span>
        )}
        <span className="text-white/30">›</span>
      </div>
    </button>
  )
}
