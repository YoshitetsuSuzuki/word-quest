// ============================================================================
// build-wordbank.mjs  英単語ワードバンク生成パイプライン v3（英和辞書ベース）
//
// 方針: 「英単語→日本語訳」は英和辞書 EJDict(パブリックドメイン) を素直に1対1で引く。
//   EJDict は英単語が見出しで、先頭の意味が主要な訳語。『』が核となる訳語を示す。
//   (JMdictの逆引きは主要語義の推測が必要で違和感が出たため廃止)
//
// 入力(.cache):
//   ejdict-all.txt        … EJDict 英和辞書(パブリックドメイン)  word<TAB>意味 / 意味 / ...
//   ngsl.csv              … NGSL 学習者向け頻度語(CC BY-SA) ※出題語の選定・級分け
//   freq10k.txt           … google-10000-english(MIT)         ※NGSL超の語彙拡張
//   en_50k.txt            … hermitdave/FrequencyWords 2018 en (CC-BY 4.0, OpenSubtitles由来)
//                            ※Lv6-7 候補プール拡張用。全語 verified:false で非出荷(人手レビュー待ち)
// 出力: public/wordbank/english/level-{1..7}.json, manifest.json
//   + tools/overrides.english.json … 頻出コア語の人手検証済み上書き(任意)
//
// 固有名詞: EJDictは固有名詞を大文字見出しで持つため、小文字語のみ照合すれば自動除外される。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'public', 'wordbank', 'english')

