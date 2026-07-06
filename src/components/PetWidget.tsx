import { useEffect, Component, type ReactNode } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ProgressBar } from './ProgressBar'
import { PetSprite } from './PetSprite'
import { StarterSelect } from './StarterSelect'
import { petView } from '../core/PetEngine'
import { todayStr } from '../state/dateUtils'
import { PET_SPECIES_NAME_KEY } from '../config/petConfig'
import type { Strings } from '../i18n/types'

// スプライト描画で万一エラーが出てもアプリ全体を白画面にしない安全網
class SpriteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <div className="w-[76px] h-[76px] grid place-items-center text-3xl">🥚</div>
    return this.props.children
  }
}

/**
 * 学習相棒ウィジェット（ホーム常駐）。
 * 未選択ならスターター選択。選択済みなら種・レベル・進化・気分を表示し、タップで学習へ。
 */
export function PetWidget() {
  const { user, markPetForm } = useGame()
  const { t, navigate, setQuizMode, setCustomIds } = useNav()
  const view = petView(user, todayStr())

  // 初回だけ現フォームを基準に記録（以後、進化すると演出フラグが立つ）
  useEffect(() => {
    if (view.species && (user.pet.formSeen ?? 0) === 0) markPetForm(view.form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.species])

  if (!view.species) return <StarterSelect />

  const moodKey = (
    { happy: 'pet.moodHappy', normal: 'pet.moodNormal', hungry: 'pet.moodHungry', sad: 'pet.moodSad' } as const
  )[view.mood] as keyof Strings

  const onTap = () => {
    if (view.evolved) markPetForm(view.form)
    setQuizMode('normal')
    setCustomIds(null)
    navigate('quiz')
  }

  return (
    <button onClick={onTap} className="card p-4 w-full flex items-center gap-3 text-left active:scale-[0.98] transition relative overflow-hidden">
      {view.evolved && (
        <span className="absolute top-2 right-2 text-[11px] font-black text-gold bg-gold/15 px-2 py-0.5 rounded-full animate-pop">
          {t('pet.evolved')}
        </span>
      )}
      <div key={`${view.form}-${view.mood}`} className="shrink-0 animate-pop">
        <SpriteBoundary>
          <PetSprite species={view.species} form={view.form} level={view.level} mood={view.mood} size={76} />
        </SpriteBoundary>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-black">{t('pet.name')}</span>
          <span className="text-[11px] text-white/45 font-bold">
            {t(PET_SPECIES_NAME_KEY[view.species] as keyof Strings)}・Lv.{view.level}
          </span>
        </div>
        <div className="text-sm text-accent2 font-bold truncate">{t(moodKey)}</div>
        <ProgressBar ratio={view.progress} className="mt-2" barClassName="bg-gold" height={6} />
        <div className="text-[10px] text-white/40 mt-1">
          {view.maxed ? t('pet.maxLevel') : `${t('pet.toNextPre')}${view.toNext}${t('pet.toNextUnit')}`}
        </div>
      </div>
    </button>
  )
}
