// ============================================================================
// stage3-4-safety-assets.mjs  第3段階(公開上危険な文字列) / 第4段階(参照切れ)
//   元データは変更しない。検出のみ。
//   単語の存在だけでは問題としない。例文・訳・選択肢の文脈で判定する。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const outDir = path.join(root, 'release-check')
fs.mkdirSync(outDir, { recursive: true })

const LANGS = ['english', 'chinese', 'japanese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']

function loadAll(lang) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  let arr = []
  for (const lv of man.levels) arr = arr.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
  return { man, arr, dir }
}

// ----------------------------------------------------------- 第3段階: 危険な文字列
// 過去に削除対象となった/監査でunsafe判定された種類の表現。
// 見出し語が辞書語として必要な場合があるため、例文・訳・選択肢の「文脈」を見る。
const SLUR_OR_EXPLICIT = [
  // 英語(露骨・侮蔑)
  /\bfuck\w*/i, /\bshit\w*/i, /\bcunt\w*/i, /\bnigger\w*/i, /\bfaggot\w*/i, /\bwhore\b/i, /\bslut\b/i,
  /\brape\b/i, /\bporn\w*/i, /\bmasturbat\w*/i, /\bejaculat\w*/i, /\bgenital\w*/i, /\bpenis\b/i, /\bvagina\b/i,
  // 日本語(侮蔑・露骨)
  /(?:キチガイ|きちがい|気違い)/, /(?:めくら|つんぼ)(?![らりるれろっしゃ])/, /(?:土人|支那|鮮人)/,
  /(?:淫乱|痴女|強姦|売春婦|射精|性器|陰茎|膣)/, /(?:カス野郎|クズ野郎|死ね)/,
]
// 文字化け・技術的混入
const GARBLE = /[�]|â€|ã€|ï¼|\\u[0-9a-fA-F]{4}/
const HTML_CODE = /<\/?[a-z][\w-]*(\s[^>]*)?>|&lt;|&gt;|&amp;[a-z]+;|\{\{|\}\}|<script/i
const URL_RE = /(https?:\/\/|www\.)[^\s]+/i

const safetyFindings = []
let scannedFields = 0

for (const lang of LANGS) {
  const { arr } = loadAll(lang)
  for (const e of arr) {
    // 見出し語そのものは辞書語として必要なことがあるため単独では問題視しない。
    // 学習者が目にする「文脈」= 例文 / 訳 / 選択肢 を検査する。
    const contexts = [
      ['example', e.example],
      ['answer', e.answer],
      ['glosses.ja', e.glosses?.ja],
      ['glosses.en', e.glosses?.en],
      ...(Array.isArray(e.choices) ? e.choices.map((c, i) => [`choices[${i}]`, c]) : []),
    ].filter(([, v]) => typeof v === 'string' && v)

    for (const [field, val] of contexts) {
      scannedFields++
      for (const re of SLUR_OR_EXPLICIT) {
        if (!re.test(val)) continue
        // その語が「見出し語そのものの語義」なら、辞書項目として正当。
        // 例: 見出し語 penis の正解「陰茎」/ 例文「陰茎は雄の生殖器…」。
        const isHeadwordSense = [e.prompt, e.answer, e.glosses?.ja, e.glosses?.en]
          .some((v) => typeof v === 'string' && re.test(v))
        if (isHeadwordSense) {
          safetyFindings.push({ severity: 'Info', language: lang, id: e.id, field, type: 'headword_sense_explicit', value: val.slice(0, 80), pattern: String(re), note: '見出し語自体の語義。辞書として正当だが年齢レーティングの検討対象' })
        } else if (field.startsWith('choices[')) {
          // 無関係な語（例:「幼稚園」）の誤答に露骨語が出る。出題体験上の問題。
          safetyFindings.push({ severity: 'Major', language: lang, id: e.id, field, type: 'explicit_distractor', value: val.slice(0, 80), pattern: String(re), prompt: e.prompt, answer: e.answer })
        } else {
          safetyFindings.push({ severity: 'Critical', language: lang, id: e.id, field, type: 'explicit_in_context', value: val.slice(0, 80), pattern: String(re), prompt: e.prompt })
        }
        break
      }
      if (GARBLE.test(val)) safetyFindings.push({ severity: 'Major', language: lang, id: e.id, field, type: 'garbled_text', value: val.slice(0, 80) })
      if (HTML_CODE.test(val)) safetyFindings.push({ severity: 'Major', language: lang, id: e.id, field, type: 'html_or_code', value: val.slice(0, 80) })
      if (URL_RE.test(val)) safetyFindings.push({ severity: 'Major', language: lang, id: e.id, field, type: 'url_in_content', value: val.slice(0, 80) })
    }
  }
}

