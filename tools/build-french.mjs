// ============================================================================
// build-french.mjs  フランス語ワードバンク生成（英語圏ユーザー向け：仏→英）
//
// 入力(.cache):
//   fr_50k.txt          … 仏語頻度リスト（OpenSubtitles 2018 / hermitdave FrequencyWords）
//                         形式: "word count"
//   fr-en-index.json    … kaikki.org(Wiktextract) French JSONL から生成した
//                         仏語見出し(小文字) -> [{gloss, pos, tags}] の索引。
//                         活用形(form-of 等)は除外済み。
//                         再生成: scratchpad の build_index.mjs 参照（本ファイル下部にも手順記載）。
// 出力:
//   tools/gloss.en.french.json         … { "仏語": "english" } 確定訳
//   public/wordbank/french/level-{1..5}.json, manifest.json
//
// 方針: 権威辞書(Wiktionary英語版=kaikki)を錨に中心義を1つ確定。辞書に無い/曖昧な語は非出荷。
//       頻度順で候補を作り、機能語・固有名詞・卑語・多文字記号を除外。
//       名詞=素(a/theなし)、動詞=to...、形容詞/副詞=そのまま。注記(括弧・;以降)は除去。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cacheDir = path.join(root, '.cache')
const outDir = path.join(root, 'public', 'wordbank', 'french')
const toolsDir = path.join(root, 'tools')

// ---- 索引(.cache/fr-en-index.json)が無ければ kaikki JSONL から生成 ----
// kaikki の巨大 JSONL(約560MB)は毎回読むと重いため、初回のみ索引化してキャッシュする。
// 再取得手順:
//   curl -sL -o .cache/kaikki-french.jsonl \
//     https://kaikki.org/dictionary/French/kaikki.org-dictionary-French.jsonl
async function buildIndexFromKaikki() {
  const IN = path.join(cacheDir, 'kaikki-french.jsonl')
  if (!fs.existsSync(IN)) {
    console.error('BLOCKED: .cache/kaikki-french.jsonl が見つかりません。kaikki.org から取得してください。')
    process.exit(1)
  }
  const KEEP_POS = new Set(['noun', 'verb', 'adj', 'adv'])
  const idx = Object.create(null)
  const rl = readline.createInterface({ input: fs.createReadStream(IN), crlfDelay: Infinity })
  const dropRe =
    /^(inflection of|plural of|feminine (singular|plural)? ?of|masculine (singular|plural)? ?of|singular of|present participle of|past participle of|.*-person .* of|alternative (form|spelling) of|obsolete (form|spelling) of|misspelling of|synonym of|initialism of|abbreviation of|clipping of)\b/i
  for await (const line of rl) {
    if (!line) continue
    let d
    try {
      d = JSON.parse(line)
    } catch {
      continue
    }
    if (!KEEP_POS.has(d.pos)) continue
    const word = (d.word || '').trim()
    if (!word) continue
    for (const s of d.senses || []) {
      const tags = s.tags || []
      if (tags.includes('form-of') || tags.includes('alt-of') || tags.includes('abbreviation')) continue
      const glosses = s.glosses
      if (!glosses || !glosses.length) continue
      const raw = String(glosses[0]).trim()
      if (!raw || dropRe.test(raw)) continue
      const w = word.toLowerCase()
      if (!idx[w]) idx[w] = []
      idx[w].push({ gloss: raw, pos: d.pos, tags })
    }
  }
  fs.writeFileSync(path.join(cacheDir, 'fr-en-index.json'), JSON.stringify(idx))
  console.error('索引生成: 見出し語', Object.keys(idx).length)
  return idx
}

const TARGET_TOTAL = 2000 // 上限の目安（辞書ヒット次第で下振れ可）

