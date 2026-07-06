/** 学習ストリークの設定(データ駆動)。数値・節目はここで調整する。 */
export const streakConfig = {
  /** この問数を1日に解くと「今日のスタンプ」獲得=ストリーク継続 */
  dailyGoal: 10,
  /** ストリークフリーズの価格と最大ストック */
  freezePrice: 500,
  freezeMax: 2,
  /** 節目報酬。titleId はショップ称号(limited)のid。nullはコインのみ。gem=ジェム付与 */
  milestones: [
    { days: 3, coin: 100, titleId: null, gem: 0 },
    { days: 7, coin: 300, titleId: 's-title-streak7', gem: 2 },
    { days: 14, coin: 600, titleId: null, gem: 3 },
    { days: 30, coin: 1500, titleId: 's-title-streak30', gem: 8 },
    { days: 50, coin: 3000, titleId: null, gem: 15 },
    { days: 100, coin: 8000, titleId: 's-title-streak100', gem: 40 },
    { days: 365, coin: 30000, titleId: 's-title-streak365', gem: 150 },
  ] as { days: number; coin: number; titleId: string | null; gem: number }[],
}
