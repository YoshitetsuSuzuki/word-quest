// ============================================================================
// build-phrases-spanish.mjs  スペイン語「よく使う表現集」ワードバンク生成（日本人向け）
// スペイン(イベリア)・中南米で広く通用する標準的な定番表現のみを厳選。強い地域スラング・
// 一方でしか使わない表現は除外し精度優先。3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/spanish/phrases.json … Question[] (tags:['phrase',theme])
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'spanish')

// [スペイン語, 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Hola.', 'こんにちは（やあ）', 'greeting', 1],
  ['Buenos días.', 'おはようございます', 'greeting', 1],
  ['Buenas tardes.', 'こんにちは（午後の挨拶）', 'greeting', 1],
  ['Buenas noches.', 'こんばんは・おやすみなさい', 'greeting', 1],
  ['Adiós.', 'さようなら', 'greeting', 1],
  ['Hasta luego.', 'また後で', 'greeting', 1],
  ['Hasta mañana.', 'また明日', 'greeting', 1],
  ['¿Cómo estás?', '元気ですか？', 'greeting', 1],
  ['¿Qué tal?', '調子はどう？', 'greeting', 1],
  ['Mucho gusto.', 'はじめまして（お会いできてうれしいです）', 'greeting', 1],
  ['¡Cuánto tiempo!', 'お久しぶり！', 'greeting', 2],
  ['Que tengas un buen día.', 'よい一日を', 'greeting', 2],
  ['Feliz cumpleaños.', 'お誕生日おめでとう', 'greeting', 1],

  // ===== 返事・相づち reply =====
  ['Sí.', 'はい', 'reply', 1],
  ['No.', 'いいえ', 'reply', 1],
  ['Claro.', 'もちろん', 'reply', 1],
  ['Vale.', 'オーケー（了解）', 'reply', 1],
  ['De acuerdo.', '賛成です（同意します）', 'reply', 2],
  ['Está bien.', 'いいですよ（それで結構です）', 'reply', 1],
  ['Por supuesto.', '当然です', 'reply', 2],
  ['¿De verdad?', '本当に？', 'reply', 1],
  ['Yo también.', '私も', 'reply', 1],
  ['Ya veo.', 'なるほど', 'reply', 2],
  ['Entiendo.', 'わかります（理解しました）', 'reply', 1],
  ['Tienes razón.', 'あなたの言う通りです', 'reply', 2],
  ['Quizás.', 'たぶん', 'reply', 2],
  ['Depende.', '場合によります', 'reply', 2],

  // ===== 日常 daily =====
  ['Un momento.', 'ちょっと待って', 'daily', 1],
  ['Espera.', '待って', 'daily', 1],
  ['No pasa nada.', '大丈夫、なんでもないよ', 'daily', 1],
  ['No importa.', '気にしないで', 'daily', 1],
  ['¡Ánimo!', 'がんばって！（元気出して）', 'daily', 1],
  ['No te preocupes.', '心配しないで', 'daily', 1],
  ['¡Qué bien!', 'よかった！（いいね）', 'daily', 1],
  ['Tengo hambre.', 'お腹がすいた', 'daily', 1],
  ['Tengo sed.', '喉がかわいた', 'daily', 1],
  ['Estoy cansado.', '疲れた', 'daily', 1],
  ['Estoy listo.', '準備ができました', 'daily', 1],
  ['Tengo prisa.', '急いでいます', 'daily', 2],
  ['Ya voy.', '今行きます', 'daily', 1],
  ['Suena bien.', 'いいですね（よさそう）', 'daily', 2],
  ['No lo sé.', 'わかりません', 'daily', 1],
  ['Como quieras.', 'お好きにどうぞ（あなた次第）', 'daily', 2],
  ['Poco a poco.', '少しずつ', 'daily', 2],
  ['Ten cuidado.', '気をつけて', 'daily', 1],

  // ===== 気持ち feeling =====
  ['Estoy feliz.', 'うれしいです', 'feeling', 1],
  ['Estoy triste.', '悲しいです', 'feeling', 1],
  ['Estoy preocupado.', '心配しています', 'feeling', 2],
  ['Me encanta.', '大好きです（とても気に入りました）', 'feeling', 2],
  ['Me da igual.', 'どちらでもいいです', 'feeling', 2],
  ['¡Qué pena!', '残念！', 'feeling', 2],
  ['Te echo de menos.', 'あなたが恋しいです', 'feeling', 3],

  // ===== お願い・お礼・謝罪 request =====
  ['Gracias.', 'ありがとう', 'request', 1],
  ['Muchas gracias.', 'どうもありがとうございます', 'request', 1],
  ['De nada.', 'どういたしまして', 'request', 1],
  ['Por favor.', 'お願いします（どうぞ）', 'request', 1],
  ['Perdón.', 'ごめんなさい', 'request', 1],
  ['Lo siento.', '申し訳ありません', 'request', 1],
  ['Lo siento mucho.', '本当に申し訳ありません', 'request', 2],
  ['Disculpe.', 'すみません（呼びかけ・丁寧）', 'request', 1],
  ['Con permiso.', '失礼します（通してください）', 'request', 2],
  ['¿Puedes ayudarme?', '手伝ってもらえますか？', 'request', 1],
  ['¿Puede repetir, por favor?', 'もう一度言ってもらえますか？', 'request', 2],
  ['Más despacio, por favor.', 'もっとゆっくりお願いします', 'request', 2],
  ['No entiendo.', 'わかりません（理解できません）', 'request', 1],
  ['¿Qué significa esto?', 'これはどういう意味ですか？', 'request', 2],
  ['¿Cómo se dice esto en español?', 'これはスペイン語で何と言いますか？', 'request', 2],
  ['¿Puedo pasar?', '入ってもいいですか？', 'request', 2],
  ['Muchas gracias por todo.', '色々とありがとうございました', 'request', 3],
  ['Siento molestarte.', 'お手数をおかけしてすみません', 'request', 3],
  ['¿Sería tan amable de ayudarme?', '恐れ入りますが助けていただけますか？', 'request', 3],

  // ===== 買い物・食事 shop =====
  ['¿Cuánto cuesta?', 'いくらですか？', 'shop', 1],
  ['Es muy caro.', 'とても高いです', 'shop', 1],
  ['Quiero esto.', 'これがほしいです', 'shop', 1],
  ['Me llevo esto.', 'これをいただきます（買います）', 'shop', 2],
  ['Está muy rico.', 'とてもおいしいです', 'shop', 1],
  ['La cuenta, por favor.', 'お会計をお願いします', 'shop', 1],
  ['El menú, por favor.', 'メニューをお願いします', 'shop', 1],
  ['Un café, por favor.', 'コーヒーを一つお願いします', 'shop', 1],
  ['Agua, por favor.', 'お水をください', 'shop', 1],
  ['¿Puedo pagar con tarjeta?', 'カードで払えますか？', 'shop', 2],
  ['Solo estoy mirando.', '見ているだけです', 'shop', 2],
  ['¿Puedo probármelo?', '試着してもいいですか？', 'shop', 2],
  ['¿Tiene otro color?', '他の色はありますか？', 'shop', 2],
  ['¿Qué me recomienda?', 'おすすめは何ですか？', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['¿Dónde está el baño?', 'トイレはどこですか？', 'travel', 1],
  ['¿Dónde está la estación?', '駅はどこですか？', 'travel', 1],
  ['¿Dónde estamos?', 'ここはどこですか？', 'travel', 1],
  ['Todo recto.', 'まっすぐです', 'travel', 1],
  ['Gire a la izquierda.', '左に曲がってください', 'travel', 2],
  ['Gire a la derecha.', '右に曲がってください', 'travel', 2],
  ['¿Está lejos de aquí?', 'ここから遠いですか？', 'travel', 1],
  ['¿Cómo se llega?', 'どうやって行きますか？', 'travel', 2],
  ['Estoy perdido.', '道に迷いました', 'travel', 2],
  ['¿A qué hora abre?', '何時に開きますか？', 'travel', 2],
  ['¿A qué hora cierra?', '何時に閉まりますか？', 'travel', 2],
  ['Tengo una reserva.', '予約しています', 'travel', 2],
  ['¿Hay wifi aquí?', 'ここにWi-Fiはありますか？', 'travel', 2],
  ['¿Me puede sacar una foto?', '写真を撮ってもらえますか？', 'travel', 2],
  ['Lléveme a esta dirección, por favor.', 'この住所まで連れて行ってください', 'travel', 3],
  ['¿Puede llamar a un taxi?', 'タクシーを呼んでもらえますか？', 'travel', 3],

  // ===== 電話・連絡 phone =====
  ['¿Diga?', 'もしもし（電話に出るとき）', 'phone', 2],
  ['Te llamo luego.', 'あとで電話します', 'phone', 2],
  ['¿Cuál es tu número?', '電話番号は何番ですか？', 'phone', 2],
  ['Espere un momento, por favor.', '少々お待ちください', 'phone', 2],

  // ===== トラブル trouble =====
  ['¡Ayuda!', '助けて！', 'trouble', 1],
  ['¡Cuidado!', '危ない！（気をつけて）', 'trouble', 1],
  ['Llame a la policía.', '警察を呼んでください', 'trouble', 2],
  ['Llame a una ambulancia.', '救急車を呼んでください', 'trouble', 2],
  ['Necesito un médico.', '医者が必要です', 'trouble', 2],
  ['Me duele aquí.', 'ここが痛いです', 'trouble', 2],
  ['Perdí mi pasaporte.', 'パスポートをなくしました', 'trouble', 3],

  // ===== 雑談 smalltalk =====
  ['¿De dónde eres?', 'どこの出身ですか？', 'smalltalk', 1],
  ['Soy de Japón.', '私は日本出身です', 'smalltalk', 1],
  ['¿Cómo te llamas?', 'お名前は何ですか？', 'smalltalk', 1],
  ['¿A qué te dedicas?', 'お仕事は何ですか？', 'smalltalk', 2],
  ['¿Hablas inglés?', '英語を話しますか？', 'smalltalk', 1],
  ['Hablo un poco de español.', 'スペイン語を少し話します', 'smalltalk', 2],
  ['¿Qué hora es?', '今何時ですか？', 'smalltalk', 1],
  ['Hace calor.', '暑いです', 'smalltalk', 1],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

const allJa = PHRASES.map(([, ja]) => ja)

const questions = PHRASES.map(([es, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `esph-${String(i + 1).padStart(4, '0')}`,
    category: 'spanish',
    prompt: `「${es}」の意味は？`,
    answer: ja,
    glosses: { ja }, // 非JA_NATIVE言語のため glosses.ja が無いと glossOk を通らず表示されない
    choices: shuffle([ja, ...distract]),
    difficulty: level,
    tags: ['phrase', theme],
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))
const byLevel = { 1: 0, 2: 0, 3: 0 }
for (const [, , , lv] of PHRASES) byLevel[lv]++
const byTheme = {}
for (const [, , th] of PHRASES) byTheme[th] = (byTheme[th] || 0) + 1
console.log('スペイン語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
console.log('  テーマ別:', JSON.stringify(byTheme))
