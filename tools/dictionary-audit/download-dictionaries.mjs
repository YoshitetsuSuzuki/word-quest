// ============================================================================
// download-dictionaries.mjs  辞書の安全な取得（設定駆動・再開安全・非破壊）
//   URLは config/sources.json に集約。data/raw/ に保存(Git管理外)。
//   通常DL: 一時ファイル→リネーム、既存再利用、リトライ/タイムアウト、サイズ確認、manifest記録。
//   targeted:true (Kaikki): 大容量ダンプをストリームし、アプリ見出し語一致行のみ抽出して保存。
//     → 全ダンプを保存しない(容量節約)。1語ずつAPIは呼ばない。
//   使用: [--language L | --languages a,b | --seven-languages | --source S | --all] [--dry-run] [--force] [--no-download]
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import readline from 'node:readline'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'sources.json'), 'utf8'))
const manifestPath = path.join(here, 'data', 'raw', '_download-manifest.json')
const SEVEN = ['korean', 'portuguese', 'polish', 'russian', 'french', 'spanish', 'german']

function parseArgs(a) {
  const o = { language: null, languages: null, seven: false, source: null, all: false, dryRun: false, force: false, noDownload: false }
  for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === '--all') o.all = true; else if (x === '--dry-run') o.dryRun = true; else if (x === '--force') o.force = true; else if (x === '--no-download') o.noDownload = true; else if (x === '--seven-languages') o.seven = true; else if (x === '--language') o.language = a[++i]; else if (x === '--languages') o.languages = a[++i].split(',').map((s) => s.trim()); else if (x === '--source') o.source = a[++i] }
  return o
}
const opts = parseArgs(process.argv.slice(2))

function selectSources() {
  const entries = Object.entries(cfg.sources)
  return entries.filter(([key, s]) => {
    if (opts.source) return key === opts.source
    if (opts.seven) return SEVEN.includes(s.language)
    if (opts.languages) return opts.languages.includes(s.language)
    if (opts.language) return s.language === opts.language
    if (opts.all) return true
    return s.download === true
  })
}

function appHeadwords(lang) {
  const dir = path.join(repoRoot, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  const exact = new Set(), lower = new Set()
  for (const lv of man.levels) for (const e of JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8'))) {
    const w = String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''
    if (w) { exact.add(w); lower.add(w.toLowerCase()) }
  }
  return { exact, lower }
}

async function fetchDumpDate(pageUrl) {
  try { const r = await fetch(pageUrl, { signal: AbortSignal.timeout(15000) }); const t = await r.text(); const m = t.match(/dump dated (\d{4}-\d{2}-\d{2})/i); return m ? m[1] : null } catch { return null }
}

async function fetchToFile(url, destTmp, expectBytes) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(600000), headers: { 'User-Agent': 'WordQuest-DictAudit/1.0 (verification only)' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(destTmp))
      const got = fs.statSync(destTmp).size
      if (expectBytes && Math.abs(got - expectBytes) > expectBytes * 0.15) throw new Error(`サイズ不一致 期待~${expectBytes} 実${got}`)
      return got
    } catch (e) { try { fs.unlinkSync(destTmp) } catch {}; if (attempt === 3) throw e; await new Promise((res) => setTimeout(res, 3000 * attempt)) }
  }
}

// targeted: ダンプをストリームし、アプリ見出し語一致行だけ抽出保存
async function streamExtract(s, destTmp) {
  const { exact, lower } = appHeadwords(s.language)
  const r = await fetch(s.url, { signal: AbortSignal.timeout(1800000), headers: { 'User-Agent': 'WordQuest-DictAudit/1.0 (verification only)' } })
  if (!r.ok) throw new Error('HTTP ' + r.status)
  const rl = readline.createInterface({ input: Readable.fromWeb(r.body), crlfDelay: Infinity })
  const ws = fs.createWriteStream(destTmp)
  let scanned = 0, kept = 0
  for await (const line of rl) {
    if (!line) continue
    scanned++
    // 高速一次フィルタ(部分文字列)後にJSON.parse
    let e; try { e = JSON.parse(line) } catch { continue }
    const w = e.word
    if (w && (exact.has(w) || lower.has(String(w).toLowerCase()))) { ws.write(line + '\n'); kept++ }
  }
  ws.end(); await new Promise((res) => ws.on('finish', res))
  return { scanned, kept }
}

