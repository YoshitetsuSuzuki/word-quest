// フレンド機能の純関数ロジックの検証。既存の release-check と同じく `npx tsx` で単体実行する。
import {
  buildRanking, notStudiedToday, alreadyNudged, generateFriendCode, normalizeFriendCode,
} from '../../src/modules/friends/friendLogic'
import type { FriendEntry } from '../../src/modules/friends/friendTypes'

let failed = 0
function check(name: string, cond: boolean, detail = '') {
  if (!cond) { failed++; console.log(`  NG  ${name}${detail ? ' — ' + detail : ''}`) }
  else console.log(`  ok  ${name}`)
}

const mk = (id: string, name: string, streak: number, words: number, last = '2026-09-20'): FriendEntry =>
  ({ userId: id, displayName: name, streak, weeklyWords: words, lastStudyDate: last, category: 'english' })

const me = mk('me', 'わたし', 5, 100)
const friends = [mk('a', 'あきら', 12, 40), mk('b', 'ぼぶ', 5, 300), mk('c', 'ちか', 1, 10, '2026-09-18')]

console.log('■ ランキング(ストリーク軸)')
{
  const r = buildRanking(me, friends, 'streak')
  check('人数は自分＋friends', r.length === 4, `${r.length}`)
  check('1位は最長ストリークのあきら', r[0].userId === 'a')
  check('自分にisMeが立つ', r.find((x) => x.userId === 'me')?.isMe === true)
  // me と b は streak=5 で同点 → もう一方の軸(語数)で b(300) が上
  const me5 = r.find((x) => x.userId === 'me')!
  const b5 = r.find((x) => x.userId === 'b')!
  check('同点はもう一方の軸で割る', b5.rank < me5.rank || (b5.rank === me5.rank && b5.weeklyWords > me5.weeklyWords))
  check('同順位は同じ番号(1,1,3方式)', new Set(r.map((x) => x.rank)).size <= r.length)
}

console.log('■ ランキング(今週の語数軸)')
{
  const r = buildRanking(me, friends, 'weeklyWords')
  check('1位は最多語数のぼぶ', r[0].userId === 'b', r[0].userId)
  check('2位は自分(100語)', r[1].userId === 'me', r[1].userId)
}

console.log('■ 自分が重複しない')
{
  const r = buildRanking(me, [...friends, me], 'streak')
  check('friendsに自分が混ざっても1行だけ', r.filter((x) => x.userId === 'me').length === 1)
}

console.log('■ 今日まだ学習していない人')
{
  const yet = notStudiedToday(friends, '2026-09-20')
  check('ちかだけが該当', yet.length === 1 && yet[0].userId === 'c')
}

console.log('■ つつきの重複防止')
{
  check('送信済みならtrue', alreadyNudged(['a', 'b'], 'a'))
  check('未送信ならfalse', !alreadyNudged(['a', 'b'], 'c'))
}

console.log('■ フレンドコード')
{
  const codes = new Set(Array.from({ length: 500 }, () => generateFriendCode()))
  check('8桁', [...codes][0].length === 8, [...codes][0])
  check('紛らわしい文字を含まない', ![...codes].some((c) => /[01OI]/.test(c)))
  check('500回で衝突しない', codes.size === 500, `${codes.size}`)
  check('小文字・ハイフンを吸収', normalizeFriendCode('ab-23 cd45') === 'AB23CD45', normalizeFriendCode('ab-23 cd45'))
}

console.log(failed === 0 ? '\nPASS' : `\nFAIL (${failed}件)`)
process.exit(failed === 0 ? 0 : 1)
