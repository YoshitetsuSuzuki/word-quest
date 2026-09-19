import { useCallback, useEffect, useState } from 'react'
import { useGame } from '../../state/GameContext'
import type { FriendEntry } from './friendTypes'
import { generateFriendCode, NUDGE_COIN_RECEIVER, NUDGE_COIN_SENDER } from './friendLogic'
import { LocalFriendsBackend, type FriendsBackend, type MyProfile } from './friendBackend'
import { sanitizeName, DEFAULT_NAME } from './moderation'

const K = {
  userId: 'wordquest.friends.userId',
  code: 'wordquest.friends.code',
  name: 'wordquest.friends.name',
  joined: 'wordquest.friends.joined',
  nudged: 'wordquest.friends.nudgedToday', // `YYYY-MM-DD|id,id` 形式
}

function ls(k: string): string {
  try { return localStorage.getItem(k) ?? '' } catch { return '' }
}
function save(k: string, v: string): void {
  try { localStorage.setItem(k, v) } catch { /* 容量超過などは無視 */ }
}

/**
 * 差し替え可能なバックエンド。段階2で Supabase 実装を差す。
 * ここを1行変えるだけで画面側は無改修で切り替わる。
 */
let backend: FriendsBackend = new LocalFriendsBackend()
export function setFriendsBackend(b: FriendsBackend): void {
  backend = b
}

/** フレンド機能の状態と操作をまとめて返す */
export function useFriends() {
  const { user, grantCoins } = useGame()
  const [myUserId] = useState(() => {
    const cur = ls(K.userId)
    if (cur) return cur
    const id = crypto.randomUUID()
    save(K.userId, id)
    return id
  })
  const [myFriendCode] = useState(() => {
    const cur = ls(K.code)
    if (cur) return cur
    const c = generateFriendCode()
    save(K.code, c)
    return c
  })
  const [displayName, setNameState] = useState(() => ls(K.name) || DEFAULT_NAME)
  const [joined, setJoined] = useState(() => ls(K.joined) === 'on')
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [pendingNudges, setPending] = useState<string[]>([])
  const [nudgedToday, setNudgedToday] = useState<string[]>(() => {
    const today = new Date().toLocaleDateString('sv-SE')
    const [day, ids] = ls(K.nudged).split('|')
    return day === today && ids ? ids.split(',').filter(Boolean) : []
  })

  const refresh = useCallback(async () => {
    if (!joined) return
    try {
      setFriends(await backend.listFriends())
      setPending((await backend.pendingNudges()).fromNames)
    } catch {
      // 通信不可でも画面は出したままにする（ローカルの値で表示を続ける）
    }
  }, [joined])

  useEffect(() => { void refresh() }, [refresh])

  const setDisplayName = useCallback((raw: string) => {
    const n = sanitizeName(raw)
    setNameState(n)
    save(K.name, n)
  }, [])

  const join = useCallback(async (me: FriendEntry) => {
    const p: MyProfile = {
      userId: myUserId, displayName, friendCode: myFriendCode,
      streak: me.streak, weeklyWords: me.weeklyWords, lastStudyDate: me.lastStudyDate, category: me.category,
    }
    try {
      await backend.join(p)
      setJoined(true)
      save(K.joined, 'on')
      await refresh()
    } catch {
      // 失敗しても参加扱いにはしない（次回また押せる）
    }
  }, [myUserId, displayName, myFriendCode, refresh])

  const publish = useCallback(async (me: FriendEntry) => {
    try {
      await backend.publish({
        userId: myUserId, displayName, friendCode: myFriendCode,
        streak: me.streak, weeklyWords: me.weeklyWords, lastStudyDate: me.lastStudyDate, category: me.category,
      })
    } catch { /* 送信失敗は無視。次に開いたときに送る */ }
  }, [myUserId, displayName, myFriendCode])

  const lookup = useCallback(async (code: string) => {
    try { return await backend.lookupByCode(code) } catch { return null }
  }, [])

  const add = useCallback(async (fr: FriendEntry) => {
    try {
      await backend.addFriend(fr.userId)
      await refresh()
    } catch { /* 無視 */ }
  }, [refresh])

  const remove = useCallback(async (id: string) => {
    try {
      await backend.removeFriend(id)
      await refresh()
    } catch { /* 無視 */ }
  }, [refresh])

  const nudge = useCallback(async (toId: string, day: string) => {
    try { await backend.sendNudge(toId, day) } catch { /* 無視 */ }
    const next = [...nudgedToday, toId]
    setNudgedToday(next)
    save(K.nudged, `${day}|${next.join(',')}`)
    grantCoins(NUDGE_COIN_SENDER) // 送った側にも少し入る。声を掛け合う動機にするため
  }, [nudgedToday, grantCoins])

  const claim = useCallback(async () => {
    let n = 0
    try { n = await backend.claimNudges() } catch { return 0 }
    if (n > 0) {
      grantCoins(n * NUDGE_COIN_RECEIVER)
      setPending([])
    }
    return n
  }, [grantCoins])

  return {
    myUserId, myFriendCode, displayName, setDisplayName,
    joined, friends, pendingNudges, nudgedToday,
    join, publish, lookup, add, remove, nudge, claim, refresh,
    streak: user.studyStreak, weeklyWords: user.weeklyWords,
  }
}
