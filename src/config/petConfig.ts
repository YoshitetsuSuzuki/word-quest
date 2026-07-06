// ============================================================================
// petConfig.ts  学習相棒（育成キャラ）の設定データ
// コードを書き換えずにしきい値・段階を調整できるようにする。
// ============================================================================

/** 成長段階（1..5）。learnedQuestionIds.length がしきい値以上で昇格。 */
export const PET_STAGE_THRESHOLDS: number[] = [0, 10, 40, 120, 300]

export type PetStage = 1 | 2 | 3 | 4 | 5
export type PetMood = 'happy' | 'normal' | 'hungry' | 'sad'

/** 気分の日数しきい値（最終学習日からの経過日数）。 */
export const PET_MOOD_DAYS = {
  happyMax: 0, // 今日学習済み → ごきげん
  normalMax: 1, // 1日 → ふつう
  hungryMax: 2, // 2日 → おなかすいた
  // 3日以上 → しょんぼり
} as const
