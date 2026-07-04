/** ローカル日付を YYYY-MM-DD で返す */
export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 昨日の日付文字列 */
export function yesterdayStr(d: Date = new Date()): string {
  const y = new Date(d)
  y.setDate(y.getDate() - 1)
  return todayStr(y)
}
