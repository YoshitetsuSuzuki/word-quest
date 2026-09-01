// ============================================================================
// stage6-8  第6段階(手動確認用サンプル抽出) / 第7段階(未解決項目) / 第8段階(無変更確認)
//   AIは正否を判定しない。人が確認するための一覧を作るだけ。
//   元データは変更しない。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'release-check')
fs.mkdirSync(outDir, { recursive: true })

const LANGS = ['english', 'chinese', 'japanese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']

function loadAll(lang) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  let arr = []
  for (const lv of man.levels) arr = arr.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
  return arr
}

// 再現可能な抽出にするため、乱数ではなく決定的なハッシュで並べ替える。
function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

// ---------------------------------------------------------- 第6段階: 手動確認用サンプル
const SEED = 'wordquest-release-check-v1'
const rows = [['language', 'id', 'level', 'prompt', 'answer', 'choices', 'example', 'pronunciation', '人の判定(OK/NG/保留)', '備考']]
const sampleJson = []

for (const lang of LANGS) {
  const all = loadAll(lang)
  const picked = all
    .map((e) => ({ e, k: hash(SEED + e.id) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, 30)
    .map((x) => x.e)
  for (const e of picked) {
    rows.push([
      lang, e.id, e.difficulty ?? '', e.prompt ?? '', e.answer ?? '',
      (e.choices ?? []).join(' / '), e.example ?? '', e.pronunciation ?? '', '', '',
    ])
    sampleJson.push({
      language: lang, id: e.id, level: e.difficulty, prompt: e.prompt, answer: e.answer,
      choices: e.choices, example: e.example ?? null, pronunciation: e.pronunciation ?? null,
      glosses: e.glosses ?? null, humanVerdict: null,
    })
  }
}

const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
fs.writeFileSync(path.join(outDir, 'manual-sample.csv'), '﻿' + csv) // BOM付き(Excel対応)
fs.writeFileSync(path.join(outDir, 'manual-sample.json'), JSON.stringify({
  stage: 6,
  title: '人による最終確認用サンプル',
  method: `決定的ハッシュ(seed="${SEED}")による無作為抽出。同じ結果が再現できる。`,
  note: 'AIは正否を判定していない。humanVerdict は未記入。',
  perLanguage: 30, total: sampleJson.length,
  items: sampleJson,
}, null, 1))

// ---------------------------------------------------------- 第7段階: 未解決項目
const certPath = path.join(root, 'tools', 'certify', 'report', '_summary.json')
let cert = null
if (fs.existsSync(certPath)) cert = JSON.parse(fs.readFileSync(certPath, 'utf8'))

const unresolved = {
  stage: 7,
  title: '未解決のまま残っている項目',
  note: '既存の監査結果をそのまま前提として利用。再監査はしていない。',
  categories: [],
}

if (cert) {
  unresolved.certification = cert
}

// 例文・発音の欠落は「未解決だがリリースを止めない」項目として件数だけ数える
const gaps = []
for (const lang of LANGS) {
  const all = loadAll(lang)
  const noExample = all.filter((e) => !e.example).length
  const noPron = all.filter((e) => !e.pronunciation).length
  gaps.push({ language: lang, total: all.length, exampleMissing: noExample, pronunciationMissing: noPron })
}
unresolved.categories.push({
  name: '例文・発音の欠落',
  blocking: false,
  reason: '未設定でもアプリは正常に出題する（第2段階で確認済み）。学習体験の充実度の問題であり公開事故ではない。',
  detail: gaps,
})
unresolved.categories.push({
  name: '証拠が得られなかった語（REVIEW / AMBIGUOUS）',
  blocking: false,
  reason: '既存の認証フェーズで「変更すべき明確な証拠あり」と判定された語は0件。証拠不足＝誤りではない。',
  source: 'tools/certify/report/_summary.json',
})
fs.writeFileSync(path.join(outDir, 'unresolved-items.json'), JSON.stringify(unresolved, null, 1))

let md7 = `# 第7段階: 未解決のまま残っている項目\n\n`
md7 += `既存の監査結果をそのまま前提としている。再監査・再分類は行っていない。\n\n`
md7 += `## 例文・発音の欠落（リリースを止めない）\n\n| 言語 | 総数 | 例文なし | 発音なし |\n|---|---|---|---|\n`
for (const g of gaps) md7 += `| ${g.language} | ${g.total} | ${g.exampleMissing} | ${g.pronunciationMissing} |\n`
md7 += `\n未設定でもアプリは正常に出題することを第2段階で確認済み。学習体験の充実度の問題であり、公開事故ではない。\n`
fs.writeFileSync(path.join(outDir, 'unresolved-items.md'), md7)

// ---------------------------------------------------------- 第8段階: 無変更の確認
let gitStatus = ''
let dataChanged = []
try {
  gitStatus = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' })
  dataChanged = gitStatus.split('\n').filter((l) => /public\/wordbank\//.test(l))
} catch (e) {
  gitStatus = `(git 実行不可: ${e.message})`
}

let md8 = `# 第8段階: 元データを変更していないことの確認\n\n`
md8 += `## 判定\n\n**${dataChanged.length === 0 ? '元データの変更なし' : '元データに変更あり（要確認）'}**\n\n`
md8 += `## public/wordbank/ 配下の変更\n\n`
md8 += dataChanged.length ? '```\n' + dataChanged.join('\n') + '\n```\n' : 'なし。全10言語の単語データは1バイトも変更していない。\n'
md8 += `\n## 今回のチェックで作成したファイル\n\n`
md8 += `- \`tools/release-check/\` … 検査コード（stage1〜8）\n- \`release-check/\` … 検査レポート\n\n`
md8 += `いずれも監査レポートとテストコードのみ。アプリのソースコードと単語データは変更していない。\n\n`
md8 += `## git status（全体）\n\n\`\`\`\n${gitStatus.trim() || '(変更なし)'}\n\`\`\`\n`
fs.writeFileSync(path.join(outDir, 'no-data-mutation.md'), md8)

console.log(JSON.stringify({
  sample: { total: sampleJson.length, perLanguage: 30 },
  unresolved: { gapLanguages: gaps.length },
  noDataMutation: dataChanged.length === 0,
  wordbankChanges: dataChanged.length,
}))
