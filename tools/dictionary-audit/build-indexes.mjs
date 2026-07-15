// ============================================================================
// build-indexes.mjs  正規化辞書から検索インデックスを構築 (data/indexes/)
//   使用: node build-indexes.mjs [--source S]
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildIndex } from './shared/index-store.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'sources.json'), 'utf8'))
const only = process.argv.includes('--source') ? process.argv[process.argv.indexOf('--source') + 1] : null

for (const [key, s] of Object.entries(cfg.sources)) {
  if (s.download !== true) continue
  if (only && key !== only) continue
  const proc = path.join(here, 'data', 'processed', key + '.jsonl')
  if (!fs.existsSync(proc)) { console.log(`[${key}] processed未生成: skip`); continue }
  const t0 = Date.now()
  const r = buildIndex(key)
  console.log(`[${key}] インデックス構築 ${r.count}件 (${r.language}) ${(Date.now() - t0)}ms → data/indexes/${key}.index.json`)
}
console.log('インデックス構築完了')
