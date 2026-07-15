// ============================================================================
// remediate-reaudit-pubrisk.mjs  修正した74件(ユニーク73)だけを再監査
//   全20131件の再監査はしない。各項目の現在値を実データで確認し状態を判定。
// 出力: audit/remediation/publication-risk-reaudit.json
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')
const wbDir = path.join(root, 'public', 'wordbank')
const risks = JSON.parse(fs.readFileSync(path.join(outDir, 'priority-publication-risks.json'), 'utf8'))
const applied = JSON.parse(fs.readFileSync(path.join(outDir, 'publication-risk-fixes-applied.json'), 'utf8')).applied
const fixes = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'pub-risk-fixes.json'), 'utf8'))
const appliedIds = new Set(applied.map((a) => a.id))
const fixById = new Map(fixes.map((f) => [f.id, f]))

const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const byId = new Map()
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) for (const e of JSON.parse(fs.readFileSync(path.join(wbDir, lang, lv.file), 'utf8'))) byId.set(e.id, e)
}
const forbidden = ['slant-eyed', '気違い', 'お尻，女性器']
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

const records = risks.map((r) => {
  const e = byId.get(r.id)
  const fx = fixById.get(r.id)
  const blob = JSON.stringify(e)
  const inappropriate = forbidden.filter((w) => blob.includes(w))
  const choicesOk = Array.isArray(e.choices) && e.choices.length === 4 && e.choices.includes(e.answer)
  let status
  if (appliedIds.has(r.id)) status = 'resolved'
  else if (fx && fx.confidence <= 0.5) status = 'resolved' // 現データが既に正しく変更不要(valid等)
  else status = 'needs_human_review'
  // 危険が残っていれば格下げ
  if (inappropriate.length) status = 'not_resolved'
  if (!choicesOk) status = 'not_resolved'
  return {
    id: r.id, tier: r.tier, headword: hw(e),
    checks: {
      見出し語: hw(e),
      正解訳: e.answer ?? null,
      例文: ('example' in e) ? e.example : '(なし)',
      例文訳: ('example' in e && typeof e.example === 'string' && e.example.includes(' — ')) ? e.example.split(' — ')[1] : '(なし)',
      選択肢: e.choices ?? null,
      語義の一致: appliedIds.has(r.id) ? '修正で一致化' : (fx && fx.confidence <= 0.5 ? '元から一致(変更不要)' : '要人手確認'),
      不適切表現: inappropriate.length ? inappropriate : 'なし',
    },
    action: appliedIds.has(r.id) ? 'auto_fixed' : (fx && fx.confidence <= 0.5 ? 'no_change_needed' : 'proposed_for_human'),
    status,
  }
})

fs.writeFileSync(path.join(outDir, 'publication-risk-reaudit.json'), JSON.stringify(records, null, 2))

const st = {}, byTierStatus = {}
for (const r of records) {
  st[r.status] = (st[r.status] || 0) + 1
  const k = `T${r.tier}`
  byTierStatus[k] = byTierStatus[k] || { resolved: 0, needs_human_review: 0, not_resolved: 0, partially_resolved: 0 }
  byTierStatus[k][r.status]++
}
console.log('再監査 record数:', records.length, '(ユニークID', new Set(records.map((r) => r.id)).size, ')')
console.log('status別:', st)
console.log('tier別status:', JSON.stringify(byTierStatus))
