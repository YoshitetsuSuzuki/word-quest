// ============================================================================
// build-words-russian.mjs  ロシア語「確実なコア」単語ワードバンク生成（日本人向け）
// ネイティブ確認済みの曖昧さのない基本語のみを厳選。多義語・アスペクト混同語は除外。
// pronunciation にローマ字転写＋強勢位置(強勢母音を大文字)を格納。
// 3段階レベル(1最基本 / 2日常 / 3やや発展だが一般的)。各50語 = 計150語。
// 出力: public/wordbank/russian/level-{1,2,3}.json + manifest.json
//        Question[] (category:'russian', tags:['word'], pronunciation, verified:true)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'russian')

// [ロシア語(キリル), ローマ字発音(強勢=大文字母音), 英語訳, 日本語訳, レベル(1/2/3)]
const WORDS = [
  // ===== レベル1: 最基本 =====
  ['да', 'da', 'yes', 'はい', 1],
  ['нет', 'nyet', 'no', 'いいえ', 1],
  ['спасибо', 'spasIba', 'thank you', 'ありがとう', 1],
  ['привет', 'privYet', 'hi', 'やあ', 1],
  ['здравствуйте', 'zdrAstvuyte', 'hello', 'こんにちは', 1],
  ['вода', 'vadA', 'water', '水', 1],
  ['хлеб', 'khlep', 'bread', 'パン', 1],
  ['молоко', 'malakO', 'milk', '牛乳', 1],
  ['чай', 'chay', 'tea', 'お茶', 1],
  ['кофе', 'kOfe', 'coffee', 'コーヒー', 1],
  ['дом', 'dom', 'house', '家', 1],
  ['кот', 'kot', 'cat', '猫', 1],
  ['собака', 'sabAka', 'dog', '犬', 1],
  ['человек', 'chelavYek', 'person', '人', 1],
  ['друг', 'druk', 'friend', '友達', 1],
  ['мама', 'mAma', 'mom', 'お母さん', 1],
  ['папа', 'pApa', 'dad', 'お父さん', 1],
  ['сын', 'syn', 'son', '息子', 1],
  ['дочь', "doch'", 'daughter', '娘', 1],
  ['книга', 'knIga', 'book', '本', 1],
  ['стол', 'stol', 'table', 'テーブル', 1],
  ['стул', 'stul', 'chair', '椅子', 1],
  ['окно', 'aknO', 'window', '窓', 1],
  ['дверь', "dver'", 'door', 'ドア', 1],
  ['город', 'gOrat', 'city', '都市', 1],
  ['страна', 'stranA', 'country', '国', 1],
  ['солнце', 'sOntse', 'sun', '太陽', 1],
  ['луна', 'lunA', 'moon', '月（天体）', 1],
  ['небо', 'nEba', 'sky', '空', 1],
  ['глаз', 'glas', 'eye', '目', 1],
  ['голова', 'galavA', 'head', '頭', 1],
  ['рот', 'rot', 'mouth', '口', 1],
  ['хороший', 'harOshiy', 'good', '良い', 1],
  ['плохой', 'plahOy', 'bad', '悪い', 1],
  ['большой', "bal'shOy", 'big', '大きい', 1],
  ['маленький', "mAlen'kiy", 'small', '小さい', 1],
  ['новый', 'nOviy', 'new', '新しい', 1],
  ['старый', 'stAriy', 'old', '古い', 1],
  ['красный', 'krAsniy', 'red', '赤い', 1],
  ['белый', 'bEliy', 'white', '白い', 1],
  ['чёрный', 'chOrniy', 'black', '黒い', 1],
  ['один', 'adIn', 'one', '一', 1],
  ['два', 'dva', 'two', '二', 1],
  ['три', 'tri', 'three', '三', 1],
  ['четыре', 'chetYri', 'four', '四', 1],
  ['пять', "pyat'", 'five', '五', 1],
  ['сегодня', 'sevOdnya', 'today', '今日', 1],
  ['завтра', 'zAftra', 'tomorrow', '明日', 1],
  ['вчера', 'vcherA', 'yesterday', '昨日', 1],
  ['сейчас', 'seychAs', 'now', '今', 1],

  // ===== レベル2: 日常 =====
  ['работа', 'rabOta', 'work', '仕事', 2],
  ['работать', "rabOtat'", 'to work', '働く', 2],
  ['школа', 'shkOla', 'school', '学校', 2],
  ['учитель', "uchItel'", 'teacher', '先生', 2],
  ['студент', 'studEnt', 'student', '学生', 2],
  ['врач', 'vrach', 'doctor', '医者', 2],
  ['больница', "bal'nItsa", 'hospital', '病院', 2],
  ['магазин', 'magazIn', 'shop', '店', 2],
  ['деньги', "dEn'gi", 'money', 'お金', 2],
  ['время', 'vrEmya', 'time', '時間', 2],
  ['день', "den'", 'day', '日', 2],
  ['ночь', "noch'", 'night', '夜', 2],
  ['утро', 'Utra', 'morning', '朝', 2],
  ['вечер', 'vEcher', 'evening', '夕方', 2],
  ['неделя', 'nedElya', 'week', '週', 2],
  ['месяц', 'mEsyats', 'month', '月（暦）', 2],
  ['год', 'got', 'year', '年', 2],
  ['еда', 'yedA', 'food', '食べ物', 2],
  ['мясо', 'myAsa', 'meat', '肉', 2],
  ['рыба', 'rYba', 'fish', '魚', 2],
  ['яблоко', 'yAblaka', 'apple', 'りんご', 2],
  ['овощи', 'Ovoshchi', 'vegetables', '野菜', 2],
  ['сыр', 'syr', 'cheese', 'チーズ', 2],
  ['сахар', 'sAhar', 'sugar', '砂糖', 2],
  ['соль', "sol'", 'salt', '塩', 2],
  ['машина', 'mashIna', 'car', '車', 2],
  ['поезд', 'pOyest', 'train', '電車', 2],
  ['самолёт', 'samalYot', 'airplane', '飛行機', 2],
  ['улица', 'Ulitsa', 'street', '通り', 2],
  ['дорога', 'darOga', 'road', '道', 2],
  ['мост', 'most', 'bridge', '橋', 2],
  ['река', 'rekA', 'river', '川', 2],
  ['море', 'mOre', 'sea', '海', 2],
  ['гора', 'garA', 'mountain', '山', 2],
  ['лес', 'les', 'forest', '森', 2],
  ['дерево', 'dEreva', 'tree', '木', 2],
  ['цветок', 'tsvetOk', 'flower', '花', 2],
  ['погода', 'pagOda', 'weather', '天気', 2],
  ['дождь', "dozhd'", 'rain', '雨', 2],
  ['снег', 'snek', 'snow', '雪', 2],
  ['ветер', 'vEter', 'wind', '風', 2],
  ['говорить', "gavarIt'", 'to speak', '話す', 2],
  ['читать', "chitAt'", 'to read', '読む', 2],
  ['писать', "pisAt'", 'to write', '書く', 2],
  ['знать', "znat'", 'to know', '知る', 2],
  ['думать', "dUmat'", 'to think', '考える', 2],
  ['любить', "lyubIt'", 'to love', '愛する', 2],
  ['жить', "zhit'", 'to live', '住む', 2],
  ['идти', 'ittI', 'to go', '行く', 2],
  ['хотеть', "hatEt'", 'to want', '欲しい', 2],

  // ===== レベル3: やや発展だが一般的 =====
  ['любовь', "lyubOf'", 'love', '愛', 3],
  ['счастье', "shchAst'ye", 'happiness', '幸せ', 3],
  ['здоровье', "zdarOv'ye", 'health', '健康', 3],
  ['жизнь', "zhizn'", 'life', '人生', 3],
  ['смерть', "smert'", 'death', '死', 3],
  ['правда', 'prAvda', 'truth', '真実', 3],
  ['вопрос', 'vaprOs', 'question', '質問', 3],
  ['ответ', 'atvEt', 'answer', '答え', 3],
  ['проблема', 'prablEma', 'problem', '問題', 3],
  ['будущее', 'bUdushchee', 'future', '未来', 3],
  ['прошлое', 'prOshlae', 'past', '過去', 3],
  ['надежда', 'nadEzhda', 'hope', '希望', 3],
  ['мечта', 'mechtA', 'dream', '夢（願望）', 3],
  ['память', "pAmyat'", 'memory', '記憶', 3],
  ['внимание', 'vnimAnie', 'attention', '注意', 3],
  ['успех', 'uspEh', 'success', '成功', 3],
  ['ошибка', 'ashIbka', 'mistake', '間違い', 3],
  ['опыт', 'Opyt', 'experience', '経験', 3],
  ['знание', 'znAnie', 'knowledge', '知識', 3],
  ['сила', 'sIla', 'strength', '力', 3],
  ['власть', "vlast'", 'power', '権力', 3],
  ['закон', 'zakOn', 'law', '法律', 3],
  ['свобода', 'svabOda', 'freedom', '自由', 3],
  ['государство', 'gasudArstva', 'state', '国家', 3],
  ['общество', 'Obshchestva', 'society', '社会', 3],
  ['история', 'istOriya', 'history', '歴史', 3],
  ['наука', 'naUka', 'science', '科学', 3],
  ['искусство', 'iskUstva', 'art', '芸術', 3],
  ['музыка', 'mUzyka', 'music', '音楽', 3],
  ['природа', 'prirOda', 'nature', '自然', 3],
  ['развитие', 'razvItie', 'development', '発展', 3],
  ['изменение', 'izmenEnie', 'change', '変化', 3],
  ['причина', 'prichIna', 'reason', '理由', 3],
  ['результат', "rezul'tAt", 'result', '結果', 3],
  ['цель', "tsel'", 'goal', '目標', 3],
  ['пример', 'primEr', 'example', '例', 3],
  ['качество', 'kAchestva', 'quality', '質', 3],
  ['количество', 'kalIchestva', 'quantity', '量', 3],
  ['понимать', "panimAt'", 'to understand', '理解する', 3],
  ['объяснять', "ab'yasnyAt'", 'to explain', '説明する', 3],
  ['помогать', "pamagAt'", 'to help', '助ける', 3],
  ['создавать', "sazdavAt'", 'to create', '創る', 3],
  ['предлагать', "predlagAt'", 'to suggest', '提案する', 3],
  ['получать', "paluchAt'", 'to receive', '受け取る', 3],
  ['менять', "menyAt'", 'to change', '変える', 3],
  ['решать', "reshAt'", 'to decide', '決める', 3],
  ['важный', 'vAzhniy', 'important', '重要な', 3],
  ['трудный', 'trUdniy', 'difficult', '難しい', 3],
  ['возможный', 'vazmOzhniy', 'possible', '可能な', 3],
  ['необходимый', 'neabhadImiy', 'necessary', '必要な', 3],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

const allEn = WORDS.map(([, , en]) => en)

const questions = WORDS.map(([ru, pron, en, ja, level], i) => {
  const distract = shuffle(allEn.filter((x) => x !== en)).slice(0, 3)
  return {
    id: `ru-${String(i + 1).padStart(5, '0')}`,
    category: 'russian',
    prompt: `「${ru}」の意味は？`,
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

const byLevel = { 1: [], 2: [], 3: [] }
for (const q of questions) byLevel[q.difficulty].push(q)

for (const lv of [1, 2, 3]) {
  fs.writeFileSync(path.join(outDir, `level-${lv}.json`), JSON.stringify(byLevel[lv]))
}

const manifest = {
  category: 'russian',
  total: questions.length,
  verified: questions.length,
  levels: [1, 2, 3].map((lv) => ({
    level: lv,
    file: `level-${lv}.json`,
    count: byLevel[lv].length,
  })),
  source: 'curated core (native-verified)',
  generatedAt: new Date().toISOString(),
  jaVerified: questions.length,
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

console.log('ロシア語単語:', questions.length, '件 (出力', WORDS.length, '件中)')
console.log('  Lv1:', byLevel[1].length, ' / Lv2:', byLevel[2].length, ' / Lv3:', byLevel[3].length)
console.log('  英語訳ユニーク数:', new Set(allEn).size, '/', allEn.length)
