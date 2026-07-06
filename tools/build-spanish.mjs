// ============================================================================
// build-spanish.mjs  スペイン語→英語グロス ワードバンク生成
//
// 英語圏ユーザーがスペイン語を英語の訳で学べるようにする。
// 方式は中国語/日本語の英語グロスと同じ「権威辞書を錨に中心義を確定」。
//
// 入力:
//   .cache/es_50k.txt   … FrequencyWords (word count, 頻度順)          [CC-BY 4.0]
//   .cache/es_dict.jsonl… Wiktextract / kaikki.org Spanish (1行1エントリ) [CC-BY-SA]
// 中間:
//   .cache/es_index.json … { 見出し(小文字): { pos: [gloss...] } }（候補語のみ）
// 出力:
//   tools/gloss.en.spanish.json         … { "スペイン語": "english gloss" }
//   public/wordbank/spanish/level-{1..5}.json + manifest.json
//
// 正確性100%: 辞書に無い語・中心義が曖昧な語は非出荷。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const freqPath = path.join(root, '.cache', 'es_50k.txt')
const dictPath = path.join(root, '.cache', 'es_dict.jsonl')
const indexPath = path.join(root, '.cache', 'es_index.json')
const glossOutPath = path.join(root, 'tools', 'gloss.en.spanish.json')
const outDir = path.join(root, 'public', 'wordbank', 'spanish')

const TARGET_TOTAL = 2000 // 生成Question数の上限目安 (約1,500〜2,000)

// ---- 機能語ブロックリスト（高頻度機能語・除外） ----
const FUNCTION_WORDS = new Set([
  'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'haber',
  'por', 'con', 'su', 'para', 'como', 'estar', 'tener', 'le', 'lo', 'todo',
  'pero', 'mas', 'más', 'hacer', 'o', 'poder', 'decir', 'este', 'ir', 'otro',
  'ese', 'si', 'me', 'ya', 'ver', 'porque', 'dar', 'cuando', 'muy', 'sin',
  'vez', 'mucho', 'saber', 'qué', 'que',
  // その他の高頻度機能語・代名詞・冠詞・前置詞・接続詞・助動詞類
  'los', 'las', 'unos', 'unas', 'una', 'del', 'al', 'es', 'son', 'era', 'eran',
  'fue', 'fueron', 'sido', 'siendo', 'soy', 'eres', 'somos', 'está', 'están',
  'estoy', 'estás', 'estaba', 'estaban', 'estuvo', 'he', 'has', 'ha', 'hemos',
  'han', 'había', 'habían', 'hay', 'te', 'nos', 'os', 'les', 'mi', 'mis', 'tu',
  'tus', 'sus', 'nuestro', 'nuestra', 'nuestros', 'nuestras', 'vuestro',
  'yo', 'tú', 'él', 'ella', 'ello', 'ellos', 'ellas', 'nosotros', 'nosotras',
  'vosotros', 'vosotras', 'usted', 'ustedes', 'esto', 'eso', 'aquel', 'aquello',
  'aquella', 'aquellos', 'aquellas', 'esta', 'estos', 'estas', 'esa', 'esos',
  'esas', 'ese', 'quien', 'quienes', 'cual', 'cuales', 'cuál', 'cuáles',
  'cuyo', 'cuya', 'cuánto', 'cuánta', 'cuántos', 'cuántas', 'cuanto',
  'donde', 'dónde', 'cómo', 'quién', 'quiénes', 'cuándo', 'adónde',
  'e', 'u', 'ni', 'ni', 'pues', 'aunque', 'sino', 'entonces', 'así',
  'también', 'tampoco', 'sí', 'aún', 'aun', 'ahí', 'allí', 'allá', 'acá', 'aquí',
  'entre', 'sobre', 'hasta', 'desde', 'hacia', 'según', 'durante', 'mediante',
  'ante', 'bajo', 'tras', 'contra', 'cabe', 'so',
  'algo', 'alguien', 'alguno', 'alguna', 'algunos', 'algunas', 'algún',
  'nada', 'nadie', 'ninguno', 'ninguna', 'ningún', 'cada', 'varios', 'varias',
  'poco', 'poca', 'pocos', 'pocas', 'mucha', 'muchos', 'muchas', 'demasiado',
  'tan', 'tanto', 'tanta', 'tantos', 'tantas', 'todos', 'toda', 'todas',
  'ambos', 'ambas', 'otra', 'otros', 'otras', 'mismo', 'misma', 'mismos', 'mismas',
  'ke', 'pa', 'q', 'x', // チャット略語
  'estan', 'estas', 'esta', 'mí', 'ti', 'sé', 'sea', 'sean', 'fuera',
  'va', 'van', 'vas', 'voy', 'vamos', 'iba', 'iban', 'fui', 'dijo', 'dice',
  'hace', 'hizo', 'puede', 'pueden', 'puedo', 'quiere', 'quiero', 'quieres',
  'tiene', 'tienen', 'tengo', 'tienes', 'tenía', 'tenían', 'hará', 'harán',
])

