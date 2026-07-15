// ============================================================================
// process-schema-gap.mjs  スキーマ不足303件を分類し、安全なもの(A)のみ tags 修正
//   英語副詞288 + 韓国語(代名詞8/数詞6/間投詞1)=15。tagsのみ変更・他フィールド不変。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const D = path.join(repoRoot, 'audit', 'pos-migration')
fs.mkdirSync(D, { recursive: true })
const B = JSON.parse(fs.readFileSync(path.join(repoRoot, 'audit', 'critical-remediation', 'category-B-schema.json'), 'utf8'))

const CAUTION = new Set(['before', 'after', 'around', 'inside', 'outside', 'since', 'once', 'right', 'well', 'fast', 'hard', 'just', 'still', 'even', 'that', 'what', 'which', 'who', 'some', 'all', 'one', 'first', 'like', 'about', 'over', 'up', 'down', 'off', 'on', 'in', 'out', 'through', 'either', 'instead', 'below', 'beneath', 'above', 'near', 'past'])
const app = new Map()
for (const lang of ['english', 'korean']) { const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) for (const e of JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, lv.file), 'utf8'))) app.set(e.id, { ...e, _lang: lang }) }
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

const NUM_JA = /^(一|二|三|四|五|六|七|八|九|十|百|千|ひと|ふた|みっ|よっ|いつ|むっ|なな|やっ|ここの|とお|[0-9１-９])/
const PRON_JA = /(私|僕|俺|わたし|あなた|君|彼|彼女|誰|だれ|何|なに|これ|それ|あれ|どれ|自分|みんな|皆|我々|us|me|you|who|what|them|それら|これら|あなたたち|私たち)/
const INTJ_JA = /(はい|いいえ|いえ|ええ|うん|ああ|おお|やあ|まあ|ねえ|おい|わあ|あら|へえ)/

const reviewed = [], cats = { A: [], B: [], C: [], D: [] }
for (const x of B) {
  const e = app.get(x.id); if (!e) { cats.C.push({ ...x, cause: 'missing', decision: 'C' }); continue }
  const word = hw(e), answer = e.answer, example = ('example' in e) ? e.example : null
  const target = (x.suggestedValue || [])[0]
  const dictPos = (x.dictionaryEvidence?.[0] || {}).partsOfSpeech || []
  const cur = (e.tags || []).filter((t) => t !== 'phrase')[0]
  let cat = 'C', conf = 0, reason = ''
  const single = dictPos.length === 1
  const isPrepAns = /の(?:前|後|間|周|上|下|中|そば|代わり|ため)/.test(String(answer || '')) // 前置詞的
  const inCaution = CAUTION.has(word.toLowerCase())
  if (!single) { cat = 'C'; reason = `辞書に複数品詞[${dictPos}]→人手` }
  else if (inCaution || isPrepAns) { cat = 'C'; reason = `多品詞語/前置詞的answer『${answer}』→人手(自動修正しない)` }
  else if (target === '副詞') {
    if (dictPos[0] === 'adverb' && !/の[前後間周上下中]/.test(String(answer || ''))) { cat = 'A'; conf = 0.99; reason = `answer『${answer}』は副詞的・辞書単一adverb・前置詞用法でない` }
    else { cat = 'C'; reason = 'answerが副詞と確証できない' }
  } else if (target === '代名詞') {
    if (dictPos.includes('pronoun') && PRON_JA.test(String(answer || ''))) { cat = 'A'; conf = 0.99; reason = `answer『${answer}』は代名詞・辞書pronoun` }
    else { cat = 'C'; reason = '代名詞と確証できず→人手' }
  } else if (target === '数詞') {
    if (dictPos.includes('numeral') && NUM_JA.test(String(answer || ''))) { cat = 'A'; conf = 0.99; reason = `answer『${answer}』は数詞・辞書numeral` }
    else { cat = 'C'; reason = '数詞と確証できず→人手' }
  } else if (target === '間投詞') {
    if (dictPos.includes('interjection') && INTJ_JA.test(String(answer || ''))) { cat = 'A'; conf = 0.99; reason = `answer『${answer}』は間投詞・辞書interjection` }
    else { cat = 'C'; reason = '間投詞と確証できず→人手' }
  }
  const rec = { id: x.id, language: e._lang === 'english' ? 'en' : 'ko', headword: word, currentTags: e.tags, answer, example, dictPos, suggestedTag: [target], multiplePos: !single, category: cat, confidence: conf, reason }
  reviewed.push(rec); cats[cat].push(rec)
}
fs.writeFileSync(path.join(D, 'schema-gap-303-reviewed.json'), JSON.stringify(reviewed, null, 2))
for (const [k, name] of Object.entries({ A: 'schema-gap-A-safe', B: 'schema-gap-B-multiple', C: 'schema-gap-C-human', D: 'schema-gap-D-no-change' })) fs.writeFileSync(path.join(D, name + '.json'), JSON.stringify(cats[k], null, 2))

