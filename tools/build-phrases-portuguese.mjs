// ============================================================================
// build-phrases-portuguese.mjs  ポルトガル語「よく使う表現集」ワードバンク生成（日本人向け）
// ネイティブが日常で実際に使う定番表現のみ厳選。直訳でなく自然なポルトガル語。
// 標準ポルトガル語（ブラジル/ポルトガル双方で通用する語）を優先。精度100%を最優先。
// 3段階レベル(1初級/2中級/3上級)。テーマは既存キーのみ使用。
// 出力: public/wordbank/portuguese/phrases.json … Question[] (tags:['phrase',theme])
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'portuguese')

// [ポルトガル語表現, 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['Olá.', 'やあ', 'greeting', 1],
  ['Bom dia.', 'おはようございます', 'greeting', 1],
  ['Boa tarde.', 'こんにちは', 'greeting', 1],
  ['Boa noite.', 'こんばんは', 'greeting', 1],
  ['Adeus.', 'さようなら', 'greeting', 1],
  ['Até logo.', 'またあとで', 'greeting', 1],
  ['Até amanhã.', 'また明日', 'greeting', 1],
  ['Tudo bem?', '元気ですか？', 'greeting', 1],
  ['Como vai?', 'お元気ですか？', 'greeting', 2],
  ['Prazer em conhecê-lo.', 'お会いできてうれしいです', 'greeting', 2],
  ['Há quanto tempo!', 'お久しぶりです', 'greeting', 2],
  ['Seja bem-vindo.', 'ようこそ', 'greeting', 2],
  ['Bom fim de semana.', 'よい週末を', 'greeting', 2],

  // ===== 返事・相づち reply =====
  ['Sim.', 'はい', 'reply', 1],
  ['Não.', 'いいえ', 'reply', 1],
  ['Claro.', 'もちろん', 'reply', 1],
  ['Talvez.', 'たぶん', 'reply', 1],
  ['Está bem.', 'わかりました', 'reply', 1],
  ['Eu também.', '私もです', 'reply', 1],
  ['De verdade?', '本当に？', 'reply', 1],
  ['Entendi.', 'なるほど', 'reply', 2],
  ['Concordo.', '賛成です', 'reply', 2],
  ['Não sei.', 'わかりません', 'reply', 1],
  ['Acho que sim.', 'そう思います', 'reply', 2],
  ['Tem razão.', 'おっしゃる通りです', 'reply', 2],

  // ===== 日常 daily =====
  ['Espere um momento.', 'ちょっと待ってください', 'daily', 1],
  ['Não faz mal.', '気にしないで', 'daily', 1],
  ['Boa sorte!', '幸運を祈ります', 'daily', 1],
  ['Não se preocupe.', '心配しないで', 'daily', 1],
  ['Que bom!', 'よかった！', 'daily', 1],
  ['Estou com fome.', 'お腹がすきました', 'daily', 1],
  ['Estou cansado.', '疲れました', 'daily', 1],
  ['Estou com pressa.', '急いでいます', 'daily', 2],
  ['Já vou.', 'すぐ行きます', 'daily', 2],
  ['Depende.', '場合によります', 'daily', 2],
  ['Parece bom.', 'よさそうですね', 'daily', 2],
  ['Com calma.', '落ち着いて', 'daily', 2],
  ['Vamos!', '行きましょう！', 'daily', 1],
  ['Estou a caminho.', '今向かっています', 'daily', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['Obrigado.', 'ありがとう', 'request', 1],
  ['Muito obrigado.', 'どうもありがとうございます', 'request', 1],
  ['De nada.', 'どういたしまして', 'request', 1],
  ['Desculpe.', 'ごめんなさい', 'request', 1],
  ['Com licença.', 'すみません（失礼します）', 'request', 1],
  ['Por favor.', 'お願いします', 'request', 1],
  ['Pode me ajudar?', '手伝ってもらえますか？', 'request', 1],
  ['Pode repetir, por favor?', 'もう一度言ってください', 'request', 2],
  ['Fale mais devagar, por favor.', 'もっとゆっくり話してください', 'request', 2],
  ['Não entendi.', 'わかりませんでした', 'request', 1],
  ['Como se diz isto?', 'これはどう言いますか？', 'request', 2],
  ['Sem problema.', '問題ありません', 'request', 1],

  // ===== 買い物・食事 shop =====
  ['Quanto custa?', 'いくらですか？', 'shop', 1],
  ['É muito caro.', '高すぎます', 'shop', 1],
  ['Quero este.', 'これをください', 'shop', 1],
  ['Está delicioso.', 'おいしいです', 'shop', 1],
  ['A conta, por favor.', 'お会計をお願いします', 'shop', 1],
  ['O menu, por favor.', 'メニューをください', 'shop', 1],
  ['Um café, por favor.', 'コーヒーを一杯ください', 'shop', 1],
  ['Pode fazer mais barato?', '安くしてもらえますか？', 'shop', 2],
  ['Aceita cartão?', 'カードは使えますか？', 'shop', 2],
  ['Só estou olhando.', '見ているだけです', 'shop', 2],
  ['Posso experimentar?', '試着してもいいですか？', 'shop', 2],
  ['Tem outra cor?', '他の色はありますか？', 'shop', 2],
  ['Para levar, por favor.', '持ち帰りでお願いします', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['Onde fica a estação?', '駅はどこですか？', 'travel', 1],
  ['Onde fica o banheiro?', 'トイレはどこですか？', 'travel', 1],
  ['Siga em frente.', 'まっすぐ行ってください', 'travel', 1],
  ['Vire à esquerda.', '左に曲がってください', 'travel', 1],
  ['Vire à direita.', '右に曲がってください', 'travel', 1],
  ['É longe daqui?', 'ここから遠いですか？', 'travel', 1],
  ['Como chego lá?', 'そこへはどう行きますか？', 'travel', 2],
  ['Estou perdido.', '道に迷いました', 'travel', 2],
  ['Que horas abre?', '何時に開きますか？', 'travel', 2],
  ['Tenho uma reserva.', '予約しています', 'travel', 2],
  ['Tem Wi-Fi aqui?', 'ここにWi-Fiはありますか？', 'travel', 2],
  ['Pode tirar uma foto?', '写真を撮ってもらえますか？', 'travel', 2],
  ['Me leve a este endereço, por favor.', 'この住所まで行ってください', 'travel', 3],

  // ===== 気持ち feeling =====
  ['Estou feliz.', '幸せです', 'feeling', 1],
  ['Estou triste.', '悲しいです', 'feeling', 1],
  ['Que pena.', '残念です', 'feeling', 2],
  ['Estou preocupado.', '心配しています', 'feeling', 2],
  ['Estou com medo.', '怖いです', 'feeling', 2],
  ['Sinto muito.', '本当にすみません', 'feeling', 2],

  // ===== 困ったとき trouble =====
  ['Socorro!', '助けて！', 'trouble', 1],
  ['Cuidado!', '気をつけて！', 'trouble', 1],
  ['Estou doente.', '具合が悪いです', 'trouble', 2],
  ['Chame um médico.', '医者を呼んでください', 'trouble', 2],
  ['Perdi minha carteira.', '財布をなくしました', 'trouble', 3],
  ['Não me sinto bem.', '気分が良くありません', 'trouble', 2],

  // ===== 電話 phone =====
  ['Alô?', 'もしもし？', 'phone', 1],
  ['Quem fala?', 'どちら様ですか？', 'phone', 2],
  ['Um momento, por favor.', '少々お待ちください', 'phone', 1],
  ['Ligo mais tarde.', 'あとでかけ直します', 'phone', 2],

  // ===== 世間話 smalltalk =====
  ['Que calor hoje!', '今日は暑いですね！', 'smalltalk', 1],
  ['Está chovendo.', '雨が降っています', 'smalltalk', 1],
  ['Faz frio hoje.', '今日は寒いです', 'smalltalk', 1],
  ['Está um lindo dia.', 'いい天気ですね', 'smalltalk', 2],
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

const questions = PHRASES.map(([pt, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `ptph-${String(i + 1).padStart(4, '0')}`,
    category: 'portuguese',
    prompt: `「${pt}」の意味は？`,
    answer: ja,
    glosses: { ja },
    choices: shuffle([ja, ...distract]),
    difficulty: level,
    tags: ['phrase', theme],
    verified: true,
  }
})

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))

// ---- 検証 ----
const byLevel = { 1: 0, 2: 0, 3: 0 }
for (const [, , , lv] of PHRASES) byLevel[lv]++
const jaUnique = new Set(allJa).size
const badChoices = questions.filter(
  (q) => new Set(q.choices).size !== 4 || !q.choices.includes(q.answer)
)
console.log('ポルトガル語 表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
console.log('  日本語訳 ユニーク数:', jaUnique, '/', allJa.length, jaUnique === allJa.length ? '(重複なし)' : '(重複あり!)')
console.log('  choices不正(4件でない/answer欠落):', badChoices.length)
