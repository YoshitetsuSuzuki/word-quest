import type { Question, Category } from '../types'
import type { IQuestionRepository } from './types'
import { chineseQuestions } from '../data/questions.chinese'
import { featureFlags } from '../config/featureFlags'

interface Manifest {
  category: string
  total: number
  levels: { level: number; file: string; count: number }[]
}

/**
 * 問題データの供給元。
 * - english: public/wordbank/english/ の生成済みJSONを級別に遅延ロード（大規模対応）
 * - chinese: 少量のためバンドル同梱（将来はenglishと同様にJSON化可能）
 *
 * getByCategory は同期。事前に loadCategory() でキャッシュしておく設計。
 */
export class LocalQuestionRepository implements IQuestionRepository {
  private cache = new Map<Category, Question[]>()
  private base = import.meta.env.BASE_URL

  async loadCategory(category: Category): Promise<void> {
    if (this.cache.has(category)) return

    if (category === 'chinese') {
      this.cache.set('chinese', chineseQuestions)
      return
    }

    if (category === 'english') {
      const manifest = (await fetch(`${this.base}wordbank/english/manifest.json`).then((r) => r.json())) as Manifest
      const parts = await Promise.all(
        manifest.levels.map((lv) => fetch(`${this.base}wordbank/english/${lv.file}`).then((r) => r.json() as Promise<Question[]>)),
      )
      this.cache.set('english', parts.flat())
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
