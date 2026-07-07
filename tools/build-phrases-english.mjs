// ============================================================================
// build-phrases-english.mjs  英語「よく使う表現集」ワードバンク生成（日本人向け）
// 定番表現をテーマ別に厳選（全て標準的で検証容易）。
// 出力: public/wordbank/english/phrases.json  … Question[] (tags:['phrase', theme])
// クイズ/リスニングに載せる。english は ja 母語なので answer=日本語訳。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'english')

// [英語表現, 日本語の意味, テーマ]
const PHRASES = [
  // --- あいさつ greeting ---
  ['Nice to meet you.', 'はじめまして', 'greeting'],
  ['How are you?', '調子はどう？', 'greeting'],
  ["I'm good, thanks.", '元気だよ、ありがとう', 'greeting'],
  ['Long time no see.', 'お久しぶり', 'greeting'],
  ['See you later.', 'またあとで', 'greeting'],
  ['Take care.', '気をつけてね', 'greeting'],
  ['Have a good day.', '良い一日を', 'greeting'],
  ['Good to see you.', '会えてうれしい', 'greeting'],
  ['How have you been?', '最近どうしてた？', 'greeting'],
  ['Welcome back.', 'おかえりなさい', 'greeting'],
  ['Good night.', 'おやすみなさい', 'greeting'],
  ['Say hi to your family.', 'ご家族によろしく', 'greeting'],

  // --- 日常 daily ---
  ["What's up?", '最近どう？', 'daily'],
  ["I'm on my way.", '今向かってるよ', 'daily'],
  ['No worries.', '気にしないで', 'daily'],
  ['It depends.', '場合によるね', 'daily'],
  ["I'm not sure.", 'ちょっとわからない', 'daily'],
  ['Let me check.', '確認させて', 'daily'],
  ['Just a moment.', 'ちょっと待って', 'daily'],
  ['Never mind.', '気にしないで／なんでもない', 'daily'],
  ['Sounds good.', 'いいね', 'daily'],
  ['I agree.', '賛成です', 'daily'],
  ['Good luck.', 'がんばって', 'daily'],
  ['Cheer up.', '元気出して', 'daily'],

  // --- 相づち・返事 reply ---
  ['Sure.', 'もちろん', 'reply'],
  ['Of course.', 'もちろんです', 'reply'],
  ['Exactly.', 'そのとおり', 'reply'],
  ['I see.', 'なるほど', 'reply'],
  ['Really?', '本当に？', 'reply'],
  ['No problem.', '問題ないよ', 'reply'],
  ['Me too.', '私も', 'reply'],
  ['Not really.', 'そうでもない', 'reply'],
  ['I think so.', 'そう思う', 'reply'],
  ["That's too bad.", 'それは残念', 'reply'],
  ['You are right.', 'あなたの言うとおり', 'reply'],
  ['Got it.', 'わかった', 'reply'],

  // --- 買い物・注文 shop ---
  ['How much is it?', 'いくらですか？', 'shop'],
  ["I'll take it.", 'それをください', 'shop'],
  ['Just looking, thanks.', '見ているだけです', 'shop'],
  ['Can I try this on?', '試着できますか？', 'shop'],
  ['Do you have this in blue?', 'これの青はありますか？', 'shop'],
  ['Can I pay by card?', 'カードで払えますか？', 'shop'],
  ["I'd like a coffee, please.", 'コーヒーをください', 'shop'],
  ['For here or to go?', '店内ですか、持ち帰りですか？', 'shop'],
  ['The check, please.', 'お会計をお願いします', 'shop'],
  ['Can I have the menu?', 'メニューをもらえますか？', 'shop'],
  ['Keep the change.', 'おつりはいりません', 'shop'],
  ['Is this on sale?', 'これはセール中ですか？', 'shop'],

  // --- 道案内・旅行 travel ---
  ['Where is the station?', '駅はどこですか？', 'travel'],
  ['How do I get there?', 'そこへはどう行きますか？', 'travel'],
  ['Turn left at the corner.', '角を左に曲がって', 'travel'],
  ['Go straight ahead.', 'まっすぐ進んで', 'travel'],
  ['Is it far from here?', 'ここから遠いですか？', 'travel'],
  ['Can you show me on the map?', '地図で見せてもらえますか？', 'travel'],
  ['I got lost.', '道に迷いました', 'travel'],
  ['What time does it open?', '何時に開きますか？', 'travel'],
  ['One ticket, please.', 'チケットを1枚ください', 'travel'],
  ['Does this bus go downtown?', 'このバスは中心街に行きますか？', 'travel'],
  ['Can I have a receipt?', '領収書をもらえますか？', 'travel'],
  ['I have a reservation.', '予約しています', 'travel'],

  // --- お願い・お礼・謝罪 request ---
  ['Excuse me.', 'すみません（呼びかけ）', 'request'],
  ['Could you help me?', '手伝ってもらえますか？', 'request'],
  ['Can you say that again?', 'もう一度言ってもらえますか？', 'request'],
  ['Could you speak slowly?', 'ゆっくり話してもらえますか？', 'request'],
  ['Thank you so much.', '本当にありがとう', 'request'],
  ["I really appreciate it.", '本当に感謝しています', 'request'],
  ["You're welcome.", 'どういたしまして', 'request'],
  ["I'm sorry.", 'ごめんなさい', 'request'],
  ["It's my fault.", '私のせいです', 'request'],
  ['Excuse me, may I get by?', 'すみません、通してもらえますか？', 'request'],
  ['Can I ask you a favor?', 'お願いがあるのですが', 'request'],
  ['Thanks for your help.', '助けてくれてありがとう', 'request'],
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

const questions = PHRASES.map(([en, ja, theme], i) => {
  const distractPool = shuffle(allJa.filter((x) => x !== ja))
  const distract = distractPool.slice(0, 3)
  return {
    id: `enph-${String(i + 1).padStart(4, '0')}`,
    category: 'english',
    prompt: `「${en}」の意味は？`,
    answer: ja,
    choices: shuffle([ja, ...distract]),
    difficulty: 1,
    tags: ['phrase', theme],
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))
const byTheme = {}
for (const [, , t] of PHRASES) byTheme[t] = (byTheme[t] ?? 0) + 1
console.log('英語表現:', questions.length, '件')
for (const [t, n] of Object.entries(byTheme)) console.log(`  ${t}: ${n}`)