const STOPWORDS = new Set(
  (
    'the be of and to a in have it you for not that on with do as he we this at they but from by will or his say ' +
    'she so all about there her one what if would who which when make can like time no just him know take people into ' +
    'year your good some could them see other than then now look only come its over think also back after use two how ' +
    'our work first well way even new want because any these give day most us is are was were been being am pm etc via ' +
    'per among upon within without into onto off yes may might should must shall cannot ought thou i me my mine himself ' +
    'himself herself itself does did done has had having each every both few more much many such own same'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// ---- EJDict 読み込み: word -> 定義文字列 (小文字見出しのみ=固有名詞除外) ----
const ejdict = new Map()
for (const line of fs.readFileSync(path.join(cacheDir, 'ejdict-all.txt'), 'utf8').split('\n')) {
  const tab = line.indexOf('\t')
  if (tab < 0) continue
  const word = line.slice(0, tab).trim()
  if (!/^[a-z][a-z'-]*$/.test(word)) continue // 小文字のみ(固有名詞は大文字見出しなので除外される)
  if (!ejdict.has(word)) ejdict.set(word, line.slice(tab + 1))
}

// ---- 発音記号(IPA): ipa-dict(MIT) から word -> IPA(第一発音) ----
const ipaMap = new Map()
try {
  for (const line of fs.readFileSync(path.join(cacheDir, 'ipa_en_US.txt'), 'utf8').split('\n')) {
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const w = line.slice(0, tab).trim().toLowerCase()
    const ipa = line.slice(tab + 1).split(',')[0].trim()
    if (w && ipa && !ipaMap.has(w)) ipaMap.set(w, ipa)
  }
} catch {
  console.warn('warning: ipa_en_US.txt が見つかりません。発音記号なしで生成します。')
}

// ---- 定義から「主要な1つの訳語」を抽出 ----
function extractMeaning(raw) {
  let first = raw.split(' / ')[0] // 先頭の語義=主要な訳語
  first = first
    .replace(/〈[^〉]*〉/g, '') // 〈C〉〈人が〉等の注記
    .replace(/《[^》]*》/g, '') // 《the ~》《米》等
    .replace(/\{[^}]*\}/g, '') // {動}{名}等の品詞マーカー
    .replace(/\([^)]*\)/g, '') // (…の)(集団の)等
    .replace(/（[^）]*）/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[＋+][^,、;；/]*/g, '') // +『for』 等
  const m = first.match(/『([^』]*)』/) // 核となる訳語
  let core = m ? m[1] : first
  core = core.split(/[,、;；]/)[0] // 最初の区切りまで
  // 記号(『』…引用符・中黒等)のみ除去。※語頭の仮名を削る処理はバグの元(もう→う)のため廃止
  core = core.replace(/[『』「」…"'.\s·・\-()（）]/g, '').replace(/^…+/, '').trim()
  core = core.replace(/^を/, '') // 語頭の格助詞「を」のみ除去(『…を捨てる』→捨てる。をで始まる和語は無いため安全)
  return core
}

// ---- 出題語ソース: NGSL(コア) + google10k(拡張) を頻度順に結合 ----
function parseNgsl() {
  const raw = fs.readFileSync(path.join(cacheDir, 'ngsl.csv'), 'utf8')
  const fields = []
  let cur = '',
    q = false
  for (const ch of raw) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      fields.push(cur)
      cur = ''
    } else if ((ch === '\n' || ch === '\r') && !q) {
      if (cur) {
        fields.push(cur)
        cur = ''
      }
    } else cur += ch
  }
  if (cur) fields.push(cur)
  const heads = []
  const seen = new Set()
  for (const f of fields) {
    const w = f.trim().toLowerCase()
    if (/^[a-z]+$/.test(w) && !seen.has(w)) {
      seen.add(w)
      heads.push(w)
    }
  }
  return heads
}

const ngsl = parseNgsl()
const google = fs
  .readFileSync(path.join(cacheDir, 'freq10k.txt'), 'utf8')
  .split('\n')
  .map((w) => w.trim().toLowerCase())
  .filter((w) => /^[a-z]+$/.test(w) && w.length >= 3)

const sourceWords = []
const seenWord = new Set()
for (const w of [...ngsl, ...google]) {
  if (seenWord.has(w)) continue
  seenWord.add(w)
  sourceWords.push({ word: w, rank: sourceWords.length + 1 })
}

// ---- 品詞バケット(ダミー生成用): 日本語の語形から推定 ----
function inferBucket(m) {
  if (/(な)$/.test(m) || (/い$/.test(m) && !/[ぁ-ん]る$/.test(m))) return 'adj'
  if (/(る|う|く|ぐ|す|つ|ぬ|ぶ|む)$/.test(m)) return 'verb'
  return 'noun'
}
const bucketLabel = { verb: '動詞', adj: '形容詞', adv: '副詞', noun: '名詞' }

// 複数形として除外しない(=単数扱いしない)語。sは語尾だが複数形ではない/独立した意味を持つ。
const PLURAL_KEEP = new Set([
  'news', 'means', 'series', 'species', 'goods', 'clothes', 'thanks', 'glasses',
  'headquarters', 'arms', 'customs', 'contents', 'remains', 'odds', 'stairs',
  'savings', 'earnings', 'belongings', 'surroundings', 'physics', 'mathematics',
  'economics', 'politics', 'statistics', 'ethics', 'sales', 'works',
])

// ---- 各語の訳を確定 ----
const accepted = []
for (const sw of sourceWords) {
  const { word } = sw
  if (word.length < 3 || STOPWORDS.has(word)) continue
  // 複数形は除外し単数形を採用する(numbers→民数記 等の誤マッピングを防ぐ)
  if (word.endsWith('s') && !PLURAL_KEEP.has(word)) {
    const singular = word.slice(0, -1)
    const singularES = word.endsWith('es') ? word.slice(0, -2) : null
    if (ejdict.has(singular) || (singularES && ejdict.has(singularES))) continue
  }
  const def = ejdict.get(word)
  if (!def) continue
  const meaning = extractMeaning(def)
  // 品質ゲート: 空 / 長すぎ(句) / 英数字混入 / 単一かな(抽出崩れの疑い) は除外
  if (!meaning || meaning.length > 10 || /[a-zA-Z0-9]/.test(meaning)) continue
  if (/^[ぁ-んァ-ヶ]$/.test(meaning)) continue
  accepted.push({ word, meaning, bucket: inferBucket(meaning), rank: sw.rank })
}

// ---- 人手検証済み上書き ----
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'overrides.english.json'), 'utf8'))
const rankByWord = new Map(sourceWords.map((s) => [s.word, s.rank]))
const acceptedByWord = new Map(accepted.map((a) => [a.word, a]))
let overrideApplied = 0
// Lv1-5プールに無い override 語(=Lv6-7候補のレビュー昇格分)はここで注入すると
// rank400=Lv1に混入してしまうため保留し、後段のLv6-7生成時に適用する
const pendingOverrides = new Map()
for (const [word, meaning] of Object.entries(overrides)) {
  if (word.startsWith('_') || typeof meaning !== 'string') continue
  const ex = acceptedByWord.get(word)
  if (ex) {
    ex.meaning = meaning
    ex.bucket = inferBucket(meaning)
    overrideApplied++
  } else if (rankByWord.has(word)) {
    // Lv1-5頻度リスト内だが自動抽出が品質ゲートで弾いた語: 検証済み訳で復活させる(従来挙動)
    const a = { word, meaning, bucket: inferBucket(meaning), rank: rankByWord.get(word) }
    accepted.push(a)
    acceptedByWord.set(word, a)
    overrideApplied++
  } else {
    pendingOverrides.set(word, meaning)
  }
}

