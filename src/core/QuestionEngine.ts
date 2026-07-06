import type { Question, Category } from '../types'
import type { IQuestionRepository } from '../repositories/types'

/**
 * 母語(base language)が日本語のカテゴリ。これらは answer がそのまま日本語なので、
 * ja ロケールでは glosses.ja が無くても出題できる。
 * 西/仏/独 は英語を母語(answer)としつつ、ピボット確定した glosses.ja を持つ語だけ
 * ja ロケールで出題する。
 */
const JA_NATIVE: ReadonlySet<Category> = new Set<Category>(['english', 'chinese', 'korean'])

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 出題エンジン（汎用）。
 * QuestionRepository から問題を引き、出題順・選択肢順を制御する。
 * category を変えるだけで英語以外のジャンルにも使える。
 */
export class QuestionEngine {
  constructor(private repo: IQuestionRepository) {}

  /** 選択肢をシャッフルした問題を返す（表示直前に呼ぶ） */
  private withShuffledChoices(q: Question): Question {
    return { ...q, choices: shuffle(q.choices) }
  }

  /**
   * その語をこのロケールで出題できるか（対象ロケールの訳を持つか）。
   * en: glosses.en が必要。
   * ja: 母語が日本語のカテゴリ(英/中/韓)は answer が日本語なので常に可。
   *     ピボット言語(西/仏/独)は日本語訳(glosses.ja)を持つ語のみ。
   */
  private glossOk(q: Question, locale: 'ja' | 'en'): boolean {
    if (locale === 'en') return !!q.glosses?.en
    return JA_NATIVE.has(q.category) || !!q.glosses?.ja
  }

  /**
   * カテゴリの問題（選択肢シャッフル済み）をランダム順で返す。
   * level(1-5)を指定するとその難易度に絞る。該当が少なすぎる場合は全体にフォールバック。
   */
  buildSession(category: Category, count: number, level = 0, locale: 'ja' | 'en' = 'ja'): Question[] {
    const all = this.repo.getByCategory(category)
    // 対象ロケールの訳を持つ語だけ出題（ja ネイティブ言語は全語＝現状不変）
    const full = all.filter((q) => this.glossOk(q, locale))
    let pool = level > 0 ? full.filter((q) => q.difficulty === level) : full
    if (pool.length < count) pool = full // 級内が少ない場合は全体から
    return shuffle(pool).slice(0, count).map((q) => this.withShuffledChoices(q))
  }

  /**
   * リスニング用セッション。
   * 英語は例文＋表層形を持つ語のみ（例文読み上げ→穴埋め）。他言語は通常プール（音声→4択）。
   */
  buildListeningSession(category: Category, count: number, level = 0, locale: 'ja' | 'en' = 'ja'): Question[] {
    const all = this.repo.getByCategory(category)
    // 対象ロケールの訳を持つ語だけ母集合にする（ja ネイティブ言語は全語＝現状不変）
    const full = all.filter((q) => this.glossOk(q, locale))
    const withEx = full.filter((q) => q.example && q.exampleForm)
    let pool: Question[]
    if (withEx.length >= count) {
      // 例文が十分あれば穴埋め(文章読み上げ)で出題
      pool = level > 0 ? withEx.filter((q) => q.difficulty === level) : withEx
      if (pool.length < count) pool = withEx
    } else {
      // 例文がまだ少ない言語は従来どおり(単語音声→意味の4択)
      pool = level > 0 ? full.filter((q) => q.difficulty === level) : full
      if (pool.length < count) pool = full
    }
    return shuffle(pool).slice(0, count).map((q) => this.withShuffledChoices(q))
  }

