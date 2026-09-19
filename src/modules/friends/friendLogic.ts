// フレンド機能の純関数ロジック。UI・サーバーに依存しないので机上でテストできる。
import type { FriendEntry, RankRow, RankAxis } from './friendTypes'

/** つついた側/つつかれた側の報酬。双方に得があるので声を掛け合う動機になる */
export const NUDGE_COIN_RECEIVER = 10
export const NUDGE_COIN_SENDER = 5

/**
 * 自分＋フレンドを1本のランキングに並べる。
 * 言語で割らないのは、友達同士の比較が目的で、言語別にすると
 * 同じ言語をやっている友達としか並べなくなるため。
 */
export function buildRanking(me: FriendEntry, friends: FriendEntry[], axis: RankAxis): RankRow[] {
  const all = [me, ...friends.filter((f) => f.userId !== me.userId)]
  const value = (e: FriendEntry) => (axis === 'streak' ? e.streak : e.weeklyWords)
  const sorted = [...all].sort((a, b) => {
    const d = value(b) - value(a)
    if (d !== 0) return d
    // 同点は「もう一方の軸」で割る。それも同じなら表示名で安定させる
    const other = axis === 'streak' ? b.weeklyWords - a.weeklyWords : b.streak - a.streak
    if (other !== 0) return other
    return a.displayName.localeCompare(b.displayName)
  })
  // 同値は同順位（1,1,3 方式）。人数が少ないので素直に前から見る
  const rows: RankRow[] = []
  let lastVal = Number.NaN
  let lastRank = 0
  sorted.forEach((e, i) => {
    const v = value(e)
    const rank = v === lastVal ? lastRank : i + 1
    lastVal = v
    lastRank = rank
    rows.push({ ...e, rank, isMe: e.userId === me.userId })
  })
  return rows
}

/** 今日まだ学習していないフレンド（＝つついてあげたい相手） */
export function notStudiedToday(friends: FriendEntry[], today: string): FriendEntry[] {
  return friends.filter((f) => f.lastStudyDate !== today)
}

/** その相手を今日もうつついたか */
export function alreadyNudged(sentToday: string[], friendId: string): boolean {
  return sentToday.includes(friendId)
}

/**
 * フレンドコードを端末内で発行する。
 * サーバーに採番させると未接続時にコードを表示できないため端末側で作る。
 * 8桁・紛らわしい文字(0/O/1/I)を除いた英数字。衝突はサーバー登録時に弾く。
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export function generateFriendCode(): string {
  let out = ''
  const buf = new Uint8Array(8)
  crypto.getRandomValues(buf)
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length]
  return out
}

/** 入力されたコードを正規化（小文字・空白・ハイフンを吸収） */
export function normalizeFriendCode(raw: string): string {
  return raw.toUpperCase().replace(/[^0-9A-Z]/g, '')
}
