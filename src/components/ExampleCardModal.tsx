import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { speak, canSpeak, langForCategory, wordFromPrompt } from '../utils/speech'
import type { Category } from '../types'

/**
 * 例文フラッシュカード。例文＋和訳のカードを順番通りに並べ、
 * 表=和訳、タップで裏=英文（＋語・意味・音声）。左右で前後に移動。
 * ★でマイリストに保存でき、「☰ 一覧」でカードを一覧表示して任意の1枚へ飛べる。
 */
export function ExampleCardModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const { user, engine, toggleExampleDeck } = useGame()
  const { t, locale } = useNav()
  const [level, setLevel] = useState(0) // 0=すべて / -1=★マイリスト
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [listMode, setListMode] = useState(false)

  // レベルチップを全級ぶん出すため、母集合は多めに取得（表示は級で絞って40枚まで）
  const all = useMemo(() => engine.exampleCards(category, user.customDeck, locale, 3000), [engine, category, user.customDeck, locale])
  const levels = useMemo(() => [...new Set(all.map((q) => q.difficulty))].sort((a, b) => a - b), [all])
  const savedSet = useMemo(() => new Set(user.exampleDeck ?? []), [user.exampleDeck])
  const cards = useMemo(() => {
    if (level === -1) return all.filter((q) => savedSet.has(q.id)) // マイリストは全件表示
    return (level === 0 ? all : all.filter((q) => q.difficulty === level)).slice(0, 40)
  }, [all, level, savedSet])
  const levelLabel = (n: number) => (category === 'chinese' ? `HSK${n}` : category === 'japanese' ? `N${6 - n}` : `Lv${n}`)

  const q = cards[i]
  const ex = q ? engine.localizedExample(q, locale) : null
  const word = q ? wordFromPrompt(q.prompt) : ''
  const speechLang = langForCategory(category)

  const go = (d: number) => {
    setI((v) => Math.min(cards.length - 1, Math.max(0, v + d)))
    setFlipped(false)
  }
  const pickLevel = (lv: number) => {
    setLevel(lv)
    setI(0)
    setFlipped(false)
  }
  const jumpTo = (idx: number) => {
    setI(idx)
    setFlipped(false)
    setListMode(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-white">
          <h2 className="font-black">{t('examplecard.title')}</h2>
          <div className="flex items-center gap-2">
            {cards.length > 0 && !listMode && <span className="text-xs text-white/50 tabular-nums">{i + 1} / {cards.length}</span>}
            <button
              onClick={() => setListMode((v) => !v)}
              className="px-2.5 h-8 rounded-lg bg-panel2 text-white/70 text-xs font-bold"
            >
              {listMode ? t('examplecard.cardView') : t('examplecard.listView')}
            </button>
            <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">✕</button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <LvChip active={level === 0} onClick={() => pickLevel(0)} label={t('study.filterAll')} />
          <LvChip active={level === -1} onClick={() => pickLevel(-1)} label={`${t('examplecard.myList')}${savedSet.size > 0 ? ` ${savedSet.size}` : ''}`} />
          {levels.length > 1 && levels.map((lv) => (
            <LvChip key={lv} active={level === lv} onClick={() => pickLevel(lv)} label={levelLabel(lv)} />
          ))}
        </div>

        {listMode ? (
          /* ☰ 一覧: 全カードを俯瞰し、タップでその1枚へ飛ぶ */
          <div className="card max-h-[60vh] overflow-y-auto divide-y divide-white/5">
            {cards.length === 0 ? (
              <div className="p-8 text-center text-white/50 text-sm">
                {level === -1 ? t('examplecard.myListEmpty') : t('examplecard.empty')}
              </div>
            ) : (
              cards.map((c, idx) => {
                const cex = engine.localizedExample(c, locale)
                if (!cex) return null
                return (
                  <div
                    key={c.id}
                    onClick={() => jumpTo(idx)}
                    className={`w-full text-left p-3 flex items-start gap-2.5 active:bg-white/5 transition cursor-pointer ${idx === i ? 'bg-white/5' : ''}`}
                  >
                    <span className="text-[10px] text-white/30 tabular-nums pt-0.5 w-6 shrink-0">{idx + 1}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm leading-snug">{cex.text}</span>
                      {cex.translation && <span className="block text-[11px] text-white/45 mt-0.5 leading-snug">{cex.translation}</span>}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleExampleDeck(c.id) }}
                      aria-label={t('examplecard.myList')}
                      className={`shrink-0 text-lg leading-none pt-0.5 active:scale-90 transition ${savedSet.has(c.id) ? 'text-gold' : 'text-white/25'}`}
                    >
                      {savedSet.has(c.id) ? '★' : '☆'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        ) : !q || !ex ? (
          <div className="card p-8 text-center text-white/50 text-sm">
            {level === -1 ? t('examplecard.myListEmpty') : t('examplecard.empty')}
          </div>
        ) : (
          <>
            <div className="relative">
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
              {/* ★マイリスト保存(カード右上) */}
              <button
                onClick={() => toggleExampleDeck(q.id)}
                aria-label={t('examplecard.myList')}
                className={`absolute top-2 right-2 w-9 h-9 grid place-items-center rounded-full text-xl transition active:scale-90 ${
                  savedSet.has(q.id) ? 'text-gold' : 'text-white/30'
                }`}
              >
                {savedSet.has(q.id) ? '★' : '☆'}
              </button>
            </div>

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

function LvChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${active ? 'bg-accent2 text-night border-accent2' : 'bg-panel2 text-white/55 border-white/10'}`}
    >
      {label}
    </button>
  )
}
