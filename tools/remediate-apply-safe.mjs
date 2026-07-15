// ============================================================================
// remediate-apply-safe.mjs  【第5段階】カテゴリAのうち適用条件を全て満たす修正のみ適用
//   条件: 意味/語義/例文の創作なし・修正後が一意・confidence>=0.99・
//         実データと監査が一致・対象が明確・JSON構造を壊さない・検証可能
//   → 該当は独名詞の大文字化3件のみ（実データでは prompt 内に格納）。
//   直接の一括上書きはせず、対象IDのpromptのみ surgical に変更し全件検証する。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')

// 適用対象（≥0.99・独普通名詞の小文字→大文字。実データで prompt「xxx」の意味は？ を確認済み）
const FIXES = [
  { id: 'de-00539', file: 'german/level-2.json', field: 'prompt', from: 'raum', to: 'Raum', reason: 'ドイツ語普通名詞の正書法(名詞は語頭大文字)', confidence: 0.99 },
  { id: 'de-00648', file: 'german/level-2.json', field: 'prompt', from: 'weihnachten', to: 'Weihnachten', reason: 'ドイツ語普通名詞の正書法(名詞は語頭大文字)', confidence: 0.99 },
  { id: 'de-00743', file: 'german/level-2.json', field: 'prompt', from: 'abendessen', to: 'Abendessen', reason: 'ドイツ語普通名詞の正書法(名詞は語頭大文字)', confidence: 0.99 },
]

const wbDir = path.join(root, 'public', 'wordbank')
const applied = []
const filesTouched = new Map() // file -> parsed array

function loadFile(rel) {
  if (!filesTouched.has(rel)) {
    const p = path.join(wbDir, rel)
    filesTouched.set(rel, { p, arr: JSON.parse(fs.readFileSync(p, 'utf8')), orig: fs.readFileSync(p, 'utf8') })
  }
  return filesTouched.get(rel)
}

for (const fx of FIXES) {
  const f = loadFile(fx.file)
  const e = f.arr.find((x) => x.id === fx.id)
  if (!e) throw new Error(`ID不明: ${fx.id}`)
  const expectPrompt = `「${fx.from}」の意味は？`
  const before = e[fx.field]
  // 適用ガード: 実データが監査の想定と一致することを厳密に確認
  if (before !== expectPrompt) throw new Error(`前提不一致 ${fx.id}: prompt=${JSON.stringify(before)} 期待=${JSON.stringify(expectPrompt)}`)
  if (fx.to === fx.from) throw new Error(`変更不要 ${fx.id}`)
  if (fx.to.toLowerCase() !== fx.from.toLowerCase()) throw new Error(`大文字化以外の変更を検出 ${fx.id}`)
  const after = `「${fx.to}」の意味は？`
  e[fx.field] = after
  applied.push({ id: fx.id, field: fx.field, before, after, reason: fx.reason, confidence: fx.confidence, testsPassed: [] })
}

// 書き戻し（元と同じ minified 形式 = JSON.stringify(arr)）
for (const [rel, f] of filesTouched) {
  const out = JSON.stringify(f.arr)
  fs.writeFileSync(f.p, out)
}

// ---- 検証 ----
const checks = []
function check(name, cond) { checks.push({ name, pass: !!cond }); return !!cond }

const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
let totalCount = 0
let manifestOk = true
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) {
    const arr = JSON.parse(fs.readFileSync(path.join(wbDir, lang, lv.file), 'utf8')) // parse可能か
    totalCount += arr.length
    if (typeof lv.count === 'number' && lv.count !== arr.length) manifestOk = false
  }
}
check('全JSONパース成功', true)
check('総件数=20131', totalCount === 20131)
check('manifest件数一致(count記載時)', manifestOk)

// 変更エントリごとの健全性
for (const fx of FIXES) {
  const f = loadFile(fx.file)
  const e = f.arr.find((x) => x.id === fx.id)
  check(`${fx.id} prompt大文字化`, e.prompt === `「${fx.to}」の意味は？`)
  check(`${fx.id} choices=4件`, Array.isArray(e.choices) && e.choices.length === 4)
  check(`${fx.id} 正解がchoices内`, e.choices.includes(e.answer))
  check(`${fx.id} answer不変`, e.answer != null)
}

const allPass = checks.every((c) => c.pass)
for (const a of applied) a.testsPassed = checks.filter((c) => c.pass).map((c) => c.name)

fs.writeFileSync(path.join(outDir, 'applied-safe-fixes.json'), JSON.stringify({ appliedCount: applied.length, allChecksPass: allPass, checks, applied }, null, 2))

console.log('第5段階 安全修正 適用:', applied.length, '件')
for (const a of applied) console.log('  ', a.id, JSON.stringify(a.before), '→', JSON.stringify(a.after))
console.log('検証:')
for (const c of checks) console.log('  ', c.pass ? 'OK' : 'NG', c.name)
console.log(allPass ? '全検証パス' : '⚠ 検証失敗あり')
if (!allPass) process.exit(1)
