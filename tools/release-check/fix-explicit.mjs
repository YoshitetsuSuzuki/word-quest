// ============================================================================
// fix-explicit.mjs  第3段階で検出した30件のみを差し替える（安全策）
//   Critical 3件 … 不適切な例文を削除（example を除去）
//   Major  27件 … 露骨語の誤答選択肢を、同言語の別語へ決定的に置換
//   置換先: 正解でない・既存選択肢と重複しない・露骨語でない語を、
//           決定的ハッシュで安定に選ぶ（再現可能）。
//   対象30件以外は一切変更しない。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const LANGS = ['english', 'chinese', 'japanese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']

const SLUR_OR_EXPLICIT = [
  /\bfuck\w*/i, /\bshit\w*/i, /\bcunt\w*/i, /\bnigger\w*/i, /\bfaggot\w*/i, /\bwhore\b/i, /\bslut\b/i,
  /\brape\b/i, /\bporn\w*/i, /\bmasturbat\w*/i, /\bejaculat\w*/i, /\bgenital\w*/i, /\bpenis\b/i, /\bvagina\b/i,
  /(?:キチガイ|きちがい|気違い)/, /(?:めくら|つんぼ)(?![らりるれろっしゃ])/, /(?:土人|支那|鮮人)/,
  /(?:淫乱|痴女|強姦|売春婦|射精|性器|陰茎|膣)/, /(?:カス野郎|クズ野郎|死ね)/,
]
const isExplicit = (s) => typeof s === 'string' && SLUR_OR_EXPLICIT.some((re) => re.test(s))

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// 差し替え対象（第3段階の検出結果に対応）
const REMOVE_EXAMPLE = ['jp-02756', 'de-01536', 'de-01700']
// idごとに、露骨語が入っている選択肢インデックス
const FIX_CHOICE = {
  'en-20149': 0, 'en-20207': 1, 'en-20554': 0, 'en-20588': 3, 'en-20608': 2, 'en-20638': 0,
  'en-20723': 0, 'en-21196': 0, 'en-21203': 0, 'en-21220': 2, 'en-21242': 0, 'en-21259': 3,
  'en-21264': 1, 'es-00180': 2, 'es-01661': 0, 'de-00219': 2, 'de-00445': 0, 'de-00515': 1,
  'de-01075': 3, 'de-01568': 1, 'fr-00186': 0, 'fr-00606': 0, 'fr-00662': 3, 'fr-01425': 0,
  'fr-01520': 0, 'fr-01521': 0, 'fr-01733': 1,
}

// 言語ごとに「安全な選択肢候補プール」（他語の正解語＝同じ表記スタイル）を作る
function buildPool(all) {
  const seen = new Set()
  const pool = []
  for (const e of all) {
    const w = e.answer
    if (typeof w !== 'string' || !w.trim()) continue
    if (isExplicit(w)) continue          // 露骨語は候補に入れない
    if (seen.has(w)) continue
    seen.add(w); pool.push(w)
  }
  return pool
}

const report = []
let removed = 0, replaced = 0

for (const lang of LANGS) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  // 言語全体を一度読み、候補プールを作る
  const files = man.levels.map((lv) => ({ lv, p: path.join(dir, lv.file), arr: JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')) }))
  const all = files.flatMap((f) => f.arr)
  const pool = buildPool(all)

  for (const f of files) {
    let dirty = false
    for (const e of f.arr) {
      // --- 例文削除 ---
      if (REMOVE_EXAMPLE.includes(e.id) && e.example) {
        report.push({ id: e.id, action: 'remove_example', before: e.example })
        delete e.example
        removed++; dirty = true
      }
      // --- 選択肢差し替え ---
      if (e.id in FIX_CHOICE) {
        const idx = FIX_CHOICE[e.id]
        const before = e.choices[idx]
        // 決定的に候補を選ぶ。正解・既存選択肢・露骨語を避け、衝突時はハッシュを送る。
        const others = new Set(e.choices.filter((_, i) => i !== idx))
        let pick = null
        for (let k = 0; k < pool.length; k++) {
          const cand = pool[(hash(e.id + '#' + k) + k) % pool.length]
          if (cand === e.answer) continue
          if (others.has(cand)) continue
          if (isExplicit(cand)) continue
          pick = cand; break
        }
        if (!pick) { report.push({ id: e.id, action: 'FAILED_no_candidate' }); continue }
        e.choices[idx] = pick
        report.push({ id: e.id, action: 'replace_choice', idx, before, after: pick, prompt: e.prompt, answer: e.answer })
        replaced++; dirty = true
      }
    }
    if (dirty) fs.writeFileSync(f.p, JSON.stringify(f.arr))
  }
}

fs.writeFileSync(path.join(root, 'release-check', 'fix-explicit-report.json'), JSON.stringify({ removed, replaced, total: report.length, report }, null, 1))
console.log(JSON.stringify({ removedExamples: removed, replacedChoices: replaced }))
for (const r of report.filter((x) => x.action === 'replace_choice')) console.log(`  ${r.id} 「${r.prompt}」正解「${r.answer}」  ${r.before} → ${r.after}`)
for (const r of report.filter((x) => x.action !== 'replace_choice')) console.log(`  ${r.id} ${r.action}`)
