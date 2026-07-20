// ============================================================================
// crosscheck-freedict.mjs  独立辞書による機械突合（②英語・中国語と同じ土俵に乗せる）
//
//   出荷中の pt/ru/pl 全語の英語義(answer)を、生成に使った Wiktextract とは
//   別系統の FreeDict(TEI) と突合する。英語・中国語で行った
//   「独立辞書と突合してから verified 昇格」と同じ考え方。
//
//   判定:
//     matched   … FreeDictの訳語に answer と重なる語がある（裏取り成功）
//     conflicting … 見出しはあるが訳が全く重ならない（要確認）
//     not_found … FreeDictに見出しが無い（誤りとは限らない・収録漏れ）
//
//   出力: tools/expand/crosscheck/<lang>.json（レポートのみ・データは変更しない）
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const fdDir = path.join(root, 'tools', 'dictionary-audit', 'data', 'raw', 'freedict')
const outDir = path.join(root, 'tools', 'expand', 'crosscheck')
fs.mkdirSync(outDir, { recursive: true })

const LANGS = [
  { key: 'portuguese', tei: 'por-eng/por-eng.tei' },
  { key: 'russian', tei: 'rus-eng/rus-eng.tei' },
  { key: 'polish', tei: 'pol-eng/pol-eng.tei' },
  { key: 'spanish', tei: 'spa-eng/spa-eng.tei' },
  { key: 'french', tei: 'fra-eng/fra-eng.tei' },
  { key: 'german', tei: 'deu-eng/deu-eng.tei' },
]

const STOP = new Set(['a', 'an', 'the', 'to', 'of', 'be', 'in', 'on', 'for', 'with', 'and', 'or', 'sth', 'sb', 'one', 'something', 'someone'])

function tokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
}

/** 語幹化(複数形・-ing/-ed の揺れを吸収) */
function stem(w) {
  return w.replace(/(ies)$/, 'y').replace(/(es|s|ing|ed)$/, '')
}
function tokenSet(s) {
  const out = new Set()
  for (const t of tokens(s)) { out.add(t); const st = stem(t); if (st.length > 2) out.add(st) }
  return out
}

/**
 * TEI を読み、見出し語 -> 英訳の集合 を作る。
 * 独語(Ding由来)は 429MB あり readFileSync では文字列長上限に達するため、
 * また <entry xml:id="..."> と属性が付く形式なので、行ストリームで解析する。
 */
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

function loadTei(file) {
  const map = new Map()
  let inEntry = false
  let orths = []
  let quotes = []
  const flush = () => {
    if (orths.length && quotes.length) {
      for (const o of orths) {
        const key = o.toLowerCase()
        if (!map.has(key)) map.set(key, new Set())
        const set = map.get(key)
        if (set.size < 12) for (const q of quotes) set.add(q)
      }
    }
    orths = []
    quotes = []
  }
  for (const line of readLines(path.join(fdDir, file))) {
    if (/<entry\b/.test(line)) { flush(); inEntry = true }
    if (!inEntry) continue
    for (const m of line.matchAll(/<orth[^>]*>([^<]+)<\/orth>/g)) orths.push(m[1].trim())
    for (const m of line.matchAll(/<quote[^>]*>([^<]+)<\/quote>/g)) quotes.push(m[1].trim())
    if (/<\/entry>/.test(line)) { flush(); inEntry = false }
  }
  flush()
  return map
}

const summary = []
for (const L of LANGS) {
  const teiPath = path.join(fdDir, L.tei)
  if (!fs.existsSync(teiPath)) { console.log(`skip ${L.key}: TEIなし`); continue }
  const dict = loadTei(L.tei)

  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  let all = []
  for (const lv of man.levels) all = all.concat(JSON.parse(fs.readFileSync(path.join(wbDir, lv.file), 'utf8')))

  const results = []
  const counts = { matched: 0, conflicting: 0, not_found: 0 }
  for (const e of all) {
    const word = String(e.prompt || '').replace(/[「」]|の意味は？/g, '')
    const trans = dict.get(word.toLowerCase())
    if (!trans || !trans.size) { counts.not_found++; results.push({ id: e.id, word, en: e.answer, ja: e.glosses?.ja, status: 'not_found' }); continue }
    const mine = tokenSet(e.answer)
    let hit = false
    for (const t of trans) {
      const theirs = tokenSet(t)
      for (const w of mine) if (theirs.has(w)) { hit = true; break }
      if (hit) break
    }
    if (hit) { counts.matched++; results.push({ id: e.id, word, en: e.answer, ja: e.glosses?.ja, status: 'matched' }) }
    else {
      counts.conflicting++
      results.push({ id: e.id, word, en: e.answer, ja: e.glosses?.ja, status: 'conflicting', freedict: [...trans].slice(0, 5) })
    }
  }

  fs.writeFileSync(path.join(outDir, `${L.key}.json`), JSON.stringify({ source: 'FreeDict (TEI)', total: all.length, counts, results }, null, 1))
  const checked = counts.matched + counts.conflicting
  summary.push({
    lang: L.key,
    総語数: all.length,
    辞書収録: checked,
    裏取り成功: counts.matched,
    要確認: counts.conflicting,
    辞書未収録: counts.not_found,
    照合できた中の一致率: checked ? Math.round((counts.matched / checked) * 100) + '%' : '-',
  })
}
console.log('=== FreeDict 独立突合 ===')
for (const s of summary) console.log(JSON.stringify(s, null, 1))
