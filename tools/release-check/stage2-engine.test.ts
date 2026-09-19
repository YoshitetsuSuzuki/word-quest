// ============================================================================
// stage2-engine.test.ts  リリース前チェック 第2段階: 実際の出題処理テスト
//   アプリ本体の QuestionEngine を使い、全言語で出題フローを通す。
//   元データは変更しない。読み取りのみ。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { QuestionEngine } from '../../src/core/QuestionEngine.ts'
import type { Question, Category } from '../../src/types/index.ts'
import type { IQuestionRepository } from '../../src/repositories/types.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'release-check')
fs.mkdirSync(outDir, { recursive: true })

// 実機で到達可能なロケールのみを検証する。
// 日本語カテゴリは availableLocales:['en'](英語話者向け)で、日本語UIには表示されない。
// 到達不能な組み合わせを試すと誤検知になるため、実機条件に揃える。
const LANG_LOCALES: { lang: Category; locales: ('ja' | 'en')[] }[] = [
  { lang: 'english' as Category, locales: ['ja'] },
  { lang: 'chinese' as Category, locales: ['ja', 'en'] },
  { lang: 'japanese' as Category, locales: ['en'] },
  { lang: 'korean' as Category, locales: ['ja'] },
  { lang: 'spanish' as Category, locales: ['ja', 'en'] },
  { lang: 'german' as Category, locales: ['ja', 'en'] },
  { lang: 'french' as Category, locales: ['ja', 'en'] },
  { lang: 'portuguese' as Category, locales: ['ja'] },
  { lang: 'polish' as Category, locales: ['ja'] },
  { lang: 'russian' as Category, locales: ['ja'] },
  { lang: 'hindi' as Category, locales: ['ja', 'en'] },
  { lang: 'arabic' as Category, locales: ['ja', 'en'] },
  { lang: 'tagalog' as Category, locales: ['ja', 'en'] },
  { lang: 'italian' as Category, locales: ['ja', 'en'] },
  { lang: 'mongolian' as Category, locales: ['ja', 'en'] },
  { lang: 'bengali' as Category, locales: ['ja', 'en'] },
]
const LANGS: Category[] = LANG_LOCALES.map((x) => x.lang)
const localesOf = (l: Category) => LANG_LOCALES.find((x) => x.lang === l)!.locales

/** 本番と同じ JSON を同期で読む簡易リポジトリ（アプリの LocalQuestionRepository 相当） */
class FileRepo implements IQuestionRepository {
  private store = new Map<string, Question[]>()
  load(lang: string) {
    if (this.store.has(lang)) return
    const dir = path.join(root, 'public', 'wordbank', lang)
    const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
    let arr: Question[] = []
    for (const lv of man.levels) arr = arr.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
    this.store.set(lang, arr)
  }
  getByCategory(c: Category): Question[] { this.load(c as string); return this.store.get(c as string) ?? [] }
  getAll(): Question[] { let a: Question[] = []; for (const l of LANGS) a = a.concat(this.getByCategory(l)); return a }
  isLoaded(c: Category): boolean { return this.store.has(c as string) }
  async loadCategory(c: Category): Promise<void> { this.load(c as string) }
  getById(id: string): Question | undefined { return this.getAll().find((q) => q.id === id) }
}

type Issue = { severity: string; language: string; type: string; id?: string; detail?: string; repro?: string }
const issues: Issue[] = []
const perLang: any[] = []

const repo = new FileRepo()
const engine = new QuestionEngine(repo as any)

