import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { speak, canSpeak, langForCategory, wordFromPrompt } from '../utils/speech'
import type { Category } from '../types'

// テーマの表示ラベル(表現データの tags[1])。日本語ネイティブ向けなので日本語を主に。
const THEME_LABEL: Record<string, { ja: string; en: string }> = {
  greeting: { ja: 'あいさつ', en: 'Greetings' },
  daily: { ja: '日常', en: 'Daily' },
  reply: { ja: '返事・相づち', en: 'Replies' },
  shop: { ja: '買い物・食事', en: 'Shopping' },
  travel: { ja: '旅行・道案内', en: 'Travel' },
  request: { ja: 'お願い・お礼', en: 'Requests' },
  work: { ja: '仕事', en: 'Work' },
  feeling: { ja: '気持ち', en: 'Feelings' },
  smalltalk: { ja: '雑談・天気', en: 'Small talk' },
  phone: { ja: '電話・通話', en: 'Phone' },
  trouble: { ja: '困ったとき', en: 'Trouble' },
  idiom: { ja: '慣用句', en: 'Idioms' },
  business: { ja: 'ビジネス', en: 'Business' },
}

/**
 * 表現フラッシュカード。クイズとは別に、表現を「表=訳／タップで裏=英文＋音声」で暗記する。
 * レベル(級)とテーマの2軸で絞り込める。
 */
export function PhraseCardModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const { engine } = useGame()
  const { t, locale } = useNav()
  const [level, setLevel] = useState(0) // 0=すべて
  const [theme, setTheme] = useState('') // ''=すべて
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const all = useMemo(() => engine.phraseCards(category, 0, '', locale, 2000), [engine, category, locale])
  const levels = useMemo(() => [...new Set(all.map((q) => q.difficulty))].sort((a, b) => a - b), [all])
  const themes = useMemo(() => engine.phraseThemes(category), [engine, category])
  const cards = useMemo(
    () =>
      all
        .filter((q) => (level > 0 ? q.difficulty === level : true))
        .filter((q) => (theme ? q.tags?.includes(theme) : true)),
    [all, level, theme],
  )
  const levelLabel = (n: number) => (n === 1 ? t('study.lvBeg') : n === 2 ? t('study.lvInt') : t('study.lvAdv'))
  const themeLabel = (th: string) => THEME_LABEL[th]?.[locale] ?? th

  const q = cards[i]
  const en = q ? wordFromPrompt(q.prompt) : ''
  const speechLang = langForCategory(category)

  const go = (d: number) => {
    setI((v) => Math.min(cards.length - 1, Math.max(0, v + d)))
    setFlipped(false)
  }
  const reset = () => {
    setI(0)
    setFlipped(false)
  }
  const pickLevel = (lv: number) => {
    setLevel(lv)
    reset()
  }
  const pickTheme = (th: string) => {
    setTheme(th)
    reset()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 grid place-items-center p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-white">
          <h2 className="font-black">{t('phrasecard.title')}</h2>
          <div className="flex items-center gap-2">
            {cards.length > 0 && <span className="text-xs text-white/50 tabular-nums">{i + 1} / {cards.length}</span>}
            <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">✕</button>
          </div>
        </div>

        {levels.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={level === 0} onClick={() => pickLevel(0)} label={t('study.filterAll')} />
            {levels.map((lv) => (
              <Chip key={lv} active={level === lv} onClick={() => pickLevel(lv)} label={levelLabel(lv)} />
            ))}
          </div>
        )}

        {themes.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <Chip active={theme === ''} onClick={() => pickTheme('')} label={t('study.filterAll')} />
            {themes.map((th) => (
              <Chip key={th} active={theme === th} onClick={() => pickTheme(th)} label={themeLabel(th)} />
            ))}
          </div>
        )}

        {!q ? (
          <div className="card p-8 text-center text-white/50 text-sm">{t('examplecard.empty')}</div>
        ) : (
          <>
            <button
              onClick={() => setFlipped((v) => !v)}
              className="card w-full min-h-[200px] p-6 grid place-items-center text-center active:scale-[0.99] transition"
            >
              {!flipped ? (
                <div>
                  <div className="text-xl font-black leading-relaxed">{q.answer}</div>
                  <div className="text-[11px] text-white/35 mt-4">{t('examplecard.tapToFlip')}</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-lg font-black leading-relaxed">{en}</div>
                  {q.pronunciation && <div className="text-sm text-accent font-bold">{q.pronunciation}</div>}
                  <div className="text-sm text-white/60">{q.answer}</div>
                  <div className="text-xs text-accent2 font-bold">{themeLabel(q.tags?.find((x) => x !== 'phrase') || '')}</div>
                </div>
              )}
            </button>

            <div className="flex items-center gap-2">
              <button onClick={() => go(-1)} disabled={i === 0} className="btn-ghost py-3 px-4 disabled:opacity-30">←</button>
              {canSpeak() && (
                <button
                  onClick={() => speak(en, speechLang)}
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

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${active ? 'bg-accent2 text-night border-accent2' : 'bg-panel2 text-white/55 border-white/10'}`}
    >
      {label}
    </button>
  )
}
