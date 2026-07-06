import { ja } from '../src/i18n/ja'
import { en } from '../src/i18n/en'
const jk = Object.keys(ja).sort(), ek = Object.keys(en).sort()
const missingEn = jk.filter((k) => !(k in en))
const missingJa = ek.filter((k) => !(k in ja))
if (missingEn.length || missingJa.length) {
  console.error('KEY MISMATCH  missing in en:', missingEn, ' missing in ja:', missingJa)
  process.exit(1)
}
console.log('i18n keys OK:', jk.length)
