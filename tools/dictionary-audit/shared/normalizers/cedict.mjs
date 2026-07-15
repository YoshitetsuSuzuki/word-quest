// ============================================================================
// normalizers/cedict.mjs  CC-CEDICT → 共通正規化形式（照合専用）
//   CC-CEDICT行: 繁 簡 [pin1 yin1] /gloss1/gloss2/
//   簡体字・繁体字を混同しない（headword=簡体字、forms に繁体字）。拼音は pronunciations。
//   辞書に無い情報は生成しない（POSは空・和訳は空）。
// ============================================================================
export function normalizeCedict(rawText, sourceVersion) {
  const out = []
  for (const line of rawText.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/)
    if (!m) continue
    const [, trad, simp, pinyin, glossStr] = m
    const glossesEn = glossStr.split('/').filter(Boolean)
    out.push({
      language: 'zh',
      headword: simp,
      normalizedHeadword: simp, // 漢字はケース/アクセントなし。簡繁は別扱い
      script: 'simplified',
      partsOfSpeech: [], // CC-CEDICTは品詞を持たない
      senses: [{ glossesEn, glossesJa: [], labels: [], region: null }],
      pronunciations: [{ ipa: pinyin, system: 'pinyin', region: null }],
      forms: trad !== simp ? [{ form: trad, script: 'traditional' }] : [],
      source: 'cedict',
      sourceEntryId: '',
      sourceLicense: 'CC-BY-SA 4.0',
      sourceVersion: sourceVersion || '',
    })
  }
  return out
}
