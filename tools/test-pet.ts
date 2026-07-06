// PetEngine の机上テスト — npx -y tsx tools/test-pet.ts で実行
import { petStage, petMood, diffDays, petView, nextStageAt } from '../src/core/PetEngine'
import { createDefaultUser } from '../src/state/defaultUser'
import type { User } from '../src/types'

let failed = 0
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) {
    failed++
    console.error('FAIL', name, 'got', JSON.stringify(got), 'want', JSON.stringify(want))
  } else console.log('ok  ', name)
}

// --- 成長段階の境界 ---
eq('stage 0語=1', petStage(0), 1)
eq('stage 9語=1', petStage(9), 1)
eq('stage 10語=2', petStage(10), 2)
eq('stage 39語=2', petStage(39), 2)
eq('stage 40語=3', petStage(40), 3)
eq('stage 120語=4', petStage(120), 4)
eq('stage 300語=5', petStage(300), 5)
eq('stage 9999語=5', petStage(9999), 5)
eq('next of 1', nextStageAt(1), 10)
eq('next of 5=null', nextStageAt(5), null)

// --- 日数差 ---
eq('diffDays 同日', diffDays('2026-07-06', '2026-07-06'), 0)
eq('diffDays 1日', diffDays('2026-07-06', '2026-07-05'), 1)
eq('diffDays 月跨ぎ', diffDays('2026-07-01', '2026-06-29'), 2)

// --- 気分（最終学習日からの経過日数）---
const today = '2026-07-06'
const withHistory = (day: string): User => ({ ...createDefaultUser('t'), dailyHistory: { [day]: 3 }, todayAnswered: 0, todayAnsweredDate: '2000-01-01' })
eq('mood 履歴なし=normal', petMood({ ...createDefaultUser('t'), todayAnswered: 0, todayAnsweredDate: '2000-01-01' }, today), 'normal')
eq('mood 今日=happy', petMood(withHistory('2026-07-06'), today), 'happy')
eq('mood 1日=normal', petMood(withHistory('2026-07-05'), today), 'normal')
eq('mood 2日=hungry', petMood(withHistory('2026-07-04'), today), 'hungry')
eq('mood 3日=sad', petMood(withHistory('2026-07-01'), today), 'sad')
eq('mood 今日回答(履歴未反映)=happy', petMood({ ...createDefaultUser('t'), dailyHistory: {}, todayAnswered: 2, todayAnsweredDate: today }, today), 'happy')

// --- ビュー（進捗・進化）---
const u45 = { ...createDefaultUser('t'), learnedQuestionIds: Array.from({ length: 45 }, (_, i) => `en-${i}`), petStageSeen: 2 }
const v = petView(u45, today)
eq('view stage 45語=3', v.stage, 3)
eq('view evolved(2→3)', v.evolved, true)
// 進捗: 40..120 の間で 45 → (45-40)/(120-40)=0.0625
eq('view progress', Math.round(v.progress * 10000) / 10000, 0.0625)
eq('view 最終段階 progress=1', petView({ ...createDefaultUser('t'), learnedQuestionIds: Array.from({ length: 300 }, (_, i) => `en-${i}`), petStageSeen: 5 }, today).progress, 1)
eq('view 新規(seen0)は非進化', petView({ ...createDefaultUser('t'), learnedQuestionIds: [], petStageSeen: 0 }, today).evolved, false)

if (failed) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
} else {
  console.log('\nPetEngine OK')
}
