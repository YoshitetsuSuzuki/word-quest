import { createContext, useContext } from 'react'
import type { Category } from '../types'

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
  /** クイズを復習モードで開くためのフラグ */
  quizMode: 'normal' | 'review'
  setQuizMode: (m: 'normal' | 'review') => void
  /** 現在選択中の学習ジャンル（Quiz/Battle/Raidが参照） */
  category: Category
  setCategory: (c: Category) => void
}

export const NavContext = createContext<NavApi | null>(null)

export function useNav(): NavApi {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavContext')
  return ctx
}
