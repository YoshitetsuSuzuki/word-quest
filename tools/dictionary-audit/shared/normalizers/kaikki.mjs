// ============================================================================
// normalizers/kaikki.mjs  Kaikki/Wiktextract JSONL → 共通正規化形式
//   Kaikki各行: {word, pos, senses:[{glosses:[]}], sounds:[{ipa}], forms:[], lang_code}
//   targeted抽出済み(アプリ見出し語一致行)の小さなJSONLを想定。
//   Kaikkiのpos略記を共通品詞名へ正規化(公平な品詞比較のため)。辞書に無い情報は生成しない。
// ============================================================================
const KPOS = {
  noun: 'noun', verb: 'verb', adj: 'adjective', adv: 'adverb', pron: 'pronoun',
  intj: 'interjection', prep: 'preposition', postp: 'adposition', conj: 'conjunction',
  num: 'numeral', name: 'proper noun', det: 'determiner', article: 'article',
  particle: 'particle', phrase: 'phrase', proverb: 'phrase', prep_phrase: 'phrase',
  character: 'character', classifier: 'classifier', suffix: 'affix', prefix: 'affix',
  contraction: 'contraction', romanization: 'romanization', abbrev: 'abbreviation',
}
export function normalizeKaikki(jsonlText, sourceVersion, lang) {
  const out = []
  for (const line of jsonlText.split('\n')) {
    if (!line.trim()) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const glossesEn = (e.senses || []).flatMap((s) => s.glosses || [])
    const pos = e.pos ? (KPOS[e.pos] || e.pos) : null
    out.push({
      language: lang || (e.lang_code || ''),
      headword: e.word,
      normalizedHeadword: String(e.word || '').toLowerCase(),
      partsOfSpeech: pos ? [pos] : [],
      senses: glossesEn.map((g) => ({ glossesEn: [g], glossesJa: [], labels: [], region: null })),
      pronunciations: (e.sounds || []).filter((s) => s.ipa).map((s) => ({ ipa: s.ipa, system: 'IPA', region: null })),
      forms: (e.forms || []).map((f) => ({ form: f.form, script: f.tags ? (f.tags.join(',')) : null })),
      source: 'kaikki',
      sourceEntryId: '',
      sourceLicense: 'CC-BY-SA + GFDL',
      sourceVersion: sourceVersion || '',
    })
  }
  return out
}