const sCrit = safetyFindings.filter((f) => f.severity === 'Critical').length
const sMajor = safetyFindings.filter((f) => f.severity === 'Major').length
const sInfo = safetyFindings.filter((f) => f.severity === 'Info').length
const safety = {
  stage: 3, title: '公開上危険な文字列の再検索',
  scannedFields, checkedItems: 29417,
  summary: { critical: sCrit, major: sMajor, info: sInfo, total: safetyFindings.length },
  verdict: sCrit === 0 ? 'PASS' : 'FAIL',
  note: '見出し語の存在のみでは問題としない。例文・訳・選択肢の文脈を検査した。Info=見出し語自体の語義(辞書として正当)。Major=無関係な語の誤答に露骨語が混入。',
  findings: safetyFindings.slice(0, 200),
}
fs.writeFileSync(path.join(outDir, 'content-safety.json'), JSON.stringify(safety, null, 1))

let md3 = `# 第3段階: 公開上危険な文字列の再検索\n\n判定: **${safety.verdict}**\n\n`
md3 += `- 検査した文脈フィールド数: ${scannedFields.toLocaleString()}（例文・訳・選択肢）\n`
md3 += `- Critical: ${sCrit} / Major: ${sMajor}\n`
md3 += `- 方針: 見出し語が辞書語として必要な場合があるため、単語の存在だけでは問題扱いにしない。学習者が目にする文脈のみを検査。\n\n`
md3 += `## 検査対象\n\n差別的表現 / 侮蔑語 / 性的に露骨な例文 / 年齢不相応な選択肢 / 文字化け / HTML・コード断片 / URLの誤混入\n\n`
if (safetyFindings.length) {
  md3 += `## 検出\n\n`
  for (const f of safetyFindings.filter((x) => x.severity !== 'Info').slice(0, 80)) md3 += `- [${f.severity}] ${f.language} ${f.id} ${f.type}: 出題「${f.prompt ?? ''}」正解「${f.answer ?? ''}」→ \`${f.value}\`\n`
  md3 += `\n### Info（見出し語自体の語義・辞書として正当）\n\n`
  for (const f of safetyFindings.filter((x) => x.severity === 'Info').slice(0, 40)) md3 += `- ${f.language} ${f.id} ${f.field}: \`${f.value}\`\n`
} else {
  md3 += `## 検出\n\nなし。危険な文字列の残存は確認されなかった。\n`
}
fs.writeFileSync(path.join(outDir, 'content-safety.md'), md3)

// ----------------------------------------------------------- 第4段階: 参照切れ
const assetFindings = []

// manifest から参照されるファイルの存在 / 言語ディレクトリの欠落 / 大文字小文字不一致
for (const lang of LANGS) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  if (!fs.existsSync(dir)) {
    assetFindings.push({ severity: 'Critical', type: 'language_dir_missing', detail: lang }); continue
  }
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  const actual = fs.readdirSync(dir)
  for (const lv of man.levels) {
    const p = path.join(dir, lv.file)
    if (!fs.existsSync(p)) assetFindings.push({ severity: 'Critical', type: 'manifest_file_missing', detail: `${lang}/${lv.file}` })
    else if (!actual.includes(lv.file)) assetFindings.push({ severity: 'Critical', type: 'filename_case_mismatch', detail: `${lang}/${lv.file}` })
  }
}

