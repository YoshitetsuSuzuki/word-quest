// ============================================================================
// full-reporter.mjs  ローカル全件照合の結果(reports/full/<lang>.jsonl)を集計し、
//   言語別md・summary(json/md)・問題別ファイル(critical/conflicting/review/not-found/not-checked)を生成
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const auditRoot = path.resolve(here, '..')
const fullDir = path.join(auditRoot, 'reports', 'full')

function readJsonl(f) { const out = []; if (!fs.existsSync(f)) return out; for (const l of fs.readFileSync(f, 'utf8').split('\n')) { if (l.trim()) out.push(JSON.parse(l)) } return out }

export function generateFullReports(langSummaries) {
  fs.mkdirSync(fullDir, { recursive: true })
  const problem = { critical: [], conflicting: [], review: [], notFound: [], notChecked: [] }
  const langMeta = []

  for (const s of langSummaries) {
    const recs = readJsonl(path.join(fullDir, s.language + '.jsonl'))
    // 言語別md
    const v = s.verdicts
    let md = `# ローカル辞書照合(全件): ${s.language}\n\n生成: ${s.generatedAt} / 辞書: ${s.sources.join(', ') || '(なし)'} / 版: ${JSON.stringify(s.dictionaryVersions)} / **元データ変更なし**\n\n`
    md += `- 総件数: ${s.total}　照合: ${s.checked}\n`
    md += `- verified:${v.verified || 0} likely_correct:${v.likely_correct || 0} review:${v.review || 0} conflicting:${v.conflicting || 0} critical:${v.critical || 0} not_checked:${v.not_checked || 0}\n`
    md += `- 次元別照合済み: 見出し${s.dimChecked.headword} 品詞${s.dimChecked.partOfSpeech} 語義${s.dimChecked.sense} 発音${s.dimChecked.pronunciation} 和訳${s.dimChecked.japaneseGloss}\n`
    md += `- 危険例文: ${s.unsafeExamples}\n\n> not_checked は一致ではない。辞書に無い=誤りではない。\n`
    fs.writeFileSync(path.join(fullDir, s.language + '.md'), md)

    for (const r of recs) {
      if (r.verdict === 'critical') problem.critical.push(slim(r))
      else if (r.verdict === 'conflicting') problem.conflicting.push(slim(r))
      else if (r.verdict === 'review') problem.review.push(slim(r))
      if (r.consensus.headword === 'not_found') problem.notFound.push(slim(r))
      if (r.verdict === 'not_checked') problem.notChecked.push({ id: r.id, headword: r.headword, language: r.language })
    }
    langMeta.push(s)
  }

  fs.writeFileSync(path.join(fullDir, 'critical.json'), JSON.stringify(problem.critical, null, 2))
  fs.writeFileSync(path.join(fullDir, 'conflicting.json'), JSON.stringify(problem.conflicting, null, 2))
  fs.writeFileSync(path.join(fullDir, 'review.json'), JSON.stringify(problem.review, null, 2))
  fs.writeFileSync(path.join(fullDir, 'not-found.json'), JSON.stringify(problem.notFound, null, 2))
  fs.writeFileSync(path.join(fullDir, 'not-checked.json'), JSON.stringify(problem.notChecked.slice(0, 100000), null, 2))

  // summary
  const totalWords = langMeta.reduce((a, s) => a + s.total, 0)
  const totalChecked = langMeta.reduce((a, s) => a + s.checked, 0)
  const agg = { verified: 0, likely_correct: 0, review: 0, conflicting: 0, critical: 0, not_checked: 0 }
  for (const s of langMeta) for (const k of Object.keys(agg)) agg[k] += (s.verdicts[k] || 0)
  const summary = { generatedAt: langMeta[0]?.generatedAt, dataMutated: false, totalWords, totalChecked, aggregateVerdicts: agg, problems: { critical: problem.critical.length, conflicting: problem.conflicting.length, review: problem.review.length, notFound: problem.notFound.length, notChecked: problem.notChecked.length }, languages: {} }
  for (const s of langMeta) summary.languages[s.language] = { total: s.total, checked: s.checked, verdicts: s.verdicts, sources: s.sources, dictionaryVersions: s.dictionaryVersions, dimChecked: s.dimChecked, unsafeExamples: s.unsafeExamples, ms: s.ms }
  fs.writeFileSync(path.join(fullDir, 'summary.json'), JSON.stringify(summary, null, 2))

  let md = `# ローカル辞書照合(全件) サマリー\n\n生成: ${summary.generatedAt} / **元データ変更: 0件**\n\n監査対象 ${totalWords} / 照合 ${totalChecked}\n\n`
  md += `| 言語 | 総件数 | 照合 | verified | likely | review | conflicting | critical | not_checked | 辞書 |\n|---|---|---|---|---|---|---|---|---|---|\n`
  for (const s of langMeta) { const v = s.verdicts; md += `| ${s.language} | ${s.total} | ${s.checked} | ${v.verified || 0} | ${v.likely_correct || 0} | ${v.review || 0} | ${v.conflicting || 0} | ${v.critical || 0} | ${v.not_checked || 0} | ${s.sources.join(',') || '-'} |\n` }
  md += `\n## 次元別「照合済み」件数（何を確認できたか）\n\n| 言語 | 見出し | 品詞 | 語義 | 発音 | 和訳 |\n|---|---|---|---|---|---|\n`
  for (const s of langMeta) md += `| ${s.language} | ${s.dimChecked.headword} | ${s.dimChecked.partOfSpeech} | ${s.dimChecked.sense} | ${s.dimChecked.pronunciation} | ${s.dimChecked.japaneseGloss} |\n`
  md += `\n問題別: critical ${problem.critical.length} / conflicting ${problem.conflicting.length} / review ${problem.review.length} / not-found ${problem.notFound.length} / not-checked ${problem.notChecked.length}\n\n> 和訳照合は0(JA辞書未配置)。発音照合は中国語(CC-CEDICT拼音)のみ。英語は見出し・品詞をOEWNで照合、語義は和訳構造のため直接照合不可。**未確認を一致として扱わない。**\n`
  fs.writeFileSync(path.join(fullDir, 'summary.md'), md)
  return summary
}

function slim(r) { return { id: r.id, headword: r.headword, language: r.language, verdict: r.verdict, consensus: r.consensus, sources: r.sources, example: r.example, exampleSafety: r.exampleSafety } }
