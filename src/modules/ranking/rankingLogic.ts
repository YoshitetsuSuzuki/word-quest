import type { User, RankingKind, RankingEntry } from '../../types'
import { mockPlayers } from '../../data/ranking.mock'

/**
 * ランキング組み立て（ダミー）。
 * mockPlayers に自分を差し込んでソートする。将来 RankingRepository を
 * Supabase実装に差し替えればサーバーランキングへ移行できる。
 */
export function buildRanking(user: User, kind: RankingKind): RankingEntry[] {
  const myValue =
    kind === 'coin'
      ? user.lifetimeCoin // 累計獲得（使っても下がらない）
      : kind === 'elo'
        ? user.eloRating
        : kind === 'todayCoin'
          ? user.todayCoin
          : user.totalCorrect

  const entries: RankingEntry[] = mockPlayers.map((p) => ({
    id: p.id,
    name: p.name,
    value: kind === 'coin' ? p.coin : kind === 'elo' ? p.elo : kind === 'todayCoin' ? p.todayCoin : p.totalCorrect,
  }))

  entries.push({ id: user.id, name: user.name, value: myValue, isMe: true })
  entries.sort((a, b) => b.value - a.value)
  return entries
}

/** 自分の順位（1始まり）を返す */
export function myRank(entries: RankingEntry[]): number {
  return entries.findIndex((e) => e.isMe) + 1
}
