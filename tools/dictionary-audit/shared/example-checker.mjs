// ============================================================================
// example-checker.mjs  例文の簡易QA（ヒューリスティック・安全性は厳格）
//   grammar/sense/translation はヒューリスティック(完全な構文解析ではない旨を明示)。
//   safety(不適切表現) は禁止語リストで厳格判定。
//   返り値: { grammar, sense, translation, safety, overall } または 'not_applicable'
// ============================================================================

// 不適切表現(差別/侮蔑/性的/暴力/犯罪連想の代表語)。照合対象は例文英文＋和訳。
const UNSAFE = [
  'slant-eyed', 'nigger', 'faggot', 'retard', 'chink', 'spic',
  '気違い', 'きちがい', 'めくら', 'つんぼ', 'お尻，女性器',
  'erection', 'sexual', 'porn', 'slut',
]

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
  // 安全性(厳格)
  const blob = (text + ' ' + translation).toLowerCase()
  const unsafe = UNSAFE.some((u) => blob.includes(u.toLowerCase()))
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
