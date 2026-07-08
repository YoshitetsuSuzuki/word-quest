// ============================================================================
// build-phrases-english.mjs  英語「よく使う表現集」ワードバンク生成（日本人向け）
// 定番表現をテーマ別＋3段階レベル(1初級/2中級/3上級)で厳選（全て標準的で検証容易）。
// 出力: public/wordbank/english/phrases.json  … Question[] (tags:['phrase',theme], difficulty:level)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'english')

// [英語表現, 日本語の意味, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Hello.', 'こんにちは', 'greeting', 1],
  ['Good morning.', 'おはよう', 'greeting', 1],
  ['Good night.', 'おやすみなさい', 'greeting', 1],
  ['Nice to meet you.', 'はじめまして', 'greeting', 1],
  ['How are you?', '調子はどう？', 'greeting', 1],
  ["I'm good, thanks.", '元気だよ、ありがとう', 'greeting', 1],
  ['See you later.', 'またあとで', 'greeting', 1],
  ['Take care.', '気をつけてね', 'greeting', 1],
  ['Have a good day.', '良い一日を', 'greeting', 1],
  ['Long time no see.', 'お久しぶり', 'greeting', 2],
  ['Good to see you.', '会えてうれしい', 'greeting', 2],
  ['How have you been?', '最近どうしてた？', 'greeting', 2],
  ['Welcome back.', 'おかえりなさい', 'greeting', 2],
  ['Say hi to your family.', 'ご家族によろしく', 'greeting', 2],
  ['It was nice talking to you.', '話せてよかったです', 'greeting', 3],
  ['Give my regards to everyone.', '皆さんによろしく', 'greeting', 3],

  // ===== 日常 daily =====
  ["What's up?", '最近どう？', 'daily', 1],
  ['No worries.', '気にしないで', 'daily', 1],
  ['Good luck.', 'がんばって', 'daily', 1],
  ['Just a moment.', 'ちょっと待って', 'daily', 1],
  ['Let me check.', '確認させて', 'daily', 1],
  ["I'm on my way.", '今向かってるよ', 'daily', 2],
  ['It depends.', '場合によるね', 'daily', 2],
  ["I'm not sure.", 'ちょっとわからない', 'daily', 2],
  ['Never mind.', '気にしないで／なんでもない', 'daily', 2],
  ['Sounds good.', 'いいね', 'daily', 2],
  ['Cheer up.', '元気出して', 'daily', 2],
  ["I'm looking forward to it.", '楽しみにしています', 'daily', 3],
  ['It slipped my mind.', 'うっかり忘れてた', 'daily', 3],
  ['Let me sleep on it.', '一晩考えさせて', 'daily', 3],
  ['That makes sense.', 'なるほど、筋が通ってる', 'daily', 3],
  ['It’s up to you.', 'あなた次第です', 'daily', 3],

  // ===== 相づち・返事 reply =====
  ['Sure.', 'もちろん', 'reply', 1],
  ['Of course.', 'もちろんです', 'reply', 1],
  ['I see.', 'なるほど', 'reply', 1],
  ['Really?', '本当に？', 'reply', 1],
  ['No problem.', '問題ないよ', 'reply', 1],
  ['Me too.', '私も', 'reply', 1],
  ['Got it.', 'わかった', 'reply', 1],
  ['I agree.', '賛成です', 'reply', 1],
  ['Exactly.', 'そのとおり', 'reply', 2],
  ['Not really.', 'そうでもない', 'reply', 2],
  ['I think so.', 'そう思う', 'reply', 2],
  ["That's too bad.", 'それは残念', 'reply', 2],
  ['You are right.', 'あなたの言うとおり', 'reply', 2],
  ['That’s a good point.', 'それはいい指摘ですね', 'reply', 3],
  ['I couldn’t agree more.', '全く同感です', 'reply', 3],
  ['Fair enough.', 'なるほど、了解です', 'reply', 3],

  // ===== 買い物・注文 shop =====
  ['How much is it?', 'いくらですか？', 'shop', 1],
  ["I'll take it.", 'それをください', 'shop', 1],
  ['Just looking, thanks.', '見ているだけです', 'shop', 1],
  ['Can I have the menu?', 'メニューをもらえますか？', 'shop', 1],
  ["I'd like a coffee, please.", 'コーヒーをください', 'shop', 1],
  ['The check, please.', 'お会計をお願いします', 'shop', 1],
  ['Can I try this on?', '試着できますか？', 'shop', 2],
  ['Do you have this in blue?', 'これの青はありますか？', 'shop', 2],
  ['Can I pay by card?', 'カードで払えますか？', 'shop', 2],
  ['For here or to go?', '店内ですか、持ち帰りですか？', 'shop', 2],
  ['Keep the change.', 'おつりはいりません', 'shop', 2],
  ['Is this on sale?', 'これはセール中ですか？', 'shop', 2],
  ['Could I get a refund?', '返金してもらえますか？', 'shop', 3],
  ['Do you take reservations?', '予約はできますか？', 'shop', 3],
  ['Could you gift-wrap this?', 'プレゼント用に包んでもらえますか？', 'shop', 3],

  // ===== 道案内・旅行 travel =====
  ['Where is the station?', '駅はどこですか？', 'travel', 1],
  ['One ticket, please.', 'チケットを1枚ください', 'travel', 1],
  ['Go straight ahead.', 'まっすぐ進んで', 'travel', 1],
  ['Turn left at the corner.', '角を左に曲がって', 'travel', 1],
  ['Is it far from here?', 'ここから遠いですか？', 'travel', 1],
  ['How do I get there?', 'そこへはどう行きますか？', 'travel', 2],
  ['Can you show me on the map?', '地図で見せてもらえますか？', 'travel', 2],
  ['I got lost.', '道に迷いました', 'travel', 2],
  ['What time does it open?', '何時に開きますか？', 'travel', 2],
  ['Does this bus go downtown?', 'このバスは中心街に行きますか？', 'travel', 2],
  ['I have a reservation.', '予約しています', 'travel', 2],
  ['Which platform is it?', '何番線ですか？', 'travel', 3],
  ['Could you call a taxi for me?', 'タクシーを呼んでもらえますか？', 'travel', 3],
  ['Is there Wi-Fi here?', 'ここにWi-Fiはありますか？', 'travel', 3],

  // ===== お願い・お礼・謝罪 request =====
  ['Excuse me.', 'すみません（呼びかけ）', 'request', 1],
  ['Thank you so much.', '本当にありがとう', 'request', 1],
  ["You're welcome.", 'どういたしまして', 'request', 1],
  ["I'm sorry.", 'ごめんなさい', 'request', 1],
  ['Could you help me?', '手伝ってもらえますか？', 'request', 1],
  ['Can you say that again?', 'もう一度言ってもらえますか？', 'request', 1],
  ['Could you speak slowly?', 'ゆっくり話してもらえますか？', 'request', 2],
  ['I really appreciate it.', '本当に感謝しています', 'request', 2],
  ["It's my fault.", '私のせいです', 'request', 2],
  ['Can I ask you a favor?', 'お願いがあるのですが', 'request', 2],
  ['Thanks for your help.', '助けてくれてありがとう', 'request', 2],
  ['Would you mind helping me?', '手伝っていただけますか？', 'request', 3],
  ['I’m sorry to bother you.', 'お手数をおかけしてすみません', 'request', 3],
  ['I owe you one.', '恩に着ます', 'request', 3],
  ['Please take your time.', 'どうぞごゆっくり', 'request', 3],
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

const questions = PHRASES.map(([en, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `enph-${String(i + 1).padStart(4, '0')}`,
    category: 'english',
    prompt: `「${en}」の意味は？`,
    answer: ja,
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
console.log('英語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
