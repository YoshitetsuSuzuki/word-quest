// ============================================================================
// gloss-checker.mjs  英語グロス・日本語訳の照合
//   英語: データの英語義(answer or glosses.en) を辞書の英語定義群と比較。
//   日本語: 英語系辞書のため直接検証不可 → 既定 not_checked（捏造しない）。
//           将来 JA辞書を配置した場合のフックのみ用意。
// ============================================================================

function tokens(s) {
  return String(s || '').toLowerCase().replace(/[()[\]{}.,;:!?"'/\\-]/g, ' ').split(/\s+/).filter((w) => w.length > 1)
}
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'that', 'is', 'as', 'by', 'an'])

// 3) 英語グロス: exact / partial / different / not_applicable / not_checked
export function checkEnGloss(dataEn, dictResult) {
  if (dataEn == null || dataEn === '') return 'not_applicable'
  if (!dictResult || dictResult.status === 'not_checked' || !dictResult.found) return 'not_checked'
  const dataToks = new Set(tokens(dataEn).filter((w) => !STOP.has(w)))
  if (!dataToks.size) return 'not_checked'
  const dictBlob = dictResult.entries.flatMap((e) => e.glosses).join(' ; ').toLowerCase()
  const dictToks = new Set(tokens(dictBlob).filter((w) => !STOP.has(w)))
  // データ英語義の主要語が辞書定義に全て含まれる→exact、一部→partial、皆無→different
  const hit = [...dataToks].filter((w) => dictToks.has(w))
  // 完全一致フレーズも見る
  const phraseExact = dictResult.entries.some((e) => e.glosses.some((g) => tokens(g).join(' ').includes([...dataToks].join(' '))))
  if (phraseExact || (hit.length === dataToks.size)) return 'exact'
  if (hit.length) return 'partial'
  return 'different'
}

// 4) 日本語訳: exact / compatible / different / not_applicable / not_checked
//   jaSource(任意): 将来のJA辞書アダプタ。無ければ not_checked。
export function checkJaGloss(dataJa, jaSource /* 未配置なら null */) {
  if (dataJa == null || dataJa === '') return 'not_applicable'
  if (!jaSource) return 'not_checked' // JA辞書未配置。英語系辞書だけでは和訳を検証済みにしない(ルール4)
  // フック: jaSource.compare(dataJa) を実装したら exact/compatible/different を返す
  try { return jaSource.compare(dataJa) } catch { return 'not_checked' }
}
