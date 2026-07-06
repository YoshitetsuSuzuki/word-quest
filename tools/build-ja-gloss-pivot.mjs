// ============================================================================
// build-ja-gloss-pivot.mjs  西/仏/独 → 日本語グロス（ピボット + 独立検証）
//
// 日本語話者が西/仏/独を学べるように、日本語訳を生成する。
// X→日本語の権威あるオープン辞書が無いため、辞書検証済みの英語グロスを
// 橋渡し(ピボット)にして日本語訳を確定する。
//   X ─(検証済み英訳)→ E ─(EJDict 英日)→ 日本語候補 J ─(JMdict 日英でEに戻る)→ 確認
// 「EJDictが E→J」かつ「JMdictでの J の第一義(主要訳)= E」の語だけ採用する。
// 単なる双方向一致(Eが J の何番目かの語義に含まれる)では周辺義を拾うため
// (good→おいしい, house→議院 等)、「E と J が互いに主要訳」であることを要求する。
// EJDict の語義優先順(先頭=中心義)で最初に条件を満たす J を選ぶ。一致無しは非出荷。
//
// 入力: tools/gloss.en.{spanish,french,german}.json
//       .cache/ejdict-all.txt / .cache/jmdict-eng-common-3.6.2.json
// 出力: tools/gloss.ja.{spanish,french,german}.json
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const toolsDir = path.join(root, 'tools')
const LANGS = ['spanish', 'french', 'german']

function normEng(e) {
  if (typeof e !== 'string') return ''
  let g = e.toLowerCase().trim()
  // 語に密着した括弧は複合語の一部なので中身を残す: "good(-tasting)" -> "good-tasting"
  // (単純除去すると別義 "good" に化けて誤マッチする)
  g = g.replace(/([^\s(])\(([^)]*)\)/g, '$1$2')
  // 空白区切りの括弧(注記)は除去: "run (informal)" -> "run"
  g = g.replace(/\([^)]*\)/g, ' ')
  g = g.replace(/^to\s+/, '')
  g = g.replace(/^(a|an|the)\s+/, '')
  g = g.replace(/[.;:,!?]+$/, '')
  g = g.replace(/\s+/g, ' ').trim()
  return g
}

const HAS_JP = /[぀-ヿ㐀-鿿豈-﫿]/

function loadEjdict() {
  const raw = fs.readFileSync(path.join(cacheDir, 'ejdict-all.txt'), 'utf8')
  const map = new Map()
  for (const line of raw.split('\n')) {
    const t = line.indexOf('\t')
    if (t < 0) continue
    const key = normEng(line.slice(0, t))
    if (!key) continue
    if (!map.has(key)) map.set(key, line.slice(t + 1))
  }
  return map
}

function ejJapaneseTerms(def) {
  if (!def) return []
  const terms = []
  for (let sp of def.split(/\s*\/\s*/)) {
    sp = sp.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '')
      .replace(/（[^）]*）/g, '').replace(/《[^》]*》/g, '')
      .replace(/〈[^〉]*〉/g, '').replace(/【[^】]*】/g, '')
    for (let t of sp.split(/[、，,；;・]/)) {
      t = t.trim().replace(/^[～…〜\s]+/, '').replace(/[～…〜\s]+$/, '').trim()
      if (!t) continue
      if (/[A-Za-z0-9]/.test(t)) continue
      if (!HAS_JP.test(t)) continue
      if (t.length > 12) continue
      if (!terms.includes(t)) terms.push(t)
    }
  }
  return terms
}

// JMdict 逆引き: 日本語見出し -> { all: Set<英語全語義>, primary: Set<各エントリの第一義> }
// primary は「その日本語語の主要な意味」。E が primary に入る = J の中心義が E。
function loadJmdictReverse() {
  const jm = JSON.parse(fs.readFileSync(path.join(cacheDir, 'jmdict-eng-common-3.6.2.json'), 'utf8'))
  const rev = new Map()
  const ensure = (key) => {
    if (!rev.has(key)) rev.set(key, { all: new Set(), primary: new Set() })
    return rev.get(key)
  }
  for (const w of jm.words) {
    const engsOrdered = []
    for (const s of w.sense || []) {
      for (const g of s.gloss || []) {
        if (g.lang && g.lang !== 'eng') continue
        if (typeof g.text === 'string' && g.text) engsOrdered.push(normEng(g.text))
      }
    }
    if (!engsOrdered.length) continue
    const primary = engsOrdered[0] // 辞書上の第一義=主要義
    const heads = [...(w.kanji || []).map((k) => k.text), ...(w.kana || []).map((k) => k.text)]
    for (const k of heads) {
      if (!k) continue
      const rec = ensure(k)
      for (const e of engsOrdered) rec.all.add(e)
      rec.primary.add(primary)
    }
  }
  return rev
}

function main() {
  const ej = loadEjdict()
  const jmRev = loadJmdictReverse()
  console.log('EJDict見出し:', ej.size, ' / JMdict逆引き見出し:', jmRev.size)
  for (const lang of LANGS) {
    const glossEn = JSON.parse(fs.readFileSync(path.join(toolsDir, `gloss.en.${lang}.json`), 'utf8'))
    const words = Object.keys(glossEn)
    const out = {}
    let noEj = 0, noConfirm = 0
    const samples = []
    for (const w of words) {
      const nE = normEng(glossEn[w])
      if (!nE) { noConfirm++; continue }
      const def = ej.get(nE)
      if (!def) { noEj++; continue }
      let picked = null
      for (const J of ejJapaneseTerms(def)) {
        const rev = jmRev.get(J)
        // JMdict で J の第一義(主要訳)が E であること = E と J が互いに中心義
        if (rev && rev.primary.has(nE)) { picked = J; break }
      }
      if (!picked) { noConfirm++; continue }
      out[w] = picked
      if (samples.length < 12) samples.push(`${w}->${glossEn[w]}->${picked}`)
    }
    fs.writeFileSync(path.join(toolsDir, `gloss.ja.${lang}.json`), JSON.stringify(out, null, 2) + '\n')
    const kept = Object.keys(out).length
    console.log(`\n=== ${lang} ===`)
    console.log(`  総語 ${words.length} / 採用(双方向一致) ${kept} (${(kept / words.length * 100).toFixed(1)}%)`)
    console.log(`  EJ辞書なし ${noEj} / 検証不一致 ${noConfirm}`)
    console.log('  例: ' + samples.join(', '))
  }
}
main()
