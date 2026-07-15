// ============================================================================
// download-dictionaries.mjs  辞書の安全な取得（設定駆動・再開安全・非破壊）
//   URLは config/sources.json に集約。data/raw/ に保存(Git管理外)。
//   一時ファイル→リネーム、既存再利用、HTTPエラー/リトライ/タイムアウト、
//   Content-Lengthサイズ確認、ダウンロード日時/URL/版を manifest に記録。
//   使用: node download-dictionaries.mjs [--language L] [--source S] [--all] [--dry-run] [--force] [--no-download]
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'sources.json'), 'utf8'))
const manifestPath = path.join(here, 'data', 'raw', '_download-manifest.json')

function parseArgs(a) { const o = { language: null, source: null, all: false, dryRun: false, force: false, noDownload: false }; for (let i = 0; i < a.length; i++) { const x = a[i]; if (x === '--all') o.all = true; else if (x === '--dry-run') o.dryRun = true; else if (x === '--force') o.force = true; else if (x === '--no-download') o.noDownload = true; else if (x === '--language') o.language = a[++i]; else if (x === '--source') o.source = a[++i] } return o }
const opts = parseArgs(process.argv.slice(2))

function selectSources() {
  const entries = Object.entries(cfg.sources)
  return entries.filter(([key, s]) => {
    if (opts.source) return key === opts.source
    if (opts.language) return s.language === opts.language
    if (opts.all) return true
    return s.download === true // 既定は download:true のもの
  })
}

async function fetchToFile(url, destTmp, expectBytes) {
  const maxRetry = 3
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(120000), headers: { 'User-Agent': 'WordQuest-DictAudit/1.0 (verification only)' } })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const len = Number(r.headers.get('content-length') || 0)
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(destTmp))
      const got = fs.statSync(destTmp).size
      if (expectBytes && Math.abs(got - expectBytes) > expectBytes * 0.1) throw new Error(`サイズ不一致 期待~${expectBytes} 実際${got}`)
      if (len && Math.abs(got - len) > 1024) throw new Error(`Content-Length不一致 ${len} vs ${got}`)
      return got
    } catch (e) { try { fs.unlinkSync(destTmp) } catch {}; if (attempt === maxRetry) throw e; await new Promise((res) => setTimeout(res, 2000 * attempt)) }
  }
}
function gunzip(src, dest) { const buf = fs.readFileSync(src); fs.writeFileSync(dest, zlib.gunzipSync(buf)) }

const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {}
const selected = selectSources()
console.log(`対象ソース: ${selected.map(([k]) => k).join(', ') || '(なし)'}${opts.dryRun ? '  [DRY-RUN]' : ''}`)

for (const [key, s] of selected) {
  const raw = path.join(here, s.rawFile || `data/raw/${key}`)
  if (opts.dryRun || opts.noDownload) {
    console.log(`\n[${key}] ${s.name}`)
    console.log(`  URL: ${s.url}`)
    console.log(`  保存先: ${s.rawFile}`)
    console.log(`  予想サイズ: ${s.sizeHuman}  ライセンス: ${s.license}  取得可否: ${s.download}`)
    if (s.download === false) console.log(`  ※取得しない: ${s.downloadSkipReason || ''}`)
    continue
  }
  if (s.download === false && !opts.force) { console.log(`[${key}] skip (download:false ・ ${s.downloadSkipReason || ''})`); continue }
  fs.mkdirSync(path.dirname(raw), { recursive: true })
  if (fs.existsSync(raw) && !opts.force) { console.log(`[${key}] 既存を再利用: ${s.rawFile}`); continue }
  const tmp = raw + '.tmp'
  try {
    console.log(`[${key}] ダウンロード中 ${s.sizeHuman} ...`)
    const got = await fetchToFile(s.url, tmp, s.sizeBytes)
    fs.renameSync(tmp, raw)
    // 解凍
    let unpackedSize = null
    if (s.compression === 'gzip' && s.unpackedFile) { const up = path.join(here, s.unpackedFile); gunzip(raw, up); unpackedSize = fs.statSync(up).size }
    manifest[key] = { name: s.name, url: s.url, license: s.license, licenseVerifiedFrom: s.licenseVerifiedFrom, downloadedAt: new Date().toISOString(), rawBytes: got, unpackedFile: s.unpackedFile || null, unpackedBytes: unpackedSize, version: 'downloaded-' + new Date().toISOString().slice(0, 10) }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    console.log(`[${key}] 完了 raw=${(got / 1e6).toFixed(1)}MB${unpackedSize ? ` unpacked=${(unpackedSize / 1e6).toFixed(1)}MB` : ''}`)
  } catch (e) { console.error(`[${key}] 失敗: ${e.message}`) }
}
console.log(opts.dryRun ? '\n(DRY-RUN: 実際の取得は行っていません)' : '\n完了。manifest: data/raw/_download-manifest.json')
