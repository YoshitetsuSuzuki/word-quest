import { useState } from 'react'
import { useGame } from '../state/GameContext'

const ONBOARDED_KEY = 'wordquest.onboarded'

/** 初回起動時のオンボーディング（名前入力＋遊び方） */
export function OnboardingModal() {
  const { setName } = useGame()
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
            <h2 className="text-xl font-black">WordQuest へようこそ</h2>
            <p className="text-sm text-white/60 mt-3 leading-relaxed">
              英単語・中国語を、<span className="text-accent2">遊びながら</span>覚える学習ゲームです。
              クイズで正解するとXP・コインが増え、レベルが上がります。
            </p>
            <ul className="text-left text-xs text-white/55 mt-4 space-y-1.5">
              <li>📝 クイズで学ぶ（発音も聞ける）</li>
              <li>📚 まなびで苦手を復習・単語帳を作る</li>
              <li>⚔️ バトルやレイドでゲーム感覚に</li>
            </ul>
            <button className="btn-primary w-full py-3 mt-6" onClick={() => setStep(1)}>
              はじめる
            </button>
          </>
        ) : (
          <>
            <div className="text-5xl mb-2">✏️</div>
            <h2 className="text-xl font-black">あなたの名前は？</h2>
            <p className="text-xs text-white/50 mt-2">ランキングやプロフィールに表示されます（後で変更可）。</p>
            <input
              value={name}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="名前を入力"
              maxLength={12}
              autoFocus
              className="w-full bg-panel2 rounded-xl px-4 py-3 mt-4 text-center outline-none border border-white/10 focus:border-accent2"
              onKeyDown={(e) => e.key === 'Enter' && finish()}
            />
            <button className="btn-primary w-full py-3 mt-4" onClick={finish}>
              {name.trim() ? 'スタート！' : '名前なしで始める'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
