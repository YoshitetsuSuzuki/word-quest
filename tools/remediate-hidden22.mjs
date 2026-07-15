// ============================================================================
// remediate-hidden22.mjs  暫定非表示22件の例文復旧（採用条件を満たすもののみ）
//   採用: 辞書matched && 監査pass && confidence>=0.98 の候補のみ。
//   変更は example / exampleForm のみ。他フィールドは不変。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')
const wbDir = path.join(root, 'public', 'wordbank', 'english')
const cands = JSON.parse(fs.readFileSync(path.join(outDir, 'hidden22-example-candidates.json'), 'utf8'))
const reviews = JSON.parse(fs.readFileSync(path.join(outDir, 'hidden22-candidate-review.json'), 'utf8'))
const dict = JSON.parse(fs.readFileSync(path.join(root, 'audit', 'dictionary-check', 'hidden22-results.json'), 'utf8'))
const revById = new Map(reviews.map((r) => [r.id, r]))
const dictById = new Map(dict.map((d) => [d.id, d]))

// 実データ
const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
const fileCache = new Map(); const loc = new Map()
for (const lv of man.levels) { const p = path.join(wbDir, lv.file); const o = fs.readFileSync(p, 'utf8'); const arr = JSON.parse(o); fileCache.set(lv.file, { p, arr, roundTrip: JSON.stringify(arr) === o }); arr.forEach((e, i) => loc.set(e.id, { file: lv.file, idx: i })) }
const entryOf = (id) => { const L = loc.get(id); return fileCache.get(L.file).arr[L.idx] }

const proposed = [], applied = [], skipped = [], touched = new Set()
for (const c of cands) {
  const rev = revById.get(c.id); const d = dictById.get(c.id)
  const cand = rev.selected === 'B' ? c.candidateB : c.candidateA
  const eligible = d.dictionaryStatus === 'matched' && rev.selectedVerdict === 'pass' && rev.selectedConfidence >= 0.98
  const e = entryOf(c.id)
  const rec = { id: c.id, headword: c.headword, answer: c.answer, verifiedSense: c.verifiedSense, selectedCandidate: rev.selected, dictionaryStatus: d.dictionaryStatus, reviewVerdict: rev.selectedVerdict, confidence: rev.selectedConfidence,
    fieldChanges: [ { field: 'example', before: e.example, after: eligible ? cand.example : e.example }, { field: 'exampleForm', before: e.exampleForm, after: eligible ? cand.exampleForm : e.exampleForm } ],
    sourcesChecked: ['dictionaryapi.dev (Wiktionary CC-BY-SA)'], requiresHumanReview: !eligible }
  proposed.push(rec)
  if (eligible) {
    if (e.example !== '' ) throw new Error(`非表示状態でない ${c.id}`)
    e.example = cand.example; e.exampleForm = cand.exampleForm
    touched.add(loc.get(c.id).file)
    applied.push({ id: c.id, file: 'public/wordbank/english/' + loc.get(c.id).file, headword: c.headword, fieldChanges: [{ field: 'example', before: '', after: cand.example }, { field: 'exampleForm', before: '', after: cand.exampleForm }], verifiedSense: c.verifiedSense, sourcesChecked: rec.sourcesChecked, selectedCandidate: rev.selected, confidence: rev.selectedConfidence })
  } else {
    skipped.push({ id: c.id, headword: c.headword, reason: rev.selectedVerdict === 'reject' ? (rev.A.notes) : `監査 ${rev.selectedVerdict}・confidence ${rev.selectedConfidence}<0.98`, dictionaryStatus: d.dictionaryStatus, reviewVerdict: rev.selectedVerdict, confidence: rev.selectedConfidence, keptHidden: true, requiresHumanReview: true })
  }
}
for (const f of touched) { const fc = fileCache.get(f); if (!fc.roundTrip) throw new Error('round-trip非安全 ' + f); fs.writeFileSync(fc.p, JSON.stringify(fc.arr)) }

fs.writeFileSync(path.join(outDir, 'hidden22-fixes-proposed.json'), JSON.stringify(proposed, null, 2))
fs.writeFileSync(path.join(outDir, 'hidden22-fixes-applied.json'), JSON.stringify(applied, null, 2))
fs.writeFileSync(path.join(outDir, 'hidden22-fixes-skipped.json'), JSON.stringify(skipped, null, 2))

// 検証
const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
let total = 0, dup = 0, badC = 0, ansNot = 0, manifestOk = true; const ids = new Set()
for (const lang of LANGS) { const m = JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) { const arr = JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', lang, lv.file), 'utf8')); total += arr.length; if (typeof lv.count === 'number' && lv.count !== arr.length) manifestOk = false; for (const e of arr) { if (ids.has(e.id)) dup++; ids.add(e.id); if (!Array.isArray(e.choices) || e.choices.length !== 4) badC++; else if (!e.choices.includes(e.answer)) ansNot++ } } }

// 再監査
const reaudit = cands.map((c) => {
  const e = entryOf(c.id); const rev = revById.get(c.id); const ap = applied.find((a) => a.id === c.id)
  let status
  if (ap) status = 'resolved'
  else status = 'needs_human_review'
  return { id: c.id, headword: c.headword, answer: c.answer, exampleRestored: !!ap, currentExample: e.example || '(空・非表示維持)', dictionaryStatus: dictById.get(c.id).dictionaryStatus, reviewVerdict: rev.selectedVerdict, status }
})
fs.writeFileSync(path.join(outDir, 'hidden22-reaudit.json'), JSON.stringify(reaudit, null, 2))

console.log('提案', proposed.length, '/ 適用', applied.length, '/ 見送り', skipped.length)
console.log('検証: 総件数', total, total === 20131 ? 'OK' : 'NG', '| 重複', dup, '| manifest', manifestOk, '| choices≠4', badC, '| 正解∉choices', ansNot)
const st = {}; reaudit.forEach((r) => st[r.status] = (st[r.status] || 0) + 1); console.log('再監査:', JSON.stringify(st))
applied.forEach((a) => console.log('  適用:', a.id, a.headword, '→', a.fieldChanges[0].after))
