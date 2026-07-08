import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { speak, canSpeak, langForCategory, wordFromPrompt } from '../utils/speech'
import type { Category } from '../types'

/**
 * 例文フラッシュカード。例文＋和訳のカードを順番通りに並べ、
 * 表=和訳、タップで裏=英文（＋語・意味・音声）。左右で前後に移動。
 */
export function ExampleCardModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const { user, engine } = useGame()
  const { t, locale } = useNav()
  const cards = useMemo(() => engine.exampleCards(category, user.customDeck, locale, 40), [engine, category, user.customDeck, locale])
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const q = cards[i]
  const ex = q ? engine.localizedExample(q, locale) : null
  const word = q ? wordFromPrompt(q.prompt) : ''
  const speechLang = langForCategory(category)

  const go = (d: number) => {
    setI((v) => Math.min(cards.length - 1, Math.max(0, v + d)))
    setFlipped(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-white">
          <h2 className="font-black">{t('examplecard.title')}</h2>
          <div className="flex items-center gap-2">
            {cards.length > 0 && <span className="text-xs text-white/50 tabular-nums">{i + 1} / {cards.length}</span>}
            <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">✕</button>
          </div>
        </div>

        {!q || !ex ? (
          <div className="card p-8 text-center text-white/50 text-sm">{t('examplecard.empty')}</div>
        ) : (
          <>
            <button
              onClick={() => setFlipped((v) => !v)}
              className="card w-full min-h-[220px] p-6 grid place-items-center text-center active:scale-[0.99] transition"
            >
              {!flipped ? (
                <div>
                  <div className="text-xl font-black leading-relaxed">{ex.translation || word}</div>
                  <div className="text-[11px] text-white/35 mt-4">{t('examplecard.tapToFlip')}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-lg font-black leading-relaxed">{ex.text}</div>
                  <div className="text-sm text-white/60">{ex.translation}</div>
                  <div className="text-xs text-accent2 font-bold">{word}{q.pronunciation ? ` ${q.pronunciation}` : ''} = {q.answer}</div>
                </div>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={() => go(-1)} disabled={i === 0} className="btn-ghost py-3 px-4 disabled:opacity-30">←</button>
              {canSpeak() && (
                <button
                  onClick={() => speak(ex.text, speechLang)}
                  aria-label={t('quiz.speak')}
                  className="flex-1 btn-ghost py-3 flex items-center justify-center gap-2 text-base"
                >
                  🔊
                </button>
              )}
              <button onClick={() => go(1)} disabled={i >= cards.length - 1} className="btn-primary py-3 px-4 disabled:opacity-30">→</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
