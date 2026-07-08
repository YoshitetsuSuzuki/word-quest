// ============================================================================
// build-phrases-french.mjs  フランス語「よく使う表現集」ワードバンク生成（日本人向け）
// フランス本土で実際に頻用される定番表現のみを厳選。強いスラング・俗語は除外し精度優先。
// 丁寧さは vous 基調で自然に。発音表記は付けない。3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/french/phrases.json … Question[] (tags:['phrase',theme])
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'french')

// [フランス語, 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Bonjour.', 'こんにちは（日中のあいさつ）', 'greeting', 1],
  ['Bonsoir.', 'こんばんは', 'greeting', 1],
  ['Salut !', 'やあ（親しい間柄のあいさつ）', 'greeting', 1],
  ['Bonne nuit.', 'おやすみなさい', 'greeting', 1],
  ['Au revoir.', 'さようなら', 'greeting', 1],
  ['À bientôt.', 'また近いうちに', 'greeting', 1],
  ['À demain.', 'また明日', 'greeting', 1],
  ['Comment allez-vous ?', 'お元気ですか？', 'greeting', 1],
  ['Ça va ?', '元気？調子どう？', 'greeting', 1],
  ['Ça va, merci.', '元気だよ、ありがとう', 'greeting', 1],
  ['Enchanté.', 'はじめまして（お会いできてうれしいです）', 'greeting', 2],
  ['Ravi de vous rencontrer.', 'お会いできて光栄です', 'greeting', 2],
  ['Bienvenue.', 'ようこそ', 'greeting', 1],
  ['Bonne journée !', 'よい一日を！', 'greeting', 1],
  ['Bon week-end !', 'よい週末を！', 'greeting', 2],
  ['Ça fait longtemps.', 'お久しぶりです', 'greeting', 2],

  // ===== 返事・相づち reply =====
  ['Oui.', 'はい', 'reply', 1],
  ['Non.', 'いいえ', 'reply', 1],
  ['D’accord.', '了解、わかった', 'reply', 1],
  ['Bien sûr.', 'もちろん', 'reply', 1],
  ['Peut-être.', 'たぶん', 'reply', 1],
  ['Vraiment ?', '本当に？', 'reply', 1],
  ['Moi aussi.', '私も', 'reply', 1],
  ['Je comprends.', 'わかります（理解しています）', 'reply', 1],
  ['Je ne sais pas.', 'わかりません（知りません）', 'reply', 1],
  ['Je suis d’accord.', '賛成です', 'reply', 2],
  ['Vous avez raison.', 'あなたの言う通りです', 'reply', 2],
  ['Ça dépend.', '場合によります', 'reply', 2],
  ['Je vois.', 'なるほど（そういうことね）', 'reply', 2],
  ['Exactement.', 'その通りです', 'reply', 2],
  ['Avec plaisir.', '喜んで', 'reply', 2],

  // ===== 日常 daily =====
  ['Attendez un instant.', '少々お待ちください', 'daily', 1],
  ['Ce n’est pas grave.', '大したことないよ、気にしないで', 'daily', 1],
  ['Bon courage !', 'がんばって！', 'daily', 1],
  ['Ne t’inquiète pas.', '心配しないで', 'daily', 1],
  ['J’ai faim.', 'お腹がすいた', 'daily', 1],
  ['J’ai soif.', 'のどが渇いた', 'daily', 1],
  ['Je suis fatigué.', '疲れた', 'daily', 1],
  ['Je suis en retard.', '遅刻しそうだ', 'daily', 1],
  ['J’arrive.', '今行きます', 'daily', 1],
  ['Ça a l’air bien.', 'よさそうだね', 'daily', 2],
  ['Je n’en suis pas sûr.', '確信が持てません', 'daily', 2],
  ['Comme tu veux.', '君の好きにしていいよ', 'daily', 2],
  ['Prends ton temps.', 'ゆっくりでいいよ', 'daily', 2],
  ['On y va ?', '行こうか？', 'daily', 2],
  ['Ça me va.', 'それで大丈夫です', 'daily', 2],
  ['Tant pis.', '仕方ないね（残念だけど）', 'daily', 2],

  // ===== 気持ち feeling =====
  ['Je suis content.', 'うれしいです', 'feeling', 1],
  ['Je suis triste.', '悲しいです', 'feeling', 1],
  ['C’est génial !', 'すごくいいね！', 'feeling', 1],
  ['C’est dommage.', '残念ですね', 'feeling', 2],
  ['Je suis désolé.', '申し訳なく思います', 'feeling', 1],
  ['Félicitations !', 'おめでとう！', 'feeling', 1],
  ['J’ai hâte.', '楽しみで待ちきれない', 'feeling', 2],
  ['Ça me plaît.', '気に入りました', 'feeling', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['Merci.', 'ありがとう', 'request', 1],
  ['Merci beaucoup.', 'どうもありがとう', 'request', 1],
  ['De rien.', 'どういたしまして', 'request', 1],
  ['Je vous en prie.', 'どうぞ（ご遠慮なく）', 'request', 2],
  ['Pardon.', 'すみません（謝罪・呼びかけ）', 'request', 1],
  ['Excusez-moi.', 'すみません（失礼します）', 'request', 1],
  ['S’il vous plaît.', 'お願いします', 'request', 1],
  ['Pouvez-vous m’aider ?', '手伝っていただけますか？', 'request', 1],
  ['Pouvez-vous répéter ?', 'もう一度言っていただけますか？', 'request', 1],
  ['Parlez plus lentement, s’il vous plaît.', 'もっとゆっくり話してください', 'request', 2],
  ['Un instant, s’il vous plaît.', '少しお待ちください（丁寧）', 'request', 2],
  ['Est-ce que je peux vous demander quelque chose ?', 'ちょっとお尋ねしてもいいですか？', 'request', 2],
  ['Merci d’avance.', 'よろしくお願いします（前もってお礼）', 'request', 2],

  // ===== 買い物・食事 shop =====
  ['C’est combien ?', 'いくらですか？', 'shop', 1],
  ['C’est trop cher.', '高すぎます', 'shop', 1],
  ['Je voudrais ça.', 'これがほしいのですが', 'shop', 1],
  ['Je vais prendre ça.', 'これにします', 'shop', 1],
  ['L’addition, s’il vous plaît.', 'お会計をお願いします', 'shop', 1],
  ['La carte, s’il vous plaît.', 'メニューをお願いします', 'shop', 1],
  ['Un café, s’il vous plaît.', 'コーヒーを一つください', 'shop', 1],
  ['C’est délicieux.', 'おいしいです', 'shop', 1],
  ['Je regarde seulement.', '見ているだけです', 'shop', 2],
  ['Est-ce que je peux payer par carte ?', 'カードで払えますか？', 'shop', 2],
  ['Est-ce que je peux essayer ?', '試着してもいいですか？', 'shop', 2],
  ['Avez-vous une autre taille ?', '別のサイズはありますか？', 'shop', 2],
  ['Sur place ou à emporter ?', '店内ですか、お持ち帰りですか？', 'shop', 2],
  ['Gardez la monnaie.', 'お釣りは取っておいてください', 'shop', 3],

  // ===== 旅行・道案内 travel =====
  ['Où sont les toilettes ?', 'トイレはどこですか？', 'travel', 1],
  ['Où est la gare ?', '駅はどこですか？', 'travel', 1],
  ['Tout droit.', 'まっすぐです', 'travel', 1],
  ['À gauche.', '左です', 'travel', 1],
  ['À droite.', '右です', 'travel', 1],
  ['C’est loin ?', '遠いですか？', 'travel', 1],
  ['Je suis perdu.', '道に迷いました', 'travel', 2],
  ['Comment aller à la gare ?', '駅へはどう行けばいいですか？', 'travel', 2],
  ['À quelle heure ça ouvre ?', '何時に開きますか？', 'travel', 2],
  ['J’ai une réservation.', '予約しています', 'travel', 2],
  ['Y a-t-il du wifi ici ?', 'ここにwifiはありますか？', 'travel', 2],
  ['Pouvez-vous prendre une photo ?', '写真を撮っていただけますか？', 'travel', 2],
  ['Pouvez-vous appeler un taxi ?', 'タクシーを呼んでいただけますか？', 'travel', 3],
  ['Conduisez-moi à cette adresse, s’il vous plaît.', 'この住所まで連れて行ってください', 'travel', 3],
  ['Je voudrais un billet, s’il vous plaît.', '切符を一枚ほしいのですが', 'travel', 2],

  // ===== 世間話 smalltalk =====
  ['Quel temps fait-il ?', '天気はどうですか？', 'smalltalk', 2],
  ['Il fait beau aujourd’hui.', '今日はいい天気ですね', 'smalltalk', 1],
  ['Il fait froid.', '寒いですね', 'smalltalk', 1],
  ['Il pleut.', '雨が降っています', 'smalltalk', 1],
  ['Qu’est-ce que vous faites dans la vie ?', 'お仕事は何をされていますか？', 'smalltalk', 3],
  ['D’où venez-vous ?', 'ご出身はどちらですか？', 'smalltalk', 2],
  ['Je viens du Japon.', '日本から来ました', 'smalltalk', 1],
  ['Je parle un peu français.', 'フランス語を少し話します', 'smalltalk', 2],

  // ===== 電話 phone =====
  ['Allô ?', 'もしもし？', 'phone', 1],
  ['Qui est à l’appareil ?', 'どちら様ですか？（電話で）', 'phone', 3],
  ['Ne quittez pas.', '少々お待ちください（電話を切らずに）', 'phone', 3],

  // ===== 困ったとき trouble =====
  ['Au secours !', '助けて！', 'trouble', 1],
  ['Attention !', '気をつけて！危ない！', 'trouble', 1],
  ['Je ne comprends pas.', '（言っていることが）わかりません', 'trouble', 1],
  ['Je ne me sens pas bien.', '気分がすぐれません', 'trouble', 2],
  ['Appelez un médecin !', '医者を呼んでください！', 'trouble', 2],
  ['J’ai perdu mon passeport.', 'パスポートをなくしました', 'trouble', 2],

  // ===== 上級・丁寧表現（追加） =====
  ['Je vous remercie.', '感謝申し上げます（丁寧なお礼）', 'request', 3],
  ['Je suis vraiment désolé pour le retard.', '遅れて本当に申し訳ありません', 'request', 3],
  ['Je vous prie de m’excuser.', '何とぞご容赦ください', 'request', 3],
  ['Auriez-vous un moment ?', 'お時間を少しいただけますか？', 'request', 3],
  ['Je crains que ce ne soit pas possible.', 'あいにく難しいかと存じます', 'reply', 3],
  ['Cela me semble une bonne idée.', 'それはいい考えだと思います', 'reply', 3],
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

const questions = PHRASES.map(([fr, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `frph-${String(i + 1).padStart(4, '0')}`,
    category: 'french',
    prompt: `「${fr}」の意味は？`,
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
for (const [, , theme] of PHRASES) byTheme[theme] = (byTheme[theme] || 0) + 1
const uniqueJa = new Set(allJa).size

console.log('フランス語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
console.log('  和訳ユニーク数:', uniqueJa, ' / 総数:', PHRASES.length, ' / 重複:', PHRASES.length - uniqueJa)
console.log('  テーマ別:', JSON.stringify(byTheme))
