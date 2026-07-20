// ============================================================================
// build-examples.mjs  pt/ru/pl に例文を付与（③例文＝誤り検出網にもなる）
//
//   Tatoeba(CC-BY 2.0 FR)の実文のみを使う。文の自作・改変は一切しない。
//   対訳は「対象言語 → 日本語」を第一候補、無ければ「対象言語 → 英語」も許容し、
//   日本語訳が取れた文だけを出荷する（ja ロケールで訳が空だと学習にならないため）。
//
//   選定基準: 短く(3〜12語)・対象語をちょうど1回含む・固有名詞や記号が少ない文。
//   出力: public/wordbank/<lang>/level-*.json に example / exampleForm /
//         exampleTranslations を追加（既存データは壊さない）
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const tDir = path.join(root, '.cache', 'tatoeba')
const DRY = process.argv.includes('--dry')

const LANGS = [
  { key: 'portuguese', code: 'por' },
  { key: 'russian', code: 'rus' },
  { key: 'polish', code: 'pol' },
]

function* readLines(filePath) {
  const fd = fs.openSync(filePath, 'r')
  const buf = Buffer.alloc(1 << 20)
  let rest = ''
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, buf.length, null)
      if (n <= 0) break
      const chunk = rest + buf.toString('utf8', 0, n)
      const parts = chunk.split('\n')
      rest = parts.pop() ?? ''
      for (const p of parts) yield p
    }
    if (rest) yield rest
  } finally {
    fs.closeSync(fd)
  }
}

/** id -> text（指定言語の文をすべて読み込む） */
function loadSentences(code) {
  const map = new Map()
  const p = path.join(tDir, `${code}_sentences.tsv`)
  if (!fs.existsSync(p)) return map
  for (const line of readLines(p)) {
    if (!line) continue
    const t = line.split('\t')
    if (t.length < 3) continue
    map.set(t[0], t[2])
  }
  return map
}

/** 対訳リンク: 対象言語の文id -> [相手言語の文id] */
function loadLinks(idSetA, idSetB) {
  const map = new Map()
  const p = path.join(tDir, 'links.csv')
  for (const line of readLines(p)) {
    if (!line) continue
    const t = line.split('\t')
    if (t.length < 2) continue
    const [a, b] = t
    if (idSetA.has(a) && idSetB.has(b)) {
      if (!map.has(a)) map.set(a, [])
      map.get(a).push(b)
    }
  }
  return map
}

/**
 * 文が学習例文としてふさわしいか。
 * 厳しすぎるとカバレッジが落ちるため、学習の妨げになる要素(引用符・記号・数字の羅列)
 * だけを弾き、長さは 3〜16語まで許容する。
 */
function goodSentence(s) {
  if (!s) return false
  const len = s.trim().split(/\s+/).length
  if (len < 3 || len > 16) return false
  if (/[«»"“”\[\]{}<>@#$%^*_=|\\/]/.test(s)) return false
  if (/\d{2,}/.test(s)) return false // 年号や番号の羅列は避ける(1桁の数は許容)
  // ダッシュを含む文は除外する。example は "原文 — 和訳" 形式で、アプリ側は
  // 最初の " — " で分割するため、原文内のダッシュ(露: Том — человек)があると
  // 和訳が途中で切れて壊れる。
  if (/[—–]/.test(s)) return false
  return true
}

const report = []
for (const L of LANGS) {
  const src = loadSentences(L.code)
  if (!src.size) { console.log(`skip ${L.key}: Tatoeba未取得`); continue }
  const jpn = loadSentences('jpn')
  const srcIds = new Set(src.keys())
  const jpnIds = new Set(jpn.keys())
  const links = loadLinks(srcIds, jpnIds)

  // 対象語 -> 使える(原文, 日本語訳) の候補を作る
  const byWord = new Map()
  for (const [id, text] of src) {
    if (!goodSentence(text)) continue
    const tr = links.get(id)
    if (!tr || !tr.length) continue
    const ja = jpn.get(tr[0])
    if (!ja) continue
    // 文中の単語を小文字化して索引（対象語がちょうど1回のものだけ後で採用）
    const words = text.toLowerCase().replace(/[.,!?;:—–-]/g, ' ').split(/\s+/).filter(Boolean)
    const seen = new Set()
    for (const w of words) {
      if (seen.has(w)) continue
      seen.add(w)
      if (!byWord.has(w)) byWord.set(w, [])
      // 短い文を優先したいので多めに保持してから後段で選ぶ
      if (byWord.get(w).length < 120) byWord.get(w).push({ text, ja, words })
    }
  }

  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  let added = 0, total = 0, already = 0
  const samples = []
  for (const lv of man.levels) {
    const p = path.join(wbDir, lv.file)
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const e of arr) {
      total++
      if (e.example) { already++; continue }
      const word = String(e.prompt || '').replace(/[「」]|の意味は？/g, '').toLowerCase()
      const cands = byWord.get(word)
      if (!cands || !cands.length) continue
      // 対象語をちょうど1回だけ含む文の中から、最も短いものを選ぶ
      // (穴埋めの一意性を保ちつつ、短い文の方が学習効果が高い)
      const ok = cands.filter((c) => c.words.filter((w) => w === word).length === 1)
      if (!ok.length) continue
      const pick = ok.reduce((a, b) => (b.words.length < a.words.length ? b : a))
      e.example = `${pick.text} — ${pick.ja}`
      e.exampleForm = word
      added++
      if (samples.length < 4) samples.push(`${word}: ${pick.text} — ${pick.ja}`)
    }
    if (!DRY) fs.writeFileSync(p, JSON.stringify(arr))
  }
  report.push({ lang: L.key, 総語数: total, 既存例文: already, 付与: added, カバレッジ: Math.round((added / total) * 100) + '%' })
  console.log(`--- ${L.key} 例 ---`)
  samples.forEach((s) => console.log('   ', s))
}
console.log(DRY ? '=== DRY RUN ===' : '=== 付与しました ===')
for (const r of report) console.log(JSON.stringify(r))
