// ============================================================================
// build-jmdict-index.mjs  JMdict(英日)から 日本語表記→英語gloss の索引を構築(照合専用)
//   出力: data/indexes/jmdict.index.json  { ja2en: {jaForm:[gloss...]}, en2ja: {glossWord:[jaForm...]} }
//   元データ非改変。辞書本文は照合用途のみ・アプリへ非転載。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const xmlPath = path.join(here, 'data', 'raw', 'jmdict_e.xml')
const outPath = path.join(here, 'data', 'indexes', 'jmdict.index.json')
const xml = fs.readFileSync(xmlPath, 'utf8')

const ja2en = Object.create(null) // jaForm(接頭#) -> Set(gloss)
const en2ja = Object.create(null) // glossWord(接頭#) -> Set(jaForm)
const addJa = (form, gloss) => { if (!form) return; const k = '#' + form; (ja2en[k] || (ja2en[k] = new Set())).add(gloss) }
const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'and', 'or', 'in', 'on', 'with', 'for', 'that', 'as', 'be', 'by', 'esp', 'e.g', 'etc'])
const glossTokens = (g) => g.toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w))

const entryRe = /<entry>([\s\S]*?)<\/entry>/g
let m, n = 0
while ((m = entryRe.exec(xml))) {
  const body = m[1]
  const forms = []
  let km; const kRe = /<keb>([^<]+)<\/keb>/g; while ((km = kRe.exec(body))) forms.push(km[1])
  const rRe = /<reb>([^<]+)<\/reb>/g; while ((km = rRe.exec(body))) forms.push(km[1])
  const glosses = []
  const gRe = /<gloss(?:\s[^>]*)?>([^<]+)<\/gloss>/g; while ((km = gRe.exec(body))) glosses.push(km[1])
  if (!forms.length || !glosses.length) continue
  for (const f of forms) for (const g of glosses) addJa(f, g)
  // en2ja: gloss語 -> jaForm(代表: 最初のkanjiまたはreading)
  const rep = forms
  for (const g of glosses) for (const w of glossTokens(g)) { const k = '#' + w; const s = en2ja[k] || (en2ja[k] = new Set()); for (const f of rep) s.add(f) }
  n++
}
// シリアライズ(Set->Array・件数上限で肥大化を抑制)
const ja2enO = {}; for (const k of Object.keys(ja2en)) ja2enO[k] = [...ja2en[k]]
const en2jaO = {}; for (const k of Object.keys(en2ja)) en2jaO[k] = [...en2ja[k]]
fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify({ builtAt: '2026-07-16', source: 'JMdict (EDRDG, CC-BY-SA 4.0)', entries: n, ja2en: ja2enO, en2ja: en2jaO }))
console.log('JMdict索引構築:', n, 'entry / jaForm', Object.keys(ja2enO).length, '/ glossWord', Object.keys(en2jaO).length, '→', (fs.statSync(outPath).size / 1048576).toFixed(1) + 'MB')
