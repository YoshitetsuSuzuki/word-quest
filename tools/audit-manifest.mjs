// ============================================================================
// audit-manifest.mjs  監査のカバレッジ台帳を生成する（非破壊・読み取りのみ）。
//  - 各言語の全IDを列挙（母集合）→ audit/<lang>/ids.json
//  - バッチ計画（400件単位）→ audit/audit-progress.json
//  - サマリ雛形 → audit/audit-summary.json
// 元の単語データは一切変更しない。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const BATCH = 400
const auditDir = path.join(root, 'audit')

function loadWords(lang) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  let w = []
  for (const lv of man.levels) w = w.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
  return w
}

const progress = { generatedAt: '2026-07-15', batchSize: BATCH, languages: {} }
let grand = 0
for (const lang of LANGS) {
  const words = loadWords(lang)
  grand += words.length
  const ids = words.map((q) => q.id)
  // 母集合（全ID）を保存
  fs.mkdirSync(path.join(auditDir, lang), { recursive: true })
  fs.writeFileSync(path.join(auditDir, lang, 'ids.json'), JSON.stringify(ids))
  // バッチ計画
  const batches = []
  for (let i = 0; i < words.length; i += BATCH) {
    const end = Math.min(i + BATCH, words.length)
    batches.push({
      batchId: `${lang}_${String(i / BATCH + 1).padStart(2, '0')}`,
      language: lang,
      startIndex: i,
      endIndex: end,
      totalEntries: end - i,
      checkedEntries: 0,
      status: 'pending',
    })
  }
  progress.languages[lang] = { total: words.length, uniqueIds: new Set(ids).size, batches }
}
progress.grandTotal = grand
fs.writeFileSync(path.join(auditDir, 'audit-progress.json'), JSON.stringify(progress, null, 2))

// サマリ雛形
const summary = {
  generatedAt: '2026-07-15',
  method: 'expert linguistic review (model knowledge). externalSourcesChecked=[] — 外部辞書へ全件照合はしていない(not_verified明示)',
  totalEntries: grand,
  checkedEntries: 0,
  uncheckedEntries: grand,
  byLanguage: Object.fromEntries(LANGS.map((l) => [l, progress.languages[l].total])),
  severity: { critical: 0, high: 0, medium: 0, low: 0, uncertain: 0 },
  notVerifiedFields: '発音の強勢/語形細部など外部一次資料が必要な項目は not_verified',
  dataMutated: false,
}
fs.writeFileSync(path.join(auditDir, 'audit-summary.json'), JSON.stringify(summary, null, 2))

console.log('カバレッジ台帳を生成しました。総件数:', grand)
for (const lang of LANGS) console.log('  ', lang.padEnd(11), progress.languages[lang].total, '件 /', progress.languages[lang].batches.length, 'バッチ')
