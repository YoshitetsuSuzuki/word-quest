// ============================================================================
// merge-verified.mjs  検証結果を統合し、機械検査を通してワードバンクへ反映(第5段階)
//
//   入力: tools/expand/candidates.<lang>.json（候補）
//         tools/expand/verified/<lang>-NN.json（エージェント判定 keep/fix/drop）
//   検査: 漏れ/未知語/日本語訳の重複/空訳/既存語との衝突/4択生成の妥当性
//   出力: public/wordbank/<lang>/level-{1,2,3}.json + manifest.json（既存150語は温存）
//
//   --dry を付けると書き込まず検査結果だけ表示する。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const expandDir = path.join(root, 'tools', 'expand')
const DRY = process.argv.includes('--dry')

const LANGS = [
  { key: 'portuguese', prefix: 'pt' },
  { key: 'russian', prefix: 'ru' },
  { key: 'polish', prefix: 'pl' },
]

const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

/**
 * 頻度順位からレベル(1..3)を決める。既存150語と同じ3段階に揃える。
 * 固定閾値だと言語ごとの頻度分布差でLv3に偏るため、採用語の三分位で均等に割る。
 */
function makeLevelOf(ranks) {
  const sorted = [...ranks].sort((a, b) => a - b)
  const t1 = sorted[Math.floor(sorted.length / 3)] ?? Infinity
  const t2 = sorted[Math.floor((sorted.length * 2) / 3)] ?? Infinity
  return (rank) => (rank <= t1 ? 1 : rank <= t2 ? 2 : 3)
}

const report = []

