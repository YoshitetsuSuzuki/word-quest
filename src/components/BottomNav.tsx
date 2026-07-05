import { useNav, type Screen } from '../state/nav'

const items: { screen: Screen; label: string; icon: string }[] = [
  { screen: 'home', label: 'ホーム', icon: '🏠' },
  { screen: 'quiz', label: 'クイズ', icon: '📝' },
  { screen: 'study', label: 'まなび', icon: '📚' },
  { screen: 'ranking', label: 'ランク', icon: '🏆' },
  { screen: 'profile', label: 'プロフ', icon: '👤' },
]

/** 下部タブ。主要4画面へ即アクセス。 */
export function BottomNav() {
  const { screen, navigate } = useNav()
  return (
    <nav className="sticky bottom-0 z-20 bg-night/90 backdrop-blur border-t border-white/10 flex">
      {items.map((it) => {
        const active = screen === it.screen
        return (
          <button
            key={it.screen}
            onClick={() => navigate(it.screen)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 transition ${
              active ? 'text-accent2' : 'text-white/45'
            }`}
          >
            <span className={`text-xl leading-none transition ${active ? 'scale-110' : ''}`}>{it.icon}</span>
            <span className="text-[10px] font-bold">{it.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
