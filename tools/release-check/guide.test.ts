// ============================================================================
// guide.test.ts  「はじめかた」ガイドの機械検査
//
// 中身の正しさ（事実誤認）は人手の監査でしか見られないが、
// 形式の壊れ・欠落・手抜きはここで止める。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { categories } from '../../src/data/categories'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const dir = path.join(root, 'public', 'guide')
let fail = 0
const ng = (msg: string) => {
  console.log(`  NG  ${msg}`)
  fail++
}

const LOCALES = ['ja', 'en'] as const
const nonEmpty = (v: unknown) => typeof v === 'string' && v.trim().length > 0

for (const c of categories) {
  const p = path.join(dir, `${c.id}.json`)
  if (!fs.existsSync(p)) {
    ng(`${c.id}: guide/${c.id}.json が無い`)
    continue
  }
  let g: Record<string, unknown>
  try {
    g = JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch (e) {
    ng(`${c.id}: JSON が壊れている (${(e as Error).message})`)
    continue
  }
  if (g.category !== c.id) ng(`${c.id}: category が "${String(g.category)}" になっている`)

  for (const loc of LOCALES) {
    const d = g[loc] as Record<string, never> | undefined
    if (!d) {
      ng(`${c.id}.${loc}: セクションごと無い`)
      continue
    }
    const where = `${c.id}.${loc}`
    if (!nonEmpty(d.tagline)) ng(`${where}: tagline が空`)

    const script = d.script as Record<string, never> | undefined
    if (!script) ng(`${where}: script が無い`)
    else {
      if (!nonEmpty(script.title)) ng(`${where}.script: title が空`)
      if (!nonEmpty(script.body)) ng(`${where}.script: body が空`)
      const b = script.build as Record<string, never> | undefined
      if (b && !(nonEmpty(b.parts) && nonEmpty(b.result) && nonEmpty(b.reading)))
        ng(`${where}.script.build: 欠けがある`)
    }

    const sounds = d.sounds as Record<string, never>[] | undefined
    if (!Array.isArray(sounds) || sounds.length < 2) ng(`${where}: sounds が2件未満`)
    else
      sounds.forEach((s, i) => {
        if (!nonEmpty(s.title) || !nonEmpty(s.body)) ng(`${where}.sounds[${i}]: title/body が空`)
      })

    const order = d.order as Record<string, never> | undefined
    if (!order) ng(`${where}: order が無い`)
    else {
      if (!nonEmpty(order.type) || !nonEmpty(order.title) || !nonEmpty(order.body))
        ng(`${where}.order: 欠けがある`)
      const s = order.sample as Record<string, never> | undefined
      if (!s || !(nonEmpty(s.text) && nonEmpty(s.reading) && nonEmpty(s.meaning)))
        ng(`${where}.order.sample: 欠けがある（画面が必ず参照する）`)
    }

    const gr = d.greetings as Record<string, never>[] | undefined
    if (!Array.isArray(gr) || gr.length < 3) ng(`${where}: greetings が3件未満`)
    else
      gr.forEach((s, i) => {
        if (!(nonEmpty(s.text) && nonEmpty(s.reading) && nonEmpty(s.meaning)))
          ng(`${where}.greetings[${i}]: 欠けがある`)
      })

    const pf = d.pitfall as Record<string, never> | undefined
    if (!pf || !nonEmpty(pf.title) || !nonEmpty(pf.body)) ng(`${where}: pitfall が欠けている`)
  }

  // ja と en で挨拶の「その言語での表記」が食い違っていないか（同じ事実のはず）
  const ja = (g.ja as { greetings?: { text: string }[] })?.greetings ?? []
  const en = (g.en as { greetings?: { text: string }[] })?.greetings ?? []
  // 「はい／いいえ」のような並記の区切り記号の差は無視して、原語表記そのものを比べる
  const norm = (x: { text: string }) => x.text.replace(/[／/・,、]/g, '/').replace(/\s+/g, '')
  if (ja.length && en.length && ja.map(norm).join('|') !== en.map(norm).join('|'))
    ng(`${c.id}: ja と en で greetings の原語表記が違う`)

  // 日本語版に発音記号(IPA)を書いていないか。読者は読めない
  const jaText = JSON.stringify(g.ja ?? {})
  // ç æ ø œ ß のように実際の正書法で使う字は除く（ç はフランス語・トルコ語・ポルトガル語の普通の文字）
  if (/[ɑɐɒɓʙɔɕɗɖðʤəɘɚɛɜɝɞɟʄɡɠɢʛɦɧɥʜɨɪʝɭɬɫɮʟɱɯɰŋɳɲɴɵɸɶʘɹɺɾɻʀʁɽʂʃʈʧʉʊʋⱱʌɣɤʍʎʏʑʐʒʔʡʕʢǀǁǂǃ]/.test(jaText))
    ng(`${c.id}.ja: 発音記号(IPA)が混ざっている。日本語版はカタカナで書く`)
}

console.log(fail === 0 ? '\nPASS' : `\nFAIL (${fail} 件)`)
process.exit(fail === 0 ? 0 : 1)
