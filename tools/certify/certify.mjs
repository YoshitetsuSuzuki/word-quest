// ============================================================================
// certify.mjs  品質保証フェーズ: 全語を証拠ベースで4段階に分類する
//
//   目的は「問題を見つけること」ではなく「正しいことを証拠付きで証明すること」。
//   推測による変更は一切しない。変更は CERTIFIED かつ現データと矛盾する場合のみ。
//
//   分類:
//     CERTIFIED  … 2辞書以上が一致 かつ 例文が支持 かつ answer一致 かつ 品詞一致
//     LIKELY     … 辞書が1つしか無いが、矛盾が全く無い
//     AMBIGUOUS  … 辞書同士が割れる（修正禁止）
//     REVIEW     … 証拠不足（修正禁止）
//
//   出力: tools/certify/report/<lang>.json  と 集計
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const rawDir = path.join(root, 'tools', 'dictionary-audit', 'data', 'raw')
const fdDir = path.join(rawDir, 'freedict')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'tools', 'certify', 'report')
fs.mkdirSync(outDir, { recursive: true })

const ONLY = process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1]

// ---------------------------------------------------------------- 共通ユーティリティ
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

// 【注意】one/something 等は「一つ」「何か」の訳語そのものになりうるため STOP に入れない。
// STOP に入れると訳語トークンが空になり、正しいデータが照合不能になる。
const STOP = new Set(['a', 'an', 'the', 'to', 'be', 'of', 'in', 'on', 'for', 'with', 'and', 'or',
  'sth', 'sb', 'esp', 'etc', 'that', 'as', 'by', 'is', 'it'])

function stem(w) {
  return w.replace(/(ies)$/, 'y').replace(/(es|s|ing|ed|ly)$/, '')
}
/** 英語文字列 -> 比較用トークン集合（語幹も含む） */
function tok(s) {
  const out = new Set()
  for (const w of String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z\s'-]/g, ' ').split(/\s+/)) {
    if (w.length < 2 || STOP.has(w)) continue
    out.add(w)
    const st = stem(w)
    if (st.length > 2) out.add(st)
  }
  return out
}
const overlap = (a, b) => { for (const x of a) if (b.has(x)) return true; return false }

const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

// ---------------------------------------------------------------- 辞書ローダ
/** kaikki(Wiktextract): 見出し -> {glosses:Set<string>, pos:Set<string>} */
function loadKaikki(file, code) {
  const p = path.join(rawDir, file)
  if (!fs.existsSync(p)) return null
  const map = new Map()
  for (const line of readLines(p)) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (code && e.lang_code !== code) continue
    if (!e.word) continue
    let rec = map.get(e.word)
    if (!rec) { rec = { glosses: new Set(), pos: new Set() }; map.set(e.word, rec) }
    if (e.pos) rec.pos.add(e.pos)
    let n = 0
    for (const s of e.senses || []) {
      const g = (s.glosses || [])[0]
      if (!g) continue
      if (s.form_of || (s.tags || []).includes('form-of')) continue
      rec.glosses.add(g)
      if (++n >= 6) break
    }
  }
  return map
}

/** FreeDict TEI: 見出し -> Set<英訳> */
function loadTei(file) {
  const p = path.join(fdDir, file)
  if (!fs.existsSync(p)) return null
  const map = new Map()
  let inEntry = false, orths = [], quotes = []
  const flush = () => {
    if (orths.length && quotes.length)
      for (const o of orths) {
        const k = o.toLowerCase()
        if (!map.has(k)) map.set(k, new Set())
        const s = map.get(k)
        if (s.size < 12) for (const q of quotes) s.add(q)
      }
    orths = []; quotes = []
  }
  for (const line of readLines(p)) {
    if (/<entry\b/.test(line)) { flush(); inEntry = true }
    if (!inEntry) continue
    for (const m of line.matchAll(/<orth[^>]*>([^<]+)<\/orth>/g)) orths.push(m[1].trim())
    for (const m of line.matchAll(/<quote[^>]*>([^<]+)<\/quote>/g)) quotes.push(m[1].trim())
    if (/<\/entry>/.test(line)) { flush(); inEntry = false }
  }
  flush()
  return map
}

