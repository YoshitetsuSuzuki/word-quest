// ============================================================================
// build-candidates.mjs  pt/ru/pl の語彙拡張: 候補生成(第2段階)
//
//   頻度リスト(hermitdave/CC-BY) 上位から、Wiktextract(kaikki/CC-BY-SA)で
//   「錨1=英語義」を確定し、EJDict×JMdictの厳格な双方向一致で「錨2=日本語義」を確定する。
//   両方の錨を通らない語は捨てる(精度優先・語数は二の次)。
//
//   除外: 固有名詞/活用形/略語/1文字/卑語/方言・古語/多品詞で曖昧な語 など
//   出力: tools/expand/candidates.<lang>.json  [{word,pos,en,ja,rank}]
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

// 4択クイズに適した品詞のみ(機能語は訳が曖昧で選択肢が作れない)
const GOOD_POS = new Set(['noun', 'verb', 'adj', 'adv'])

// 語義に付いていたら採用しない sense タグ(古語/方言/俗語/誤用など)
const BAD_SENSE_TAGS = new Set([
  'obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'slang', 'vulgar', 'offensive',
  'derogatory', 'misspelling', 'nonstandard', 'proscribed', 'poetic',
  'humorous', 'euphemistic',
])
// 見出し語自体に付いていたら除外(活用形・固有名詞など)
const BAD_WORD_TAGS = new Set([
  'form-of', 'inflection-of', 'participle', 'plural', 'feminine-of', 'masculine-of',
  'diminutive-of', 'superlative', 'comparative', 'abbreviation', 'initialism', 'acronym',
])

const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

// ---- 英語グロスの正規化(EJDict照合用) ----
function normEng(e) {
  return String(e || '')
    .toLowerCase()
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[.;:,]+$/, '')
    .trim()
}

// ---- EJDict(英日) ----
function loadEjdict() {
  const raw = fs.readFileSync(path.join(cacheDir, 'ejdict-all.txt'), 'utf8')
  const map = new Map()
  for (const line of raw.split('\n')) {
    const t = line.indexOf('\t')
    if (t < 0) continue
    const key = normEng(line.slice(0, t))
    if (!key) continue
    if (!map.has(key)) map.set(key, line.slice(t + 1))
  }
  return map
}

// EJDictの定義文から日本語語義を順に取り出す(先頭=中心義)
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

