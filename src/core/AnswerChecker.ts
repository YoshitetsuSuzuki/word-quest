import type { Question } from '../types'

/** 正誤判定のみを担う（英単語非依存の汎用ロジック） */
export const AnswerChecker = {
  check(question: Question, selected: string): { correct: boolean; correctAnswer: string } {
    return {
      correct: selected === question.answer,
      correctAnswer: question.answer,
    }
  },
}
