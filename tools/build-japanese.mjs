// ============================================================================
// build-japanese.mjs  日本語ワードバンク生成（JLPT N5）
//
// 入力(.cache):
//   jlpt-n5.json                     … JLPT N5 語彙 [{ word, kana, level:1 }]
//                                       出典: jamsinclair/open-anki-jlpt-decks (MIT)
//   jmdict-eng-common-3.6.2.json     … JMdict (JP→EN) common。data.words[]
//                                       出典: EDRDG JMdict (CC BY-SA 4.0)
// 入力(tools):
//   gloss.en.japanese.json           … 人手確定版の英語グロス { 見出し: "english" }（任意）
// 出力:
//   tools/gloss.en.japanese.candidates.json   … JMdictから抽出した英語gloss候補
//   public/wordbank/japanese/level-{1..5}.json, manifest.json
//
// 英訳の確定は次タスク。確定版(gloss.en.japanese.json)が無ければ wordbank は 0 語で出力。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const toolsDir = path.join(root, 'tools')
const outDir = path.join(root, 'public', 'wordbank', 'japanese')

// ---------------------------------------------------------------------------
// 1. JLPT 語彙（N5=level1 … N1=level5）。存在するリストだけ読む。
//    同一表記が複数級に出たら、易しい級(先に読む方)を優先して重複除去。
// ---------------------------------------------------------------------------
const JLPT_FILES = [
  { file: 'jlpt-n5.json', level: 1 },
  { file: 'jlpt-n4.json', level: 2 },
  { file: 'jlpt-n3.json', level: 3 },
  { file: 'jlpt-n2.json', level: 4 },
  { file: 'jlpt-n1.json', level: 5 },
]
const jlpt = []
const seenWord = new Set()
for (const { file, level } of JLPT_FILES) {
  const p = path.join(cacheDir, file)
  if (!fs.existsSync(p)) continue
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
  for (const e of raw) {
    const kana = (e.kana || '').trim()
    const word = (e.word || '').trim() || kana // 表記が無ければ かな
    if (!word || seenWord.has(word)) continue
    seenWord.add(word)
    jlpt.push({ word, kana, level })
  }
}

// ---------------------------------------------------------------------------
// 2. JMdict 索引（表記→gloss / かな→gloss）。sense先頭優先。
// ---------------------------------------------------------------------------
const jmdict = JSON.parse(fs.readFileSync(path.join(cacheDir, 'jmdict-eng-common-3.6.2.json'), 'utf8'))
const byKanji = new Map() // text -> { glosses:[...], pos:[...] }
const byKana = new Map()

function addEntry(map, key, glosses, pos) {
  if (!key) return
  if (!map.has(key)) map.set(key, { glosses: [], pos: [] })
  const rec = map.get(key)
  rec.glosses.push(...glosses)
  rec.pos.push(...pos)
}

for (const w of jmdict.words) {
  // senseは重要度順（先頭優先）。gloss(英語)を順に連結。
  const glosses = []
  const pos = []
  for (const s of w.sense) {
    for (const g of s.gloss || []) {
      if (g.lang && g.lang !== 'eng') continue
      if (typeof g.text === 'string' && g.text) glosses.push(g.text)
    }
    for (const p of s.partOfSpeech || []) pos.push(p)
  }
  for (const k of w.kanji || []) addEntry(byKanji, k.text, glosses, pos)
  for (const k of w.kana || []) addEntry(byKana, k.text, glosses, pos)
}

// ---------------------------------------------------------------------------
// 3. JLPT語をJMdict照合 → 英語gloss候補（先頭sense中心に最大4件、重複除去）
// ---------------------------------------------------------------------------
function lookup(word, kana) {
  // 表記優先、無ければかな
  if (byKanji.has(word)) return byKanji.get(word)
  if (byKana.has(word)) return byKana.get(word)
  if (byKana.has(kana)) return byKana.get(kana)
  return null
}

function dedupeMax(arr, max) {
  const seen = new Set()
  const out = []
  for (const x of arr) {
    if (seen.has(x)) continue
    seen.add(x)
    out.push(x)
    if (out.length >= max) break
  }
  return out
}

const candidates = {} // 見出し -> { kana, cand:[...], pick }
const noJmdict = [] // JMdictに無い語
const posByHeadword = {} // 見出し -> 先頭品詞（wordbank tags用）

