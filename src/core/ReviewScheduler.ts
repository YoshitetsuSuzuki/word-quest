import type { ReviewItem } from '../types'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Anki式簡易間隔反復（SM-2 lite）。
 * 間違えた問題を復習キューに入れ、正解を重ねるほど間隔を伸ばす。
 */
export const ReviewScheduler = {
  /** 新規に復習アイテムを作る（初期は翌日復習） */
  create(questionId: string, now: number = Date.now()): ReviewItem {
    return {
      questionId,
      nextReviewAt: now + DAY_MS,
      intervalDays: 1,
      repetitions: 0,
      easeFactor: 2.5,
    }
  },

  /**
   * 復習結果を反映して次回予定を更新する。
   * @param correct 今回正解したか
   */
  review(item: ReviewItem, correct: boolean, now: number = Date.now()): ReviewItem {
    if (!correct) {
      // 不正解: リセットして翌日また復習
      return { ...item, repetitions: 0, intervalDays: 1, nextReviewAt: now + DAY_MS, easeFactor: Math.max(1.3, item.easeFactor - 0.2) }
    }
    const repetitions = item.repetitions + 1
    let intervalDays: number
    if (repetitions === 1) intervalDays = 1
    else if (repetitions === 2) intervalDays = 3
    else intervalDays = Math.round(item.intervalDays * item.easeFactor)

    const easeFactor = Math.min(3.0, item.easeFactor + 0.1)
    return { ...item, repetitions, intervalDays, easeFactor, nextReviewAt: now + intervalDays * DAY_MS }
  },

  /** 期限が到来している復習アイテムのquestionIdを返す */
  dueQuestionIds(queue: ReviewItem[], now: number = Date.now()): string[] {
    return queue.filter((i) => i.nextReviewAt <= now).map((i) => i.questionId)
  },
}
