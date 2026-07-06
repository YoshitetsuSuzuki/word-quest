import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { PetSprite } from './PetSprite'
import { PET_STARTERS, PET_SPECIES_NAME_KEY } from '../config/petConfig'
import type { Strings } from '../i18n/types'

/**
 * スターター選択。相棒が未選択(species===null)のときにホームで表示する。
 * 3種から1匹を選ぶと以降その姿で育つ。
 */
export function StarterSelect() {
  const { choosePetStarter } = useGame()
  const { t } = useNav()
  return (
    <div className="card p-4">
      <div className="text-sm font-black mb-1">{t('pet.chooseTitle')}</div>
      <div className="text-[11px] text-white/45 mb-3">{t('pet.chooseHint')}</div>
      <div className="grid grid-cols-3 gap-2">
        {PET_STARTERS.map((sp) => (
          <button
            key={sp}
            onClick={() => choosePetStarter(sp)}
            className="bg-panel2 border border-white/10 rounded-xl py-3 grid place-items-center gap-1 active:scale-95 transition"
          >
            <PetSprite species={sp} form={1} level={1} mood="happy" size={64} />
            <span className="text-xs font-bold text-white/70">{t(PET_SPECIES_NAME_KEY[sp] as keyof Strings)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
