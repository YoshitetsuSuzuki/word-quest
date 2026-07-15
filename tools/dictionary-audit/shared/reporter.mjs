// ============================================================================
// reporter.mjs  言語別レポート(json/md)と summary(json/md) を生成
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const reportsDir = path.join(here, '..', 'reports')
fs.mkdirSync(reportsDir, { recursive: true })

// 1語の結果から総合判定
export function verdictOf(r) {
  const c = r.checks
  if (c.example && typeof c.example === 'object' && c.example.safety === 'unsafe') return 'critical'
  if (c.headword === 'not_found') return 'critical'
  if (c.pos === 'different') return 'critical'
  if (c.glossEn === 'different') return 'critical'
  const reviewSignals = [c.headword === 'multiple_entries', c.pos === 'compatible' || c.pos === 'missing' || c.pos === 'not_checked',
    c.glossEn === 'partial' || c.glossEn === 'not_checked', c.glossJa === 'not_checked' || c.glossJa === 'different',
    c.pronunciation === 'different' || c.pronunciation === 'missing' || c.pronunciation === 'not_checked',
    c.example && typeof c.example === 'object' && (c.example.overall === 'review' || c.example.overall === 'missing')]
  if (reviewSignals.some(Boolean)) return 'review'
  return 'ok'
}

function rate(results, pred) { const n = results.length; if (!n) return 0; return +(100 * results.filter(pred).length / n).toFixed(1) }

export function writeLanguageReport(langKey, meta, results) {
  const summary = {
    language: langKey,
    generatedAt: meta.generatedAt,
    dictionaries: meta.sources,
    licenses: meta.licenses,
    totalInWordbank: meta.totalInWordbank,
    checkedCount: results.length,
    sampled: meta.sampled,
    matchRate: rate(results, (r) => r.checks.headword === 'matched' || r.checks.headword === 'multiple_entries'),
    posMatchRate: rate(results, (r) => r.checks.pos === 'exact' || r.checks.pos === 'compatible'),
    glossMatchRate: rate(results, (r) => r.checks.glossEn === 'exact' || r.checks.glossEn === 'partial'),
    pronunciationMatchRate: rate(results, (r) => r.checks.pronunciation === 'matched'),
    exampleOkRate: rate(results, (r) => r.checks.example && typeof r.checks.example === 'object' && r.checks.example.overall === 'ok'),
    unsafeExamples: results.filter((r) => r.checks.example && typeof r.checks.example === 'object' && r.checks.example.safety === 'unsafe').length,
    needsHumanReview: results.filter((r) => r.verdict === 'review').length,
    criticalErrors: results.filter((r) => r.verdict === 'critical').length,
    ok: results.filter((r) => r.verdict === 'ok').length,
    dataMutated: false,
  }
  fs.writeFileSync(path.join(reportsDir, langKey + '.json'), JSON.stringify({ summary, results }, null, 2))

  const esc = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ')
  let md = `# 辞書照合レポート: ${langKey}\n\n生成: ${meta.generatedAt} / 辞書: ${meta.sources.join(', ')} / **元データ変更: なし**\n\n`
  md += `- 総件数(wordbank): ${meta.totalInWordbank}　照合件数: ${results.length}${meta.sampled ? '（サンプル）' : '（全件）'}\n`
  md += `- 見出し一致率: ${summary.matchRate}%　品詞一致率: ${summary.posMatchRate}%　英語義一致率: ${summary.glossMatchRate}%　発音一致率: ${summary.pronunciationMatchRate}%　例文OK率: ${summary.exampleOkRate}%\n`
  md += `- 危険例文: ${summary.unsafeExamples}　要人間確認: ${summary.needsHumanReview}　重大エラー: ${summary.criticalErrors}　OK: ${summary.ok}\n\n`
  md += `| id | 見出し | 見出し | 品詞 | 英語義 | 和訳 | 発音 | 例文 | 判定 |\n|---|---|---|---|---|---|---|---|---|\n`
  for (const r of results.slice(0, 60)) {
    const ex = r.checks.example && typeof r.checks.example === 'object' ? r.checks.example.overall : r.checks.example
    md += `| ${r.id} | ${esc(r.headword)} | ${r.checks.headword} | ${r.checks.pos} | ${r.checks.glossEn} | ${r.checks.glossJa} | ${r.checks.pronunciation} | ${esc(ex)} | ${r.verdict} |\n`
  }
  if (results.length > 60) md += `\n_...他 ${results.length - 60} 件は json 参照_\n`
  md += `\n> 注: 発音・和訳が not_checked なのは対応辞書(IPA/JA)未配置のため。未確認を確認済みとして扱わない。例文の文法/語義はヒューリスティック判定。\n`
  fs.writeFileSync(path.join(reportsDir, langKey + '.md'), md)
  return summary
}

export function writeSummary(langSummaries, licenses) {
  const generatedAt = langSummaries[0]?.generatedAt || '(n/a)'
  const summary = { generatedAt, dataMutated: false, languages: {}, licenses }
  for (const s of langSummaries) summary.languages[s.language] = {
    total: s.totalInWordbank, checked: s.checkedCount, sampled: s.sampled,
    matchRate: s.matchRate, posMatchRate: s.posMatchRate, glossMatchRate: s.glossMatchRate,
    pronunciationMatchRate: s.pronunciationMatchRate, exampleOkRate: s.exampleOkRate,
    unsafeExamples: s.unsafeExamples, needsHumanReview: s.needsHumanReview, criticalErrors: s.criticalErrors,
  }
  fs.writeFileSync(path.join(reportsDir, 'summary.json'), JSON.stringify(summary, null, 2))

  let md = `# 辞書照合 サマリー\n\n生成: ${generatedAt} / **元データ変更: なし(0件)**\n\n`
  md += `| 言語 | 総件数 | 照合 | 見出し一致 | 品詞一致 | 訳(英)一致 | 発音一致 | 例文OK | 危険例文 | 要確認 | 重大 |\n|---|---|---|---|---|---|---|---|---|---|---|\n`
  for (const s of langSummaries) md += `| ${s.language} | ${s.totalInWordbank} | ${s.checkedCount} | ${s.matchRate}% | ${s.posMatchRate}% | ${s.glossMatchRate}% | ${s.pronunciationMatchRate}% | ${s.exampleOkRate}% | ${s.unsafeExamples} | ${s.needsHumanReview} | ${s.criticalErrors} |\n`
  md += `\n## 辞書ライセンス\n\n`
  for (const [k, d] of Object.entries(licenses.dictionaries)) md += `- **${d.name}** — ${d.license}（商用:${d.commercialUse} / 帰属:${d.attribution} / 継承:${d.shareAlike} / 本run使用:${d.accessedInThisRun ? 'はい' : 'いいえ'}）\n`
  fs.writeFileSync(path.join(reportsDir, 'summary.md'), md)
  return summary
}