for (const L of LANGS) {
  const candPath = path.join(expandDir, `candidates.${L.key}.json`)
  if (!fs.existsSync(candPath)) { console.log(`skip ${L.key}: 候補なし`); continue }
  const cands = JSON.parse(fs.readFileSync(candPath, 'utf8'))
  const byWord = new Map(cands.map((c) => [c.word, c]))

  // --- 検証結果を集める ---
  const vDir = path.join(expandDir, 'verified')
  const files = fs.existsSync(vDir) ? fs.readdirSync(vDir).filter((f) => f.startsWith(L.key + '-') && f.endsWith('.json')) : []
  const verdicts = new Map()
  let dup = 0
  for (const f of files) {
    let arr
    try { arr = JSON.parse(fs.readFileSync(path.join(vDir, f), 'utf8')) } catch (e) { console.log(`  ! 読込失敗 ${f}: ${e.message}`); continue }
    for (const v of arr) {
      if (!v || !v.word) continue
      if (verdicts.has(v.word)) { dup++; continue }
      verdicts.set(v.word, v)
    }
  }

  // --- 検査: 判定漏れ / 未知語 ---
  const missing = cands.filter((c) => !verdicts.has(c.word)).map((c) => c.word)
  const unknown = [...verdicts.keys()].filter((w) => !byWord.has(w))

  // --- 第4段階(独立監査)の指摘を読む: suggest=null は削除、文字列なら訳を差し替え ---
  const aDir = path.join(expandDir, 'audit-result')
  const audit = new Map()
  if (fs.existsSync(aDir)) {
    for (const f of fs.readdirSync(aDir).filter((f) => f.startsWith(L.key + '-') && f.endsWith('.json'))) {
      let arr
      try { arr = JSON.parse(fs.readFileSync(path.join(aDir, f), 'utf8')) } catch (e) { console.log(`  ! 監査読込失敗 ${f}: ${e.message}`); continue }
      for (const a of arr) if (a && a.word && !audit.has(a.word)) audit.set(a.word, a)
    }
  }

  // --- 採用語を組み立て ---
  const accepted = []
  let auditDropped = 0
  let auditFixed = 0
  for (const c of cands) {
    const v = verdicts.get(c.word)
    if (!v) continue // 判定漏れは採用しない(安全側)
    if (v.verdict === 'drop') continue
    let ja = c.ja
    if (v.verdict === 'fix') {
      if (!v.ja || !HAS_JP.test(v.ja)) continue // 修正指示が不正なら不採用
      ja = String(v.ja).trim()
    }
    // 独立監査の指摘を最優先で適用(監査が最終防衛線)
    const a = audit.get(c.word)
    if (a) {
      if (a.suggest == null) { auditDropped++; continue } // 削除指摘
      if (HAS_JP.test(String(a.suggest))) { ja = String(a.suggest).trim(); auditFixed++ }
    }
    if (!ja || !HAS_JP.test(ja)) continue
    if (ja.length > 14) continue
    accepted.push({ ...c, ja })
  }

  // --- 既存ワードバンクを読む(温存する) ---
  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))
  const existingByLevel = new Map()
  const existingWords = new Set()
  const existingJa = new Set()
  const existingEn = new Set()
  let maxIdNum = 0
  for (const lv of man.levels) {
    const arr = JSON.parse(fs.readFileSync(path.join(wbDir, lv.file), 'utf8'))
    existingByLevel.set(lv.level, arr)
    for (const e of arr) {
      existingWords.add(String(e.prompt || '').replace(/[「」]|の意味は？/g, ''))
      const ja = e.glosses?.ja
      if (ja) existingJa.add(ja)
      if (e.answer) existingEn.add(e.answer)
      const n = Number(String(e.id).split('-')[1])
      if (Number.isFinite(n)) maxIdNum = Math.max(maxIdNum, n)
    }
  }

  // --- 衝突排除(既存語・既存訳・新規内の重複) ---
  const seenJa = new Set(existingJa)
  const seenWord = new Set(existingWords)
  const final = []
  const collisions = []
  for (const a of accepted) {
    if (seenWord.has(a.word)) { collisions.push(`語重複:${a.word}`); continue }
    if (seenJa.has(a.ja)) { collisions.push(`訳重複:${a.word}=${a.ja}`); continue }
    seenWord.add(a.word)
    seenJa.add(a.ja)
    final.push(a)
  }

  // --- レベル別に採番して追記(採用語の三分位でレベルを決める) ---
  const levelOf = makeLevelOf(final.map((f) => f.rank))
  const added = { 1: 0, 2: 0, 3: 0 }
  let idNum = maxIdNum
  // ピボット言語(答え=英語)なので、既存150語と同じく choices は「英語」で作る。
  // 日本語で作ると ja ロケール以外で選択肢が言語混在し、既存データとも不整合になる。
  const allEnPool = [...new Set([...existingEn, ...final.map((f) => f.en)])]
  for (const a of final) {
    const lvl = levelOf(a.rank)
    idNum++
    // ダミー3つ(英語グロスから・重複なし)
    const distractors = []
    const pool = allEnPool.filter((x) => x !== a.en)
    while (distractors.length < 3 && pool.length) {
      const i = Math.floor(((idNum * 2654435761 + distractors.length * 40503) >>> 0) % pool.length)
      const pick = pool.splice(i, 1)[0]
      if (pick && !distractors.includes(pick)) distractors.push(pick)
    }
    if (distractors.length < 3) continue // 4択が作れないなら不採用
    const choices = [a.en, ...distractors]
    // 決定的シャッフル
    for (let i = choices.length - 1; i > 0; i--) {
      const j = ((idNum * 31 + i * 17) >>> 0) % (i + 1)
      ;[choices[i], choices[j]] = [choices[j], choices[i]]
    }
    const entry = {
      id: `${L.prefix}-${String(idNum).padStart(5, '0')}`,
      category: L.key,
      prompt: `「${a.word}」の意味は？`,
      answer: a.en,
      glosses: { en: a.en, ja: a.ja },
      choices,
      difficulty: lvl,
      tags: ['word'],
      verified: true,
    }
    const arr = existingByLevel.get(lvl) || []
    arr.push(entry)
    existingByLevel.set(lvl, arr)
    added[lvl]++
  }

  // --- 出力 ---
  const totalAfter = [...existingByLevel.values()].reduce((s, a) => s + a.length, 0)
  report.push({
    lang: L.key,
    候補: cands.length,
    判定済: verdicts.size,
    判定漏れ: missing.length,
    未知語: unknown.length,
    重複判定: dup,
    監査指摘: audit.size,
    監査で削除: auditDropped,
    監査で修正: auditFixed,
    採用: final.length,
    衝突除外: collisions.length,
    追加: added,
    合計: totalAfter,
  })

  if (!DRY) {
    const levels = []
    for (const [lvl, arr] of [...existingByLevel.entries()].sort((a, b) => a[0] - b[0])) {
      const file = `level-${lvl}.json`
      fs.writeFileSync(path.join(wbDir, file), JSON.stringify(arr))
      levels.push({ level: lvl, file, count: arr.length })
    }
    fs.writeFileSync(path.join(wbDir, 'manifest.json'), JSON.stringify({ ...man, levels }, null, 2))
  }
}

console.log(DRY ? '=== DRY RUN(書き込みなし) ===' : '=== 反映しました ===')
for (const r of report) console.log(JSON.stringify(r, null, 1))
