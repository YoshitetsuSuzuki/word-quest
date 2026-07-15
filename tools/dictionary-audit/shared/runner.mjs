// ============================================================================
// runner.mjs  1言語の照合を実行する共通ロジック（check-<lang>.mjs から呼ぶ）
//   元データ(public/wordbank)は読み取りのみ。cache/ と reports/ にのみ書き込む。
//   100000語対応: 既定サンプル・--limit/--offset/--ids・キャッシュ・順次処理。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lookup } from './dictionary-loader.mjs'
import { checkHeadword, checkPos } from './matcher.mjs'
import { checkEnGloss, checkJaGloss } from './gloss-checker.mjs'
import { checkExample } from './example-checker.mjs'
import { checkPronunciation } from './pronunciation-checker.mjs'
import { writeLanguageReport, verdictOf } from './reporter.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const auditRoot = path.resolve(here, '..')
const repoRoot = path.resolve(auditRoot, '..', '..')
const cfg = JSON.parse(fs.readFileSync(path.join(auditRoot, 'config', 'languages.json'), 'utf8'))
const licenses = JSON.parse(fs.readFileSync(path.join(auditRoot, 'config', 'licenses.json'), 'utf8'))

export function parseArgs(argv) {
  const o = { limit: null, offset: 0, ids: null, all: false, noNet: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--all') o.all = true
    else if (a === '--no-net') o.noNet = true
    else if (a === '--limit') o.limit = parseInt(argv[++i], 10)
    else if (a === '--offset') o.offset = parseInt(argv[++i], 10)
    else if (a === '--ids') o.ids = argv[++i].split(',').map((s) => s.trim()).filter(Boolean)
  }
  return o
}

function loadWordbank(langCfg) {
  const dir = path.join(repoRoot, 'public', 'wordbank', langCfg.dir)
  if (!fs.existsSync(path.join(dir, 'manifest.json'))) return null
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  let w = []
  for (const lv of man.levels) w = w.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
  return w
}
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''
const posMapLookup = (tag) => cfg.posMap[tag] || null

export async function runLanguage(langKey, argv = []) {
  const langCfg = cfg.languages[langKey] || cfg.futureLanguages[langKey]
  if (!langCfg) { console.error('未知の言語:', langKey); process.exit(1) }
  const opts = parseArgs(argv)
  const all = loadWordbank(langCfg)
  if (!all) { console.error(`wordbank/${langCfg.dir} が見つかりません（未対応言語?）`); process.exit(1) }

  let items = all
  if (opts.ids) items = all.filter((e) => opts.ids.includes(e.id))
  else {
    const limit = opts.all ? all.length : (opts.limit || cfg.sampling.defaultLimit)
    items = all.slice(opts.offset, opts.offset + limit)
  }
  const sampled = items.length < all.length

  console.log(`[${langKey}] wordbank ${all.length}件中 ${items.length}件を照合 (sources: ${langCfg.sources.join(',')})${opts.noNet ? ' [no-net]' : ''}`)
  const results = []
  let i = 0
  for (const e of items) {
    const word = hw(e)
    const dict = await lookup(langKey, langCfg, word, { noNet: opts.noNet })
    if (dict.status !== 'not_checked' && dict.found) { if (licenses.dictionaries[dict.source]) licenses.dictionaries[dict.source].accessedInThisRun = true }
    // データ側POS
    let dataPos = null
    if (langCfg.posFromTags && Array.isArray(e.tags)) { const t = e.tags.find((x) => x !== 'phrase'); dataPos = posMapLookup(t) }
    // データ側 英語義
    const dataEn = langCfg.structure === 'pivot' ? (e.glosses?.en ?? e.answer) : (e.glosses?.en ?? null)
    const dataJa = langCfg.structure === 'pivot' ? (e.glosses?.ja ?? null) : (e.answer ?? null)

    const checks = {
      headword: checkHeadword(dict),
      pos: checkPos(dataPos, dict),
      glossEn: checkEnGloss(dataEn, dict),
      glossJa: checkJaGloss(dataJa, null), // JA辞書未配置→not_checked
      pronunciation: checkPronunciation(e, dict, langCfg.hasPronunciation),
      example: checkExample(e, word, langCfg.hasExample, e.exampleForm),
    }
    const rec = { id: e.id, headword: word, source: dict.source, sourceStatus: dict.status, dictAttempts: dict.attempts, dictPos: [...new Set((dict.entries || []).map((x) => x.pos).filter(Boolean))], checks }
    rec.verdict = verdictOf(rec)
    results.push(rec)
    if (++i % 20 === 0) process.stdout.write(`  ...${i}/${items.length}\r`)
  }

  const meta = { generatedAt: new Date().toISOString().slice(0, 10), sources: langCfg.sources, licenses: langCfg.sources.map((s) => ({ source: s, license: licenses.dictionaries[s]?.license || '?' })), totalInWordbank: all.length, sampled }
  const summary = writeLanguageReport(langKey, meta, results)
  // ライセンス台帳の accessedInThisRun をキャッシュ的に保存（reports側で参照）
  fs.writeFileSync(path.join(auditRoot, 'reports', '_licenses-last-run.json'), JSON.stringify(licenses, null, 2))
  console.log(`[${langKey}] 完了: 見出し一致${summary.matchRate}% / 危険例文${summary.unsafeExamples} / 要確認${summary.needsHumanReview} / 重大${summary.criticalErrors} → reports/${langKey}.json`)
  return summary
}
