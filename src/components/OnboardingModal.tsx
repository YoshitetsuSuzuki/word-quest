import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'

const ONBOARDED_KEY = 'wordquest.onboarded'

/** 初回起動時のオンボーディング（名前入力＋遊び方） */
export function OnboardingModal() {
  const { setName } = useGame()
  const { t, locale, setLocale } = useNav()
  const [done, setDone] = useState(() => localStorage.getItem(ONBOARDED_KEY) === '1')
  const [step, setStep] = useState(0)
  const [name, setNameInput] = useState('')

  if (done) return null

  const finish = () => {
    if (name.trim()) setName(name)
    localStorage.setItem(ONBOARDED_KEY, '1')
    setDone(true)
  }

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
