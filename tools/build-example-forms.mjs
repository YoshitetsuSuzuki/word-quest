// ============================================================================
// build-example-forms.mjs  例文中の表層形抽出(リスニング穴埋め用)
//
// examples.english.json の各「word: 英文 — 日本語訳」から、文中に実際に
// 現れている対象単語の形(bought / dresses 等)を抽出して出力する。
// 例文の再選定は行わない(人手削除済みの例文を復活させないため)。
// 抽出は例文選定時と同一の屈折ロジック(inflect.english.mjs)を使う。
//
// 出力: tools/examples.english.forms.json … { word: "表層形", ... }
//   build-wordbank.mjs がこれを読み Question.exampleForm に設定する。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inflections } from './inflect.english.mjs'

const toolsDir = path.dirname(fileURLToPath(import.meta.url))
const examples = JSON.parse(fs.readFileSync(path.join(toolsDir, 'examples.english.json'), 'utf8'))
// 書き下ろし例文はTatoebaより優先(build-wordbank.mjs と同じマージ規則)
try {
  const custom = JSON.parse(fs.readFileSync(path.join(toolsDir, 'examples.custom.english.json'), 'utf8'))
  for (const [w, ex] of Object.entries(custom)) {
    if (!w.startsWith('_') && typeof ex === 'string') examples[w] = ex
  }
} catch {
  // 書き下ろし無しでも動く
}

const out = {}
const misses = []
for (const [word, ex] of Object.entries(examples)) {
  if (word.startsWith('_') || typeof ex !== 'string') continue
  const eng = ex.split(' — ')[0]
  const forms = new Set([word, ...inflections(word)])
  const token = (eng.match(/[A-Za-z']+/g) ?? []).find((t) => forms.has(t.toLowerCase()))
  if (token) out[word] = token
  else misses.push(word)
}

fs.writeFileSync(path.join(toolsDir, 'examples.english.forms.json'), JSON.stringify(out, null, 1))
console.log('表層形抽出:', Object.keys(out).length, '/', Object.keys(examples).length)
if (misses.length) console.warn('抽出できなかった語(例文はあるが形が見つからない):', misses.length, misses.slice(0, 20))
