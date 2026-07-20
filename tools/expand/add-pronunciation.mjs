// ============================================================================
// add-pronunciation.mjs  新規語に発音表記を付与（①一貫性の回復）
//
//   Wiktextract(kaikki)のIPAから、既存150語と同じ「ローマ字＋強勢大文字」表記を生成する。
//   IPAは母音弱化・語末無声化を既に反映しているため、既存方式(вода→vadA)と情報が一致する。
//   IPAが無い語は付与しない（推測しない）。
//
//   出力: public/wordbank/<lang>/level-*.json を直接更新（pronunciation を追加するのみ）
//   --dry で書き込まず統計だけ表示。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const rawDir = path.join(root, 'tools', 'dictionary-audit', 'data', 'raw')
const DRY = process.argv.includes('--dry')

const LANGS = [
  { key: 'russian', dict: 'kaikki-russian-full.jsonl', code: 'ru' },
  { key: 'polish', dict: 'kaikki-polish-full.jsonl', code: 'pl' },
  { key: 'portuguese', dict: 'kaikki-portuguese-full.jsonl', code: 'pt' },
  { key: 'spanish', dict: 'kaikki-spanish-full.jsonl', code: 'es' },
  { key: 'french', dict: 'kaikki-french-full.jsonl', code: 'fr' },
  { key: 'german', dict: 'kaikki-german-full.jsonl', code: 'de' },
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

/**
 * IPA → ラテン文字の読み。強勢(ˈ)の直後の音節の母音を大文字にする。
 * 既存150語の表記(vadA / zdrAstvuyte / hlep)と揃える方針。
 */
const IPA_MAP = [
  // 2文字以上を先に置換
  ['t͡ɕ', 'ch'], ['d͡ʑ', 'j'], ['t͡s', 'ts'], ['d͡z', 'dz'], ['t͡ʃ', 'ch'], ['d͡ʒ', 'j'],
  ['ʂ', 'sh'], ['ʐ', 'zh'], ['ɕ', 'sh'], ['ʑ', 'zh'], ['ʃ', 'sh'], ['ʒ', 'zh'],
  ['x', 'h'], ['ɣ', 'g'], ['ɲ', 'ny'], ['ŋ', 'ng'], ['ɱ', 'm'],
  ['ɾ', 'r'], ['ʁ', 'r'], ['ʀ', 'r'], ['r', 'r'],
  ['ɫ', 'l'], ['ʎ', 'ly'], ['w', 'w'], ['ʋ', 'v'], ['β', 'v'],
  ['ɐ', 'a'], ['ə', 'a'], ['ɨ', 'y'], ['ɪ', 'i'], ['ʊ', 'u'],
  ['ɛ', 'e'], ['ɔ', 'o'], ['ɑ', 'a'], ['æ', 'a'], ['ø', 'e'], ['œ', 'e'],
  ['ɡ', 'g'], ['ç', 'h'], ['θ', 'th'], ['ð', 'd'], ['ɸ', 'f'],
  ['j', 'y'], ['ʝ', 'y'],
  // ポルトガル語の鼻母音は綴り上も意味の区別に関わるため n を添えて明示する
  // (sim→sin, não→nawn のように鼻音性を落とさない)
  ['ẽ', 'en'], ['ã', 'an'], ['õ', 'on'], ['ĩ', 'in'], ['ũ', 'un'],
]

function ipaToRoman(ipaRaw) {
  let s = String(ipaRaw || '').trim()
  if (!s) return ''
  // 1エントリに複数表記が併記されることがある (例: "/ˈɡɾaθjas/ [ˈɡɾa.θjas]")。
  // そのまま処理すると連結されて壊れる(grAthyasgrathyas)ため、最初の1つだけ使う。
  const first = s.match(/\/([^/]+)\/|\[([^\]]+)\]/)
  if (first) s = first[1] ?? first[2] ?? s
  s = s.replace(/^[\/\[]|[\/\]]$/g, '') // 前後の / [ ] を除去
  if (!s) return ''
  // 鼻音化記号(結合波ダッシュ)が付いた母音・半母音を、鼻音付きの合成文字に寄せる。
  // 例: ɐ̃w̃ → ãwn（ポルトガル語 não の -ão）。落とすと sim/não が sI/nA になり区別が消える。
  s = s.normalize('NFD').replace(/([aeiouɐəɛɔɨɪʊwj])̃/g, (_, v) => {
    const nasal = { a: 'ã', e: 'ẽ', i: 'ĩ', o: 'õ', u: 'ũ', ɐ: 'ã', ə: 'ã', ɛ: 'ẽ', ɔ: 'õ', ɨ: 'ĩ', ɪ: 'ĩ', ʊ: 'ũ' }
    return nasal[v] || v + 'n'
  })
  s = s.normalize('NFC')

  // 音節を強勢マークで分割し、強勢音節を記録する
  // ˈ=第1強勢, ˌ=第2強勢, .=音節境界
  const primary = s.indexOf('ˈ')
  s = s.replace(/ˌ/g, '') // 第2強勢は表記しない

  // 強勢位置より後ろの最初の母音を大文字化するため、まず変換してから処理する
  const marker = ''
  s = s.replace(/ˈ/g, marker)
  s = s.replace(/[.‿ ]/g, '')

  let out = ''
  let i = 0
  outer: while (i < s.length) {
    if (s[i] === marker) { out += marker; i++; continue }
    for (const [from, to] of IPA_MAP) {
      if (s.startsWith(from, i)) { out += to; i += from.length; continue outer }
    }
    const ch = s[i]
    // 長音記号・軟音記号・声門閉鎖など、表記に不要な記号は落とす
    if ('ːʲʰ̪̥̬͡ʼˑ̯'.includes(ch)) { i++; continue }
    if (/[a-z]/i.test(ch)) out += ch
    i++
  }

  // 強勢マーカーの直後にある最初の母音を大文字にする
  const mi = out.indexOf(marker)
  if (mi >= 0) {
    const before = out.slice(0, mi)
    let after = out.slice(mi + 1)
    const vi = after.search(/[aeiouy]/i)
    if (vi >= 0) after = after.slice(0, vi) + after[vi].toUpperCase() + after.slice(vi + 1)
    out = before + after
  }
  out = out.replace(new RegExp(marker, 'g'), '')
  if (primary < 0) out = out.toLowerCase()
  // 鼻音 n の連続・重複を整理(nAnwn → nAwn のように読みやすくする)
  out = out.replace(/n(?=[wy])/gi, '').replace(/nn+/gi, 'n')
  return out.trim()
}

