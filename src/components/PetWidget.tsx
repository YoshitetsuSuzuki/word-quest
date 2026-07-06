import { useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ProgressBar } from './ProgressBar'
import { PetSprite } from './PetSprite'
import { petView } from '../core/PetEngine'
import { todayStr } from '../state/dateUtils'
import type { Strings } from '../i18n/types'

/**
 * 学習相棒ウィジェット（ホーム常駐）。
 * 学ぶと育ち(段階)、サボると気分が下がる。タップで学習へ誘導し、進化演出も確認する。
 */
export function PetWidget() {
  const { user, markPetStage } = useGame()
  const { t, navigate, setQuizMode, setCustomIds } = useNav()
  const view = petView(user, todayStr())

  // 初回だけ現段階を基準に記録（以後、段階が上がると進化演出フラグが立つ）
  useEffect(() => {
    if ((user.petStageSeen ?? 0) === 0) markPetStage(view.stage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const moodKey = (
    { happy: 'pet.moodHappy', normal: 'pet.moodNormal', hungry: 'pet.moodHungry', sad: 'pet.moodSad' } as const
  )[view.mood] as keyof Strings
  const stageKey = `pet.stage${view.stage}` as keyof Strings
  const remaining = view.nextAt === null ? 0 : Math.max(0, view.nextAt - view.learned)

  const onTap = () => {
    if (view.evolved) markPetStage(view.stage) // 進化を確認済みに
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
      <div key={`${view.stage}-${view.mood}`} className="shrink-0 animate-pop">
        <PetSprite stage={view.stage} mood={view.mood} size={76} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-black">{t('pet.name')}</span>
          <span className="text-[11px] text-white/45 font-bold">Lv.{view.stage}・{t(stageKey)}</span>
        </div>
        <div className="text-sm text-accent2 font-bold truncate">{t(moodKey)}</div>
        <ProgressBar ratio={view.progress} className="mt-2" barClassName="bg-gold" height={6} />
        <div className="text-[10px] text-white/40 mt-1">
          {view.nextAt === null ? t('pet.maxStage') : `${t('pet.toNextPre')}${remaining}${t('pet.toNextUnit')}`}
        </div>
      </div>
    </button>
  )
}
