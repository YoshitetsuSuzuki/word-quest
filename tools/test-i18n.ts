import { ja } from '../src/i18n/ja'
import { en } from '../src/i18n/en'
import { QuestionEngine } from '../src/core/QuestionEngine'
const jk = Object.keys(ja).sort(), ek = Object.keys(en).sort()
const missingEn = jk.filter((k) => !(k in en))
const missingJa = ek.filter((k) => !(k in ja))
if (missingEn.length || missingJa.length) {
  console.error('KEY MISMATCH  missing in en:', missingEn, ' missing in ja:', missingJa)
  process.exit(1)
}
console.log('i18n keys OK:', jk.length)

// 後方互換: glosses/exampleTranslations が無い時 ja は answer/従来訳
const fakeRepo = { getByCategory: () => [], getById: () => undefined } as any
const eng = new QuestionEngine(fakeRepo)
const q: any = { id: 'x', category: 'english', prompt: '', answer: '走る', choices: [], difficulty: 1, tags: [], example: 'I run. — 走る。' }
if (eng.localizedGloss(q, 'ja') !== '走る') { console.error('FAIL gloss ja'); process.exit(1) }
if (eng.localizedGloss(q, 'en') !== '走る') { console.error('FAIL gloss en fallback'); process.exit(1) }
if (eng.localizedExample(q, 'ja').translation !== '走る。') { console.error('FAIL ex ja'); process.exit(1) }
console.log('QuestionEngine locale fallback OK')
