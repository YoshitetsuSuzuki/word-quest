// ============================================================================
// analyze-critical.mjs  v3 critical 1,179件を原因分類（元データ非改変・分析のみ）
//   各件を app実データ + 辞書evidence で分類し、A〜G と cause を付与。
//   出力: audit/critical-remediation/ 配下(inventory / classified / category-A..G)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex } from './shared/index-store.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const outDir = path.join(repoRoot, 'audit', 'critical-remediation')
fs.mkdirSync(outDir, { recursive: true })
const crit = JSON.parse(fs.readFileSync(path.join(here, 'reports', 'all-nine-v3', 'critical.json'), 'utf8'))
const langCfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'languages.json'), 'utf8'))
const POSMAP = langCfg.posMap // JA→canonical
const JA_LABEL = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞', preposition: '前置詞', conjunction: '接続詞', interjection: '間投詞', numeral: '数詞', determiner: '限定詞', article: '冠詞', auxiliary: '助動詞', particle: '助詞', classifier: '量詞', 'proper noun': '固有名詞' }
const APP_POS_SCHEMA = { english: new Set(['名詞', '動詞', '形容詞']), chinese: new Set(['名詞', '動詞', '形容詞', '副詞']), korean: new Set(['名詞', '動詞', '形容詞', '副詞']) }
const CONTENT_POS = new Set(['noun', 'verb', 'adjective', 'adverb'])
const FULL2 = { en: 'english', zh: 'chinese', ko: 'korean', es: 'spanish', de: 'german', fr: 'french', pt: 'portuguese', pl: 'polish', ru: 'russian' }
const LOCAL_SRC = { english: 'oewn', chinese: 'cedict', korean: 'kaikki-korean', spanish: 'kaikki-spanish', german: 'kaikki-german', french: 'kaikki-french', portuguese: 'kaikki-portuguese', polish: 'kaikki-polish', russian: 'kaikki-russian' }

// app data
const appById = new Map()
for (const l of Object.values(FULL2)) { const man = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', l, 'manifest.json'), 'utf8')); for (const lv of man.levels) for (const e of JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', l, lv.file), 'utf8'))) appById.set(e.id, { ...e, _lang: l }) }
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''
const stores = {}
for (const [lang, src] of Object.entries(LOCAL_SRC)) { const ix = loadIndex(src); if (ix) stores[lang] = ix }