const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {}
const selected = selectSources()
console.log(`対象ソース: ${selected.map(([k]) => k).join(', ') || '(なし)'}${opts.dryRun ? '  [DRY-RUN]' : ''}`)

for (const [key, s] of selected) {
  const raw = path.join(here, s.rawFile || `data/raw/${key}`)
  const sizeH = s.sizeHuman || s.dumpSizeHuman || '?'
  if (opts.dryRun || opts.noDownload) {
    console.log(`\n[${key}] ${s.name}`)
    console.log(`  URL: ${s.url}`)
    console.log(`  保存先: ${s.rawFile}${s.targeted ? ' (targeted抽出・ダンプ全体は保存しない)' : ''}`)
    console.log(`  ダンプ予想: ${sizeH}  ライセンス: ${s.license}  取得可否: ${s.download}`)
    if (s.download === false) console.log(`  ※取得しない: ${s.downloadSkipReason || ''}`)
    continue
  }
  if (s.download === false && !opts.force) { console.log(`[${key}] skip (download:false)`); continue }
  fs.mkdirSync(path.dirname(raw), { recursive: true })
  if (fs.existsSync(raw) && !opts.force) { console.log(`[${key}] 既存を再利用: ${s.rawFile}`); continue }
  const tmp = raw + '.tmp'
  try {
    let entry = { name: s.name, url: s.url, license: s.license, licenseVerifiedFrom: s.licenseVerifiedFrom, downloadedAt: new Date().toISOString() }
    if (s.targeted) {
      console.log(`[${key}] ストリーム抽出中 (ダンプ ${sizeH} / アプリ見出し語一致行のみ) ...`)
      const dumpDate = await fetchDumpDate(s.officialPage)
      const { scanned, kept } = await streamExtract(s, tmp)
      fs.renameSync(tmp, raw)
      entry = { ...entry, targeted: true, dumpDate, dumpSize: sizeH, scannedLines: scanned, keptEntries: kept, extractedBytes: fs.statSync(raw).size, version: `kaikki wiktextract dump ${dumpDate || '(date未取得)'}` }
      console.log(`[${key}] 抽出完了 走査${scanned}行 → 一致${kept}件 (${(entry.extractedBytes / 1024).toFixed(0)}KB) dump=${dumpDate}`)
    } else {
      console.log(`[${key}] ダウンロード中 ${sizeH} ...`)
      const got = await fetchToFile(s.url, tmp, s.sizeBytes)
      fs.renameSync(tmp, raw)
      let unpackedSize = null
      if (s.compression === 'gzip' && s.unpackedFile) { const up = path.join(here, s.unpackedFile); fs.writeFileSync(up, zlib.gunzipSync(fs.readFileSync(raw))); unpackedSize = fs.statSync(up).size }
      entry = { ...entry, rawBytes: got, unpackedFile: s.unpackedFile || null, unpackedBytes: unpackedSize, version: 'downloaded-' + new Date().toISOString().slice(0, 10) }
      console.log(`[${key}] 完了 raw=${(got / 1e6).toFixed(1)}MB${unpackedSize ? ` unpacked=${(unpackedSize / 1e6).toFixed(1)}MB` : ''}`)
    }
    manifest[key] = entry
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  } catch (e) { console.error(`[${key}] 失敗: ${e.message}`) }
}
console.log(opts.dryRun ? '\n(DRY-RUN: 実取得なし)' : '\n完了。manifest: data/raw/_download-manifest.json')
