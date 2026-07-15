// ============================================================================
// normalizers/kaikki.mjs  Kaikki/Wiktextract JSONL → 共通正規化形式（将来用スタブ）
//   本環境ではKaikki英語(3.19GB)を取得しないため未使用。ローカル配置時に有効化。
//   Kaikki各行: {word, pos, senses:[{glosses:[]}], sounds:[{ipa}], forms:[]}
// ============================================================================
export function normalizeKaikki(jsonlText, sourceVersion, lang) {
  const out = []
  for (const line of jsonlText.split('\n')) {
    if (!line.trim()) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const glossesEn = (e.senses || []).flatMap((s) => s.glosses || [])
    out.push({
      language: lang || (e.lang_code || ''),
      headword: e.word,
      normalizedHeadword: String(e.word || '').toLowerCase(),
      partsOfSpeech: e.pos ? [e.pos] : [],
      senses: glossesEn.map((g) => ({ glossesEn: [g], glossesJa: [], labels: [], region: null })),
      pronunciations: (e.sounds || []).filter((s) => s.ipa).map((s) => ({ ipa: s.ipa, system: 'IPA', region: null })),
      forms: (e.forms || []).map((f) => ({ form: f.form, script: null })),
      source: 'kaikki',
      sourceEntryId: '',
      sourceLicense: 'CC-BY-SA',
      sourceVersion: sourceVersion || '',
    })
  }
  return out
}
