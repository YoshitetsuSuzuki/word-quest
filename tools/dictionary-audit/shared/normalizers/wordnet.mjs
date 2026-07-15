// ============================================================================
// normalizers/wordnet.mjs  Open English WordNet (WN-LMF XML) → 共通正規化形式
//   2パス: (1)Synset id→Definition の対応, (2)LexicalEntry(Lemma+POS+Sense→synset)
//   XMLは正規表現でストリーム的に走査(依存ゼロ)。辞書に無い情報は生成しない。
//   POS: n=noun v=verb a/s=adjective r=adverb
// ============================================================================
const POS = { n: 'noun', v: 'verb', a: 'adjective', s: 'adjective', r: 'adverb', c: 'conjunction', p: 'adposition', x: 'other', u: 'unknown' }

function decode(s) { return String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'") }

export function normalizeWordnet(xml, sourceVersion) {
  // (1) synset -> definition
  const synsetDef = new Map()
  const synRe = /<Synset\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/Synset>/g
  let sm
  while ((sm = synRe.exec(xml))) {
    const id = sm[1]
    const body = sm[2]
    const dm = body.match(/<Definition[^>]*>([\s\S]*?)<\/Definition>/)
    if (dm) synsetDef.set(id, decode(dm[1].trim()))
  }
  // (2) lexical entries
  const out = []
  const leRe = /<LexicalEntry\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/LexicalEntry>/g
  let lm
  while ((lm = leRe.exec(xml))) {
    const entryId = lm[1]
    const body = lm[2]
    const lemmaM = body.match(/<Lemma\b[^>]*\bwrittenForm="([^"]*)"[^>]*\bpartOfSpeech="([^"]*)"/) || body.match(/<Lemma\b[^>]*\bpartOfSpeech="([^"]*)"[^>]*\bwrittenForm="([^"]*)"/)
    if (!lemmaM) continue
    let written, posCode
    if (/writtenForm/.test(lemmaM[0].slice(0, 20)) || body.indexOf('writtenForm') < body.indexOf('partOfSpeech')) { written = lemmaM[1]; posCode = lemmaM[2] } else { posCode = lemmaM[1]; written = lemmaM[2] }
    written = decode(written)
    const pos = POS[posCode] || posCode
    const glossesEn = []
    const senseRe = /<Sense\b[^>]*\bsynset="([^"]+)"/g
    let ssm
    while ((ssm = senseRe.exec(body))) { const d = synsetDef.get(ssm[1]); if (d) glossesEn.push(d) }
    out.push({
      language: 'en',
      headword: written,
      normalizedHeadword: written.toLowerCase(),
      partsOfSpeech: pos ? [pos] : [],
      senses: glossesEn.map((g) => ({ glossesEn: [g], glossesJa: [], labels: [], region: null })),
      pronunciations: [], // OEWNは発音を基本持たない → 空(生成しない)
      forms: [],
      source: 'oewn',
      sourceEntryId: entryId,
      sourceLicense: 'CC-BY 4.0',
      sourceVersion: sourceVersion || '',
    })
  }
  return out
}
