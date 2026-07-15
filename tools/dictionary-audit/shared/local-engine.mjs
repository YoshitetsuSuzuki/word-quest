// ============================================================================
// local-engine.mjs  ローカル辞書による全件照合エンジン（ネット不使用・非破壊）
//   - 言語→ローカル辞書ソース: english=[oewn], chinese=[cedict], 他=[](→not_checked)
//   - 詳細ステータス(見出し/品詞/英語義/発音)＋複数辞書consensus＋監査意味フラグ
//   - チェックポイント(progress.json)で中断再開。バッチ処理。
//   - reports/full/<lang>.jsonl と問題別ファイルを生成。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex, stripDiacritics } from './index-store.mjs'
import { checkExample } from './example-checker.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const auditRoot = path.resolve(here, '..')
const repoRoot = path.resolve(auditRoot, '..', '..')
const cfg = JSON.parse(fs.readFileSync(path.join(auditRoot, 'config', 'languages.json'), 'utf8'))
const fullDir = path.join(auditRoot, 'reports', 'full')

// 言語 → ローカル辞書ソース
const LOCAL_SOURCES = {
  english: ['oewn'], chinese: ['cedict'],
  korean: ['kaikki-korean'], spanish: ['kaikki-spanish'], german: ['kaikki-german'],
  french: ['kaikki-french'], portuguese: ['kaikki-portuguese'], polish: ['kaikki-polish'], russian: ['kaikki-russian'],
}
// Kaikki系は品詞を持つ
const DICT_HAS_POS = new Set(['oewn', 'kaikki-korean', 'kaikki-spanish', 'kaikki-german', 'kaikki-french', 'kaikki-portuguese', 'kaikki-polish', 'kaikki-russian'])

const POSMAP = cfg.posMap
const COMPAT = [['noun', 'proper noun'], ['adjective', 'determiner', 'article'], ['verb', 'auxiliary'], ['adverb', 'particle']]
const compatible = (a, b) => a === b || COMPAT.some((g) => g.includes(a) && g.includes(b))
// アプリの品詞タグスキーマ(言語別)。ここに無い品詞は「スキーマ不足」で誤検知にしない(規則5/13)
const APP_POS_SCHEMA = { english: new Set(['名詞', '動詞', '形容詞']), chinese: new Set(['名詞', '動詞', '形容詞', '副詞']), korean: new Set(['名詞', '動詞', '形容詞', '副詞']) }
const JA_LABEL = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞', preposition: '前置詞', conjunction: '接続詞', interjection: '間投詞', numeral: '数詞', determiner: '限定詞', article: '冠詞', auxiliary: '助動詞', particle: '助詞', classifier: '量詞' }
const CONTENT_OR_MAPPED = new Set(Object.keys(JA_LABEL))
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

