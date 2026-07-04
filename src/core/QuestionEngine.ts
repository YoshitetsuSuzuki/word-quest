import type { Question, Category } from '../types'
import type { IQuestionRepository } from '../repositories/types'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 出題エンジン（汎用）。
 * QuestionRepository から問題を引き、出題順・選択肢順を制御する。
 * category を変えるだけで英語以外のジャンルにも使える。
 */
export class QuestionEngine {
  constructor(private repo: IQuestionRepository) {}

  /** 選択肢をシャッフルした問題を返す（表示直前に呼ぶ） */
  private withShuffledChoices(q: Question): Question {
    return { ...q, choices: shuffle(q.choices) }
  }

  /** カテゴリの全問題（選択肢シャッフル済み）をランダム順で返す */
  buildSession(category: Category, count: number): Question[] {
    const all = this.repo.getByCategory(category)
    return shuffle(all).slice(0, count).map((q) => this.withShuffledChoices(q))
  }

  /** 指定IDリストから復習セッションを作る（間隔反復の期限到来分など） */
  buildReviewSession(ids: string[], count: number): Question[] {
    const picked: Question[] = []
    for (const id of ids) {
      const q = this.repo.getById(id)
      if (q) picked.push(this.withShuffledChoices(q))
      if (picked.length >= count) break
    }
    return picked
  }

  getById(id: string): Question | undefined {
    return this.repo.getById(id)
  }
}
