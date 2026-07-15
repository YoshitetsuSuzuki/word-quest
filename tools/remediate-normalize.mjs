// ============================================================================
// remediate-normalize.mjs  【第1・2段階】監査結果の正規化＋A/B/C/D分類
//   - audit/<lang>/issues-*.json（真の情報源）＋集計4ファイルを読み込み
//   - 統一形式へ変換し (id, field, issueCategory) で重複排除
//   - A(機械的に安全)/B(辞書確認要)/C(人手確認要)/D(修正しない) に分類
// 元の単語データ(public/wordbank)は一切読み書きしない。audit/remediation/へのみ出力。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const auditDir = path.join(root, 'audit')
const outDir = path.join(auditDir, 'remediation')
fs.mkdirSync(outDir, { recursive: true })

// --- 収集: 言語別issuesファイル（母集合）＋集計ファイル（sourceAuditFiles追記用） ---
const raw = []
const langDirs = fs.readdirSync(auditDir).filter((d) => {
  try { return fs.statSync(path.join(auditDir, d)).isDirectory() } catch { return false }
})
for (const lang of langDirs) {
  const dir = path.join(auditDir, lang)
  for (const f of fs.readdirSync(dir)) {
    if (f.startsWith('issues-') && f.endsWith('.json')) {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      const arr = Array.isArray(r) ? r : Array.isArray(r.issues) ? r.issues : []
      for (const it of arr) raw.push({ ...it, _src: `${lang}/${f}` })
    }
  }
}
// 集計ファイルも読み（重複としてsourceに合流。新規issueは増えない＝母集合の部分集合）
for (const agg of ['audit-errors.json', 'audit-warnings.json', 'audit-human-review.json', 'proposed-fixes.json']) {
  const p = path.join(auditDir, agg)
  if (!fs.existsSync(p)) continue
  const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
  for (const it of arr) raw.push({ ...it, _src: agg })
}

// --- 正規化: issueType → 正規カテゴリ ---
function canonCategory(it) {
  const t = String(it.issueType || it.issueCategory || '').toLowerCase()
  const f = String(it.field || '').toLowerCase()
  const empty = (v) => v == null || v === '' || v === '(null)' || (Array.isArray(v) && v.length === 0)
  if (/inappropriate/.test(t)) return 'inappropriate_content'
  if (/capital/.test(t)) return t.includes('sense') ? 'capitalization_and_sense' : 'capitalization'
  if (/punctuation/.test(t)) return 'punctuation'
  if (/pinyin_format/.test(t)) return 'pinyin_format'
  if (/pos|part.?of.?speech/.test(t)) return 'pos_mismatch'
  if (/ipa|pronunciation|stress|tone|heteronym/.test(t)) {
    return /missing/.test(t) ? 'missing_pronunciation' : 'pronunciation'
  }
  if (/missing/.test(t) || (empty(it.currentValue) && !/pos|tags/.test(t))) {
    if (/pronunciation/.test(f)) return 'missing_pronunciation'
    if (/example/.test(f) || /example/.test(t)) return 'missing_example'
    if (/gloss|answer|translation|prompt/.test(f) || /gloss/.test(t)) return 'missing_gloss'
    return 'missing_field'
  }
  if (/false.?friend/.test(t)) return 'translation_false_friend'
  if (/lemma|inflected_form_as_headword|verb_form_as_headword|standalone_headword/.test(t)) return 'headword_lemma'
  if (/example/.test(t) || /example/.test(f)) return 'example_sense_mismatch'
  if (/translation|gloss|nuance|natural|en.?ja|sense|meaning|polysemy|imprecise|mistranslation|regional|word_choice|degree|ambigu|register|scope|primary|misleading|inconsistency|incomplete/.test(t))
    return 'translation_issue'
  return 'other'
}

