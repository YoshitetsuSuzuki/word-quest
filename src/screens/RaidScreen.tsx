import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { getRaidView } from '../modules/raid/raidLogic'
import { ProgressBar } from '../components/ProgressBar'
import type { Question } from '../types'

export function RaidScreen() {
  const { user, engine, answerQuestion, claimRaid, ensureCategory, isCategoryReady } = useGame()
  const { navigate, category, t } = useNav()
  const raid = getRaidView(user)
  const ready = isCategoryReady(category)

  useEffect(() => {
    void ensureCategory(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const [attacking, setAttacking] = useState(false)
  const [q, setQ] = useState<Question | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [hit, setHit] = useState(false)

  const beginAttack = () => {
    if (!ready) return
    setQ(engine.buildSession(category, 1)[0])
    setSelected(null)
    setHit(false)
    setAttacking(true)
  }

  const onAnswer = (choice: string) => {
    if (!q || selected) return
    const res = answerQuestion(q, choice, 1)
    setSelected(choice)
    if (res.correct) setHit(true)
    window.setTimeout(() => setAttacking(false), 900)
  }

  const onClaim = () => {
    claimRaid()
  }

  if (attacking && q) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className={`text-7xl transition ${hit ? 'animate-shake' : ''}`}>{raid.boss.emoji}</div>
          {hit && <div className="text-danger font-black animate-floatUp">{t('raid.hit')}</div>}
        </div>
        <div className="card p-6 text-center">
          <div className="text-xs text-white/40 mb-1">{t('raid.attackPrompt')}</div>
          <div className="text-2xl font-black">{q.prompt}</div>
        </div>
        <div className="grid gap-2.5">
          {q.choices.map((c) => {
            let cls = 'btn-ghost'
            if (selected) {
              if (c === q.answer) cls = 'btn bg-success/90 text-white'
              else if (c === selected) cls = 'btn bg-danger/90 text-white'
              else cls = 'btn bg-panel2 text-white/40'
            }
            return (
              <button key={c} disabled={!!selected} onClick={() => onAnswer(c)} className={`${cls} py-3.5`}>
                {c}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-black">{t('raid.title')}</h2>

      <div className="card p-6 text-center">
        <div className="text-7xl mb-2">{raid.boss.emoji}</div>
        <div className="text-lg font-black">{raid.boss.name}</div>
        <div className="mt-4">
          <ProgressBar ratio={raid.ratio} barClassName="bg-danger" height={14} />
          <div className="flex justify-between text-xs text-white/50 mt-1.5 tabular-nums">
            <span>{raid.totalProgress} / {raid.target}</span>
            <span>{Math.round(raid.ratio * 100)}%</span>
          </div>
        </div>
        <div className="text-xs text-white/45 mt-3">
          {t('raid.contribution')} <span className="text-accent2 font-bold">{raid.myContribution}</span> ·
          {t('raid.coop')}
        </div>
      </div>

      <div className="card p-4 text-sm text-white/60">
        {t('raid.rewardPre')}🪙{raid.boss.rewardCoin} / {raid.boss.rewardXp}XP
        {raid.boss.rewardTitle && <>{t('raid.rewardTitlePre')}{raid.boss.rewardTitle}{t('raid.rewardTitlePost')}</>}
      </div>

      {raid.cleared ? (
        raid.claimed ? (
          <div className="btn-ghost w-full py-4 text-center text-success">{t('raid.clearedClaimed')}</div>
        ) : (
          <button className="btn-primary w-full py-4 animate-glow" onClick={onClaim}>
            {t('raid.claim')}
          </button>
        )
      ) : (
        <button className="btn-primary w-full py-4" disabled={!ready} onClick={beginAttack}>
          {ready ? t('raid.attack') : t('quiz.preparing')}
        </button>
      )}
      <button className="btn-ghost w-full py-3" onClick={() => navigate('home')}>
        {t('common.back')}
      </button>
    </div>
  )
}
