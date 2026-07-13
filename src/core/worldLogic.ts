// ============================================================================
// 世界地図（冒険マップ）ロジック。レベル(級)を「エリア」に見立て、習得度で解放。
// タグライン「英単語で世界一へ」に沿って、勉強を"征服"の旅にする。
// ============================================================================
import type { Category, User } from '../types'
import type { QuestionEngine } from './QuestionEngine'

/** 次のエリアが解放される、直前エリアの習得率のしきい値 */
export const UNLOCK_THRESHOLD = 0.4

export interface Region {
  level: number
  name: string
  emoji: string
  total: number
  learned: number
  mastery: number // 0-1
  unlocked: boolean
  cleared: boolean // しきい値到達
}

/** エリアの見た目（レベル→名前・絵文字）。旅の情緒を出す。 */
const NODES: { name: string; emoji: string }[] = [
  { name: 'はじまりの草原', emoji: '🌱' },
  { name: 'みなと町', emoji: '⚓' },
  { name: '賢者の森', emoji: '🌲' },
  { name: '砂の遺跡', emoji: '🏜️' },
  { name: '氷の山', emoji: '🏔️' },
  { name: '空の神殿', emoji: '☁️' },
  { name: '星の王座', emoji: '👑' },
]
export function nodeInfo(level: number): { name: string; emoji: string } {
  return NODES[level - 1] ?? { name: `エリア${level}`, emoji: '🗺️' }
}

export function buildWorld(engine: QuestionEngine, category: Category, user: User): Region[] {
  const levels = engine.availableLevels(category)
  // 学習済みID→難易度別の学習数（このカテゴリのみ）
  const learnedByLevel = new Map<number, number>()
  for (const id of user.learnedQuestionIds) {
    const q = engine.getById(id)
    if (q && q.category === category) learnedByLevel.set(q.difficulty, (learnedByLevel.get(q.difficulty) ?? 0) + 1)
  }
  const regions: Region[] = []
  let prevCleared = true // 最初のエリアは常に解放
  for (const level of levels) {
    const total = engine.levelSize(category, level)
    const learned = Math.min(total, learnedByLevel.get(level) ?? 0)
    const mastery = total > 0 ? learned / total : 0
    const cleared = mastery >= UNLOCK_THRESHOLD
    const { name, emoji } = nodeInfo(level)
    regions.push({ level, name, emoji, total, learned, mastery, unlocked: prevCleared, cleared })
    prevCleared = cleared
  }
  return regions
}

/** 全体の到達度（世界制覇率, 0-1） */
export function worldProgress(regions: Region[]): number {
  const total = regions.reduce((s, r) => s + r.total, 0)
  const learned = regions.reduce((s, r) => s + r.learned, 0)
  return total > 0 ? learned / total : 0
}
