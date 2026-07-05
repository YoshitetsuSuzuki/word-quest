// ============================================================================
// build-examples-english.mjs  英単語 例文生成 (Tatoeba CC-BY 2.0 FR)
//
// 目的: ワードバンクの各英単語に、人間が書いた自然な英日対訳例文を1つ付与する。
//   文の改変・自作は一切しない(Tatoeba の対訳ペアをそのまま採用)。
//
// 入力(.cache): https://downloads.tatoeba.org/exports/per_language/ から取得
//   eng_sentences.tsv   … id<TAB>eng<TAB>英文
//   jpn_sentences.tsv   … id<TAB>jpn<TAB>日本語文
//   eng-jpn_links.tsv   … 英文id<TAB>日本語文id (対訳リンク)
// 入力(public): wordbank/english/level-{1..7}.json … 対象単語の一覧(prompt から抽出)
//
// 出力: tools/examples.english.json … { word: "英文 — 日本語訳", ... }
//   例文が見つからない語は含めない(Question.example は任意フィールド)。
//   build-wordbank.mjs がこれを読み込み Question.example に設定する。
//
// マッチング:
//   見出し形 + 規則変化(三単現s/es・過去形ed・ing形・複数形) + 主要不規則変化
//   を単語境界つきで照合。あいまいな形(複数の見出し語から生成される形、
//   それ自体が別の見出し語である形)はマッチ対象から外す。
//   さらに、一般動詞の不規則過去形と同綴りの見出し語(saw/felt/left等)は
//   語義の取り違えを避けられないため例文を付与しない(ground等の名詞優勢語は除く)。
//
// 選定基準(スコアが小さいほど良い / 足切りあり):
//   - 完全な文であること: 大文字始まり・ .!? 終わり・ASCIIのみ
//   - 単語数 3〜14(理想は6語前後、12語超はペナルティ)
//   - 文中の大文字語(固有名詞)は1語ごとに大きなペナルティ
//   - 対訳の日本語が空でなく、ひらがなを含み、長すぎないこと
//   - EXT_BLOCKLIST(卑語)を含む文は除外、暗い語彙(kill等)は対象語自身の例文以外で減点
//   - 見出し形そのままのマッチを屈折形マッチより優先
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { EXT_BLOCKLIST } from './blocklist.english.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const wordbankDir = path.join(root, 'public', 'wordbank', 'english')
const outFile = path.join(root, 'tools', 'examples.english.json')

// ---- 1. 対象単語の読み込み(level JSON の prompt「word」から抽出) ----
const words = new Map() // word -> { verified, level }
for (let lv = 1; lv <= 7; lv++) {
  const items = JSON.parse(fs.readFileSync(path.join(wordbankDir, `level-${lv}.json`), 'utf8'))
  for (const q of items) {
    const m = q.prompt.match(/「(.+?)」/)
    if (m) words.set(m[1], { verified: q.verified, level: lv })
  }
}

// ---- 2-3. 屈折形ロジックは inflect.english.mjs へ共有化(build-example-forms.mjs と共用) ----
import { IRREGULAR_FORMS, inflections } from './inflect.english.mjs'

// ---- 4. 照合マップ構築: 形 -> 見出し語 ----
// あいまい排除:
//  (a) 形がそれ自体別の見出し語 → その見出し語のみに帰属(屈折マッチは捨てる)
//  (b) 形が複数の見出し語から生成される(car+ed / care+d → cared) → 全て捨てる
//  (c) 形がワードバンク外の超高頻度動詞(STOPWORDS系)の屈折形と同綴り
//      (doe+ing → doing = do+ing 等) → 捨てる
const AUX_FORMS = new Set()
for (const base of ['do', 'be', 'go', 'have', 'make', 'take', 'come', 'give', 'get', 'see', 'say', 'use', 'know', 'think', 'look', 'want', 'work', 'like']) {
  AUX_FORMS.add(base)
  for (const f of inflections(base)) AUX_FORMS.add(f)
}
for (const f of ['is', 'are', 'was', 'were', 'been', 'being', 'am', 'did', 'done', 'had', 'gone', 'went', 'made', 'took', 'taken', 'came', 'gave', 'given', 'got', 'gotten', 'saw', 'seen', 'said', 'knew', 'known', 'thought']) AUX_FORMS.add(f)

const formToWords = new Map()
for (const word of words.keys()) {
  if (!formToWords.has(word)) formToWords.set(word, new Set())
  formToWords.get(word).add(word) // 見出し形そのもの
  for (const f of inflections(word)) {
    if (words.has(f)) continue // (a) 別見出し語と同綴りの屈折形は帰属させない
    if (AUX_FORMS.has(f)) continue // (c) 超高頻度動詞の屈折形と同綴りの形は帰属させない
    if (!formToWords.has(f)) formToWords.set(f, new Set())
    formToWords.get(f).add(word)
  }
}
let ambiguousDropped = 0
for (const [form, set] of formToWords) {
  if (set.size > 1) {
    formToWords.delete(form) // (b)
    ambiguousDropped++
  }
}

