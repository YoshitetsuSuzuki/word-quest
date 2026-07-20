// ============================================================================
// merge-verified2.mjs  多品詞語からの回収分をワードバンクへ統合
//
//   入力: tools/expand/candidates2.<lang>.json + tools/expand/verified2/<lang>.json
//   既存データ(語・和訳)との衝突を排除し、発音・例文も併せて付与できるよう
//   pronunciation/example は後段のスクリプト(add-pronunciation / build-examples)に任せる。
//   --dry で書き込まず検査のみ。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const expandDir = path.join(root, 'tools', 'expand')
const DRY = process.argv.includes('--dry')

const LANGS = [
  { key: 'portuguese', prefix: 'pt' },
  { key: 'russian', prefix: 'ru' },
  { key: 'polish', prefix: 'pl' },
]
const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

const report = []
for (const L of LANGS) {
  const candPath = path.join(expandDir, `candidates2.${L.key}.json`)
  const vPath = path.join(expandDir, 'verified2', `${L.key}.json`)
  if (!fs.existsSync(candPath) || !fs.existsSync(vPath)) { console.log(`skip ${L.key}`); continue }
  const cands = JSON.parse(fs.readFileSync(candPath, 'utf8'))
  const verdicts = new Map()
  for (const v of JSON.parse(fs.readFileSync(vPath, 'utf8'))) if (v?.word && !verdicts.has(v.word)) verdicts.set(v.word, v)

  const missing = cands.filter((c) => !verdicts.has(c.word)).length

  const accepted = []
  for (const c of cands) {
    const v = verdicts.get(c.word)
    if (!v || v.verdict === 'drop') continue
    let ja = c.ja
    if (v.verdict === 'fix') {
      if (!v.ja || !HAS_JP.test(v.ja)) continue
      ja = String(v.ja).trim()
    }
    if (!ja || !HAS_JP.test(ja) || ja.length > 14) continue
    accepted.push({ ...c, ja })
  }

  // 既存を読む
  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  const byLevel = new Map()
  const words = new Set()
  const jas = new Set()
  const ens = new Set()
  let maxId = 0
  for (const lv of man.levels) {
    const arr = JSON.parse(fs.readFileSync(path.join(wbDir, lv.file), 'utf8'))
    byLevel.set(lv.level, arr)
    for (const e of arr) {
      words.add(String(e.prompt || '').replace(/[「」]|の意味は？/g, ''))
      if (e.glosses?.ja) jas.add(e.glosses.ja)
      if (e.answer) ens.add(e.answer)
      const n = Number(String(e.id).split('-')[1])
      if (Number.isFinite(n)) maxId = Math.max(maxId, n)
    }
  }

  const final = []
  let collide = 0
  for (const a of accepted) {
    if (words.has(a.word) || jas.has(a.ja)) { collide++; continue }
    words.add(a.word)
    jas.add(a.ja)
    final.push(a)
  }

  // 頻度順位で3段階に均等配分
  const ranks = final.map((f) => f.rank).sort((x, y) => x - y)
  const t1 = ranks[Math.floor(ranks.length / 3)] ?? Infinity
  const t2 = ranks[Math.floor((ranks.length * 2) / 3)] ?? Infinity
  const levelOf = (r) => (r <= t1 ? 1 : r <= t2 ? 2 : 3)

  const enPool = [...new Set([...ens, ...final.map((f) => f.en)])]
  const added = { 1: 0, 2: 0, 3: 0 }
  let id = maxId
  for (const a of final) {
    id++
    const distractors = []
    const pool = enPool.filter((x) => x !== a.en)
    while (distractors.length < 3 && pool.length) {
      const i = Math.floor(((id * 2654435761 + distractors.length * 40503) >>> 0) % pool.length)
      const p = pool.splice(i, 1)[0]
      if (p && !distractors.includes(p)) distractors.push(p)
    }
    if (distractors.length < 3) continue
    const choices = [a.en, ...distractors]
    for (let i = choices.length - 1; i > 0; i--) {
      const j = ((id * 31 + i * 17) >>> 0) % (i + 1)
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    const lvl = levelOf(a.rank)
    const arr = byLevel.get(lvl) || []
    arr.push({
      id: `${L.prefix}-${String(id).padStart(5, '0')}`,
      category: L.key,
      prompt: `「${a.word}」の意味は？`,
      answer: a.en,
      glosses: { en: a.en, ja: a.ja },
      choices,
      difficulty: lvl,
      tags: ['word'],
      verified: true,
    })
    byLevel.set(lvl, arr)
    added[lvl]++
  }

  const total = [...byLevel.values()].reduce((s, a) => s + a.length, 0)
  report.push({ lang: L.key, 候補: cands.length, 判定漏れ: missing, 採用: final.length, 衝突除外: collide, 追加: added, 合計: total })

  if (!DRY) {
    const levels = []
    for (const [lvl, arr] of [...byLevel.entries()].sort((a, b) => a[0] - b[0])) {
      const file = `level-${lvl}.json`
      fs.writeFileSync(path.join(wbDir, file), JSON.stringify(arr))
      levels.push({ level: lvl, file, count: arr.length })
    }
    fs.writeFileSync(path.join(wbDir, 'manifest.json'), JSON.stringify({ ...man, levels }, null, 2))
  }
}
console.log(DRY ? '=== DRY RUN ===' : '=== 反映しました ===')
for (const r of report) console.log(JSON.stringify(r))
