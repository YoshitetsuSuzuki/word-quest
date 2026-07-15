// ============================================================================
// matcher.mjs  見出し語存在確認・品詞一致
// ============================================================================

// 1) 見出し語存在: matched / not_found / multiple_entries / not_checked
export function checkHeadword(dictResult) {
  if (!dictResult) return 'not_checked'
  if (dictResult.status === 'not_checked') return 'not_checked'
  if (!dictResult.found) return 'not_found'
  return dictResult.entries.length > 1 ? 'multiple_entries' : 'matched'
}

// 品詞の互換グループ（緩やかに互換とみなす）
const COMPAT = [
  ['noun', 'proper noun'],
  ['adjective', 'determiner', 'article'],
  ['verb', 'auxiliary'],
  ['adverb', 'particle'],
]
function compatible(a, b) {
  if (a === b) return true
  return COMPAT.some((g) => g.includes(a) && g.includes(b))
}

// 2) 品詞一致: exact / compatible / different / missing / not_checked
//   dataPos: データ側の正規化POS(なければ null)。dictResult.entries[].pos と比較。
export function checkPos(dataPos, dictResult) {
  if (!dictResult || dictResult.status === 'not_checked' || !dictResult.found) return 'not_checked'
  const dictPos = [...new Set(dictResult.entries.map((e) => e.pos).filter(Boolean))]
  if (!dataPos) return 'missing' // データ側に品詞がない(pivotのword等)
  if (!dictPos.length) return 'not_checked'
  if (dictPos.includes(dataPos)) return 'exact'
  if (dictPos.some((p) => compatible(dataPos, p))) return 'compatible'
  return 'different'
}