// --- A/B/C/D分類 ---
function classify(cat, it) {
  const c = it.confidence == null ? 0 : it.confidence
  if (cat === 'inappropriate_content') return 'C' // 内容差替は必ず人手（危険項目としても別途抽出）
  if (c < 0.6 || it.severity === 'uncertain') return 'D' // 根拠不足・低信頼
  switch (cat) {
    case 'capitalization': {
      const cur = String(it.currentValue ?? ''), sug = String(it.suggestedValue ?? '')
      // 小文字→大文字（独名詞/固有名詞の正書法）のみ機械的に安全。逆方向・曖昧はB。
      if (cur && sug && cur.toLowerCase() === sug.toLowerCase() &&
          cur[0] === cur[0].toLowerCase() && sug[0] === sug[0].toUpperCase()) return 'A'
      return 'B'
    }
    case 'punctuation': return 'A' // 同一フィールド内の機械的句読点統一
    case 'pinyin_format': return 'A'
    case 'pos_mismatch': return 'B'
    case 'pronunciation': return 'B'
    case 'missing_pronunciation': return 'B'
    case 'headword_lemma': return 'B'
    case 'missing_example': return 'C' // 例文の創作＝人手
    case 'missing_gloss': return 'C'
    case 'missing_field': return 'C'
    case 'example_sense_mismatch': return 'C'
    case 'translation_issue': return 'C'
    case 'translation_false_friend': return 'C'
    case 'capitalization_and_sense': return 'C'
    default: return 'C'
  }
}

// --- 統一レコード化 ---
function normField(f) {
  return String(f || '')
    .split(/[/&]| vs /).map((s) => s.trim().toLowerCase()).filter(Boolean).sort().join('/')
}
const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, uncertain: 0 }
const map = new Map()
for (const it of raw) {
  const cat = canonCategory(it)
  const key = `${it.id}|${normField(it.field)}|${cat}`
  const rec = {
    id: it.id,
    language: it.language || (it.id || '').split('-')[0],
    headword: it.headword ?? '',
    sourceAuditFiles: [it._src],
    issueCategory: cat,
    severity: it.severity || 'low',
    field: it.field || '',
    currentValue: it.currentValue ?? null,
    suggestedValue: it.suggestedValue ?? null,
    reason: it.reason || '',
    confidence: it.confidence == null ? 0 : it.confidence,
    externalSourcesChecked: Array.isArray(it.externalSourcesChecked) ? it.externalSourcesChecked : [],
    requiresHumanReview: it.requiresHumanReview !== false,
  }
  if (!map.has(key)) { map.set(key, rec); continue }
  // マージ（異なる問題は統合しない＝同一 id|field|category のみ合流）
  const ex = map.get(key)
  for (const s of rec.sourceAuditFiles) if (!ex.sourceAuditFiles.includes(s)) ex.sourceAuditFiles.push(s)
  if (rec.confidence > ex.confidence) ex.confidence = rec.confidence
  if ((SEV_RANK[rec.severity] ?? 0) > (SEV_RANK[ex.severity] ?? 0)) ex.severity = rec.severity
  if ((String(rec.suggestedValue || '')).length > String(ex.suggestedValue || '').length) ex.suggestedValue = rec.suggestedValue
  if ((rec.reason || '').length > (ex.reason || '').length) ex.reason = rec.reason
  if (rec.requiresHumanReview === false) ex.requiresHumanReview = ex.requiresHumanReview && false
}

const normalized = [...map.values()]
const beforeDedup = raw.length
const afterDedup = normalized.length

// バケット付与
const buckets = { A: [], B: [], C: [], D: [] }
for (const r of normalized) {
  const b = classify(r.issueCategory, r)
  r._bucket = b
  buckets[b].push(r)
}

const write = (name, data) => fs.writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2))
write('all-issues-normalized.json', normalized.map(({ _bucket, ...r }) => r))
write('category-A-safe.json', buckets.A.map(({ _bucket, ...r }) => r))
write('category-B-dictionary-required.json', buckets.B.map(({ _bucket, ...r }) => r))
write('category-C-human-review.json', buckets.C.map(({ _bucket, ...r }) => r))
write('category-D-no-change.json', buckets.D.map(({ _bucket, ...r }) => r))

console.log('第1段階 正規化: 重複排除前', beforeDedup, '→ 重複排除後', afterDedup)
console.log('第2段階 分類: A(機械的安全)', buckets.A.length, '/ B(辞書要)', buckets.B.length, '/ C(人手要)', buckets.C.length, '/ D(修正せず)', buckets.D.length)
const catCount = {}
for (const r of normalized) catCount[r.issueCategory] = (catCount[r.issueCategory] || 0) + 1
console.log('正規カテゴリ分布:', catCount)
console.log('A内訳(≥0.99=適用候補):', buckets.A.filter((r) => r.confidence >= 0.99).length, '/ A総数', buckets.A.length)
