// ============================================================================
// remediate-priority.mjs  【第3段階】公開上危険な項目の抽出
//   - 正規化済みissue＋実データ照合で「公開前に必ず対応すべき」項目を抽出
//   - 報告文のみを根拠にせず、必ず public/wordbank の実データで現在値を確認
//   - 抽出のみ（元データは変更しない）。全件 requiresHumanReview:true
// 出力: audit/remediation/priority-publication-risks.json
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'audit', 'remediation')

function load(lang) {
  const dir = path.join(root, 'public', 'wordbank', lang)
  const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
  let w = []
  for (const lv of man.levels) w = w.concat(JSON.parse(fs.readFileSync(path.join(dir, lv.file), 'utf8')))
  return w
}
const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const byId = new Map()
for (const lang of LANGS) for (const e of load(lang)) byId.set(e.id, { ...e, _lang: lang })

const normalized = JSON.parse(fs.readFileSync(path.join(outDir, 'all-issues-normalized.json'), 'utf8'))
const normById = new Map()
for (const r of normalized) normById.set(r.id + '|' + r.issueCategory, r)

// 実データから現在値スナップショットを取る（報告ではなく実データが根拠）
function snapshot(id) {
  const e = byId.get(id)
  if (!e) return null
  return { answer: e.answer ?? null, glosses: e.glosses ?? null, example: e.example ?? null, choices: e.choices ?? null, tags: e.tags ?? null, prompt: e.prompt ?? null }
}
function mkRisk(id, riskType, tier, field, note, sourceIssueCategory) {
  const e = byId.get(id)
  if (!e) return { id, verified: false, note: '実データに該当IDなし（要確認）', riskType, tier }
  return {
    id, language: e._lang, tier, riskType, field,
    verifiedFromRealData: true,
    currentValue: snapshot(id)[field] ?? snapshot(id),
    fullSnapshot: snapshot(id),
    note,
    sourceIssueCategory: sourceIssueCategory || null,
    requiresHumanReview: true,
    autoApplied: false,
  }
}

const risks = []

// --- Tier 1: 内容不適切（差別語・侮蔑語・性的/年齢不相応・不適切選択肢）実データ確認済み ---
risks.push(mkRisk('en-22829', 'discriminatory_expression_in_example', 1, 'example',
  '例文に差別的表現「slant-eyed」を含む。学習/公開教材として不適切。例文の差し替えが必要。', 'inappropriate_content'))
risks.push(mkRisk('en-22571', 'sexually_inappropriate_example', 1, 'example',
  '例文「I have an erection.／勃起しています」は4+レーティングに不適切。answer「建設」の語義を示す例文へ差し替え。', 'example_sense_mismatch'))
risks.push(mkRisk('en-20863', 'slur_as_answer', 1, 'answer',
  'answer「気違い」は差別語・放送不適切語。例文和訳では既に「狂人」を使用しており不整合。answerを「狂人」等へ。tagsも形容詞→名詞誤り。', 'inappropriate_content'))
risks.push(mkRisk('en-00214', 'vulgar_distractor_choice', 1, 'choices',
  '4択選択肢に「お尻，女性器」という下品/性的な誤答が混入。正解「〜以来」とは無関係。当該選択肢を無難な語へ差し替え。', null))

// --- Tier 2: 見出し語と無関係な固有名詞/別語の例文（学習破壊・名指し項目を実データ確認） ---
const tier2Named = {
  'en-03104': 'answer「黒い漆」に対し例文は国名Japan（無関係）。動詞/漆器の語義を示す例文へ。',
  'en-06181': 'answer「ラテックス(ゴム)」に対し例文は組版ソフトLATEX（無関係・表記も誤）。',
  'en-06154': 'answer「鉄線くぎ」に対し例文は人名Brad Pitt（無関係）。',
  'en-09398': 'answer「青白い(wan)」に対し例文は別語waning(wane)。見出し語が例文に不在。',
  'en-21935': 'answer「チリンと鳴らす(ting)」に対し例文は別語tinged(tinge)。見出し語が例文に不在。',
}
for (const [id, note] of Object.entries(tier2Named)) risks.push(mkRisk(id, 'example_unrelated_or_wrong_word', 2, 'example', note, 'example_sense_mismatch'))

