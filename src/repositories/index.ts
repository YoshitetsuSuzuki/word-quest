import { LocalUserRepository } from './LocalUserRepository'
import { LocalQuestionRepository } from './LocalQuestionRepository'
import type { IUserRepository, IQuestionRepository } from './types'

/**
 * Repository の合成ポイント（Composition Root）。
 * サーバー移行時はここの実装を差し替えるだけでよい。
 * 例: export const userRepository: IUserRepository = new SupabaseUserRepository()
 */
export const userRepository: IUserRepository = new LocalUserRepository()
export const questionRepository: IQuestionRepository = new LocalQuestionRepository()

export type { IUserRepository, IQuestionRepository }
