// ============================================================================
// apply-cc-fix.mjs  独立辞書突合の指摘をワードバンクへ適用
//
//   入力: tools/expand/cc-fix/<lang>-NN.json
//         [{word, issue, suggest_ja, suggest_en?}]
//         suggest_ja === null → その語を削除（出荷しない）
//   4択(choices)は英語なので、answer/glosses.en を変えたら choices 内も差し替える。
//   --dry で書き込まず影響のみ表示。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const fixDir = path.join(root, 'tools', 'expand', 'cc-fix')
const DRY = process.argv.includes('--dry')
const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

const LANGS = ['spanish', 'french', 'german', 'portuguese', 'russian', 'polish']
const report = []

for (const lang of LANGS) {
  if (!fs.existsSync(fixDir)) break
  const files = fs.readdirSync(fixDir).filter((f) => f.startsWith(lang + '-') && f.endsWith('.json'))
  if (!files.length) continue
  const fixes = new Map()
  for (const f of files) {
    let arr
    try { arr = JSON.parse(fs.readFileSync(path.join(fixDir, f), 'utf8')) } catch (e) { console.log(`! 読込失敗 ${f}: ${e.message}`); continue }
    for (const x of arr) if (x?.word && !fixes.has(x.word)) fixes.set(x.word, x)
  }

  const wbDir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  let fixedJa = 0, fixedEn = 0, removed = 0, notFound = 0
  const levels = []

  for (const lv of man.levels) {
    const p = path.join(wbDir, lv.file)
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
    const out = []
    for (const e of arr) {
      const w = String(e.prompt || '').replace(/[「」]|の意味は？/g, '')
      const fx = fixes.get(w)
      if (!fx) { out.push(e); continue }
      fixes.delete(w) // 適用済み

      if (fx.suggest_ja === null) { removed++; continue } // 削除指摘

      if (fx.suggest_ja && HAS_JP.test(fx.suggest_ja) && String(fx.suggest_ja).length <= 14) {
        e.glosses = { ...e.glosses, ja: String(fx.suggest_ja).trim() }
        fixedJa++
      }
      if (fx.suggest_en && typeof fx.suggest_en === 'string' && fx.suggest_en.trim()) {
        const neo = fx.suggest_en.trim()
        const old = e.answer
        e.choices = (e.choices || []).map((c) => (c === old ? neo : c))
        e.answer = neo
        e.glosses = { ...e.glosses, en: neo }
        fixedEn++
      }
      out.push(e)
    }
    if (!DRY) fs.writeFileSync(p, JSON.stringify(out))
    levels.push({ level: lv.level, file: lv.file, count: out.length })
  }
  notFound = fixes.size
  if (!DRY) fs.writeFileSync(path.join(wbDir, 'manifest.json'), JSON.stringify({ ...man, levels }, null, 2))
  report.push({ lang, 和訳修正: fixedJa, 英語修正: fixedEn, 削除: removed, 未適用: notFound, 残語数: levels.reduce((s, l) => s + l.count, 0) })
}

console.log(DRY ? '=== DRY RUN ===' : '=== 適用しました ===')
for (const r of report) console.log(JSON.stringify(r))
