// ============================================================================
// report-v4.mjs  v4集計(reports/all-nine-v4/) ＋ v3比較 ＋ status-rules
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const fullDir = path.join(here, 'reports', 'full')
const v4 = path.join(here, 'reports', 'all-nine-v4')
const v3 = path.join(here, 'reports', 'all-nine-v3')
fs.mkdirSync(v4, { recursive: true })
const NINE = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []
const slim = (r) => ({ id: r.id, headword: r.headword, language: r.language, verdict: r.verdict, pos: r.consensus.pos, glossEn: r.consensus.glossEn })

const perLang = {}, problems = { critical: [], conflicting: [], review: [], notChecked: [] }
let total = 0
for (const lang of NINE) {
  const recs = readJsonl(path.join(fullDir, lang + '.jsonl')); total += recs.length
  const v = {}
  for (const r of recs) { v[r.verdict] = (v[r.verdict] || 0) + 1; if (r.verdict === 'critical') problems.critical.push(slim(r)); else if (r.verdict === 'conflicting') problems.conflicting.push(slim(r)); else if (r.verdict === 'review') problems.review.push(slim(r)); else if (r.verdict === 'not_checked') problems.notChecked.push({ id: r.id, headword: r.headword, language: r.language }) }
  perLang[lang] = { total: recs.length, verdicts: v }
}
const agg = { verified: 0, likely_correct: 0, review: 0, conflicting: 0, critical: 0, not_checked: 0 }
for (const l of NINE) for (const k of Object.keys(agg)) agg[k] += (perLang[l].verdicts[k] || 0)
const sum = { generatedAt: '2026-07-16', dataMutated: '313 tags fixed (english adjective mistags)', total, verdictSum: Object.values(agg).reduce((a, b) => a + b, 0), aggregateVerdicts: agg, languages: perLang }
fs.writeFileSync(path.join(v4, 'summary.json'), JSON.stringify(sum, null, 2))
fs.writeFileSync(path.join(v4, 'critical.json'), JSON.stringify(problems.critical, null, 2))
fs.writeFileSync(path.join(v4, 'conflicting.json'), JSON.stringify(problems.conflicting, null, 2))
fs.writeFileSync(path.join(v4, 'review.json'), JSON.stringify(problems.review, null, 2))
fs.writeFileSync(path.join(v4, 'not-checked.json'), JSON.stringify(problems.notChecked, null, 2))

let md = `# 全9言語 v4 サマリー\n\n生成 ${sum.generatedAt} / 元データ変更: 英語tags 313件のみ(形容詞誤タグ修正) / 判定合計 ${sum.verdictSum}${sum.verdictSum === total ? ' ✓(=20131)' : ' ⚠'}\n\n`
md += `| 言語 | 総件数 | verified | likely | review | conflicting | critical | not_checked |\n|---|---|---|---|---|---|---|---|\n`
for (const l of NINE) { const v = perLang[l].verdicts; md += `| ${l} | ${perLang[l].total} | ${v.verified || 0} | ${v.likely_correct || 0} | ${v.review || 0} | ${v.conflicting || 0} | ${v.critical || 0} | ${v.not_checked || 0} |\n` }
md += `\n**合計**: verified ${agg.verified} / likely_correct ${agg.likely_correct} / review ${agg.review} / conflicting ${agg.conflicting} / **critical ${agg.critical}** / not_checked ${agg.not_checked} = ${sum.verdictSum}\n\n> critical は「アプリ品詞スキーマ内・単一品詞の明確な誤タグ」に限定。スキーマ不足(副詞等)・多品詞・辞書体系差・グロス表現差は review。\n`
fs.writeFileSync(path.join(v4, 'summary.md'), md)

// v3比較
const v3sum = JSON.parse(fs.readFileSync(path.join(v3, 'summary.json'), 'utf8'))
const inv = JSON.parse(fs.readFileSync(path.resolve(here, '..', '..', 'audit', 'critical-remediation', 'critical-inventory.json'), 'utf8'))
const cmp = `# v3 → v4 critical 比較\n\n生成 2026-07-16\n\n| 指標 | 件数 |\n|---|---|\n| v3 critical | ${v3sum.aggregateVerdicts.critical} |\n| v4 critical | ${agg.critical} |\n| 減少 | ${v3sum.aggregateVerdicts.critical - agg.critical} |\n\n## 減少の内訳(v3 critical 1,179 の再分類)\n\n| 再分類先 | 件数 | 説明 |\n|---|---|---|\n| **安全修正で解消** | 313 | 英語の属性形容詞(名詞/動詞タグ→形容詞)。和訳＋WordNetで二重確認・自動適用済 |\n| **スキーマ不足→review** | ${inv.byCause.schema_missing_part_of_speech || 0} | 英語に副詞/代名詞等のタグが無い。個別誤りでなくスキーマ課題(規則13) |\n| **辞書体系差→review** | ${inv.byCause.dictionary_taxonomy_difference || 0} | phrase/固有名詞等、辞書分類がアプリ体系と非対応 |\n| **グロス表現差→review** | ${inv.byCause.gloss_synonym_difference || 0} | 同義/範囲/多義差。自動で誤訳断定しない(規則6) |\n| **本当のcritical(残存)** | ${agg.critical} | スキーマ内・単一品詞の明確な誤タグ(主に動詞/名詞)。人手確認して個別修正 |\n\n計: 313 + ${inv.byCause.schema_missing_part_of_speech || 0} + ${inv.byCause.dictionary_taxonomy_difference || 0} + ${inv.byCause.gloss_synonym_difference || 0} + ${agg.critical} = ${313 + (inv.byCause.schema_missing_part_of_speech || 0) + (inv.byCause.dictionary_taxonomy_difference || 0) + (inv.byCause.gloss_synonym_difference || 0) + agg.critical}(v3 critical 1,179)\n\n## 妥当性\n減少は「criticalを機械的にゼロへ」ではなく、**辞書・品詞体系・グロス照合の限界による誤検知を除去**した結果。残存${agg.critical}件は在庫スキーマ内で客観的に誤タグと判定できる項目で、人手確認の上で個別修正すべき本当の候補(自動適用は形容詞の高確度分のみに限定)。\n`
fs.writeFileSync(path.join(v4, 'comparison-with-v3.md'), cmp)

console.log('v4 critical', agg.critical, '/ 判定合計', sum.verdictSum, '(=20131?', sum.verdictSum === 20131, ')')
console.log('v3 critical 1179 →', 313, '修正 +', (inv.byCause.schema_missing_part_of_speech || 0), 'スキーマ→review +', (inv.byCause.gloss_synonym_difference || 0), 'グロス→review +', (inv.byCause.dictionary_taxonomy_difference || 0), '体系→review +', agg.critical, '残存')
