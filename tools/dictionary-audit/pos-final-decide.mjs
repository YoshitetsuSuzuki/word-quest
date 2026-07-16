// ============================================================================
// pos-final-decide.mjs  残存353件を2辞書＋answer＋例文で判定し、安全な tags のみ修正
//   第2ソース: 英語=Kaikki英語subset(targeted抽出)。韓国語=第2ソースなし(not_checked)。
//   核心: 2辞書の和集合品詞にアプリタグが含まれる=多品詞で妥当→変更不要(C)。
//   安全修正: 和集合が単一品詞かつanswer一致(＋例文非衝突)・conf>=0.995・tagsのみ。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadIndex } from './shared/index-store.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const D = path.join(repoRoot, 'audit', 'pos-final-review')
const cs = JSON.parse(fs.readFileSync(path.join(D, 'current-state.json'), 'utf8'))
const POSMAP = JSON.parse(fs.readFileSync(path.join(here, 'config', 'languages.json'), 'utf8')).posMap
const JA_LABEL = { noun: '名詞', verb: '動詞', adjective: '形容詞', adverb: '副詞', pronoun: '代名詞', numeral: '数詞', interjection: '間投詞', preposition: '前置詞', conjunction: '接続詞', determiner: '限定詞' }
const CANON = { 名詞: 'noun', 動詞: 'verb', 形容詞: 'adjective', 副詞: 'adverb', 代名詞: 'pronoun', 数詞: 'numeral', 間投詞: 'interjection', 前置詞: 'preposition', 接続詞: 'conjunction', 限定詞: 'determiner' }
const SCHEMA = { english: new Set(['名詞', '動詞', '形容詞', '副詞', '代名詞', '数詞', '間投詞', '前置詞', '接続詞', '限定詞']), korean: new Set(['名詞', '動詞', '形容詞', '副詞', '代名詞', '数詞', '間投詞']) }
const KPOS = { noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun', intj: 'interjection', prep: 'preposition', conj: 'conjunction', num: 'numeral', name: 'proper noun', det: 'determiner', phrase: 'phrase', proverb: 'phrase', article: 'determiner', particle: 'particle', character: 'character' }
// 同綴多品詞の慎重扱い(辞書に複数あるだけでは修正しない)
const CAUTION = new Set(['record', 'present', 'object', 'increase', 'change', 'round', 'right', 'like', 'sound', 'light', 'work', 'order', 'answer', 'question', 'before', 'after', 'inside', 'outside', 'well', 'fast', 'hard', 'still', 'just', 'since'])

const oewn = loadIndex('oewn'), kko = loadIndex('kaikki-korean')
// 第2ソース: Kaikki英語subset
const subsetPath = path.join(here, 'data', 'raw', 'kaikki-english-subset.jsonl')
const enSubset = new Map()
if (fs.existsSync(subsetPath)) {
  for (const line of fs.readFileSync(subsetPath, 'utf8').split('\n')) { if (!line.trim()) continue; let e; try { e = JSON.parse(line) } catch { continue }; const w = String(e.word || '').toLowerCase(); const p = KPOS[e.pos] || e.pos; if (!enSubset.has(w)) enSubset.set(w, new Set()); if (p) enSubset.get(w).add(p) }
}
const secondSourceAvail = enSubset.size > 0

function answerPos(a) {
  const s = String(a || '')
  if (/(?:だ|な|い|った|しい|らしい|っぽい|的)$/.test(s) || /(?:がある|がない|ている|できる|得る)$/.test(s)) return 'adjective'
  if (/(?:く|に|と)$/.test(s)) return 'adverb'
  if (/(?:する|なる|のようだ|られる|せる)$/.test(s) || /[るうぐすつぬぶむ]$/.test(s)) return 'verb'
  return 'noun'
}
// 例文中の見出し語の文法機能(英語のみ・前後語で判定)
const PREP = /^(of|in|on|at|to|for|with|by|from|about|between|into|over|under|as|than|through|during|without|within|after|before)$/
const AUXV = /^(is|are|was|were|be|been|being|has|have|had|do|does|did|will|would|can|could|should|must|may|might|am)$/
function examplePos(example, word, form) {
  if (!example) return null
  const en = String(example).split(' — ')[0].toLowerCase().replace(/[.,!?;:"'’]/g, '')
  const toks = en.split(/\s+/).filter(Boolean)
  const cands = [String(form || '').toLowerCase(), String(word || '').toLowerCase()].filter(Boolean)
  let i = -1
  for (const c of cands) { i = toks.indexOf(c); if (i >= 0) break }
  if (i < 0) return null
  const prev = toks[i - 1] || '', next = toks[i + 1] || ''
  if (/^(is|are|was|were|be|been|being|very|too|so|more|most|quite|really|look|looks|looked|seem|seems|seemed|feel|feels|felt|become|becomes|became|remain|remains|stay|stays|get|gets|got|sound|sounds)$/.test(prev)) return 'adjective' // 叙述形容詞
  if (/^(to|will|would|can|could|should|must|may|might|not|dont|didnt|doesnt|let|please|they|we|i|you|he|she|it)$/.test(prev) && /[a-z]/.test(String(word))) return 'verb'
  if (/^(the|a|an|this|that|these|those|my|his|her|its|our|their|some|any|no|one|each|every|another)$/.test(prev)) {
    // 限定詞: 直後が前置詞/助動詞/接続詞/文末 → 主要名詞。直後が別の内容語 → 対象は修飾語(形容詞的)で曖昧
    if (!next || PREP.test(next) || AUXV.test(next) || /^(and|or|but)$/.test(next)) return 'noun'
    return null // det ADJ NOUN パターン → 対象は修飾語 → 判定保留
  }
  return null
}

const decisions = []
for (const r of cs) {
  const lang = r.language
  const word = r.headword
  const curTag = (r.currentTags || []).filter((t) => t !== 'phrase')[0]
  const curCanon = CANON[curTag] || POSMAP[curTag] || null
  // dict1
  let d1 = []
  if (lang === 'english' && oewn) { const lk = oewn.lookup(word); if (lk.found) d1 = [...new Set(lk.entries.flatMap((x) => x.partsOfSpeech))].filter(Boolean) }
  if (lang === 'korean' && kko) { const lk = kko.lookup(word); if (lk.found) d1 = [...new Set(lk.entries.flatMap((x) => x.partsOfSpeech))].filter(Boolean) }
  // dict2 (english only)
  let d2 = [], d2status = 'not_checked'
  if (lang === 'english' && secondSourceAvail) { const s = enSubset.get(String(word).toLowerCase()); if (s) { d2 = [...s]; d2status = 'exact' } else { d2status = 'not_found' } }
  const union = [...new Set([...d1, ...d2])]
  const unionJa = union.map((p) => JA_LABEL[p]).filter(Boolean)
  const aPos = answerPos(r.answer)
  const aPosJa = JA_LABEL[aPos]
  const ePos = examplePos(r.example, word, r.exampleForm)
  const ePosJa = ePos ? JA_LABEL[ePos] : null

  let status, category, adopted = null, conf = 0, reason = ''
  const inCaution = CAUTION.has(String(word).toLowerCase())
  const twoSrc = lang === 'english' && d2status === 'exact' && d2.length && d1.length

  if (!union.length) { status = 'insufficient_evidence'; category = 'G'; reason = '辞書に品詞情報なし' }
  // (1) 例文の文法機能が反映されている場合を最優先(信頼度高)。answer語形の曖昧さ(い終止名詞等)で妨げない。
  else if (ePosJa) {
    if (CANON[curTag] === CANON[ePosJa]) { status = 'current_tag_correct'; category = 'C'; reason = `例文で見出し語は${ePosJa}として使用・現タグ『${curTag}』と一致→変更不要` }
    else if (!unionJa.includes(ePosJa)) { status = 'dictionary_sources_conflict'; category = 'F'; reason = `例文文法(${ePosJa})が辞書品詞[${union}]に無い→人手(辞書体系差/例文特殊)` }
    else if (!SCHEMA[lang]?.has(ePosJa)) { status = 'dictionary_taxonomy_difference'; category = 'F'; reason = `例文文法(${ePosJa})がスキーマ外→人手` }
    else if (inCaution && aPosJa !== ePosJa) { status = 'multiple_pos_record_ambiguous'; category = 'E'; reason = `同綴多品詞(${word})・例文(${ePosJa})とanswer(${aPosJa})要確認→人手` }
    else if (/(?:ed|ing)$/.test(String(word).toLowerCase()) && ePos === 'verb' && union.includes('adjective')) {
      // -ed/-ing分詞は形容詞義/動詞義の両方あり得る。例文が動詞でもレコードが形容詞義を教える恐れ→人手
      status = 'multiple_pos_record_ambiguous'; category = 'E'; reason = `分詞(${word})は動詞義/形容詞義の両方あり(辞書にadjective)・例文は動詞だがレコード採用義要確認→人手`
    } else {
      conf = twoSrc ? 0.997 : 0.995
      status = 'single_pos_confirmed'; category = 'A'; adopted = [ePosJa]
      reason = `例文で見出し語は${ePosJa}として使用・辞書和集合[${union}]に${ePosJa}あり・現タグ『${curTag}』不一致${twoSrc ? '・2辞書確認' : ''}`
    }
  }
  // (2) 例文で確定できない → answer + 辞書。現タグが辞書集合に含まれるなら多品詞で妥当(C)。
  else if (curCanon && union.includes(curCanon)) { status = 'current_tag_correct'; category = 'C'; reason = `例文なし。現タグ『${curTag}』は辞書品詞集合[${union}]に含まれ多品詞で妥当→変更不要` }
  else {
    const uniqJa = [...new Set(unionJa)]
    const prepAns = /の[前後間周上下中]/.test(String(r.answer || ''))
    if (uniqJa.length === 1 && SCHEMA[lang]?.has(uniqJa[0]) && aPosJa === uniqJa[0] && CANON[curTag] !== CANON[uniqJa[0]] && !inCaution && !prepAns) {
      conf = twoSrc ? 0.996 : 0.99
      if (conf >= 0.995) { status = 'single_pos_confirmed'; category = 'A'; adopted = [uniqJa[0]]; reason = `例文なし。辞書和集合が単一[${uniqJa[0]}]・answer(${aPosJa})一致・非caution・2辞書確認` }
      else { status = 'insufficient_evidence'; category = 'G'; reason = `辞書単一だがconf<0.995(第2ソース未確認)→人手` }
    } else { status = 'multiple_pos_record_ambiguous'; category = 'E'; reason = `例文なし。多品詞[${union}]/answer曖昧/慎重語→人手` }
  }
  decisions.push({ id: r.id, language: lang, headword: word, currentTags: r.currentTags, answer: r.answer, example: r.example, exampleForm: r.exampleForm, pronunciation: r.pronunciation, difficulty: r.difficulty, dict1Pos: d1, dict2Pos: d2, dict2Status: d2status, unionPos: union, answerPos: aPos, examplePos: ePos, decisionStatus: status, category, adoptedTag: adopted, confidence: conf, reason })
}
fs.writeFileSync(path.join(D, 'pos-decisions.json'), JSON.stringify(decisions, null, 2))
// dictionary-evidence
fs.writeFileSync(path.join(D, 'dictionary-evidence.json'), JSON.stringify(decisions.map((d) => ({ id: d.id, headword: d.headword, sources: [{ source: d.language === 'english' ? 'Open English WordNet' : 'Kaikki Korean (Wiktextract)', headwordMatch: d.dict1Pos.length ? 'exact' : 'not_found', partsOfSpeech: d.dict1Pos }, { source: d.language === 'english' ? 'Kaikki English (Wiktextract) subset' : '(第2ソースなし)', headwordMatch: d.dict2Status, partsOfSpeech: d.dict2Pos, secondSourceStatus: d.dict2Status === 'not_checked' ? 'not_checked' : 'checked' }] })), null, 2))
// A-G
const cats = { A: [], B: [], C: [], D: [], E: [], F: [], G: [] }
for (const d of decisions) cats[d.category].push(d)
const names = { A: 'category-A-single-tag', B: 'category-B-multiple-tags', C: 'category-C-no-change', D: 'category-D-content-conflict', E: 'category-E-ambiguous', F: 'category-F-dictionary-conflict', G: 'category-G-insufficient' }
for (const [k, arr] of Object.entries(cats)) fs.writeFileSync(path.join(D, names[k] + '.json'), JSON.stringify(arr, null, 2))

const summary = {}; for (const d of decisions) summary[d.category] = (summary[d.category] || 0) + 1
console.log('第2ソース(Kaikki英語subset):', secondSourceAvail ? enSubset.size + '語' : '未取得')
console.log('分類:', summary, '合計', decisions.length, decisions.length === cs.length ? 'OK' : 'NG')