// proposed + apply (A only, conf>=0.99, tags only)
const proposed = cats.A.map((r) => ({ id: r.id, headword: r.headword, before: r.currentTags, after: r.suggestedTag, answer: r.answer, dictionaryPartsOfSpeech: r.dictPos, reason: r.reason, confidence: r.confidence }))
fs.writeFileSync(path.join(D, 'schema-gap-fixes-proposed.json'), JSON.stringify(proposed, null, 2))
fs.writeFileSync(path.join(D, 'schema-gap-fixes-proposed.md'), `# スキーマ不足 安全修正 提案(適用前)\n\n計 ${proposed.length}件 / tagsのみ\n\n| id | before | after | answer |\n|---|---|---|---|\n` + proposed.slice(0, 40).map((p) => `| ${p.id} | ${JSON.stringify(p.before)} | ${JSON.stringify(p.after)} | ${p.answer} |`).join('\n') + '\n')

// apply
const fileCache = new Map(); const loc = new Map()
for (const lang of ['english', 'korean']) { const m = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8')); for (const lv of m.levels) { const p = path.join(repoRoot, 'public', 'wordbank', lang, lv.file); const o = fs.readFileSync(p, 'utf8'); const arr = JSON.parse(o); const key = lang + '/' + lv.file; fileCache.set(key, { p, arr, roundTrip: JSON.stringify(arr) === o }); arr.forEach((en, i) => loc.set(en.id, { key, idx: i })) } }
const applied = [], skipped = [], touched = new Set()
for (const p of proposed) {
  const L = loc.get(p.id); const e = fileCache.get(L.key).arr[L.idx]
  if (JSON.stringify(e.tags) !== JSON.stringify(p.before)) { skipped.push({ id: p.id, reason: '現tags不一致', current: e.tags }); continue }
  const before = [...e.tags]; const keep = e.tags.filter((t) => t === 'phrase')
  e.tags = [...p.after, ...keep]
  applied.push({ id: p.id, language: p.id.split('-')[0], headword: p.headword, field: 'tags', before, after: e.tags, answer: p.answer, dictionaryPartsOfSpeech: p.dictionaryPartsOfSpeech, reason: p.reason, confidence: p.confidence })
  touched.add(L.key)
}
for (const k of touched) { const fc = fileCache.get(k); if (!fc.roundTrip) throw new Error('round-trip非安全 ' + k); fs.writeFileSync(fc.p, JSON.stringify(fc.arr)) }
fs.writeFileSync(path.join(D, 'schema-gap-fixes-applied.json'), JSON.stringify({ appliedCount: applied.length, applied }, null, 2))
fs.writeFileSync(path.join(D, 'schema-gap-fixes-skipped.json'), JSON.stringify(skipped, null, 2))
fs.writeFileSync(path.join(D, 'schema-gap-fixes-applied.md'), `# スキーマ不足 安全修正 適用ログ\n\n適用 ${applied.length} / 見送り ${skipped.length} / tagsのみ\n\n言語別: en=${applied.filter((a) => a.language === 'en').length} ko=${applied.filter((a) => a.language === 'ko').length}\n`)
fs.writeFileSync(path.join(D, 'schema-gap-303-summary.md'), `# スキーマ不足303 分類サマリー\n\nA(安全移行) ${cats.A.length} / B(複数) ${cats.B.length} / C(人手) ${cats.C.length} / D(不変) ${cats.D.length} = ${cats.A.length + cats.B.length + cats.C.length + cats.D.length}\n\n提案品詞別(全303): 副詞288 / 代名詞8 / 数詞6 / 間投詞1\n適用A ${applied.length}件(tagsのみ)。前置詞的answer・多品詞・caution語は人手(C)。\n`)

console.log('分類 A', cats.A.length, '/ B', cats.B.length, '/ C', cats.C.length, '/ D', cats.D.length, '= 計', reviewed.length)
console.log('適用', applied.length, '(en', applied.filter((a) => a.language === 'en').length, '/ ko', applied.filter((a) => a.language === 'ko').length, ') / 見送り', skipped.length)
