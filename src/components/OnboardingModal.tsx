import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'

const ONBOARDED_KEY = 'wordquest.onboarded'

/** 初回起動時のオンボーディング（名前入力＋遊び方） */
export function OnboardingModal() {
  const { setName, setDailyGoal } = useGame()
  const { t, locale, setLocale } = useNav()
  const [done, setDone] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1')
  const [step, setStep] = useState(0)
  const [name, setNameInput] = useState('')
  const [goal, setGoal] = useState(20)

  if (done) return null

  const finish = () => {
    if (name.trim()) setName(name)
    setDailyGoal(goal)
    localStorage.setItem(ONBOARDED_KEY, '1')
    setDone(true)
  }

  const GOALS = [
    { n: 10, labelKey: 'onboard.goalLight' as const },
    { n: 20, labelKey: 'onboard.goalStd' as const },
    { n: 30, labelKey: 'onboard.goalHard' as const },
  ]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/95 p-6">
      <div className="card p-6 max-w-xs w-full text-center animate-pop">
        {step === 0 ? (
          <>
            <div className="text-5xl mb-2">🌏</div>
            <h2 className="text-xl font-black">{t('onboard.welcome')}</h2>
            <div className="mt-4">
              <div className="text-xs text-white/45 mb-2 font-bold">{t('onboarding.chooseLang')}</div>
              <div className="grid grid-cols-2 gap-3">
                <button className={`btn-ghost py-3 ${locale === 'ja' ? 'ring-2 ring-accent' : ''}`} onClick={() => setLocale('ja')}>日本語</button>
                <button className={`btn-ghost py-3 ${locale === 'en' ? 'ring-2 ring-accent' : ''}`} onClick={() => setLocale('en')}>English</button>
              </div>
            </div>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              {t('onboard.intro')}<span className="text-accent2">{t('onboard.introAccent')}</span>{t('onboard.introRest')}
            </p>
            <ul className="text-left text-xs text-white/55 mt-4 space-y-1.5">
              <li>{t('onboard.bullet1')}</li>
              <li>{t('onboard.bullet2')}</li>
              <li>{t('onboard.bullet3')}</li>
            </ul>
            <button className="btn-primary w-full py-3 mt-6" onClick={() => setStep(1)}>
              {t('onboard.start')}
            </button>
          </>
        ) : step === 1 ? (
          <>
            <div className="text-5xl mb-2">🎯</div>
            <h2 className="text-xl font-black">{t('onboard.goalTitle')}</h2>
            <p className="text-xs text-white/50 mt-2">{t('onboard.goalDesc')}</p>
            <div className="grid gap-2.5 mt-4">
              {GOALS.map((g) => (
                <button
                  key={g.n}
                  onClick={() => setGoal(g.n)}
                  className={`btn-ghost py-3 flex items-center justify-between px-4 ${goal === g.n ? 'ring-2 ring-accent' : ''}`}
                >
                  <span className="font-bold">{t(g.labelKey)}</span>
                  <span className="text-white/50 text-sm tabular-nums">{g.n}{t('onboard.goalUnit')}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary w-full py-3 mt-5" onClick={() => setStep(2)}>
              {t('onboard.next')}
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">✏️</div>
            <h2 className="text-xl font-black">{t('onboard.nameTitle')}</h2>
            <p className="text-xs text-white/50 mt-2">{t('onboard.nameDesc')}</p>
            <input
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder={t('onboard.namePlaceholder')}
              maxLength={12}
              autoFocus
              className="w-full bg-panel2 rounded-xl px-4 py-3 mt-4 text-center outline-none border border-white/10 focus:border-accent2"
              onKeyDown={(e) => e.key === 'Enter' && finish()}
            />
            <button className="btn-primary w-full py-3 mt-4" onClick={finish}>
              {name.trim() ? t('onboard.startWithName') : t('onboard.startNoName')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
