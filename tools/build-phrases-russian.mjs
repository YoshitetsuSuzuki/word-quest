// ============================================================================
// build-phrases-russian.mjs  ロシア語「よく使う表現集」ワードバンク生成（日本人向け）
// ロシアで実際に頻用される定番表現のみを厳選。英語直訳・不自然な表現は除外し精度優先。
// pronunciation にローマ字転写＋強勢位置(強勢母音を大文字)を格納。3段階レベル。
// 出力: public/wordbank/russian/phrases.json … Question[] (tags:['phrase',theme], pronunciation)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'russian')

// [ロシア語表現, ローマ字発音(強勢=大文字母音), 日本語訳, テーマ, レベル]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Здравствуйте.', 'zdrAstvuyte', 'こんにちは（丁寧な挨拶）', 'greeting', 1],
  ['Привет!', 'privYet', 'やあ！', 'greeting', 1],
  ['Доброе утро.', 'dObrae Utra', 'おはようございます', 'greeting', 1],
  ['Добрый день.', "dObriy den'", 'こんにちは（昼の挨拶）', 'greeting', 1],
  ['Добрый вечер.', 'dObriy vEcher', 'こんばんは', 'greeting', 1],
  ['Спокойной ночи.', 'spakOynay nOchi', 'おやすみなさい', 'greeting', 1],
  ['До свидания.', 'da svidAniya', 'さようなら', 'greeting', 1],
  ['Пока!', 'pakA', 'じゃあね', 'greeting', 1],
  ['До завтра.', 'da zAftra', 'また明日', 'greeting', 1],
  ['Как дела?', 'kak delA', '元気？', 'greeting', 1],
  ['Как поживаете?', 'kak pazhivAete', 'お元気ですか？（丁寧）', 'greeting', 2],
  ['Рад вас видеть.', "rat vas vIdet'", 'お会いできてうれしいです', 'greeting', 2],
  ['Давно не виделись.', "davnO ne vIdelis'", 'お久しぶりです', 'greeting', 2],
  ['Приятно познакомиться.', "priyAtna paznakOmit'sa", 'はじめまして', 'greeting', 2],
  ['Добро пожаловать!', "dabrO pazhAlavat'", 'ようこそ！', 'greeting', 2],

  // ===== 返事・相づち reply =====
  ['Да.', 'da', 'はい', 'reply', 1],
  ['Нет.', 'nyet', 'いいえ', 'reply', 1],
  ['Конечно.', 'kanEshna', 'もちろん', 'reply', 1],
  ['Хорошо.', 'harashO', 'わかりました（了解）', 'reply', 1],
  ['Понятно.', 'panyAtna', 'なるほど', 'reply', 1],
  ['Я согласен.', 'ya saglAsen', '賛成です（男性）', 'reply', 2],
  ['Я не согласен.', 'ya ne saglAsen', '反対です', 'reply', 2],
  ['Может быть.', "mOzhet byt'", 'たぶん', 'reply', 2],
  ['Не знаю.', 'ne znAyu', 'わからない', 'reply', 1],
  ['Думаю, да.', 'dUmayu da', 'そう思います', 'reply', 2],
  ['Вы правы.', 'vy prAvy', 'おっしゃる通りです', 'reply', 2],
  ['Это правда.', 'Eta prAvda', 'それは本当です', 'reply', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['Спасибо.', 'spasIba', 'ありがとう', 'request', 1],
  ['Большое спасибо.', "bal'shOe spasIba", 'どうもありがとうございます', 'request', 1],
  ['Пожалуйста.', 'pazhAlusta', 'どういたしまして', 'request', 1],
  ['Извините.', 'izvinIte', 'すみません（謝罪・呼びかけ）', 'request', 1],
  ['Простите.', 'prastIte', 'ごめんなさい', 'request', 1],
  ['Ничего страшного.', 'nichevO strAshnava', '気にしないで', 'request', 2],
  ['Не за что.', 'nE za shta', 'とんでもないです（お礼への返し）', 'request', 2],
  ['Помогите, пожалуйста.', 'pamagIte pazhAlusta', '助けてください', 'request', 1],
  ['Можно вас спросить?', "mOzhna vas sprasIt'", 'お尋ねしてもいいですか？', 'request', 2],
  ['Повторите, пожалуйста.', 'paftarIte pazhAlusta', 'もう一度言ってください', 'request', 1],
  ['Говорите медленнее, пожалуйста.', 'gavarIte mEdlennee pazhAlusta', 'ゆっくり話してください', 'request', 2],
  ['Не могли бы вы помочь?', "ne maglI by vy pamOch'", '手伝っていただけますか？', 'request', 2],

  // ===== 日常 daily =====
  ['Подождите.', 'padazhdIte', '待ってください', 'daily', 1],
  ['Минутку.', 'minUtku', 'ちょっと待って', 'daily', 1],
  ['Всё хорошо.', 'fsyo harashO', '全部順調です', 'daily', 1],
  ['Не волнуйтесь.', "ne valnUytes'", '心配しないで', 'daily', 2],
  ['Я устал.', 'ya ustAl', '疲れた（男性）', 'daily', 1],
  ['Я голоден.', 'ya gOladen', 'お腹がすいた（男性）', 'daily', 1],
  ['Я хочу пить.', "ya hachU pit'", 'のどが渇いた', 'daily', 1],
  ['Удачи!', 'udAchi', 'がんばって！（幸運を）', 'daily', 1],
  ['Поздравляю!', 'pazdravlyAyu', 'おめでとう！', 'daily', 1],
  ['Приятного аппетита.', 'priyAtnava apetIta', 'どうぞ召し上がれ', 'daily', 2],
  ['Будьте здоровы.', "bUt'te zdarOvy", 'お大事に', 'daily', 2],

  // ===== 気持ち feeling =====
  ['Я рад.', 'ya rat', 'うれしい（男性）', 'feeling', 1],
  ['Я счастлив.', "ya shchAstlif", '幸せです（男性）', 'feeling', 2],
  ['Мне грустно.', 'mnye grUsna', '悲しい', 'feeling', 2],
  ['Мне скучно.', 'mnye skUshna', '退屈だ', 'feeling', 2],
  ['Как жаль.', "kak zhal'", '残念です', 'feeling', 2],
  ['Я боюсь.', "ya bayUs'", 'こわい', 'feeling', 2],
  ['Не беспокойтесь.', "ne bespakOytes'", 'ご心配なく', 'feeling', 2],
  ['Мне нравится.', 'mnye nrAvitsa', '気に入りました', 'feeling', 2],

  // ===== トラブル trouble =====
  ['Помогите!', 'pamagIte', '助けて！', 'trouble', 1],
  ['Осторожно!', 'astarOzhna', '気をつけて！', 'trouble', 1],
  ['Я заблудился.', "ya zabludIlsa", '道に迷いました（男性）', 'trouble', 2],
  ['Я потерял телефон.', 'ya paterYal telefOn', '携帯をなくしました', 'trouble', 2],
  ['Вызовите врача!', 'vYzavite vrachA', '医者を呼んでください！', 'trouble', 2],
  ['Вызовите полицию!', 'vYzavite palItsiyu', '警察を呼んでください！', 'trouble', 2],
  ['Мне нужна помощь.', "mnye nuzhnA pOmashch'", '助けが必要です', 'trouble', 2],
  ['Я плохо себя чувствую.', 'ya plOha sebyA chUvstvuyu', '気分が悪いです', 'trouble', 2],
  ['Здесь болит.', "zdes' balIt", 'ここが痛い', 'trouble', 2],

  // ===== 電話 phone =====
  ['Алло.', 'allO', 'もしもし', 'phone', 1],
  ['Кто это?', 'kto Eta', 'どちら様ですか？', 'phone', 2],
  ['Подождите минуту.', 'padazhdIte minUtu', '少々お待ちください', 'phone', 2],
  ['Перезвоните позже.', 'perezvanIte pOzzhe', 'あとでかけ直してください', 'phone', 2],
  ['Я вам перезвоню.', 'ya vam perezvanyU', '折り返します', 'phone', 2],
  ['Плохо слышно.', 'plOha slYshna', 'よく聞こえません', 'phone', 2],

  // ===== 雑談 smalltalk =====
  ['Как вас зовут?', 'kak vas zavUt', 'お名前は？', 'smalltalk', 1],
  ['Меня зовут...', 'menyA zavUt', '私の名前は…です', 'smalltalk', 1],
  ['Откуда вы?', 'atkUda vy', 'どちらのご出身ですか？', 'smalltalk', 2],
  ['Я из Японии.', 'ya iz yapOnii', '日本から来ました', 'smalltalk', 1],
  ['Сколько вам лет?', "skOl'ka vam let", 'おいくつですか？', 'smalltalk', 2],
  ['Какая сегодня погода?', 'kakAya sevOdnya pagOda', '今日の天気はどうですか？', 'smalltalk', 2],
  ['Хорошего дня!', 'harOsheva dnya', 'よい一日を！', 'smalltalk', 1],

  // ===== 買い物・食事 shop =====
  ['Сколько это стоит?', "skOl'ka Eta stOit", 'これはいくらですか？', 'shop', 1],
  ['Это дорого.', 'Eta dOraga', '高いです', 'shop', 1],
  ['Дайте это, пожалуйста.', 'dAyte Eta pazhAlusta', 'これをください', 'shop', 1],
  ['Очень вкусно.', "Ochen' vkUsna", 'とてもおいしい', 'shop', 1],
  ['Счёт, пожалуйста.', 'shchot pazhAlusta', 'お会計をお願いします', 'shop', 1],
  ['Меню, пожалуйста.', 'menyU pazhAlusta', 'メニューをください', 'shop', 1],
  ['Можно скидку?', 'mOzhna skItku', '安くできますか？', 'shop', 2],
  ['Можно расплатиться картой?', "mOzhna rasplatIt'sa kArtay", 'カードで払えますか？', 'shop', 2],
  ['Я просто смотрю.', 'ya prOsta smatryU', '見ているだけです', 'shop', 2],
  ['Дайте ещё один.', 'dAyte yeshchO adIn', 'もう一つください', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['Где вокзал?', 'gde vakzAl', '駅はどこですか？', 'travel', 1],
  ['Где туалет?', 'gde tualEt', 'トイレはどこですか？', 'travel', 1],
  ['Идите прямо.', 'idIte pryAma', 'まっすぐ行ってください', 'travel', 1],
  ['Поверните налево.', 'pavernIte nalEva', '左に曲がってください', 'travel', 1],
  ['Поверните направо.', 'pavernIte naprAva', '右に曲がってください', 'travel', 1],
  ['Это далеко?', 'Eta dalekO', '遠いですか？', 'travel', 1],
  ['Как туда добраться?', "kak tudA dabrAt'sa", 'そこへはどう行きますか？', 'travel', 2],
  ['Один билет, пожалуйста.', 'adIn bilEt pazhAlusta', '切符を一枚ください', 'travel', 2],
  ['Во сколько открытие?', "va skOl'ka atkrYtie", '何時に開きますか？', 'travel', 2],
  ['Отвезите меня по этому адресу.', 'atvezIte menyA pa Etamu Adresu', 'この住所まで連れて行ってください', 'travel', 3],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

const allJa = PHRASES.map(([, , ja]) => ja)

const questions = PHRASES.map(([ru, pron, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `ruph-${String(i + 1).padStart(4, '0')}`,
    category: 'russian',
    prompt: `「${ru}」の意味は？`,
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
console.log('ロシア語表現:', questions.length, '件 (出力', PHRASES.length, '件中)')
console.log('  Lv1:', byLevel[1], ' / Lv2:', byLevel[2], ' / Lv3:', byLevel[3])
console.log('  日本語訳ユニーク数:', new Set(allJa).size, '/', allJa.length)