// スペイン語文字のみ（アクセント・ñ・ü 含む）、3文字以上
const SPANISH_RE = /^[a-záéíóúñü]+$/

// pos の優先順位（中心義を取る品詞の順）と、tags→英語グロス整形時の扱い
const POS_LABEL = {
  noun: 'noun',
  verb: 'verb',
  adj: 'adjective',
  adv: 'adverb',
  num: 'numeral',
}
// 除外する語義タグ（時代・方言・俗語・非中心）
const BAD_TAGS = new Set([
  'obsolete', 'archaic', 'dated', 'rare', 'dialectal', 'regional', 'nonstandard',
  'proscribed', 'colloquial', 'slang', 'vulgar', 'offensive', 'derogatory',
  'informal', 'humorous', 'poetic', 'literary', 'historical', 'euphemistic',
])
// 除外する品詞（固有名詞・記号など）
const BAD_POS = new Set([
  'name', 'proper noun', 'proper-noun', 'punct', 'symbol', 'character',
  'prefix', 'suffix', 'infix', 'affix', 'abbrev', 'contraction', 'phrase',
  'interj', 'intj', 'article', 'prep', 'conj', 'particle', 'pron', 'det',
])

// gloss を中心義1つの素の英語に整形する
function refineGloss(rawGloss, pos) {
  if (typeof rawGloss !== 'string') return null
  let g = rawGloss.trim()
  if (!g) return null
  // 括弧の注記を除去 (…) や [...]
  g = g.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  // スラッシュ併記（favor/favour, color/colour）は最初の綴りのみ
  g = g.replace(/\s*\/\s*[^\s,;]+/g, '')
  // "used to ...", "alternative form of", "synonym of" 等の非中心義は捨てる
  if (/^(alternative|synonym|obsolete|misspelling|clipping|abbreviation|initialism|acronym|inflection|feminine of|masculine of|plural of|used\b|form of|see\b|only used|nonstandard)/i.test(g)) {
    return null
  }
  // 先頭の "to " より前に語がない不正形などは後で判定
  // 複数義（; や ,）の最初の1義のみ
  g = g.split(/[;]/)[0]
  // カンマ区切りの最初の1義（ただし "to X, to Y" のような同義列挙は最初のみで十分）
  g = g.split(/,/)[0]
  g = g.replace(/\s+/g, ' ').trim()
  // 末尾の句読点除去
  g = g.replace(/[.;:,]+$/, '').trim()
  if (!g) return null
  // 品詞ごとの素形チェック
  if (pos === 'verb') {
    // 動詞は "to ..." 形を期待。無ければ付与できるなら付ける、それ以外は却下
    if (!/^to\s+\S/i.test(g)) {
      // 単一動詞語 (例: "run") のみ許容して to を付ける
      if (/^[a-z][a-z-]+$/i.test(g)) g = 'to ' + g
      else return null
    }
    g = g.toLowerCase()
  } else {
    // 名詞・形容詞・副詞: 冠詞 a/an/the を除去
    g = g.replace(/^(a|an|the)\s+/i, '')
    g = g.toLowerCase()
  }
  // 記号や数字のみ、または長すぎ（説明文）を却下
  if (!/[a-z]/.test(g)) return null
  if (g.split(/\s+/).length > 4) return null // 長い説明は中心義でないとみなす
  if (g.length < 2) return null
  return g
}

// ---- 1. 頻度リストから候補語（頻度順）を作る ----
function loadCandidates() {
  const lines = fs.readFileSync(freqPath, 'utf8').split('\n')
  const seen = new Set()
  const cands = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    const word = t.split(/\s+/)[0]
    if (!word) continue
    const w = word.toLowerCase()
    if (seen.has(w)) continue
    if (w.length < 3) continue
    if (!SPANISH_RE.test(w)) continue
    if (FUNCTION_WORDS.has(w)) continue
    seen.add(w)
    cands.push(w)
  }
  return cands
}

