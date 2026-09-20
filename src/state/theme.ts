/**
 * 配色テーマ。実体は index.css の :root[data-theme=...] にあり、
 * ここでは「どれを選んでいるか」を持って html 要素へ反映するだけ。
 */
export const THEMES = ['night', 'forest', 'sunset'] as const
export type ThemeId = (typeof THEMES)[number]

const KEY = 'wordquest.theme'

/** 既定は従来の配色（夜空）。初見のユーザーの見た目を変えないため */
export const DEFAULT_THEME: ThemeId = 'night'

export function loadTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY)
    return (THEMES as readonly string[]).includes(v ?? '') ? (v as ThemeId) : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

/** html 要素へ反映する。CSS 変数が切り替わり、全画面の色が一斉に変わる */
export function applyTheme(id: ThemeId): void {
  try {
    document.documentElement.setAttribute('data-theme', id)
  } catch {
    // 無視（描画できなくても既定色で動く）
  }
}

export function saveTheme(id: ThemeId): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // 保存できなくても、そのセッション中は反映される
  }
}