/** CC-CEDICT: 簡体字 -> Set<英訳> */
function loadCedict() {
  const p = path.join(cacheDir, 'cedict.txt')
  if (!fs.existsSync(p)) return null
  const map = new Map()
  for (const line of readLines(p)) {
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^(\S+)\s+(\S+)\s+\[[^\]]*\]\s+\/(.+)\/\s*$/)
    if (!m) continue
    const simp = m[2]
    if (!map.has(simp)) map.set(simp, new Set())
    const s = map.get(simp)
    for (const g of m[3].split('/')) if (s.size < 12) s.add(g)
  }
  return map
}

/** JMdict: 日本語表記 -> Set<英訳> */
function loadJmdict() {
  const p = path.join(cacheDir, 'jmdict-eng-common-3.6.2.json')
  if (!fs.existsSync(p)) return null
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  const map = new Map()
  for (const w of j.words) {
    const forms = [...(w.kanji || []).map((k) => k.text), ...(w.kana || []).map((k) => k.text)]
    const gl = new Set()
    for (const s of w.sense || []) for (const g of s.gloss || []) { if (gl.size < 12) gl.add(g.text) }
    if (!gl.size) continue
    for (const f of forms) {
      if (!map.has(f)) map.set(f, new Set())
      for (const g of gl) map.get(f).add(g)
    }
  }
  return map
}

/**
 * kengdic: ハングル -> Set<英訳>
 * 実際の形式は { "사랑": ["love", ...], ... } というオブジェクト。
 * Object.values() で回すと値(英訳)だけになり見出しを失うため、entries で読む。
 */
function loadKengdic() {
  const p = path.join(cacheDir, 'kengdic.json')
  if (!fs.existsSync(p)) return null
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  const map = new Map()
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const k = e?.hangul || e?.word || e?.surface
      const v = e?.english || e?.gloss || e?.def
      if (!k || !v) continue
      if (!map.has(k)) map.set(k, new Set())
      map.get(k).add(String(v))
    }
  } else {
    for (const [k, v] of Object.entries(raw)) {
      if (!k) continue
      const vals = Array.isArray(v) ? v : [v]
      const s = new Set()
      for (const x of vals) { if (s.size < 12 && x) s.add(String(x)) }
      if (s.size) map.set(k, s)
    }
  }
  return map
}

/** EJDict(英日): 英語 -> 定義文（日本語） */
function loadEjdict() {
  const p = path.join(cacheDir, 'ejdict-all.txt')
  if (!fs.existsSync(p)) return null
  const map = new Map()
  for (const line of readLines(p)) {
    const t = line.indexOf('\t')
    if (t < 0) continue
    const k = line.slice(0, t).toLowerCase().trim()
    if (k && !map.has(k)) map.set(k, line.slice(t + 1))
  }
  return map
}

// ---------------------------------------------------------------- 言語設定
// dicts: [{name, kind, get(word)->Set<英語義> | null}]
const LANGS = [
  { key: 'spanish', kaikki: ['kaikki-spanish-full.jsonl', 'es'], tei: 'spa-eng/spa-eng.tei', answerLang: 'en' },
  { key: 'french', kaikki: ['kaikki-french-full.jsonl', 'fr'], tei: 'fra-eng/fra-eng.tei', answerLang: 'en' },
  { key: 'german', kaikki: ['kaikki-german-full.jsonl', 'de'], tei: 'deu-eng/deu-eng.tei', answerLang: 'en' },
  { key: 'portuguese', kaikki: ['kaikki-portuguese-full.jsonl', 'pt'], tei: 'por-eng/por-eng.tei', answerLang: 'en' },
  { key: 'russian', kaikki: ['kaikki-russian-full.jsonl', 'ru'], tei: 'rus-eng/rus-eng.tei', answerLang: 'en' },
  { key: 'polish', kaikki: ['kaikki-polish-full.jsonl', 'pl'], tei: 'pol-eng/pol-eng.tei', answerLang: 'en' },
  { key: 'chinese', kaikki: ['kaikki-chinese-FULL.jsonl', 'zh'], cedict: true, answerLang: 'ja' },
  { key: 'japanese', kaikki: ['kaikki-japanese-FULL.jsonl', 'ja'], jmdict: true, answerLang: 'en' },
  { key: 'korean', kaikki: ['kaikki-korean-FULL.jsonl', 'ko'], kengdic: true, answerLang: 'ja' },
  { key: 'english', kaikki: ['kaikki-english-FULL.jsonl', 'en'], ejdict: true, answerLang: 'ja' },
]

