// ============================================================================
// build-examples-japanese.mjs  日本語単語 例文生成 (Tatoeba CC-BY 2.0 FR)
//
// 目的: 英語圏ユーザー向けに、ワードバンクの各日本語見出し語へ
//   「日本語例文 — English translation」を1つ付与し、見出し語を空欄(blank)にする。
//   文の自作・改変は一切しない(Tatoeba の日英対訳ペアをそのまま採用)。
//
// 入力(.cache): https://downloads.tatoeba.org/exports/per_language/ から取得
//   jpn_sentences.tsv   … id<TAB>jpn<TAB>日本語文
//   eng_sentences.tsv   … id<TAB>eng<TAB>英文
//   eng-jpn_links.tsv   … 英文id<TAB>日本語文id (対訳リンク)
// 入力(public): wordbank/japanese/level-{1..5}.json … 対象語(prompt「「X」の意味は？」からX抽出)
//
// 出力: tools/examples.custom.japanese.json
//   { "見出し": { "ex": "日本語文 — English translation.", "blank": "見出し" }, ... }
//   例文が見つからない語は含めない。
//
// マッチング(日本語は分かち書きが無いので substring):
//   見出しを連続部分文字列としてちょうど1回含む日本語文を候補にする。
//   英訳リンクがある文のみ採用。
//
// 選定スコア(小さいほど良い / 足切りあり):
//   - 日本語文長 8〜30 目安(短い文を優先)
//   - 見出しがちょうど1回出現(2回以上・0回は不採用)
//   - 英訳が存在し空でないこと
//   - 完全な文(句点。で終わる)を優先
//   - 固有名詞・記号(ラテン文字/数字)が少ない文を優先
//   - 卑語・下品な文は除外
//   - 単漢字/かな見出しは他語への埋没に注意(見出し長2以上を優先スコアで扱う)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const wordbankDir = path.join(root, 'public', 'wordbank', 'japanese')
const outFile = path.join(root, 'tools', 'examples.custom.japanese.json')

// ---- 1. 対象語の読み込み(level JSON の prompt「「X」の意味は？」から X 抽出) ----
const words = new Map() // 見出し -> { level }
for (let lv = 1; lv <= 5; lv++) {
  const items = JSON.parse(fs.readFileSync(path.join(wordbankDir, `level-${lv}.json`), 'utf8'))
  for (const q of items) {
    const m = q.prompt.match(/「(.+?)」/)
    if (m && m[1]) {
      if (!words.has(m[1])) words.set(m[1], { level: lv })
    }
  }
}

// ---- 卑語・下品ブロックリスト(明らかなもの) ----
const BLOCK = [
  'セックス', 'ちんこ', 'まんこ', 'ペニス', 'ヴァギナ', 'オナニー', 'マスターベーション',
  'クソ', 'くそ', 'ウンコ', 'うんこ', '糞', 'ちんちん', 'おっぱい', 'ちくしょう', '畜生',
  'レイプ', '強姦', 'バカ野郎', '死ね', 'ぶっ殺', 'クソったれ', 'ちんぽ', '陰茎', '膣',
]
function isBlocked(s) {
  for (const b of BLOCK) if (s.includes(b)) return true
  return false
}

