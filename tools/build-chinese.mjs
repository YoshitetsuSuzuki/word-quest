// ============================================================================
// build-chinese.mjs  中国語ワードバンク生成
//
// 入力(.cache):
//   hsk30.csv                      … HSK 3.0 語彙(簡体字・ピンイン・品詞・級) ivankra/hsk30
// 入力(tools):
//   meanings.chinese.json          … 人手検証済みの日本語訳(hanziキー)
// 出力:
//   public/wordbank/chinese/level-{1..5}.json, manifest.json
//
// 中日辞書のオープンデータが無いため、日本語訳は人手検証済み(meanings)のみを出荷する。
// ピンインはHSKデータからそのまま採用(声調記号つき)。助詞類(Aux/Suffix/Prefix)は除外。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'public', 'wordbank', 'chinese')

function parseCSV(text) {
  const rows = []
  let row = [],
    cur = '',
    q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (q && text[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
    } else if (c === ',' && !q) {
      row.push(cur)
      cur = ''
    } else if ((c === '\n' || c === '\r') && !q) {
      if (cur !== '' || row.length) {
        row.push(cur)
        rows.push(row)
        row = []
        cur = ''
      }
    } else cur += c
  }
  if (cur !== '' || row.length) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

const meanings = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'meanings.chinese.json'), 'utf8'))

// リスニング穴埋め用の書き下ろし例文(人手検証済み)。{ hanzi: { ex: "文 — 訳", blank: "空欄語" } }
// blank が文中(——の左)にちょうど1回現れる語のみ採用(採点=完全一致の保証)。
let customExamples = {}
try {
  customExamples = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'examples.custom.chinese.json'), 'utf8'))
} catch {
  // 例文が無ければ例文なしで生成
}

// 英語グロス(確定版)。{ 簡体字: "english" }。次タスクで生成されるファイル。
// 存在すれば各 question に glosses = { en: gloss } を付与する。無ければ何もしない(現状不変)。
let enGloss = {}
try {
  enGloss = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'gloss.en.chinese.json'), 'utf8'))
} catch {
  // 確定版グロスが無ければ en 付与なしで生成
}
function exampleFor(hanzi) {
  const e = customExamples[hanzi]
  if (!e || typeof e.ex !== 'string' || typeof e.blank !== 'string') return null
  const sentence = e.ex.split(' — ')[0]
  const idx = sentence.indexOf(e.blank)
  if (idx < 0 || sentence.indexOf(e.blank, idx + 1) >= 0) return null // 0回 or 2回以上は不採用
  return { example: e.ex, exampleForm: e.blank }
}
const rows = parseCSV(fs.readFileSync(path.join(cacheDir, 'hsk30.csv'), 'utf8'))
const H = rows[0]
const S = H.indexOf('Simplified'),
  P = H.indexOf('Pinyin'),
  PO = H.indexOf('POS'),
  L = H.indexOf('Level')

const EXCLUDE_POS = new Set(['Aux', 'Suffix', 'Prefix', 'Part'])
function bucketOf(pos) {
  if (pos === 'V') return 'verb'
  if (pos === 'Adj') return 'adj'
  if (pos === 'Adv') return 'adv'
  return 'noun'
}
const bucketLabel = { verb: '動詞', adj: '形容詞', adv: '副詞', noun: '名詞' }

// HSK級(1-9)を難易度1-5にマップ
function levelOf(hsk) {
  const n = hsk === '7-9' ? 7 : parseInt(hsk, 10)
  return Math.min(5, n)
}

const accepted = [] // {hanzi, pinyin, ja, bucket, level}
const seen = new Set()
for (let i = 1; i < rows.length; i++) {
  const r = rows[i]
  const pos = (r[PO] || '').split('/')[0] // V/N → V
  if (EXCLUDE_POS.has(pos)) continue
  const hanzi = (r[S] || '').split('|')[0].trim()
  if (!hanzi || seen.has(hanzi)) continue
  const ja = meanings[hanzi]
  if (!ja || typeof ja !== 'string') continue
  seen.add(hanzi)
  const pinyin = (r[P] || '').split('|')[0].trim()
  accepted.push({ hanzi, pinyin, ja, bucket: bucketOf(pos), level: levelOf(r[L]) })
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
function pickDistractors(target) {
  const pool = byBucket.get(target.bucket) ?? []
  const used = new Set([target.ja])
  const out = []
  for (const c of shuffle(pool)) {
    if (out.length >= 3) break
    if (used.has(c.ja)) continue
    used.add(c.ja)
    out.push(c.ja)
  }
  // 不足時は全体から補完
  if (out.length < 3) {
    for (const c of shuffle(accepted)) {
      if (out.length >= 3) break
      if (used.has(c.ja)) continue
      used.add(c.ja)
      out.push(c.ja)
    }
  }
  return out.slice(0, 3)
}

const questions = accepted
  .map((a, i) => {
    const ex = exampleFor(a.hanzi)
    const gloss = typeof enGloss[a.hanzi] === 'string' && enGloss[a.hanzi] ? enGloss[a.hanzi] : null
    return {
      id: `zh-${String(i + 1).padStart(5, '0')}`,
      category: 'chinese',
      prompt: `「${a.hanzi}」の意味は？`,
      answer: a.ja,
      choices: shuffle([a.ja, ...pickDistractors(a)]),
      difficulty: a.level,
      tags: [bucketLabel[a.bucket]],
      explanation: `${a.hanzi}（${a.pinyin}）= ${a.ja}`,
      pronunciation: a.pinyin,
      ...(ex ? { example: ex.example, exampleForm: ex.exampleForm } : {}),
      ...(gloss ? { glosses: { en: gloss } } : {}),
      verified: true, // 人手検証済みのみ
    }
  })
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
      category: 'chinese',
      total: questions.length,
      verified: questions.length,
      levels: manifestLevels,
      source: 'HSK 3.0 (ivankra/hsk30) + 人手検証済み日本語訳',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('中国語 検証済み:', questions.length)
for (const l of manifestLevels) if (l.count) console.log(`  level ${l.level}: ${l.count}`)
