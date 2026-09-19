import type { Category } from '../../types'

/** フレンド1人の公開情報。サーバーから来る形をそのまま表す */
export interface FriendEntry {
  userId: string
  /** 表示名。未設定なら空文字（UI側で既定名にフォールバック） */
  displayName: string
  /** 連続学習日数 */
  streak: number
  /** 今週の学習語数 */
  weeklyWords: number
  /** 最後に学習した日（YYYY-MM-DD）。今日でなければ「まだ今日やっていない」 */
  lastStudyDate: string
  /** その人が今学んでいる言語 */
  category: Category
}

/** ランキング1行。自分の行も同じ形で並べる */
export interface RankRow extends FriendEntry {
  rank: number
  isMe: boolean
}

/** ランキングの軸 */
export type RankAxis = 'streak' | 'weeklyWords'

/** つつきの受信状況 */
export interface NudgeInbox {
  /** つついてきた人の表示名（重複なし） */
  fromNames: string[]
  /** 受け取ると貰えるコイン合計 */
  coin: number
}
