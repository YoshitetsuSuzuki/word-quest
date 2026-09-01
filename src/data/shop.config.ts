import type { ShopItemDef } from '../types'

/**
 * ショップ商品（データ駆動）。
 * Pay to Win にしない: 能力ではなく見た目・称号のみを販売する。
 */
export const shopItems: ShopItemDef[] = [
  // 称号
  { id: 's-title-rookie', name: '称号「新星」', nameEn: 'Title: Rising Star', kind: 'title', price: 50, preview: '新星', previewEn: 'Rising Star', description: 'プロフィールに表示される称号', descriptionEn: 'A title shown on your profile' },
  { id: 's-title-scholar', name: '称号「学者」', nameEn: 'Title: Scholar', kind: 'title', price: 150, preview: '学者', previewEn: 'Scholar', description: '知識を極めし者の称号', descriptionEn: 'A title for masters of knowledge' },
  { id: 's-title-master', name: '称号「単語王」', nameEn: 'Title: Word King', kind: 'title', price: 400, preview: '単語王', previewEn: 'Word King', description: '頂点に立つ者の称号', descriptionEn: 'A title for those at the very top' },
  // ストリーク節目の限定称号(購入不可・連続学習で獲得)
  { id: 's-title-streak7', name: '称号「七日の炎」', nameEn: 'Title: Seven-Day Flame', kind: 'title', price: 0, preview: '七日の炎', previewEn: 'Seven-Day Flame', description: '7日連続学習の証', descriptionEn: 'Proof of a 7-day streak', limited: true },
  { id: 's-title-streak30', name: '称号「月の求道者」', nameEn: 'Title: Seeker of the Moon', kind: 'title', price: 0, preview: '月の求道者', previewEn: 'Seeker of the Moon', description: '30日連続学習の証', descriptionEn: 'Proof of a 30-day streak', limited: true },
  { id: 's-title-streak100', name: '称号「百日の賢者」', nameEn: 'Title: Hundred-Day Sage', kind: 'title', price: 0, preview: '百日の賢者', previewEn: 'Hundred-Day Sage', description: '100日連続学習の証', descriptionEn: 'Proof of a 100-day streak', limited: true },
  { id: 's-title-streak365', name: '称号「一年の伝説」', nameEn: 'Title: Legend of the Year', kind: 'title', price: 0, preview: '一年の伝説', previewEn: 'Legend of the Year', description: '365日連続学習の証', descriptionEn: 'Proof of a 365-day streak', limited: true },
  // アイコン枠
  { id: 's-frame-bronze', name: 'ブロンズ枠', nameEn: 'Bronze Frame', kind: 'frame', price: 80, preview: 'ring-amber-600', description: 'アイコンを縁取るブロンズの枠', descriptionEn: 'A bronze frame around your icon' },
  { id: 's-frame-silver', name: 'シルバー枠', nameEn: 'Silver Frame', kind: 'frame', price: 200, preview: 'ring-slate-300', description: '輝くシルバーの枠', descriptionEn: 'A shining silver frame' },
  { id: 's-frame-gold', name: 'ゴールド枠', nameEn: 'Gold Frame', kind: 'frame', price: 500, preview: 'ring-gold', description: '最高峰のゴールド枠', descriptionEn: 'The finest gold frame' },
  // 正解エフェクト
  { id: 's-effect-spark', name: 'エフェクト「火花」', nameEn: 'Effect: Sparks', kind: 'effect', price: 120, preview: '✨', description: '正解時に火花が舞う', descriptionEn: 'Sparks fly on a correct answer' },
  { id: 's-effect-star', name: 'エフェクト「流星」', nameEn: 'Effect: Shooting Star', kind: 'effect', price: 250, preview: '⭐', description: '正解時に星が降る', descriptionEn: 'Stars fall on a correct answer' },
  { id: 's-effect-fire', name: 'エフェクト「業火」', nameEn: 'Effect: Inferno', kind: 'effect', price: 350, preview: '🔥', description: '正解時に炎が燃え上がる', descriptionEn: 'Flames blaze on a correct answer' },
]
