// ============================================================================
// petConfig.ts  学習相棒（育成キャラ）の設定データ
// ポケモン式: スターターを選び、学習でXPが増え、サボると減る。Lv100で最大。
// 大進化5段階(Lv100=究極体)。種にレア度があり、コイン/ジェム/実績で解放。
// ============================================================================
import type { PetSpeciesId } from '../types'

export type PetSpecies = PetSpeciesId
/** 開始時に無料で選べるスターター種 */
export const PET_STARTERS: PetSpecies[] = ['green', 'fire', 'water']
/** 図鑑に並ぶ全種 */
export const PET_SPECIES: PetSpecies[] = ['green', 'fire', 'water', 'light', 'dark', 'thunder', 'rainbow', 'star']

export type PetMood = 'happy' | 'normal' | 'hungry' | 'sad'

export const PET_MAX_LEVEL = 100
/** Lv L → L+1 に必要なXP = BASE + STEP*(L-1)（ゆるやかな増加カーブ） */
export const PET_XP_BASE = 40
export const PET_XP_STEP = 4
/** 学習しなかった1日ごとに減るXP（ゆるめ） */
export const PET_DECAY_PER_DAY = 15

/** 大進化のしきい値。到達レベルで form 1..5 が決まる（Lv100で究極体=form5） */
export const PET_FORM_THRESHOLDS = [1, 20, 50, 80, 100]

/** 気分の日数しきい値（最終学習日からの経過日数） */
export const PET_MOOD_DAYS = { happyMax: 0, normalMax: 1, hungryMax: 2 } as const

/** 所有できる相棒の最大数（コレクション） */
export const PET_MAX_PETS = 6

export interface SpeciesColor {
  body: string
  bodySad: string
  belly: string
  line: string
  lineSad: string
  motif: string
  motif2: string
}

export const PET_COLORS: Record<PetSpecies, SpeciesColor> = {
  green: { body: '#8fd98a', bodySad: '#b6cdb2', belly: '#e4f7dd', line: '#4fa84e', lineSad: '#86a583', motif: '#7fd06a', motif2: '#e9f5a0' },
  fire: { body: '#ffa25c', bodySad: '#d8b49c', belly: '#ffe9d6', line: '#e07a2e', lineSad: '#b08a6e', motif: '#ff7a3c', motif2: '#ffd24a' },
  water: { body: '#7fc4f5', bodySad: '#a9c2d6', belly: '#dcf0fd', line: '#3f8fd0', lineSad: '#7f97a8', motif: '#59b0ee', motif2: '#bfe6ff' },
  light: { body: '#ffe58a', bodySad: '#e6dcb4', belly: '#fffdf0', line: '#e0ad2e', lineSad: '#b3a066', motif: '#ffd24a', motif2: '#fff3c0' },
  dark: { body: '#a58bd6', bodySad: '#b3a9c4', belly: '#efe8fb', line: '#6b4fa0', lineSad: '#8a7fa3', motif: '#7a5cc0', motif2: '#d9c9f5' },
  thunder: { body: '#ffdd57', bodySad: '#e0d9a8', belly: '#fffbe0', line: '#d4a017', lineSad: '#b0a26a', motif: '#ffc400', motif2: '#fff0a0' },
  rainbow: { body: '#cfe0ff', bodySad: '#c9cfda', belly: '#ffffff', line: '#7f7fd5', lineSad: '#9aa0b8', motif: '#ff6fae', motif2: '#7fe0d0' },
  star: { body: '#6b7fd0', bodySad: '#9aa2c4', belly: '#dfe6ff', line: '#3d4ea8', lineSad: '#7f88b0', motif: '#ffd45e', motif2: '#bcd0ff' },
}

/** 種の日本語名キー（i18n） */
export const PET_SPECIES_NAME_KEY: Record<PetSpecies, string> = {
  green: 'pet.speciesGreen',
  fire: 'pet.speciesFire',
  water: 'pet.speciesWater',
  light: 'pet.speciesLight',
  dark: 'pet.speciesDark',
  thunder: 'pet.speciesThunder',
  rainbow: 'pet.speciesRainbow',
  star: 'pet.speciesStar',
}

// ---- レア度と価格（図鑑） ----
export type PetRarity = 'common' | 'rare' | 'legendary'
export interface PetCatalogEntry {
  id: PetSpecies
  rarity: PetRarity
  /** コインで解放できる種の価格（無ければコイン不可） */
  coin?: number
  /** ジェムで解放できる種の価格（伝説） */
  gem?: number
}
export const PET_CATALOG: PetCatalogEntry[] = [
  { id: 'green', rarity: 'common', coin: 1200 },
  { id: 'fire', rarity: 'common', coin: 1200 },
  { id: 'water', rarity: 'common', coin: 1200 },
  { id: 'light', rarity: 'rare', coin: 4000 },
  { id: 'dark', rarity: 'rare', coin: 4000 },
  { id: 'thunder', rarity: 'rare', coin: 4000 },
  { id: 'rainbow', rarity: 'legendary', gem: 30 },
  { id: 'star', rarity: 'legendary', gem: 30 },
]
export function catalogEntry(id: PetSpecies): PetCatalogEntry {
  return PET_CATALOG.find((e) => e.id === id) ?? PET_CATALOG[0]
}
