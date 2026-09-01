// ============================================================================
// stage1-integrity.mjs  リリース前チェック 第1段階: 元データの構造検証
//   元データは一切変更しない。機械的な整合のみを見る（意味の監査はしない）。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'release-check')
fs.mkdirSync(outDir, { recursive: true })

const LANGS = ['english', 'chinese', 'japanese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']

const issues = []   // 公開事故につながる問題のみ
const perLang = []
let grandTotal = 0
const globalIds = new Map() // id -> lang（全体でのID重複も見る）

for (const lang of LANGS) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const manPath = path.join(dir, 'manifest.json')
  const L = { language: lang, total: 0, levels: [], checks: {} }

  if (!fs.existsSync(manPath)) {
    issues.push({ severity: 'Critical', language: lang, type: 'manifest_missing', detail: 'manifest.json が存在しない' })
    perLang.push({ ...L, fatal: true })
    continue
  }

  let man
  try { man = JSON.parse(fs.readFileSync(manPath, 'utf8')) } catch (e) {
    issues.push({ severity: 'Critical', language: lang, type: 'manifest_parse_error', detail: e.message })
    perLang.push({ ...L, fatal: true }); continue
  }

  const ids = new Set()
  const cnt = {
    parseError: 0, emptyPrompt: 0, emptyAnswer: 0, choicesNot4: 0,
    answerNotInChoices: 0, dupChoices: 0, typeError: 0, nullish: 0, idDup: 0, idMissing: 0,
    manifestMismatch: 0,
  }

  for (const lv of man.levels || []) {
    const p = path.join(dir, lv.file)
    if (!fs.existsSync(p)) {
      issues.push({ severity: 'Critical', language: lang, type: 'level_file_missing', detail: lv.file })
      cnt.parseError++
      continue
    }
    let arr
    try { arr = JSON.parse(fs.readFileSync(p, 'utf8')) } catch (e) {
      issues.push({ severity: 'Critical', language: lang, type: 'json_parse_error', detail: `${lv.file}: ${e.message}` })
      cnt.parseError++; continue
    }
    if (!Array.isArray(arr)) {
      issues.push({ severity: 'Critical', language: lang, type: 'not_an_array', detail: lv.file })
      cnt.parseError++; continue
    }

    // manifest の count と実件数の一致
    if (typeof lv.count === 'number' && lv.count !== arr.length) {
      cnt.manifestMismatch++
      issues.push({ severity: 'Major', language: lang, type: 'manifest_count_mismatch', detail: `${lv.file}: manifest=${lv.count} 実際=${arr.length}` })
    }

    for (const e of arr) {
      L.total++
      grandTotal++

      // --- ID ---
      if (!e || typeof e.id !== 'string' || !e.id) {
        cnt.idMissing++
        issues.push({ severity: 'Critical', language: lang, type: 'id_missing', detail: JSON.stringify(e).slice(0, 120) })
        continue
      }
      if (ids.has(e.id)) { cnt.idDup++; issues.push({ severity: 'Critical', language: lang, type: 'id_duplicate', id: e.id }) }
      ids.add(e.id)
      if (globalIds.has(e.id)) issues.push({ severity: 'Major', language: lang, type: 'id_duplicate_across_language', id: e.id, detail: `既出: ${globalIds.get(e.id)}` })
      globalIds.set(e.id, lang)

      // --- 必須フィールドの型 ---
      if (typeof e.prompt !== 'string' || !e.prompt.trim()) {
        cnt.emptyPrompt++; issues.push({ severity: 'Critical', language: lang, type: 'prompt_empty', id: e.id })
      }
      if (typeof e.answer !== 'string' || !e.answer.trim()) {
        cnt.emptyAnswer++; issues.push({ severity: 'Critical', language: lang, type: 'answer_empty', id: e.id })
      }
      if (typeof e.category !== 'string' || !e.category) { cnt.typeError++; issues.push({ severity: 'Major', language: lang, type: 'category_invalid', id: e.id }) }
      if (typeof e.difficulty !== 'number' || !Number.isFinite(e.difficulty)) { cnt.typeError++; issues.push({ severity: 'Major', language: lang, type: 'difficulty_invalid', id: e.id }) }
      if (!Array.isArray(e.tags)) { cnt.typeError++; issues.push({ severity: 'Minor', language: lang, type: 'tags_invalid', id: e.id }) }

      // --- 選択肢 ---
      if (!Array.isArray(e.choices)) {
        cnt.choicesNot4++; issues.push({ severity: 'Critical', language: lang, type: 'choices_not_array', id: e.id })
      } else {
        if (e.choices.length !== 4) { cnt.choicesNot4++; issues.push({ severity: 'Critical', language: lang, type: 'choices_length', id: e.id, detail: `${e.choices.length}件` }) }
        if (new Set(e.choices).size !== e.choices.length) { cnt.dupChoices++; issues.push({ severity: 'Critical', language: lang, type: 'choices_duplicate', id: e.id }) }
        if (typeof e.answer === 'string' && !e.choices.includes(e.answer)) {
          cnt.answerNotInChoices++
          issues.push({ severity: 'Critical', language: lang, type: 'answer_not_in_choices', id: e.id })
        }
        for (const c of e.choices) if (c == null || typeof c !== 'string' || !c.trim()) {
          cnt.nullish++; issues.push({ severity: 'Critical', language: lang, type: 'choice_nullish', id: e.id })
        }
      }

      // --- 画面が壊れうる null/undefined ---
      for (const k of ['example', 'exampleForm', 'pronunciation']) {
        if (k in e && (e[k] === null || e[k] === undefined)) {
          cnt.nullish++; issues.push({ severity: 'Major', language: lang, type: 'field_nullish', id: e.id, detail: k })
        }
      }
      if (e.glosses != null && typeof e.glosses !== 'object') {
        cnt.typeError++; issues.push({ severity: 'Major', language: lang, type: 'glosses_invalid', id: e.id })
      }
    }
    L.levels.push({ level: lv.level, file: lv.file, count: arr.length })
  }

  L.checks = cnt
  L.pass = Object.values(cnt).every((v) => v === 0)
  perLang.push(L)
}