function tokset(s) { return new Set(String(s || '').toLowerCase().replace(/[()[\]{}.,;:!?"'/\\-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !['the', 'a', 'to', 'of', 'and', 'or'].includes(w))) }
function normPinyin(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[1-5\s]/g, '') }

// --- 各次元の判定 ---
function statHeadword(look) { if (!look) return { status: 'not_checked' }; if (!look.found) return { status: 'not_found' }; return { status: look.matchType, multiple: look.entries.length > 1 } }

function statPos(dataPos, look, dictHasPos, langKey) {
  if (!look || !look.found) return 'not_checked'
  if (!dictHasPos) return 'missing_in_dictionary'
  if (!dataPos) return 'missing_in_app'
  const dictPos = [...new Set(look.entries.flatMap((e) => e.partsOfSpeech))]
  if (!dictPos.length) return 'missing_in_dictionary'
  if (dictPos.includes(dataPos)) return 'exact'
  if (dictPos.some((p) => compatible(dataPos, p))) return 'compatible'
  if (dictPos.length > 1) return 'ambiguous' // 多品詞→採用品詞は文脈依存(review)
  // 単一品詞の不一致: 対象品詞がアプリ・スキーマ外なら「スキーマ不足」(誤検知にしない)
  const schema = APP_POS_SCHEMA[langKey] || new Set()
  const targetJa = JA_LABEL[dictPos[0]]
  if (!targetJa || !CONTENT_OR_MAPPED.has(dictPos[0])) return 'taxonomy_diff' // phrase/name/character等
  if (!schema.has(targetJa)) return 'schema_gap' // 例: 英語に副詞タグが無い
  return 'different' // スキーマ内・単一品詞の明確な誤タグ(genuine)
}

function statGlossEn(dataEn, look) {
  if (dataEn == null || dataEn === '') return 'missing'
  if (!look || !look.found) return 'not_checked'
  const dt = tokset(dataEn); if (!dt.size) return 'not_checked'
  const dictGloss = look.entries.flatMap((e) => e.senses.flatMap((s) => s.glossesEn)).join(' ; ').toLowerCase()
  const gt = tokset(dictGloss)
  const hit = [...dt].filter((w) => gt.has(w))
  // フレーズ完全一致
  const exactPhrase = look.entries.some((e) => e.senses.some((s) => s.glossesEn.some((g) => g.toLowerCase().includes(String(dataEn).toLowerCase()))))
  if (exactPhrase || hit.length === dt.size) return 'exact'
  if (hit.length >= Math.ceil(dt.size * 0.6)) return 'strong_match'
  if (hit.length) return 'partial'
  return 'different'
}

function statPron(dataP, look, system) {
  if (dataP == null || dataP === '') return 'missing_in_app'
  if (!look || !look.found) return 'not_checked'
  const dictP = look.entries.flatMap((e) => e.pronunciations.map((p) => p.ipa)).filter(Boolean)
  if (!dictP.length) return 'missing_in_dictionary'
  if (system === 'pinyin') {
    const a = normPinyin(dataP)
    if (dictP.some((d) => normPinyin(d) === a)) return 'exact'
    // 声調のみ違いは stress_difference 相当
    return 'different'
  }
  const a = String(dataP).replace(/[\/\[\]ˈˌ.\s]/g, '')
  return dictP.some((d) => String(d).replace(/[\/\[\]ˈˌ.\s]/g, '') === a) ? 'exact' : 'different'
}

// --- consensus (複数ソース) ---
function consensus(perSource, dims) {
  const out = {}
  for (const dim of dims) {
    const vals = Object.values(perSource).map((s) => s[dim]).filter((v) => v && v !== 'not_checked')
    if (!vals.length) { out[dim] = 'not_checked'; continue }
    const uniq = [...new Set(vals)]
    if (uniq.length === 1) out[dim] = uniq[0]
    else if (uniq.some((v) => v === 'different') && uniq.some((v) => ['exact', 'strong_match', 'compatible'].includes(v))) out[dim] = 'conflicting'
    else out[dim] = uniq.includes('exact') ? 'exact' : uniq[0]
  }
  return out
}

function overallVerdict(cons, headword, exampleRes) {
  // 例文の安全性のみ、辞書と独立した明確な危険として critical
  if (exampleRes && typeof exampleRes === 'object' && exampleRes.safety === 'unsafe') return 'critical'
  if (headword.status === 'not_checked') return 'not_checked'
  // 辞書に無い(not_found)は「誤りの証拠」ではない(規則12) → review(要人手/別辞書)。criticalにしない。
  if (headword.status === 'not_found') return 'review'
  if (Object.values(cons).includes('conflicting')) return 'conflicting'
  // critical は「学習を誤らせる明確な矛盾」に限定(規則13):
  //  - スキーマ内・単一品詞の明確な誤タグ(pos 'different')のみ critical
  //  - スキーマ不足/多品詞/体系差(schema_gap/ambiguous/taxonomy_diff)は誤検知にしない→review
  //  - グロス差(gloss 'different')は同義/範囲/多義の可能性を自動断定しない(規則6)→review
  if (cons.pos === 'different') return 'critical'
  const hwGood = ['exact', 'variant_match'].includes(headword.status)
  const hwOk = ['exact', 'case_mismatch', 'diacritic_mismatch', 'variant_match'].includes(headword.status)
  const senseConfirmed = ['exact', 'strong_match'].includes(cons.glossEn) || ['exact'].includes(cons.pron)
  const posOk = ['exact', 'compatible', 'missing_in_dictionary', 'missing_in_app'].includes(cons.pos)
  if (hwGood && posOk && senseConfirmed) return 'verified'
  if (hwOk && posOk && !['different', 'conflicting'].includes(cons.glossEn)) return 'likely_correct'
  return 'review'
}

function loadWordbank(dir) {
  const p = path.join(repoRoot, 'public', 'wordbank', dir)
  const man = JSON.parse(fs.readFileSync(path.join(p, 'manifest.json'), 'utf8'))
  let w = []
  for (const lv of man.levels) w = w.concat(JSON.parse(fs.readFileSync(path.join(p, lv.file), 'utf8')))
  return w
}

export async function runLocal(langKey, opts) {
  const langCfg = cfg.languages[langKey]
  if (!langCfg) throw new Error('未知言語 ' + langKey)
  fs.mkdirSync(fullDir, { recursive: true })
  const all = loadWordbank(langCfg.dir)
  const sources = LOCAL_SOURCES[langKey] || []
  const stores = {}
  const versions = {}
  for (const s of sources) { const ix = loadIndex(s); if (ix) { stores[s] = ix; versions[s] = getVersion(s) } }

  // チェックポイント
  const progressPath = path.join(auditRoot, 'reports', 'progress.json')
  let progress = fs.existsSync(progressPath) ? JSON.parse(fs.readFileSync(progressPath, 'utf8')) : {}
  const batchSize = opts.batchSize || 500
  const outFile = path.join(fullDir, langKey + '.jsonl')
  let startIdx = 0
  if (opts.resume && progress[langKey] && progress[langKey].status !== 'done' && fs.existsSync(outFile)) {
    startIdx = progress[langKey].processed || 0
    console.log(`[${langKey}] resume: ${startIdx}件目から再開`)
  } else {
    if (fs.existsSync(outFile)) fs.unlinkSync(outFile)
  }
  const limit = opts.all ? all.length : (opts.limit || all.length)
  const end = Math.min(all.length, opts.ids ? all.length : (opts.offset || 0) + limit)
  const items = opts.ids ? all.filter((e) => opts.ids.includes(e.id)) : all.slice(Math.max(startIdx, opts.offset || 0), end)

  const t0 = Date.now()
  const ws = fs.createWriteStream(outFile, { flags: startIdx > 0 ? 'a' : 'w' })
  let processed = startIdx
  for (const e of items) {
    const word = hw(e)
    const dataPos = (langCfg.posFromTags && Array.isArray(e.tags)) ? (POSMAP[e.tags.find((x) => x !== 'phrase')] || null) : null
    const dataEn = langCfg.structure === 'pivot' ? (e.glosses?.en ?? e.answer) : (e.glosses?.en ?? null)
    const dataP = e.pronunciation ?? null
    const pronSys = langKey === 'chinese' ? 'pinyin' : 'ipa'
    // ポーランド語/ロシア語のアプリ発音はローマ字転写でKaikkiのIPAと体系が異なる→照合不能(not_checked)
    const pronComparable = !['polish', 'russian'].includes(langKey)

    const perSource = {}
    let anyLook = null
    for (const s of sources) {
      const look = stores[s]?.lookup(word)
      if (look) anyLook = anyLook || look
      const dictHasPos = DICT_HAS_POS.has(s)
      perSource[s] = {
        headword: statHeadword(look).status,
        multiple: statHeadword(look).multiple || false,
        pos: statPos(dataPos, look, dictHasPos, langKey),
        glossEn: statGlossEn(dataEn, look),
        pron: pronComparable ? statPron(dataP, look, pronSys) : 'not_checked',
        dictPos: look?.found ? [...new Set(look.entries.flatMap((x) => x.partsOfSpeech))] : [],
      }
    }
    const headwordAgg = sources.length ? statHeadword(anyLook) : { status: 'not_checked' }
    const cons = sources.length ? consensus(perSource, ['headword', 'pos', 'glossEn', 'pron']) : { headword: 'not_checked', pos: 'not_checked', glossEn: 'not_checked', pron: 'not_checked' }
    const exampleRes = checkExample(e, word, langCfg.hasExample, e.exampleForm)
    const verdict = sources.length ? overallVerdict({ ...cons, pron: cons.pron }, headwordAgg, exampleRes) : 'not_checked'

    const rec = {
      id: e.id, headword: word, language: langKey,
      sources: perSource,
      consensus: cons,
      example: langCfg.hasExample ? (typeof exampleRes === 'object' ? exampleRes.overall : exampleRes) : 'not_applicable',
      exampleSafety: typeof exampleRes === 'object' ? exampleRes.safety : 'not_applicable',
      verdict,
      // 監査の意味(1つのverifiedにまとめない)
      audit: {
        aiReviewed: true,
        dictionaryChecks: {
          headword: sources.length > 0 && headwordAgg.status !== 'not_checked',
          partOfSpeech: ['exact', 'compatible', 'ambiguous', 'different'].includes(cons.pos),
          sense: ['exact', 'strong_match', 'partial', 'different'].includes(cons.glossEn),
          pronunciation: ['exact', 'different'].includes(cons.pron),
          japaneseGloss: false,
        },
        humanReviewed: false,
      },
      dictionaryVersions: versions,
    }
    ws.write(JSON.stringify(rec) + '\n')
    processed++
    if (processed % batchSize === 0) {
      progress[langKey] = { language: langKey, total: all.length, processed, lastId: e.id, batchSize, status: 'running', dictionaryVersions: versions, startedAt: progress[langKey]?.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
      fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2))
      process.stdout.write(`  [${langKey}] ${processed}/${all.length}\r`)
    }
  }
  ws.end()
  await new Promise((r) => ws.on('finish', r))
  progress[langKey] = { language: langKey, total: all.length, processed, lastId: items.length ? items[items.length - 1].id : (progress[langKey]?.lastId || null), batchSize, status: (processed >= all.length || opts.ids) ? 'done' : 'partial', dictionaryVersions: versions, startedAt: progress[langKey]?.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString() }
  fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2))

  const summary = summarize(langKey, all.length, versions, sources, Date.now() - t0)
  console.log(`[${langKey}] ローカル照合完了 ${summary.checked}件 verified${summary.verdicts.verified||0}/likely${summary.verdicts.likely_correct||0}/review${summary.verdicts.review||0}/critical${summary.verdicts.critical||0}/not_checked${summary.verdicts.not_checked||0} (${(summary.ms/1000).toFixed(1)}s)`)
  return summary
}

function getVersion(src) {
  try { const m = JSON.parse(fs.readFileSync(path.join(auditRoot, 'data', 'raw', '_download-manifest.json'), 'utf8')); return m[src]?.version || '' } catch { return '' }
}

function summarize(langKey, total, versions, sources, ms) {
  const outFile = path.join(fullDir, langKey + '.jsonl')
  const verdicts = {}, headwordStats = {}
  let checked = 0, unsafe = 0
  const dimChecked = { headword: 0, partOfSpeech: 0, sense: 0, pronunciation: 0, japaneseGloss: 0 }
  for (const line of fs.readFileSync(outFile, 'utf8').split('\n')) {
    if (!line.trim()) continue
    const r = JSON.parse(line); checked++
    verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1
    if (r.exampleSafety === 'unsafe') unsafe++
    for (const k of Object.keys(dimChecked)) if (r.audit.dictionaryChecks[k]) dimChecked[k]++
  }
  const s = { language: langKey, total, checked, sources, dictionaryVersions: versions, verdicts, unsafeExamples: unsafe, dimChecked, ms, generatedAt: new Date().toISOString().slice(0, 10) }
  return s
}
