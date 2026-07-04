// ============================================================================
// build-wordbank.mjs  英単語ワードバンク生成パイプライン v3（英和辞書ベース）
//
// 方針: 「英単語→日本語訳」は英和辞書 EJDict(パブリックドメイン) を素直に1対1で引く。
//   EJDict は英単語が見出しで、先頭の意味が主要な訳語。『』が核となる訳語を示す。
//   (JMdictの逆引きは主要語義の推測が必要で違和感が出たため廃止)
//
// 入力(.cache):
//   ejdict-all.txt        … EJDict 英和辞書(パブリックドメイン)  word<TAB>意味 / 意味 / ...
//   ngsl.csv              … NGSL 学習者向け頻度語(CC BY-SA) ※出題語の選定・級分け
//   freq10k.txt           … google-10000-english(MIT)         ※NGSL超の語彙拡張
// 出力: public/wordbank/english/level-{1..5}.json, manifest.json
//   + tools/overrides.english.json … 頻出コア語の人手検証済み上書き(任意)
//
// 固有名詞: EJDictは固有名詞を大文字見出しで持つため、小文字語のみ照合すれば自動除外される。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'public', 'wordbank', 'english')

const STOPWORDS = new Set(
  (
    'the be of and to a in have it you for not that on with do as he we this at they but from by will or his say ' +
    'she so all about there her one what if would who which when make can like time no just him know take people into ' +
    'year your good some could them see other than then now look only come its over think also back after use two how ' +
    'our work first well way even new want because any these give day most us is are was were been being am pm etc via ' +
    'per among upon within without into onto off yes may might should must shall cannot ought thou i me my mine himself ' +
    'himself herself itself does did done has had having each every both few more much many such own same'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// ---- EJDict 読み込み: word -> 定義文字列 (小文字見出しのみ=固有名詞除外) ----
const ejdict = new Map()
for (const line of fs.readFileSync(path.join(cacheDir, 'ejdict-all.txt'), 'utf8').split('\n')) {
  const tab = line.indexOf('\t')
  if (tab < 0) continue
  const word = line.slice(0, tab).trim()
  if (!/^[a-z][a-z'-]*$/.test(word)) continue // 小文字のみ(固有名詞は大文字見出しなので除外される)
  if (!ejdict.has(word)) ejdict.set(word, line.slice(tab + 1))
}

// ---- 定義から「主要な1つの訳語」を抽出 ----
function extractMeaning(raw) {
  let first = raw.split(' / ')[0] // 先頭の語義=主要な訳語
  first = first
    .replace(/〈[^〉]*〉/g, '') // 〈C〉〈人が〉等の注記
    .replace(/《[^》]*》/g, '') // 《the ~》《米》等
    .replace(/\([^)]*\)/g, '') // (…の)(集団の)等
    .replace(/（[^）]*）/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[＋+][^,、;；/]*/g, '') // +『for』 等
  const m = first.match(/『([^』]*)』/) // 核となる訳語
  let core = m ? m[1] : first
  core = core.split(/[,、;；]/)[0] // 最初の区切りまで
  // 記号(『』…引用符・中黒等)のみ除去。※語頭の仮名を削る処理はバグの元(もう→う)のため廃止
  core = core.replace(/[『』「」…"'.\s·・\-()（）]/g, '').replace(/^…+/, '').trim()
  return core
}

// ---- 出題語ソース: NGSL(コア) + google10k(拡張) を頻度順に結合 ----
function parseNgsl() {
  const raw = fs.readFileSync(path.join(cacheDir, 'ngsl.csv'), 'utf8')
  const fields = []
  let cur = '',
    q = false
  for (const ch of raw) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      fields.push(cur)
      cur = ''
    } else if ((ch === '\n' || ch === '\r') && !q) {
      if (cur) {
        fields.push(cur)
        cur = ''
      }
    } else cur += ch
  }
  if (cur) fields.push(cur)
  const heads = []
  const seen = new Set()
  for (const f of fields) {
    const w = f.trim().toLowerCase()
    if (/^[a-z]+$/.test(w) && !seen.has(w)) {
      seen.add(w)
      heads.push(w)
    }
  }
  return heads
}

const ngsl = parseNgsl()
const google = fs
  .readFileSync(path.join(cacheDir, 'freq10k.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim().toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w) && w.length >= 3)

const sourceWords = []
const seenWord = new Set()
for (const w of [...ngsl, ...google]) {
  if (seenWord.has(w)) continue
  seenWord.add(w)
  sourceWords.push({ word: w, rank: sourceWords.length + 1 })
}

// ---- 品詞バケット(ダミー生成用): 日本語の語形から推定 ----
function inferBucket(m) {
  if (/(な)$/.test(m) || (/い$/.test(m) && !/[ぁ-ん]る$/.test(m))) return 'adj'
  if (/(る|う|く|ぐ|す|つ|ぬ|ぶ|む)$/.test(m)) return 'verb'
  return 'noun'
}
const bucketLabel = { verb: '動詞', adj: '形容詞', adv: '副詞', noun: '名詞' }

// 複数形として除外しない(=単数扱いしない)語。sは語尾だが複数形ではない/独立した意味を持つ。
const PLURAL_KEEP = new Set([
  'news', 'means', 'series', 'species', 'goods', 'clothes', 'thanks', 'glasses',
  'headquarters', 'arms', 'customs', 'contents', 'remains', 'odds', 'stairs',
  'savings', 'earnings', 'belongings', 'surroundings', 'physics', 'mathematics',
  'economics', 'politics', 'statistics', 'ethics', 'sales', 'works',
])

// ---- 各語の訳を確定 ----
const accepted = []
for (const sw of sourceWords) {
  const { word } = sw
  if (word.length < 3 || STOPWORDS.has(word)) continue
  // 複数形は除外し単数形を採用する(numbers→民数記 等の誤マッピングを防ぐ)
  if (word.endsWith('s') && !PLURAL_KEEP.has(word)) {
    const singular = word.slice(0, -1)
    const singularES = word.endsWith('es') ? word.slice(0, -2) : null
    if (ejdict.has(singular) || (singularES && ejdict.has(singularES))) continue
  }
  const def = ejdict.get(word)
  if (!def) continue
  const meaning = extractMeaning(def)
  // 品質ゲート: 空 / 長すぎ(句) / 英数字混入 / 単一かな(抽出崩れの疑い) は除外
  if (!meaning || meaning.length > 10 || /[a-zA-Z0-9]/.test(meaning)) continue
  if (/^[ぁ-んァ-ヶ]$/.test(meaning)) continue
  accepted.push({ word, meaning, bucket: inferBucket(meaning), rank: sw.rank })
}

// ---- 人手検証済み上書き ----
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'overrides.english.json'), 'utf8'))
const rankByWord = new Map(sourceWords.map((s) => [s.word, s.rank]))
const acceptedByWord = new Map(accepted.map((a) => [a.word, a]))
let overrideApplied = 0
for (const [word, meaning] of Object.entries(overrides)) {
  if (word.startsWith('_') || typeof meaning !== 'string') continue
  const ex = acceptedByWord.get(word)
  if (ex) {
    ex.meaning = meaning
    ex.bucket = inferBucket(meaning)
  } else {
    const a = { word, meaning, bucket: inferBucket(meaning), rank: rankByWord.get(word) ?? 400 }
    accepted.push(a)
    acceptedByWord.set(word, a)
  }
  overrideApplied++
}

// ---- 難易度(級): 頻度順 ----
function levelOf(rank) {
  if (rank <= 700) return 1
  if (rank <= 1600) return 2
  if (rank <= 2818) return 3
  if (rank <= 6000) return 4
  return 5
}

// ---- ダミー生成 ----
function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const byBucket = new Map()
for (const a of accepted) {
  if (!byBucket.has(a.bucket)) byBucket.set(a.bucket, [])
  byBucket.get(a.bucket).push(a)
}
for (const [, list] of byBucket) list.sort((x, y) => x.rank - y.rank)

function pickDistractors(target) {
  const pool = byBucket.get(target.bucket) ?? []
  const idx = pool.indexOf(target)
  const used = new Set([target.meaning])
  const result = []
  for (let window = 60; result.length < 3 && window <= pool.length + 60; window += 120) {
    const lo = Math.max(0, idx - window)
    const hi = Math.min(pool.length - 1, idx + window)
    for (const c of shuffle(pool.slice(lo, hi + 1))) {
      if (result.length >= 3) break
      if (used.has(c.meaning)) continue
      used.add(c.meaning)
      result.push(c.meaning)
    }
  }
  if (result.length < 3) {
    for (const c of shuffle(accepted)) {
      if (result.length >= 3) break
      if (used.has(c.meaning)) continue
      used.add(c.meaning)
      result.push(c.meaning)
    }
  }
  return result.slice(0, 3)
}

// ---- Question 生成・出力 ----
const questions = accepted
  .map((a) => ({
    id: `en-${String(a.rank).padStart(5, '0')}`,
    category: 'english',
    prompt: `「${a.word}」の意味は？`,
    answer: a.meaning,
    choices: shuffle([a.meaning, ...pickDistractors(a)]),
    difficulty: levelOf(a.rank),
    tags: [bucketLabel[a.bucket]],
    explanation: `${a.word} = ${a.meaning}`,
  }))
  .filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
const manifestLevels = []
for (const lv of [1, 2, 3, 4, 5]) {
  const items = questions.filter((q) => q.difficulty === lv)
  fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(items))
  manifestLevels.push({ level: lv, file: `level-${lv}.json`, count: items.length })
}
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      category: 'english',
      total: questions.length,
      levels: manifestLevels,
      source: 'EJDict (Public Domain) + NGSL + google-10000-english',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('source words:', sourceWords.length, '/ EJDict entries:', ejdict.size)
console.log('overrides applied:', overrideApplied)
console.log('valid questions:', questions.length)
for (const l of manifestLevels) console.log(`  level ${l.level}: ${l.count}`)
