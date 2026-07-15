// ============================================================================
// pilot-local.mjs  全件前の小規模試験(試験A英語50/試験B中国語50/試験C各20)＋既知問題語
//   出力: reports/pilot-local-dictionary.json / .md
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runLocal } from './shared/local-engine.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const fullDir = path.join(here, 'reports', 'full')
const readJsonl = (f) => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []

// 既知の過去問題語(対象言語のみ。IDで指定)
const KNOWN = {
  english: ['en-21406', 'en-03104', 'en-06181'], // bouncing, japan, latex
  chinese: ['zh-02747', 'zh-00426'],             // 圈, 一边
  spanish: ['es-00432', 'es-01405'],             // dulce, Cristo(→ローカル辞書なし=not_checked)
  french: ['fr-00645', 'fr-01022', 'fr-00092'],  // expérience, émission, ensemble(→not_checked)
  german: ['de-00539', 'de-00648', 'de-00743'],  // Raum, Weihnachten, Abendessen(→not_checked)
}
const SAMPLE = { english: 50, chinese: 50, korean: 20, spanish: 20, german: 20, french: 20, portuguese: 20, polish: 20, russian: 20 }

const report = { generatedAt: new Date().toISOString().slice(0, 10), tests: {}, knownWords: [], misjudgmentPatterns: [] }

for (const [lang, n] of Object.entries(SAMPLE)) {
  const s = await runLocal(lang, { limit: n, batchSize: 1000 })
  report.tests[lang] = { sampled: s.checked, verdicts: s.verdicts, sources: s.sources, dimChecked: s.dimChecked }
}
// 既知語(範囲外はids指定で個別実行)
for (const [lang, ids] of Object.entries(KNOWN)) {
  const recsAll = readJsonl(path.join(fullDir, lang + '.jsonl'))
  const have = new Set(recsAll.map((r) => r.id))
  const missing = ids.filter((id) => !have.has(id))
  let recs = recsAll.filter((r) => ids.includes(r.id))
  if (missing.length) { await runLocal(lang, { ids: missing, batchSize: 1000 }); recs = recs.concat(readJsonl(path.join(fullDir, lang + '.jsonl')).filter((r) => missing.includes(r.id))) }
  for (const r of recs) report.knownWords.push({ id: r.id, headword: r.headword, language: lang, verdict: r.verdict, headwordStatus: r.consensus.headword, pos: r.consensus.pos, glossEn: r.consensus.glossEn, pron: r.consensus.pron, sources: r.sources })
}

// 誤判定パターン分析
const enRecs = readJsonl(path.join(fullDir, 'english.jsonl'))
const enNotFound = enRecs.filter((r) => r.consensus.headword === 'not_found')
if (enNotFound.length) report.misjudgmentPatterns.push({ pattern: 'WordNet未収録の機能語(代名詞/前置詞/限定詞等)がnot_found', example: enNotFound.slice(0, 8).map((r) => r.headword), handling: 'not_found→review(criticalにしない)。規則12遵守。別辞書(Kaikki)で補完可' })
report.misjudgmentPatterns.push({ pattern: '英語はアプリに英語グロスが無く語義照合不可', handling: 'glossEn=missing。見出し・品詞のみOEWN照合、語義はnot確認。verifiedにしない' })
report.misjudgmentPatterns.push({ pattern: '中国語はCC-CEDICTに品詞が無い', handling: 'pos=missing_in_dictionary。見出し・語義・拼音で照合。品詞は別途' })
report.misjudgmentPatterns.push({ pattern: 'ローカル辞書の無い言語(韓/西/独/仏/葡/波/露)は全件not_checked', handling: '未確認を一致扱いしない。Kaikki言語別ダンプ配置で対応可' })

fs.writeFileSync(path.join(here, 'reports', 'pilot-local-dictionary.json'), JSON.stringify(report, null, 2))

let md = `# ローカル辞書 パイロット試験\n\n生成: ${report.generatedAt} / **元データ変更なし**\n\n## 試験結果(サンプル)\n\n| 言語 | 照合 | verified | likely | review | conflicting | critical | not_checked | 辞書 |\n|---|---|---|---|---|---|---|---|---|\n`
for (const [l, t] of Object.entries(report.tests)) { const v = t.verdicts; md += `| ${l} | ${t.sampled} | ${v.verified || 0} | ${v.likely_correct || 0} | ${v.review || 0} | ${v.conflicting || 0} | ${v.critical || 0} | ${v.not_checked || 0} | ${t.sources.join(',') || '-'} |\n` }
md += `\n## 既知の過去問題語\n\n| id | 語 | 言語 | 見出し | 品詞 | 英語義 | 発音 | 判定 |\n|---|---|---|---|---|---|---|---|\n`
for (const k of report.knownWords) md += `| ${k.id} | ${k.headword} | ${k.language} | ${k.headwordStatus} | ${k.pos} | ${k.glossEn} | ${k.pron} | ${k.verdict} |\n`
md += `\n## 誤判定パターンと対処\n\n`
for (const p of report.misjudgmentPatterns) md += `- **${p.pattern}**${p.example ? `（例: ${p.example.join(', ')}）` : ''} → ${p.handling}\n`
fs.writeFileSync(path.join(here, 'reports', 'pilot-local-dictionary.md'), md)
console.log('\nパイロット試験完了 → reports/pilot-local-dictionary.md')
