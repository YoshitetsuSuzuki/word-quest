// ============================================================================
// run-all.mjs  全対象言語を順次照合し、summary.json / summary.md を生成
//   使用: node run-all.mjs [--all|--limit N|--offset M|--no-net]
//   元データ非改変。各言語は check-<lang> と同じ runLanguage を順に呼ぶ。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runLanguage } from './shared/runner.mjs'
import { writeSummary } from './shared/reporter.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const cfg = JSON.parse(fs.readFileSync(path.join(here, 'config', 'languages.json'), 'utf8'))
const argv = process.argv.slice(2)
const LANGS = Object.keys(cfg.languages)

const summaries = []
for (const lang of LANGS) {
  try { summaries.push(await runLanguage(lang, argv)) }
  catch (e) { console.error(`[${lang}] 失敗:`, e.message) }
}
// 最新のライセンス使用状況を反映
let licenses = JSON.parse(fs.readFileSync(path.join(here, 'config', 'licenses.json'), 'utf8'))
const lastRun = path.join(here, 'reports', '_licenses-last-run.json')
if (fs.existsSync(lastRun)) licenses = JSON.parse(fs.readFileSync(lastRun, 'utf8'))
writeSummary(summaries, licenses)
console.log('\n=== summary.json / summary.md を生成しました（元データ変更: 0件）===')
