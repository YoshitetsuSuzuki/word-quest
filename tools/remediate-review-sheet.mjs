// ============================================================================
// remediate-review-sheet.mjs 【第6段階】カテゴリB/Cを人手確認用シート化
//   出力: audit/remediation/review-sheet.json / review-sheet.csv
//   decision列は空欄。危険項目(priority-publication-risks)を最優先に並べる。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')
const B = JSON.parse(fs.readFileSync(path.join(outDir, 'category-B-dictionary-required.json'), 'utf8'))
const C = JSON.parse(fs.readFileSync(path.join(outDir, 'category-C-human-review.json'), 'utf8'))
const risks = JSON.parse(fs.readFileSync(path.join(outDir, 'priority-publication-risks.json'), 'utf8'))
const riskTier = new Map()
for (const r of risks) riskTier.set(r.id, Math.min(riskTier.get(r.id) ?? 9, r.tier))

function priorityOf(row) {
  if (riskTier.has(row.id)) return `P${riskTier.get(row.id)}-publication-risk`
  if (row.severity === 'high') return 'P2-high'
  if (row.severity === 'medium') return 'P3-medium'
  return 'P4-low'
}
const PRANK = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4 }

const rows = []
for (const it of [...B, ...C]) {
  const cat = it._bucket || (B.includes(it) ? 'B' : 'C')
  const dictReq = B.includes(it)
  rows.push({
    priority: priorityOf(it),
    language: it.language,
    id: it.id,
    headword: it.headword,
    field: it.field,
    currentValue: Array.isArray(it.currentValue) ? it.currentValue.join('|') : (it.currentValue ?? ''),
    suggestedValue: Array.isArray(it.suggestedValue) ? it.suggestedValue.join('|') : (it.suggestedValue ?? ''),
    reason: it.reason || '',
    issueCategory: it.issueCategory,
    severity: it.severity,
    confidence: it.confidence,
    dictionaryCheckRequired: dictReq,
    humanReviewRequired: true,
    decision: '',
    reviewNote: '',
  })
}
// 並べ替え: priority → severity
const SEV = { high: 0, medium: 1, low: 2, uncertain: 3 }
rows.sort((a, b) => {
  const pa = PRANK[a.priority.slice(0, 2)] ?? 5, pb = PRANK[b.priority.slice(0, 2)] ?? 5
  return pa - pb || (SEV[a.severity] - SEV[b.severity]) || String(a.id).localeCompare(String(b.id))
})

fs.writeFileSync(path.join(outDir, 'review-sheet.json'), JSON.stringify(rows, null, 2))

// CSV
const cols = ['priority', 'language', 'id', 'headword', 'field', 'currentValue', 'suggestedValue', 'reason', 'issueCategory', 'severity', 'confidence', 'dictionaryCheckRequired', 'humanReviewRequired', 'decision', 'reviewNote']
const esc = (v) => {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}
const csv = [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n')
fs.writeFileSync(path.join(outDir, 'review-sheet.csv'), '﻿' + csv) // BOM付きでExcelの文字化け回避

console.log('第6段階 人手確認シート:', rows.length, '行 (B', B.length, '+ C', C.length, ')')
const byP = {}
for (const r of rows) byP[r.priority.slice(0, 2)] = (byP[r.priority.slice(0, 2)] || 0) + 1
console.log('  priority別:', byP)