// ---- 難易度(級): 頻度順 ----
function levelOf(rank) {
  if (rank <= 700) return 1
  if (rank <= 1600) return 2
  if (rank <= 2818) return 3
  if (rank <= 6000) return 4
  return 5
}

// ---- ダミー生成 ----
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
for (const [, list] of byBucket) list.sort((x, y) => x.rank - y.rank)

function pickDistractors(target) {
  const pool = byBucket.get(target.bucket) ?? []
  const idx = pool.indexOf(target)
  const used = new Set([target.meaning])
  const result = []
  for (let window = 60; result.length < 3 && window <= pool.length + 60; window += 120) {
    const lo = Math.max(0, idx - window)
    const hi = Math.min(pool.length - 1, idx + window)
    for (const c of shuffle(pool.slice(lo, hi + 1))) {
      if (result.length >= 3) break
      if (used.has(c.meaning)) continue
      used.add(c.meaning)
      result.push(c.meaning)
    }
  }
  if (result.length < 3) {
    for (const c of shuffle(accepted)) {
      if (result.length >= 3) break
      if (used.has(c.meaning)) continue
      used.add(c.meaning)
      result.push(c.meaning)
    }
  }
  return result.slice(0, 3)
}

// ---- 検証済み判定 ----
// 全数レビュー済みの級 + 人手上書き済みの語 を「検証済み」とする。
// アプリは検証済みの語だけを出題するため、出す語はすべて確実な訳になる。
const REVIEWED_MAX_LEVEL = 3 // Lv1-3(NGSL相当・約2,600語)を全数レビュー済み
const overrideWords = new Set(Object.keys(overrides).filter((k) => !k.startsWith('_')))

// ---- Question 生成・出力 ----
const questions = accepted
  .map((a) => {
    const level = levelOf(a.rank)
    const ipa = ipaMap.get(a.word)
    return {
      id: `en-${String(a.rank).padStart(5, '0')}`,
      category: 'english',
      prompt: `「${a.word}」の意味は？`,
      answer: a.meaning,
      choices: shuffle([a.meaning, ...pickDistractors(a)]),
      difficulty: level,
      tags: [bucketLabel[a.bucket]],
      explanation: `${a.word} = ${a.meaning}`,
      ...(ipa ? { pronunciation: ipa } : {}),
      verified: level <= REVIEWED_MAX_LEVEL || overrideWords.has(a.word),
    }
  })
  .filter((q) => new Set(q.choices).size === 4)

// ============================================================================
// 候補プール拡張 (Lv6-7): hermitdave/FrequencyWords en_50k (CC-BY 4.0) から
// 既存プールに無い語を頻度順に採取する。
//  - 全語 verified:false → verifiedOnly の間は絶対に出荷されない(後続の人手レビューで昇格)
//  - 既存 Lv1-5 の生成(上の questions)には一切手を触れない。この節は後段追記のみ。
// ============================================================================
const EXT_PER_LEVEL = 1500 // Lv6 / Lv7 各語数
const EXT_RANK_BASE = 20000 // 既存 rank(最大~1万) と衝突しない id 採番オフセット

// 卑語・スラー(subtitles 由来リストに高頻度で混入するため明示除外)
const EXT_BLOCKLIST = new Set([
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'motherfucker', 'motherfuckers',
  'shit', 'shits', 'shitty', 'shite', 'bullshit', 'dipshit', 'horseshit',
  'bitch', 'bitches', 'bitchy', 'asshole', 'assholes', 'arsehole', 'arse',
  'bastard', 'bastards', 'cunt', 'cunts', 'dick', 'dicks', 'dickhead',
  'cock', 'cocks', 'cocksucker', 'pussy', 'pussies', 'prick', 'pricks',
  'whore', 'whores', 'slut', 'sluts', 'hooker', 'hookers', 'skank',
  'fag', 'faggot', 'faggots', 'dyke', 'tranny', 'homo',
  'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'kike', 'chink', 'gook', 'spic', 'wetback',
  'retard', 'retarded', 'spastic', 'schmuck', 'jackass', 'dumbass', 'douche', 'douchebag',
  'wanker', 'wank', 'bollocks', 'twat', 'piss', 'pissed', 'pissing',
  'tits', 'titties', 'boobs', 'boner', 'jizz', 'blowjob', 'handjob', 'dildo', 'milf', 'horny',
  'goddamn', 'goddamned', 'damn', 'dammit', 'crap', 'crappy',
])

