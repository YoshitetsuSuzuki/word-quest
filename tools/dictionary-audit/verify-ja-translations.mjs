// ============================================================================
// verify-ja-translations.mjs  全20,131語の日本語訳をJMdictで非破壊照合(照合のみ・元データ非改変)
//   各語の (英語側の意味, 日本語訳) の対応が JMdict に存在するか確認。
//   matched: 日本語訳の辞書義が英語意味と一致 / conflicting: 日本語語は実在するが意味が食い違う(誤訳候補)
//   partial / not_found(辞書に日本語見出しなし=誤りとは限らない) / not_checked
//   出力: audit/ja-verify/*.json / *.md
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const outDir = path.join(repoRoot, 'audit', 'ja-verify')
fs.mkdirSync(outDir, { recursive: true })
const idx = JSON.parse(fs.readFileSync(path.join(here, 'data', 'indexes', 'jmdict.index.json'), 'utf8'))
const ja2en = idx.ja2en, en2ja = idx.en2ja
const has = (map, k) => Object.prototype.hasOwnProperty.call(map, '#' + k)
const get = (map, k) => map['#' + k] || []

const LANGS = ['english', 'chinese', 'korean', 'spanish', 'german', 'french', 'portuguese', 'polish', 'russian']
const STRUCT = { english: 'ja_answer', chinese: 'ja_answer', korean: 'ja_answer', spanish: 'pivot', german: 'pivot', french: 'pivot', portuguese: 'pivot', polish: 'pivot', russian: 'pivot' }
const hw = (e) => String(e.prompt || '').replace(/[「」]|の意味は？/g, '') || e.headword || ''
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'that', 'as', 'be', 'by', 'esp', 'etc', 'one', 'something', 'someone', 'so', 'not', 'no'])
function stem(w) { return w.replace(/('s|s|es|ed|ing|ly|er|est)$/, '') }
function enTokens(s) {
  const toks = String(s || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))
  const set = new Set()
  for (const t of toks) { set.add(t); const st = stem(t); if (st.length > 2) set.add(st) }
  return [...set]
}

// 日本語訳の正規化候補(辞書見出しに寄せる)。先頭助詞除去はしない(もまた→また 等の誤マッチ防止)
function jaVariants(ja) {
  const out = new Set()
  const base = String(ja || '').trim()
  if (!base) return []
  for (let s of base.split(/[、，,／\/]/).map((x) => x.trim()).filter(Boolean)) {
    s = s.replace(/[「」『』（）()【】\[\]]/g, '').replace(/[～〜]/g, '').trim()
    if (!s) continue
    out.add(s)
    if (/[のな]$/.test(s)) out.add(s.slice(0, -1)) // 属性形容詞の の/な のみ除去
    out.add(s.replace(/(する|した|している)$/, '')) // サ変
  }
  return [...out].filter((v) => v && v.length >= 1)
}

function verifyPair(enTerms, jaTerm) {
  const vars = jaVariants(jaTerm)
  if (!vars.length) return { status: 'not_checked', note: '日本語訳なし' }
  const enTok = new Set(enTerms.flatMap(enTokens))
  let anyJaInDict = false
  let bestOverlap = 0, dictSample = ''
  for (const v of vars) {
    if (has(ja2en, v)) {
      anyJaInDict = true
      const glosses = get(ja2en, v)
      dictSample = glosses.slice(0, 3).join('; ')
      const gtok = new Set(glosses.flatMap(enTokens))
      const overlap = [...enTok].filter((w) => gtok.has(w)).length
      if (overlap > bestOverlap) bestOverlap = overlap
      // 逆方向: JMdictの英gloss語からjaForm集合に v が含まれるか(既にforward成立なので省略可)
    }
  }
  // 逆方向: 英語側token -> JMdict jaForm、その中に日本語訳varがあるか
  let reverseHit = false
  for (const w of enTok) { const forms = get(en2ja, w); if (forms.length && vars.some((v) => forms.includes(v))) { reverseHit = true; break } }

  if (bestOverlap > 0 || reverseHit) return { status: 'matched', overlap: bestOverlap, reverse: reverseHit, dictSample }
  if (anyJaInDict) return { status: 'conflicting', overlap: 0, dictSample } // 日本語語は実在だが英語意味と重ならない=誤訳候補
  return { status: 'not_found', note: '日本語訳がJMdict見出しに無い(活用/句/未収録)' }
}

const results = []
for (const lang of LANGS) {
  const man = JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, 'manifest.json'), 'utf8'))
  let arr = []
  for (const lv of man.levels) arr = arr.concat(JSON.parse(fs.readFileSync(path.join(repoRoot, 'public', 'wordbank', lang, lv.file), 'utf8')))
  for (const e of arr) {
    let enTerms, jaTerm
    if (STRUCT[lang] === 'pivot') { enTerms = [e.answer, e.glosses?.en].filter(Boolean); jaTerm = e.glosses?.ja }
    else { enTerms = lang === 'english' ? [hw(e)] : [e.glosses?.en].filter(Boolean); jaTerm = e.answer }
    if (lang !== 'english' && !enTerms.length) { results.push({ id: e.id, language: lang, headword: hw(e), jaTerm, status: 'not_checked', note: '英語側の意味なし(照合不能)' }); continue }
    const r = verifyPair(enTerms, jaTerm)
    results.push({ id: e.id, language: lang, headword: hw(e), enTerms, jaTerm, ...r })
  }
}

// 集計
const byLang = {}, byStatus = {}
for (const r of results) { (byLang[r.language] = byLang[r.language] || {})[r.status] = ((byLang[r.language] || {})[r.status] || 0) + 1; byStatus[r.status] = (byStatus[r.status] || 0) + 1 }
const conflicting = results.filter((r) => r.status === 'conflicting')
fs.writeFileSync(path.join(outDir, 'ja-verify-results.json'), JSON.stringify({ source: 'JMdict (EDRDG, CC-BY-SA 4.0)', total: results.length, byStatus, byLanguage: byLang, note: 'not_found=日本語訳が辞書見出しに無い(活用/句/未収録)であり誤りとは限らない。conflicting=日本語語は実在だが辞書義が英語意味とズレる=誤訳候補。' }, null, 2))
fs.writeFileSync(path.join(outDir, 'ja-conflicting.json'), JSON.stringify(conflicting, null, 2))
console.log('日本語訳照合(JMdict):', results.length, '語')
console.log('status別:', byStatus)
console.log('誤訳候補(conflicting):', conflicting.length)
