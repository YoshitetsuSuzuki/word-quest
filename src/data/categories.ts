import type { Category } from '../types'
import type { Locale } from '../i18n/types'

export interface CategoryInfo {
  id: Category
  label: string
  emoji: string
  /** MVPで遊べるか（データがあるか）。未実装は coming soon 表示。 */
  available: boolean
  /** その母語(UI言語)で学習対象として表示するロケール */
  availableLocales: Locale[]
}

/**
 * 学習ジャンルのカタログ（データ駆動）。
 * questions.<cat>.ts を追加し available:true にするだけで新ジャンルが遊べる。
 */
export const categories: CategoryInfo[] = [
  { id: 'english', label: '英単語', emoji: '🇬🇧', available: true, availableLocales: ['ja'] },
  { id: 'chinese', label: '中国語', emoji: '🇨🇳', available: true, availableLocales: ['ja', 'en'] },
  { id: 'korean', label: '韓国語', emoji: '🇰🇷', available: true, availableLocales: ['ja'] },
  { id: 'japanese', label: '日本語', emoji: '🇯🇵', available: true, availableLocales: ['en'] },
  { id: 'spanish', label: 'スペイン語', emoji: '🇪🇸', available: true, availableLocales: ['en'] },
  { id: 'french', label: 'フランス語', emoji: '🇫🇷', available: true, availableLocales: ['en'] },
  { id: 'german', label: 'ドイツ語', emoji: '🇩🇪', available: true, availableLocales: ['en'] },
]

export function getCategoryInfo(id: Category): CategoryInfo {
  return categories.find((c) => c.id === id) ?? categories[0]
}
