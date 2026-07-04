import type { Question, Category, Difficulty } from '../types'

/** 各ジャンル共通の問題シード。prompt生成を関数で受け取り汎用化する。 */
export interface WordSeed {
  word: string
  meaning: string
  distractors: [string, string, string]
  difficulty: Difficulty
  tags: string[]
  example?: string
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * シード配列から Question[] を生成する共通ビルダー。
 * ジャンルを増やす際はこの関数に seeds を渡すだけでよい。
 */
export function buildQuestions(
  category: Category,
  idPrefix: string,
  seeds: WordSeed[],
  makePrompt: (word: string) => string,
): Question[] {
  return seeds.map((s, i) => ({
    id: `${idPrefix}-${String(i + 1).padStart(3, '0')}`,
    category,
    prompt: makePrompt(s.word),
    answer: s.meaning,
    choices: shuffle([s.meaning, ...s.distractors]),
    difficulty: s.difficulty,
    tags: s.tags,
    explanation: `${s.word} = ${s.meaning}`,
    example: s.example,
  }))
}
