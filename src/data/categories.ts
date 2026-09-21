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
 * 出題IDの接頭辞（`en-00042` の `en`）。
 *
 * 学習記録(learnedQuestionIds / reviewQueue / wordStats)はIDの接頭辞で
 * ジャンルを見分けている。画面ごとに対応表を手書きしていたため、
 * 後から足した言語が漏れて英語の記録を拾う不具合が起きていた。
 * ここを単一の正とし、release-check がワードバンクの実データと突き合わせる。
 */
export const CATEGORY_ID_PREFIX: Record<Category, string> = {
  english: 'en', chinese: 'zh', japanese: 'jp', korean: 'ko', spanish: 'es',
  german: 'de', french: 'fr', portuguese: 'pt', polish: 'pl', russian: 'ru',
  hindi: 'hi', arabic: 'ar', tagalog: 'tl', italian: 'it', mongolian: 'mn',
  bengali: 'bn', malay: 'ms', indonesian: 'id', urdu: 'ur', turkish: 'tr',
  vietnamese: 'vi', esperanto: 'eo',
}

/** そのジャンルの出題IDかどうか。接頭辞の取り違えを一箇所に閉じ込める。 */
export function isIdOfCategory(id: string, category: Category): boolean {
  return id.startsWith(CATEGORY_ID_PREFIX[category] + '-')
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
  { id: 'spanish', label: 'スペイン語', emoji: '🇪🇸', available: true, availableLocales: ['en', 'ja'] },
  { id: 'french', label: 'フランス語', emoji: '🇫🇷', available: true, availableLocales: ['en', 'ja'] },
  { id: 'german', label: 'ドイツ語', emoji: '🇩🇪', available: true, availableLocales: ['en', 'ja'] },
  { id: 'portuguese', label: 'ポルトガル語', emoji: '🇵🇹', available: true, availableLocales: ['en', 'ja'] },
  { id: 'russian', label: 'ロシア語', emoji: '🇷🇺', available: true, availableLocales: ['en', 'ja'] },
  { id: 'polish', label: 'ポーランド語', emoji: '🇵🇱', available: true, availableLocales: ['en', 'ja'] },
  { id: 'hindi', label: 'ヒンディー語', emoji: '🇮🇳', available: true, availableLocales: ['ja', 'en'] },
  { id: 'arabic', label: 'アラビア語', emoji: '🇸🇦', available: true, availableLocales: ['ja', 'en'] },
  { id: 'tagalog', label: 'タガログ語', emoji: '🇵🇭', available: true, availableLocales: ['ja', 'en'] },
  { id: 'italian', label: 'イタリア語', emoji: '🇮🇹', available: true, availableLocales: ['ja', 'en'] },
  { id: 'mongolian', label: 'モンゴル語', emoji: '🇲🇳', available: true, availableLocales: ['ja', 'en'] },
  { id: 'bengali', label: 'ベンガル語', emoji: '🇧🇩', available: true, availableLocales: ['ja', 'en'] },
  { id: 'malay', label: 'マレー語', emoji: '🇲🇾', available: true, availableLocales: ['ja', 'en'] },
  { id: 'indonesian', label: 'インドネシア語', emoji: '🇮🇩', available: true, availableLocales: ['ja', 'en'] },
  { id: 'urdu', label: 'ウルドゥー語', emoji: '🇵🇰', available: true, availableLocales: ['ja', 'en'] },
  { id: 'turkish', label: 'トルコ語', emoji: '🇹🇷', available: true, availableLocales: ['ja', 'en'] },
  { id: 'vietnamese', label: 'ベトナム語', emoji: '🇻🇳', available: true, availableLocales: ['ja', 'en'] },
  // エスペラントは国を持たないので国旗が無い。緑の星(verda stelo)がこの言語の象徴。
  { id: 'esperanto', label: 'エスペラント', emoji: '⭐', available: true, availableLocales: ['ja', 'en'] },
]

export function getCategoryInfo(id: Category): CategoryInfo {
  return categories.find((c) => c.id === id) ?? categories[0]
}