// ---- 2. 辞書索引（候補語のみ）を作る/読む ----
async function buildIndex(candSet) {
  if (fs.existsSync(indexPath)) {
    try {
      const idx = JSON.parse(fs.readFileSync(indexPath, 'utf8'))
      if (idx && idx.__count && idx.data) return idx.data
    } catch { /* 壊れていたら作り直す */ }
  }
  if (!fs.existsSync(dictPath)) {
    console.error('BLOCKED: 辞書ファイルが見つかりません:', dictPath)
    process.exit(2)
  }
  const data = {} // word -> { pos: [gloss...] }
  const rl = readline.createInterface({
    input: fs.createReadStream(dictPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })
  let n = 0
  for await (const line of rl) {
    if (!line) continue
    n++
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code && e.lang_code !== 'es') continue
    const w = typeof e.word === 'string' ? e.word.toLowerCase() : null
    if (!w || !candSet.has(w)) continue
    const pos = e.pos
    if (!pos || BAD_POS.has(pos)) continue
    const senses = Array.isArray(e.senses) ? e.senses : []
    for (const s of senses) {
      const tags = Array.isArray(s.tags) ? s.tags : []
      if (tags.some((t) => BAD_TAGS.has(t))) continue
      // form-of 等はスキップ（glosses が無く form_of を持つ）
      if (s.form_of || s.alt_of) continue
      const glosses = Array.isArray(s.glosses) ? s.glosses : []
      if (!glosses.length) continue
      const g = glosses[0] // 最も一般的な語義
      if (!data[w]) data[w] = {}
      if (!data[w][pos]) data[w][pos] = []
      data[w][pos].push(g)
    }
  }
  fs.writeFileSync(indexPath, JSON.stringify({ __count: n, data }))
  console.log('  辞書行数:', n, ' / 索引化した候補見出し:', Object.keys(data).length)
  return data
}

// ---- 3. 各候補の中心義を確定 ----
// 動詞見出しは "to ..." が中心義。verb を最優先にすることで
// comer(noun:eating / verb:to eat) のような取り違えを防ぐ。
// 名詞見出しは verb 義を持たないため副作用はない。
const POS_PRIORITY = ['verb', 'noun', 'adj', 'adv', 'num']
function decideGloss(entry) {
  // entry: { pos: [rawGloss...] }。優先品詞から、整形が通る最初の中心義を返す。
  for (const pos of POS_PRIORITY) {
    const raws = entry[pos]
    if (!raws || !raws.length) continue
    for (const raw of raws) {
      const g = refineGloss(raw, pos)
      if (g) return { gloss: g, pos }
    }
  }
  // 上記に無ければ任意の品詞から
  for (const pos of Object.keys(entry)) {
    if (POS_PRIORITY.includes(pos)) continue
    for (const raw of entry[pos]) {
      const g = refineGloss(raw, pos)
      if (g) return { gloss: g, pos }
    }
  }
  return null
}

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

