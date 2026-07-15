// ============================================================================
// example-checker.mjs  例文の簡易QA（ヒューリスティック・安全性は厳格）
//   grammar/sense/translation はヒューリスティック(完全な構文解析ではない旨を明示)。
//   safety(不適切表現) は禁止語リストで厳格判定。
//   返り値: { grammar, sense, translation, safety, overall } または 'not_applicable'
// ============================================================================

// 不適切表現。英語は単語境界一致(部分文字列の誤検知回避: spice/erection/sexual等を巻き込まない)。
// 日本語は語として一致。曖昧・教育文脈で正当な語(erection建設義/sexual教育義/spice)は含めない。
const UNSAFE_EN = ['slant-eyed', 'nigger', 'faggot', 'retard', 'chink', 'slut', 'whore']
const UNSAFE_JA = ['気違い', 'きちがい', 'めくら', 'つんぼ', 'お尻，女性器']
function isUnsafe(text, translation) {
  const en = (text || '').toLowerCase()
  for (const w of UNSAFE_EN) { const re = new RegExp('\\b' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'); if (re.test(en)) return true }
  const blob = (text || '') + ' ' + (translation || '')
  for (const w of UNSAFE_JA) if (blob.includes(w)) return true
  return false
}

function splitExample(ex) {
  const s = String(ex || '')
  const i = s.indexOf(' — ')
  return { text: i >= 0 ? s.slice(0, i).trim() : s.trim(), translation: i >= 0 ? s.slice(i + 3).trim() : '' }
}
function wordForms(hw) {
  const w = hw.toLowerCase()
  return [w, w + 's', w + 'es', w + 'ed', w + 'ing', w + 'd', w.replace(/y$/, 'ies')]
}

// 6) 例文
export function checkExample(entry, headword, hasExample, exampleForm) {
  if (!hasExample) return 'not_applicable'
  const ex = entry.example
  if (ex == null || ex === '') return { grammar: 'missing', sense: 'missing', translation: 'missing', safety: 'safe', overall: 'missing' }
  const { text, translation } = splitExample(ex)
  // 安全性(単語境界で厳格・誤検知回避)
  const unsafe = isUnsafe(text, translation)
  const safety = unsafe ? 'unsafe' : 'safe'
  // 文法(簡易): 大文字始まり・終端句読点・語数5〜20の目安
  const wc = text.split(/\s+/).filter(Boolean).length
  const grammar = (/^[A-Z"'"]/.test(text) && /[.!?"'"]$/.test(text) && wc >= 3 && wc <= 20) ? 'grammar_ok' : 'grammar_review'
  // 語義(簡易): 見出し語(またはexampleForm/活用形)が例文に現れるか
  const forms = new Set([...(exampleForm ? [String(exampleForm).toLowerCase()] : []), ...wordForms(headword)])
  const lowText = text.toLowerCase()
  const senseOk = [...forms].some((f) => f && new RegExp('\\b' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(lowText))
  const sense = senseOk ? 'sense_ok' : 'sense_review'
  // 例文訳(簡易): 和訳が存在し空でない
  const translationStatus = translation ? 'translation_ok' : 'translation_missing'
  const overall = unsafe ? 'unsafe' : (grammar === 'grammar_ok' && sense === 'sense_ok' && translationStatus === 'translation_ok') ? 'ok' : 'review'
  return { grammar, sense, translation: translationStatus, safety, overall, _heuristic: true }
}
