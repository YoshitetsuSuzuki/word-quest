import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { Loading } from '../components/Loading'
import { wordFromPrompt } from '../utils/speech'
import { playCorrect, playWrong, playCombo } from '../utils/audio'
import { hapticCorrect, hapticWrong, hapticCombo } from '../utils/haptics'
import type { Question } from '../types'

const PAIRS = 5

function shuffle<T>(a: T[]): T[] {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

/** ペア合わせ：単語と意味を線でつなぐミニゲーム。出題形式に変化をつけ、想起を鍛える。 */
export function MatchScreen() {
  const { engine, isCategoryReady, ensureCategory, applyRewardXp } = useGame()
  const { category, navigate, studyLevel, locale, sfxEnabled, sfxVolume } = useNav()
  const ready = isCategoryReady(category)
  useEffect(() => { if (!ready) void ensureCategory(category) }, [ready, ensureCategory, category])

  const qs = useMemo<Question[]>(() => (ready ? engine.buildSession(category, PAIRS, studyLevel, locale) : []), [ready, engine, category, studyLevel, locale])
  const rights = useMemo(() => shuffle(qs.map((q) => ({ id: q.id, text: engine.localizedGloss(q, locale) }))), [qs, engine, locale])

  const [pickLeft, setPickLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  if (!ready || qs.length === 0) return <Loading label="準備中…" />

  const onRight = (rid: string) => {
    if (!pickLeft || matched.includes(rid)) return
    if (pickLeft === rid) {
      const m = [...matched, rid]
      setMatched(m)
      setPickLeft(null)
      if (m.length >= qs.length) {
        if (sfxEnabled) playCombo(sfxVolume, 3)
        hapticCombo()
        const reward = qs.length * 6
        applyRewardXp(reward)
        setTimeout(() => setDone(true), 500)
      } else {
        if (sfxEnabled) playCorrect(sfxVolume)
        hapticCorrect()
      }
    } else {
      setWrong(rid)
      if (sfxEnabled) playWrong(sfxVolume)
      hapticWrong()
      setTimeout(() => setWrong(null), 400)
      setPickLeft(null)
    }
  }

  if (done) {
    return (
      <div className="text-center py-12 animate-slideUp">
        <div className="text-6xl mb-3">🎯</div>
        <h2 className="text-2xl font-black">ぜんぶ そろった！</h2>
        <div className="card mt-5 p-4 text-gold font-black">+{qs.length * 6} XP</div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost py-3" onClick={() => navigate('home')}>ホーム</button>
          <button className="btn-primary py-3" onClick={() => window.location.reload()}>もう一回</button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slideUp">
      <button onClick={() => navigate('home')} className="text-white/50 text-sm">← ホーム</button>
      <div className="text-center">
        <h2 className="text-lg font-black">🎯 ペア合わせ</h2>
        <p className="text-xs text-white/50">単語をタップ → 意味をタップ（{matched.length}/{qs.length}）</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* 左：単語 */}
        <div className="space-y-2.5">
          {qs.map((q) => {
            const isMatched = matched.includes(q.id)
            const isPicked = pickLeft === q.id
            return (
              <button
                key={q.id}
                disabled={isMatched}
                onClick={() => setPickLeft(q.id)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition border ${
                  isMatched
                    ? 'bg-success/15 text-success/60 border-success/20'
                    : isPicked
                      ? 'bg-accent text-white border-accent scale-[1.02]'
                      : 'bg-panel2 text-white border-white/10 active:bg-white/5'
                }`}
              >
                {isMatched ? '✓' : wordFromPrompt(q.prompt)}
              </button>
            )
          })}
        </div>
        {/* 右：意味 */}
        <div className="space-y-2.5">
          {rights.map((r) => {
            const isMatched = matched.includes(r.id)
            const isWrong = wrong === r.id
            return (
              <button
                key={r.id}
                disabled={isMatched}
                onClick={() => onRight(r.id)}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition border ${
                  isMatched
                    ? 'bg-success/15 text-success/60 border-success/20'
                    : isWrong
                      ? 'bg-danger/80 text-white border-danger animate-shake'
                      : 'bg-panel2 text-white border-white/10 active:bg-white/5'
                }`}
              >
                {isMatched ? '✓' : r.text}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
