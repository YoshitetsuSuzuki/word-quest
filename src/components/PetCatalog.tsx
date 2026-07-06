import { Component, type ReactNode } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { PetSprite } from './PetSprite'
import { PET_CATALOG, PET_SPECIES_NAME_KEY, PET_MAX_PETS, type PetRarity } from '../config/petConfig'
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

const RARITY_STYLE: Record<PetRarity, string> = {
  common: 'text-white/50',
  rare: 'text-accent2',
  legendary: 'text-gold',
}

/**
 * 相棒ずかん（カタログ）モーダル。種のレア度・価格・解放状態を並べ、
 * コイン/ジェムで解放して新しい相棒を追加する。
 */
export function PetCatalog({ onClose }: { onClose: () => void }) {
  const { user, acquirePet } = useGame()
  const { t } = useNav()
  const full = user.pets.length >= PET_MAX_PETS
  const rarityKey = { common: 'pet.rarityCommon', rare: 'pet.rarityRare', legendary: 'pet.rarityLegendary' } as const

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-panel rounded-t-2xl sm:rounded-2xl p-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-black">{t('pet.catalogTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">
            ✕
          </button>
        </div>
        {full && <div className="text-[11px] text-danger mb-2">{t('pet.slotFull')}</div>}
        <div className="grid grid-cols-2 gap-2">
          {PET_CATALOG.map((e) => {
            const owned = user.ownedSpecies.includes(e.id)
            const affordable = owned || (e.coin != null && user.coin >= e.coin) || (e.gem != null && user.gems >= e.gem)
            const canAct = !full && affordable
            const cost = e.coin != null ? `🪙${e.coin.toLocaleString()}` : e.gem != null ? `💎${e.gem}` : ''
            return (
              <div key={e.id} className="bg-panel2 rounded-xl p-2 flex flex-col items-center gap-1 border border-white/5">
                <MiniBoundary>
                  <PetSprite species={e.id} form={owned ? 3 : 1} level={owned ? 50 : 1} mood="happy" size={58} />
                </MiniBoundary>
                <div className="text-xs font-bold">{t(PET_SPECIES_NAME_KEY[e.id] as keyof Strings)}</div>
                <div className={`text-[10px] font-bold ${RARITY_STYLE[e.rarity]}`}>{t(rarityKey[e.rarity] as keyof Strings)}</div>
                <button
                  onClick={() => acquirePet(e.id)}
                  disabled={!canAct}
                  className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition disabled:opacity-35 ${
                    owned ? 'bg-accent/20 text-accent2' : 'bg-accent text-white active:scale-95'
                  }`}
                >
                  {owned ? `＋ ${t('pet.addPet')}` : `${t('pet.unlock')}・${cost}`}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
