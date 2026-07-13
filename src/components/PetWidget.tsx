import { useEffect, useState, Component, type ReactNode } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ProgressBar } from './ProgressBar'
import { PetSprite } from './PetSprite'
import { StarterSelect } from './StarterSelect'
import { PetCatalog } from './PetCatalog'
import { PetBox } from './PetBox'
import { RenamePetModal } from './RenamePetModal'
import { petView, activePet, levelFromXp, petForm, petBonus } from '../core/PetEngine'
import { todayStr } from '../state/dateUtils'
import { PET_SPECIES_NAME_KEY, PET_MAX_PETS } from '../config/petConfig'
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
 * 未選択ならスターター選択。複数所有時は下に切替スイッチャー＋解放ボタン。
 * 学習XPはアクティブな1体だけに入る。
 */
export function PetWidget() {
  const { user, markPetForm, setActivePet, renamePet } = useGame()
  const { t, navigate, setQuizMode, setCustomIds } = useNav()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [boxOpen, setBoxOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const view = petView(user, todayStr())
  const petName = activePet(user).name?.trim() || t('pet.name')

  // 初回だけ現フォームを基準に記録（以後、進化すると演出フラグが立つ）
  useEffect(() => {
    if (view.species && (activePet(user).formSeen ?? 0) === 0) markPetForm(view.form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.species, user.activePet])

  const canBuy = user.pets.length < PET_MAX_PETS

  const switcher = (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {user.pets.slice(0, 5).map((p, i) => {
        const isActive = i === user.activePet
        return (
          <button
            key={i}
            onClick={() => setActivePet(i)}
            aria-label={t('pet.switchAria')}
            className={`relative shrink-0 w-11 h-11 grid place-items-center rounded-xl border transition ${
              isActive ? 'border-accent bg-accent/15' : 'border-white/10 bg-panel2 opacity-70'
            }`}
          >
            {p.isNew && (
              <span className="absolute -top-1 -right-1 z-10 text-[8px] font-black bg-danger text-white px-1 rounded-full leading-tight">{t('pet.newBadge')}</span>
            )}
            {p.species ? (
              <SpriteBoundary>
                <PetSprite species={p.species} form={petForm(levelFromXp(p.xp))} level={levelFromXp(p.xp)} mood="happy" fusion={p.fusion} size={38} />
              </SpriteBoundary>
            ) : (
              <span className="text-xl">🥚</span>
            )}
          </button>
        )
      })}
      <button
        onClick={() => setBoxOpen(true)}
        aria-label={t('pet.openBox')}
        className="shrink-0 h-11 px-3 grid place-items-center rounded-xl border border-white/10 bg-panel2 text-lg active:scale-95 transition"
      >
        📦
      </button>
      {canBuy && (
        <button
          onClick={() => setCatalogOpen(true)}
          aria-label={t('pet.addBuddy')}
          className="shrink-0 w-11 h-11 grid place-items-center rounded-xl border border-dashed border-white/20 bg-panel2 text-xl font-bold text-white/70 active:scale-95 transition"
        >
          ＋
        </button>
      )}
    </div>
  )

  const catalog = catalogOpen ? <PetCatalog onClose={() => setCatalogOpen(false)} /> : null
  const box = boxOpen ? <PetBox onClose={() => setBoxOpen(false)} /> : null

  if (!view.species)
    return (
      <div className="space-y-2">
        <StarterSelect />
        {switcher}
        {catalog}
        {box}
      </div>
    )

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
    <div className="space-y-2">
      <button onClick={onTap} className="card p-4 w-full flex items-center gap-3 text-left active:scale-[0.98] transition relative overflow-hidden">
        {view.evolved && (
          <span className="absolute top-2 right-2 text-[11px] font-black text-gold bg-gold/15 px-2 py-0.5 rounded-full animate-pop">
            {t('pet.evolved')}
          </span>
        )}
        <div key={`${view.form}-${view.mood}`} className="shrink-0 animate-pop">
          <SpriteBoundary>
            <PetSprite species={view.species} form={view.form} level={view.level} mood={view.mood} fusion={view.fusion} size={76} />
          </SpriteBoundary>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-black truncate">{view.fusion > 0 && <span className="text-gold">★{view.fusion} </span>}{petName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label={t('pet.rename')}
              onClick={(e) => { e.stopPropagation(); setRenaming(true) }}
              className="shrink-0 text-[11px] text-white/35 active:text-accent2"
            >
              ✏️
            </span>
            <span className="text-[11px] text-white/45 font-bold shrink-0">
              {t(PET_SPECIES_NAME_KEY[view.species] as keyof Strings)}・Lv.{view.level}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-accent2 font-bold truncate">{t(moodKey)}</span>
            {(() => {
              const b = petBonus(user, todayStr())
              if (b.percent <= 0) return null
              const dim = b.mood === 'hungry' || b.mood === 'sad'
              return (
                <span className={`shrink-0 text-[11px] font-black px-1.5 py-0.5 rounded-md ${dim ? 'bg-danger/15 text-danger' : 'bg-gold/15 text-gold'}`}>
                  {t('pet.bonus')} +{b.percent}%{dim ? ' ↓' : ''}
                </span>
              )
            })()}
          </div>
          <ProgressBar ratio={view.progress} className="mt-2" barClassName="bg-gold" height={6} />
          <div className="text-[10px] text-white/40 mt-1">
            {view.maxed ? t('pet.maxLevel') : `${t('pet.toNextPre')}${view.toNext}${t('pet.toNextUnit')}`}
          </div>
        </div>
      </button>
      {switcher}
      {catalog}
      {box}
      {renaming && (
        <RenamePetModal
          current={activePet(user).name ?? ''}
          onSave={(n) => { renamePet(n); setRenaming(false) }}
          onClose={() => setRenaming(false)}
        />
      )}
    </div>
  )
}
