// PetEngine の机上テスト — npx -y tsx tools/test-pet.ts で実行
import {
  levelFromXp,
  xpForLevel,
  xpToNext,
  petForm,
  levelProgress,
  petMood,
  diffDays,
  addDays,
  settlePetDecay,
  petView,
  PET_MAX_XP,
} from '../src/core/PetEngine'
import { PET_MAX_LEVEL, PET_DECAY_PER_DAY } from '../src/config/petConfig'
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

// --- XP↔レベル ---
eq('Lv1 = 0xp', levelFromXp(0), 1)
eq('Lv1 直前', levelFromXp(xpToNext(1) - 1), 1)
eq('Lv2 到達', levelFromXp(xpToNext(1)), 2)
eq('xpForLevel(1)=0', xpForLevel(1), 0)
eq('xpForLevel(2)=xpToNext(1)', xpForLevel(2), xpToNext(1))
eq('Lv100で頭打ち', levelFromXp(PET_MAX_XP), PET_MAX_LEVEL)
eq('Lv100超過も100', levelFromXp(PET_MAX_XP + 99999), PET_MAX_LEVEL)

// --- 進捗 ---
const p = levelProgress(xpForLevel(3) + 5)
eq('progress level', p.level, 3)
eq('progress into', p.into, 5)
eq('progress need', p.need, xpToNext(3))

// --- フォーム(大進化 1/20/50/80) ---
eq('form Lv1', petForm(1), 1)
eq('form Lv19', petForm(19), 1)
eq('form Lv20', petForm(20), 2)
eq('form Lv49', petForm(49), 2)
eq('form Lv50', petForm(50), 3)
eq('form Lv80', petForm(80), 4)
eq('form Lv99', petForm(99), 4)
eq('form Lv100=究極体', petForm(100), 5)

// --- 日付 ---
eq('diffDays', diffDays('2026-07-06', '2026-07-04'), 2)
eq('addDays +3', addDays('2026-07-06', 3), '2026-07-09')
eq('addDays -1 月跨ぎ', addDays('2026-07-01', -1), '2026-06-30')

// --- 減衰: 完了した「学習しなかった日」だけ引く。当日は未評価 ---
const today = '2026-07-06'
function petUser(over: Partial<User['pets'][number]>, hist: Record<string, number> = {}): User {
  return { ...createDefaultUser('t'), pets: [{ species: 'green', xp: 1000, lastTickDate: '', formSeen: 1, ...over }], activePet: 0, dailyHistory: hist }
}
const ap = (u: User) => u.pets[u.activePet]
// 新規(lastTickは前日基準)=遡って罰しない
eq('新規は減衰なし', ap(settlePetDecay(petUser({ lastTickDate: '' }), today)).xp, 1000)
eq('新規 lastTick=前日', ap(settlePetDecay(petUser({ lastTickDate: '' }), today)).lastTickDate, '2026-07-05')
// from=07-03 → 完了日 07-04,07-05 の2日。両方未学習 → 2*DECAY 減
eq('2日サボりで2回減衰', ap(settlePetDecay(petUser({ lastTickDate: '2026-07-03', xp: 1000 }), today)).xp, 1000 - 2 * PET_DECAY_PER_DAY)
// 07-04 に学習していれば1日ぶんだけ
eq('学習日は減衰しない', ap(settlePetDecay(petUser({ lastTickDate: '2026-07-03', xp: 1000 }, { '2026-07-04': 5 }), today)).xp, 1000 - 1 * PET_DECAY_PER_DAY)
// 同日再実行は追加減衰しない(lastTick=前日で固定)
const once = settlePetDecay(petUser({ lastTickDate: '2026-07-03', xp: 1000 }), today)
eq('同日2回目は不変', ap(settlePetDecay(once, today)).xp, ap(once).xp)
// xpは0未満にならない
eq('下限0', ap(settlePetDecay(petUser({ lastTickDate: '2026-06-01', xp: 10 }), today)).xp, 0)
// 控え(非アクティブ)は減衰しない
const twoPets: User = { ...createDefaultUser('t'), pets: [{ species: 'green', xp: 1000, lastTickDate: '2026-07-03', formSeen: 1 }, { species: 'fire', xp: 800, lastTickDate: '2026-07-03', formSeen: 1 }], activePet: 0, dailyHistory: {} }
eq('控えのXPは不変', settlePetDecay(twoPets, today).pets[1].xp, 800)

// --- mood ---
eq('mood 履歴なし=normal', petMood({ ...createDefaultUser('t'), todayAnswered: 0, todayAnsweredDate: '2000-01-01' }, today), 'normal')

// --- view ---
const v = petView(petUser({ species: 'fire', xp: xpForLevel(21) + 1, formSeen: 1 }), today)
eq('view species', v.species, 'fire')
eq('view level', v.level, 21)
eq('view form', v.form, 2)
eq('view evolved(1→2)', v.evolved, true)
eq('view 未選択', petView(petUser({ species: null }), today).species, null)

if (failed) {
  console.error(`\n${failed} test(s) failed`)
  process.exit(1)
} else {
  console.log('\nPetEngine OK')
}
