import type { User, Question, Category } from '../types'

/**
 * Repository層のインターフェース。
 * UI/Core はこの抽象にのみ依存する。localStorage実装を注入し、
 * 将来 SupabaseUserRepository / SupabaseQuestionRepository に差し替えるだけで
 * サーバー移行できる（依存性逆転）。
 */

export interface IUserRepository {
  /** 保存済みユーザーを読み込む。無ければ null */
  load(): User | null
  /** ユーザーを永続化する */
  save(user: User): void
  /** データを消去する */
  clear(): void
}

export interface IQuestionRepository {
  /** 指定カテゴリの問題をロードしキャッシュする（JSON遅延読み込み等） */
  loadCategory(category: Category): Promise<void>
  /** カテゴリがロード済みか */
  isLoaded(category: Category): boolean
  /** ロード済みカテゴリの問題を同期取得（未ロードなら空配列） */
  getByCategory(category: Category): Question[]
  getById(id: string): Question | undefined
}
