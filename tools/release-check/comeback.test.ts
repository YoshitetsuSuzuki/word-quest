// 復帰通知のスケジュール計算の検証。`npx tsx` で単体実行する。
import { comebackSchedule, COMEBACK_STEPS, COMEBACK_ID_BASE, COMEBACK_HOUR } from '../../src/modules/comeback/comebackPlan'

let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failed++; console.log(`  NG  ${name}${detail ? ' — ' + detail : ''}`) }
  else console.log(`  ok  ${name}`)
}
const d = (s: string) => new Date(`${s}T00:00:00`)

console.log('■ 基本')
{
  const now = d('2026-09-20')
  const s = comebackSchedule(d('2026-09-20'), now)
  check('10段すべて予約される', s.length === COMEBACK_STEPS.length, `${s.length}`)
  check('IDが 2000 から連番', s[0].id === COMEBACK_ID_BASE && s[1].id === COMEBACK_ID_BASE + 1)
  check('1本目は3日後', s[0].at.toISOString().slice(0, 10) === '2026-09-23', s[0].at.toISOString())
  check('最後は365日後', s[s.length - 1].at.toISOString().slice(0, 10) === '2027-09-20', s[s.length - 1].at.toISOString())
  check('時刻は夕方', s[0].at.getHours() === COMEBACK_HOUR)
  check('日付順に並ぶ', s.every((x, i) => i === 0 || x.at >= s[i - 1].at))
}

console.log('■ 既に過ぎた段は外れる')
{
  // 最終学習から40日経っている人。3日/7日/14日/30日の段は過去なので出ない
  const s = comebackSchedule(d('2026-08-11'), d('2026-09-20'))
  check('残るのは60日以降の6段', s.length === 6, `${s.length}`)
  check('先頭は60日後', s[0].at.toISOString().slice(0, 10) === '2026-10-10', s[0].at.toISOString())
  check('過去の日付を含まない', s.every((x) => x.at.getTime() > d('2026-09-20').getTime()))
}

console.log('■ 1年以上あいたら何も出ない')
{
  const s = comebackSchedule(d('2024-01-01'), d('2026-09-20'))
  check('予約ゼロ', s.length === 0, `${s.length}`)
}

console.log('■ 1日後は含まない（既存の毎日通知と重ならないこと）')
{
  const s = comebackSchedule(d('2026-09-20'), d('2026-09-20'))
  check('翌日に鳴る段が無い', !s.some((x) => x.at.toISOString().slice(0, 10) === '2026-09-21'))
}

console.log('■ iOS の保留上限(64)に収まる')
{
  check('既存3本と合わせても十分', COMEBACK_STEPS.length + 3 <= 64, `${COMEBACK_STEPS.length + 3}`)
}

console.log(failed === 0 ? '\nPASS' : `\nFAIL (${failed}件)`)
process.exit(failed === 0 ? 0 : 1)
