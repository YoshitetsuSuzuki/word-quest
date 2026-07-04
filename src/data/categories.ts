import type { Category } from '../types'

export interface CategoryInfo {
  id: Category
  label: string
  emoji: string
  /** MVPで遊べるか（データがあるか）。未実装は coming soon 表示。 */
  available: boolean
}

/**
 * 学習ジャンルのカタログ（データ駆動）。
 * questions.<cat>.ts を追加し available:true にするだけで新ジャンルが遊べる。
 */
export const categories: CategoryInfo[] = [
  { id: 'english', label: '英単語', emoji: '🇬🇧', available: true },
  { id: 'chinese', label: '中国語', emoji: '🇨🇳', available: true },
  { id: 'history', label: '歴史', emoji: '📜', available: false },
  { id: 'spi', label: 'SPI', emoji: '🧮', available: false },
  { id: 'certification', label: '資格', emoji: '🎓', available: false },
]

export function getCategoryInfo(id: Category): CategoryInfo {
  return categories.find((c) => c.id === id) ?? categories[0]
}
