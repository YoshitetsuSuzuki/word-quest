// ============================================================================
// verify-downloads.mjs  取得済み辞書の健全性確認（サイズ・解凍・行数・manifest）
//   使用: node verify-downloads.mjs
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'sources.json'), 'utf8'))
const manifestPath = path.join(here, 'data', 'raw', '_download-manifest.json')
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {}

let allOk = true
for (const [key, s] of Object.entries(cfg.sources)) {
  if (s.download !== true) { console.log(`[${key}] 未取得(download:false)`); continue }
  const raw = path.join(here, s.rawFile)
  const unpacked = s.unpackedFile ? path.join(here, s.unpackedFile) : null
  const rawOk = fs.existsSync(raw)
  const upOk = unpacked ? fs.existsSync(unpacked) : true
  let lines = null
  if (upOk && unpacked) { try { lines = fs.readFileSync(unpacked, 'utf8').split('\n').length } catch {} }
  const m = manifest[key]
  const ok = rawOk && upOk && !!m
  if (!ok) allOk = false
  console.log(`[${key}] raw:${rawOk ? '✓' : '✗'} unpacked:${upOk ? '✓' : '✗'}${lines ? ` (~${lines}行)` : ''} manifest:${m ? '✓' : '✗'} ver:${m?.version || '-'} lic:${m?.license || '-'}`)
}
console.log(allOk ? '\n✅ 取得済み辞書は健全' : '\n⚠ 一部未取得/不整合')
process.exit(allOk ? 0 : 1)