  /**
   * 例文暗記セッション。例文＋表層形を持つ語のうち、deckIds(自分の★語)を優先し、
   * 不足分をカテゴリの例文語から補充する(A＋B)。locale='en' 等では対象ロケール訳を持つ語に限定。
   */
  buildExampleSession(category: Category, count: number, deckIds: string[], locale: 'ja' | 'en' = 'ja'): Question[] {
    const all = this.repo.getByCategory(category)
    const localeOk = (q: Question) => this.glossOk(q, locale)
    const hasEx = (q: Question) => !!q.example && !!q.exampleForm
    const deckSet = new Set(deckIds)
    // A: ★語で例文を持つもの
    const a = all.filter((q) => deckSet.has(q.id) && hasEx(q) && localeOk(q))
    // B: それ以外の例文語
    const b = all.filter((q) => !deckSet.has(q.id) && hasEx(q) && localeOk(q))
    const picked = [...shuffle(a), ...shuffle(b)].slice(0, count)
    return picked.map((q) => this.withShuffledChoices(q))
  }

  /** 指定IDリストから復習セッションを作る（間隔反復の期限到来分など） */
  buildReviewSession(ids: string[], count: number): Question[] {
    const picked: Question[] = []
    for (const id of ids) {
      const q = this.repo.getById(id)
      if (q) picked.push(this.withShuffledChoices(q))
      if (picked.length >= count) break
    }
    return picked
  }

  /** ロケール別の訳語を返す(未指定ロケールは answer にフォールバック) */
  localizedGloss(q: Question, locale: 'ja' | 'en'): string {
    return q.glosses?.[locale] ?? q.answer
  }

  /** 例文をターゲット言語文とロケール別訳文に分解する(ja は従来の和訳にフォールバック) */
  localizedExample(q: Question, locale: 'ja' | 'en'): { text: string; translation: string } | null {
    if (!q.example) return null
    const i = q.example.indexOf(' — ')
    const text = i >= 0 ? q.example.slice(0, i) : q.example
    const jaTr = i >= 0 ? q.example.slice(i + 3) : ''
    // 母語の訳があればそれ。無い場合、ja は従来の和訳、それ以外(英語等)は空(=日本語を見せない)
    const translation = q.exampleTranslations?.[locale] ?? (locale === 'ja' ? jaTr : '')
    return { text, translation }
  }

  /** 英語ロケール等で、その語の訳とダミー3つ(同カテゴリ)で4択を作る */
  localizedChoices(q: Question, locale: 'ja' | 'en'): string[] {
    const correct = this.localizedGloss(q, locale)
    // 非jaのダミーは、その言語の訳を持つ語だけから選ぶ(言語混在の誤答肢を防ぐ)
    const pool = this.repo.getByCategory(q.category)
      .filter((o) => o.id !== q.id && this.glossOk(o, locale))
      .map((o) => this.localizedGloss(o, locale))
    const used = new Set([correct])
    const out: string[] = []
    for (const g of shuffle(pool)) {
      if (out.length >= 3) break
      if (!used.has(g)) {
        used.add(g)
        out.push(g)
      }
    }
    return shuffle([correct, ...out])
  }

  getById(id: string): Question | undefined {
    return this.repo.getById(id)
  }

  /** 「今日の単語」: 日付+カテゴリから決定的に1語選ぶ(全ユーザー同日同語) */
  questionOfTheDay(category: Category, dateStr: string): Question | undefined {
    const pool = this.repo.getByCategory(category)
    if (pool.length === 0) return undefined
    let h = 0
    const seed = `${dateStr}:${category}`
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    return pool[h % pool.length]
  }

  /** そのカテゴリに存在する難易度(1-5)を昇順で返す */
  availableLevels(category: Category): number[] {
    return [...new Set(this.repo.getByCategory(category).map((q) => q.difficulty))].sort((a, b) => a - b)
  }

  /** 級ごとの語数（図鑑の分母） */
  levelSize(category: Category, level: number): number {
    return this.repo.getByCategory(category).filter((q) => q.difficulty === level).length
  }

  /** そのカテゴリの出題可能語数（習得率の分母などに使う） */
  categorySize(category: Category): number {
    return this.repo.getByCategory(category).length
  }
}
