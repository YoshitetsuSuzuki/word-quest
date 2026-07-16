// ============================================================================
// pos-final-apply.mjs  pos-decisions の A(と条件を満たすB)のみ tags 修正・人手CSV生成
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const D = path.join(repoRoot, 'audit', 'pos-final-review')
const decisions = JSON.parse(fs.readFileSync(path.join(D, 'pos-decisions.json'), 'utf8'))

const applyCands = decisions.filter((d) => (d.category === 'A' || d.category === 'B') && d.confidence >= 0.995 && d.adoptedTag)
const proposed = applyCands.map((d) => ({ id: d.id, headword: d.headword, field: 'tags', before: d.currentTags, after: d.adoptedTag, answer: d.answer, exampleEvidence: (d.example || '').split(' — ')[0], dictionaryEvidence: [{ source: 'OEWN', pos: d.dict1Pos }, { source: 'Kaikki-en subset', pos: d.dict2Pos }], reason: d.reason, confidence: d.confidence }))
fs.writeFileSync(path.join(D, 'fixes-proposed.json'), JSON.stringify(proposed, null, 2))
fs.writeFileSync(path.join(D, 'fixes-proposed.md'), `# 最終品詞修正 提案(適用前)\n\n計 ${proposed.length}件 / tagsのみ / 例文文法＋辞書の2確認・conf>=0.995\n\n| id | before | after | 例文根拠 |\n|---|---|---|---|\n` + proposed.slice(0, 50).map((p) => `| ${p.id} | ${JSON.stringify(p.before)} | ${JSON.stringify(p.after)} | ${p.exampleEvidence.slice(0, 40)} |`).join('\n') + '\n')

// apply (english + korean・tagsのみ)
const fileCache = new Map(); const loc = new Map()
for (const lang of ['english', 'korean']) { const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) { const p = path.join(repoRoot, 'public', 'wordbank', lang, lv.file); const o = fs.readFileSync(p, 'utf8'); const arr = JSON.parse(o); const key = lang + '/' + lv.file; fileCache.set(key, { p, arr, roundTrip: JSON.stringify(arr) === o }); arr.forEach((e, i) => loc.set(e.id, { key, idx: i })) } }
const applied = [], skipped = [], touched = new Set()
for (const p of proposed) {
  const L = loc.get(p.id); if (!L) { skipped.push({ id: p.id, reason: 'IDなし' }); continue }
  const e = fileCache.get(L.key).arr[L.idx]
  if (JSON.stringify(e.tags) !== JSON.stringify(p.before)) { skipped.push({ id: p.id, reason: '現tags不一致', current: e.tags }); continue }
  const before = [...e.tags]; const keep = e.tags.filter((t) => t === 'phrase')
  e.tags = [...p.after, ...keep]
  applied.push({ id: p.id, headword: p.headword, field: 'tags', before, after: e.tags, answer: p.answer, exampleEvidence: p.exampleEvidence, dictionaryEvidence: p.dictionaryEvidence, reason: p.reason, confidence: p.confidence })
  touched.add(L.key)
}
for (const k of touched) { const fc = fileCache.get(k); if (!fc.roundTrip) throw new Error('round-trip非安全 ' + k); fs.writeFileSync(fc.p, JSON.stringify(fc.arr)) }
fs.writeFileSync(path.join(D, 'fixes-applied.json'), JSON.stringify({ appliedCount: applied.length, applied }, null, 2))
fs.writeFileSync(path.join(D, 'fixes-skipped.json'), JSON.stringify(skipped, null, 2))
fs.writeFileSync(path.join(D, 'fixes-applied.md'), `# 最終品詞修正 適用ログ\n\n適用 ${applied.length} / 見送り ${skipped.length} / tagsのみ・例文文法＋辞書の2確認\n言語別: en=${applied.filter((a) => a.id.startsWith('en')).length} ko=${applied.filter((a) => a.id.startsWith('ko')).length}\n`)

// human-review CSV (D/E/F/G)
const human = decisions.filter((d) => ['D', 'E', 'F', 'G'].includes(d.category))
const prio = (d) => d.category === 'D' ? 'P1' : (d.decisionStatus === 'dictionary_sources_conflict' ? 'P4' : d.unionPos.length > 1 ? 'P3' : 'P2')
const rows = human.map((d) => ({ priority: prio(d), language: d.language, id: d.id, headword: d.headword, currentTags: (d.currentTags || []).join('|'), suggestedTags: d.adoptedTag ? d.adoptedTag.join('|') : '', answer: d.answer, example: (d.example || '').split(' — ')[0], exampleForm: d.exampleForm || '', dictionaryPos1: (d.dict1Pos || []).join('|'), dictionaryPos2: (d.dict2Pos || []).join('|'), decisionStatus: d.decisionStatus, reason: d.reason, confidence: d.confidence, humanDecision: '', humanNote: '' }))
rows.sort((a, b) => a.priority.localeCompare(b.priority))
fs.writeFileSync(path.join(D, 'human-review.json'), JSON.stringify(rows, null, 2))
const cols = ['priority', 'language', 'id', 'headword', 'currentTags', 'suggestedTags', 'answer', 'example', 'exampleForm', 'dictionaryPos1', 'dictionaryPos2', 'decisionStatus', 'reason', 'confidence', 'humanDecision', 'humanNote']
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s }
fs.writeFileSync(path.join(D, 'human-review.csv'), '﻿' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n'))

const cats = {}; for (const d of decisions) cats[d.category] = (cats[d.category] || 0) + 1
console.log('分類:', cats, '合計', decisions.length)
console.log('適用', applied.length, '/ 見送り', skipped.length, '/ 人手CSV', rows.length, '行')