// ---- 5. Tatoeba 読み込み ----
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

const engToJpnIds = new Map() // engId -> [jpnId...]
await loadTsv('eng-jpn_links.tsv', ([engId, jpnId]) => {
  if (!engToJpnIds.has(engId)) engToJpnIds.set(engId, [])
  engToJpnIds.get(engId).push(jpnId)
})

const neededJpn = new Set()
for (const ids of engToJpnIds.values()) for (const id of ids) neededJpn.add(id)
const jpnText = new Map()
await loadTsv('jpn_sentences.tsv', ([id, , text]) => {
  if (neededJpn.has(id) && text) jpnText.set(id, text.trim())
})

// ---- 6. 文の評価・単語ごとの最良文選定 ----
const DARK_WORDS = new Set([
  'kill', 'kills', 'killed', 'killing', 'die', 'dies', 'died', 'dying', 'dead',
  'death', 'murder', 'murdered', 'murderer', 'suicide', 'rape', 'raped', 'corpse',
])

function pickJapanese(jpnIds) {
  const candidates = []
  for (const id of jpnIds) {
    const t = jpnText.get(id)
    if (!t) continue
    if (!/[ぁ-ゖ]/.test(t)) continue // ひらがなを含まない対訳は不採用
    if (t.length < 3 || t.length > 54) continue
    candidates.push(t)
  }
  candidates.sort((a, b) => a.length - b.length)
  return candidates[0]
}

const best = new Map() // word -> { score, len, eng, jpn }
let processed = 0
await loadTsv('eng_sentences.tsv', ([id, , text]) => {
  const jpnIds = engToJpnIds.get(id)
  if (!jpnIds || !text) return
  const eng = text.trim()
  // --- 足切り: 完全な文であること ---
  if (!/^[A-Z]/.test(eng)) return
  if (!/[.!?]["”]?$/.test(eng)) return
  if (!/^[\x20-\x7E]+$/.test(eng)) return // ASCIIのみ(文字化け・非英語混入を除外)
  const tokens = eng.match(/[A-Za-z']+/g) ?? []
  if (tokens.length < 3 || tokens.length > 14) return
  const lower = tokens.map((t) => t.toLowerCase())
  for (const t of lower) if (EXT_BLOCKLIST.has(t)) return // 卑語を含む文は除外
  const jpn = pickJapanese(jpnIds)
  if (!jpn) return

  // --- ベーススコア(小さいほど良い) ---
  let score = Math.abs(tokens.length - 6)
  if (tokens.length > 12) score += 8
  let caps = 0
  for (let i = 1; i < tokens.length; i++) if (/^[A-Z]/.test(tokens[i]) && tokens[i] !== 'I') caps++
  score += caps * 4 // 固有名詞だらけの文を避ける
  if (!/\.["”]?$/.test(eng)) score += 1 // 平叙文を軽く優先
  if (jpn.length > 30) score += 1
  if (jpn.length > 45) score += 1
  const hasDark = lower.some((t) => DARK_WORDS.has(t))

  // --- マッチした各見出し語の最良文を更新 ---
  const seen = new Set()
  for (const t of lower) {
    if (seen.has(t)) continue
    seen.add(t)
    const targets = formToWords.get(t)
    if (!targets) continue
    for (const word of targets) {
      if (IRREGULAR_FORMS.has(word)) continue // saw/felt/left 等は語義取り違えリスクのため付与しない
      let s = score
      if (t !== word) s += 1.5 // 見出し形そのままを優先
      if (hasDark && !DARK_WORDS.has(word)) s += 3 // 暗い文は対象語自身の例文以外で減点
      const cur = best.get(word)
      if (!cur || s < cur.score || (s === cur.score && eng.length < cur.len)) {
        best.set(word, { score: s, len: eng.length, eng, jpn })
      }
    }
  }
  processed++
})

// ---- 7. 出力 ----
const out = {}
for (const word of [...words.keys()].sort()) {
  const b = best.get(word)
  if (b) out[word] = `${b.eng} — ${b.jpn}`
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1))

// ---- 統計 ----
const byLevel = new Map()
for (const [word, info] of words) {
  if (!info.verified) continue
  if (!byLevel.has(info.level)) byLevel.set(info.level, { total: 0, with: 0 })
  const s = byLevel.get(info.level)
  s.total++
  if (out[word]) s.with++
}
console.log('eng-jpn linked sentences processed:', processed)
console.log('ambiguous forms dropped:', ambiguousDropped)
console.log('words in wordbank:', words.size, '/ examples found:', Object.keys(out).length)
let vt = 0, vw = 0
for (const lv of [...byLevel.keys()].sort()) {
  const s = byLevel.get(lv)
  vt += s.total
  vw += s.with
  console.log(`  level ${lv} (verified): ${s.with}/${s.total} (${((s.with / s.total) * 100).toFixed(1)}%)`)
}
console.log(`verified total: ${vw}/${vt} (${((vw / vt) * 100).toFixed(1)}%)`)
