// ============================================================================
// build-phrases-german.mjs  ドイツ語「よく使う表現集」ワードバンク生成（日本人向け）
// ドイツ本国(Hochdeutsch)で実際に頻用される定番表現のみを厳選。強い方言・俗語は除外し精度優先。
// 丁寧さは Sie 基調。ウムラウト(ä ö ü)・エスツェット(ß)・名詞の大文字始まりを正確に表記。
// 3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/german/phrases.json … Question[] (tags:['phrase',theme])
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'german')

// [ドイツ語, 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Hallo.', 'やあ、こんにちは（くだけた挨拶）', 'greeting', 1],
  ['Guten Tag.', 'こんにちは（丁寧な挨拶）', 'greeting', 1],
  ['Guten Morgen.', 'おはようございます', 'greeting', 1],
  ['Guten Abend.', 'こんばんは', 'greeting', 1],
  ['Gute Nacht.', 'おやすみなさい', 'greeting', 1],
  ['Tschüss.', 'バイバイ（くだけた別れ）', 'greeting', 1],
  ['Auf Wiedersehen.', 'さようなら（丁寧な別れ）', 'greeting', 1],
  ['Bis morgen.', 'また明日', 'greeting', 1],
  ['Bis bald.', 'また近いうちに', 'greeting', 1],
  ['Wie geht es Ihnen?', 'お元気ですか？（丁寧）', 'greeting', 1],
  ['Wie geht’s?', '元気？（くだけた言い方）', 'greeting', 1],
  ['Schönen Tag noch!', 'よい一日を！', 'greeting', 2],
  ['Freut mich, Sie kennenzulernen.', 'お会いできてうれしいです', 'greeting', 2],
  ['Lange nicht gesehen.', 'お久しぶりです', 'greeting', 2],
  ['Willkommen!', 'ようこそ！', 'greeting', 1],
  ['Schönes Wochenende!', 'よい週末を！', 'greeting', 2],
  ['Ich muss leider gehen.', '残念ですがもう行かなければなりません', 'greeting', 3],

  // ===== 返事・相づち reply =====
  ['Ja.', 'はい', 'reply', 1],
  ['Nein.', 'いいえ', 'reply', 1],
  ['Genau.', 'その通り', 'reply', 1],
  ['Natürlich.', 'もちろん', 'reply', 1],
  ['Vielleicht.', 'たぶん', 'reply', 1],
  ['Kein Problem.', '問題ないよ', 'reply', 1],
  ['Alles klar.', '了解、わかった', 'reply', 1],
  ['Ich verstehe.', 'わかります、なるほど', 'reply', 1],
  ['Wirklich?', '本当に？', 'reply', 1],
  ['Ich weiß nicht.', 'わかりません', 'reply', 1],
  ['Ich glaube schon.', 'そう思います', 'reply', 2],
  ['Da haben Sie recht.', 'おっしゃる通りです', 'reply', 2],
  ['Das stimmt.', 'それは正しい、その通りだ', 'reply', 2],
  ['Das kommt darauf an.', '場合によります', 'reply', 2],
  ['Ich bin einverstanden.', '賛成です', 'reply', 2],
  ['Auf keinen Fall.', '絶対にだめだ', 'reply', 2],
  ['Da bin ich ganz Ihrer Meinung.', '全く同感です', 'reply', 3],
  ['Ich fürchte, das geht nicht.', 'あいにくそれは無理そうです', 'reply', 3],

  // ===== 日常 daily =====
  ['Moment mal.', 'ちょっと待って', 'daily', 1],
  ['Einen Moment, bitte.', '少々お待ちください', 'daily', 1],
  ['Macht nichts.', '気にしないで', 'daily', 1],
  ['Viel Glück!', '幸運を祈るよ！', 'daily', 1],
  ['Viel Spaß!', '楽しんでね！', 'daily', 1],
  ['Mach’s gut!', '元気でね！（別れ際）', 'daily', 2],
  ['Ich habe Hunger.', 'お腹がすいた', 'daily', 1],
  ['Ich bin müde.', '疲れた', 'daily', 1],
  ['Ich bin gleich da.', 'すぐ行きます', 'daily', 2],
  ['Ich bin unterwegs.', '今向かっているところです', 'daily', 2],
  ['Keine Sorge.', '心配しないで', 'daily', 1],
  ['Klingt gut.', 'いいね、よさそう', 'daily', 2],
  ['Lass uns gehen.', '行こう', 'daily', 2],
  ['Beeil dich!', '急いで！', 'daily', 2],
  ['Pass auf!', '気をつけて！注意して！', 'daily', 2],
  ['Es eilt nicht.', '急がなくていいよ', 'daily', 2],
  ['Gute Besserung!', 'お大事に！（病気の人へ）', 'daily', 2],
  ['Herzlichen Glückwunsch!', 'おめでとうございます！', 'daily', 2],
  ['Prost!', '乾杯！', 'daily', 1],
  ['Guten Appetit!', 'どうぞ召し上がれ', 'daily', 1],

  // ===== お願い・お礼・謝罪 request =====
  ['Danke.', 'ありがとう', 'request', 1],
  ['Vielen Dank.', '本当にありがとうございます', 'request', 1],
  ['Bitte.', 'どうぞ、どういたしまして', 'request', 1],
  ['Gern geschehen.', 'どういたしまして', 'request', 2],
  ['Entschuldigung.', 'すみません、ごめんなさい', 'request', 1],
  ['Es tut mir leid.', '申し訳ありません', 'request', 1],
  ['Entschuldigen Sie, bitte.', '失礼します、すみませんが（丁寧）', 'request', 2],
  ['Können Sie mir helfen?', '手伝っていただけますか？', 'request', 1],
  ['Können Sie das bitte wiederholen?', 'もう一度言っていただけますか？', 'request', 2],
  ['Können Sie bitte langsamer sprechen?', 'もっとゆっくり話していただけますか？', 'request', 2],
  ['Ich hätte eine Frage.', '一つ質問があるのですが', 'request', 2],
  ['Könnten Sie mir bitte helfen?', '手伝っていただけないでしょうか？（より丁寧）', 'request', 3],
  ['Vielen Dank für Ihre Hilfe.', 'ご協力ありがとうございます', 'request', 2],
  ['Das ist sehr nett von Ihnen.', 'ご親切にどうも', 'request', 3],
  ['Entschuldigen Sie die Verspätung.', '遅れて申し訳ありません', 'request', 3],
  ['Kein Grund zur Entschuldigung.', '謝る必要はありませんよ', 'request', 3],

  // ===== 買い物・食事 shop =====
  ['Was kostet das?', 'これはいくらですか？', 'shop', 1],
  ['Das ist zu teuer.', '高すぎます', 'shop', 1],
  ['Ich nehme das.', 'これをください', 'shop', 1],
  ['Ich möchte einen Kaffee, bitte.', 'コーヒーを一つお願いします', 'shop', 1],
  ['Die Speisekarte, bitte.', 'メニューをください', 'shop', 1],
  ['Die Rechnung, bitte.', 'お会計をお願いします', 'shop', 1],
  ['Ich schaue mich nur um.', '見ているだけです', 'shop', 2],
  ['Kann ich mit Karte zahlen?', 'カードで払えますか？', 'shop', 2],
  ['Haben Sie das in einer anderen Größe?', '別のサイズはありますか？', 'shop', 2],
  ['Kann ich das anprobieren?', '試着できますか？', 'shop', 2],
  ['Zum Mitnehmen, bitte.', '持ち帰りでお願いします', 'shop', 2],
  ['Noch einen, bitte.', 'もう一つください', 'shop', 2],
  ['Stimmt so.', 'お釣りは結構です', 'shop', 2],
  ['Getrennt oder zusammen?', '別々ですか、ご一緒ですか？', 'shop', 3],

  // ===== 旅行・道案内 travel =====
  ['Wo ist der Bahnhof?', '駅はどこですか？', 'travel', 1],
  ['Wo ist die Toilette?', 'トイレはどこですか？', 'travel', 1],
  ['Gehen Sie geradeaus.', 'まっすぐ行ってください', 'travel', 1],
  ['Biegen Sie links ab.', '左に曲がってください', 'travel', 1],
  ['Biegen Sie rechts ab.', '右に曲がってください', 'travel', 1],
  ['Ist es weit von hier?', 'ここから遠いですか？', 'travel', 2],
  ['Wie komme ich zum Zentrum?', '中心街へはどう行けばいいですか？', 'travel', 2],
  ['Ich habe mich verlaufen.', '道に迷いました', 'travel', 2],
  ['Ich habe eine Reservierung.', '予約しています', 'travel', 2],
  ['Um wie viel Uhr öffnet es?', '何時に開きますか？', 'travel', 2],
  ['Gibt es hier WLAN?', 'ここにWi-Fiはありますか？', 'travel', 2],
  ['Können Sie ein Foto von uns machen?', '私たちの写真を撮ってもらえますか？', 'travel', 2],
  ['Können Sie mir ein Taxi rufen?', 'タクシーを呼んでいただけますか？', 'travel', 3],
  ['Bringen Sie mich bitte zu dieser Adresse.', 'この住所まで連れて行ってください', 'travel', 3],
  ['Wann fährt der nächste Zug?', '次の電車はいつ出ますか？', 'travel', 2],

  // ===== 気持ち feeling =====
  ['Ich freue mich.', 'うれしいです', 'feeling', 1],
  ['Ich bin traurig.', '悲しいです', 'feeling', 1],
  ['Ich habe Angst.', '怖いです', 'feeling', 2],
  ['Das gefällt mir.', '気に入りました', 'feeling', 1],
  ['Ich mag das nicht.', 'それは好きではありません', 'feeling', 1],
  ['Das ist schade.', 'それは残念です', 'feeling', 2],
  ['Ich bin stolz auf dich.', '君を誇りに思うよ', 'feeling', 3],

  // ===== 雑談 smalltalk =====
  ['Wie heißen Sie?', 'お名前は何ですか？', 'smalltalk', 1],
  ['Woher kommen Sie?', 'どちらのご出身ですか？', 'smalltalk', 1],
  ['Ich komme aus Japan.', '日本から来ました', 'smalltalk', 1],
  ['Sprechen Sie Englisch?', '英語を話せますか？', 'smalltalk', 1],
  ['Ich spreche nur ein bisschen Deutsch.', 'ドイツ語は少しだけ話せます', 'smalltalk', 2],
  ['Was machen Sie beruflich?', 'お仕事は何をされていますか？', 'smalltalk', 3],

  // ===== 電話 phone =====
  ['Wer ist am Apparat?', 'どちら様ですか？（電話で）', 'phone', 2],
  ['Einen Moment, ich verbinde Sie.', '少々お待ちください、おつなぎします', 'phone', 3],
  ['Kann ich eine Nachricht hinterlassen?', '伝言を残せますか？', 'phone', 3],

  // ===== 困ったとき trouble =====
  ['Hilfe!', '助けて！', 'trouble', 1],
  ['Rufen Sie einen Krankenwagen!', '救急車を呼んでください！', 'trouble', 2],
  ['Ich brauche einen Arzt.', '医者が必要です', 'trouble', 2],
  ['Ich habe meinen Pass verloren.', 'パスポートをなくしました', 'trouble', 3],
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

const questions = PHRASES.map(([de, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `deph-${String(i + 1).padStart(4, '0')}`,
    category: 'german',
    prompt: `「${de}」の意味は？`,
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
console.log('ドイツ語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