// normalized の high severity example_sense_mismatch を Tier2 に追加（実データ確認付き）
for (const r of normalized) {
  if (r.issueCategory === 'example_sense_mismatch' && r.severity === 'high') {
    if (risks.some((x) => x.id === r.id)) continue
    const rec = mkRisk(r.id, 'example_sense_mismatch_high', 2, 'example', r.reason, 'example_sense_mismatch')
    rec.suggestedValue = r.suggestedValue ?? null
    rec.confidence = r.confidence
    risks.push(rec)
  }
}

// --- Tier 3: 明確な誤訳（例文和訳の誤り等・実データ確認） ---
risks.push(mkRisk('zh-02747', 'example_translation_error', 3, 'example',
  '例文「跑了一圈」の和訳が「一輪走った」＝誤り。量詞「圈」＝一周(one lap)。「一周走った」が正。', 'translation_issue'))

// 名指しされた翻訳整合(false friend / en-ja不一致) — 危険ではないが公開前確認推奨としてTier3に記録
const tier3Named = {
  'es-00432': 'dulce: en「candy(菓子)」だが ja「甘い(形容詞)」。英訳と和訳の主要義がずれる。',
  'es-01405': 'cristo: en「jesus」は「Christ」が適切（固有名詞表記）。',
  'fr-00645': 'expérience: en「experiment」だが第一義は「experience(経験)」。false friend。',
  'fr-01022': 'émission: en「emission」だが ja「放送」。broadcast寄りで英訳とずれる。',
  'fr-00092': 'ensemble: en「set」だが ja「一緒に」。副詞義と名詞義の取り違え懸念。',
}
for (const [id, note] of Object.entries(tier3Named)) {
  if (risks.some((x) => x.id === id)) continue
  risks.push(mkRisk(id, 'translation_false_friend_or_en_ja_mismatch', 3, 'glosses', note, 'translation_issue'))
}

// --- 欠落で問題が成立しないデータ（choices不足・answer欠落など。実データで判定） ---
for (const [id, e] of byId) {
  const brokenChoices = !Array.isArray(e.choices) || e.choices.length !== 4
  const answerMissing = e.answer == null || e.answer === ''
  const answerNotInChoices = Array.isArray(e.choices) && e.answer != null && !e.choices.includes(e.answer)
  if (brokenChoices || answerMissing || answerNotInChoices) {
    risks.push({
      id, language: byId.get(id)._lang, tier: 1, riskType: 'question_structurally_broken',
      verifiedFromRealData: true, field: 'choices/answer',
      currentValue: { choices: e.choices ?? null, answer: e.answer ?? null },
      note: `出題不成立: choices数=${Array.isArray(e.choices) ? e.choices.length : 'なし'}, answer=${JSON.stringify(e.answer)}, answer∈choices=${Array.isArray(e.choices) ? e.choices.includes(e.answer) : 'NA'}`,
      requiresHumanReview: true, autoApplied: false,
    })
  }
}

// 並べ替え: tier昇順
risks.sort((a, b) => (a.tier - b.tier) || String(a.id).localeCompare(String(b.id)))
fs.writeFileSync(path.join(outDir, 'priority-publication-risks.json'), JSON.stringify(risks, null, 2))

const byTier = {}
for (const r of risks) byTier[r.tier] = (byTier[r.tier] || 0) + 1
const byType = {}
for (const r of risks) byType[r.riskType] = (byType[r.riskType] || 0) + 1
console.log('第3段階 公開上危険な項目:', risks.length, '件')
console.log('  tier別:', byTier)
console.log('  riskType別:', byType)
console.log('  ※全件 requiresHumanReview:true・autoApplied:false（自動変更なし）')
