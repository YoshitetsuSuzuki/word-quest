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

/** 文字一覧の1マス。char は ja/en で必ず同じものを並べる（読みだけが変わる） */
export interface GuideChartCell {
  /** その言語での表記。"" は並びを揃えるための空きマス（五十音の「や行」など） */
  char: string
  /** 音の目安。日本語版はカタカナ、英語版はローマ字 */
  reading: string
  /** 任意。意味や補足。例語を並べるときに使う */
  hint?: string
}

/** 文字一覧のひとかたまり。「子音 14」「母音 10」のような単位 */
export interface GuideChartGroup {
  label: string
  cells: GuideChartCell[]
  /** 1行に並べる数。既定 5。例語のように長いものは 2 にする */
  cols?: number
  /** 右から左へ並べる（アラビア文字・ウルドゥー文字） */
  rtl?: boolean
}

/**
 * 文字の一覧。
 * 文字数が有限の言語は全部載せる。漢字のように載せきれない言語は、
 * 代わりに「読み方の要点」と「例語に読みを振ったもの」を置く。
 */
export interface GuideChart {
  title: string
  /** 一覧の読み方の断り書き。「これで全部ではない」など */
  note?: string
  groups: GuideChartGroup[]
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
  /** 文字の一覧。載せきれない言語（中国語など）は読み方の要点を置く。無い言語は省略 */
  chart?: GuideChart
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
