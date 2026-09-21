// ============================================================================
// はじめかたガイドの型
//
// その言語を初めて選んだ人が、最初の3分で「読める・言える」ようになるための
// 最小限の情報だけを持つ。辞書でも文法書でもない。
// 「안녕하세요」という模様を見せられていきなり4択を迫られる、という
// これまでの入口の悪さを直すためのもの。
// ============================================================================
import type { Category } from './index'

/** 実例。reading は日本語版ならカタカナ、英語版ならローマ字表記 */
export interface GuideSample {
  /** その言語での表記 */
  text: string
  /** 音の目安 */
  reading: string
  /** 意味 */
  meaning: string
}

/** 見出し＋本文＋（任意で）実例 */
export interface GuidePoint {
  title: string
  body: string
  sample?: GuideSample
}

/** 1言語ぶんのガイド（1ロケール分） */
export interface GuideContent {
  /** 「日本語と語順が同じ、いちばん学びやすい外国語」のような一言 */
  tagline: string
  /** 文字の話。何文字あって、どう組むか */
  script: GuidePoint & {
    /** 文字の組み立てを見せる（ハングルなど）。無い言語は省略 */
    build?: { parts: string; result: string; reading: string }
  }
  /** 発音。日本語話者/英語話者がつまずく点だけ 2〜4 個 */
  sounds: GuidePoint[]
  /** 語順 */
  order: GuidePoint & { type: string }
  /** まず言えるようになる挨拶 3〜5 個 */
  greetings: GuideSample[]
  /** 最初の壁。ここだけ知っておけば転ばない、という1つ */
  pitfall: GuidePoint
}

/** public/guide/<category>.json の中身 */
export interface LanguageGuide {
  category: Category
  ja: GuideContent
  en: GuideContent
}
