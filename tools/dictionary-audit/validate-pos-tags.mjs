// ============================================================================
// validate-pos-tags.mjs  品詞タグ整合検証(レポートのみ・元データ非改変)
//   - 許可外タグ/重複タグ/空タグ を検出(error)
//   - 見出し・answer・辞書品詞の明確な矛盾を検出(error)、多品詞は warning
//   - 辞書未収録は error にしない / phrase・テーマタグは維持(検査対象外)
//   CLI: [--language L] [--ids a,b]
//   出力: reports/pos-validation.json / .md
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex } from './shared/index-store.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const schema = JSON.parse(fs.readFileSync(path.join(repoRoot, 'audit', 'pos-migration', 'temporary-pos-schema.json'), 'utf8'))
const ALLOWED = new Set([...schema.allowedTags, 'word']) // pivotのwordも許可
const POS_SET = new Set(schema.posTags)
const SCHEMA = { english: new Set(['名詞', '動詞', '形容詞', '副詞', '代名詞', '前置詞', '接続詞', '間投詞', '数詞', '限定詞']), korean: new Set(['名詞', '動詞', '形容詞', '副詞', '代名詞', '間投詞', '数詞']), chinese: new Set(['名詞', '動詞', '形容詞', '副詞']) }
const JA_LABEL = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞', numeral: '数詞', interjection: '間投詞' }
const SRC = { english: 'oewn', korean: 'kaikki-korean', chinese: 'cedict', spanish: 'kaikki-spanish', german: 'kaikki-german', french: 'kaikki-french', portuguese: 'kaikki-portuguese', polish: 'kaikki-polish', russian: 'kaikki-russian' }
const LANGS = Object.keys(SRC)

function args() { const a = process.argv.slice(2); const o = { language: null, ids: null }; for (let i = 0; i < a.length; i++) { if (a[i] === '--language') o.language = a[++i]; else if (a[i] === '--ids') o.ids = new Set(a[++i].split(',')) } return o }
const opt = args()
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

const stores = {}
for (const [l, s] of Object.entries(SRC)) { try { const ix = loadIndex(s); if (ix) stores[l] = ix } catch {} }

const findings = []
let checked = 0
for (const lang of LANGS) {
  if (opt.language && lang !== opt.language) continue
  const man = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8'))
  for (const lv of man.levels) for (const e of JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, lv.file), 'utf8'))) {
    if (opt.ids && !opt.ids.has(e.id)) continue
    checked++
    const tags = e.tags || []
    const posTags = tags.filter((t) => t !== 'phrase' && POS_SET.has(t))
    const nonAllowed = tags.filter((t) => !ALLOWED.has(t) && t !== 'phrase') // phrase以外でallowed外(テーマは許容: phrase同居時)
    const hasPhrase = tags.includes('phrase')
    // 許可外(テーマタグはphrase同居なら許容)
    for (const t of nonAllowed) if (!hasPhrase) findings.push({ id: e.id, language: lang, level: 'error', type: 'disallowed_tag', tag: t, tags })
    // 重複
    if (new Set(tags).size !== tags.length) findings.push({ id: e.id, language: lang, level: 'error', type: 'duplicate_tag', tags })
    // 空
    if (tags.some((t) => t === '' || t == null)) findings.push({ id: e.id, language: lang, level: 'error', type: 'empty_tag', tags })
    // 辞書品詞との矛盾(pivotのword・phraseは対象外)
    if (posTags.length && !hasPhrase && lang !== 'spanish' && lang !== 'german' && lang !== 'french' && lang !== 'portuguese' && lang !== 'polish' && lang !== 'russian') {
      const look = stores[lang]?.lookup(hw(e))
      if (look?.found) {
        const dictPos = [...new Set(look.entries.flatMap((x) => x.partsOfSpeech))].filter(Boolean)
        if (dictPos.length > 1) findings.push({ id: e.id, language: lang, level: 'warning', type: 'multiple_pos', headword: hw(e), appTag: posTags, dictPos })
        else if (dictPos.length === 1) {
          const target = JA_LABEL[dictPos[0]]
          if (target && SCHEMA[lang]?.has(target) && !posTags.includes(target)) findings.push({ id: e.id, language: lang, level: 'error', type: 'pos_conflict', headword: hw(e), appTag: posTags, dictPos, answer: e.answer })
        }
      }
      // 辞書未収録は error にしない(記録もしない)
    }
  }
}
const summary = { checked, errors: findings.filter((f) => f.level === 'error').length, warnings: findings.filter((f) => f.level === 'warning').length, byType: {} }
for (const f of findings) summary.byType[f.type] = (summary.byType[f.type] || 0) + 1
fs.writeFileSync(path.join(here, 'reports', 'pos-validation.json'), JSON.stringify({ summary, findings }, null, 2))
let md = `# 品詞タグ整合検証\n\n生成 2026-07-16 / 検査 ${checked} / **error ${summary.errors} / warning ${summary.warnings}** / 元データ非改変\n\n種別: ${JSON.stringify(summary.byType)}\n\n- disallowed_tag/duplicate_tag/empty_tag = error\n- pos_conflict(在庫内単一品詞と不一致) = error\n- multiple_pos(多品詞) = warning\n- 辞書未収録は error にしない。phrase/テーマタグは検査対象外(維持)。\n`
fs.writeFileSync(path.join(here, 'reports', 'pos-validation.md'), md)
console.log(`品詞タグ検証: 検査${checked} error${summary.errors} warning${summary.warnings}`, JSON.stringify(summary.byType))
