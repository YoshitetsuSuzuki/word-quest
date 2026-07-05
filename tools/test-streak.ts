// StreakEngine の机上テスト — npx -y tsx tools/test-streak.ts で実行
import { applyStamp, daysBetween, reachedMilestones, type StreakState } from '../src/core/StreakEngine'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) {
    failed++
    console.error('FAIL', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want))
  } else console.log('ok  ', name)
}

const base: StreakState = { studyStreak: 5, longestStudyStreak: 8, lastStudyDate: '2026-07-05', streakFreezes: 1 }

eq('daysBetween', daysBetween('2026-07-05', '2026-07-06'), 1)
eq('連続日 +1', applyStamp(base, '2026-07-06').state.studyStreak, 6)
eq('連続日 longest更新なし', applyStamp(base, '2026-07-06').state.longestStudyStreak, 8)
eq('初回は1', applyStamp({ ...base, lastStudyDate: '', studyStreak: 0 }, '2026-07-06').state.studyStreak, 1)
eq('同日は変化なし', applyStamp(base, '2026-07-05').extended, false)
eq('巻き戻しは維持', applyStamp(base, '2026-07-04').state.studyStreak, 5)
const frozen = applyStamp(base, '2026-07-07') // 1日飛ばし・フリーズ1
eq('フリーズで継続', frozen.state.studyStreak, 6)
eq('フリーズ消費', frozen.state.streakFreezes, 0)
eq('フリーズ使用フラグ', frozen.usedFreeze, true)
eq('フリーズ無しはリセット', applyStamp({ ...base, streakFreezes: 0 }, '2026-07-07').state.studyStreak, 1)
eq('3日空きはフリーズ温存でリセット', applyStamp(base, '2026-07-08'), {
  state: { studyStreak: 1, longestStudyStreak: 8, lastStudyDate: '2026-07-08', streakFreezes: 1 },
  usedFreeze: false,
  extended: true,
})
eq('longest更新', applyStamp({ ...base, studyStreak: 8 }, '2026-07-06').state.longestStudyStreak, 9)
eq('節目: 7到達で3,7', reachedMilestones(7, []), [3, 7])
eq('節目: 受領済み除外', reachedMilestones(7, [3]), [7])
eq('節目: 未到達なし', reachedMilestones(2, []), [])

if (failed > 0) process.exit(1)
console.log('ALL PASS')
