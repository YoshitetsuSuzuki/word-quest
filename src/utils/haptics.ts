// 触覚フィードバック（対応端末のみ。iOS SafariのWeb版は非対応だがネイティブ化で効く）
function vibe(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    // 未対応環境は無視
  }
}

/** 正解: 短い1発 */
export const hapticCorrect = () => vibe(15)
/** 不正解: やや長め */
export const hapticWrong = () => vibe([0, 40, 30, 40])
/** コンボ節目: 弾むような連打 */
export const hapticCombo = () => vibe([0, 20, 40, 20, 40, 30])