// ---- 辞書からIPAを引く ----
function loadIpa(file, code) {
  const map = new Map()
  for (const line of readLines(path.join(rawDir, file))) {
    if (!line) continue
    let e
    try { e = JSON.parse(line) } catch { continue }
    if (e.lang_code !== code || !e.word) continue
    if (map.has(e.word)) continue
    const s = (e.sounds || []).find((x) => x.ipa)
    if (s?.ipa) map.set(e.word, s.ipa)
  }
  return map
}

const report = []
for (const L of LANGS) {
  const dictPath = path.join(rawDir, L.dict)
  if (!fs.existsSync(dictPath)) { console.log(`skip ${L.key}: 辞書なし`); continue }
  const ipaMap = loadIpa(L.dict, L.code)
  const wbDir = path.join(root, 'public', 'wordbank', L.key)
  const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))

  let added = 0, already = 0, noIpa = 0, total = 0
  const samples = []
  for (const lv of man.levels) {
    const p = path.join(wbDir, lv.file)
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'))
    for (const e of arr) {
      total++
      if (e.pronunciation) { already++; continue }
      const w = String(e.prompt || '').replace(/[「」]|の意味は？/g, '')
      const ipa = ipaMap.get(w)
      if (!ipa) { noIpa++; continue }
      const rom = ipaToRoman(ipa)
      if (!rom || rom.length > 24) { noIpa++; continue }
      e.pronunciation = rom
      added++
      if (samples.length < 6) samples.push(`${w} [${ipa}] → ${rom}`)
    }
    if (!DRY) fs.writeFileSync(p, JSON.stringify(arr))
  }
  report.push({ lang: L.key, total, already, added, noIpa })
  console.log(`--- ${L.key} 例 ---`)
  samples.forEach((s) => console.log('   ', s))
}
console.log(DRY ? '=== DRY RUN ===' : '=== 付与しました ===')
for (const r of report) console.log(JSON.stringify(r))
