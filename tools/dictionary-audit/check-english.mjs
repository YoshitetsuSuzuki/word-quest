// ============================================================================
// check-english.mjs  英語カテゴリC/B語の外部辞書照合(試作・元データ非改変)
//   出典: dictionaryapi.dev（English Wiktionary 由来 / CC-BY-SA）。照合のみに使用。
//   各語について、登録語義に対応する英語キーワードが辞書定義に存在するか確認。
//   status: matched / partially_matched / not_found / conflicting / not_checked
//   ネットワーク不可時は全件 not_checked を記録（捏造しない）。
// 出力: audit/dictionary-check/english-results.json
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const targets = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'dictionary-audit', 'english-targets.json'), 'utf8'))
const outDir = path.join(root, 'audit', 'dictionary-check')
fs.mkdirSync(outDir, { recursive: true })
const API = (w) => `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`

async function fetchWord(w) {
  try {
    const r = await fetch(API(w), { signal: AbortSignal.timeout(12000) })
    if (r.status === 404) return { ok: true, notFound: true }
    if (!r.ok) return { ok: false, err: 'HTTP ' + r.status }
    return { ok: true, data: await r.json() }
  } catch (e) { return { ok: false, err: String(e.name || e.message) } }
}

const results = []
for (const t of targets) {
  const res = await fetchWord(t.word)
  if (!res.ok) { results.push({ ...t, source: 'dictionaryapi.dev (Wiktionary CC-BY-SA)', status: 'not_checked', note: '取得失敗: ' + res.err }); continue }
  if (res.notFound) { results.push({ ...t, source: 'dictionaryapi.dev (Wiktionary CC-BY-SA)', status: 'not_found', note: '辞書に見出しなし(語が誤りとは限らない)' }); continue }
  const defs = []
  const poses = new Set()
  for (const e of res.data) for (const m of (e.meanings || [])) { poses.add(m.partOfSpeech); for (const d of (m.definitions || [])) defs.push(d.definition) }
  const blob = defs.join(' \n ').toLowerCase()
  const hit = t.expect.filter((k) => blob.includes(k.toLowerCase()))
  let status
  if (hit.length) status = 'matched'
  else if (defs.length) status = 'partially_matched' // 見出しは有るが登録語義のキーワード未確認
  else status = 'not_found'
  results.push({ id: t.id, word: t.word, registeredSense: t.sense, source: 'dictionaryapi.dev (Wiktionary CC-BY-SA)', status, matchedKeywords: hit, dictPos: [...poses], dictDefsSample: defs.slice(0, 3), note: '照合のみ・元データ非改変。辞書に無い=誤りの証拠ではない。' })
  await new Promise((r) => setTimeout(r, 250)) // レート配慮
}
fs.writeFileSync(path.join(outDir, 'english-results.json'), JSON.stringify(results, null, 2))
const st = {}; for (const r of results) st[r.status] = (st[r.status] || 0) + 1
console.log('英語辞書照合:', results.length, '語 →', JSON.stringify(st))
