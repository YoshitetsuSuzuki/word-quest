// ============================================================================
// はじめかたガイドの読み込み。
// ワードバンクと同じく public/ から遅延ロードする（本体に抱えない）。
// 取得に失敗してもアプリは止めない。ガイドが出ないだけ。
// ============================================================================
import type { Category } from '../types'
import type { LanguageGuide } from '../types/guide'

const cache = new Map<Category, LanguageGuide | null>()
const base = import.meta.env.BASE_URL

export async function loadGuide(category: Category): Promise<LanguageGuide | null> {
  const hit = cache.get(category)
  if (hit !== undefined) return hit
  try {
    const res = await fetch(`${base}guide/${category}.json`)
    const data = res.ok ? ((await res.json()) as LanguageGuide) : null
    cache.set(category, data)
    return data
  } catch {
    cache.set(category, null)
    return null
  }
}

/** 同期で取れるか（既に読み込み済みか）。ボタンの出し分けに使う */
export function peekGuide(category: Category): LanguageGuide | null | undefined {
  return cache.get(category)
}
