// ============================================================================
// build-phrases-chinese.mjs  中国語「よく使う表現集」ワードバンク生成（日本人向け）
// 中国本土(普通话)で実際に頻用される定番表現のみを厳選。文化依存・スラングは除外し精度優先。
// pinyin(声調記号付き)を pronunciation に格納。3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/chinese/phrases.json … Question[] (tags:['phrase',theme], pronunciation:pinyin)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'chinese')

// [中国語(簡体字), pinyin, 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['你好。', 'Nǐ hǎo.', 'こんにちは', 'greeting', 1],
  ['早上好。', 'Zǎoshang hǎo.', 'おはよう', 'greeting', 1],
  ['晚上好。', 'Wǎnshàng hǎo.', 'こんばんは', 'greeting', 1],
  ['晚安。', "Wǎn'ān.", 'おやすみなさい', 'greeting', 1],
  ['再见。', 'Zàijiàn.', 'さようなら', 'greeting', 1],
  ['明天见。', 'Míngtiān jiàn.', 'また明日', 'greeting', 1],
  ['你好吗？', 'Nǐ hǎo ma?', '元気ですか？', 'greeting', 1],
  ['很高兴认识你。', 'Hěn gāoxìng rènshi nǐ.', 'お会いできてうれしいです', 'greeting', 2],
  ['好久不见。', 'Hǎojiǔ bújiàn.', 'お久しぶり', 'greeting', 2],
  ['最近怎么样？', 'Zuìjìn zěnmeyàng?', '最近どう？', 'greeting', 2],
  ['慢走。', 'Màn zǒu.', 'お気をつけて（見送りの言葉）', 'greeting', 2],
  ['欢迎光临。', 'Huānyíng guānglín.', 'いらっしゃいませ', 'greeting', 2],
  ['路上小心。', 'Lùshàng xiǎoxīn.', '道中お気をつけて', 'greeting', 2],

  // ===== 返事・相づち reply =====
  ['是的。', 'Shì de.', 'はい、そうです', 'reply', 1],
  ['不是。', 'Bú shì.', 'いいえ、違います', 'reply', 1],
  ['对。', 'Duì.', 'そうです', 'reply', 1],
  ['好的。', 'Hǎo de.', 'わかりました、いいよ', 'reply', 1],
  ['当然。', 'Dāngrán.', 'もちろん', 'reply', 1],
  ['真的吗？', 'Zhēn de ma?', '本当に？', 'reply', 1],
  ['我也是。', 'Wǒ yě shì.', '私も', 'reply', 1],
  ['我知道了。', 'Wǒ zhīdào le.', 'わかりました（了解）', 'reply', 1],
  ['原来如此。', 'Yuánlái rúcǐ.', 'なるほど', 'reply', 2],
  ['我同意。', 'Wǒ tóngyì.', '賛成です', 'reply', 2],
  ['也许吧。', 'Yěxǔ ba.', 'たぶんね', 'reply', 2],
  ['不一定。', 'Bù yídìng.', 'そうとは限らない', 'reply', 2],
  ['说得对。', 'Shuō de duì.', 'おっしゃる通りです', 'reply', 2],
  ['没错。', 'Méi cuò.', '間違いありません', 'reply', 2],

  // ===== 日常 daily =====
  ['等一下。', 'Děng yíxià.', 'ちょっと待って', 'daily', 1],
  ['没关系。', 'Méi guānxi.', '気にしないで、大丈夫', 'daily', 1],
  ['加油！', 'Jiāyóu!', 'がんばって！', 'daily', 1],
  ['别担心。', 'Bié dānxīn.', '心配しないで', 'daily', 1],
  ['太好了！', 'Tài hǎo le!', 'よかった！', 'daily', 1],
  ['我饿了。', 'Wǒ è le.', 'お腹すいた', 'daily', 1],
  ['我累了。', 'Wǒ lèi le.', '疲れた', 'daily', 1],
  ['我看一下。', 'Wǒ kàn yíxià.', 'ちょっと確認するね', 'daily', 1],
  ['我在路上。', 'Wǒ zài lùshàng.', '今向かっているところ', 'daily', 2],
  ['看情况。', 'Kàn qíngkuàng.', '場合による', 'daily', 2],
  ['听起来不错。', 'Tīng qǐlái búcuò.', 'いいね（よさそう）', 'daily', 2],
  ['我不太清楚。', 'Wǒ bú tài qīngchu.', 'よくわからない', 'daily', 2],
  ['随便你。', 'Suíbiàn nǐ.', 'あなたに任せる、お好きに', 'daily', 2],
  ['别着急。', 'Bié zháojí.', 'あわてないで', 'daily', 2],
  ['慢慢来。', 'Mànman lái.', 'ゆっくりでいいよ', 'daily', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['谢谢。', 'Xièxie.', 'ありがとう', 'request', 1],
  ['非常感谢。', 'Fēicháng gǎnxiè.', '本当にありがとうございます', 'request', 2],
  ['不客气。', 'Bú kèqi.', 'どういたしまして', 'request', 1],
  ['对不起。', 'Duìbuqǐ.', 'ごめんなさい', 'request', 1],
  ['不好意思。', 'Bù hǎoyìsi.', 'すみません（軽い謝罪・呼びかけ）', 'request', 1],
  ['没事。', 'Méi shì.', '大丈夫、なんでもない', 'request', 1],
  ['请。', 'Qǐng.', 'どうぞ', 'request', 1],
  ['请问……', 'Qǐngwèn…', 'お尋ねしますが…', 'request', 1],
  ['麻烦你了。', 'Máfan nǐ le.', 'お手数をおかけします', 'request', 2],
  ['你能帮我吗？', 'Nǐ néng bāng wǒ ma?', '手伝ってもらえますか？', 'request', 1],
  ['请再说一遍。', 'Qǐng zài shuō yíbiàn.', 'もう一度言ってください', 'request', 1],
  ['请说慢一点。', 'Qǐng shuō màn yìdiǎn.', 'ゆっくり話してください', 'request', 2],
  ['拜托了。', 'Bàituō le.', 'お願いします', 'request', 2],
  ['让一下。', 'Ràng yíxià.', 'ちょっと通してください', 'request', 2],

  // ===== 買い物・食事 shop =====
  ['多少钱？', 'Duōshǎo qián?', 'いくらですか？', 'shop', 1],
  ['太贵了。', 'Tài guì le.', '高すぎます', 'shop', 1],
  ['我要这个。', 'Wǒ yào zhège.', 'これください', 'shop', 1],
  ['很好吃。', 'Hěn hǎochī.', 'おいしい', 'shop', 1],
  ['买单。', 'Mǎidān.', 'お会計', 'shop', 1],
  ['请给我菜单。', 'Qǐng gěi wǒ càidān.', 'メニューをください', 'shop', 1],
  ['我要一杯咖啡。', 'Wǒ yào yì bēi kāfēi.', 'コーヒーを一杯ください', 'shop', 1],
  ['可以便宜一点吗？', 'Kěyǐ piányi yìdiǎn ma?', '少し安くできますか？', 'shop', 2],
  ['可以刷卡吗？', 'Kěyǐ shuākǎ ma?', 'カードで払えますか？', 'shop', 2],
  ['我只是看看。', 'Wǒ zhǐshì kànkan.', '見ているだけです', 'shop', 2],
  ['可以试穿吗？', 'Kěyǐ shìchuān ma?', '試着できますか？', 'shop', 2],
  ['有别的颜色吗？', 'Yǒu bié de yánsè ma?', '他の色はありますか？', 'shop', 2],
  ['在这儿吃还是带走？', 'Zài zhèr chī háishì dàizǒu?', '店内ですか、持ち帰りですか？', 'shop', 2],
  ['再来一个。', 'Zài lái yí ge.', 'もう一つください', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['车站在哪里？', 'Chēzhàn zài nǎlǐ?', '駅はどこですか？', 'travel', 1],
  ['洗手间在哪里？', 'Xǐshǒujiān zài nǎlǐ?', 'トイレはどこですか？', 'travel', 1],
  ['一直走。', 'Yìzhí zǒu.', 'まっすぐ行って', 'travel', 1],
  ['往左拐。', 'Wǎng zuǒ guǎi.', '左に曲がって', 'travel', 1],
  ['往右拐。', 'Wǎng yòu guǎi.', '右に曲がって', 'travel', 1],
  ['离这里远吗？', 'Lí zhèlǐ yuǎn ma?', 'ここから遠いですか？', 'travel', 1],
  ['怎么去？', 'Zěnme qù?', 'どうやって行きますか？', 'travel', 2],
  ['我迷路了。', 'Wǒ mílù le.', '道に迷いました', 'travel', 2],
  ['几点开门？', 'Jǐ diǎn kāimén?', '何時に開きますか？', 'travel', 2],
  ['我有预约。', 'Wǒ yǒu yùyuē.', '予約しています', 'travel', 2],
  ['这里有Wi-Fi吗？', 'Zhèlǐ yǒu Wi-Fi ma?', 'ここにWi-Fiはありますか？', 'travel', 2],
  ['请帮我拍张照。', 'Qǐng bāng wǒ pāi zhāng zhào.', '写真を撮ってください', 'travel', 2],
  ['请帮我叫出租车。', 'Qǐng bāng wǒ jiào chūzūchē.', 'タクシーを呼んでください', 'travel', 3],
  ['请带我去这个地址。', 'Qǐng dài wǒ qù zhège dìzhǐ.', 'この住所まで行ってください', 'travel', 3],

  // ===== 上級・丁寧表現（追加） =====
  ['请多多关照。', 'Qǐng duōduō guānzhào.', 'どうぞよろしくお願いします', 'greeting', 3],
  ['我先告辞了。', 'Wǒ xiān gàocí le.', 'お先に失礼します', 'greeting', 3],
  ['给您添麻烦了。', 'Gěi nín tiān máfan le.', 'ご迷惑をおかけしました', 'request', 3],
  ['让您久等了。', 'Ràng nín jiǔ děng le.', 'お待たせして申し訳ありません', 'request', 3],
  ['我完全同意。', 'Wǒ wánquán tóngyì.', '全く同感です', 'reply', 3],
  ['恐怕不行。', 'Kǒngpà bùxíng.', 'あいにく難しそうです', 'reply', 3],
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

const questions = PHRASES.map(([zh, pinyin, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `zhph-${String(i + 1).padStart(4, '0')}`,
    category: 'chinese',
    prompt: `「${zh}」の意味は？`,
    answer: ja,
    choices: shuffle([ja, ...distract]),
    difficulty: level,
    tags: ['phrase', theme],
    pronunciation: pinyin,
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))
const byLevel = { 1: 0, 2: 0, 3: 0 }
for (const [, , , , lv] of PHRASES) byLevel[lv]++
console.log('中国語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