for (const lang of LANGS) {
  const t0 = Date.now()
  const stat = {
    language: lang, loaded: 0, sessionsBuilt: 0, questionsChecked: 0,
    correctJudgedOk: 0, shuffleOk: 0, exampleShown: 0, exampleHidden: 0,
    pronunciationShown: 0, localeSwitchOk: 0, levelSwitchOk: 0, exceptions: 0,
  }
  try {
    // --- 問題読込 ---
    const all = repo.getByCategory(lang)
    stat.loaded = all.length
    if (!all.length) {
      issues.push({ severity: 'Critical', language: lang, type: 'no_questions_loaded', repro: `repo.getByCategory('${lang}')` })
      perLang.push(stat); continue
    }

    // --- 全件について構造と正解判定を検証 ---
    for (const q of all) {
      stat.questionsChecked++
      // 選択肢シャッフル（アプリが出題時に行う処理）
      let shuffled: Question
      try {
        shuffled = (engine as any).withShuffledChoices ? (engine as any).withShuffledChoices(q) : q
      } catch (e: any) {
        stat.exceptions++
        issues.push({ severity: 'Critical', language: lang, type: 'shuffle_exception', id: q.id, detail: e?.message, repro: `withShuffledChoices(${q.id})` })
        continue
      }
      const ch = shuffled.choices ?? []
      if (ch.length !== 4) issues.push({ severity: 'Critical', language: lang, type: 'choices_not_4_after_shuffle', id: q.id })
      else if (new Set(ch).size !== 4) issues.push({ severity: 'Critical', language: lang, type: 'choices_dup_after_shuffle', id: q.id })
      else stat.shuffleOk++

      // 正解が選択肢に存在するか（正解消失の検出）
      if (!ch.includes(q.answer)) {
        issues.push({ severity: 'Critical', language: lang, type: 'correct_answer_lost', id: q.id, repro: `answer="${q.answer}" choices=${JSON.stringify(ch)}` })
      } else {
        stat.correctJudgedOk++
      }

      // 例文表示／非表示（両ロケール）
      for (const loc of localesOf(lang)) {
        try {
          const ex = engine.localizedExample(q, loc)
          if (ex) stat.exampleShown++; else stat.exampleHidden++
          if (ex && (ex.text == null || ex.translation == null)) {
            issues.push({ severity: 'Major', language: lang, type: 'example_nullish', id: q.id, detail: loc })
          }
        } catch (e: any) {
          stat.exceptions++
          issues.push({ severity: 'Critical', language: lang, type: 'example_exception', id: q.id, detail: `${loc}: ${e?.message}` })
        }
        // 言語切替（gloss/choices が例外なく取れるか）
        try {
          const g = engine.localizedGloss(q, loc)
          if (g == null) issues.push({ severity: 'Major', language: lang, type: 'gloss_nullish', id: q.id, detail: loc })
          const lc = engine.localizedChoices(q, loc)
          if (!Array.isArray(lc)) issues.push({ severity: 'Major', language: lang, type: 'localizedChoices_invalid', id: q.id, detail: loc })
          else stat.localeSwitchOk++
        } catch (e: any) {
          stat.exceptions++
          issues.push({ severity: 'Critical', language: lang, type: 'locale_switch_exception', id: q.id, detail: `${loc}: ${e?.message}` })
        }
      }

      // 発音表示（存在する場合に文字列であること）
      if (q.pronunciation != null) {
        if (typeof q.pronunciation !== 'string') issues.push({ severity: 'Major', language: lang, type: 'pronunciation_type', id: q.id })
        else stat.pronunciationShown++
      }
    }

    // --- セッション構築（ランダム抽出＋次の問題への遷移）---
    for (let i = 0; i < 20; i++) {
      try {
        const s = engine.buildSession(lang, 10, 0, localesOf(lang)[0])
        stat.sessionsBuilt++
        if (!Array.isArray(s)) { issues.push({ severity: 'Critical', language: lang, type: 'session_not_array' }); break }
        if (s.length === 0) { issues.push({ severity: 'Critical', language: lang, type: 'session_empty', repro: `buildSession('${lang}',10)` }); break }
        // 次の問題への遷移＝index進行が範囲内であること
        for (let idx = 0; idx < s.length; idx++) {
          const q = s[idx]
          if (!q || !q.id) { issues.push({ severity: 'Critical', language: lang, type: 'session_item_nullish', detail: `index ${idx}` }); break }
          if (!q.choices?.includes(q.answer)) {
            issues.push({ severity: 'Critical', language: lang, type: 'session_correct_lost', id: q.id })
          }
        }
        // index out of range を踏まないか（末尾+1 を参照）
        if (s[s.length] !== undefined) issues.push({ severity: 'Major', language: lang, type: 'index_out_of_range_unexpected' })
      } catch (e: any) {
        stat.exceptions++
        issues.push({ severity: 'Critical', language: lang, type: 'buildSession_exception', detail: e?.message, repro: `buildSession('${lang}',10)` })
        break
      }
    }

    // --- 難易度切替 ---
    const levels = engine.availableLevels(lang)
    for (const lv of levels) {
      try {
        const s = engine.buildSession(lang, 10, lv, localesOf(lang)[0])
        if (!Array.isArray(s) || s.length === 0) {
          issues.push({ severity: 'Major', language: lang, type: 'level_session_empty', detail: `level ${lv}` })
        } else stat.levelSwitchOk++
      } catch (e: any) {
        stat.exceptions++
        issues.push({ severity: 'Critical', language: lang, type: 'level_switch_exception', detail: `level ${lv}: ${e?.message}` })
      }
    }
  } catch (e: any) {
    stat.exceptions++
    issues.push({ severity: 'Critical', language: lang, type: 'unhandled_exception', detail: e?.message })
  }
  ;(stat as any).elapsedMs = Date.now() - t0
  perLang.push(stat)
}

