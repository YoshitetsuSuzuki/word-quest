import type { User } from '../types'
import type { IUserRepository } from './types'

const STORAGE_KEY = 'wordquest.user.v1'

/**
 * localStorage を使ったユーザー永続化実装。
 * save/load をこのクラスに閉じ込めることで、将来 Supabase 実装へ
 * 差し替えても UI/Core は無変更で済む。
 */
export class LocalUserRepository implements IUserRepository {
  load(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw) as User
    } catch {
      return null
    }
  }

  save(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    } catch {
      // 容量超過等は握りつぶす（MVP方針）
    }
  }

  clear(): void {
    localStorage.removeItem(STORAGE_KEY)
  }
}
