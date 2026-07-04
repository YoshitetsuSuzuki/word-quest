import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { featureFlags } from '../config/featureFlags'
import { getRaidView } from '../modules/raid/raidLogic'
import { getMissionViews } from '../modules/mission/missionLogic'
import { ProgressBar } from '../components/ProgressBar'
import { categories } from '../data/categories'

export function HomeScreen() {
  const { user, ensureCategory } = useGame()
  const { navigate, setQuizMode, category, setCategory } = useNav()

  const selectCategory = (id: typeof category) => {
    setCategory(id)
    void ensureCategory(id) // 先読みしておく
  }
  const raid = getRaidView(user)
  const missions = getMissionViews(user)
  const doneMissions = missions.filter((m) => m.completed).length
  const dueReview = user.reviewQueue.filter((r) => r.nextReviewAt <= Date.now()).length

  const tiles: { screen: Parameters<typeof navigate>[0]; label: string; icon: string; on: boolean; hint?: string }[] = [
    { screen: 'battle', label: 'バトル', icon: '⚔️', on: featureFlags.battleEnabled, hint: '20問対戦' },
    { screen: 'raid', label: 'レイド', icon: '🐉', on: featureFlags.raidEnabled, hint: `${Math.round(raid.ratio * 100)}%` },
    { screen: 'missions', label: 'ミッション', icon: '🎯', on: featureFlags.missionsEnabled, hint: `${doneMissions}/${missions.length}` },
    { screen: 'shop', label: 'ショップ', icon: '🛍️', on: featureFlags.shopEnabled },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black leading-tight">
          英単語で、<span className="text-accent2">世界一</span>へ。
        </h1>
        <p className="text-sm text-white/50 mt-1">
          🔥 {user.streakDays}日連続ログイン中 ・ 今日 🪙{user.todayCoin} 獲得
        </p>
      </div>

      {/* ジャンル選択（プラットフォームの横展開） */}
      <div>
        <div className="text-xs text-white/45 mb-2 font-bold">学習ジャンル</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                disabled={!c.available}
                onClick={() => selectCategory(c.id)}
                className={`shrink-0 px-3 py-2 rounded-xl text-sm font-bold transition border ${
                  active
                    ? 'bg-accent text-white border-accent'
                    : c.available
                      ? 'bg-panel2 text-white/70 border-white/10'
                      : 'bg-panel2 text-white/25 border-white/5'
                }`}
              >
                {c.emoji} {c.label}
                {!c.available && <span className="ml-1 text-[9px]">準備中</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* メインCTA */}
      <button
        onClick={() => {
          setQuizMode('normal')
          navigate('quiz')
        }}
        className="btn-primary w-full py-5 text-lg relative overflow-hidden"
      >
        <span className="relative z-10">▶ クイズをはじめる</span>
      </button>

      {/* 復習の案内 */}
      {featureFlags.reviewEnabled && dueReview > 0 && (
        <button
          onClick={() => {
            setQuizMode('review')
            navigate('quiz')
          }}
          className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          🔁 復習が {dueReview} 問たまっています
        </button>
      )}

      {/* 機能タイル */}
      <div className="grid grid-cols-2 gap-3">
        {tiles
          .filter((t) => t.on)
          .map((t) => (
            <button
              key={t.screen}
              onClick={() => navigate(t.screen)}
              className="card p-4 text-left active:scale-95 transition"
            >
              <div className="text-3xl">{t.icon}</div>
              <div className="mt-2 font-bold">{t.label}</div>
              {t.hint && <div className="text-xs text-white/45">{t.hint}</div>}
            </button>
          ))}
      </div>

      {/* 今日のレイド プレビュー */}
      {featureFlags.raidEnabled && (
        <button onClick={() => navigate('raid')} className="card p-4 w-full text-left active:scale-95 transition">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{raid.boss.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/45">今日のレイドボス</div>
              <div className="font-bold truncate">{raid.boss.name}</div>
              <ProgressBar ratio={raid.ratio} className="mt-2" barClassName="bg-danger" height={8} />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