for (const e of jlpt) {
  const rec = lookup(e.word, e.kana)
  if (!rec || rec.glosses.length === 0) {
    noJmdict.push(e.word)
    continue
  }
  const cand = dedupeMax(rec.glosses, 4)
  candidates[e.word] = { kana: e.kana, cand, pick: cand[0] }
  posByHeadword[e.word] = rec.pos[0] || ''
}

fs.writeFileSync(
  path.join(toolsDir, 'gloss.en.japanese.candidates.json'),
  JSON.stringify(candidates, null, 2),
)

// ---------------------------------------------------------------------------
// 4. かな→ヘボン式ローマ字変換
// ---------------------------------------------------------------------------
// カタカナ→ひらがな正規化
function kataToHira(s) {
  let out = ''
  for (const ch of s) {
    const code = ch.codePointAt(0)
    // カタカナ(0x30A1-0x30F6) → ひらがな(-0x60)。長音符ー(0x30FC)はそのまま。
    if (code >= 0x30a1 && code <= 0x30f6) out += String.fromCodePoint(code - 0x60)
    else out += ch
  }
  return out
}

const ROMA = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o',
  か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so',
  た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', ゐ: 'wi', ゑ: 'we', を: 'wo', ん: 'n',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'ji', づ: 'zu', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'a', ぃ: 'i', ぅ: 'u', ぇ: 'e', ぉ: 'o',
  ゃ: 'ya', ゅ: 'yu', ょ: 'yo', ゎ: 'wa',
  ー: 'ー', // 長音符は後段で処理
}
// 拗音（子音 + 小さいゃゅょ）
const YOON = {
  き: { ゃ: 'kya', ゅ: 'kyu', ょ: 'kyo' },
  し: { ゃ: 'sha', ゅ: 'shu', ょ: 'sho' },
  ち: { ゃ: 'cha', ゅ: 'chu', ょ: 'cho' },
  に: { ゃ: 'nya', ゅ: 'nyu', ょ: 'nyo' },
  ひ: { ゃ: 'hya', ゅ: 'hyu', ょ: 'hyo' },
  み: { ゃ: 'mya', ゅ: 'myu', ょ: 'myo' },
  り: { ゃ: 'rya', ゅ: 'ryu', ょ: 'ryo' },
  ぎ: { ゃ: 'gya', ゅ: 'gyu', ょ: 'gyo' },
  じ: { ゃ: 'ja', ゅ: 'ju', ょ: 'jo' },
  ぢ: { ゃ: 'ja', ゅ: 'ju', ょ: 'jo' },
  び: { ゃ: 'bya', ゅ: 'byu', ょ: 'byo' },
  ぴ: { ゃ: 'pya', ゅ: 'pyu', ょ: 'pyo' },
}
const SMALL_YA = new Set(['ゃ', 'ゅ', 'ょ'])

function kanaToRomaji(input) {
  const s = kataToHira(input)
  const chars = [...s]
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i]
    const next = chars[i + 1]
    // 促音っ → 次の子音を重ねる
    if (c === 'っ' || c === 'ッ') {
      // 次のローマ字の先頭子音を重ねる
      let nr = ''
      if (next && YOON[next] && chars[i + 2] && SMALL_YA.has(chars[i + 2])) nr = YOON[next][chars[i + 2]]
      else if (next && ROMA[next]) nr = ROMA[next]
      if (nr && /^[a-z]/.test(nr)) {
        // ch → tch（ヘボン式）
        if (nr.startsWith('ch')) out += 't'
        else out += nr[0]
      }
      continue
    }
    // 長音符ー → 直前の母音を繰り返す
    if (c === 'ー') {
      const m = out.match(/[aiueo]$/)
      if (m) out += m[0]
      continue
    }
    // 拗音
    if (YOON[c] && next && SMALL_YA.has(next)) {
      out += YOON[c][next]
      i++
      continue
    }
    if (ROMA[c] !== undefined) {
      const r = ROMA[c]
      out += r === 'ー' ? '' : r
      continue
    }
    // 変換できない文字はそのまま
    out += c
  }
  return out
}

// 自己テスト
const romaTests = [
  ['さかな', 'sakana'],
  ['きゃく', 'kyaku'],
  ['がっこう', 'gakkou'],
  ['せんせい', 'sensei'],
  ['りょこう', 'ryokou'],
  ['コーヒー', 'koohii'],
]
let romaOk = true
for (const [inp, exp] of romaTests) {
  const got = kanaToRomaji(inp)
  const pass = got === exp
  if (!pass) romaOk = false
  console.assert(pass, `kanaToRomaji(${inp}) = ${got}, expected ${exp}`)
}
console.log('kanaToRomaji self-test:', romaOk ? 'PASS' : 'FAIL', romaTests.map(([i]) => `${i}->${kanaToRomaji(i)}`).join(', '))