function tokset(s) { return new Set(String(s || '').toLowerCase().replace(/[()[\]{}.,;:!?"'/\\-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !['the', 'a', 'to', 'of', 'and', 'or'].includes(w))) }

const classified = []
for (const c of crit) {
  const lang = FULL2[c.language] || c.language
  const e = appById.get(c.id)
  if (!e) { classified.push({ ...c, cause: 'data_structure_error', category: 'G', isRealError: false, note: '元データにIDなし' }); continue }
  const answer = e.answer, prompt = e.prompt, example = ('example' in e) ? e.example : null
  const look = stores[lang]?.lookup(hw(e))
  const dictPos = look?.found ? [...new Set(look.entries.flatMap((x) => x.partsOfSpeech))].filter(Boolean) : []
  const dictGloss = look?.found ? look.entries.flatMap((x) => x.senses.flatMap((s) => s.glossesEn)) : []

  let cause, category, isRealError, recommendedAction = 'none', suggestedValue = null, confidence = 0, safeToAutoFix = false, learningImpact = 'low', reason = ''

  if (c.pos === 'different') {
    const appTags = Array.isArray(e.tags) ? e.tags.filter((t) => t !== 'phrase') : []
    const appPosJa = appTags[0] || null
    const appPosCanon = appPosJa ? POSMAP[appPosJa] : null
    const schema = APP_POS_SCHEMA[lang] || new Set()
    const dictJaLabels = dictPos.map((p) => JA_LABEL[p]).filter(Boolean)
    const dictInSchema = dictPos.every((p) => schema.has(JA_LABEL[p]))
    const anyContentGap = dictPos.some((p) => JA_LABEL[p] && !schema.has(JA_LABEL[p]))
    const taxonomyOnly = dictPos.every((p) => !CONTENT_POS.has(p) && !['pronoun', 'preposition', 'conjunction', 'interjection', 'numeral', 'determiner'].includes(p)) // phrase/character/name等
    if (dictPos.length === 0) { cause = 'dictionary_coverage_limitation'; category = 'F'; isRealError = false; reason = '辞書に品詞情報なし' }
    else if (taxonomyOnly) { cause = 'dictionary_taxonomy_difference'; category = 'C'; isRealError = false; reason = `辞書品詞[${dictPos}]はアプリ品詞体系と対応しない分類(phrase/name等)` }
    else if (dictPos.length > 1) { cause = 'multiple_parts_of_speech'; category = 'D'; isRealError = false; learningImpact = 'low'; reason = `辞書に複数品詞[${dictPos}]。現レコードの採用品詞を人手確認` }
    else {
      // 単一品詞
      const target = JA_LABEL[dictPos[0]]
      if (!schema.has(target)) { cause = 'schema_missing_part_of_speech'; category = 'B'; isRealError = false; recommendedAction = 'schema_extend_then_retag'; suggestedValue = [target]; confidence = 0.9; learningImpact = 'low'; reason = `辞書は単一品詞[${dictPos[0]}]だがアプリ${lang}スキーマに『${target}』が無い→スキーマ拡張が本筋(個別データ誤りではない)` }
      else { // 対象品詞がスキーマ内 → 修正可能な誤タグ(A)
        cause = 'incorrect_part_of_speech_tag'; category = 'A'; isRealError = true; recommendedAction = 'change_tag'; suggestedValue = [target]; confidence = 0.97; learningImpact = 'low'
        reason = `辞書は単一品詞[${dictPos[0]}=${target}](スキーマ内)。現タグ『${appPosJa}』は誤り。answer『${answer}』で要確認`
        // 安全条件(Phase6): exact見出し + 単一品詞 + スキーマ内 + conf>=0.99。answerからの品詞確証が要るため既定はhuman review寄り
        safeToAutoFix = false
      }
    }
    classified.push({ id: c.id, language: c.language, field: 'tags', currentValue: e.tags, dictionaryEvidence: [{ source: LOCAL_SRC[lang], headwordMatch: c.headword_status, partsOfSpeech: dictPos, glosses: dictGloss.slice(0, 3) }], cause, category, isRealError, learningImpact, recommendedAction, suggestedValue, confidence, safeToAutoFix, requiresHumanReview: !safeToAutoFix, appAnswer: answer, appExample: example, reason })
  } else if (c.glossEn === 'different') {
    // gloss差: 同義/範囲差か実誤訳か
    const appEn = e.glosses?.en ?? e.answer
    const at = tokset(appEn), gt = tokset(dictGloss.join(' ; '))
    const overlap = [...at].filter((w) => gt.has(w)).length
    if (overlap > 0) { cause = 'gloss_scope_difference'; category = 'E'; isRealError = false; reason = `アプリ英語義『${appEn}』と辞書義に部分重複あり(表現/範囲差)` }
    else {
      // 重複なし: 辞書に該当義があるか(多義)を確認
      cause = 'gloss_synonym_difference'; category = 'E'; isRealError = false; learningImpact = 'medium'
      reason = `アプリ英語義『${appEn}』が辞書義[${dictGloss.slice(0, 3).join(' / ')}]と語彙上一致せず。同義/多義/表現差の可能性→人手確認。断定しない(規則6)`
      category = 'D' // 重複ゼロは人手確認へ
    }
    classified.push({ id: c.id, language: c.language, field: 'glosses.en/answer', currentValue: appEn, dictionaryEvidence: [{ source: LOCAL_SRC[lang], headwordMatch: c.headword_status, partsOfSpeech: dictPos, glosses: dictGloss.slice(0, 5) }], cause, category, isRealError, learningImpact, recommendedAction: 'none', suggestedValue: null, confidence: 0, safeToAutoFix: false, requiresHumanReview: true, appAnswer: answer, appExample: example, reason })
  } else {
    classified.push({ id: c.id, language: c.language, field: c.field || '?', cause: 'other', category: 'G', isRealError: false, safeToAutoFix: false, requiresHumanReview: true, reason: 'pos/gloss以外のcritical' })
  }
}

fs.writeFileSync(path.join(outDir, 'critical-classified.json'), JSON.stringify(classified, null, 2))
// A-G分割
const cats = { A: [], B: [], C: [], D: [], E: [], F: [], G: [] }
for (const c of classified) (cats[c.category] || cats.G).push(c)
const names = { A: 'category-A-real-errors', B: 'category-B-schema', C: 'category-C-taxonomy', D: 'category-D-human-review', E: 'category-E-gloss-variation', F: 'category-F-dictionary-limit', G: 'category-G-insufficient' }
for (const [k, arr] of Object.entries(cats)) fs.writeFileSync(path.join(outDir, names[k] + '.json'), JSON.stringify(arr, null, 2))

// inventory
const byLang = {}, byCause = {}, byCat = {}
for (const c of classified) { byLang[c.language] = (byLang[c.language] || 0) + 1; byCause[c.cause] = (byCause[c.cause] || 0) + 1; byCat[c.category] = (byCat[c.category] || 0) + 1 }
const inv = { total: crit.length, uniqueIds: new Set(crit.map((c) => c.id)).size, missingIds: classified.filter((c) => c.cause === 'data_structure_error').length, byLanguage: byLang, byCause, byCategory: byCat, categorySum: Object.values(byCat).reduce((a, b) => a + b, 0) }
fs.writeFileSync(path.join(outDir, 'critical-inventory.json'), JSON.stringify(inv, null, 2))
console.log('分類完了 総数', classified.length)
console.log('原因別:', byCause)
console.log('カテゴリ別:', byCat, '合計', inv.categorySum, inv.categorySum === crit.length ? 'OK' : 'NG')
