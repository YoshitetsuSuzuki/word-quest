// ============================================================================
// build-candidates-multipos.mjs  多品詞語の回収（第2弾の候補生成）
//
//   前回は「1語に複数品詞があると曖昧」として機械的に全部捨てた(葡3645/露1777/波1447)。
//   しかしこれらは casa のように、品詞を絞れば正当な基本語である。
//   ここでは「最も語義数が多い品詞＝その語の主用法」を1つ選び、候補にする。
//   最終判断はエージェント検証に委ねるため、機械側は控えめに候補を出す。
//
//   ※ 活用形・機能語は前回の分析で「錨待ち」の大半を占めると判明したため、
//     除外条件をさらに強化する（form-of 系の語義文言も弾く）。
//
//   出力: tools/expand/candidates2.<lang>.json
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const cacheDir = path.join(root, '.cache')
const rawDir = path.join(root, 'tools', 'dictionary-audit', 'data', 'raw')
const outDir = path.join(root, 'tools', 'expand')

const LANGS = [
  { key: 'portuguese', freq: 'pt_50k.txt', dict: 'kaikki-portuguese-full.jsonl', code: 'pt' },
  { key: 'russian', freq: 'ru_50k.txt', dict: 'kaikki-russian-full.jsonl', code: 'ru' },
  { key: 'polish', freq: 'pl_50k.txt', dict: 'kaikki-polish-full.jsonl', code: 'pl' },
]

const GOOD_POS = new Set(['noun', 'verb', 'adj', 'adv'])
const BAD_SENSE_TAGS = new Set([
  'obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'slang', 'vulgar', 'offensive',
  'derogatory', 'misspelling', 'nonstandard', 'proscribed', 'poetic', 'humorous', 'euphemistic',
])
const BAD_WORD_TAGS = new Set([
  'form-of', 'inflection-of', 'participle', 'plural', 'feminine-of', 'masculine-of',
  'diminutive-of', 'superlative', 'comparative', 'abbreviation', 'initialism', 'acronym',
])

/** 活用形・別形を示す語義文言（前回の分析で最大のノイズ源と判明） */
const FORM_OF_RE = /\b(first|second|third)-person\b|\bsingular\b|\bplural of\b|\bpast (tense|participle)\b|\bpresent (indicative|participle|tense)\b|\bfuture of\b|\bimperative\b|\bgerund\b|\balternative (form|spelling)\b|\bsynonym of\b|\bdiminutive of\b|\bvocative\b|\bgenitive\b|\bdative\b|\bablative\b|\baccusative\b|\binflection of\b|\bform of\b/i

function normEng(e) {
  return String(e || '')
    .toLowerCase()
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[.;:,]+$/, '')
    .trim()
}

function loadEjdict() {
  const raw = fs.readFileSync(path.join(cacheDir, 'ejdict-all.txt'), 'utf8')
  const map = new Map()
  for (const line of raw.split('\n')) {
    const t = line.indexOf('\t')
    if (t < 0) continue
    const key = normEng(line.slice(0, t))
    if (key && !map.has(key)) map.set(key, line.slice(t + 1))
  }
  return map
}

