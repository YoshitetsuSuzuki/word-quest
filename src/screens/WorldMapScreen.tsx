import { useMemo } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { getCategoryInfo } from '../data/categories'
import { buildWorld, worldProgress, UNLOCK_THRESHOLD } from '../core/worldLogic'

/** 冒険マップ：レベルをエリアに見立て、習得度で解放していく縦の旅路。 */
export function WorldMapScreen() {
  const { user, engine, isCategoryReady, ensureCategory } = useGame()
  const { category, navigate, setStudyLevel, setQuizMode, setCustomIds } = useNav()
  const ready = isCategoryReady(category)
  if (!ready) void ensureCategory(category)

  const regions = useMemo(() => (ready ? buildWorld(engine, category, user) : []), [ready, engine, category, user])
  const overall = worldProgress(regions)
  const info = getCategoryInfo(category)

  const startLevel = (level: number) => {
    setStudyLevel(level)
    setQuizMode('normal')
    setCustomIds(null)
    navigate('quiz')
  }

  return (
    <div className="space-y-4 animate-slideUp">
      <button onClick={() => navigate('home')} className="text-white/50 text-sm">← ホーム</button>

      <div className="card p-5 text-center">
        <div className="text-3xl">🗺️</div>
        <div className="text-xl font-black mt-1">{info.emoji} {info.label}の冒険マップ</div>
        <div className="text-xs text-white/50 mt-1">世界制覇率 {Math.round(overall * 100)}%</div>
        <div className="mt-3 h-2 rounded-full bg-panel2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-accent to-accent2" style={{ width: `${Math.round(overall * 100)}%` }} />
        </div>
      </div>

      {/* 縦の旅路 */}
      <div className="relative pl-6">
        {/* 道の線 */}
        <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-white/10" />
        <div className="space-y-3">
          {regions.map((r) => {
            const pct = Math.round(r.mastery * 100)
            return (
              <div key={r.level} className="relative">
                {/* ノードの丸 */}
                <div
                  className={`absolute -left-6 top-5 w-6 h-6 rounded-full grid place-items-center text-[11px] font-black border-2 ${
                    r.cleared
                      ? 'bg-success text-night border-success'
                      : r.unlocked
                        ? 'bg-accent text-white border-accent'
                        : 'bg-panel2 text-white/40 border-white/15'
                  }`}
                >
                  {r.cleared ? '✓' : r.unlocked ? r.level : '🔒'}
                </div>
                <button
                  disabled={!r.unlocked}
                  onClick={() => startLevel(r.level)}
                  className={`card w-full p-4 text-left flex items-center gap-3 transition ${
                    r.unlocked ? 'active:scale-[0.98]' : 'opacity-50'
                  }`}
                >
                  <div className="text-3xl">{r.unlocked ? r.emoji : '🔒'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black truncate">
                      {r.name}
                      {r.cleared && <span className="ml-2 text-[10px] text-success">攻略済</span>}
                    </div>
                    {r.unlocked ? (
                      <>
                        <div className="mt-1.5 h-1.5 rounded-full bg-panel2 overflow-hidden">
                          <div className={`h-full ${r.cleared ? 'bg-success' : 'bg-gold'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[11px] text-white/45 mt-1">
                          習得 {r.learned}/{r.total}（{pct}%）
                          {!r.cleared && ` ・${Math.round(UNLOCK_THRESHOLD * 100)}%で次を解放`}
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-white/40 mt-1">前のエリアを{Math.round(UNLOCK_THRESHOLD * 100)}%攻略で解放</div>
                    )}
                  </div>
                  {r.unlocked && <span className="text-accent2 font-black text-lg">▶</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
