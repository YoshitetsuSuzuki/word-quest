// ============================================================================
// 週次リーグ（Duolingo式）。同ランク帯で1週間ポイントを競い、上位は昇格・下位は降格。
// 対戦相手は週の起点＋階級から決定的に生成（サーバー不要）。将来サーバー実装に差し替え可能。
// ============================================================================
import type { User } from '../../types'

export interface League {
  name: string
  emoji: string
}
/** 0..5 の6階級 */
export const LEAGUES: League[] = [
  { name: 'ブロンズ', emoji: '🥉' },
  { name: 'シルバー', emoji: '🥈' },
  { name: 'ゴールド', emoji: '🥇' },
  { name: 'サファイア', emoji: '💠' },
  { name: 'ルビー', emoji: '🔴' },
  { name: 'ダイヤモンド', emoji: '💎' },
]
export const MAX_TIER = LEAGUES.length - 1
/** 昇格圏(上位)・降格圏(下位)の人数 */
export const PROMOTE_ZONE = 5
export const RELEGATE_ZONE = 5
/** 1リーグの人数（自分を含む） */
const LEAGUE_SIZE = 15

export interface Standing {
  id: string
  name: string
  points: number
  isMe?: boolean
}

// ---- 日付: その週の月曜(YYYY-MM-DD) ----
function parseDay(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}
function fmt(dt: Date): string {
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
export function weekStartOf(dateStr: string): string {
  const dt = parseDay(dateStr)
  const dow = (dt.getUTCDay() + 6) % 7 // 月曜=0
  dt.setUTCDate(dt.getUTCDate() - dow)
  return fmt(dt)
}
/** 週末(日曜)までの残り日数（今日を含む） */
export function daysLeftInWeek(today: string): number {
  const dt = parseDay(today)
  const dow = (dt.getUTCDay() + 6) % 7
  return 7 - dow
}

// ---- 決定的な擬似乱数 ----
function seedFrom(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const NAMES = [
  'Haru', 'Yuki', 'Sora', 'Ren', 'Mio', 'Kai', 'Aoi', 'Riku', 'Hana', 'Taro',
  'Emma', 'Liam', 'Noah', 'Mia', 'Leo', 'Zoe', 'Max', 'Ivy', 'Finn', 'Luna',
  'Chen', 'Min', 'Jin', 'Yui', 'Ken', 'Rin', 'Sana', 'Dan', 'Nao', 'Lily',
]

/** その週・その階級の対戦相手(自分以外)を決定的に生成 */
function opponentsFor(weekStart: string, tier: number, count: number): Standing[] {
  const rng = mulberry32(seedFrom(`${weekStart}#${tier}`))
  // 階級が上がるほど平均ポイントが高い（手強くなる）
  const baseline = 120 + tier * 90
  const used = new Set<number>()
  const out: Standing[] = []
  for (let i = 0; i < count; i++) {
    let ni = Math.floor(rng() * NAMES.length)
    while (used.has(ni)) ni = (ni + 1) % NAMES.length
    used.add(ni)
    const pts = Math.max(0, Math.round(baseline * (0.4 + rng() * 1.5)))
    out.push({ id: `cpu-${tier}-${i}`, name: NAMES[ni], points: pts })
  }
  return out
}

/** 現在の順位表（自分＋相手をポイント降順） */
export function standings(user: User): Standing[] {
  const opps = opponentsFor(user.weekStart, user.leagueTier, LEAGUE_SIZE - 1)
  const all: Standing[] = [
    ...opps,
    { id: user.id, name: user.name, points: user.weeklyPoints, isMe: true },
  ]
  all.sort((a, b) => b.points - a.points || (a.isMe ? -1 : 1))
  return all
}
export function myRank(list: Standing[]): number {
  return list.findIndex((s) => s.isMe) + 1
}

export interface LeagueSettleResult {
  user: User
  /** 週が替わって精算した場合の結果（初回や同週は null） */
  outcome: { promoted: boolean; relegated: boolean; rank: number; fromTier: number; toTier: number } | null
}

/**
 * 週替わりの精算：終了週の最終順位で昇降格し、今週分をリセットする。
 * 起動時に一度呼ぶ（settlePetDecay と同様）。
 */
export function settleLeague(user: User, today: string): LeagueSettleResult {
  const curWeek = weekStartOf(today)
  if (user.weekStart === curWeek) return { user, outcome: null }

  // 終了した週の最終順位を（その週の相手で）再現して昇降格を決める
  const list = standings(user)
  const rank = myRank(list)
  const fromTier = user.leagueTier
  let toTier = fromTier
  let promoted = false
  let relegated = false
  if (fromTier < MAX_TIER && rank <= PROMOTE_ZONE) {
    toTier = fromTier + 1
    promoted = true
  } else if (fromTier > 0 && rank > LEAGUE_SIZE - RELEGATE_ZONE) {
    toTier = fromTier - 1
    relegated = true
  }
  const settled: User = { ...user, leagueTier: toTier, weeklyPoints: 0, weekStart: curWeek }
  return { user: settled, outcome: { promoted, relegated, rank, fromTier, toTier } }
}
