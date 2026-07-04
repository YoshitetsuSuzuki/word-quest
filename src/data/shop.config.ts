import type { ShopItemDef } from '../types'

/**
 * ショップ商品（データ駆動）。
 * Pay to Win にしない: 能力ではなく見た目・称号のみを販売する。
 */
export const shopItems: ShopItemDef[] = [
  // 称号
  { id: 's-title-rookie', name: '称号「新星」', kind: 'title', price: 50, preview: '新星', description: 'プロフィールに表示される称号' },
  { id: 's-title-scholar', name: '称号「学者」', kind: 'title', price: 150, preview: '学者', description: '知識を極めし者の称号' },
  { id: 's-title-master', name: '称号「単語王」', kind: 'title', price: 400, preview: '単語王', description: '頂点に立つ者の称号' },
  // アイコン枠
  { id: 's-frame-bronze', name: 'ブロンズ枠', kind: 'frame', price: 80, preview: 'ring-amber-600', description: 'アイコンを縁取るブロンズの枠' },
  { id: 's-frame-silver', name: 'シルバー枠', kind: 'frame', price: 200, preview: 'ring-slate-300', description: '輝くシルバーの枠' },
  { id: 's-frame-gold', name: 'ゴールド枠', kind: 'frame', price: 500, preview: 'ring-gold', description: '最高峰のゴールド枠' },
  // 正解エフェクト
  { id: 's-effect-spark', name: 'エフェクト「火花」', kind: 'effect', price: 120, preview: '✨', description: '正解時に火花が舞う' },
  { id: 's-effect-star', name: 'エフェクト「流星」', kind: 'effect', price: 250, preview: '⭐', description: '正解時に星が降る' },
  { id: 's-effect-fire', name: 'エフェクト「業火」', kind: 'effect', price: 350, preview: '🔥', description: '正解時に炎が燃え上がる' },
]