// ---- 2. Tatoeba 読み込みユーティリティ ----
async function loadTsv(file, onRow) {
  const rl = readline.createInterface({
    input: fs.createReadStream(path.join(cacheDir, file)),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    const cols = line.split('\t')
    if (cols.length >= 2) onRow(cols)
  }
}

// eng-jpn_links.tsv: 列1=英文id, 列2=日本語文id (実データで確認済み: 1276->4702)
const jpnToEngIds = new Map() // jpnId -> [engId...]
await loadTsv('eng-jpn_links.tsv', ([engId, jpnId]) => {
  if (!engId || !jpnId) return
  if (!jpnToEngIds.has(jpnId)) jpnToEngIds.set(jpnId, [])
  jpnToEngIds.get(jpnId).push(engId)
})

// 英訳リンクのある英文idだけ保持
const neededEng = new Set()
for (const ids of jpnToEngIds.values()) for (const id of ids) neededEng.add(id)
const engText = new Map()
await loadTsv('eng_sentences.tsv', ([id, , text]) => {
  if (neededEng.has(id) && text) engText.set(id, text.trim())
})

// ---- 見出し語の集合(埋没しやすい形の照合を高速化するため前計算) ----
// 「見出しがちょうど1回現れる」チェックは各文で行う。
const wordList = [...words.keys()]

// 高速化: 見出しの先頭1文字 -> その文字で始まる見出し語群。
// 各文について「文中に含まれる文字で始まる見出し」だけを候補にして
//   全語 × 全文の総当たり(数十億回)を回避する。
const byFirstChar = new Map()
for (const word of wordList) {
  const c = word[0]
  if (!byFirstChar.has(c)) byFirstChar.set(c, [])
  byFirstChar.get(c).push(word)
}

// 英訳を選ぶ(短くひらがな不要・ラテン文字を含む完全な英文を優先)
function pickEnglish(engIds) {
  const cands = []
  for (const id of engIds) {
    const t = engText.get(id)
    if (!t) continue
    if (!/[A-Za-z]/.test(t)) continue // 英文であること
    if (t.length < 2 || t.length > 120) continue
    cands.push(t)
  }
  cands.sort((a, b) => {
    // 完全な文(大文字始まり・.!?終わり)を優先、次に短い
    const fa = /^[A-Z]/.test(a) && /[.!?]["”')]?$/.test(a) ? 0 : 1
    const fb = /^[A-Z]/.test(b) && /[.!?]["”')]?$/.test(b) ? 0 : 1
    if (fa !== fb) return fa - fb
    return a.length - b.length
  })
  return cands[0]
}

function countOccurrences(hay, needle) {
  let n = 0, i = 0
  while (true) {
    const idx = hay.indexOf(needle, i)
    if (idx === -1) break
    n++
    i = idx + needle.length
  }
  return n
}

// ---- 3-6. jpn_sentences を走査し、各見出し語の最良文を選定 ----
const best = new Map() // 見出し -> { score, len, jpn, eng }
let jpnProcessed = 0
const LATIN_RE = /[A-Za-z0-9]/g

await loadTsv('jpn_sentences.tsv', ([id, , rawText]) => {
  if (!rawText) return
  const engIds = jpnToEngIds.get(id)
  if (!engIds) return // 英訳リンクのある文のみ
  const jpn = rawText.trim()
  if (!jpn) return
  if (isBlocked(jpn)) return
  jpnProcessed++

  // 英訳を1本選ぶ(見出しに依存しないので先に確定)
  const eng = pickEnglish(engIds)
  if (!eng) return

  // --- 文レベルのベーススコア ---
  let base = 0
  const L = jpn.length
  // 日本語文長 8〜30 目安。範囲外はペナルティ。
  if (L < 8) base += (8 - L) * 0.5
  else if (L > 30) base += (L - 30) * 0.5
  else base += Math.abs(L - 15) * 0.1 // 範囲内は15字前後を軽く優先
  // 完全な文(句点で終わる)を優先
  if (!/。$/.test(jpn)) base += 2
  // ラテン文字・数字(固有名詞や記号の混入目安)が多い文を減点
  const latin = (jpn.match(LATIN_RE) || []).length
  base += latin * 0.5
  // 英訳の質を軽く反映
  const engComplete = /^[A-Z]/.test(eng) && /[.!?]["”')]?$/.test(eng)
  if (!engComplete) base += 1

  // --- この文に含まれる各見出し語について最良を更新 ---
  // 文中に実在する文字で始まる見出し語だけを候補にする(総当たり回避)。
  const chars = new Set(jpn)
  const candidates = []
  for (const c of chars) {
    const arr = byFirstChar.get(c)
    if (arr) for (const w of arr) candidates.push(w)
  }
  for (const word of candidates) {
    if (!jpn.includes(word)) continue
    const occ = countOccurrences(jpn, word)
    if (occ !== 1) continue // ちょうど1回のみ

    let s = base
    // 単漢字/かな1〜2字の見出しは他語への埋没リスクが高いので減点
    if (word.length === 1) {
      s += 3
      // 単字見出しは連続漢字列(=別の熟語)への埋没が最大の誤り源。
      // 出現位置の前後が漢字だと熟語の一部の可能性が高いので強く減点し、
      // 前後がかな/助詞/句読点で区切られた「単独語」らしい用例を優先する。
      const at = jpn.indexOf(word)
      const prev = at > 0 ? jpn[at - 1] : ''
      const next = at + 1 < jpn.length ? jpn[at + 1] : ''
      const isKanji = (c) => /[一-龯々]/.test(c)
      if (isKanji(prev)) s += 4
      if (isKanji(next)) s += 4
    } else if (word.length === 2) s += 0.5
    // 見出しが文全体を占める(例文になっていない)場合は強く減点
    if (jpn === word || jpn === word + '。') s += 6

    const cur = best.get(word)
    if (!cur || s < cur.score || (s === cur.score && L < cur.len)) {
      best.set(word, { score: s, len: L, jpn, eng })
    }
  }
})

// ---- 7. 出力 ----
const out = {}
for (const word of wordList.slice().sort()) {
  const b = best.get(word)
  if (!b) continue
  out[word] = {
    ex: `${b.jpn} — ${b.eng}`,
    blank: word,
  }
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1))

// ---- 統計 ----
const byLevel = new Map()
for (const [word, info] of words) {
  if (!byLevel.has(info.level)) byLevel.set(info.level, { total: 0, with: 0 })
  const s = byLevel.get(info.level)
  s.total++
  if (out[word]) s.with++
}
console.log('jpn sentences (with eng link) processed:', jpnProcessed)
console.log('target words:', words.size, '/ examples found:', Object.keys(out).length,
  `(${((Object.keys(out).length / words.size) * 100).toFixed(1)}%)`)
for (const lv of [...byLevel.keys()].sort()) {
  const s = byLevel.get(lv)
  console.log(`  level ${lv}: ${s.with}/${s.total} (${((s.with / s.total) * 100).toFixed(1)}%)`)
}
