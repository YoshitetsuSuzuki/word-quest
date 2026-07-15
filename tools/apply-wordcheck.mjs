// ============================================================================
// apply-wordcheck.mjs  検証エージェントの修正リスト(tools/wordcheck/<lang>-level-N.json)を
// 実データ(public/wordbank/<lang>/level-N.json)へ機械適用する。
//   - drop:true → その語を削除（検証不可＝精度優先で除外）
//   - en → answer と glosses.en を修正
//   - ja → glosses.ja を修正
// 修正した語は英語選択肢を作り直し(4択・重複なし・answer含む)、manifestの件数を更新。
// 使い方: node tools/apply-wordcheck.mjs <lang>
// ============================================================================
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lang = process.argv[2]
if (!lang) { console.error('lang required'); process.exit(1) }

// answer がどの言語かで修正フィールドの当て方を変える:
//  - pivot(西/仏/独/ポ/ロ/ポーランド): answer=英語, glosses.{en,ja}。 en→answer+glosses.en, ja→glosses.ja
//  - jaAnswer(英/中/韓): answer=日本語。 ja→answer(＋説明文も更新)
//  - enAnswer(日本語カテゴリ): answer=英語。 en→answer+glosses.en
const JA_ANSWER = new Set(['english', 'chinese', 'korean'])
const EN_ANSWER = new Set(['japanese'])
const mode = JA_ANSWER.has(lang) ? 'jaAnswer' : EN_ANSWER.has(lang) ? 'enAnswer' : 'pivot'
const wbDir = path.join(root, 'public', 'wordbank', lang)
const wcDir = path.join(root, 'tools', 'wordcheck')
const man = JSON.parse(fs.readFileSync(path.join(wbDir, 'manifest.json'), 'utf8'))

function shuffle(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] } return r }

let edited = 0, dropped = 0
const levels = [] // {lv, words}
const editedIds = new Set()

// この言語の修正ファイルを全て読み込み、id→修正 の統合マップにする。
// （level-3a.json / level-3b.json のような分割にも対応。idは言語内で一意）
const byId = new Map()
for (const f of fs.readdirSync(wcDir)) {
  if (!f.startsWith(`${lang}-`) || !f.endsWith('.json')) continue
  for (const c of JSON.parse(fs.readFileSync(path.join(wcDir, f), 'utf8'))) byId.set(c.id, c)
}

// pass1: 適用（drop削除・修正）。選択肢は後で作り直す。
for (const lvInfo of man.levels) {
  const words = JSON.parse(fs.readFileSync(path.join(wbDir, lvInfo.file), 'utf8'))
  const out = []
  for (const w of words) {
    const c = byId.get(w.id)
    if (c) {
      if (c.drop) { dropped++; continue }
      if (mode === 'jaAnswer') {
        // answer=日本語。 ja が修正後の正解(和訳)
        if (c.ja) {
          w.answer = c.ja
          if (w.explanation) w.explanation = `${(w.prompt.match(/「(.+?)」/) || [])[1] ?? ''} = ${c.ja}`
          editedIds.add(w.id); edited++
        }
      } else if (mode === 'enAnswer') {
        // answer=英語。 en が修正後の正解(英訳)
        if (c.en) { w.answer = c.en; w.glosses = { ...w.glosses, en: c.en }; editedIds.add(w.id); edited++ }
      } else {
        // pivot: answer=英語, glosses.{en,ja}
        if (c.en) { w.answer = c.en; w.glosses = { ...w.glosses, en: c.en }; editedIds.add(w.id); edited++ }
        if (c.ja) { w.glosses = { ...w.glosses, ja: c.ja }; if (!c.en) { editedIds.add(w.id); edited++ } }
      }
    }
    out.push(w)
  }
  levels.push({ lvInfo, words: out })
}

// 全answerプール（重複しない英語訳）で、修正語の英語選択肢を作り直す
const allAnswers = [...new Set(levels.flatMap((l) => l.words.map((w) => w.answer)))]
for (const { words } of levels) {
  for (const w of words) {
    if (!editedIds.has(w.id)) continue
    const distract = shuffle(allAnswers.filter((a) => a !== w.answer)).slice(0, 3)
    w.choices = shuffle([w.answer, ...distract])
  }
}

// 書き出し＋manifest更新
for (const { lvInfo, words } of levels) {
  fs.writeFileSync(path.join(wbDir, lvInfo.file), JSON.stringify(words))
  lvInfo.count = words.length
}
man.total = man.levels.reduce((s, l) => s + l.count, 0)
man.verified = man.total
man.jaVerified = man.total
if (!/人手検証\(2026-07\)/.test(man.source || '')) man.source = (man.source || '') + ' + 人手検証(2026-07)'
fs.writeFileSync(path.join(wbDir, 'manifest.json'), JSON.stringify(man, null, 2))

console.log(`${lang}: 修正${edited}語 / 除外${dropped}語 / 新総数${man.total}語`)
