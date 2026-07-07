import { useState, Component, type ReactNode } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { PetSprite } from './PetSprite'
import { levelFromXp, petForm } from '../core/PetEngine'
import { PET_SPECIES_NAME_KEY } from '../config/petConfig'
import type { Strings } from '../i18n/types'

class MiniBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? <span className="text-2xl">🥚</span> : this.props.children
  }
}

/**
 * 相棒ボックス（コレクション）。所有する全相棒を一覧し、育成中の切替と
 * 同じ種のダブり合体（★シャイニー化）を行う。
 */
export function PetBox({ onClose }: { onClose: () => void }) {
  const { user, setActivePet, fusePet } = useGame()
  const { t } = useNav()
  const [pendingFuse, setPendingFuse] = useState<number | null>(null)

  // 種ごとの所有数（合体可否の判定に使う）
  const speciesCount: Record<string, number> = {}
  for (const p of user.pets) if (p.species) speciesCount[p.species] = (speciesCount[p.species] ?? 0) + 1

  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-panel rounded-t-2xl sm:rounded-2xl p-4 max-h-[82vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black">{t('pet.boxTitle')} <span className="text-white/40 text-xs font-bold">{user.pets.length}</span></h2>
          <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {user.pets.map((p, i) => {
            if (!p.species) return null
            const lvl = levelFromXp(p.xp)
            const isActive = i === user.activePet
            const canFuse = speciesCount[p.species] >= 2
            const name = p.name?.trim() || t('pet.name')
            return (
              <div key={i} className={`relative bg-panel2 rounded-xl p-2 flex flex-col items-center gap-1 border ${isActive ? 'border-accent' : 'border-white/5'}`}>
                {p.isNew && (
                  <span className="absolute top-1 right-1 z-10 text-[8px] font-black bg-danger text-white px-1 rounded-full">{t('pet.newBadge')}</span>
                )}
                <MiniBoundary>
                  <PetSprite species={p.species} form={petForm(lvl)} level={lvl} mood="happy" fusion={p.fusion} size={56} />
                </MiniBoundary>
                <div className="text-xs font-bold truncate max-w-full">{(p.fusion ?? 0) > 0 && <span className="text-gold">★{p.fusion} </span>}{name}</div>
                <div className="text-[10px] text-white/45">{t(PET_SPECIES_NAME_KEY[p.species] as keyof Strings)}・Lv.{lvl}</div>
                {pendingFuse === i ? (
                  <div className="w-full space-y-1">
                    <div className="text-[9px] text-white/60 leading-tight">{t('pet.fuseConfirm')}</div>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={() => { fusePet(i); setPendingFuse(null) }} className="py-1 rounded-lg text-[11px] font-bold bg-gold/20 text-gold">{t('pet.yes')}</button>
                      <button onClick={() => setPendingFuse(null)} className="py-1 rounded-lg text-[11px] font-bold bg-panel text-white/60">{t('pet.no')}</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full grid grid-cols-1 gap-1">
                    <button
                      onClick={() => setActivePet(i)}
                      disabled={isActive}
                      className={`py-1 rounded-lg text-[11px] font-bold transition ${isActive ? 'bg-accent/20 text-accent2' : 'bg-accent text-white active:scale-95'}`}
                    >
                      {isActive ? t('pet.active') : t('pet.setActive')}
                    </button>
                    {canFuse && (
                      <button onClick={() => setPendingFuse(i)} className="py-1 rounded-lg text-[11px] font-bold bg-panel text-gold border border-gold/30 active:scale-95">
                        {t('pet.fuse')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
