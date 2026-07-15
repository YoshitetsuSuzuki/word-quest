// ============================================================================
// process-critical-447.mjs  v4 critical 447件を12原因へ分類し、安全な tags のみ修正
//   在庫スキーマ内・単一品詞・answer確証・非caution のみ自動修正(conf>=0.99)。tagsのみ。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex } from './shared/index-store.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const D = path.join(repoRoot, 'audit', 'pos-migration')
const critV4 = JSON.parse(fs.readFileSync(path.join(here, 'reports', 'all-nine-v4', 'critical.json'), 'utf8'))
const POSMAP = JSON.parse(fs.readFileSync(path.join(here, 'config', 'languages.json'), 'utf8')).posMap
const JA_LABEL = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞' }
const SCHEMA = { english: new Set(['名詞', '動詞', '形容詞']), korean: new Set(['名詞', '動詞', '形容詞', '副詞']), chinese: new Set(['名詞', '動詞', '形容詞', '副詞']) }
const SRC = { english: 'oewn', korean: 'kaikki-korean', chinese: 'cedict' }
const FULL2 = { en: 'english', ko: 'korean', zh: 'chinese' }
const CAUTION = new Set(['seem', 'difference', 'record', 'present', 'object', 'increase', 'change', 'round', 'right', 'like', 'sound', 'light', 'work', 'order', 'answer', 'question', 'use', 'close', 'lead', 'read', 'contract', 'produce', 'export', 'import', 'permit', 'suspect', 'conduct', 'content', 'contrast', 'convert', 'decrease', 'default', 'refund', 'reject', 'result'])

const app = new Map()
for (const lang of ['english', 'korean', 'chinese']) { const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) for (const e of JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, lv.file), 'utf8'))) app.set(e.id, { ...e, _lang: lang }) }
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''
const stores = {}; for (const [l, s] of Object.entries(SRC)) { const ix = loadIndex(s); if (ix) stores[l] = ix }

function answerPos(a) {
  const s = String(a || '')
  // 形容詞: な/の/い/った/しい/だ(ナ形) 語尾、または がある/ている/できる/〜的(状態・性質)
  if (/(?:だ|な|い|った|しい|らしい|っぽい|的)$/.test(s) || /(?:がある|がない|ている|できる|得る)$/.test(s)) return 'adjective'
  // 副詞: く/に/と 語尾(動詞より先に判定して 早く=副詞 を確保)
  if (/(?:く|に|と)$/.test(s)) return 'adverb'
  // 動詞: する/なる 等、または る/う/action語尾(く は副詞へ回した)
  if (/(?:する|なる|のようだ|られる|せる)$/.test(s) || /[るうぐすつぬぶむ]$/.test(s)) return 'verb'
  return 'noun'
}