const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''

/**
 * 日本語 -> 英語 の逆引き（JMdict由来）。
 * 韓国語カテゴリのように glosses.en を持たないデータを英語で照合するために使う。
 * 一度だけ構築して使い回す。
 */
let EJ_REVERSE = null
function buildJaToEn() {
  const p = path.join(cacheDir, 'jmdict-eng-common-3.6.2.json')
  if (!fs.existsSync(p)) return null
  const j = JSON.parse(fs.readFileSync(p, 'utf8'))
  const map = new Map()
  for (const w of j.words) {
    const forms = [...(w.kanji || []).map((k) => k.text), ...(w.kana || []).map((k) => k.text)]
    const gl = []
    for (const s of w.sense || []) for (const g of s.gloss || []) { if (gl.length < 8) gl.push(g.text) }
    if (!gl.length) continue
    for (const f of forms) {
      if (!map.has(f)) map.set(f, new Set())
      const set = map.get(f)
      if (set.size < 12) for (const g of gl) set.add(g)
    }
  }
  return map
}
EJ_REVERSE = buildJaToEn()

// 日本語の品詞タグ -> kaikki の pos
const POS_MAP = { 名詞: 'noun', 動詞: 'verb', 形容詞: 'adj', 副詞: 'adv', 代名詞: 'pron', 前置詞: 'prep', 接続詞: 'conj', 間投詞: 'intj', 数詞: 'num', 限定詞: 'det' }

const summary = []

