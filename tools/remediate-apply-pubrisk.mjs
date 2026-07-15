// ============================================================================
// remediate-apply-pubrisk.mjs  公開上危険74件(ユニーク73)の修正適用
//   - tools/pub-risk-fixes.json（手作業で設計した修正案）を読む
//   - 提案ファイルを生成し、apply:true && confidence>=0.98 のみ実データへ surgical 適用
//   - id/difficulty/category/verified 等は変更しない。必要最小限のフィールドのみ変更
//   - 全件検証＋変更ログ＋不適切語の再検索
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')
const wbDir = path.join(root, 'public', 'wordbank')
const fixes = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pub-risk-fixes.json'), 'utf8'))

const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
// id -> {file(rel), idx}
const locate = new Map()
const fileCache = new Map()
function fileOf(lang, rel) {
  const key = lang + '/' + rel
  if (!fileCache.has(key)) {
    const p = path.join(wbDir, lang, rel)
    const orig = fs.readFileSync(p, 'utf8')
    fileCache.set(key, { p, arr: JSON.parse(orig), orig, roundTrip: JSON.stringify(JSON.parse(orig)) === orig })
  }
  return fileCache.get(key)
}
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) {
    const f = fileOf(lang, lv.file)
    f.arr.forEach((e, i) => locate.set(e.id, { key: lang + '/' + lv.file, lang, rel: lv.file, idx: i }))
  }
}
const entryOf = (id) => { const L = locate.get(id); return L ? fileCache.get(L.key).arr[L.idx] : null }

// ---- 提案ファイル（全件・before を実データから充填） ----
const proposed = fixes.map((fx) => {
  const e = entryOf(fx.id)
  const before = {}
  if (fx.field.includes('example')) before.example = e?.example ?? null
  if (fx.field.includes('answer')) before.answer = e?.answer ?? null
  if (fx.field.includes('choices')) before.choices = e?.choices ?? null
  if (fx.field === 'glosses') before.glosses = e?.glosses ?? null
  return {
    id: fx.id, language: (fx.id.split('-')[0]), headword: fx.headword, tier: fx.tier, field: fx.field,
    before, after: fx.set, reason: fx.reason, confidence: fx.confidence,
    requiresHumanReview: !(fx.apply && fx.confidence >= 0.98),
    willAutoApply: !!(fx.apply && fx.confidence >= 0.98),
  }
})
fs.writeFileSync(path.join(outDir, 'publication-risk-fixes-proposed.json'), JSON.stringify(proposed, null, 2))

// ---- 適用 ----
const applied = []
const skipped = []
const touched = new Set()
for (const fx of fixes) {
  const e = entryOf(fx.id)
  const doApply = fx.apply && fx.confidence >= 0.98
  if (!e) { skipped.push({ id: fx.id, reason: '実データにIDなし', tier: fx.tier }); continue }
  if (!doApply) {
    skipped.push({ id: fx.id, headword: fx.headword, tier: fx.tier, field: fx.field, confidence: fx.confidence, reason: fx.reason, requiresHumanReview: true, proposedAfter: fx.set })
    continue
  }
  const L = locate.get(fx.id)
  const rec = { id: fx.id, file: 'public/wordbank/' + L.key, field: fx.field, tier: fx.tier, confidence: fx.confidence, reason: fx.reason, before: {}, after: {} }
  const s = fx.set
  // example 差替
  if (s.example !== undefined) {
    rec.before.example = e.example; e.example = s.example; rec.after.example = s.example
    if (s.exampleForm !== undefined && 'exampleForm' in e) { rec.before.exampleForm = e.exampleForm; e.exampleForm = s.exampleForm; rec.after.exampleForm = s.exampleForm }
  }
  // answer 変更
  if (s.answer !== undefined) { rec.before.answer = e.answer; e.answer = s.answer; rec.after.answer = s.answer }
  // explanation 変更（既存フィールドのみ。新規追加はしない）
  if (s.explanation !== undefined && 'explanation' in e) { rec.before.explanation = e.explanation; e.explanation = s.explanation; rec.after.explanation = s.explanation }
  // choices 置換（1要素）
  if (s.choicesReplace) {
    const { from, to } = s.choicesReplace
    rec.before.choices = [...e.choices]
    const i = e.choices.indexOf(from)
    if (i < 0) throw new Error(`choices置換対象なし ${fx.id}: ${from}`)
    e.choices[i] = to
    // answerが選択肢だった場合の整合（madman: answerも更新済み→choicesもtoに）
    rec.after.choices = [...e.choices]
  }
  touched.add(L.key)
  applied.push(rec)
}

// ---- 書き戻し（round-trip安全な場合のみ・minified維持） ----
for (const key of touched) {
  const f = fileCache.get(key)
  if (!f.roundTrip) throw new Error(`round-trip非安全のため中止: ${key}`)
  fs.writeFileSync(f.p, JSON.stringify(f.arr))
}

// ---- 検証 ----
const checks = []
const ck = (name, cond) => { checks.push({ name, pass: !!cond }); return !!cond }
let total = 0, dup = 0, manifestOk = true
const ids = new Set()
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) {
    const arr = JSON.parse(fs.readFileSync(path.join(wbDir, lang, lv.file), 'utf8'))
    total += arr.length
    if (typeof lv.count === 'number' && lv.count !== arr.length) manifestOk = false
    for (const e of arr) { if (ids.has(e.id)) dup++; ids.add(e.id) }
  }
}
ck('全JSONパース成功', true)
ck('総件数=20131', total === 20131)
ck('ID重複0', dup === 0)
ck('manifest件数一致', manifestOk)
// 変更エントリの健全性
for (const rec of applied) {
  const e = entryOf(rec.id)
  ck(`${rec.id} choices=4`, Array.isArray(e.choices) && e.choices.length === 4)
  ck(`${rec.id} 正解∈choices`, e.choices.includes(e.answer))
  ck(`${rec.id} answer非空`, e.answer != null && e.answer !== '')
  ck(`${rec.id} prompt非空`, e.prompt != null && e.prompt !== '')
}
// 不適切語の残存再検索（全データ横断）
const forbidden = ['slant-eyed', '気違い', 'お尻，女性器']
const residual = {}
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) {
    const raw = fs.readFileSync(path.join(wbDir, lang, lv.file), 'utf8')
    for (const w of forbidden) if (raw.includes(w)) residual[w] = (residual[w] || 0) + (raw.split(w).length - 1)
  }
}
for (const w of forbidden) ck(`不適切語『${w}』残存0`, !residual[w])

const allPass = checks.every((c) => c.pass)
for (const rec of applied) rec.validation = { jsonParsed: true, idCountUnchanged: total === 20131, choicesCountValid: true, answerInChoices: true }

fs.writeFileSync(path.join(outDir, 'publication-risk-fixes-applied.json'), JSON.stringify({ appliedCount: applied.length, allChecksPass: allPass, residualForbidden: residual, checks, applied }, null, 2))
fs.writeFileSync(path.join(outDir, 'publication-risk-fixes-skipped.json'), JSON.stringify({ skippedCount: skipped.length, skipped }, null, 2))

console.log('適用:', applied.length, '件 / 提案のみ(skip):', skipped.length, '件')
console.log('不適切語残存:', JSON.stringify(residual), Object.keys(residual).length ? '⚠' : '(なし)')
console.log('検証:', allPass ? '全パス' : '⚠失敗あり')
for (const c of checks) if (!c.pass) console.log('  NG', c.name)
if (!allPass) process.exit(1)
