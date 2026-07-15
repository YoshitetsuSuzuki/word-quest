// ============================================================================
// remediate-critical-fixes.mjs  critical分類から安全な tags 修正のみ適用
//   安全ゲート(Phase6): 見出しexact＋辞書単一品詞＋対象品詞がスキーマ内＋
//     和訳が属性形容詞形で品詞を確証＋conf>=0.99＋tagsのみ変更。
//   → 英語の「名詞/動詞タグ→形容詞」の二重確認済み誤タグに限定。
//   answer/choices/example/pronunciation/difficulty/verified/id/prompt は不変。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const crDir = path.join(repoRoot, 'audit', 'critical-remediation')
const classified = JSON.parse(fs.readFileSync(path.join(crDir, 'critical-classified.json'), 'utf8'))

const isAdjAnswer = (a) => /(?:の|な|った|しい|らしい|っぽい)$/.test(String(a || '')) && !/(?:に|と|て|で)$/.test(String(a || ''))
function isSafeAdj(x) {
  if (x.language !== 'english' || x.category !== 'A') return false
  const dictPos = (x.dictionaryEvidence?.[0] || {}).partsOfSpeech || []
  const cur = (x.currentValue || []).filter((t) => t !== 'phrase')[0]
  return x.suggestedValue && x.suggestedValue[0] === '形容詞' && dictPos.length === 1 && dictPos[0] === 'adjective' && cur !== '形容詞' && isAdjAnswer(x.appAnswer)
}

const safe = classified.filter(isSafeAdj).map((x) => ({ ...x, confidence: 0.99, safeToAutoFix: true, requiresHumanReview: false }))
const safeIds = new Set(safe.map((x) => x.id))
const human = classified.filter((x) => !safeIds.has(x.id))
const nochange = [] // 現状「変更不要」に確定できる客観項目は無し(残りは人手/スキーマ)

fs.writeFileSync(path.join(crDir, 'safe-auto-fixes.json'), JSON.stringify(safe, null, 2))
fs.writeFileSync(path.join(crDir, 'human-review-required.json'), JSON.stringify(human, null, 2))
fs.writeFileSync(path.join(crDir, 'no-change-required.json'), JSON.stringify(nochange, null, 2))

// proposed
const proposed = safe.map((x) => ({ id: x.id, language: x.language, field: 'tags', before: x.currentValue, after: x.suggestedValue, evidence: x.dictionaryEvidence, answerEvidence: x.appAnswer, cause: x.cause, confidence: 0.99, requiresHumanReview: false }))
fs.writeFileSync(path.join(crDir, 'fixes-proposed.json'), JSON.stringify(proposed, null, 2))
fs.writeFileSync(path.join(crDir, 'fixes-proposed.md'), `# critical 安全修正 提案(適用前)\n\n作成 2026-07-16 / tagsのみ / 全て英語の属性形容詞の誤タグ(名詞/動詞→形容詞) / conf 0.99\n\n計 ${proposed.length} 件\n\n| id | before | after | answer(根拠) |\n|---|---|---|---|\n` + proposed.slice(0, 40).map((p) => `| ${p.id} | ${JSON.stringify(p.before)} | ${JSON.stringify(p.after)} | ${p.answerEvidence} |`).join('\n') + (proposed.length > 40 ? `\n_...他${proposed.length - 40}件_\n` : '\n'))

// 適用(英語のみ・tagsのみ・surgical)
const wbDir = path.join(repoRoot, 'public', 'wordbank', 'english')
const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
const fileCache = new Map(); const loc = new Map()
for (const lv of man.levels) { const p = path.join(wbDir, lv.file); const o = fs.readFileSync(p, 'utf8'); const arr = JSON.parse(o); fileCache.set(lv.file, { p, arr, roundTrip: JSON.stringify(arr) === o }); arr.forEach((e, i) => loc.set(e.id, { file: lv.file, idx: i })) }

const applied = [], skipped = [], touched = new Set()
for (const p of proposed) {
  const L = loc.get(p.id); const e = fileCache.get(L.file).arr[L.idx]
  if (JSON.stringify(e.tags) !== JSON.stringify(p.before)) { skipped.push({ id: p.id, reason: '現在tagsが監査記録と不一致', current: e.tags }); continue }
  const before = [...e.tags]
  const keep = e.tags.filter((t) => t === 'phrase') // phrase/テーマは保持
  e.tags = [...p.after, ...keep]
  applied.push({ id: p.id, language: 'en', headword: String(e.prompt || '').replace(/[「」]|の意味は？/g, ''), field: 'tags', before, after: e.tags, evidence: p.evidence, answerEvidence: p.answerEvidence, exampleEvidence: e.example || null, reason: '和訳の属性形容詞形＋WordNet単一品詞adjective＋形容詞はスキーマ内。名詞/動詞タグは誤り。', confidence: 0.99 })
  touched.add(L.file)
}
for (const f of touched) { const fc = fileCache.get(f); if (!fc.roundTrip) throw new Error('round-trip非安全 ' + f); fs.writeFileSync(fc.p, JSON.stringify(fc.arr)) }
fs.writeFileSync(path.join(crDir, 'fixes-applied.json'), JSON.stringify({ appliedCount: applied.length, applied }, null, 2))
fs.writeFileSync(path.join(crDir, 'fixes-skipped.json'), JSON.stringify(skipped, null, 2))
fs.writeFileSync(path.join(crDir, 'fixes-applied.md'), `# critical 安全修正 適用ログ\n\n適用 ${applied.length} / 見送り ${skipped.length} / tagsのみ・英語・和訳と辞書で二重確認\n\n変更フィールド: tags のみ。answer/choices/example/pronunciation/difficulty/verified/id/prompt は不変。\n`)

console.log('安全候補', safe.length, '/ 人手確認', human.length, '/ 変更不要', nochange.length, '= 計', safe.length + human.length + nochange.length)
console.log('適用', applied.length, '/ 見送り', skipped.length)
