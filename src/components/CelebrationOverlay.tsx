import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { loc } from '../i18n'
import { raidBosses } from '../data/raids.config'

/** レベルアップ・レイドクリア・実績解除の全画面演出 */
export function CelebrationOverlay() {
  const { celebration, dismissCelebration } = useGame()
  const { t, locale } = useNav()
  if (!celebration) return null

  let title = ''
  let emoji = ''
  let sub = ''
  if (celebration.kind === 'levelup') {
    title = 'LEVEL UP!'
    emoji = '⬆️'
    sub = `${t('celebrate.levelupSub')}${celebration.level}${t('celebrate.levelupSubPost')}`
  } else if (celebration.kind === 'raidClear') {
    title = 'RAID CLEAR!'
    emoji = '🎉'
    // 報酬タイトルは日本語文字列で渡ってくるので、対応するボスを引いて英語版に出し分ける
    const boss = celebration.title ? raidBosses.find((b) => b.rewardTitle === celebration.title) : undefined
    const rewardTitle = boss ? loc(boss.rewardTitle ?? '', boss.rewardTitleEn, locale) : celebration.title
    sub = rewardTitle ? `${t('celebrate.raidTitlePre')}${rewardTitle}${t('celebrate.raidTitlePost')}` : t('celebrate.raidClearDefault')
  } else if (celebration.kind === 'achievement') {
    title = t('celebrate.achievement')
    emoji = celebration.achievement?.emoji ?? '🏅'
    sub = celebration.achievement ? loc(celebration.achievement.title, celebration.achievement.titleEn, locale) : ''
  } else if (celebration.kind === 'streak') {
    title = 'STREAK!'
    emoji = '🔥'
    sub = `${t('celebrate.streakPre')}${celebration.streakDays}${t('celebrate.streakPost')}${celebration.streakCoin}`
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-6"
      onClick={dismissCelebration}
    >
      <div className="text-center animate-pop">
        <div className="text-7xl mb-3 drop-shadow-[0_0_20px_rgba(124,92,255,0.8)]">{emoji}</div>
        <div className="text-3xl font-black tracking-wider text-accent2">{title}</div>
        <div className="mt-2 text-white/80">{sub}</div>
        <button className="btn-primary mt-6 px-8 py-2.5">{t('celebrate.tapContinue')}</button>
      </div>
    </div>
  )
}
