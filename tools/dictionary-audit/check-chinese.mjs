// ============================================================================
// check-chinese.mjs  中国語の外部辞書照合(試作・元データ非改変)
//   出典: CC-CEDICT (mdbg.net / CC-BY-SA)。ローカルの cedict_ts.u8 を照合に使用。
//   大容量ファイルは自動DLしない。未取得なら全件 not_checked＋DL手順を表示。
//   status: matched / partially_matched / not_found / conflicting / not_checked
// 出力: audit/dictionary-check/chinese-results.json
// ※本試作の32件スコープに中国語対象は無い（デモ語のみ）。
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const targets = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'dictionary-audit', 'chinese-targets.json'), 'utf8'))
const outDir = path.join(root, 'audit', 'dictionary-check')
fs.mkdirSync(outDir, { recursive: true })
const cedictPath = path.join(root, 'tools', 'dictionary-audit', 'cedict_ts.u8')

const DL = 'curl -L -o tools/dictionary-audit/cedict_1_0_ts_utf-8_mdbg.txt.gz "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz" && gunzip -k cedict_1_0_ts_utf-8_mdbg.txt.gz  # ※~4MB。ライセンス(CC-BY-SA)確認後に実行'

if (!fs.existsSync(cedictPath)) {
  const results = targets.map((t) => ({ ...t, source: 'CC-CEDICT (未取得)', status: 'not_checked', note: 'ローカルにCC-CEDICT無し。下記DL後に再実行。辞書に無い=誤りではない。' }))
  fs.writeFileSync(path.join(outDir, 'chinese-results.json'), JSON.stringify({ note: 'CC-CEDICT未取得のため全件 not_checked。32件スコープに中国語対象は無く、これは試作デモ。', downloadCommand: DL, results }, null, 2))
  console.log('中国語辞書照合: CC-CEDICT未取得 → 全', targets.length, '語 not_checked')
  console.log('DL手順(要ライセンス確認・自動DLしない):\n  ' + DL)
  process.exit(0)
}

// CC-CEDICT行例: 圈 圈 [quan1] /circle/ring/loop/
const dict = new Map()
for (const line of fs.readFileSync(cedictPath, 'utf8').split(/\n/)) {
  if (line.startsWith('#') || !line.trim()) continue
  const m = line.match(/^(\S+)\s+(\S+)\s+\[([^\]]*)\]\s+\/(.*)\/\s*$/)
  if (!m) continue
  const [, trad, simp, pinyin, glosses] = m
  const rec = { pinyin, glosses: glosses.split('/').filter(Boolean) }
  dict.set(simp, rec); dict.set(trad, rec)
}
const results = targets.map((t) => {
  const d = dict.get(t.word)
  if (!d) return { ...t, source: 'CC-CEDICT', status: 'not_found', note: '見出しなし(誤りとは限らない)' }
  return { ...t, source: 'CC-CEDICT', status: 'matched', dictPinyin: d.pinyin, dictGlosses: d.glosses.slice(0, 5), note: '照合のみ・元データ非改変' }
})
fs.writeFileSync(path.join(outDir, 'chinese-results.json'), JSON.stringify({ results }, null, 2))
const st = {}; for (const r of results) st[r.status] = (st[r.status] || 0) + 1
console.log('中国語辞書照合:', results.length, '語 →', JSON.stringify(st))
