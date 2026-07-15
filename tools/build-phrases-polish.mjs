// ============================================================================
// build-phrases-polish.mjs  ポーランド語「よく使う表現集」ワードバンク生成（日本人向け）
// 標準ポーランド語(język standardowy)で実際に頻用される定番表現のみを厳選。
// 方言・強い俗語・文化依存の慣用句は除外し精度100%優先。男女で形が変わる表現は注記。
// pronunciation に日本語話者向けローマ字読み(近似発音)を格納。3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/polish/phrases.json … Question[] (tags:['phrase',theme], pronunciation)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'polish')

// [ポーランド語表現, ローマ字読み(近似発音), 日本語訳, テーマ, レベル(1/2/3)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Dzień dobry.', 'jień dobri', 'こんにちは', 'greeting', 1],
  ['Dobry wieczór.', 'dobri viechur', 'こんばんは', 'greeting', 1],
  ['Dobranoc.', 'dobranots', 'おやすみなさい', 'greeting', 1],
  ['Cześć.', 'cheshch', 'やあ（親しい挨拶）', 'greeting', 1],
  ['Do widzenia.', 'do vidzenia', 'さようなら', 'greeting', 1],
  ['Do zobaczenia.', 'do zobachenia', 'またね', 'greeting', 1],
  ['Na razie.', 'na raje', 'じゃあね', 'greeting', 1],
  ['Do jutra.', 'do yutra', 'また明日', 'greeting', 1],
  ['Jak się masz?', 'yak shen mash', '元気？', 'greeting', 1],
  ['Co słychać?', 'tso swihach', '調子はどう？', 'greeting', 2],
  ['Miło mi.', 'miwo mi', 'はじめまして', 'greeting', 2],
  ['Witam.', 'vitam', 'ようこそ', 'greeting', 2],
  ['Dawno się nie widzieliśmy.', 'davno shen nie vijelishmi', 'お久しぶりです', 'greeting', 2],

  // ===== 返事・相づち reply =====
  ['Tak.', 'tak', 'はい', 'reply', 1],
  ['Nie.', 'nie', 'いいえ', 'reply', 1],
  ['Dobrze.', 'dobje', 'わかりました', 'reply', 1],
  ['Oczywiście.', 'ochivishche', 'もちろん', 'reply', 1],
  ['Naprawdę?', 'napravden', '本当に？', 'reply', 1],
  ['Ja też.', 'ya tesh', '私も', 'reply', 1],
  ['Rozumiem.', 'rozumiem', 'なるほど（理解しました）', 'reply', 1],
  ['Nie wiem.', 'nie viem', '知りません', 'reply', 1],
  ['Może.', 'moje', 'たぶん', 'reply', 1],
  ['Zgadza się.', 'zgadza shen', 'その通りです', 'reply', 2],
  ['Nie ma sprawy.', 'nie ma spravi', '問題ないよ', 'reply', 2],
  ['Zgadzam się.', 'zgadzam shen', '賛成です', 'reply', 2],
  ['Masz rację.', 'mash ratsyen', 'あなたの言う通りです', 'reply', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['Dziękuję.', 'jenkuye', 'ありがとう', 'request', 1],
  ['Dziękuję bardzo.', 'jenkuye bardzo', 'どうもありがとう', 'request', 1],
  ['Proszę.', 'proshen', 'どうぞ', 'request', 1],
  ['Nie ma za co.', 'nie ma za tso', 'どういたしまして', 'request', 1],
  ['Przepraszam.', 'psheprasham', 'ごめんなさい', 'request', 1],
  ['Poproszę.', 'poproshen', 'お願いします', 'request', 1],
  ['Przepraszam, że przeszkadzam.', 'psheprasham je psheshkadzam', 'お邪魔してすみません', 'request', 2],
  ['Czy mógłby mi pan pomóc?', 'chi mugwbi mi pan pomuts', '手伝っていただけますか？（男性へ）', 'request', 2],
  ['Czy może pan powtórzyć?', 'chi moje pan povtujich', 'もう一度言っていただけますか？', 'request', 2],
  ['Proszę mówić wolniej.', 'proshen muvich volniey', 'ゆっくり話してください', 'request', 2],

  // ===== 買い物・食事 shop =====
  ['Ile to kosztuje?', 'ile to koshtuye', 'これはいくらですか？', 'shop', 1],
  ['To za drogo.', 'to za drogo', '高すぎます', 'shop', 1],
  ['Poproszę to.', 'poproshen to', 'これをください', 'shop', 1],
  ['Poproszę kawę.', 'poproshen kaven', 'コーヒーをください', 'shop', 1],
  ['Poproszę wodę.', 'poproshen voden', '水をください', 'shop', 1],
  ['Płacę kartą.', 'pwatsen karton', 'カードで払います', 'shop', 2],
  ['Czy mogę zapłacić kartą?', 'chi mogen zapwachich karton', 'カードで払えますか？', 'shop', 2],
  ['Rachunek proszę.', 'rahunek proshen', 'お会計をお願いします', 'shop', 2],
  ['Czy mogę prosić o menu?', 'chi mogen proshich o menu', 'メニューをもらえますか？', 'shop', 2],
  ['To wszystko.', 'to fshistko', '以上です', 'shop', 2],
  ['Smacznego!', 'smachnego', '召し上がれ（食事前に）', 'shop', 2],
  ['Było pyszne.', 'biwo pishne', 'おいしかったです', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['Gdzie jest toaleta?', 'gjie yest toaleta', 'トイレはどこですか？', 'travel', 1],
  ['Gdzie jest dworzec?', 'gjie yest dvojets', '駅はどこですか？', 'travel', 1],
  ['Poproszę bilet.', 'poproshen bilet', '切符をください', 'travel', 1],
  ['Czy to daleko?', 'chi to daleko', '遠いですか？', 'travel', 1],
  ['Gdzie jest przystanek?', 'gjie yest pshistanek', 'バス停はどこですか？', 'travel', 2],
  ['Proszę iść prosto.', 'proshen ishch prosto', 'まっすぐ行ってください', 'travel', 2],
  ['Proszę skręcić w lewo.', 'proshen skrenchich v levo', '左に曲がってください', 'travel', 2],
  ['Proszę skręcić w prawo.', 'proshen skrenchich v pravo', '右に曲がってください', 'travel', 2],
  ['Szukam hotelu.', 'shukam hotelu', 'ホテルを探しています', 'travel', 2],
  ['O której godzinie?', 'o kturey gojinie', '何時ですか？', 'travel', 2],
  ['Zgubiłem się.', 'zgubiwem shen', '道に迷いました（男性）', 'travel', 2],

  // ===== 気持ち feeling =====
  ['Jestem głodny.', 'yestem gwodni', 'お腹がすきました（男性）', 'feeling', 1],
  ['Jestem zmęczony.', 'yestem zmenchoni', '疲れました（男性）', 'feeling', 1],
  ['Lubię to.', 'lubien to', 'これが好きです', 'feeling', 1],
  ['Jestem szczęśliwy.', 'yestem shchenshlivi', '幸せです（男性）', 'feeling', 2],
  ['Cieszę się.', 'cheshen shen', 'うれしいです', 'feeling', 2],
  ['Bardzo mi przykro.', 'bardzo mi pshikro', 'とても残念です', 'feeling', 2],
  ['Nie lubię tego.', 'nie lubien tego', 'これは好きではありません', 'feeling', 2],
  ['Kocham cię.', 'koham chen', '愛しています', 'feeling', 2],
  ['Tęsknię za tobą.', 'tensknien za tobon', 'あなたが恋しいです', 'feeling', 3],

  // ===== 困ったとき trouble =====
  ['Pomocy!', 'pomotsi', '助けて！', 'trouble', 1],
  ['Uwaga!', 'uvaga', '気をつけて！', 'trouble', 1],
  ['Nie rozumiem.', 'nie rozumiem', 'わかりません', 'trouble', 1],
  ['Nie mówię po polsku.', 'nie muvien po polsku', 'ポーランド語を話せません', 'trouble', 2],
  ['Czy mówi pan po angielsku?', 'chi muvi pan po angielsku', '英語を話せますか？（男性へ）', 'trouble', 2],
  ['Źle się czuję.', 'jle shen chuye', '気分が悪いです', 'trouble', 2],
  ['Zgubiłem portfel.', 'zgubiwem portfel', '財布をなくしました（男性）', 'trouble', 2],
  ['Proszę zadzwonić po policję.', 'proshen zadzvonich po politsyen', '警察を呼んでください', 'trouble', 3],

  // ===== 電話 phone =====
  ['Halo?', 'halo', 'もしもし？', 'phone', 1],
  ['Kto mówi?', 'kto muvi', 'どちら様ですか？', 'phone', 2],
  ['Chwileczkę.', 'hvilechken', '少々お待ちください', 'phone', 2],
  ['Oddzwonię później.', 'oddzvonien puźniey', 'あとで折り返します', 'phone', 3],

  // ===== 雑談 smalltalk =====
  ['Jak masz na imię?', 'yak mash na imie', '名前は何ですか？', 'smalltalk', 1],
  ['Nazywam się...', 'nazivam shen', '私の名前は…です', 'smalltalk', 1],
  ['Skąd jesteś?', 'skont yestesh', 'どこ出身ですか？', 'smalltalk', 1],
  ['Jestem z Japonii.', 'yestem z yaponii', '日本出身です', 'smalltalk', 1],
  ['Miłego dnia!', 'miwego dnia', 'よい一日を！', 'smalltalk', 1],
  ['Powodzenia!', 'povodzenia', 'がんばって！（幸運を！）', 'smalltalk', 1],
  ['Na zdrowie!', 'na zdrovie', '乾杯！', 'smalltalk', 1],
  ['Gratulacje!', 'gratulatsye', 'おめでとう！', 'smalltalk', 1],
  ['Ile masz lat?', 'ile mash lat', '何歳ですか？', 'smalltalk', 2],
  ['Wszystkiego najlepszego!', 'fshistkiego naylepshego', 'ご多幸をお祈りします', 'smalltalk', 2],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// --- 日本語訳の一意性チェック（重複0が必須。distractorが答えと衝突しないため） ---
const jaList = PHRASES.map((p) => p[2])
const jaDup = jaList.filter((v, i) => jaList.indexOf(v) !== i)
if (jaDup.length) {
  console.error('BLOCKED: 日本語訳が重複しています:', [...new Set(jaDup)])
  process.exit(1)
}
const plList = PHRASES.map((p) => p[0])
const plDup = plList.filter((v, i) => plList.indexOf(v) !== i)
if (plDup.length) {
  console.error('BLOCKED: 表現(ポーランド語)が重複しています:', [...new Set(plDup)])
  process.exit(1)
}

const allJa = PHRASES.map(([, , ja]) => ja)

const questions = PHRASES.map(([pl, pron, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `plph-${String(i + 1).padStart(4, '0')}`,
    category: 'polish',
    prompt: `「${pl}」の意味は？`,
    answer: ja,
    glosses: { ja },
    choices: shuffle([ja, ...distract]),
    difficulty: level,
    tags: ['phrase', theme],
    pronunciation: pron,
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))

const byLevel = { 1: 0, 2: 0, 3: 0 }
for (const [, , , , lv] of PHRASES) byLevel[lv]++
console.log('ポーランド語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
if (questions.length !== PHRASES.length) {
  console.warn('注意: 選択肢重複でフィルタされた表現があります', PHRASES.length - questions.length)
}