async function main() {
  const cands = loadCandidates()
  console.log('頻度候補数(フィルタ後):', cands.length)
  const candSet = new Set(cands)

  const index = await buildIndex(candSet)

  // 頻度順に中心義を確定（まず全候補を確定。上限は屈折フィルタ後に適用）
  const decidedAll = [] // { word, gloss, pos } 頻度順（全候補）
  for (const w of cands) {
    const entry = index[w]
    if (!entry) continue
    const d = decideGloss(entry)
    if (!d) continue
    decidedAll.push({ word: w, gloss: d.gloss, pos: d.pos })
  }
  const hit = decidedAll.length

  // ---- 屈折形の誤採用を明示除外（正確性100%）----
  // 形容詞の女性形(-a)は、辞書が無関係な名詞義を先頭に持つと誤訳になる
  // （nueva=news[本来new], alta=certificate[本来tall] 等）。これらは中心義が
  // 曖昧なので非出荷。自動 -o/-a 判定は cara(face)/comida(food) 等の独立名詞を
  // 誤って巻き込むため、手作業で確認した「形容詞屈折 × 名詞誤義」語のみを除外する。
  const DROP_INFLECTION = new Set([
    'nueva',   // 本来 nuevo=new の女性形 / 辞書 news
    'alta',    // 本来 alto=tall の女性形 / 辞書 certificate of discharge
    'mala',    // 本来 malo=bad の女性形 / 辞書 suitcase
    'vieja',   // 本来 viejo=old の女性形 / 辞書 hag(俗)
    'blanca',  // 本来 blanco=white の女性形 / 辞書 minim(音符)
    'negra',   // 本来 negro=black の女性形 / 辞書 crotchet(音符)
    'roja',    // 本来 rojo=red の女性形 / 辞書 サッカー代表の俗称
    'clara',   // 本来 claro=clear の女性形 / 辞書 (卵の)white
    'fría',    // 本来 frío=cold の女性形 / 辞書 beer(俗)
    'rara',    // 本来 raro=rare の女性形 / 辞書 鳥名
    'rica',    // 本来 rico=rich の女性形 / 辞書 fenugreek
    'extraña', // 本来 extraño=strange の女性形 / 辞書 china aster
    'ocupada', // 本来 ocupado=occupied の女性形 / 辞書 pregnant(俗)
    'primera', // 本来 primero=first / 辞書 first gear
    'segunda', // 本来 segundo=second / 辞書 second gear
  ])
  const droppedInflection = []
  const decided = []
  for (const d of decidedAll) {
    if (DROP_INFLECTION.has(d.word)) {
      droppedInflection.push(d.word)
      continue
    }
    decided.push(d)
    if (decided.length >= TARGET_TOTAL) break
  }
  const glossJson = {}
  for (const d of decided) glossJson[d.word] = d.gloss
  console.log('辞書ヒット数(中心義確定):', hit)
  console.log('女性形屈折の誤採用として除外:', droppedInflection.length, droppedInflection.length ? '例: ' + droppedInflection.slice(0, 15).join(', ') : '')
  console.log('採用:', decided.length)

  // gloss.en.spanish.json 出力
  fs.writeFileSync(glossOutPath, JSON.stringify(glossJson, null, 2) + '\n')

  // レベル分割（頻度順に上位から Lv1..Lv5 概ね均等）
  const total = decided.length
  const per = Math.ceil(total / 5)
  for (let i = 0; i < total; i++) decided[i].level = Math.min(5, Math.floor(i / per) + 1)

  // 同カテゴリ英語glossダミー（品詞別プール）
  const byPos = new Map()
  for (const d of decided) {
    if (!byPos.has(d.pos)) byPos.set(d.pos, [])
    byPos.get(d.pos).push(d.gloss)
  }
  const allGloss = decided.map((d) => d.gloss)
  function pickDistractors(target) {
    const pool = byPos.get(target.pos) ?? []
    const used = new Set([target.gloss])
    const out = []
    for (const g of shuffle(pool)) {
      if (out.length >= 3) break
      if (used.has(g)) continue
      used.add(g)
      out.push(g)
    }
    if (out.length < 3) {
      for (const g of shuffle(allGloss)) {
        if (out.length >= 3) break
        if (used.has(g)) continue
        used.add(g)
        out.push(g)
      }
    }
    return out.slice(0, 3)
  }

  const POS_TAG = { verb: 'verb', adj: 'adjective', adv: 'adverb', noun: 'noun', num: 'numeral' }

  const questions = decided
    .map((d, i) => {
      const distract = pickDistractors(d)
      return {
        id: `es-${String(i + 1).padStart(5, '0')}`,
        category: 'spanish',
        prompt: `「${d.word}」の意味は？`,
        answer: d.gloss,
        glosses: { en: d.gloss },
        choices: shuffle([d.gloss, ...distract]),
        difficulty: d.level,
        tags: ['word'],
        verified: true,
      }
    })
    .filter((q) => new Set(q.choices).size === 4)

  fs.mkdirSync(outDir, { recursive: true })
  const levels = []
  for (const lv of [1, 2, 3, 4, 5]) {
    const items = questions.filter((q) => q.difficulty === lv)
    fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(items))
    levels.push({ level: lv, file: `level-${lv}.json`, count: items.length })
  }
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(
      {
        category: 'spanish',
        total: questions.length,
        verified: questions.length,
        levels,
        source: 'FrequencyWords (CC-BY 4.0) 頻度順 + Wiktionary/Wiktextract kaikki.org 英訳 (CC-BY-SA)',
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  )

  // コンソール
  console.log('生成Question数:', questions.length)
  for (const lv of levels) console.log(`  Lv${lv.level}: ${lv.count}`)
}

main().catch((e) => {
  console.error('ERROR:', e)
  process.exit(1)
})
