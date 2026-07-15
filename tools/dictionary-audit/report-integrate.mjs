// ============================================================================
// report-integrate.mjs  reports/full/<lang>.jsonl(全9言語) から
//   (1) reports/seven-language-full/  … 7言語の言語別md＋summary＋問題別
//   (2) reports/all-nine-v3/          … 全9言語統合summary＋問題別(合計=20131検証)
//   を生成。元データは読まない。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const fullDir = path.join(here, 'reports', 'full')
const sevenDir = path.join(here, 'reports', 'seven-language-full')
const nineDir = path.join(here, 'reports', 'all-nine-v3')
const SEVEN = ['korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const NINE = ['english', 'chinese', ...SEVEN]
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []
const slim = (r) => ({ id: r.id, headword: r.headword, language: r.language, verdict: r.verdict, headword_status: r.consensus.headword, pos: r.consensus.pos, glossEn: r.consensus.glossEn, pron: r.consensus.pron })

function aggregate(langs, outDir, title) {
  fs.mkdirSync(outDir, { recursive: true })
  const problems = { critical: [], conflicting: [], review: [], notFound: [], notChecked: [], caseMismatch: [], diacriticMismatch: [], formMatch: [] }
  const perLang = {}
  let total = 0
  for (const lang of langs) {
    const recs = readJsonl(path.join(fullDir, lang + '.jsonl'))
    total += recs.length
    const v = {}
    for (const r of recs) {
      v[r.verdict] = (v[r.verdict] || 0) + 1
      if (r.verdict === 'critical') problems.critical.push(slim(r))
      else if (r.verdict === 'conflicting') problems.conflicting.push(slim(r))
      else if (r.verdict === 'review') problems.review.push(slim(r))
      if (r.consensus.headword === 'not_found') problems.notFound.push(slim(r))
      if (r.verdict === 'not_checked') problems.notChecked.push({ id: r.id, headword: r.headword, language: r.language })
      if (r.consensus.headword === 'case_mismatch') problems.caseMismatch.push(slim(r))
      if (r.consensus.headword === 'diacritic_mismatch') problems.diacriticMismatch.push(slim(r))
      if (r.consensus.headword === 'variant_match') problems.formMatch.push(slim(r))
    }
    perLang[lang] = { total: recs.length, verdicts: v, sources: recs[0]?.dictionaryVersions ? Object.keys(recs[0].dictionaryVersions) : [] }
  }
  const agg = { verified: 0, likely_correct: 0, review: 0, conflicting: 0, critical: 0, not_checked: 0 }
  for (const l of langs) for (const k of Object.keys(agg)) agg[k] += (perLang[l].verdicts[k] || 0)
  const sum = { generatedAt: new Date().toISOString().slice(0, 10), title, dataMutated: false, total, aggregateVerdicts: agg, verdictSum: Object.values(agg).reduce((a, b) => a + b, 0), languages: perLang, problemCounts: Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, v.length])) }
  fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(sum, null, 2))
  fs.writeFileSync(path.join(outDir, 'critical.json'), JSON.stringify(problems.critical, null, 2))
  fs.writeFileSync(path.join(outDir, 'conflicting.json'), JSON.stringify(problems.conflicting, null, 2))
  fs.writeFileSync(path.join(outDir, 'review.json'), JSON.stringify(problems.review, null, 2))
  fs.writeFileSync(path.join(outDir, 'not-checked.json'), JSON.stringify(problems.notChecked, null, 2))
  fs.writeFileSync(path.join(outDir, 'not-found.json'), JSON.stringify(problems.notFound, null, 2))
  fs.writeFileSync(path.join(outDir, 'case-mismatch.json'), JSON.stringify(problems.caseMismatch, null, 2))
  fs.writeFileSync(path.join(outDir, 'diacritic-mismatch.json'), JSON.stringify(problems.diacriticMismatch, null, 2))
  fs.writeFileSync(path.join(outDir, 'form-match.json'), JSON.stringify(problems.formMatch, null, 2))

  let md = `# ${title}\n\n生成: ${sum.generatedAt} / **元データ変更: 0件**\n\n合計 ${total} / 総合判定合計 ${sum.verdictSum}${sum.verdictSum === total ? ' ✓(一致)' : ' ⚠'}\n\n`
  md += `| 言語 | 総件数 | verified | likely | review | conflicting | critical | not_checked | 辞書 |\n|---|---|---|---|---|---|---|---|---|\n`
  for (const l of langs) { const v = perLang[l].verdicts; md += `| ${l} | ${perLang[l].total} | ${v.verified || 0} | ${v.likely_correct || 0} | ${v.review || 0} | ${v.conflicting || 0} | ${v.critical || 0} | ${v.not_checked || 0} | ${perLang[l].sources.join(',') || '-'} |\n` }
  md += `\n**合計**: verified ${agg.verified} / likely_correct ${agg.likely_correct} / review ${agg.review} / conflicting ${agg.conflicting} / critical ${agg.critical} / not_checked ${agg.not_checked} = **${sum.verdictSum}**\n\n`
  md += `問題別: critical ${problems.critical.length} / conflicting ${problems.conflicting.length} / review ${problems.review.length} / not-found ${problems.notFound.length} / not-checked ${problems.notChecked.length} / case-mismatch ${problems.caseMismatch.length} / diacritic-mismatch ${problems.diacriticMismatch.length} / form-match ${problems.formMatch.length}\n\n> not_checked は一致ではない。not_found は誤りの証拠ではない(review)。日本語訳・発音(一部)は辞書都合で not_checked を維持。\n`
  fs.writeFileSync(path.join(outDir, 'summary.md'), md)

  // 7言語は言語別mdも
  if (langs === SEVEN) for (const l of langs) {
    const v = perLang[l].verdicts
    fs.writeFileSync(path.join(sevenDir, l + '.md'), `# ${l} ローカル辞書照合(全件)\n\n生成 ${sum.generatedAt} / 辞書 ${perLang[l].sources.join(',')} / 元データ変更なし\n\n総件数 ${perLang[l].total} / verified ${v.verified || 0} / likely_correct ${v.likely_correct || 0} / review ${v.review || 0} / conflicting ${v.conflicting || 0} / critical ${v.critical || 0} / not_checked ${v.not_checked || 0}\n\n> 詳細レコードは reports/full/${l}.jsonl（Git管理外）。\n`)
    // 言語別jsonlをseven配下へもコピー(参照用・Git管理外)
    const src = path.join(fullDir, l + '.jsonl'); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(sevenDir, l + '.jsonl'))
  }
  return sum
}

const seven = aggregate(SEVEN, sevenDir, '7言語 ローカル辞書照合(全件) サマリー')
const nine = aggregate(NINE, nineDir, '全9言語 統合(v3) サマリー')
console.log('7言語合計:', seven.total, JSON.stringify(seven.aggregateVerdicts))
console.log('9言語合計:', nine.total, '(=20131?', nine.total === 20131, ')', JSON.stringify(nine.aggregateVerdicts))
console.log('判定合計=件数:', nine.verdictSum === nine.total ? 'OK' : 'NG')