// ---------------------------------------------------------------------------
// 5. wordbank 生成（確定版 gloss.en.japanese.json がある見出しのみ）
// ---------------------------------------------------------------------------
let confirmed = {}
try {
  confirmed = JSON.parse(fs.readFileSync(path.join(toolsDir, 'gloss.en.japanese.json'), 'utf8'))
} catch {
  // 確定版が無ければ 0 語で出力
}

const posLabel = (pos) => {
  if (!pos) return '語彙'
  if (pos.startsWith('v')) return '動詞'
  if (pos.startsWith('adj')) return '形容詞'
  if (pos === 'adv') return '副詞'
  if (pos === 'n' || pos.startsWith('n-') || pos === 'pn') return '名詞'
  return '語彙'
}

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// 確定版のある見出しだけを対象化
const confirmedEntries = jlpt.filter((e) => typeof confirmed[e.word] === 'string' && confirmed[e.word])
const allGlosses = confirmedEntries.map((e) => confirmed[e.word])

function pickDistractors(answer) {
  const used = new Set([answer])
  const out = []
  for (const g of shuffle(allGlosses)) {
    if (out.length >= 3) break
    if (used.has(g)) continue
    used.add(g)
    out.push(g)
  }
  return out
}

// リスニング穴埋め/例文暗記用の例文(Tatoeba日英)。{ 見出し: { ex:"日本語文 — English", blank:"空欄語" } }
let jpExamples = {}
try {
  jpExamples = JSON.parse(fs.readFileSync(path.join(toolsDir, 'examples.custom.japanese.json'), 'utf8'))
} catch {
  // 例文が無ければ例文なしで生成
}
function exampleFor(word) {
  const e = jpExamples[word]
  if (!e || typeof e.ex !== 'string' || typeof e.blank !== 'string') return null
  const sentence = e.ex.split(' — ')[0]
  const i = sentence.indexOf(e.blank)
  if (i < 0 || sentence.indexOf(e.blank, i + 1) >= 0) return null // ちょうど1回のみ採用
  const en = e.ex.split(' — ')[1] || ''
  return { example: e.ex, exampleForm: e.blank, exampleTranslations: en ? { en } : undefined }
}

const questions = confirmedEntries
  .map((e, i) => {
    const gloss = confirmed[e.word]
    const pron = `${e.kana} (${kanaToRomaji(e.kana)})`
    const ex = exampleFor(e.word)
    return {
      id: `jp-${String(i + 1).padStart(5, '0')}`,
      category: 'japanese',
      prompt: `「${e.word}」の意味は？`,
      answer: gloss,
      glosses: { en: gloss },
      choices: shuffle([gloss, ...pickDistractors(gloss)]),
      difficulty: e.level,
      tags: [posLabel(posByHeadword[e.word])],
      pronunciation: pron,
      ...(ex ? { example: ex.example, exampleForm: ex.exampleForm, ...(ex.exampleTranslations ? { exampleTranslations: ex.exampleTranslations } : {}) } : {}),
      verified: true,
    }
  })
  .filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
const manifestLevels = []
for (const lv of [1, 2, 3, 4, 5]) {
  const items = questions.filter((q) => q.difficulty === lv)
  fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(items))
  manifestLevels.push({ level: lv, file: `level-${lv}.json`, count: items.length })
}
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      category: 'japanese',
      total: questions.length,
      verified: questions.length,
      levels: manifestLevels,
      source: 'JLPT N5 (jamsinclair/open-anki-jlpt-decks, MIT) + JMdict (EDRDG, CC BY-SA)',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

// ---------------------------------------------------------------------------
// 6. コンソール出力
// ---------------------------------------------------------------------------
console.log('JLPT N5 語数:', jlpt.length)
console.log('JMdict 候補取得語数:', Object.keys(candidates).length)
console.log('JMdict 無語数:', noJmdict.length, noJmdict.length ? `（例: ${noJmdict.slice(0, 10).join(', ')}）` : '')
console.log('生成 Question 数:', questions.length)
for (const l of manifestLevels) if (l.count) console.log(`  level ${l.level}: ${l.count}`)
