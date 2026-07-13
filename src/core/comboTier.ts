// コンボの段位（手応え演出用）。5連続ごとに節目、段位が上がるほど派手に。
export interface ComboTier {
  tier: number
  label: string
  emoji: string
  color: string // tailwind text color class
}

const TIERS: { min: number; label: string; emoji: string; color: string }[] = [
  { min: 20, label: 'LEGENDARY', emoji: '👑', color: 'text-gold' },
  { min: 15, label: 'GENIUS', emoji: '💎', color: 'text-accent2' },
  { min: 10, label: 'UNSTOPPABLE', emoji: '⚡', color: 'text-accent' },
  { min: 5, label: 'ON FIRE', emoji: '🔥', color: 'text-gold' },
]

/** その連続正解数に対応する段位（5未満は null） */
export function comboTierOf(combo: number): ComboTier | null {
  const t = TIERS.find((x) => combo >= x.min)
  if (!t) return null
  return { tier: TIERS.length - TIERS.indexOf(t), label: t.label, emoji: t.emoji, color: t.color }
}

/** 5連続ごとの節目か（5,10,15,...） */
export function isComboMilestone(combo: number): boolean {
  return combo >= 5 && combo % 5 === 0
}
