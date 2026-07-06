import { useNav, type Screen } from '../state/nav'
import type { Strings } from '../i18n/types'

const items: { screen: Screen; labelKey: keyof Strings; icon: string }[] = [
  { screen: 'home', labelKey: 'nav.home', icon: '🏠' },
  { screen: 'quiz', labelKey: 'nav.quiz', icon: '📝' },
  { screen: 'study', labelKey: 'nav.study', icon: '📚' },
  { screen: 'ranking', labelKey: 'nav.rank', icon: '🏆' },
  { screen: 'profile', labelKey: 'nav.profile', icon: '👤' },
]

/** 下部タブ。主要4画面へ即アクセス。 */
export function BottomNav() {
  const { screen, navigate, t } = useNav()
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
            <span className="text-[10px] font-bold">{t(it.labelKey)}</span>
          </button>
        )
      })}
    </nav>
  )
}
