// ============================================================================
// build-en-gloss.chinese.mjs  中国語→英語グロス候補生成 (HSK1 パイロット)
//
// 英語母語ユーザー向けに、各中国語語へ英語の訳(gloss)候補を付ける。
// 方針: CC-CEDICT(中英辞書)の英語義候補を、既に人手検証済みの日本語訳を
//       "語義の錨"にして次タスクで選ぶ。本スクリプトは**候補生成まで**。
//
// 入力:
//   .cache/cedict.txt              … CC-CEDICT (簡体字=2列目で引く)
//   tools/meanings.chinese.json    … { 簡体字: 日本語訳 } (人手検証済み)
//   public/wordbank/chinese/level-1.json … HSK1 verified 全語
// 出力:
//   tools/gloss.en.chinese.candidates.json
//     { 簡体字: { ja, cand:[...], pick } }
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cachePath = path.join(root, '.cache', 'cedict.txt')
const meaningsPath = path.join(root, 'tools', 'meanings.chinese.json')
const levelPath = path.join(root, 'public', 'wordbank', 'chinese', 'level-1.json')
const outPath = path.join(root, 'tools', 'gloss.en.chinese.candidates.json')

// ---- 1. CC-CEDICT をパースして 簡体字 -> gloss配列 の Map を作る ----
const cedictLines = fs.readFileSync(cachePath, 'utf8').split('\n')
const LINE_RE = /^(\S+)\s+(\S+)\s+\[[^\]]*\]\s+\/(.+)\/\s*$/
const glossMap = new Map()
for (const line of cedictLines) {
  if (!line || line.startsWith('#')) continue
  const m = LINE_RE.exec(line)
  if (!m) continue
  const simplified = m[2]
  const glosses = m[3].split('/').map((g) => g.trim()).filter(Boolean)
  if (!glossMap.has(simplified)) glossMap.set(simplified, [])
  glossMap.get(simplified).push(...glosses)
}

// ---- 2. level-1.json の verified 語の簡体字リスト ----
const meanings = JSON.parse(fs.readFileSync(meaningsPath, 'utf8'))
const level1 = JSON.parse(fs.readFileSync(levelPath, 'utf8'))
const HANZI_RE = /^「(.+)」の意味は？$/
const targets = []
for (const q of level1) {
  if (q.verified !== true) continue
  const m = HANZI_RE.exec(q.prompt || '')
  if (!m) continue
  targets.push(m[1])
}

// ---- 3. 各簡体字について候補を引く ----
const candidates = {}
const missing = []
for (const hanzi of targets) {
  const raw = glossMap.get(hanzi)
  if (!raw || raw.length === 0) {
    missing.push(hanzi)
    continue
  }
  // 重複除去 + 最大6件
  const cand = [...new Set(raw)].slice(0, 6)
  candidates[hanzi] = {
    ja: typeof meanings[hanzi] === 'string' ? meanings[hanzi] : '',
    cand,
    pick: cand[0],
  }
}

// ---- 4. 書き出し ----
fs.writeFileSync(outPath, JSON.stringify(candidates, null, 2) + '\n')

// ---- 5. コンソール出力 ----
console.log('対象語数(HSK1 verified):', targets.length)
console.log('候補が得られた語数:', Object.keys(candidates).length)
console.log('CEDICT無語数:', missing.length)
if (missing.length) {
  console.log('CEDICT無リスト(先頭30):')
  console.log('  ' + missing.slice(0, 30).join(' '))
}
