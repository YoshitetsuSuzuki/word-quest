import { createContext, useContext } from 'react'
import type { Category } from '../types'
import type { Locale, Strings } from '../i18n/types'

export type Screen =
  | 'home'
  | 'quiz'
  | 'battle'
  | 'raid'
  | 'ranking'
  | 'profile'
  | 'shop'
  | 'missions'
  | 'study'

interface NavApi {
  screen: Screen
  navigate: (s: Screen) => void
  /** クイズのモード（通常 / 復習 / リスニング / 例文暗記 / 表現） */
  quizMode: 'normal' | 'review' | 'listening' | 'example' | 'phrase'
  setQuizMode: (m: 'normal' | 'review' | 'listening' | 'example' | 'phrase') => void
  /** 指定IDだけで出題するカスタムセッション（弱点特訓・自分の単語帳テスト用）。nullで通常 */
  customIds: string[] | null
  setCustomIds: (ids: string[] | null) => void
  /** 現在選択中の学習ジャンル（Quiz/Battle/Raidが参照） */
  category: Category
  setCategory: (c: Category) => void
  /** 発音の自動再生ON/OFF */
  soundEnabled: boolean
  setSoundEnabled: (v: boolean) => void
  /** 効果音（正解/不正解） */
  sfxEnabled: boolean
  setSfxEnabled: (v: boolean) => void
  sfxVolume: number
  setSfxVolume: (v: number) => void
  /** BGM */
  bgmEnabled: boolean
  setBgmEnabled: (v: boolean) => void
  bgmVolume: number
  setBgmVolume: (v: number) => void
  /** 学習レベル(難易度1-5)。0=全部から出題 */
  studyLevel: number
  setStudyLevel: (n: number) => void
  /** UI表示言語 */
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof Strings) => string
}

export const NavContext = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavContext')
  return ctx
}
