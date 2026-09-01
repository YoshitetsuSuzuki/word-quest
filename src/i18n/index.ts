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

/**
 * データ駆動コンテンツ（ショップ/実績/ミッション/レイド等）の文言を出し分ける。
 * 英語ロケールで英語版があればそれを、無ければ日本語を返す（＝日本語は消えない）。
 */
export function loc(ja: string, en: string | undefined, locale: Locale): string {
  return locale === 'en' && en ? en : ja
}
export function makeT(locale: Locale) {
  const dict = DICTS[locale] ?? ja
  return (key: keyof Strings): string => dict[key] ?? ja[key] ?? String(key)
}
