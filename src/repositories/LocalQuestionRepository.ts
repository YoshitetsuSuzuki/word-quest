import type { Question, Category } from '../types'
import type { IQuestionRepository } from './types'
import { featureFlags } from '../config/featureFlags'

interface Manifest {
  category: string
  total: number
  levels: { level: number; file: string; count: number }[]
}

/** JSONワードバンクを持つカテゴリ（public/wordbank/<cat>/ に生成物がある） */
const WORDBANK_CATEGORIES = new Set<Category>(['english', 'chinese', 'korean', 'japanese', 'spanish', 'french', 'german'])

/**
 * 問題データの供給元。
 * english/chinese は public/wordbank/<cat>/ の生成済みJSONを級別に遅延ロードする。
 * getByCategory は同期。事前に loadCategory() でキャッシュしておく設計。
 */
export class LocalQuestionRepository implements IQuestionRepository {
  private cache = new Map<Category, Question[]>()
  private base = import.meta.env.BASE_URL

  async loadCategory(category: Category): Promise<void> {
    if (this.cache.has(category)) return

    if (WORDBANK_CATEGORIES.has(category)) {
      const dir = `${this.base}wordbank/${category}`
      const manifest = (await fetch(`${dir}/manifest.json`).then((r) => r.json())) as Manifest
      const parts = await Promise.all(
        manifest.levels.map((lv) => fetch(`${dir}/${lv.file}`).then((r) => r.json() as Promise<Question[]>)),
      )
      // 表現集（任意）: phrases.json があれば同カテゴリに追加（tags:['phrase',...]）
      const phrases = await fetch(`${dir}/phrases.json`)
        .then((r) => (r.ok ? (r.json() as Promise<Question[]>) : []))
        .catch(() => [] as Question[])
      this.cache.set(category, [...parts.flat(), ...phrases])
      return
    }

    // 未対応カテゴリ
    this.cache.set(category, [])
  }

  isLoaded(category: Category): boolean {
    return this.cache.has(category)
  }

  getByCategory(category: Category): Question[] {
    const list = this.cache.get(category) ?? []
    // verifiedOnly の間は、明示的に verified:false の語を除外する
    // (中国語など verified 未設定のものは出題対象として残す)
    if (featureFlags.verifiedOnly) return list.filter((q) => q.verified !== false)
    return list
  }

  getById(id: string): Question | undefined {
    for (const list of this.cache.values()) {
      const found = list.find((q) => q.id === id)
      if (found) return found
    }
    return undefined
  }
}
