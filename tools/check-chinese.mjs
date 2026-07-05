// meanings.chinese.json の日本語訳を CC-CEDICT の英語義と突き合わせて出力（正誤チェック用）
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const meanings = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'meanings.chinese.json'), 'utf8'))

// CC-CEDICT: 行例  繁 简 [pin1 yin1] /gloss1/gloss2/
const cedict = new Map()
for (const line of fs.readFileSync(path.join(root, '.cache', 'cedict.txt'), 'utf8').split('\n')) {
  if (line.startsWith('#') || !line.trim()) continue
  const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/)
  if (!m) continue
  const simp = m[2]
  const glosses = m[4].split('/').filter(Boolean)
  if (!cedict.has(simp)) cedict.set(simp, glosses.slice(0, 4).join('; '))
}

const startArg = process.argv[2] ? parseInt(process.argv[2], 10) : 0
const entries = Object.entries(meanings).filter(([k]) => !k.startsWith('_'))
const slice = entries.slice(startArg)
let missing = 0
for (const [w, ja] of slice) {
  const en = cedict.get(w)
  if (!en) {
    missing++
    console.log(`${w}=${ja}  ⚠️CEDICT無`)
  } else {
    console.log(`${w}=${ja}  ::  ${en}`)
  }
}
console.error(`\n(${slice.length}語 / CEDICT無 ${missing}語)`)