// ---- 機能語（文法語）除外セット ----
const STOPWORDS = new Set(
  (
    'le la les de des un une et à en que qui ne pas ce cet cette ces il elle ils elles je tu nous vous se ' +
    'pour dans sur avec au aux du par plus mais ou où comme tout toute tous toutes on son sa ses mon ma mes ' +
    'ton ta tes notre nos votre vos leur leurs est sont être avoir faire ai as ont avons avez suis es sommes ' +
    'êtes était étais étaient sera serai serez seront a as avait avais avaient aura auront fait fais font ' +
    'ça ce cela ceci celui celle ceux celles dont y en si non oui ne que qu me te lui leur moi toi soi ' +
    'ici là déjà encore aussi bien très peu trop assez alors donc car ni or puis quand comment pourquoi ' +
    'combien quel quelle quels quelles chaque quelque quelques plusieurs aucun aucune même autre autres ' +
    'de d l s c j n m t qu jusqu lorsqu puisqu quoiqu' +
    ' cent mille million'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// ---- 卑語/不適切語（安全側で除外） ----
const PROFANITY = new Set(
  (
    'putain merde con conne connard connasse salope salaud enculé enculée bite couille couilles nique niquer ' +
    'chier chiant pute pd bordel foutre foutu cul bordel bite pénis vagin sexe baiser'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// 許容する仏語文字のみ（アクセント含む）
const FRENCH_WORD = /^[a-zàâäçéèêëîïôùûüÿœæ]+$/

// ---- 人手検証済みオーバーライド（頻出コア語の中心義を固定） ----
// kaikki の「先頭 sense」が必ずしも最頻義でない語・同綴り異義が混入する語を、
// 権威辞書(Wiktionary/Larousse/Collins 相当)の中心義で人手確定する。
// 値 null は「中心義が確定できない/機能語相当」として非出荷（除外）を意味する。
const OVERRIDES = {
  quoi: null, // 間投詞「what/you know」機能語相当 → 非出荷
  voilà: null, // 提示表現「there is」機能語相当 → 非出荷
  voila: null,
  soit: null, // être 活用/接続詞 → 非出荷
  dit: null, // dire 活用形 → 非出荷
  bonne: null, // bon の女性形（活用相当） → 非出荷
  été: null, // être/summer 同綴り（過去分詞と衝突）→ 非出荷
  passé: 'past',
  pris: null, // prendre 過去分詞 → 非出荷
  trouvé: null, // trouver 過去分詞 → 非出荷
  passe: null, // passer 活用/多義 → 非出荷
  reste: 'rest',
  part: 'share',
  sens: 'meaning',
  merci: 'thank you',
  accord: 'agreement',
  avant: 'before',
  maison: 'house',
  désolé: 'sorry',
  partir: 'to leave',
  pendant: 'during',
  truc: 'thing',
  contre: 'against',
  bon: 'good',
  bonjour: 'hello',
  salut: 'hi',
  juste: 'fair',
  monde: 'world',
  mal: 'bad',
  fois: 'time',
  mort: 'death',
  mieux: 'better',
  fille: 'girl',
  gens: 'people',
  petit: 'small',
  soir: 'evening',
  argent: 'money',
  moins: 'less',
  seul: 'alone',
  vite: 'quickly',
  super: 'great',
  coup: 'blow',
  chose: 'thing',
  air: 'air',
  essayer: 'to try',
  voyant: 'showy',
  besoin: 'need',
  gars: 'guy',
  tard: 'late',
  sous: 'under',
  entendu: null, // entendre 過去分詞 → 非出荷
  fini: null, // finir 過去分詞 → 非出荷
  laisse: null, // laisser 活用/多義 → 非出荷
  parlé: null, // parler 過去分詞 → 非出荷
  papa: 'dad',
  passer: 'to pass',
  depuis: 'since',
  vivant: 'alive',
  droite: 'right',
  blanche: null, // 「白い(fem)」/音楽用語。活用相当 → 非出荷
  souffle: 'breath',
  original: 'original',
  tireur: 'shooter',
  couché: null, // coucher 過去分詞 → 非出荷
  poussé: null, // pousser 過去分詞 → 非出荷
  fermé: 'closed',
  diane: null, // 固有名詞/軍事用語 → 非出荷
  richard: null, // 俗語 → 非出荷
  blanc: 'white',
  vis: 'screw',
  bête: 'stupid',
  journal: 'newspaper',
  physique: 'physical',
  central: 'central',
  sachant: null, // savoir 現在分詞 → 非出荷
  sainte: null, // saint の女性形（活用相当） → 非出荷
  dossier: 'file',
  réaliser: 'to realize',
  lis: null, // lire 活用と同綴り → 非出荷
  // --- 過去分詞/現在分詞が同綴りで名詞・形容詞化して混入する語（活用相当 → 非出荷） ---
  donné: null,
  demandé: null,
  oublié: null,
  arrêté: null,
  tiré: null,
  joué: null,
  utilisé: null,
  travaillé: null,
  manqué: null,
  cassé: null,
  frappé: null,
  raté: null,
  caché: null,
  jeté: null,
  abandonné: null,
  monté: null,
  réglé: null,
  porté: null,
  brisé: null,
  libéré: null,
  gâché: null,
  arrangé: null,
  autorisé: null,
  réservé: null,
  accusé: null,
  condamné: null,
  forcé: null,
  parlant: null,
  venant: null,
  ayant: null,
  étant: null,
  volée: null,
  invité: 'guest',
  employé: 'employee',
  blessé: 'injured',
  occupé: 'busy',
  marié: 'married',
  fatigué: 'tired',
  fiancé: 'engaged',
  fiancée: null, // 蛾の名が混入 → 非出荷
  mariée: 'bride',
  échappé: null,
  réveillé: 'awake',
  doué: 'gifted',
  chargé: 'busy',
  rêvé: null,
  navré: null,
  coincé: 'stuck',
  brûlé: 'burnt',
  élevé: 'high',
  compliqué: 'complicated',
  préféré: 'favorite',
  obligé: 'obligated',
  enfoiré: null, // 卑語 → 非出荷
  bouffe: 'food',
  étudiant: 'student', // 名詞が中心（studying は現在分詞義）
  gagnant: 'winner',
  volant: 'steering wheel',
  géant: 'giant',
  // --- 説明的/専門的で中心義がずれる語 ---
  instant: 'instant',
  lycée: 'high school',
  hier: 'yesterday',
  derrière: 'behind',
  abord: 'approach',
  esprit: 'mind',
  malade: 'sick',
  pièce: 'piece',
  champ: 'field',
  chambre: 'room',
  panique: 'panic',
  black: null, // 借用俗語 → 非出荷
  précis: 'precise',
  objectif: 'objective',
  langage: 'language',
  costume: 'suit',
  plat: 'dish',
  normale: null, // 数学専門義 → 非出荷
  courant: 'current',
  voler: 'to fly',
  contrôler: 'to control',
  profiter: 'to benefit',
  pub: 'ad',
  remonter: 'to go back up',
  réussir: 'to succeed',
  aimé: null, // aimer 過去分詞 → 非出荷
  cinglé: null, // 俗語 → 非出荷
  pressé: 'in a hurry',
  voici: null, // 提示表現「here is」機能語相当 → 非出荷
  américain: 'American',
  van: null, // 農具/馬運車の古義のみ → 非出荷
  chauffeur: 'driver',
  populaire: 'popular',
  enfer: 'hell',
  éteint: null, // éteindre 過去分詞 → 非出荷
  conduit: 'pipe',
  peine: 'pain',
  précédemment: 'previously',
}

// ---- gloss クリーンアップ ----
// 「注記除去」：括弧・角括弧・カンマやセミコロン以降を落として中心義1語（句）に。
// 説明的・非中心義の gloss（辞書メタ記述や曖昧語義）を弾くパターン
const REJECT_GLOSS =
  /(spelling of|inflection of|form of|plural of|feminine of|masculine of|indicating|used (with|to|in|as|for)|expresses|introduces|abbreviation|initialism|clipping|ellipsis|apocopic|eye dialect|nonstandard|obsolete|dated form|of the verb|imperative of|conjugation of|participle of|first-person|second-person|third-person)/i

// 説明文（定義文）で始まる/含む gloss を弾く（中心義=短い語ではなく解説になっているもの）
const EXPLANATORY_GLOSS =
  /(in its various senses|pertaining to|relating to|characterized by|^which |^that which|^of (a|an|the|black|material)|^the act of|^a person who|^one who|^someone who|^the state of|^the quality of|state of opportuneness|of an? .*object|of black people)/i

function cleanGloss(raw, pos) {
  let g = String(raw).trim()
  if (!g) return null
  if (REJECT_GLOSS.test(g)) return null // 辞書メタ記述・曖昧義は中心義に採らない
  if (EXPLANATORY_GLOSS.test(g)) return null // 解説文になっている gloss は中心義に採らない
  g = g.replace(/,?\s*etc\.?$/i, '') // 末尾の ", etc." を除去
  // 先頭の分野ラベル "(figuratively) ..." 等の括弧を落とす前に、括弧全体を除去
  g = g.replace(/\([^)]*\)/g, ' ') // 括弧注記
  g = g.replace(/\[[^\]]*\]/g, ' ') // 角括弧注記
  g = g.replace(/\s+/g, ' ').trim()
  // セミコロン以降は別義とみなし切る
  if (g.includes(';')) g = g.split(';')[0].trim()
  // カンマ区切りは最初の1つのみ（ただし "to love, to like" のような近義列挙も先頭採用）
  if (g.includes(',')) g = g.split(',')[0].trim()
  // 末尾のピリオド・コロン等
  g = g.replace(/[.:]+$/, '').trim()
  // "color/colour" は英米差 → 米綴りを優先採用
  if (g.includes('/')) g = g.split('/')[0].trim()
  if (!g) return null
  // 動詞は "to ..." に正規化（既に to で始まらない場合）
  if (pos === 'verb') {
    if (!/^to\s/i.test(g)) g = 'to ' + g
  } else {
    // 名詞/形容詞/副詞の先頭 a/an/the を落として「素」に
    g = g.replace(/^(a|an|the)\s+/i, '')
  }
  g = g.trim()
  // 妥当性: 英字を含み、長すぎない（説明文の混入排除）
  if (!/[a-z]/i.test(g)) return null
  const wordCount = g.split(/\s+/).length
  if (wordCount > 5) return null // 5語超は説明的すぎ → 曖昧扱いで非採用
  if (g.length > 40) return null
  return g
}

// 中心義の選択:
//   kaikki の各見出しは POS ごとに複数 sense を持つ。あるPOSの sense 数が多いほど、
//   その語の主要用法である可能性が高い（例: manger は verb x2 > noun x1 → 動詞が中心）。
//   よって「クリーンな gloss を1つ以上持つPOSのうち sense 数最多」を主要POSとし、
//   その先頭 sense（辞書上の主要義）の gloss を中心義に採用する。
//   同数の場合は adj > verb > noun > adv（説明的になりがちな名詞義より、
//   形容詞・動詞の中心義を優先）でタイブレークする。
const TIEBREAK = { adj: 0, verb: 1, noun: 2, adv: 3 }
function pickCentral(entries) {
  // POSごとに: 先頭のクリーンな gloss と、クリーンな gloss を持つ sense の数を集計
  const byPos = {}
  for (const e of entries) {
    const g = cleanGloss(e.gloss, e.pos)
    if (!g) continue
    if (!byPos[e.pos]) byPos[e.pos] = { gloss: g, count: 0 } // 先頭sense=主要義
    byPos[e.pos].count++
  }
  const poses = Object.keys(byPos)
  if (!poses.length) return null
  poses.sort((a, b) => {
    if (byPos[b].count !== byPos[a].count) return byPos[b].count - byPos[a].count
    return TIEBREAK[a] - TIEBREAK[b]
  })
  const p = poses[0]
  return { gloss: byPos[p].gloss, pos: p }
}

// ---- 読み込み ----
if (!fs.existsSync(path.join(cacheDir, 'fr_50k.txt'))) {
  console.error('BLOCKED: .cache/fr_50k.txt が見つかりません。頻度リストを取得してください。')
  process.exit(1)
}
const freqRaw = fs.readFileSync(path.join(cacheDir, 'fr_50k.txt'), 'utf8')
const indexPath = path.join(cacheDir, 'fr-en-index.json')
const index = fs.existsSync(indexPath)
  ? JSON.parse(fs.readFileSync(indexPath, 'utf8'))
  : await buildIndexFromKaikki()

// ---- 候補抽出（頻度順） ----
let candCount = 0
const candidates = [] // {word, gloss, pos}
const seen = new Set()
for (const line of freqRaw.split('\n')) {
  const w = line.split(/\s+/)[0]
  if (!w) continue
  const word = w.toLowerCase()
  if (seen.has(word)) continue
  // フィルタ
  if (word.length < 3) continue
  if (!FRENCH_WORD.test(word)) continue
  if (STOPWORDS.has(word)) continue
  if (PROFANITY.has(word)) continue
  seen.add(word)
  candCount++
  // 人手オーバーライド最優先（null は非出荷）
  if (Object.prototype.hasOwnProperty.call(OVERRIDES, word)) {
    const ov = OVERRIDES[word]
    if (ov === null) continue // 機能語/活用形相当 → 非出荷
    // POS は辞書から推定（動詞なら "to " 始まり）
    const posGuess = /^to\s/.test(ov) ? 'verb' : (index[word]?.[0]?.pos ?? 'noun')
    candidates.push({ word, gloss: ov, pos: posGuess })
    if (candidates.length >= TARGET_TOTAL) break
    continue
  }
  const entries = index[word]
  if (!entries || !entries.length) continue // 辞書に無い → スキップ
  const central = pickCentral(entries)
  if (!central) continue // 中心義が確定できない（曖昧/説明的のみ） → スキップ
  candidates.push({ word, gloss: central.gloss, pos: central.pos })
  if (candidates.length >= TARGET_TOTAL) break
}

const hit = candidates.length

// ---- 重複 gloss の間引きは行わない（同義でも別見出しなら別問題として有効）。
//      ただし完全に同一 (word,gloss) の重複のみ排除（seen で既に単語重複は排除済み）。----

// ---- gloss.en.french.json 出力 ----
const glossMap = {}
for (const c of candidates) glossMap[c.word] = c.gloss
fs.writeFileSync(path.join(toolsDir, 'gloss.en.french.json'), JSON.stringify(glossMap, null, 2))

// ---- レベル分割（頻度順を5等分） ----
const per = Math.ceil(candidates.length / 5)
for (let i = 0; i < candidates.length; i++) {
  candidates[i].level = Math.min(5, Math.floor(i / per) + 1)
}

// ---- ダミー選択肢生成 ----
function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}
const byPos = new Map()
for (const c of candidates) {
  if (!byPos.has(c.pos)) byPos.set(c.pos, [])
  byPos.get(c.pos).push(c)
}
function pickDistractors(target) {
  const used = new Set([target.gloss])
  const out = []
  const pool = byPos.get(target.pos) ?? []
  for (const c of shuffle(pool)) {
    if (out.length >= 3) break
    if (used.has(c.gloss)) continue
    used.add(c.gloss)
    out.push(c.gloss)
  }
  if (out.length < 3) {
    for (const c of shuffle(candidates)) {
      if (out.length >= 3) break
      if (used.has(c.gloss)) continue
      used.add(c.gloss)
      out.push(c.gloss)
    }
  }
  return out.slice(0, 3)
}

// ---- Question 生成 ----
// 日本語ネイティブ向けの確定訳(ピボット+意味検証済み)を取り込む。無ければ英語のみ。
const jaGlossPathFr = path.join(toolsDir, 'gloss.ja.french.json')
const jaGlossFr = fs.existsSync(jaGlossPathFr) ? JSON.parse(fs.readFileSync(jaGlossPathFr, 'utf8')) : {}
const questions = candidates
  .map((c, i) => ({
    id: `fr-${String(i + 1).padStart(5, '0')}`,
    category: 'french',
    prompt: `「${c.word}」の意味は？`,
    answer: c.gloss,
    choices: shuffle([c.gloss, ...pickDistractors(c)]),
    difficulty: c.level,
    tags: ['word'],
    glosses: jaGlossFr[c.word] ? { en: c.gloss, ja: jaGlossFr[c.word] } : { en: c.gloss },
    verified: true,
  }))
  .filter((q) => new Set(q.choices).size === 4)

// ---- 出力 ----
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
      category: 'french',
      total: questions.length,
      verified: questions.length,
      levels: manifestLevels,
      source: 'FrequencyWords fr_50k (hermitdave, CC BY 4.0) + Wiktionary/Wiktextract 英語義 (kaikki.org)',
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)

// ---- コンソール報告 ----
console.log('=== build-french ===')
console.log('候補数(フィルタ後・頻度リスト走査):', candCount)
console.log('辞書ヒット(中心義確定=生成候補):', hit)
console.log('ヒット率:', ((hit / candCount) * 100).toFixed(1) + '%')
console.log('生成数(4択成立):', questions.length)
for (const l of manifestLevels) console.log(`  level ${l.level}: ${l.count}`)