// index.html / PWA manifest / アイコンなど、ビルド成果物が参照する静的ファイル
const pub = path.join(root, 'public')
const indexHtml = fs.existsSync(path.join(root, 'index.html')) ? fs.readFileSync(path.join(root, 'index.html'), 'utf8') : ''
for (const m of indexHtml.matchAll(/(?:href|src)="([^"]+)"/g)) {
  const ref = m[1]
  if (/^https?:|^data:|^\/\//.test(ref)) continue
  if (ref.startsWith('/src/') || ref.includes('main.tsx')) continue // dev entry (ビルドで置換される)
  const rel = ref.replace(/^\//, '')
  if (!fs.existsSync(path.join(pub, rel)) && !fs.existsSync(path.join(root, rel))) {
    assetFindings.push({ severity: 'Major', type: 'index_html_ref_missing', detail: ref })
  }
}

// 本番で使えない絶対パス（アプリのソース中に /Users/ 等が混入していないか）
const srcFiles = []
;(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name)
    if (f.isDirectory()) walk(p)
    else if (/\.(ts|tsx|js|jsx|css|html)$/.test(f.name)) srcFiles.push(p)
  }
})(path.join(root, 'src'))
for (const f of srcFiles) {
  const t = fs.readFileSync(f, 'utf8')
  if (/["'`](\/Users\/|\/home\/|[A-Z]:\\)/.test(t)) {
    assetFindings.push({ severity: 'Critical', type: 'absolute_local_path_in_src', detail: path.relative(root, f) })
  }
  if (/localhost:\d+/.test(t) && !/vite|dev/i.test(path.basename(f))) {
    assetFindings.push({ severity: 'Major', type: 'localhost_reference_in_src', detail: path.relative(root, f) })
  }
}

// 音声/画像参照: アプリは TTS 生成でファイル音声を持たないため、参照があれば存在確認
for (const f of srcFiles) {
  const t = fs.readFileSync(f, 'utf8')
  for (const m of t.matchAll(/["'`](\/[\w\-./]+\.(?:png|jpg|jpeg|svg|webp|mp3|wav|ogg|json))["'`]/g)) {
    const rel = m[1].replace(/^\//, '')
    if (!fs.existsSync(path.join(pub, rel)) && !fs.existsSync(path.join(root, rel))) {
      assetFindings.push({ severity: 'Major', type: 'asset_ref_missing', detail: `${path.relative(root, f)} → ${m[1]}` })
    }
  }
}

const aCrit = assetFindings.filter((f) => f.severity === 'Critical').length
const aMajor = assetFindings.filter((f) => f.severity === 'Major').length
const assets = {
  stage: 4, title: 'ファイルと参照切れ',
  summary: { critical: aCrit, major: aMajor, total: assetFindings.length },
  verdict: aCrit === 0 ? 'PASS' : 'FAIL',
  findings: assetFindings,
}
fs.writeFileSync(path.join(outDir, 'missing-assets.json'), JSON.stringify(assets, null, 1))

let md4 = `# 第4段階: ファイルと参照切れ\n\n判定: **${assets.verdict}**\n\n`
md4 += `- Critical: ${aCrit} / Major: ${aMajor}\n\n`
md4 += `## 検査対象\n\n存在しない画像/音声/JSON参照 / manifest参照ファイルの欠落 / 言語ディレクトリの欠落 / ファイル名の大文字小文字不一致 / 本番で使えない絶対パス\n\n`
if (assetFindings.length) {
  md4 += `## 検出\n\n`
  for (const f of assetFindings.slice(0, 60)) md4 += `- [${f.severity}] ${f.type}: ${f.detail}\n`
} else {
  md4 += `## 検出\n\nなし。全10言語のディレクトリ・manifest参照ファイルは揃っており、参照切れは確認されなかった。\n`
}
fs.writeFileSync(path.join(outDir, 'missing-assets.md'), md4)

console.log(JSON.stringify({
  safety: { critical: sCrit, major: sMajor, info: sInfo, verdict: safety.verdict, scannedFields },
  assets: { critical: aCrit, major: aMajor, verdict: assets.verdict },
}))
