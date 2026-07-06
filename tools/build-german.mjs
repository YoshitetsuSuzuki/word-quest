// ============================================================================
// build-german.mjs  ドイツ語ワードバンク生成（英語圏ユーザー向け・英語訳）
//
// 入力(.cache):
//   de_50k.txt          … FrequencyWords 2018 独語頻度リスト (hermitdave, CC-BY 4.0)
//                         形式: "word count"
//   de-gloss-index.json … kaikki.org(Wiktextract) German 辞書から抽出した
//                         小文字化見出し -> { pos: {head:原表記, glosses:[英語]} } 索引
//                         （屈折/派生説明glossは抽出時に除外済み）
// 出力:
//   tools/gloss.en.german.json                     … { "独語(原表記)": "english" }
//   public/wordbank/german/level-{1..5}.json, manifest.json
//
// 方針: 権威辞書(Wiktextract)を錨に英語中心義を1つ確定。辞書に無い/曖昧は非出荷。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'public', 'wordbank', 'german')

// ---- 機能語（除外） ----
const FUNCTION_WORDS = new Set(
  (
    'der die das und in zu den von mit sich auf für ist nicht ein eine dem des er sie es ich du wir ihr aber oder wie wenn nur auch schon noch sein haben werden ' +
    'als am an bei bis da dann dass dein denn dich dir dies doch dort ehe eben etwa euch euer gar gegen hab hat hatte hattest hin hinter ihm ihn ihnen ihre uns unser euer ' +
    'im ins ja je jede jeder jedes jene jener kein keine man mehr mein meine mir mich muss musst nach neben nein nichts nun ob oben ohne per pro quer sehr seid seit ' +
    'seine sein selbst sich sind so sofern sogar solch soll sollst sollte sonst statt trotz uber um und ums unter viel vom vor war waren warst warum was weg weil ' +
    'welche welcher welches wer wessen wo wobei wodurch wofür woher wohin womit woran worauf worin wurde wurden würde würden zum zur zwar zwischen ' +
    'diese dieser dieses jenem jenen mich dich sich uns euch mich hätte hätten könnte könnten würde müsse möge dürfe kann kannst konnte konnten will willst wollte ' +
    'wollen mag magst mochte möchte darf darfst durfte muß müssen können wollen mögen dürfen sollen ' +
    // 冠詞・代名詞・助動詞の活用形、前置詞、口語俗義に化けやすい機能語（同綴の稀な名詞/動詞を避ける）
    'einen einem einer eines habe hast hab hatte hatten habt haben durch drauf aus bin bist sind seid gewesen ' +
    'wird werde wirst wurde geworden dies diesem diesen dieser dieses jener jenes jenem manche mancher solche ' +
    'welchem welchen etwas nichts jemand niemand alles alle allen aller allem beim vom zum zur ans aufs fürs ' +
    'wo wohin woher damit dadurch worden mich dich uns euch ihnen deiner meiner seiner unserer eurer ' +
    'jetzt über los überm übern übers hin her hinaus herein heraus hinein empor'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// ---- 屈折/派生残渣・説明文（gloss最終フィルタ） ----
// 中心義でない派生・活用・定義文説明を弾く。該当したglossは採用しない。
const RESIDUE_RE =
  /\b(singular|plural|imperative|indicative|subjunctive|conjunctive|weak\/mixed|weak\/strong|all-case|nominative|genitive|dative|accusative|declension|conjugation|inflection|participle|nominalization|nominalisation|equivalent|agent noun|nomen vicis|native or resident|form of|spelling of|inflected|archaic form|alternative|which|e\.g\.|i\.e\.|comparative (degree )?of|superlative (degree )?of|pronominal adverb of|verbal noun of|synonym of|contraction of|of the (verb|adjective|noun))\b/i
// コロンを含む定義=説明文とみなし弾く
function isResidue(g) {
  if (RESIDUE_RE.test(g)) return true
  if (g.includes(':')) return true
  return false
}

// ---- 頻度リスト読込 ----
const freqLines = fs.readFileSync(path.join(cacheDir, 'de_50k.txt'), 'utf8').split('\n')
const reWord = /^[a-zäöüß]+$/
const freq = [] // 頻度順（小文字語）
const seenFreq = new Set()
for (const ln of freqLines) {
  const w = (ln.split(' ')[0] || '').toLowerCase().trim()
  if (!w || seenFreq.has(w)) continue
  if (w.length < 3) continue
  if (!reWord.test(w)) continue
  if (FUNCTION_WORDS.has(w)) continue
  seenFreq.add(w)
  freq.push(w)
}
console.log('頻度候補（フィルタ後）:', freq.length)

// ---- 辞書索引読込 ----
const idx = JSON.parse(fs.readFileSync(path.join(cacheDir, 'de-gloss-index.json'), 'utf8'))

// ---- gloss整形（1つの中心義を取り出す） ----
function firstSense(glossStr) {
  // "a, b, c" のうち先頭の語義を中心義に。カンマ区切りの最初の断片を採用。
  let s = glossStr.split(/[;]/)[0].split(',')[0].trim()
  s = s.replace(/\s+/g, ' ').trim()
  s = s.replace(/[.]+$/, '').trim()
  return s
}

// 品詞→中心義確定。verb→adj→noun→adv の順で実義を探す。
// 返り値: { head:表示見出し, gloss:英語中心義, bucket:品詞タグ } or null
function resolve(low) {
  const rec = idx[low]
  if (!rec) return null

  // 中心義は最大4語まで（定義文の混入を防ぐ）
  const okGloss = (gl) => gl && gl.length >= 2 && !isResidue(gl) && gl.split(' ').length <= 4

  // verb: gloss は "to ..." が中心義。to始まりを最優先で拾う。
  if (rec.verb) {
    for (const g of rec.verb.glosses) {
      if (isResidue(g)) continue
      if (/^to\s+\w/i.test(g)) {
        const gl = firstSense(g)
        if (gl && /^to\s+\w/i.test(gl) && okGloss(gl))
          return { head: rec.verb.head, gloss: gl.toLowerCase(), bucket: 'verb' }
      }
    }
  }
  // adj
  if (rec.adj) {
    for (const g of rec.adj.glosses) {
      if (isResidue(g)) continue
      const gl = firstSense(g)
      if (okGloss(gl) && /^[a-z][a-z' -]*$/i.test(gl)) {
        // 大文字始まりの原表記でも形容詞は小文字表示（辞書headに従う）
        return { head: rec.adj.head, gloss: gl.toLowerCase(), bucket: 'adj' }
      }
    }
  }
  // noun: 大文字原表記。gloss先頭の中心義。
  if (rec.noun) {
    for (const g of rec.noun.glosses) {
      if (isResidue(g)) continue
      const gl = firstSense(g)
      if (okGloss(gl) && /[a-z]/i.test(gl)) {
        // 名詞見出しは大文字原表記を保証
        let head = rec.noun.head
        head = head.charAt(0).toUpperCase() + head.slice(1)
        return { head, gloss: gl.toLowerCase(), bucket: 'noun' }
      }
    }
  }
  // adv
  if (rec.adv) {
    for (const g of rec.adv.glosses) {
      if (isResidue(g)) continue
      const gl = firstSense(g)
      if (okGloss(gl) && /^[a-z][a-z' -]*$/i.test(gl)) {
        return { head: rec.adv.head, gloss: gl.toLowerCase(), bucket: 'adv' }
      }
    }
  }
  return null
}

// ---- 候補確定 ----
const TARGET_TOTAL = 2000
const accepted = [] // {head, gloss, bucket, rank}
const usedHead = new Set()
let dictHit = 0
for (let i = 0; i < freq.length; i++) {
  const low = freq[i]
  const r = resolve(low)
  if (!r) continue
  dictHit++
  if (usedHead.has(r.head)) continue // 表示見出し重複回避
  usedHead.add(r.head)
  accepted.push({ ...r, rank: accepted.length })
  if (accepted.length >= TARGET_TOTAL) break
}
console.log('辞書ヒット（採用対象走査中）:', dictHit)
console.log('採用語数:', accepted.length)

// ---- レベル分割（頻度順に均等5分割） ----
const per = Math.ceil(accepted.length / 5)
for (const a of accepted) {
  a.level = Math.min(5, Math.floor(a.rank / per) + 1)
}

// ---- gloss.en.german.json ----
const glossMap = {}
for (const a of accepted) glossMap[a.head] = a.gloss
fs.writeFileSync(path.join(root, 'tools', 'gloss.en.german.json'), JSON.stringify(glossMap, null, 2))

// ---- ダミー（英語gloss4択） ----
const bucketLabel = { verb: 'word', adj: 'word', adv: 'word', noun: 'word' }
function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const byBucket = new Map()
for (const a of accepted) {
  if (!byBucket.has(a.bucket)) byBucket.set(a.bucket, [])
  byBucket.get(a.bucket).push(a)
}
function pickDistractors(target) {
  const pool = byBucket.get(target.bucket) ?? []
  const used = new Set([target.gloss])
  const out = []
  for (const c of shuffle(pool)) {
    if (out.length >= 3) break
    if (used.has(c.gloss)) continue
    used.add(c.gloss)
    out.push(c.gloss)
  }
  if (out.length < 3) {
    for (const c of shuffle(accepted)) {
      if (out.length >= 3) break
      if (used.has(c.gloss)) continue
      used.add(c.gloss)
      out.push(c.gloss)
    }
  }
  return out.slice(0, 3)
}

// ---- questions ----
// 日本語ネイティブ向けの確定訳(ピボット+意味検証済み)を取り込む。無ければ英語のみ。
const jaGlossPathDe = path.join(root, 'tools', 'gloss.ja.german.json')
const jaGlossDe = fs.existsSync(jaGlossPathDe) ? JSON.parse(fs.readFileSync(jaGlossPathDe, 'utf8')) : {}
const questions = accepted
  .map((a, i) => ({
    id: `de-${String(i + 1).padStart(5, '0')}`,
    category: 'german',
    prompt: `「${a.head}」の意味は？`,
    answer: a.gloss,
    glosses: jaGlossDe[a.head] ? { en: a.gloss, ja: jaGlossDe[a.head] } : { en: a.gloss },
    choices: shuffle([a.gloss, ...pickDistractors(a)]),
    difficulty: a.level,
    tags: ['word'],
    verified: true,
  }))
  .filter((q) => new Set(q.choices).size === 4 && q.answer && q.answer.trim())

// ---- 書き出し ----
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
      category: 'german',
      total: questions.length,
      verified: questions.length,
      levels: manifestLevels,
      source:
        'FrequencyWords 2018 de (hermitdave, CC-BY 4.0) + Wiktextract German (kaikki.org, CC BY-SA 4.0 / GFDL)',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('生成数:', questions.length)
for (const l of manifestLevels) console.log(`  level ${l.level}: ${l.count}`)