const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/
function ejJapaneseTerms(def) {
  const terms = []
  for (let seg of String(def || '').split(/[\/;]/)) {
    seg = seg.replace(/\([^)]*\)/g, '').replace(/`/g, '').replace(/《[^》]*》/g, '').trim()
    if (!seg || !HAS_JP.test(seg)) continue
    for (let t of seg.split(/[、，,]/)) {
      t = t.trim().replace(/^[…‥・]+/, '').replace(/[…‥・]+$/, '').trim()
      if (t && HAS_JP.test(t) && t.length <= 12) terms.push(t)
    }
  }
  return [...new Set(terms)]
}

function loadJmdictPrimary() {
  const j = JSON.parse(fs.readFileSync(path.join(cacheDir, 'jmdict-eng-common-3.6.2.json'), 'utf8'))
  const map = new Map()
  for (const w of j.words) {
    const forms = [...(w.kanji || []).map((k) => k.text), ...(w.kana || []).map((k) => k.text)]
    const s0 = (w.sense || [])[0]
    if (!s0) continue
    const prim = new Set()
    for (const g of s0.gloss || []) for (const e of normEng(g.text).split(/\s*,\s*/)) if (e) prim.add(e)
    if (!prim.size) continue
    for (const f of forms) {
      if (!map.has(f)) map.set(f, new Set())
      for (const p of prim) map.get(f).add(p)
    }
  }
  return map
}

const EJ_TOP_N = 3
const JM_MAX_PRIMARY = 4
function pivotToJa(en, ej, jm) {
  const key = normEng(en)
  const def = ej.get(key)
  if (!def) return null
  for (const ja of ejJapaneseTerms(def).slice(0, EJ_TOP_N)) {
    const back = jm.get(ja)
    if (!back || !back.has(key)) continue
    if (back.size > JM_MAX_PRIMARY) continue
    return ja
  }
  return null
}

function* readLines(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(1 << 20)
  let rest = ''
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null)
      if (n <= 0) break
      const chunk = rest + buf.toString('utf8', 0, n)
      const parts = chunk.split('\n')
      rest = parts.pop() ?? ''
      for (const p of parts) yield p
    }
    if (rest) yield rest
  } finally {
    fs.closeSync(fd)
  }
}

/** 語 -> 品詞ごとの{gloss, senseCount} をすべて集める */
function loadKaikkiAll(file, code) {
  const map = new Map()
  for (const line of readLines(path.join(rawDir, file))) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== code || !GOOD_POS.has(e.pos)) continue
    if (!e.word || /[\s\d'’.\-]/.test(e.word)) continue
    if (e.word !== e.word.toLowerCase()) continue
    if ([...(e.tags || [])].some((t) => BAD_WORD_TAGS.has(t))) continue
    for (const s of e.senses || []) {
      const stags = new Set(s.tags || [])
      if ([...stags].some((t) => BAD_SENSE_TAGS.has(t))) continue
      if (stags.has('form-of') || s.form_of) continue
      const g = (s.glosses || [])[0]
      if (!g || g.length > 60) continue
      if (FORM_OF_RE.test(g)) continue // 活用形・別形の語義は採らない
      if (!map.has(e.word)) map.set(e.word, [])
      map.get(e.word).push({ pos: e.pos, gloss: g, senseCount: (e.senses || []).length })
      break
    }
  }
  return map
}

const ej = loadEjdict()
const jm = loadJmdictPrimary()
console.log(`EJDict ${ej.size} / JMdict ${jm.size}`)

for (const L of LANGS) {
  if (!fs.existsSync(path.join(rawDir, L.dict))) { console.log(`skip ${L.key}`); continue }
  const kaikki = loadKaikkiAll(L.dict, L.code)

  const existing = new Set()
  const existingJa = new Set()
  const man = JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', L.key, 'manifest.json'), 'utf8'))
  for (const lv of man.levels)
    for (const e of JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', L.key, lv.file), 'utf8'))) {
      existing.add(String(e.prompt || '').replace(/[「」]|の意味は？/g, ''))
      if (e.glosses?.ja) existingJa.add(e.glosses.ja)
    }

  const out = []
  const seenJa = new Set(existingJa)
  let rank = 0
  for (const line of fs.readFileSync(path.join(cacheDir, L.freq), 'utf8').split('\n')) {
    const w = line.split(' ')[0]
    if (!w) continue
    rank++
    if (out.length >= 1200) break
    if (w.length < 3) continue // 短い語は機能語・活用形が多いので今回は3文字以上に絞る
    if (existing.has(w)) continue
    const cands = kaikki.get(w)
    if (!cands || cands.length < 2) continue // 今回は「多品詞だった語」だけを対象にする
    // 主用法 = 語義数が最も多い品詞
    const main = cands.reduce((a, b) => (b.senseCount > a.senseCount ? b : a))
    if (main.senseCount > 12) continue // 極端な多義は依然として除外
    const ja = pivotToJa(main.gloss, ej, jm)
    if (!ja || seenJa.has(ja)) continue
    seenJa.add(ja)
    out.push({ word: w, pos: main.pos, en: normEng(main.gloss), ja, rank, posOptions: cands.map((c) => c.pos).join('/') })
  }
  fs.writeFileSync(path.join(outDir, `candidates2.${L.key}.json`), JSON.stringify(out, null, 1))
  console.log(`${L.key}: 多品詞からの回収候補 ${out.length}語`)
}
console.log('DONE')
