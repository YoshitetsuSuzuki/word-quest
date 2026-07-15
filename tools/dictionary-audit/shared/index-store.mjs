// ============================================================================
// index-store.mjs  正規化辞書の検索インデックス（Mapシリアライズ方式・依存ゼロ）
//   方式選定理由: SQLite等の外部依存を避け、再現可能でO(1)検索。10万語規模でも
//   インメモリMap(~数百MB)で十分。processed/<src>.jsonl から index を構築し
//   indexes/<src>.index.json に保存 → 実行時はJSON読込のみ(線形走査しない)。
//   区別する一致種別のためのキー:
//     - headword(原表記/大小文字保持)  → exact / case
//     - normNoCase(小文字)             → case_mismatch
//     - normNoDiacritic(アクセント除去) → diacritic_mismatch
//     - variant(簡繁/ё→е)             → variant_match
//   中国語: 簡体字headword＋繁体字variant。韓国語: ハングルとローマ字は同一視しない。
//   ロシア語: ё/е をvariantで橋渡し(設定可)。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const auditRoot = path.resolve(here, '..')
const processedDir = path.join(auditRoot, 'data', 'processed')
const indexDir = path.join(auditRoot, 'data', 'indexes')

export function stripDiacritics(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '') }
export function variantKey(s, lang) {
  let v = String(s || '')
  if (lang === 'ru') v = v.replace(/ё/g, 'е').replace(/Ё/g, 'Е')
  return v.toLowerCase()
}

export function buildIndex(sourceKey) {
  const src = path.join(processedDir, sourceKey + '.jsonl')
  if (!fs.existsSync(src)) throw new Error('processed未生成: ' + sourceKey)
  const entries = []
  const headword = Object.create(null), normNoCase = Object.create(null), normNoDiac = Object.create(null), variant = Object.create(null)
  // キー衝突(__proto__/constructor等の語)回避のため接頭辞'#'を付与
  const push = (map, key, idx) => { if (!key && key !== '') return; const k = '#' + key; if (!(k in map)) map[k] = []; map[k].push(idx) }
  let lang = ''
  for (const line of fs.readFileSync(src, 'utf8').split('\n')) {
    if (!line.trim()) continue
    let e; try { e = JSON.parse(line) } catch { continue }
    const idx = entries.length
    entries.push(e); lang = e.language
    push(headword, e.headword, idx)
    push(normNoCase, String(e.headword).toLowerCase(), idx)
    push(normNoDiac, stripDiacritics(String(e.headword).toLowerCase()), idx)
    push(variant, variantKey(e.headword, e.language), idx)
    for (const f of e.forms || []) { push(headword, f.form, idx); push(variant, variantKey(f.form, e.language), idx) }
  }
  fs.mkdirSync(indexDir, { recursive: true })
  const index = { sourceKey, language: lang, count: entries.length, builtAt: new Date().toISOString(), entries, keys: { headword, normNoCase, normNoDiac, variant } }
  fs.writeFileSync(path.join(indexDir, sourceKey + '.index.json'), JSON.stringify(index))
  return { count: entries.length, language: lang }
}

export function loadIndex(sourceKey) {
  const p = path.join(indexDir, sourceKey + '.index.json')
  if (!fs.existsSync(p)) return null
  const ix = JSON.parse(fs.readFileSync(p, 'utf8'))
  const has = (map, key) => Object.prototype.hasOwnProperty.call(map, '#' + key)
  const get = (map, key) => (map['#' + key] || []).map((i) => ix.entries[i])
  return {
    sourceKey, language: ix.language, count: ix.count,
    // 一致種別を区別して返す
    lookup(word) {
      if (has(ix.keys.headword, word)) return { found: true, matchType: 'exact', entries: get(ix.keys.headword, word) }
      const lc = String(word).toLowerCase()
      if (has(ix.keys.normNoCase, lc)) return { found: true, matchType: 'case_mismatch', entries: get(ix.keys.normNoCase, lc) }
      const nd = stripDiacritics(lc)
      if (has(ix.keys.normNoDiac, nd)) return { found: true, matchType: 'diacritic_mismatch', entries: get(ix.keys.normNoDiac, nd) }
      const vk = variantKey(word, ix.language)
      if (has(ix.keys.variant, vk)) return { found: true, matchType: 'variant_match', entries: get(ix.keys.variant, vk) }
      return { found: false, matchType: 'not_found', entries: [] }
    },
  }
}