// ---- JMdict(日英): 日本語 -> 主要英訳(第一sense) ----
function loadJmdictPrimary() {
  const j = JSON.parse(fs.readFileSync(path.join(cacheDir, 'jmdict-eng-common-3.6.2.json'), 'utf8'))
  const map = new Map() // 日本語表記 -> Set(主要英訳)
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

/**
 * 英語義 en に対し、EJDict→日本語候補→JMdictで主要訳がenに戻るものだけ採用。
 *
 * 【多義語の誤着地対策】英語の多義語(mine=私のもの/機雷, property=性質/資産,
 * strain=緊張/菌株)で誤った語義に着地する事故が多発したため、以下を追加する:
 *  (a) EJDictの語義は先頭 EJ_TOP_N 個(=中心義)しか見ない。周辺義は使わない。
 *  (b) JMdictの逆引きで、その日本語の主要英訳が en 「だけ」に近いこと(多義でない)を要求。
 *      日本語側が多くの英訳を持つ = 一般的すぎる語なので落とす。
 *  (c) 対象言語の語義が複数(senseCount)ある多義語は、そもそも誤着地しやすいので除外。
 */
const EJ_TOP_N = 3
const JM_MAX_PRIMARY = 4

function pivotToJa(en, ej, jm) {
  const key = normEng(en)
  const def = ej.get(key)
  if (!def) return null
  const terms = ejJapaneseTerms(def).slice(0, EJ_TOP_N) // (a) 中心義のみ
  for (const ja of terms) {
    const back = jm.get(ja)
    if (!back || !back.has(key)) continue // E と J が互いに主要訳
    if (back.size > JM_MAX_PRIMARY) continue // (b) 日本語側が多義すぎる
    return ja
  }
  return null
}

// ---- Kaikki辞書を読み、語→{pos,英語義} を作る ----
// 数百MB〜1GBのため readFileSync では ERR_STRING_TOO_LONG になる。
// 固定長バッファで読みながら行単位に切り出して処理する。
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

function loadKaikki(file, code) {
  const map = new Map() // word -> [{pos, gloss, senseCount}]
  for (const line of readLines(path.join(rawDir, file))) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== code) continue
    if (!GOOD_POS.has(e.pos)) continue
    const wtags = new Set(e.tags || [])
    if ([...wtags].some((t) => BAD_WORD_TAGS.has(t))) continue
    if (!e.word || /[\s\d'’.\-]/.test(e.word)) continue // 複合語・数字・略記を除外
    if (e.word !== e.word.toLowerCase()) continue // 固有名詞(大文字始まり)を除外
    // 使える語義(先頭から)を探す
    for (const s of e.senses || []) {
      const stags = new Set(s.tags || [])
      if ([...stags].some((t) => BAD_SENSE_TAGS.has(t))) continue
      if (stags.has('form-of') || s.form_of) continue
      const g = (s.glosses || [])[0]
      if (!g) continue
      // 「X の複数形」などのメタ語義を除外
      if (/\b(plural|form|inflection|spelling|of\s+\w+)\b/i.test(g) && /\bof\b/i.test(g)) continue
      if (g.length > 60) continue
      if (!map.has(e.word)) map.set(e.word, [])
      map.get(e.word).push({ pos: e.pos, gloss: g, senseCount: (e.senses || []).length })
      break
    }
  }
  return map
}

// ---- 実行 ----
const ej = loadEjdict()
const jm = loadJmdictPrimary()
console.log(`EJDict ${ej.size}項目 / JMdict ${jm.size}表記 を読み込み`)

for (const L of LANGS) {
  const dictPath = path.join(rawDir, L.dict)
  if (!fs.existsSync(dictPath)) { console.log(`skip ${L.key}: 辞書未取得`); continue }
  const kaikki = loadKaikki(L.dict, L.code)
  const freq = fs.readFileSync(path.join(cacheDir, L.freq), 'utf8').split('\n')

  const existing = new Set()
  try {
    const man = JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', L.key, 'manifest.json'), 'utf8'))
    for (const lv of man.levels)
      for (const e of JSON.parse(fs.readFileSync(path.join(root, 'public', 'wordbank', L.key, lv.file), 'utf8')))
        existing.add(String(e.prompt || '').replace(/[「」]|の意味は？/g, ''))
  } catch {}

  const out = []
  const seenJa = new Set()
  let rank = 0
  for (const line of freq) {
    const w = line.split(' ')[0]
    if (!w) continue
    rank++
    if (out.length >= 2600) break // 検証で減るので多めに確保
    if (w.length < 2) continue
    if (existing.has(w)) continue
    const cands = kaikki.get(w)
    if (!cands || !cands.length) continue
    if (cands.length > 1) continue // 多品詞で曖昧な語は捨てる(精度優先)
    const { pos, gloss, senseCount } = cands[0]
    // (c) 対象言語側が多義な語は誤着地しやすいので除外(mine/property型の事故防止)
    if (senseCount > 6) continue
    const ja = pivotToJa(gloss, ej, jm)
    if (!ja) continue
    if (seenJa.has(ja)) continue // 日本語訳の重複を防ぐ(4択が壊れるため)
    seenJa.add(ja)
    out.push({ word: w, pos, en: normEng(gloss), ja, rank })
  }
  fs.writeFileSync(path.join(outDir, `candidates.${L.key}.json`), JSON.stringify(out, null, 1))
  console.log(`${L.key}: 候補 ${out.length}語 (辞書${kaikki.size}語/既存${existing.size}語を除外)`)
}
console.log('DONE')
