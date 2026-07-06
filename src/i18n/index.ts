import { ja } from './ja'
import { en } from './en'
import type { Locale, Strings } from './types'

const DICTS: Record<Locale, Strings> = { ja, en }
const KEY = 'wordquest.locale'

export function detectLocale(): Locale {
  const saved = localStorage.getItem(KEY)
  if (saved === 'ja' || saved === 'en') return saved
  return (navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en'
}
export function setLocale(l: Locale): void { localStorage.setItem(KEY, l) }
export function makeT(locale: Locale) {
  const dict = DICTS[locale] ?? ja
  return (key: keyof Strings): string => dict[key] ?? ja[key] ?? String(key)
}
