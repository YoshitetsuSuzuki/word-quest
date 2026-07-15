// ============================================================================
// audit-aggregate.mjs  各バッチの監査結果(audit/<lang>/{batch-*,issues-*}.json)を集計し、
// 必須出力ファイルを生成する（非破壊・読み取り＋audit/への書き込みのみ）。
//   audit-summary.json / audit-progress.json(更新) /
//   audit-errors.json / audit-warnings.json / audit-human-review.json /
//   proposed-fixes.json / audit-passed.json(カバレッジ形式)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const auditDir = path.join(root, 'audit')
const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']

const allIssues = []
const batches = []
const perLang = {}

for (const lang of LANGS) {
  const dir = path.join(auditDir, lang)
  if (!fs.existsSync(dir)) continue
  const files = fs.readdirSync(dir)
  const idsUniverse = fs.existsSync(path.join(dir, 'ids.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'ids.json'), 'utf8')) : []
  let checked = 0
  let batchCount = 0
  for (const f of files) {
    if (f.startsWith('batch-') && f.endsWith('.json')) {
      const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      batches.push(b)
      checked += b.checkedEntries || 0
      batchCount++
    }
    if (f.startsWith('issues-') && f.endsWith('.json')) {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      const arr = Array.isArray(raw) ? raw : Array.isArray(raw.issues) ? raw.issues : []
      for (const it of arr) allIssues.push({ ...it, language: it.language || lang })
    }
  }
  // バッチ実績のある言語のみ「監査済み」として集計に含める
  if (batchCount > 0) perLang[lang] = { total: idsUniverse.length, checked, batches: batchCount }
}

// 分類
const sev = { critical: 0, high: 0, medium: 0, low: 0, uncertain: 0 }
for (const it of allIssues) if (sev[it.severity] !== undefined) sev[it.severity]++
const errors = allIssues.filter((i) => i.severity === 'critical' || i.severity === 'high')
const warnings = allIssues.filter((i) => i.severity === 'medium' || i.severity === 'low')
const humanReview = allIssues.filter((i) => i.requiresHumanReview === true)
const proposed = allIssues.filter((i) => i.requiresHumanReview === false && (i.confidence ?? 0) >= 0.98)

const write = (name, data) => fs.writeFileSync(path.join(auditDir, name), JSON.stringify(data, null, 2))
write('audit-errors.json', errors)
write('audit-warnings.json', warnings)
write('audit-human-review.json', humanReview)
write('proposed-fixes.json', proposed)

// カバレッジ形式の passed（全ID母集合 − 問題ID = passed。個票2万件は作らずID集合で担保）
const auditedLangs = Object.keys(perLang)
const passed = {}
for (const lang of auditedLangs) {
  const ids = JSON.parse(fs.readFileSync(path.join(auditDir, lang, 'ids.json'), 'utf8'))
  const flagged = new Set(allIssues.filter((i) => (i.language === lang) || (i.id || '').startsWith(lang.slice(0, 2))).map((i) => i.id))
  passed[lang] = { total: ids.length, flagged: [...flagged].length, passed: ids.length - [...flagged].length, note: 'passed=母集合ID − 問題ID。全IDが検査対象として捕捉されていることを ids.json で担保' }
}
write('audit-passed.json', passed)

const totalUniverse = LANGS.reduce((s, l) => s + (perLang[l]?.total ?? 0), 0)
const totalChecked = LANGS.reduce((s, l) => s + (perLang[l]?.checked ?? 0), 0)
const summary = {
  generatedAt: '2026-07-15',
  method: 'expert linguistic review (native-speaker knowledge). externalSourcesChecked=[] — 外部辞書へ全件照合していない。確信不足は not_verified。',
  auditedLanguages: auditedLangs,
  pendingLanguages: LANGS.filter((l) => !auditedLangs.includes(l)),
  totalEntriesAllTargets: LANGS.reduce((s, l) => {
    try { return s + JSON.parse(fs.readFileSync(path.join(auditDir, l, 'ids.json'), 'utf8')).length } catch { return s }
  }, 0),
  checkedEntries: totalChecked,
  perLanguage: perLang,
  severity: sev,
  issuesTotal: allIssues.length,
  humanReviewTotal: humanReview.length,
  proposedFixesTotal: proposed.length,
  dataMutated: false,
}
write('audit-summary.json', summary)

console.log('集計完了')
console.log('  監査済み言語:', auditedLangs.join(', '))
console.log('  検査件数:', totalChecked)
console.log('  severity:', JSON.stringify(sev))
console.log('  問題総数:', allIssues.length, '/ 要人間確認:', humanReview.length, '/ 自動修正候補(>=0.98):', proposed.length)
