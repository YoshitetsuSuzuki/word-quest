// ============================================================================
// verify-en-ipa.mjs  英語8,136語の発音(IPA)をKaikki英語で非破壊照合(照合のみ)
//   変種(US/UK・強勢表記・広狭)は許容。音素欠落・別語発音など明白な逸脱のみ flag。
//   出力: audit/en-ipa/*.json / *.md  (修正はしない・要人手候補を提示)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const outDir = path.join(repoRoot, 'audit', 'en-ipa')
fs.mkdirSync(outDir, { recursive: true })
const dumpPath = path.join(here, 'data', 'raw', 'kaikki-english-full.jsonl')
if (!fs.existsSync(dumpPath)) { console.error('Kaikki英語full未取得'); process.exit(1) }

// GA(米)とRP(英)の転写差を吸収して正規化(音素レベルの粗い比較)
function normIpa(s) {
  let t = String(s || '')
    .replace(/\([^)]*\)/g, '')      // 括弧内の任意要素 (ɹ)(ə)(h)(j)
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // 結合ダイアクリティカル(非音節/長音付帯)
  t = t.replace(/[/\[\]ˈˌ.ˑ‿ ]/g, '').replace(/ː/g, '')
    .replace(/ɫ/g, 'l').replace(/ɹ/g, 'r').replace(/ɡ/g, 'g')
    .replace(/ɝ/g, 'ər').replace(/ɚ/g, 'ər').replace(/ɜ/g, 'ə').replace(/ʌ/g, 'ə')
    .toLowerCase()
  return t
}
function editDist(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++)for (let j = 1; j <= n; j++)d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n] }

const dictIpa = new Map(), dictRaw = new Map()
for (const line of fs.readFileSync(dumpPath, 'utf8').split('\n')) {
  if (!line.trim()) continue; let e; try { e = JSON.parse(line) } catch { continue }
  const w = String(e.word || '').toLowerCase()
  for (const s of e.sounds || []) { if (!s.ipa) continue; if (!dictIpa.has(w)) { dictIpa.set(w, new Set()); dictRaw.set(w, new Map()) } const n = normIpa(s.ipa); dictIpa.get(w).add(n); if (!dictRaw.get(w).has(n)) dictRaw.get(w).set(n, s.ipa) }
}

const man = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', 'english', 'manifest.json'), 'utf8'))
let all = []; for (const lv of man.levels) all = all.concat(JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', 'english', lv.file), 'utf8')))
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '')

const results = []
for (const e of all) {
  const word = hw(e), appP = e.pronunciation
  if (!appP) { results.push({ id: e.id, word, status: 'app_no_ipa' }); continue }
  const w = word.toLowerCase()
  if (!dictIpa.has(w)) { results.push({ id: e.id, word, appIpa: appP, status: 'dict_no_ipa' }); continue }
  const appN = normIpa(appP)
  const dictNs = [...dictIpa.get(w)]
  if (dictNs.includes(appN)) { results.push({ id: e.id, word, appIpa: appP, status: 'matched' }); continue }
  let best = Infinity, bestRaw = ''
  for (const dn of dictNs) { const d = editDist(appN, dn); if (d < best) { best = d; bestRaw = dictRaw.get(w).get(dn) } }
  const ratio = best / Math.max(appN.length, 1)
  let status
  if (best <= 1) status = 'matched'
  else if (ratio <= 0.34) status = 'variant'
  else status = 'different'
  results.push({ id: e.id, word, appIpa: appP, dictIpa: bestRaw, editDist: best, ratio: +ratio.toFixed(2), status })
}

const by = {}; for (const r of results) by[r.status] = (by[r.status] || 0) + 1
const different = results.filter((r) => r.status === 'different').sort((a, b) => b.ratio - a.ratio)
fs.writeFileSync(path.join(outDir, 'en-ipa-results.json'), JSON.stringify({ source: 'Kaikki English (Wiktextract, CC-BY-SA)', total: results.length, byStatus: by, note: 'GA(米)/RP(英)の転写差は正規化で吸収。different=明白な逸脱(音素欠落/別発音)候補。' }, null, 2))
fs.writeFileSync(path.join(outDir, 'en-ipa-different.json'), JSON.stringify(different, null, 2))
console.log('英語IPA照合:', results.length, '語 / status別:', by)
console.log('明白な逸脱(different):', different.length)
