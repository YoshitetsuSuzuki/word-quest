import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { achievements } from '../data/achievements.config'
import { equippedTitle, equippedFrameClass } from '../modules/shop/shopLogic'
import { featureFlags } from '../config/featureFlags'

export function ProfileScreen() {
  const { user, resetAll } = useGame()
  const { soundEnabled, setSoundEnabled } = useNav()
  const title = equippedTitle(user)
  const frame = equippedFrameClass(user)
  const totalBattles = user.battleWins + user.battleLosses
  const winRate = totalBattles > 0 ? Math.round((user.battleWins / totalBattles) * 100) : 0
  const unlocked = new Set(user.achievements.map((a) => a.id))

  const stats: { label: string; value: string }[] = [
    { label: 'レベル', value: `Lv.${user.level}` },
    { label: '累計XP的な指標', value: `${user.xp} / 次Lv` },
    { label: 'コイン', value: `🪙 ${user.coin.toLocaleString()}` },
    { label: 'レート(Elo)', value: `${user.eloRating}` },
    { label: 'バトル勝率', value: `${winRate}% (${user.battleWins}勝${user.battleLosses}敗)` },
    { label: '総正解数', value: `${user.totalCorrect}` },
    { label: '総回答数', value: `${user.totalAnswered}` },
    { label: '連続ログイン', value: `🔥 ${user.streakDays}日` },
    { label: '習得単語数', value: `${user.learnedQuestionIds.length}` },
  ]

  const onReset = () => {
    if (confirm('データを初期化しますか？この操作は取り消せません。')) resetAll()
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="card p-5 text-center">
        <div
          className={`w-20 h-20 mx-auto rounded-full bg-accent/30 grid place-items-center text-3xl font-black ring-4 ${
            frame ?? 'ring-accent/40'
          }`}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="mt-3 text-xl font-black">{user.name}</div>
        {title && (
          <div className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gold/20 text-gold font-bold">
            {title}
          </div>
        )}
      </div>

      {/* ステータス */}
      <div className="card p-4 divide-y divide-white/5">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between py-2 text-sm">
            <span className="text-white/55">{s.label}</span>
            <span className="font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* 実績 */}
      {featureFlags.achievementsEnabled && (
        <div>
          <h3 className="font-black mb-2">🏅 実績（{unlocked.size}/{achievements.length}）</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {achievements.map((a) => {
              const got = unlocked.has(a.id)
              return (
                <div
                  key={a.id}
                  className={`card p-3 text-center ${got ? '' : 'opacity-35 grayscale'}`}
                  title={a.description}
                >
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="text-[10px] font-bold mt-1 leading-tight">{a.title}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 設定 */}
      <div className="card p-4">
        <h3 className="font-black text-sm mb-3">⚙️ 設定</h3>
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="w-full flex items-center justify-between py-2"
        >
          <span className="text-sm">🔊 発音の自動再生</span>
          <span
            className={`relative w-12 h-7 rounded-full transition ${soundEnabled ? 'bg-accent' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${soundEnabled ? 'left-[22px]' : 'left-0.5'}`}
            />
          </span>
        </button>
        <p className="text-[11px] text-white/40 mt-1">
          オフにすると問題が出たときの読み上げが止まります（🔊ボタンは引き続き使えます）。
        </p>
      </div>

      <button className="btn-ghost w-full py-3 text-sm text-danger" onClick={onReset}>
        データを初期化
      </button>
    </div>
  )
}