for (const L of LANGS) {
  if (ONLY && L.key !== ONLY) continue
  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  if (!fs.existsSync(path.join(wbDir, 'manifest.json'))) continue

  // --- 辞書を用意（存在するものだけ） ---
  const dicts = []
  const kai = L.kaikki ? loadKaikki(L.kaikki[0], L.kaikki[1]) : null
  if (kai) dicts.push({ name: 'kaikki', map: kai, isKaikki: true })
  if (L.tei) { const t = loadTei(L.tei); if (t) dicts.push({ name: 'freedict', map: t }) }
  if (L.cedict) { const c = loadCedict(); if (c) dicts.push({ name: 'cedict', map: c }) }
  if (L.jmdict) { const j = loadJmdict(); if (j) dicts.push({ name: 'jmdict', map: j }) }
  if (L.kengdic) { const k = loadKengdic(); if (k) dicts.push({ name: 'kengdic', map: k }) }
  const ej = L.ejdict ? loadEjdict() : null
  if (ej) dicts.push({ name: 'ejdict', map: ej, isEj: true })

  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  let all = []
  for (const lv of man.levels) all = all.concat(JSON.parse(fs.readFileSync(path.join(wbDir, lv.file), 'utf8')))

  const results = []
  const counts = { CERTIFIED: 0, LIKELY: 0, AMBIGUOUS: 0, REVIEW: 0 }
  const contradictions = []

  for (const e of all) {
    const word = hw(e)
    // 「その語の意味」を表す英語表現。ピボット言語は answer が英語、
    // 日本語母語カテゴリ(英/中/韓)は glosses.en が英語。
    const myEn = L.answerLang === 'en' ? e.answer : e.glosses?.en
    const myJa = L.answerLang === 'ja' ? e.answer : e.glosses?.ja

    // --- 各辞書を引く ---
    const hits = [] // {name, glosses:Set<string>, pos:Set|null}
    for (const d of dicts) {
      let rec = null
      if (d.isEj) {
        // EJDict は英日。英語見出しで引き、日本語定義を得る（英語カテゴリ用）
        const def = d.map.get(String(word).toLowerCase())
        if (def) rec = { glossesJa: def }
      } else {
        const r = d.map.get(word) ?? d.map.get(String(word).toLowerCase())
        if (r) rec = d.isKaikki ? { glosses: r.glosses, pos: r.pos } : { glosses: r }
      }
      if (rec) hits.push({ name: d.name, ...rec })
    }

    // --- 証拠の評価 ---
    const enDicts = hits.filter((h) => h.glosses && h.glosses.size)
    const jaDicts = hits.filter((h) => h.glossesJa)

    // (1) 辞書同士の一致: 英語義トークンが2辞書以上で重なるか
    //
    // 【重要】FreeDict(Ding由来)は独語の動詞見出しに名詞義や周辺義を返すことがある
    //   例: wissen→knowledge(名詞), essen→food(名詞), kommen→cum(俗語)
    // これは辞書側の粒度の問題であって、当方データの誤りではない。
    // よって「辞書同士が割れる」だけでは AMBIGUOUS とせず、
    // 「自データがどの辞書からも支持されない」場合に限り争点ありとする。
    let dictAgree = false, dictConflict = false
    if (enDicts.length >= 2) {
      const sets = enDicts.map((h) => { const s = new Set(); for (const g of h.glosses) for (const t of tok(g)) s.add(t); return s })
      let anyPair = false
      for (let i = 0; i < sets.length && !anyPair; i++)
        for (let j = i + 1; j < sets.length; j++) if (overlap(sets[i], sets[j])) { anyPair = true; break }
      dictAgree = anyPair
      dictConflict = !anyPair
    }

    // (2) 自データの英語義が、いずれかの辞書に支持されるか
    //
    // 【韓国語の特殊事情】韓国語カテゴリは glosses.en を持たず answer(日本語)のみ。
    // そのままでは英語で照合できず全て不一致になる。そこで日本語訳を EJDict 経由で
    // 英語に展開し、その英語群と辞書の英語義が重なるかで支持を判定する。
    let mine = tok(myEn)
    if (!mine.size && myJa && EJ_REVERSE) {
      // 「勉強する」のようなサ変動詞・形容動詞は JMdict に見出しが無いことがあるため、
      // する/だ/な を落とした語幹でも引く。引けなければ照合不能(=証拠不足)として扱う。
      const variants = [myJa,
        myJa.replace(/(する|した|している)$/, ''),
        myJa.replace(/(だ|な|い)$/, ''),
      ].filter((v, i, a) => v && a.indexOf(v) === i)
      for (const v of variants) {
        const ens = EJ_REVERSE.get(v)
        if (ens) { for (const en of ens) for (const t of tok(en)) mine.add(t) }
        if (mine.size) break
      }
    }
    let dictSupportsMine = false
    for (const h of enDicts) {
      for (const g of h.glosses) if (overlap(mine, tok(g))) { dictSupportsMine = true; break }
      if (dictSupportsMine) break
    }
    // 英語カテゴリは EJDict の日本語定義に自訳が含まれるかで支持を見る
    let ejSupportsJa = false
    if (jaDicts.length && myJa) for (const h of jaDicts) if (String(h.glossesJa).includes(myJa)) { ejSupportsJa = true; break }

    // (3) 例文が語を含むか（例文がその語の使用を支持するか）
    const exOk = !!(e.example && e.exampleForm && String(e.example).toLowerCase().includes(String(e.exampleForm).toLowerCase()))
    const hasExample = !!e.example

    // (4) 品詞一致（タグに品詞があり、かつ辞書側も品詞を持つ場合のみ判定可能）
    //
    // 【重要】中国語の kaikki は pos を "character"(漢字) としか記録せず、
    // 名詞/動詞の区別を持たない。日本語の kaikki も同様の粗さがある。
    // 品詞情報が無い辞書に対して「不一致」と判定するのは誤りであり、
    // 判定不能(null)として扱う。これは証拠が無いことを意味し、減点材料にしない。
    const GRAMMATICAL_POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'prep', 'conj', 'intj', 'num', 'det'])
    const tagPos = (e.tags || []).map((t) => POS_MAP[t]).filter(Boolean)
    const rawPos = hits.find((h) => h.pos)?.pos
    // 文法品詞を1つも持たない辞書(character 等しか無い)は品詞判定に使えない
    const kaikkiPos = rawPos && [...rawPos].some((p) => GRAMMATICAL_POS.has(p)) ? rawPos : null

    // 【重要】品詞の分類粒度は辞書ごとに異なる。
    //   例: 韓国語「어디(どこ)」は kaikki で pron/intj、当方タグは「名詞」。
    //       「하나(一つ)」は kaikki で num/noun。いずれもどちらの分類も妥当であり誤りではない。
    // よって「体言系(noun/pron/num/det)」「用言系(verb/adj)」といった大分類での一致も
    // 一致とみなす。真に矛盾するのは体言と用言が食い違う場合のみ。
    const CLASS = (p) => (['noun', 'pron', 'num', 'det', 'name'].includes(p) ? 'nominal'
      : ['verb', 'adj'].includes(p) ? 'predicate'
      : ['adv', 'intj', 'prep', 'conj'].includes(p) ? 'other' : 'other')
    let posOk = null // null = 判定不能
    if (tagPos.length && kaikkiPos && kaikkiPos.size) {
      const exact = tagPos.some((p) => kaikkiPos.has(p))
      const myClasses = new Set(tagPos.map(CLASS))
      const dictClasses = new Set([...kaikkiPos].map(CLASS))
      const classMatch = [...myClasses].some((c) => dictClasses.has(c))
      posOk = exact || classMatch
    }

    // (5) 現データが矛盾しているか: どの辞書もこの語義を支持しない
    const contradicted = enDicts.length > 0 && !dictSupportsMine && !ejSupportsJa

    // --- 分類 ---
    // 優先順位: 自データが支持されているか > 辞書同士が割れているか
    // 「複数辞書が自データを支持」していれば、辞書間に別義の食い違いがあっても
    // 当該語義については争点が無い＝CERTIFIED とする。
    let supportCount = 0
    for (const h of enDicts) {
      for (const g of h.glosses) if (overlap(mine, tok(g))) { supportCount++; break }
    }
    if (ejSupportsJa) supportCount++

    let status
    if (supportCount >= 2 && exOk && posOk !== false) {
      status = 'CERTIFIED'          // 2辞書以上が自データを支持＋例文＋品詞が整合
    } else if (supportCount >= 1 && posOk !== false) {
      status = 'LIKELY'             // 支持あり・矛盾なし
    } else if (dictConflict && enDicts.length >= 2) {
      status = 'AMBIGUOUS'          // どの辞書も支持せず、辞書同士も割れる
    } else if (enDicts.length === 0 && jaDicts.length === 0) {
      status = 'REVIEW'             // 辞書に見出しが無い＝証拠不足
    } else {
      status = 'AMBIGUOUS'          // 辞書はあるが自データを支持しない
    }

    counts[status]++
    const rec = {
      id: e.id, word, myEn, myJa, status,
      dicts: hits.map((h) => h.name),
      dictAgree, dictSupportsMine, hasExample, exampleSupports: exOk, posOk, contradicted,
    }
    results.push(rec)
    if (status === 'CERTIFIED' && contradicted) contradictions.push(rec)
  }

  fs.writeFileSync(path.join(outDir, `${L.key}.json`), JSON.stringify({
    language: L.key, total: all.length, dictionaries: dicts.map((d) => d.name), counts,
    certifiedContradictions: contradictions.length, results,
  }))

  const t = all.length
  const pub = counts.CERTIFIED + counts.LIKELY
  summary.push({
    lang: L.key, 語数: t, 辞書数: dicts.length,
    CERTIFIED: counts.CERTIFIED, LIKELY: counts.LIKELY, AMBIGUOUS: counts.AMBIGUOUS, REVIEW: counts.REVIEW,
    公開品質: Math.round((pub / t) * 1000) / 10 + '%',
    要変更: contradictions.length,
  })
  console.log(JSON.stringify(summary[summary.length - 1]))
}

fs.writeFileSync(path.join(outDir, '_summary.json'), JSON.stringify(summary, null, 1))
console.log('DONE')
