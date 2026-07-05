// ============================================================================
// build-korean.mjs  韓国語ワードバンク生成
// 入力: tools/korean.words.json  … [ハングル, ローマ字読み, 日本語訳] の人手検証済み初級語彙
// 出力: public/wordbank/korean/level-1.json, manifest.json
// 中韓辞書のオープンデータが無いため、訳・発音とも人手検証済みのみを出荷する。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'korean')

const data = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'korean.words.json'), 'utf8'))
const words = data.words // [ [w, r, m], ... ]

function inferBucket(m) {
  if (/(な)$/.test(m) || (/い$/.test(m) && !/[ぁ-ん]る$/.test(m))) return 'adj'
  if (/(る|う|く|ぐ|す|つ|ぬ|ぶ|む)$/.test(m)) return 'verb'
  if (/(に|と|り|く|も|で)$/.test(m) && m.length <= 5) return 'adv'
  return 'noun'
}
const bucketLabel = { verb: '動詞', adj: '形容詞', adv: '副詞', noun: '名詞' }

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

const accepted = words
  .filter((row) => Array.isArray(row) && row.length === 3)
  .map(([w, r, m]) => ({ w, r, m, bucket: inferBucket(m) }))

const byBucket = new Map()
for (const a of accepted) {
  if (!byBucket.has(a.bucket)) byBucket.set(a.bucket, [])
  byBucket.get(a.bucket).push(a)
}
function pickDistractors(target) {
  const pool = byBucket.get(target.bucket) ?? []
  const used = new Set([target.m])
  const out = []
  for (const c of shuffle(pool)) {
    if (out.length >= 3) break
    if (used.has(c.m)) continue
    used.add(c.m)
    out.push(c.m)
  }
  if (out.length < 3) {
    for (const c of shuffle(accepted)) {
      if (out.length >= 3) break
      if (used.has(c.m)) continue
      used.add(c.m)
      out.push(c.m)
    }
  }
  return out.slice(0, 3)
}

const questions = accepted
  .map((a, i) => ({
    id: `ko-${String(i + 1).padStart(5, '0')}`,
    category: 'korean',
    prompt: `「${a.w}」の意味は？`,
    answer: a.m,
    choices: shuffle([a.m, ...pickDistractors(a)]),
    difficulty: 1,
    tags: [bucketLabel[a.bucket]],
    explanation: `${a.w}（${a.r}）= ${a.m}`,
    pronunciation: a.r,
    verified: true,
  }))
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
      category: 'korean',
      total: questions.length,
      verified: questions.length,
      levels,
      source: '人手検証済み初級語彙（ハングル・ローマ字読み・日本語訳）',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('韓国語 検証済み:', questions.length)
