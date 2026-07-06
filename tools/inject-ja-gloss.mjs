// ============================================================================
// inject-ja-gloss.mjs  検証済み日本語訳をワードバンクへ注入
//
// 1) チームエージェントの意味検証結果(out.{lang}.{1..3}.json)を統合し、
//    null(不採用)を除いた「確認済み日本語訳」を tools/gloss.ja.{lang}.json に確定保存。
// 2) public/wordbank/{lang}/level-*.json の各問題に glosses.ja を注入。
//    manifest.json に jaVerified 件数を追記。
//
// これにより ja ロケールで西/仏/独を「確認できた語だけ」出題できる。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const toolsDir = path.join(root, 'tools')
const verifyDir = process.env.VERIFY_DIR
  || '/private/tmp/claude-501/-Users-yoshitetsu-Desktop/43204b27-035f-4092-8261-c2e70d16061c/scratchpad/verify'
const LANGS = ['spanish', 'french', 'german']

function mergeVerified(lang) {
  const merged = {}
  let files = 0
  for (let k = 1; k <= 3; k++) {
    const p = path.join(verifyDir, `out.${lang}.${k}.json`)
    if (!fs.existsSync(p)) { console.warn(`  ! 欠落: out.${lang}.${k}.json`); continue }
    files++
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const [w, ja] of Object.entries(obj)) {
      if (ja == null) continue // 不採用
      const v = String(ja).trim()
      if (!v) continue
      merged[w] = v
    }
  }
  return { merged, files }
}

let grand = 0
for (const lang of LANGS) {
  const { merged, files } = mergeVerified(lang)
  const jaPath = path.join(toolsDir, `gloss.ja.${lang}.json`)
  fs.writeFileSync(jaPath, JSON.stringify(merged, null, 2) + '\n')
  const kept = Object.keys(merged).length

  // ワードバンクへ注入
  const dir = path.join(root, 'public', 'wordbank', lang)
  let injected = 0
  for (let lv = 1; lv <= 5; lv++) {
    const p = path.join(dir, `level-${lv}.json`)
    if (!fs.existsSync(p)) continue
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const q of arr) {
      const m = /^「(.+?)」/.exec(q.prompt || '')
      const w = m && m[1]
      if (w && merged[w]) {
        q.glosses = { ...(q.glosses || {}), ja: merged[w] }
        injected++
      }
    }
    fs.writeFileSync(p, JSON.stringify(arr))
  }

  // manifest に jaVerified を追記
  const manPath = path.join(dir, 'manifest.json')
  if (fs.existsSync(manPath)) {
    const man = JSON.parse(fs.readFileSync(manPath, 'utf8'))
    man.jaVerified = injected
    fs.writeFileSync(manPath, JSON.stringify(man, null, 2))
  }

  grand += injected
  console.log(`=== ${lang} === 検証ファイル ${files}/3 / 確認済み訳 ${kept} / ワードバンク注入 ${injected}`)
}
console.log(`\n合計 注入語数: ${grand}`)
