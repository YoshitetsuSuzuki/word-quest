// ============================================================================
// normalize-dictionaries.mjs  取得済み辞書を共通形式に正規化 → data/processed/<source>.jsonl
//   毎回の生辞書走査を避けるための前処理。辞書に無い情報は生成しない。
//   使用: node normalize-dictionaries.mjs [--source S]
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizeCedict } from './shared/normalizers/cedict.mjs'
import { normalizeWordnet } from './shared/normalizers/wordnet.mjs'
import { normalizeKaikki } from './shared/normalizers/kaikki.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'sources.json'), 'utf8'))
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'data', 'raw', '_download-manifest.json'), 'utf8'))
const onlySource = (process.argv.includes('--source')) ? process.argv[process.argv.indexOf('--source') + 1] : null
const processedDir = path.join(here, 'data', 'processed')
fs.mkdirSync(processedDir, { recursive: true })

for (const [key, s] of Object.entries(cfg.sources)) {
  if (s.download !== true) continue
  if (onlySource && key !== onlySource) continue
  const up = path.join(here, s.unpackedFile)
  if (!fs.existsSync(up)) { console.log(`[${key}] unpacked未取得: skip`); continue }
  const ver = manifest[key]?.version || ''
  console.log(`[${key}] 正規化中 (${s.normalizer}) ...`)
  const text = fs.readFileSync(up, 'utf8')
  let entries
  if (s.normalizer === 'cedict') entries = normalizeCedict(text, ver)
  else if (s.normalizer === 'wordnet') entries = normalizeWordnet(text, ver)
  else if (s.normalizer === 'kaikki') entries = normalizeKaikki(text, ver, s.language.slice(0, 2))
  else { console.log(`[${key}] 未知のnormalizer`); continue }
  const outFile = path.join(processedDir, key + '.jsonl')
  fs.writeFileSync(outFile, entries.map((e) => JSON.stringify(e)).join('\n') + '\n')
  const withPos = entries.filter((e) => e.partsOfSpeech.length).length
  const withIpa = entries.filter((e) => e.pronunciations.length).length
  console.log(`[${key}] 正規化 ${entries.length}件 (品詞あり${withPos} / 発音あり${withIpa}) → data/processed/${key}.jsonl`)
}
console.log('正規化完了')
