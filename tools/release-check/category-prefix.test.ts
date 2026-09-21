// ============================================================================
// category-prefix.test.ts
//
// 学習記録(learnedQuestionIds / reviewQueue / wordStats)は出題IDの接頭辞で
// ジャンルを見分けている。画面ごとに対応表を手書きしていた時期があり、
// 後から足した言語が漏れて「英語の記録を別の言語で表示する」不具合が起きた。
//
// この検査は CATEGORY_ID_PREFIX が実データと一致していることを保証する。
// 言語を足したときにここを更新し忘れると、必ずここで落ちる。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { categories, CATEGORY_ID_PREFIX } from '../../src/data/categories'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
let fail = 0
const say = (ok: boolean, msg: string) => {
  console.log(`  ${ok ? 'ok ' : 'NG '} ${msg}`)
  if (!ok) fail++
}

// 1) 全カテゴリに接頭辞が定義されているか
for (const c of categories) {
  say(typeof CATEGORY_ID_PREFIX[c.id] === 'string' && CATEGORY_ID_PREFIX[c.id].length > 0,
    `${c.id}: 接頭辞が定義されている (${CATEGORY_ID_PREFIX[c.id]})`)
}

// 2) 接頭辞どうしが重複していないか（重複すると別ジャンルの記録を拾う）
const seen = new Map<string, string>()
for (const c of categories) {
  const p = CATEGORY_ID_PREFIX[c.id]
  const prev = seen.get(p)
  say(!prev, `${c.id}: 接頭辞 '${p}' が他と衝突していない${prev ? ` (${prev} と重複)` : ''}`)
  seen.set(p, c.id)
}

// 3) 実際のワードバンクのIDが、その接頭辞で始まっているか
for (const c of categories) {
  const dir = path.join(root, 'public', 'wordbank', c.id)
  if (!fs.existsSync(dir)) continue
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  const want = CATEGORY_ID_PREFIX[c.id] + '-'
  let bad = 0
  let n = 0
  for (const lv of man.levels) {
    for (const q of JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8'))) {
      n++
      if (!String(q.id).startsWith(want)) bad++
    }
  }
  say(bad === 0, `${c.id}: ${n} 語すべてが '${want}' で始まる${bad ? ` (違反 ${bad} 件)` : ''}`)
}

// 4) ある言語の接頭辞が、別の言語のIDにも当たってしまわないか
//    （'en' が 'english' 以外を拾わないことの確認。将来 'e' 等を足すと壊れる）
for (const a of categories) {
  const pa = CATEGORY_ID_PREFIX[a.id] + '-'
  const clash = categories.filter((b) => b.id !== a.id && (CATEGORY_ID_PREFIX[b.id] + '-').startsWith(pa))
  say(clash.length === 0, `${a.id}: '${pa}' が他ジャンルのIDに当たらない${clash.length ? ` (${clash.map((x) => x.id).join(',')})` : ''}`)
}

console.log(fail === 0 ? '\nPASS' : `\nFAIL (${fail} 件)`)
process.exit(fail === 0 ? 0 : 1)
