import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { useNav } from '../../state/nav'
import { buildRanking, notStudiedToday, normalizeFriendCode, NUDGE_COIN_RECEIVER } from './friendLogic'
import type { FriendEntry, RankAxis } from './friendTypes'
import { useFriends } from './useFriends'
import { hiddenIds, reportMailUrl, sanitizeName, toggleHidden, NAME_MAX } from './moderation'

const AXES: { axis: RankAxis; label: string; icon: string }[] = [
  { axis: 'streak', label: '連続日数', icon: '🔥' },
  { axis: 'weeklyWords', label: '今週の語数', icon: '📚' },
]

/**
 * フレンド画面。ランキング / 一覧 / 自分のコード の3ブロック。
 * サーバー未接続でも落ちないよう、フレンドが0人の状態を正規の表示として扱う。
 */
export function FriendsPanel() {
  const { user } = useGame()
  const { category } = useNav()
  const f = useFriends()
  const [axis, setAxis] = useState<RankAxis>('streak')
  const [codeInput, setCodeInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [hidden, setHidden] = useState<Set<string>>(() => hiddenIds())
  const [msg, setMsg] = useState('')

  const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD（ローカル日付）

  const me: FriendEntry = useMemo(
    () => ({
      userId: f.myUserId,
      displayName: f.displayName,
      streak: user.studyStreak,
      weeklyWords: user.weeklyWords,
      lastStudyDate: user.lastStudyDate,
      category,
    }),
    [f.myUserId, f.displayName, user.studyStreak, user.weeklyWords, user.lastStudyDate, category],
  )

  const visibleFriends = useMemo(() => f.friends.filter((x) => !hidden.has(x.userId)), [f.friends, hidden])
  const rows = useMemo(() => buildRanking(me, visibleFriends, axis), [me, visibleFriends, axis])
  const slacking = useMemo(() => notStudiedToday(visibleFriends, today), [visibleFriends, today])

  // 画面を開いたときに自分の最新値を送る。学習のたびに送ると通信が増えるため。
  useEffect(() => {
    if (f.joined) void f.publish(me)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.joined, me.streak, me.weeklyWords])

  const flash = useCallback((m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 2200)
  }, [])

  const onAdd = async () => {
    const code = normalizeFriendCode(codeInput)
    if (code.length !== 8) return flash('コードは8文字です')
    if (code === f.myFriendCode) return flash('自分のコードです')
    const found = await f.lookup(code)
    if (!found) return flash('見つかりませんでした')
    await f.add(found)
    setCodeInput('')
    flash(`${found.displayName} を追加しました`)
  }

  const onNudge = async (fr: FriendEntry) => {
    await f.nudge(fr.userId, today)
    flash(`${fr.displayName} をつつきました`)
  }

  const onClaim = async () => {
    const n = await f.claim()
    if (n > 0) flash(`${n * NUDGE_COIN_RECEIVER} コインを受け取りました`)
  }

  const onSaveName = () => {
    f.setDisplayName(sanitizeName(nameInput))
    setEditingName(false)
  }

  return (
    <div className="space-y-4">
      {/* --- つつき受信箱 --- */}
      {f.pendingNudges.length > 0 && (
        <button onClick={onClaim} className="card p-3 w-full text-left bg-accent/20 ring-1 ring-accent">
          <div className="text-sm font-bold">
            👋 {f.pendingNudges.slice(0, 3).join('・')}
            {f.pendingNudges.length > 3 ? ` 他${f.pendingNudges.length - 3}人` : ''} がつついています
          </div>
          <div className="text-xs text-white/60 mt-0.5">
            タップして {f.pendingNudges.length * NUDGE_COIN_RECEIVER} コインを受け取る
          </div>
        </button>
      )}

      {/* --- 今週のランキング --- */}
      <div>
        <div className="flex gap-1.5 mb-2">
          {AXES.map((a) => (
            <button
              key={a.axis}
              onClick={() => setAxis(a.axis)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                axis === a.axis ? 'bg-accent text-white' : 'bg-panel2 text-white/50'
              }`}
            >
              {a.icon} {a.label}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.userId}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                r.isMe ? 'bg-accent/25 ring-1 ring-accent' : 'bg-panel'
              }`}
            >
              <div className={`w-7 text-center font-black ${r.rank <= 3 ? 'text-gold' : 'text-white/40'}`}>
                {r.rank}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">
                  {r.displayName || 'ななしさん'}
                  {r.isMe && <span className="ml-1 text-[10px] text-accent2">あなた</span>}
                </div>
                <div className="text-[11px] text-white/45">
                  🔥{r.streak}日 ／ 📚{r.weeklyWords}語
                </div>
              </div>
              <div className="font-black tabular-nums text-accent2">
                {axis === 'streak' ? `${r.streak}日` : `${r.weeklyWords}語`}
              </div>
            </div>
          ))}
        </div>
        {visibleFriends.length === 0 && (
          <p className="text-xs text-white/40 mt-2 leading-relaxed">
            まだフレンドがいません。下のコードを友達に送って、お互いに追加してください。
          </p>
        )}
      </div>

      {/* --- 今日まだの友達 --- */}
      {slacking.length > 0 && (
        <div className="card p-3">
          <div className="text-sm font-bold mb-2">今日まだ学習していない友達</div>
          <div className="space-y-1.5">
            {slacking.map((fr) => (
              <div key={fr.userId} className="flex items-center gap-2">
                <span className="flex-1 truncate text-sm">{fr.displayName || 'ななしさん'}</span>
                <button
                  disabled={f.nudgedToday.includes(fr.userId)}
                  onClick={() => void onNudge(fr)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    f.nudgedToday.includes(fr.userId)
                      ? 'bg-panel2 text-white/30'
                      : 'bg-accent2 text-night active:scale-95'
                  }`}
                >
                  👋 つつく
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- フレンド一覧（通報・非表示・解除） --- */}
      {f.friends.length > 0 && (
        <details className="card p-3">
          <summary className="text-sm font-bold cursor-pointer">フレンドの管理</summary>
          <div className="mt-2 space-y-1.5">
            {f.friends.map((fr) => (
              <div key={fr.userId} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">
                  {fr.displayName || 'ななしさん'}
                  {hidden.has(fr.userId) && <span className="text-white/30 text-xs">（非表示）</span>}
                </span>
                <button onClick={() => setHidden(toggleHidden(fr.userId))} className="text-xs text-white/50 px-2">
                  {hidden.has(fr.userId) ? '再表示' : '非表示'}
                </button>
                <a href={reportMailUrl(fr.displayName, fr.userId)} className="text-xs text-white/50 px-2">
                  通報
                </a>
                <button onClick={() => void f.remove(fr.userId)} className="text-xs text-danger px-2">
                  解除
                </button>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* --- 自分のコードと表示名 --- */}
      <div className="card p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60 flex-1">あなたの名前</span>
          {editingName ? (
            <>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={NAME_MAX}
                className="bg-panel2 rounded px-2 py-1 text-sm w-32"
                placeholder="なまえ"
              />
              <button onClick={onSaveName} className="text-xs font-bold text-accent2 px-2">
                保存
              </button>
            </>
          ) : (
            <>
              <span className="font-bold">{f.displayName || 'ななしさん'}</span>
              <button
                onClick={() => { setNameInput(f.displayName); setEditingName(true) }}
                className="text-xs text-white/50 px-2"
              >
                ✎
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60 flex-1">あなたのコード</span>
          <button
            onClick={() => { void navigator.clipboard?.writeText(f.myFriendCode); flash('コピーしました') }}
            className="font-black tracking-widest text-accent2 tabular-nums"
          >
            {f.myFriendCode}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="友達のコードを入力"
            maxLength={12}
            className="flex-1 bg-panel2 rounded px-2 py-1.5 text-sm tracking-widest uppercase"
          />
          <button onClick={() => void onAdd()} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold active:scale-95">
            追加
          </button>
        </div>

        {!f.joined && (
          <button
            onClick={() => void f.join(me)}
            className="w-full py-2 rounded-lg bg-accent2 text-night text-sm font-black active:scale-95"
          >
            フレンド機能に参加する
          </button>
        )}
      </div>

      {msg && <div className="text-center text-xs text-accent2 font-bold">{msg}</div>}
    </div>
  )
}
