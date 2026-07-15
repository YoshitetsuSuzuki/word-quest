// ============================================================================
// remediate-final-review.mjs  needs_human_review 32件の最終整理
//   第2段階: A/B/C 3分類
//   第3段階: Bのみ元データへ適用（提案例文が明確・安全・語義一致・conf>=0.98）
//   第4段階: C(英語)の明確に誤った例文を暫定非表示(example/exampleForm を空文字)
//            → QuestionEngineが例文/クローズ/リスニング問題から自動除外・UIも非表示
//            pivot(例文なし)は変更せず辞書確認保留として一覧化
//   id/difficulty/category/verified/tags/pronunciation/answer/choices は変更しない
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')
const wbDir = path.join(root, 'public', 'wordbank')
const reaudit = JSON.parse(fs.readFileSync(path.join(outDir, 'publication-risk-reaudit.json'), 'utf8'))
const proposed = JSON.parse(fs.readFileSync(path.join(outDir, 'publication-risk-fixes-proposed.json'), 'utf8'))
const propById = new Map(proposed.map((p) => [p.id, p]))

const NHR = [...new Set(reaudit.filter((r) => r.status === 'needs_human_review').map((r) => r.id))]

// --- 分類定義（実データ再確認に基づく手動判断） ---
// B: 提案例文が明確・自然・安全・固有名詞非依存・単一語義・conf>=0.98 と再評価できたもの
const B_IDS = new Set(['en-02944', 'en-06006', 'en-06240', 'en-06502', 'en-21117']) // august, chi, turner, mounting, warmer
// pivot(例文フィールドなし): 語義/answer変更は辞書確認要・不快語ではない → 変更せず保留
const PIVOT_IDS = new Set(['es-00432', 'es-01405', 'fr-00092', 'fr-00645', 'fr-01022'])
// A: 現状のまま公開可能（現例文が正しく安全） → 今回は該当なし(英27件は全て現例文が誤り)

const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const loc = new Map(); const fileCache = new Map()
function fileOf(lang, rel) {
  const key = lang + '/' + rel
  if (!fileCache.has(key)) { const p = path.join(wbDir, lang, rel); const orig = fs.readFileSync(p, 'utf8'); fileCache.set(key, { p, arr: JSON.parse(orig), roundTrip: JSON.stringify(JSON.parse(orig)) === orig }) }
  return fileCache.get(key)
}
for (const lang of LANGS) { const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8')); for (const lv of man.levels) { const f = fileOf(lang, lv.file); f.arr.forEach((e, i) => loc.set(e.id, { key: lang + '/' + lv.file, idx: i })) } }
const entryOf = (id) => { const L = loc.get(id); return fileCache.get(L.key).arr[L.idx] }
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

const catA = [], catB = [], catC = []
for (const id of NHR) {
  const e = entryOf(id); const p = propById.get(id)
  const base = { id, language: id.split('-')[0], headword: hw(e), answer: e.answer, currentExample: ('example' in e) ? e.example : null, proposed: p ? p.after : null, confidence: p ? p.confidence : null }
  if (B_IDS.has(id)) catB.push({ ...base, decision: 'apply_proposed' })
  else if (PIVOT_IDS.has(id)) catC.push({ ...base, cType: 'pivot_gloss_dictionary_required', note: '例文フィールドなし・不快語ではない。answer/glosses変更は辞書確認要のため現状維持。', hideExample: false })
  else catC.push({ ...base, cType: 'wrong_example_hidden', note: '現例文が登録語義と不一致。確定まで例文を暫定非表示。', hideExample: true })
}
fs.writeFileSync(path.join(outDir, 'final-review-A-no-change.json'), JSON.stringify(catA, null, 2))
fs.writeFileSync(path.join(outDir, 'final-review-B-apply.json'), JSON.stringify(catB, null, 2))
fs.writeFileSync(path.join(outDir, 'final-review-C-dictionary.json'), JSON.stringify(catC, null, 2))

// --- 第3段階: B適用 ---
const applied = []
const touched = new Set()
for (const b of catB) {
  const e = entryOf(b.id); const p = propById.get(b.id); const after = p.after
  if (!after || after.example === undefined) throw new Error(`B提案なし ${b.id}`)
  const rec = { id: b.id, file: 'public/wordbank/' + loc.get(b.id).key, field: 'example', before: {}, after: {}, reason: p.reason, confidence: 0.98 }
  rec.before.example = e.example; e.example = after.example; rec.after.example = after.example
  if (after.exampleForm !== undefined && 'exampleForm' in e) { rec.before.exampleForm = e.exampleForm; e.exampleForm = after.exampleForm; rec.after.exampleForm = after.exampleForm }
  applied.push(rec); touched.add(loc.get(b.id).key)
}

// --- 第4段階: C(英語・誤例文)の暫定非表示 ---
const hidden = []
for (const c of catC) {
  if (!c.hideExample) continue
  const e = entryOf(c.id)
  const rec = { id: c.id, file: 'public/wordbank/' + loc.get(c.id).key, before: { example: e.example, exampleForm: ('exampleForm' in e) ? e.exampleForm : undefined }, after: { example: '', exampleForm: '' }, reason: '登録語義と不一致の例文を確定まで暫定非表示(空文字)。QuestionEngineが例文問題から自動除外・UI非表示。' }
  e.example = ''
  if ('exampleForm' in e) e.exampleForm = ''
  hidden.push(rec); touched.add(loc.get(c.id).key)
}

// 書き戻し
for (const key of touched) { const f = fileCache.get(key); if (!f.roundTrip) throw new Error('round-trip非安全: ' + key); fs.writeFileSync(f.p, JSON.stringify(f.arr)) }

fs.writeFileSync(path.join(outDir, 'final-review-applied.json'), JSON.stringify({ appliedB: applied.length, hiddenC: hidden.length, applied, hidden }, null, 2))
fs.writeFileSync(path.join(outDir, 'temporarily-hidden-examples.json'), JSON.stringify(hidden.map((h) => ({ id: h.id, hiddenExample: h.before.example, method: 'example="" exampleForm=""', reversible: true })), null, 2))

// publication-blockers: 暫定非表示(英)＋辞書保留(pivot)
const blockers = [
  ...hidden.map((h) => ({ id: h.id, type: 'wrong_example_temporarily_hidden', status: 'example_hidden', offensive: false, needs: 'dictionary_or_human_example', note: h.before.example })),
  ...catC.filter((c) => !c.hideExample).map((c) => ({ id: c.id, type: 'pivot_translation_imprecision', status: 'live_unchanged', offensive: false, needs: 'dictionary_confirmation_of_gloss_answer', note: `${c.headword}: answer=${c.answer}, glosses要確認` })),
]
fs.writeFileSync(path.join(outDir, 'publication-blockers.json'), JSON.stringify(blockers, null, 2))

console.log('分類: A(現状可)', catA.length, '/ B(適用)', catB.length, '/ C(辞書・人手)', catC.length, '  計', catA.length + catB.length + catC.length)
console.log('B適用:', applied.length, '件 / C暫定非表示(英):', hidden.length, '件 / pivot保留:', catC.filter((c) => !c.hideExample).length, '件')