const extAccepted = []
try {
  const extLines = fs.readFileSync(path.join(cacheDir, 'en_50k.txt'), 'utf8').split('\n')
  for (const line of extLines) {
    if (extAccepted.length >= EXT_PER_LEVEL * 2) break
    const w = line.split(' ')[0]?.trim().toLowerCase()
    // 既存と同一のフィルタ群: 小文字アルファベットのみ/3文字以上/STOPWORDS
    if (!w || !/^[a-z]+$/.test(w) || w.length < 3 || STOPWORDS.has(w)) continue
    if (EXT_BLOCKLIST.has(w)) continue
    if (/(.)\1\1/.test(w)) continue // aaah/mmm 等の字幕ノイズ(同一文字3連続)
    if (seenWord.has(w) || acceptedByWord.has(w)) continue // 既存プール(Lv1-5・overrides)と重複させない
    // 複数形は除外し単数形採用(既存と同ロジック)
    if (w.endsWith('s') && !PLURAL_KEEP.has(w)) {
      const singular = w.slice(0, -1)
      const singularES = w.endsWith('es') ? w.slice(0, -2) : null
      if (ejdict.has(singular) || (singularES && ejdict.has(singularES))) continue
    }
    // EJDict は小文字見出しのみ読込済み → 固有名詞は訳が引けず自動除外される
    const def = ejdict.get(w)
    if (!def) continue
    const meaning = extractMeaning(def)
    if (!meaning || meaning.length > 10 || /[a-zA-Z0-9]/.test(meaning)) continue
    if (/^[ぁ-んァ-ヶ]$/.test(meaning)) continue
    extAccepted.push({
      word: w,
      meaning,
      bucket: inferBucket(meaning),
      rank: EXT_RANK_BASE + extAccepted.length + 1,
      extLevel: extAccepted.length < EXT_PER_LEVEL ? 6 : 7,
    })
  }
} catch {
  console.warn('warning: en_50k.txt が見つかりません。Lv6-7 拡張なしで生成します。')
}

// 保留していた override(レビュー昇格分)を Lv6-7 候補へ適用(訳を検証済み訳で上書き)
for (const a of extAccepted) {
  const m = pendingOverrides.get(a.word)
  if (m !== undefined) {
    a.meaning = m
    a.bucket = inferBucket(m)
    pendingOverrides.delete(a.word)
    overrideApplied++
  }
}
if (pendingOverrides.size > 0) {
  console.warn('warning: overridesに載っているがどの候補プールにも無い語:', pendingOverrides.size, [...pendingOverrides.keys()].slice(0, 10))
}

// ダミー選択肢プールへ拡張語を合流(既存 questions は生成済みのため影響しない)
for (const a of extAccepted) {
  accepted.push(a)
  if (!byBucket.has(a.bucket)) byBucket.set(a.bucket, [])
  byBucket.get(a.bucket).push(a)
}
for (const [, list] of byBucket) list.sort((x, y) => x.rank - y.rank)

const extQuestions = extAccepted
  .map((a) => {
    const ipa = ipaMap.get(a.word)
    return {
      id: `en-${String(a.rank).padStart(5, '0')}`,
      category: 'english',
      prompt: `「${a.word}」の意味は？`,
      answer: a.meaning,
      choices: shuffle([a.meaning, ...pickDistractors(a)]),
      difficulty: a.extLevel,
      tags: [bucketLabel[a.bucket]],
      explanation: `${a.word} = ${a.meaning}`,
      ...(ipa ? { pronunciation: ipa } : {}),
      verified: overrideWords.has(a.word), // 人手レビューで overrides 登録された語のみ出荷
    }
  })
  .filter((q) => new Set(q.choices).size === 4)

const allQuestions = [...questions, ...extQuestions]

fs.mkdirSync(outDir, { recursive: true })
const manifestLevels = []
for (const lv of [1, 2, 3, 4, 5, 6, 7]) {
  const items = allQuestions.filter((q) => q.difficulty === lv)
  fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(items))
  manifestLevels.push({ level: lv, file: `level-${lv}.json`, count: items.length })
}
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      category: 'english',
      total: allQuestions.length,
      verified: allQuestions.filter((q) => q.verified).length,
      levels: manifestLevels,
      source:
        'EJDict (Public Domain) + NGSL + google-10000-english + FrequencyWords en_50k (CC-BY 4.0, Lv6-7 candidates)',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

console.log('source words:', sourceWords.length, '/ EJDict entries:', ejdict.size)
console.log('overrides applied:', overrideApplied)
console.log('valid questions (Lv1-5):', questions.length)
console.log('candidate pool (Lv6-7):', extQuestions.length, '/ うちverified:', extQuestions.filter((q) => q.verified).length)
console.log('total:', allQuestions.length)
console.log('VERIFIED (出荷対象):', allQuestions.filter((q) => q.verified).length)
for (const l of manifestLevels) console.log(`  level ${l.level}: ${l.count}`)