const critical = issues.filter((i) => i.severity === 'Critical').length
const major = issues.filter((i) => i.severity === 'Major').length
const minor = issues.filter((i) => i.severity === 'Minor').length

const result = {
  stage: 1,
  title: '元データの最終構造検証',
  expectedTotal: 29417,
  actualTotal: grandTotal,
  totalMatches: grandTotal === 29417,
  languages: perLang,
  summary: { critical, major, minor, totalIssues: issues.length },
  verdict: critical === 0 ? 'PASS' : 'FAIL',
  issues: issues.slice(0, 200),
}
fs.writeFileSync(path.join(outDir, 'data-integrity.json'), JSON.stringify(result, null, 1))

let md = `# 第1段階: 元データの最終構造検証\n\n`
md += `判定: **${result.verdict}**\n\n`
md += `- 期待件数: 29,417 / 実件数: **${grandTotal.toLocaleString()}** (${result.totalMatches ? '一致' : '不一致'})\n`
md += `- Critical: ${critical} / Major: ${major} / Minor: ${minor}\n\n`
md += `## 言語別\n\n| 言語 | 件数 | ID重複 | prompt空 | answer空 | 4択でない | 正解欠落 | 選択肢重複 | 型不正 | null | manifest不一致 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`
for (const L of perLang) {
  const c = L.checks
  md += `| ${L.language} | ${L.total} | ${c.idDup ?? '-'} | ${c.emptyPrompt ?? '-'} | ${c.emptyAnswer ?? '-'} | ${c.choicesNot4 ?? '-'} | ${c.answerNotInChoices ?? '-'} | ${c.dupChoices ?? '-'} | ${c.typeError ?? '-'} | ${c.nullish ?? '-'} | ${c.manifestMismatch ?? '-'} |\n`
}
if (issues.length) {
  md += `\n## 検出された問題 (先頭50件)\n\n`
  for (const i of issues.slice(0, 50)) md += `- [${i.severity}] ${i.language} ${i.type} ${i.id ?? ''} ${i.detail ?? ''}\n`
} else {
  md += `\n## 検出された問題\n\nなし。全項目 PASS。\n`
}
fs.writeFileSync(path.join(outDir, 'data-integrity.md'), md)

console.log(JSON.stringify({ total: grandTotal, expected: 29417, match: result.totalMatches, critical, major, minor, verdict: result.verdict }))
