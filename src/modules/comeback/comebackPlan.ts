/**
 * 離脱したユーザーへの復帰通知の段取り。
 *
 * 文面は「相棒が呼んでいる」体で書く。アプリが説教すると通知を切られるが、
 * 相棒が待っていると伝わると戻ってきてもらえる。日数が空くほど相棒の様子が
 * 変わっていき、長期になるほど「積み上げたものは残っている」ことを伝える。
 * ちりつも単語の強みはそこなので、1年後でも復帰の理由になる。
 *
 * 1日後は入れない。毎晩20時のリマインドと21:30のストリーク通知が既にあり、
 * 同じ日に3通届いてしまうため。
 */

/** 最終学習からの経過日数と、そのときの文面キー */
export interface ComebackStep {
  /** 最終学習日から何日後に出すか */
  days: number
  /** i18n のキー接尾辞（comeback.t3 / comeback.b3 のように使う） */
  key: string
}

export const COMEBACK_STEPS: ComebackStep[] = [
  { days: 3, key: 'd3' },
  { days: 7, key: 'd7' },
  { days: 14, key: 'd14' },
  { days: 30, key: 'm1' },
  { days: 60, key: 'm2' },
  { days: 90, key: 'm3' },
  { days: 120, key: 'm4' },
  { days: 150, key: 'm5' },
  { days: 180, key: 'm6' },
  { days: 365, key: 'y1' },
]

/** 復帰通知のID帯。他の通知（1001〜1003）と衝突させない */
export const COMEBACK_ID_BASE = 2000

/** 通知を出す時刻。夜すぎると開かれにくいので夕方に置く */
export const COMEBACK_HOUR = 18
export const COMEBACK_MINUTE = 30

/**
 * 各段の発火時刻を計算する。
 * 基準は「最後に学習した日」。既に過ぎている段は外す（過去には鳴らせない）。
 */
export function comebackSchedule(lastStudy: Date, now: Date = new Date()): { id: number; at: Date; key: string }[] {
  return COMEBACK_STEPS.map((s, i) => {
    const at = new Date(lastStudy)
    at.setDate(at.getDate() + s.days)
    at.setHours(COMEBACK_HOUR, COMEBACK_MINUTE, 0, 0)
    return { id: COMEBACK_ID_BASE + i, at, key: s.key }
  }).filter((x) => x.at.getTime() > now.getTime())
}
