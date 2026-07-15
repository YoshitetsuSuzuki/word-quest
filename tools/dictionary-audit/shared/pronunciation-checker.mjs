// ============================================================================
// pronunciation-checker.mjs  発音照合
//   Wiktionary定義エンドポイントはIPAを含まないことが多いため、辞書にIPAが無ければ
//   not_checked を返す（未確認を確認済みにしない）。将来 Kaikki(ipaあり) 配置で強化可。
//   CC-CEDICT は拼音を持つため中国語のみ簡易照合可。
//   返り値: matched / different / missing / not_applicable / not_checked
// ============================================================================

function normPinyin(s) { return String(s || '').toLowerCase().replace(/[\s̀-ͯ]/g, '').replace(/[1-5]/g, '') }
function normIpa(s) { return String(s || '').replace(/[\/\[\]ˈˌ.\s]/g, '') }

export function checkPronunciation(entry, dictResult, hasPronunciation) {
  if (!hasPronunciation) return 'not_applicable'
  const dataP = entry.pronunciation
  if (dataP == null || dataP === '') return 'missing'
  if (!dictResult || !dictResult.found) return 'not_checked'
  // 辞書側IPA/拼音を集める
  const dictIpa = dictResult.entries.flatMap((e) => e.ipa || []).filter(Boolean)
  if (!dictIpa.length) return 'not_checked' // 辞書に発音情報なし→未確認
  // CC-CEDICT(拼音)なら拼音正規化比較、それ以外はIPA正規化比較
  if (dictResult.source === 'cedict') {
    const a = normPinyin(dataP)
    return dictIpa.some((d) => normPinyin(d) === a) ? 'matched' : 'different'
  }
  const a = normIpa(dataP)
  return dictIpa.some((d) => normIpa(d) === a) ? 'matched' : 'different'
}