const reviewed = [], causes = {}
const safe = [], human = [], nochange = []
for (const c of critV4) {
  const lang = FULL2[c.language] || c.language
  const e = app.get(c.id)
  if (!e) { human.push({ id: c.id, cause: 'human_review_required', reason: 'IDなし' }); continue }
  const word = hw(e), answer = e.answer, example = ('example' in e) ? e.example : null
  const look = stores[lang]?.lookup(word)
  const dictPos = look?.found ? [...new Set(look.entries.flatMap((x) => x.partsOfSpeech))].filter(Boolean) : []
  const dictGloss = look?.found ? look.entries.flatMap((x) => x.senses.flatMap((s) => s.glossesEn)).slice(0, 3) : []
  const curTag = (e.tags || []).filter((t) => t !== 'phrase')[0]
  const schema = SCHEMA[lang] || new Set()
  const single = dictPos.length === 1
  const target = single ? JA_LABEL[dictPos[0]] : null
  const aPos = answerPos(answer)
  const inCaution = CAUTION.has(word.toLowerCase())

  let cause, cat, conf = 0, suggested = null, reason = ''
  if (!single) { cause = 'multiple_pos_ambiguous'; cat = 'human'; reason = `辞書複数品詞[${dictPos}]` }
  else if (!target || !schema.has(target)) { cause = 'dictionary_taxonomy_difference'; cat = 'human'; reason = `対象品詞[${dictPos[0]}]がスキーマ外/非対応` }
  else if (inCaution) { cause = 'multiple_pos_ambiguous'; cat = 'human'; reason = `同綴多品詞語(${word})→辞書のみで自動修正しない` }
  else if (JA_LABEL[aPos] === target) {
    // answerの語形が辞書品詞と一致 → 明確な誤タグ
    cause = dictPos[0] === 'noun' ? 'clear_noun_tag_error' : dictPos[0] === 'verb' ? 'clear_verb_tag_error' : dictPos[0] === 'adjective' ? 'clear_adjective_tag_error' : 'clear_other_tag_error'
    cat = 'safe'; conf = 0.99; suggested = [target]; reason = `answer『${answer}』(${aPos})と辞書単一品詞[${dictPos[0]}]が一致・スキーマ内・現タグ『${curTag}』は誤り`
  } else { cause = 'answer_pos_ambiguous'; cat = 'human'; reason = `answer『${answer}』の語形(${aPos})が辞書品詞[${dictPos[0]}]と一致せず→人手` }

  const rec = { id: c.id, language: c.language, headword: word, currentTags: e.tags, answer, example, dictPos, dictGloss, currentAdoptedSense: answer, needsFix: cat === 'safe', cause, category: cat, confidence: conf, suggestedTag: suggested, reason }
  reviewed.push(rec); causes[cause] = (causes[cause] || 0) + 1
  if (cat === 'safe') safe.push(rec); else if (cat === 'human') human.push(rec); else nochange.push(rec)
}
fs.writeFileSync(path.join(D, 'critical-447-reviewed.json'), JSON.stringify(reviewed, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-safe.json'), JSON.stringify(safe, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-human.json'), JSON.stringify(human, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-no-change.json'), JSON.stringify(nochange, null, 2))

// proposed + apply (safe only, tags)
const proposed = safe.map((r) => ({ id: r.id, language: r.language, headword: r.headword, before: r.currentTags, after: r.suggestedTag, answer: r.answer, dictionaryPartsOfSpeech: r.dictPos, cause: r.cause, reason: r.reason, confidence: 0.99 }))
fs.writeFileSync(path.join(D, 'critical-447-fixes-proposed.json'), JSON.stringify(proposed, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-fixes-proposed.md'), `# 未解決critical447 安全修正 提案(適用前)\n\n計 ${proposed.length}件 tagsのみ\n\n| id | before | after | answer | cause |\n|---|---|---|---|---|\n` + proposed.slice(0, 40).map((p) => `| ${p.id} | ${JSON.stringify(p.before)} | ${JSON.stringify(p.after)} | ${p.answer} | ${p.cause} |`).join('\n') + '\n')

const fileCache = new Map(); const loc = new Map()
for (const lang of ['english', 'korean', 'chinese']) { const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) { const p = path.join(repoRoot, 'public', 'wordbank', lang, lv.file); const o = fs.readFileSync(p, 'utf8'); const arr = JSON.parse(o); const key = lang + '/' + lv.file; fileCache.set(key, { p, arr, roundTrip: JSON.stringify(arr) === o }); arr.forEach((en, i) => loc.set(en.id, { key, idx: i })) } }
const applied = [], skipped = [], touched = new Set()
for (const p of proposed) {
  const L = loc.get(p.id); const e = fileCache.get(L.key).arr[L.idx]
  if (JSON.stringify(e.tags) !== JSON.stringify(p.before)) { skipped.push({ id: p.id, reason: '現tags不一致', current: e.tags }); continue }
  const before = [...e.tags]; const keep = e.tags.filter((t) => t === 'phrase')
  e.tags = [...p.after, ...keep]
  applied.push({ id: p.id, language: p.language, headword: p.headword, field: 'tags', before, after: e.tags, answer: p.answer, dictionaryPartsOfSpeech: p.dictionaryPartsOfSpeech, cause: p.cause, reason: p.reason, confidence: 0.99 })
  touched.add(L.key)
}
for (const k of touched) { const fc = fileCache.get(k); if (!fc.roundTrip) throw new Error('round-trip非安全 ' + k); fs.writeFileSync(fc.p, JSON.stringify(fc.arr)) }
fs.writeFileSync(path.join(D, 'critical-447-fixes-applied.json'), JSON.stringify({ appliedCount: applied.length, applied }, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-fixes-skipped.json'), JSON.stringify(skipped, null, 2))
fs.writeFileSync(path.join(D, 'critical-447-fixes-applied.md'), `# 未解決critical447 安全修正 適用ログ\n\n適用 ${applied.length} / 見送り ${skipped.length} / tagsのみ\n言語別: en=${applied.filter((a) => a.language === 'en').length} ko=${applied.filter((a) => a.language === 'ko').length}\n`)
fs.writeFileSync(path.join(D, 'critical-447-summary.md'), `# 未解決critical447 分類\n\n計 ${reviewed.length}\n\n## 原因別\n\n` + Object.entries(causes).map(([c, n]) => `- ${c}: ${n}`).join('\n') + `\n\n安全 ${safe.length} / 人手 ${human.length} / 変更不要 ${nochange.length} = ${safe.length + human.length + nochange.length}\n適用 ${applied.length}(tagsのみ)。同綴多品詞語(seem/record等)・answer不一致・辞書体系差は人手。\n`)

console.log('447分類 原因:', causes)
console.log('安全', safe.length, '/ 人手', human.length, '/ 変更不要', nochange.length, '= 計', reviewed.length)
console.log('適用', applied.length, '(en', applied.filter((a) => a.language === 'en').length, '/ ko', applied.filter((a) => a.language === 'ko').length, ') / 見送り', skipped.length)
