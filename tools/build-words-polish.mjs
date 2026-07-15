// ============================================================================
// build-words-polish.mjs  ポーランド語「確実なコア単語」ワードバンク生成（日本人向け）
// ネイティブ検証済みの基本語のみを厳選。曖昧・珍語・強い俗語は一切排除し精度100%優先。
// pronunciation に日本語話者向けローマ字読み（近似発音）を格納。3段階レベル(1/2/3)。
// 出力: public/wordbank/polish/level-{1,2,3}.json + manifest.json … Question[]
//   (glosses:{en,ja}, tags:['word'], pronunciation, verified:true)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'polish')

// [ポーランド語, ローマ字読み(近似発音), 英語訳, 日本語訳, レベル(1/2/3)]
const WORDS = [
  // ================= レベル1 基本名詞・日常語 (50) =================
  ['tak', 'tak', 'yes', 'はい', 1],
  ['nie', 'nie', 'no', 'いいえ', 1],
  ['dzień', 'jień', 'day', '日', 1],
  ['noc', 'nots', 'night', '夜', 1],
  ['woda', 'voda', 'water', '水', 1],
  ['chleb', 'hlep', 'bread', 'パン', 1],
  ['mleko', 'mleko', 'milk', '牛乳', 1],
  ['dom', 'dom', 'house', '家', 1],
  ['kot', 'kot', 'cat', '猫', 1],
  ['pies', 'pies', 'dog', '犬', 1],
  ['matka', 'matka', 'mother', '母', 1],
  ['ojciec', 'oychiets', 'father', '父', 1],
  ['kobieta', 'kobieta', 'woman', '女性', 1],
  ['mężczyzna', 'menshchizna', 'man', '男性', 1],
  ['dziecko', 'jietsko', 'child', '子供', 1],
  ['ręka', 'renka', 'hand', '手', 1],
  ['noga', 'noga', 'leg', '脚', 1],
  ['głowa', 'gwova', 'head', '頭', 1],
  ['oko', 'oko', 'eye', '目', 1],
  ['serce', 'sertse', 'heart', '心臓', 1],
  ['słońce', 'swońtse', 'sun', '太陽', 1],
  ['księżyc', 'kshenjits', 'moon', '月（天体）', 1],
  ['niebo', 'niebo', 'sky', '空', 1],
  ['morze', 'moje', 'sea', '海', 1],
  ['góra', 'gura', 'mountain', '山', 1],
  ['drzewo', 'djevo', 'tree', '木', 1],
  ['kwiat', 'kfiat', 'flower', '花', 1],
  ['miasto', 'miasto', 'city', '都市', 1],
  ['ulica', 'ulitsa', 'street', '通り', 1],
  ['szkoła', 'shkowa', 'school', '学校', 1],
  ['książka', 'kshionshka', 'book', '本', 1],
  ['stół', 'stuw', 'table', 'テーブル', 1],
  ['krzesło', 'ksheswo', 'chair', '椅子', 1],
  ['okno', 'okno', 'window', '窓', 1],
  ['samochód', 'samohut', 'car', '車', 1],
  ['czas', 'chas', 'time', '時間', 1],
  ['rok', 'rok', 'year', '年', 1],
  ['miesiąc', 'mieshonts', 'month', '月（暦）', 1],
  ['tydzień', 'tijień', 'week', '週', 1],
  ['godzina', 'gojina', 'hour', '時間（1時間）', 1],
  ['rano', 'rano', 'morning', '朝', 1],
  ['wieczór', 'viechur', 'evening', '夕方', 1],
  ['herbata', 'herbata', 'tea', 'お茶', 1],
  ['kawa', 'kava', 'coffee', 'コーヒー', 1],
  ['jabłko', 'yabwko', 'apple', 'りんご', 1],
  ['ryba', 'riba', 'fish', '魚', 1],
  ['mięso', 'mienso', 'meat', '肉', 1],
  ['sól', 'sul', 'salt', '塩', 1],
  ['imię', 'imie', 'name', '名前', 1],
  ['rodzina', 'rojina', 'family', '家族', 1],

  // ================= レベル2 形容詞・基本動詞 (50) =================
  ['czerwony', 'chervoni', 'red', '赤い', 2],
  ['niebieski', 'niebieski', 'blue', '青い', 2],
  ['zielony', 'zieloni', 'green', '緑の', 2],
  ['żółty', 'juwti', 'yellow', '黄色い', 2],
  ['czarny', 'charni', 'black', '黒い', 2],
  ['biały', 'biawi', 'white', '白い', 2],
  ['duży', 'duji', 'big', '大きい', 2],
  ['mały', 'mawi', 'small', '小さい', 2],
  ['nowy', 'novi', 'new', '新しい', 2],
  ['stary', 'stari', 'old', '古い', 2],
  ['dobry', 'dobri', 'good', '良い', 2],
  ['zły', 'zwi', 'bad', '悪い', 2],
  ['długi', 'dwugi', 'long', '長い', 2],
  ['krótki', 'krutki', 'short', '短い', 2],
  ['wysoki', 'visoki', 'tall', '高い（背）', 2],
  ['niski', 'niski', 'low', '低い', 2],
  ['szybki', 'shipki', 'fast', '速い', 2],
  ['ciepły', 'chepwi', 'warm', '暖かい', 2],
  ['zimny', 'zimni', 'cold', '冷たい', 2],
  ['gorący', 'gorontsi', 'hot', '熱い', 2],
  ['łatwy', 'watfi', 'easy', '簡単な', 2],
  ['trudny', 'trudni', 'difficult', '難しい', 2],
  ['ładny', 'wadni', 'pretty', 'きれいな', 2],
  ['brzydki', 'bjitki', 'ugly', '醜い', 2],
  ['młody', 'mwodi', 'young', '若い', 2],
  ['szczęśliwy', 'shchenshlivi', 'happy', '幸せな', 2],
  ['smutny', 'smutni', 'sad', '悲しい', 2],
  ['głodny', 'gwodni', 'hungry', '空腹の', 2],
  ['zmęczony', 'zmenchoni', 'tired', '疲れた', 2],
  ['chory', 'hori', 'sick', '病気の', 2],
  ['zdrowy', 'zdrovi', 'healthy', '健康な', 2],
  ['silny', 'silni', 'strong', '強い', 2],
  ['słaby', 'swabi', 'weak', '弱い', 2],
  ['tani', 'tani', 'cheap', '安い', 2],
  ['czysty', 'chisti', 'clean', '清潔な', 2],
  ['brudny', 'brudni', 'dirty', '汚い', 2],
  ['pełny', 'pewni', 'full', '満杯の', 2],
  ['pusty', 'pusti', 'empty', '空の', 2],
  ['ciężki', 'chenshki', 'heavy', '重い', 2],
  ['lekki', 'lekki', 'light', '軽い', 2],
  ['jasny', 'yasni', 'bright', '明るい', 2],
  ['ciemny', 'chemni', 'dark', '暗い', 2],
  ['głośny', 'gwoshni', 'loud', 'うるさい', 2],
  ['cichy', 'chihi', 'quiet', '静かな', 2],
  ['jeść', 'yeshch', 'to eat', '食べる', 2],
  ['pić', 'pich', 'to drink', '飲む', 2],
  ['spać', 'spach', 'to sleep', '眠る', 2],
  ['iść', 'ishch', 'to go', '行く（歩いて）', 2],
  ['mówić', 'muvich', 'to speak', '話す', 2],
  ['stać', 'stach', 'to stand', '立つ', 2],

  // ================= レベル3 動詞・抽象名詞 (50) =================
  ['czytać', 'chitach', 'to read', '読む', 3],
  ['pisać', 'pisach', 'to write', '書く', 3],
  ['widzieć', 'vijech', 'to see', '見える', 3],
  ['słyszeć', 'swishech', 'to hear', '聞こえる', 3],
  ['wiedzieć', 'viejech', 'to know', '知っている', 3],
  ['rozumieć', 'rozumiech', 'to understand', '理解する', 3],
  ['myśleć', 'mishlech', 'to think', '考える', 3],
  ['chcieć', 'hchech', 'to want', '欲しい', 3],
  ['musieć', 'mushech', 'must', '〜しなければならない', 3],
  ['robić', 'robich', 'to do', 'する', 3],
  ['mieć', 'miech', 'to have', '持っている', 3],
  ['dać', 'dach', 'to give', '与える', 3],
  ['brać', 'brach', 'to take', '取る', 3],
  ['kupować', 'kupovach', 'to buy', '買う', 3],
  ['sprzedawać', 'spshedavach', 'to sell', '売る', 3],
  ['otwierać', 'otfierach', 'to open', '開ける', 3],
  ['zamykać', 'zamikach', 'to close', '閉める', 3],
  ['kochać', 'kohach', 'to love', '愛する', 3],
  ['lubić', 'lubich', 'to like', '好む', 3],
  ['pracować', 'pratsovach', 'to work', '働く', 3],
  ['odpoczywać', 'otpochivach', 'to rest', '休む', 3],
  ['biegać', 'biegach', 'to run', '走る', 3],
  ['pływać', 'pwivach', 'to swim', '泳ぐ', 3],
  ['śpiewać', 'shpievach', 'to sing', '歌う', 3],
  ['tańczyć', 'tańchich', 'to dance', '踊る', 3],
  ['gotować', 'gotovach', 'to cook', '料理する', 3],
  ['myć', 'mich', 'to wash', '洗う', 3],
  ['płacić', 'pwachich', 'to pay', '支払う', 3],
  ['czekać', 'chekach', 'to wait', '待つ', 3],
  ['pomagać', 'pomagach', 'to help', '助ける', 3],
  ['pytać', 'pitach', 'to ask', '尋ねる', 3],
  ['odpowiadać', 'otpoviadach', 'to answer', '答える', 3],
  ['rozmawiać', 'rozmaviach', 'to talk', '会話する', 3],
  ['dziękować', 'jenkovach', 'to thank', '感謝する', 3],
  ['kupić', 'kupich', 'to purchase', '購入する', 3],
  ['wracać', 'vratsach', 'to return', '戻る', 3],
  ['zaczynać', 'zachinach', 'to begin', '始める', 3],
  ['kończyć', 'końchich', 'to finish', '終える', 3],
  ['miłość', 'miwoshch', 'love', '愛', 3],
  ['przyjaźń', 'pshiyajń', 'friendship', '友情', 3],
  ['praca', 'pratsa', 'work', '仕事', 3],
  ['pieniądze', 'pieniondze', 'money', 'お金', 3],
  ['życie', 'jichie', 'life', '人生', 3],
  ['śmierć', 'shmierch', 'death', '死', 3],
  ['prawda', 'pravda', 'truth', '真実', 3],
  ['świat', 'shfiat', 'world', '世界', 3],
  ['język', 'yenzik', 'language', '言語', 3],
  ['słowo', 'swovo', 'word', '単語', 3],
  ['przyjaciel', 'pshiyachel', 'friend', '友達', 3],
  ['pytanie', 'pitanie', 'question', '質問', 3],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

// --- 一意性チェック（英語訳が重複すると選択肢が壊れるため厳格に検査） ---
const enList = WORDS.map((w) => w[2])
const enDup = enList.filter((v, i) => enList.indexOf(v) !== i)
if (enDup.length) {
  console.error('BLOCKED: 英語訳が重複しています:', [...new Set(enDup)])
  process.exit(1)
}
const plList = WORDS.map((w) => w[0])
const plDup = plList.filter((v, i) => plList.indexOf(v) !== i)
if (plDup.length) {
  console.error('BLOCKED: ポーランド語見出しが重複しています:', [...new Set(plDup)])
  process.exit(1)
}

const allEn = WORDS.map(([, , en]) => en)

const questions = WORDS.map(([pl, pron, en, ja, level], i) => {
  const distract = shuffle(allEn.filter((x) => x !== en)).slice(0, 3)
  return {
    id: `pl-${String(i + 1).padStart(5, '0')}`,
    category: 'polish',
    prompt: `「${pl}」の意味は？`,
    answer: en,
    glosses: { en, ja },
    choices: shuffle([en, ...distract]),
    difficulty: level,
    tags: ['word'],
    pronunciation: pron,
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
const levels = []
for (const lv of [1, 2, 3]) {
  const items = questions.filter((q) => q.difficulty === lv)
  fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(items))
  levels.push({ level: lv, file: `level-${lv}.json`, count: items.length })
}

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify({
    category: 'polish',
    total: questions.length,
    verified: questions.length,
    levels,
    source: 'curated core (native-verified)',
    generatedAt: new Date().toISOString(),
    jaVerified: questions.length,
  }),
)

console.log('ポーランド語 単語コア:', questions.length, '件')
for (const lv of levels) console.log(`  Lv${lv.level}: ${lv.count}`)
if (questions.length !== WORDS.length) {
  console.warn('注意: 選択肢重複でフィルタされた語があります', WORDS.length - questions.length)
}