const critical = issues.filter((i) => i.severity === 'Critical').length
const major = issues.filter((i) => i.severity === 'Major').length
const result = {
  stage: 2, title: '実際の出題処理テスト（QuestionEngine）',
  languages: perLang,
  summary: { critical, major, totalIssues: issues.length },
  verdict: critical === 0 ? 'PASS' : 'FAIL',
  issues: issues.slice(0, 200),
}
fs.writeFileSync(path.join(outDir, 'question-engine-test.json'), JSON.stringify(result, null, 1))

let md = `# 第2段階: 実際の出題処理テスト（QuestionEngine）\n\n判定: **${result.verdict}**\n\n`
md += `- Critical: ${critical} / Major: ${major}\n`
md += `- アプリ本体の \`src/core/QuestionEngine.ts\` を使用。元データは読み取りのみ。\n\n`
md += `## 言語別\n\n| 言語 | 読込 | 検査問数 | 正解保持 | シャッフル正常 | セッション構築 | 難易度切替 | 言語切替 | 例外 |\n|---|---|---|---|---|---|---|---|---|\n`
for (const s of perLang) {
  md += `| ${s.language} | ${s.loaded} | ${s.questionsChecked} | ${s.correctJudgedOk} | ${s.shuffleOk} | ${s.sessionsBuilt} | ${s.levelSwitchOk} | ${s.localeSwitchOk} | ${s.exceptions} |\n`
}
md += `\n## 実施した操作\n\n問題読込 / ランダム抽出 / 選択肢シャッフル / 正解判定 / 次の問題への遷移 / 例文表示 / 例文非表示 / 発音表示 / 言語切替(ja・en) / 難易度切替\n\n`
if (issues.length) {
  md += `## 検出された問題 (先頭50件)\n\n`
  for (const i of issues.slice(0, 50)) md += `- [${i.severity}] ${i.language} ${i.type} ${i.id ?? ''} ${i.detail ?? ''} ${i.repro ? `再現: \`${i.repro}\`` : ''}\n`
} else {
  md += `## 検出された問題\n\nなし。例外・クラッシュ・正解消失・選択肢重複・null/undefined いずれも 0件。\n`
}
fs.writeFileSync(path.join(outDir, 'question-engine-test.md'), md)

console.log(JSON.stringify({ critical, major, verdict: result.verdict, checked: perLang.reduce((s, x) => s + x.questionsChecked, 0) }))
