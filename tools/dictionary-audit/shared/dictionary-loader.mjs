// ============================================================================
// dictionary-loader.mjs  外部辞書の照合専用ローダ（キャッシュ・レート配慮・正直な状態）
//   - 元データは読まない/書かない。辞書レスポンスのみ cache/ に保存。
//   - ネットワーク不可・未取得は status:'not_checked'（捏造しない）。
//   - 返り値は正規化: { found, status, source, license, entries:[{pos,glosses[],ipa[]}] }
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const cacheDir = path.join(root, 'cache')
const RATE_MS = 1100 // Wikimedia REST のバースト制限回避(約1req/s)。大規模はローカルKaikki/CEDICT推奨。
let lastCall = 0

function cachePath(source, lang, word) {
  const safe = Buffer.from(word).toString('base64url').slice(0, 120)
  const d = path.join(cacheDir, source, lang)
  fs.mkdirSync(d, { recursive: true })
  return path.join(d, safe + '.json')
}
function readCache(p) { try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return null } }
async function rateLimit() { const now = Date.now(); const wait = RATE_MS - (now - lastCall); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); lastCall = Date.now() }

function stripHtml(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() }

// ---- Wiktionary REST（英語版・全言語の英語定義/品詞） ----
async function lookupWiktionary(lang, wiktLang, word, { noNet } = {}) {
  const cp = cachePath('wiktionary', lang, word)
  let raw = readCache(cp)
  if (!raw) {
    if (noNet) return { found: false, status: 'not_checked', source: 'wiktionary', license: 'CC-BY-SA', entries: [], note: 'キャッシュなし・ネット無効' }
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`
    const headers = { 'User-Agent': 'WordQuest-DictAudit/1.0 (verification only; contact: project maintainer)', 'Accept': 'application/json' }
    let ok = false
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      try {
        await rateLimit()
        const r = await fetch(url, { signal: AbortSignal.timeout(12000), headers })
        if (r.status === 404) { raw = { __notfound: true }; ok = true }
        else if (r.status === 429) { await new Promise((res) => setTimeout(res, 1500 * (attempt + 1))); continue } // バックオフ再試行
        else if (!r.ok) return { found: false, status: 'not_checked', source: 'wiktionary', license: 'CC-BY-SA', entries: [], note: 'HTTP ' + r.status }
        else { raw = await r.json(); ok = true }
      } catch (e) { if (attempt === 2) return { found: false, status: 'not_checked', source: 'wiktionary', license: 'CC-BY-SA', entries: [], note: String(e.name || e.message) }; await new Promise((res) => setTimeout(res, 1000 * (attempt + 1))) }
    }
    if (!ok) return { found: false, status: 'not_checked', source: 'wiktionary', license: 'CC-BY-SA', entries: [], note: 'レート制限(429)継続' }
    fs.writeFileSync(cp, JSON.stringify(raw))
  }
  if (raw.__notfound) return { found: false, status: 'not_found', source: 'wiktionary', license: 'CC-BY-SA', entries: [] }
  const entries = []
  for (const k of Object.keys(raw)) {
    const secs = raw[k]
    if (!Array.isArray(secs)) continue
    if (secs[0] && secs[0].language === wiktLang) {
      for (const s of secs) {
        const glosses = (s.definitions || []).map((d) => stripHtml(d.definition)).filter(Boolean)
        if (glosses.length || s.partOfSpeech) entries.push({ pos: (s.partOfSpeech || '').toLowerCase(), glosses, ipa: [] })
      }
    }
  }
  if (!entries.length) return { found: false, status: 'not_found', source: 'wiktionary', license: 'CC-BY-SA', entries: [] }
  return { found: true, status: entries.length > 1 ? 'multiple_entries' : 'matched', source: 'wiktionary', license: 'CC-BY-SA', entries }
}

// ---- CC-CEDICT（ローカル・中国語） ----
let cedict = null
function loadCedict() {
  if (cedict !== null) return cedict
  const p = path.join(cacheDir, 'cedict_ts.u8')
  if (!fs.existsSync(p)) { cedict = false; return false }
  cedict = new Map()
  for (const line of fs.readFileSync(p, 'utf8').split(/\n/)) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/)
    if (!m) continue
    const rec = { pos: '', glosses: m[4].split('/').filter(Boolean), ipa: [m[3]] }
    cedict.set(m[1], rec); cedict.set(m[2], rec)
  }
  return cedict
}
function lookupCedict(lang, word) {
  const d = loadCedict()
  if (d === false) return { found: false, status: 'not_checked', source: 'cedict', license: 'CC-BY-SA', entries: [], note: 'CC-CEDICT未配置(cache/cedict_ts.u8)' }
  const rec = d.get(word)
  if (!rec) return { found: false, status: 'not_found', source: 'cedict', license: 'CC-BY-SA', entries: [] }
  return { found: true, status: 'matched', source: 'cedict', license: 'CC-BY-SA', entries: [rec] }
}

// ---- 統合ローダ: 設定の sources 順に試し、最初に found したものを主結果に ----
export async function lookup(langKey, cfg, word, opts = {}) {
  const attempts = []
  for (const src of cfg.sources || ['wiktionary']) {
    let res
    if (src === 'wiktionary') res = await lookupWiktionary(langKey, cfg.wiktLang, word, opts)
    else if (src === 'cedict') res = lookupCedict(langKey, word)
    else res = { found: false, status: 'not_checked', source: src, license: '(未実装/未配置)', entries: [], note: src + ' はローカル配置時のみ' }
    attempts.push(res)
    if (res.found) return { ...res, attempts: attempts.map((a) => ({ source: a.source, status: a.status })) }
  }
  // どれも found しなければ、最も情報的な状態を返す（not_found > not_checked）
  const nf = attempts.find((a) => a.status === 'not_found')
  const base = nf || attempts[0] || { status: 'not_checked', source: '-', license: '-', entries: [] }
  return { ...base, found: false, attempts: attempts.map((a) => ({ source: a.source, status: a.status })) }
}

export function markLicensesAccessed(licenses, sources) {
  for (const s of sources) if (licenses.dictionaries[s]) licenses.dictionaries[s].accessedInThisRun = true
}
