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

  // ===== あいさつ greeting（追加） =====
  ['Goodbye.', 'さようなら', 'greeting', 1],
  ['See you tomorrow.', 'また明日', 'greeting', 1],
  ['Good afternoon.', 'こんにちは（昼のあいさつ）', 'greeting', 1],
  ['Good evening.', 'こんばんは', 'greeting', 1],
  ['Take it easy.', 'じゃあね／無理しないで', 'greeting', 2],
  ['Have a good weekend.', '良い週末を', 'greeting', 2],
  ['Nice to see you again.', 'また会えてうれしい', 'greeting', 2],
  ['It’s been a while.', 'しばらくぶりですね', 'greeting', 2],
  ['Let’s keep in touch.', '連絡を取り合いましょう', 'greeting', 3],

  // ===== 日常 daily（追加） =====
  ['Take your time.', 'ゆっくりでいいよ', 'daily', 1],
  ['Here you go.', 'はい、どうぞ', 'daily', 1],
  ['Not bad.', '悪くないよ', 'daily', 1],
  ['Maybe.', 'たぶんね', 'daily', 1],
  ['I’m almost done.', 'もうすぐ終わるよ', 'daily', 2],
  ['I’m starving.', 'お腹ぺこぺこ', 'daily', 2],
  ['I’m exhausted.', 'くたくたに疲れた', 'daily', 2],
  ['Same here.', '私も同じ', 'daily', 2],
  ['Calm down.', '落ち着いて', 'daily', 2],
  ['What a pity.', '残念だね', 'daily', 2],
  ['Let’s call it a day.', '今日はこれで終わりにしよう', 'daily', 3],
  ['It’s not a big deal.', 'たいしたことないよ', 'daily', 3],
  ['I’ll keep that in mind.', '覚えておきます', 'daily', 3],
  ['Speak of the devil.', 'うわさをすれば（本人が現れた）', 'daily', 3],
  ['I can’t help it.', 'どうしようもないんだ', 'daily', 3],

  // ===== 相づち・返事 reply（追加） =====
  ['Yes, please.', 'はい、お願いします', 'reply', 1],
  ['No, thanks.', 'いいえ、結構です', 'reply', 1],
  ['All right.', 'わかりました', 'reply', 1],
  ['Maybe not.', 'たぶん違うかな', 'reply', 2],
  ['I hope so.', 'そうだといいね', 'reply', 2],
  ['I’m with you.', '同感だよ', 'reply', 2],
  ['That depends.', '状況によります', 'reply', 2],
  ['I’m afraid not.', '残念ながら違います', 'reply', 3],
  ['You’ve got a point.', '一理あるね', 'reply', 3],
  ['If you say so.', 'あなたがそう言うなら', 'reply', 3],

  // ===== 買い物・食事 shop（追加） =====
  ['Can I have some water?', 'お水をもらえますか？', 'shop', 1],
  ['A table for two, please.', '2名です', 'shop', 1],
  ['It was delicious.', 'おいしかったです', 'shop', 1],
  ['What do you recommend?', 'おすすめは何ですか？', 'shop', 2],
  ['I’ll have the same.', '私も同じものを', 'shop', 2],
  ['Can we split the bill?', '割り勘にできますか？', 'shop', 2],
  ['Can I get a receipt?', 'レシートをもらえますか？', 'shop', 2],
  ['Do you have a smaller size?', 'もっと小さいサイズはありますか？', 'shop', 2],
  ['I’m allergic to eggs.', '卵アレルギーがあります', 'shop', 3],
  ['Could I see the wine list?', 'ワインリストを見せてもらえますか？', 'shop', 3],

  // ===== 道案内・旅行 travel（追加） =====
  ['Where is the bathroom?', 'トイレはどこですか？', 'travel', 1],
  ['Help!', '助けて！', 'travel', 1],
  ['I’d like to check in.', 'チェックインをお願いします', 'travel', 2],
  ['How long does it take?', 'どのくらいかかりますか？', 'travel', 2],
  ['Is breakfast included?', '朝食は含まれていますか？', 'travel', 2],
  ['I missed my train.', '電車に乗り遅れました', 'travel', 2],
  ['Could you take a picture?', '写真を撮ってもらえますか？', 'travel', 2],
  ['Is this seat taken?', 'この席は空いていますか？', 'travel', 2],
  ['Please take me to this address.', 'この住所までお願いします', 'travel', 3],
  ['I’d like to extend my stay.', '滞在を延長したいです', 'travel', 3],

  // ===== お願い・お礼・謝罪 request（追加） =====
  ['After you.', 'お先にどうぞ', 'request', 2],
  ['No problem at all.', '全然かまいませんよ', 'request', 2],
  ['Thanks anyway.', 'とにかくありがとう', 'request', 2],
  ['My pleasure.', '喜んで（どういたしまして）', 'request', 2],
  ['Sorry to keep you waiting.', 'お待たせしてすみません', 'request', 2],
  ['Could you do me a favor?', '一つお願いしてもいい？', 'request', 2],
  ['I apologize for the delay.', '遅れて申し訳ありません', 'request', 3],
  ['Thank you for your patience.', 'お待ちいただきありがとうございます', 'request', 3],
  ['I appreciate your understanding.', 'ご理解に感謝します', 'request', 3],

  // ===== 仕事・ビジネス work =====
  ['Let’s get started.', '始めましょう', 'work', 1],
  ['Good job.', 'よくやったね', 'work', 1],
  ['Nice work.', 'いい仕事だね', 'work', 1],
  ['I’ll do my best.', 'ベストを尽くします', 'work', 1],
  ['That works for me.', '私はそれで大丈夫です', 'work', 2],
  ['I’m running late.', '少し遅れます', 'work', 2],
  ['Let me get back to you.', '後ほどご連絡します', 'work', 2],
  ['Can we schedule a meeting?', '打ち合わせを設定できますか？', 'work', 2],
  ['I’ll take care of it.', '私が対応します', 'work', 2],
  ['Could you send me the details?', '詳細を送ってもらえますか？', 'work', 2],
  ['Let’s move on.', '次に進みましょう', 'work', 2],
  ['I’m looking into it.', '今調べています', 'work', 2],
  ['Let’s touch base later.', '後で状況を共有しましょう', 'work', 3],
  ['Please find the attached file.', '添付ファイルをご確認ください', 'work', 3],
  ['Let’s keep it short.', '手短にしましょう', 'work', 3],

  // ===== 気持ち feeling =====
  ['I’m so happy.', 'とてもうれしい', 'feeling', 1],
  ['I’m tired.', '疲れた', 'feeling', 1],
  ['I’m worried.', '心配だ', 'feeling', 1],
  ['I can’t wait.', '待ちきれない', 'feeling', 2],
  ['I’m proud of you.', 'あなたを誇りに思う', 'feeling', 2],
  ['I feel much better.', 'だいぶ良くなった', 'feeling', 2],
  ['That’s a relief.', 'ほっとした', 'feeling', 2],
  ['I’m in a hurry.', '急いでいます', 'feeling', 2],
  ['I miss you.', '会いたいな', 'feeling', 2],
  ['I’m getting nervous.', '緊張してきた', 'feeling', 3],
  ['I’m fed up with it.', 'もううんざりだ', 'feeling', 3],
  ['I’m over the moon.', '天にも昇る気持ちだ', 'feeling', 3],

  // ===== 雑談・天気 smalltalk =====
  ['Nice weather today.', '今日はいい天気だね', 'smalltalk', 1],
  ['It’s hot today.', '今日は暑いね', 'smalltalk', 1],
  ['It’s cold outside.', '外は寒いよ', 'smalltalk', 1],
  ['It’s raining.', '雨が降っている', 'smalltalk', 1],
  ['Where are you from?', 'ご出身はどちらですか？', 'smalltalk', 1],
  ['How was your weekend?', '週末はどうだった？', 'smalltalk', 2],
  ['What do you do?', 'お仕事は何ですか？', 'smalltalk', 2],
  ['That sounds fun.', '楽しそうだね', 'smalltalk', 2],
  ['Time flies.', '時間が経つのは早いね', 'smalltalk', 2],
  ['Long day, huh?', '長い一日だったね', 'smalltalk', 3],

  // ===== 電話・オンライン phone =====
  ['Can you hear me?', '聞こえますか？', 'phone', 1],
  ['Hold on, please.', '少々お待ちください', 'phone', 2],
  ['I’ll call you back.', 'かけ直します', 'phone', 2],
  ['Who’s calling, please?', 'どちら様ですか？', 'phone', 2],
  ['You’re on mute.', 'ミュートになっていますよ', 'phone', 2],
  ['Can you turn on your camera?', 'カメラをつけてもらえますか？', 'phone', 2],
  ['Sorry, wrong number.', 'すみません、番号を間違えました', 'phone', 2],
  ['You’re breaking up.', '声が途切れています', 'phone', 3],
  ['Let me put you through.', 'おつなぎします', 'phone', 3],

  // ===== 困ったとき trouble =====
  ['Watch out!', '危ない！', 'trouble', 1],
  ['I don’t understand.', 'わかりません', 'trouble', 1],
  ['What’s wrong?', 'どうしたの？', 'trouble', 1],
  ['I have a problem.', '困っています', 'trouble', 1],
  ['Is everything okay?', '大丈夫ですか？', 'trouble', 2],
  ['I don’t feel well.', '気分が悪いです', 'trouble', 2],
  ['I lost my wallet.', '財布をなくしました', 'trouble', 2],
  ['Call the police.', '警察を呼んで', 'trouble', 2],
  ['Let me handle it.', '私に任せて', 'trouble', 2],
  ['It can’t be helped.', '仕方がないね', 'trouble', 3],

  // ===== 専門: 慣用句・イディオム idiom =====
  ['a piece of cake', 'とても簡単なこと', 'idiom', 2],
  ['keep an eye on', '注意して見張る', 'idiom', 2],
  ['make up your mind', '決心する', 'idiom', 2],
  ['run out of time', '時間が足りなくなる', 'idiom', 2],
  ['break the ice', '(初対面などの)緊張をほぐす', 'idiom', 3],
  ['under the weather', '体調が優れない', 'idiom', 3],
  ['hit the books', '猛勉強する', 'idiom', 3],
  ['once in a blue moon', 'ごくまれに', 'idiom', 3],
  ['on the same page', '認識が一致している', 'idiom', 3],
  ['cost an arm and a leg', '非常に高価である', 'idiom', 3],
  ['break a leg', '頑張って（幸運を祈る）', 'idiom', 3],
  ['pull someone’s leg', '人をからかう', 'idiom', 3],
  ['the ball is in your court', '次はあなたが決める番だ', 'idiom', 3],
  ['bite the bullet', '意を決して困難に立ち向かう', 'idiom', 3],
  ['let the cat out of the bag', 'うっかり秘密を漏らす', 'idiom', 3],
  ['get cold feet', '土壇場で怖気づく', 'idiom', 3],
  ['it’s not rocket science', '難しいことではない', 'idiom', 3],
  ['call it a day', '仕事を切り上げる', 'idiom', 3],
  ['hit the sack', '寝る、就寝する', 'idiom', 3],
  ['a blessing in disguise', '一見不運だが実は幸運なこと', 'idiom', 3],

  // ===== 専門: ビジネス・メール business =====
  ['Could you please confirm?', 'ご確認いただけますでしょうか', 'business', 2],
  ['I’ll get back to you by tomorrow.', '明日までにご連絡します', 'business', 2],
  ['Let’s set up a call.', '電話で話しましょう', 'business', 2],
  ['Best regards,', '敬具（メールの結び）', 'business', 2],
  ['I hope this email finds you well.', 'お元気でお過ごしのことと存じます', 'business', 3],
  ['Thank you for your prompt reply.', '早速のご返信ありがとうございます', 'business', 3],
  ['Thank you for your continued support.', '平素より大変お世話になっております', 'business', 3],
  ['Please let me know if you have any questions.', 'ご不明な点があればお知らせください', 'business', 3],
  ['I look forward to hearing from you.', 'ご返信をお待ちしております', 'business', 3],
  ['I apologize for any inconvenience.', 'ご不便をおかけし申し訳ありません', 'business', 3],
  ['Please let me know your availability.', 'ご都合をお知らせください', 'business', 3],
  ['As we discussed earlier,', '先ほどお話しした通り、', 'business', 3],
  ['Please keep me posted.', '進捗を随時お知らせください', 'business', 3],
  ['Noted with thanks.', '承知しました、ありがとうございます', 'business', 3],
  ['I’m writing to inquire about our order.', '注文についてお伺いしたくご連絡しました', 'business', 3],
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
