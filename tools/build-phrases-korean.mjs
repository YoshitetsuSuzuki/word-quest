// ============================================================================
// build-phrases-korean.mjs  韓国語「よく使う表現集」ワードバンク生成（日本人向け）
// 韓国で実際に日常的に頻用される定番表現のみを厳選。해요体중심の自然な敬語。
// スラング・若者言葉・文化依存が強すぎる表現は除外し精度優先。
// Revised Romanization(韓国文化観光部式)を pronunciation に格納。3段階レベル(1初級/2中級/3上級)。
// 出力: public/wordbank/korean/phrases.json … Question[] (tags:['phrase',theme], pronunciation:romaja)
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'wordbank', 'korean')

// [韓国語(ハングル), ローマ字(Revised Romanization), 日本語訳, テーマ, レベル(1初級/2中級/3上級)]
const PHRASES = [
  // ===== あいさつ greeting =====
  ['안녕하세요.', 'Annyeonghaseyo.', 'こんにちは', 'greeting', 1],
  ['안녕히 가세요.', 'Annyeonghi gaseyo.', 'さようなら（去る人へ）', 'greeting', 1],
  ['안녕히 계세요.', 'Annyeonghi gyeseyo.', 'さようなら（残る人へ）', 'greeting', 1],
  ['안녕히 주무세요.', 'Annyeonghi jumuseyo.', 'おやすみなさい', 'greeting', 1],
  ['오랜만이에요.', 'Oraenmanieyo.', 'お久しぶりです', 'greeting', 1],
  ['잘 지냈어요?', 'Jal jinaesseoyo?', 'お元気でしたか？', 'greeting', 1],
  ['처음 뵙겠습니다.', 'Cheoeum boepgetseumnida.', 'はじめまして', 'greeting', 2],
  ['만나서 반가워요.', 'Mannaseo bangawoyo.', 'お会いできてうれしいです', 'greeting', 1],
  ['잘 부탁드립니다.', 'Jal butakdeurimnida.', 'よろしくお願いいたします', 'greeting', 2],
  ['또 만나요.', 'Tto mannayo.', 'また会いましょう', 'greeting', 1],
  ['내일 봐요.', 'Naeil bwayo.', 'また明日', 'greeting', 1],
  ['다녀오겠습니다.', 'Danyeoogetseumnida.', '行ってきます', 'greeting', 2],
  ['다녀왔습니다.', 'Danyeowatseumnida.', 'ただいま', 'greeting', 2],
  ['어서 오세요.', 'Eoseo oseyo.', 'いらっしゃいませ', 'greeting', 1],
  ['조심히 가세요.', 'Josimhi gaseyo.', '気をつけてお帰りください', 'greeting', 2],
  ['먼저 실례하겠습니다.', 'Meonjeo sillyehagetseumnida.', 'お先に失礼いたします', 'greeting', 3],
  ['앞으로 잘 부탁드리겠습니다.', 'Apeuro jal butakdeurigetseumnida.', '今後ともどうぞよろしくお願いいたします', 'greeting', 3],

  // ===== 返事・相づち reply =====
  ['네.', 'Ne.', 'はい', 'reply', 1],
  ['아니요.', 'Aniyo.', 'いいえ', 'reply', 1],
  ['맞아요.', 'Majayo.', 'そうです', 'reply', 1],
  ['알겠어요.', 'Algesseoyo.', 'わかりました', 'reply', 1],
  ['몰라요.', 'Mollayo.', '知りません', 'reply', 1],
  ['물론이죠.', 'Mullonijyo.', 'もちろんです', 'reply', 1],
  ['정말요?', 'Jeongmaryo?', '本当ですか？', 'reply', 1],
  ['저도요.', 'Jeodoyo.', '私もです', 'reply', 1],
  ['그렇군요.', 'Geureokunyo.', 'なるほど', 'reply', 2],
  ['그래요?', 'Geuraeyo?', 'そうなんですか？', 'reply', 1],
  ['좋아요.', 'Joayo.', 'いいですよ', 'reply', 1],
  ['아마도요.', 'Amadoyo.', 'たぶんね', 'reply', 2],
  ['글쎄요.', 'Geulsseyo.', 'さあ、どうでしょう', 'reply', 2],
  ['그런 것 같아요.', 'Geureon geot gatayo.', 'そうみたいです', 'reply', 2],
  ['잘 모르겠어요.', 'Jal moreugesseoyo.', 'よくわかりません', 'reply', 1],
  ['말씀하신 대로예요.', 'Malsseumhasin daeroyeyo.', 'おっしゃる通りです', 'reply', 3],

  // ===== 日常 daily =====
  ['잠깐만요.', 'Jamkkanmanyo.', 'ちょっと待って', 'daily', 1],
  ['괜찮아요.', 'Gwaenchanayo.', '大丈夫です', 'daily', 1],
  ['화이팅!', 'Hwaiting!', 'がんばって！', 'daily', 1],
  ['걱정하지 마세요.', 'Geokjeonghaji maseyo.', '心配しないでください', 'daily', 1],
  ['다행이에요.', 'Dahaengieyo.', 'よかったです', 'daily', 1],
  ['배고파요.', 'Baegopayo.', 'お腹がすきました', 'daily', 1],
  ['피곤해요.', 'Pigonhaeyo.', '疲れました', 'daily', 1],
  ['졸려요.', 'Jollyeoyo.', '眠いです', 'daily', 1],
  ['천천히 하세요.', 'Cheoncheonhi haseyo.', 'ゆっくりやってください', 'daily', 1],
  ['서두르지 마세요.', 'Seodureuji maseyo.', 'あわてないでください', 'daily', 2],
  ['거의 다 왔어요.', 'Geoui da wasseoyo.', 'もうすぐ着きます', 'daily', 2],
  ['가는 중이에요.', 'Ganeun jungieyo.', '向かっている途中です', 'daily', 2],
  ['상황에 따라 달라요.', 'Sanghwange ttara dallayo.', '状況によります', 'daily', 2],
  ['좋은 생각이에요.', 'Joeun saenggagieyo.', 'いい考えですね', 'daily', 2],
  ['한번 볼게요.', 'Hanbeon bolgeyo.', 'ちょっと見てみますね', 'daily', 2],
  ['알아서 하세요.', 'Araseo haseyo.', 'お任せします（ご自由に）', 'daily', 2],
  ['생각해 볼게요.', 'Saenggakhae bolgeyo.', '考えてみます', 'daily', 2],

  // ===== お願い・お礼・謝罪 request =====
  ['감사합니다.', 'Gamsahamnida.', 'ありがとうございます', 'request', 1],
  ['고마워요.', 'Gomawoyo.', 'ありがとう', 'request', 1],
  ['정말 감사합니다.', 'Jeongmal gamsahamnida.', '本当にありがとうございます', 'request', 1],
  ['천만에요.', 'Cheonmaneyo.', 'どういたしまして', 'request', 1],
  ['죄송합니다.', 'Joesonghamnida.', '申し訳ありません', 'request', 1],
  ['미안해요.', 'Mianhaeyo.', 'ごめんなさい', 'request', 1],
  ['실례합니다.', 'Sillyehamnida.', '失礼します（呼びかけ・断り）', 'request', 1],
  ['괜찮습니다.', 'Gwaenchanseumnida.', '構いません', 'request', 1],
  ['부탁해요.', 'Butakaeyo.', 'お願いします', 'request', 1],
  ['도와주세요.', 'Dowajuseyo.', '助けてください', 'request', 1],
  ['다시 한번 말씀해 주세요.', 'Dasi hanbeon malsseumhae juseyo.', 'もう一度言ってください', 'request', 2],
  ['천천히 말해 주세요.', 'Cheoncheonhi malhae juseyo.', 'ゆっくり話してください', 'request', 2],
  ['잠시만 기다려 주세요.', 'Jamsiman gidaryeo juseyo.', '少々お待ちください', 'request', 2],
  ['수고하셨습니다.', 'Sugohasyeotseumnida.', 'お疲れさまでした', 'request', 2],
  ['잘 먹겠습니다.', 'Jal meokgetseumnida.', 'いただきます', 'request', 1],
  ['잘 먹었습니다.', 'Jal meogeotseumnida.', 'ごちそうさまでした', 'request', 1],
  ['번거롭게 해서 죄송합니다.', 'Beongeoropge haeseo joesonghamnida.', 'お手数をおかけして申し訳ありません', 'request', 3],
  ['기다리게 해서 죄송합니다.', 'Gidarige haeseo joesonghamnida.', 'お待たせして申し訳ありません', 'request', 3],
  ['신세 많이 졌습니다.', 'Sinse mani jyeotseumnida.', '大変お世話になりました', 'request', 3],

  // ===== 買い物・食事 shop =====
  ['얼마예요?', 'Eolmayeyo?', 'いくらですか？', 'shop', 1],
  ['너무 비싸요.', 'Neomu bissayo.', '高すぎます', 'shop', 1],
  ['이거 주세요.', 'Igeo juseyo.', 'これください', 'shop', 1],
  ['맛있어요.', 'Masisseoyo.', 'おいしいです', 'shop', 1],
  ['계산해 주세요.', 'Gyesanhae juseyo.', 'お会計お願いします', 'shop', 1],
  ['메뉴 좀 주세요.', 'Menyu jom juseyo.', 'メニューをください', 'shop', 1],
  ['물 좀 주세요.', 'Mul jom juseyo.', 'お水をください', 'shop', 1],
  ['이거 뭐예요?', 'Igeo mwoyeyo?', 'これは何ですか？', 'shop', 1],
  ['깎아 주세요.', 'Kkakka juseyo.', 'まけてください', 'shop', 2],
  ['카드 돼요?', 'Kadeu dwaeyo?', 'カードは使えますか？', 'shop', 2],
  ['그냥 구경하는 거예요.', 'Geunyang gugyeonghaneun geoyeyo.', '見ているだけです', 'shop', 2],
  ['입어 봐도 돼요?', 'Ibeo bwado dwaeyo?', '試着してもいいですか？', 'shop', 2],
  ['다른 색 있어요?', 'Dareun saek isseoyo?', '他の色はありますか？', 'shop', 2],
  ['포장해 주세요.', 'Pojanghae juseyo.', '持ち帰りにしてください', 'shop', 2],
  ['여기서 먹을게요.', 'Yeogiseo meogeulgeyo.', 'ここで食べます', 'shop', 2],
  ['하나 더 주세요.', 'Hana deo juseyo.', 'もう一つください', 'shop', 1],
  ['영수증 주세요.', 'Yeongsujeung juseyo.', 'レシートをください', 'shop', 2],

  // ===== 旅行・道案内 travel =====
  ['화장실이 어디예요?', 'Hwajangsiri eodiyeyo?', 'トイレはどこですか？', 'travel', 1],
  ['역이 어디예요?', 'Yeogi eodiyeyo?', '駅はどこですか？', 'travel', 1],
  ['똑바로 가세요.', 'Ttokbaro gaseyo.', 'まっすぐ行ってください', 'travel', 1],
  ['왼쪽으로 가세요.', 'Oenjjogeuro gaseyo.', '左に行ってください', 'travel', 1],
  ['오른쪽으로 가세요.', 'Oreunjjogeuro gaseyo.', '右に行ってください', 'travel', 1],
  ['여기서 멀어요?', 'Yeogiseo meoreoyo?', 'ここから遠いですか？', 'travel', 1],
  ['어떻게 가요?', 'Eotteoke gayo?', 'どうやって行きますか？', 'travel', 1],
  ['길을 잃었어요.', 'Gireul ireosseoyo.', '道に迷いました', 'travel', 2],
  ['몇 시에 열어요?', 'Myeot sie yeoreoyo?', '何時に開きますか？', 'travel', 2],
  ['예약했어요.', 'Yeyakaesseoyo.', '予約しました', 'travel', 2],
  ['여기 와이파이 돼요?', 'Yeogi waipai dwaeyo?', 'ここWi-Fi使えますか？', 'travel', 2],
  ['사진 좀 찍어 주세요.', 'Sajin jom jjigeo juseyo.', '写真を撮ってください', 'travel', 2],
  ['택시 좀 불러 주세요.', 'Taeksi jom bulleo juseyo.', 'タクシーを呼んでください', 'travel', 3],
  ['이 주소로 가 주세요.', 'I jusoro ga juseyo.', 'この住所まで行ってください', 'travel', 3],
  ['공항까지 얼마나 걸려요?', 'Gonghangkkaji eolmana geollyeoyo?', '空港までどのくらいかかりますか？', 'travel', 3],

  // ===== 気持ち feeling =====
  ['기뻐요.', 'Gippeoyo.', 'うれしいです', 'feeling', 1],
  ['슬퍼요.', 'Seulpeoyo.', '悲しいです', 'feeling', 1],
  ['무서워요.', 'Museowoyo.', '怖いです', 'feeling', 1],
  ['보고 싶어요.', 'Bogo sipeoyo.', '会いたいです', 'feeling', 1],
  ['정말 좋아해요.', 'Jeongmal joahaeyo.', '本当に好きです', 'feeling', 2],
  ['화가 나요.', 'Hwaga nayo.', '腹が立ちます', 'feeling', 2],
  ['부러워요.', 'Bureowoyo.', 'うらやましいです', 'feeling', 2],

  // ===== 電話 phone =====
  ['여보세요.', 'Yeoboseyo.', 'もしもし', 'phone', 1],
  ['누구세요?', 'Nuguseyo?', 'どちら様ですか？', 'phone', 1],
  ['지금 통화 괜찮으세요?', 'Jigeum tonghwa gwaenchaneuseyo?', '今お電話大丈夫ですか？', 'phone', 3],
  ['나중에 다시 걸게요.', 'Najunge dasi geolgeyo.', '後でかけ直します', 'phone', 2],

  // ===== 世間話 smalltalk =====
  ['날씨가 좋네요.', 'Nalssiga jonneyo.', 'いい天気ですね', 'smalltalk', 1],
  ['주말에 뭐 하세요?', 'Jumare mwo haseyo?', '週末は何をなさいますか？', 'smalltalk', 2],
  ['요즘 어떻게 지내세요?', 'Yojeum eotteoke jinaeseyo?', '最近いかがお過ごしですか？', 'smalltalk', 2],
  ['시간 참 빠르네요.', 'Sigan cham ppareuneyo.', '時間が経つのは早いですね', 'smalltalk', 3],

  // ===== 困ったとき trouble =====
  ['한국어를 잘 못해요.', 'Hangugeoreul jal motaeyo.', '韓国語があまりできません', 'trouble', 2],
  ['영어 할 줄 아세요?', 'Yeongeo hal jul aseyo?', '英語はお話しになれますか？', 'trouble', 2],
  ['이거 어떻게 해요?', 'Igeo eotteoke haeyo?', 'これはどうすればいいですか？', 'trouble', 1],
  ['다시 설명해 주시겠어요?', 'Dasi seolmyeonghae jusigesseoyo?', 'もう一度説明していただけますか？', 'trouble', 3],
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

const questions = PHRASES.map(([ko, romaja, ja, theme, level], i) => {
  const distract = shuffle(allJa.filter((x) => x !== ja)).slice(0, 3)
  return {
    id: `koph-${String(i + 1).padStart(4, '0')}`,
    category: 'korean',
    prompt: `「${ko}」の意味は？`,
    answer: ja,
    choices: shuffle([ja, ...distract]),
    difficulty: level,
    tags: ['phrase', theme],
    pronunciation: romaja,
    verified: true,
  }
}).filter((q) => new Set(q.choices).size === 4)

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'phrases.json'), JSON.stringify(questions))
const byLevel = { 1: 0, 2: 0, 3: 0 }
const byTheme = {}
for (const [, , , theme, lv] of PHRASES) {
  byLevel[lv]++
  byTheme[theme] = (byTheme[theme] || 0) + 1
}
const uniqueJa = new Set(allJa).size
console.log('韓国語表現:', questions.length, '件')
console.log('  初級(Lv1):', byLevel[1], ' / 中級(Lv2):', byLevel[2], ' / 上級(Lv3):', byLevel[3])
console.log('  和訳ユニーク数:', uniqueJa, '/ 総数:', PHRASES.length, '/ 重複:', PHRASES.length - uniqueJa)
console.log('  テーマ別:', JSON.stringify(byTheme))
