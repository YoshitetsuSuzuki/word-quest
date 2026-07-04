import { buildQuestions, type WordSeed } from './buildQuestions'

/**
 * 中国語 mockData。英単語と全く同じ Question 構造で表現でき、
 * Core/Engine/Repository は一切変更せずに扱える（プラットフォームの横展開実証）。
 */

const seeds: WordSeed[] = [
  // --- 難易度1: 基礎 ---
  { word: '你好（nǐ hǎo）', meaning: 'こんにちは', distractors: ['さようなら', 'ありがとう', 'ごめんなさい'], difficulty: 1, tags: ['greeting', 'basic'], example: '你好，我叫小明。' },
  { word: '谢谢（xièxie）', meaning: 'ありがとう', distractors: ['こんにちは', 'はい', 'いいえ'], difficulty: 1, tags: ['greeting', 'basic'], example: '谢谢你的帮助。' },
  { word: '水（shuǐ）', meaning: '水', distractors: ['火', 'お茶', 'ご飯'], difficulty: 1, tags: ['noun', 'basic'], example: '我想喝水。' },
  { word: '吃（chī）', meaning: '食べる', distractors: ['飲む', '見る', '行く'], difficulty: 1, tags: ['verb', 'basic'], example: '你吃饭了吗？' },
  { word: '大（dà）', meaning: '大きい', distractors: ['小さい', '多い', '高い'], difficulty: 1, tags: ['adjective', 'basic'], example: '这个房子很大。' },
  { word: '好（hǎo）', meaning: '良い', distractors: ['悪い', '古い', '遠い'], difficulty: 1, tags: ['adjective', 'basic'], example: '今天天气很好。' },
  { word: '人（rén）', meaning: '人', distractors: ['犬', '木', '山'], difficulty: 1, tags: ['noun', 'basic'], example: '这里有很多人。' },
  { word: '爱（ài）', meaning: '愛する', distractors: ['憎む', '忘れる', '待つ'], difficulty: 1, tags: ['verb', 'basic'], example: '我爱我的家人。' },

  // --- 難易度2 ---
  { word: '朋友（péngyou）', meaning: '友達', distractors: ['家族', '先生', '医者'], difficulty: 2, tags: ['noun'], example: '他是我的好朋友。' },
  { word: '学习（xuéxí）', meaning: '勉強する', distractors: ['遊ぶ', '働く', '休む'], difficulty: 2, tags: ['verb'], example: '我在学习中文。' },
  { word: '漂亮（piàoliang）', meaning: '美しい', distractors: ['醜い', '普通の', '危険な'], difficulty: 2, tags: ['adjective'], example: '这件衣服很漂亮。' },
  { word: '便宜（piányi）', meaning: '安い', distractors: ['高い', '重い', '新しい'], difficulty: 2, tags: ['adjective', 'shopping'], example: '这个东西很便宜。' },
  { word: '喜欢（xǐhuan）', meaning: '好き', distractors: ['嫌い', '怖い', '悲しい'], difficulty: 2, tags: ['verb'], example: '我喜欢喝咖啡。' },
  { word: '医院（yīyuàn）', meaning: '病院', distractors: ['学校', '銀行', '公園'], difficulty: 2, tags: ['place'], example: '他去医院看病。' },
  { word: '忙（máng）', meaning: '忙しい', distractors: ['暇な', '静かな', '疲れた'], difficulty: 2, tags: ['adjective'], example: '我今天很忙。' },
  { word: '快（kuài）', meaning: '速い', distractors: ['遅い', '早い', '近い'], difficulty: 2, tags: ['adjective'], example: '这辆车很快。' },

  // --- 難易度3 ---
  { word: '经济（jīngjì）', meaning: '経済', distractors: ['政治', '文化', '歴史'], difficulty: 3, tags: ['noun', 'business'], example: '中国的经济发展很快。' },
  { word: '环境（huánjìng）', meaning: '環境', distractors: ['条件', '状況', '気分'], difficulty: 3, tags: ['noun'], example: '保护环境很重要。' },
  { word: '认为（rènwéi）', meaning: '〜と考える', distractors: ['忘れる', '疑う', '感じる'], difficulty: 3, tags: ['verb'], example: '我认为这个主意很好。' },
  { word: '重要（zhòngyào）', meaning: '重要な', distractors: ['簡単な', '無駄な', '危険な'], difficulty: 3, tags: ['adjective'], example: '健康非常重要。' },
  { word: '习惯（xíguàn）', meaning: '習慣', distractors: ['趣味', '規則', '目標'], difficulty: 3, tags: ['noun'], example: '早起是好习惯。' },
  { word: '解决（jiějué）', meaning: '解決する', distractors: ['引き起こす', '無視する', '延期する'], difficulty: 3, tags: ['verb', 'business'], example: '我们要解决这个问题。' },
  { word: '机会（jīhuì）', meaning: 'チャンス', distractors: ['危機', '責任', '義務'], difficulty: 3, tags: ['noun'], example: '这是一个好机会。' },
  { word: '影响（yǐngxiǎng）', meaning: '影響', distractors: ['結果', '原因', '効果'], difficulty: 3, tags: ['noun'], example: '天气影响我的心情。' },

  // --- 難易度4 ---
  { word: '坚持（jiānchí）', meaning: 'やり通す', distractors: ['諦める', '避ける', '妥協する'], difficulty: 4, tags: ['verb', 'advanced'], example: '坚持就是胜利。' },
  { word: '复杂（fùzá）', meaning: '複雑な', distractors: ['単純な', '明確な', '容易な'], difficulty: 4, tags: ['adjective', 'advanced'], example: '这个问题很复杂。' },
  { word: '效率（xiàolǜ）', meaning: '効率', distractors: ['費用', '品質', '速度'], difficulty: 4, tags: ['noun', 'business'], example: '提高工作效率。' },
  { word: '责任（zérèn）', meaning: '責任', distractors: ['権利', '自由', '義理'], difficulty: 4, tags: ['noun', 'business'], example: '这是我的责任。' },
  { word: '谨慎（jǐnshèn）', meaning: '慎重な', distractors: ['軽率な', '大胆な', '陽気な'], difficulty: 4, tags: ['adjective', 'advanced'], example: '做决定要谨慎。' },
  { word: '灵活（línghuó）', meaning: '柔軟な', distractors: ['硬直した', '頑固な', '鈍い'], difficulty: 4, tags: ['adjective', 'advanced'], example: '他的头脑很灵活。' },
]

export const chineseQuestions = buildQuestions('chinese', 'zh', seeds, (w) => `「${w}」の意味は？`)
