// ============================================================================
// petConfig.ts  学習相棒（育成キャラ）の設定データ
// ポケモン式: スターターを選び、学習でXPが増え、サボると減る。Lv100で最大。
// 大進化4段階＋5レベルごとの小強化。
// ============================================================================

export type PetSpecies = 'green' | 'fire' | 'water'
export const PET_SPECIES: PetSpecies[] = ['green', 'fire', 'water']

export type PetMood = 'happy' | 'normal' | 'hungry' | 'sad'

export const PET_MAX_LEVEL = 100
/** Lv L → L+1 に必要なXP = BASE + STEP*(L-1)（ゆるやかな増加カーブ） */
export const PET_XP_BASE = 40
export const PET_XP_STEP = 4
/** 学習しなかった1日ごとに減るXP（ゆるめ） */
export const PET_DECAY_PER_DAY = 15

/** 大進化のしきい値。到達レベルで form 1..5 が決まる（Lv100で究極体=form5） */
export const PET_FORM_THRESHOLDS = [1, 20, 50, 80, 100]

/** 所有できる相棒の最大数 */
export const PET_MAX_PETS = 3
/** 2体目以降を解放するコイン費用（将来リアル課金に差し替え） */
export const PET_SLOT_COST = 500

/** 気分の日数しきい値（最終学習日からの経過日数） */
export const PET_MOOD_DAYS = { happyMax: 0, normalMax: 1, hungryMax: 2 } as const

export interface SpeciesColor {
  body: string
  bodySad: string
  belly: string
  line: string
  lineSad: string
  /** モチーフ色（葉・炎・ひれ） */
  motif: string
  motif2: string
}

export const PET_COLORS: Record<PetSpecies, SpeciesColor> = {
  green: { body: '#8fd98a', bodySad: '#b6cdb2', belly: '#e4f7dd', line: '#4fa84e', lineSad: '#86a583', motif: '#7fd06a', motif2: '#e9f5a0' },
  fire: { body: '#ffa25c', bodySad: '#d8b49c', belly: '#ffe9d6', line: '#e07a2e', lineSad: '#b08a6e', motif: '#ff7a3c', motif2: '#ffd24a' },
  water: { body: '#7fc4f5', bodySad: '#a9c2d6', belly: '#dcf0fd', line: '#3f8fd0', lineSad: '#7f97a8', motif: '#59b0ee', motif2: '#bfe6ff' },
}

/** 種の日本語名キー（i18n） */
export const PET_SPECIES_NAME_KEY: Record<PetSpecies, string> = {
  green: 'pet.speciesGreen',
  fire: 'pet.speciesFire',
  water: 'pet.speciesWater',
}
