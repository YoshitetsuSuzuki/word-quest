import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { todayStr } from '../state/dateUtils'
import { speakWord, wordFromPrompt, canSpeak } from '../utils/speech'
import type { Strings } from '../i18n/types'

const GOALS = [5, 10, 20, 30, 50]
// 一式に入れられる項目（login は自動で常設のためトグル対象外）
const TASK_IDS = ['quiz', 'word', 'listening', 'phrase', 'example', 'review'] as const
const TASK_LABEL: Record<string, keyof Strings> = {
  quiz: 'daily.itemQuiz',
  word: 'daily.itemWord',
  listening: 'daily.itemListening',
  phrase: 'daily.itemPhrase',
  example: 'daily.itemExample',
  review: 'daily.itemReview',
}

/** ホーム最上部の「今日の一式」カード。項目・目標問数は自分で設定できる。 */
export function DailyLoopCard() {
  const { user, engine, isCategoryReady, markTodayWordSeen, markDailyTask } = useGame()
  const { category, navigate, setQuizMode, setCustomIds, t } = useNav()
  const [wordOpen, setWordOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const today = todayStr()
  const goal = user.dailyGoal || 10
  const answered = user.todayAnsweredDate === today ? user.todayAnswered : 0
  const quizDone = answered >= goal
  const wordSeen = user.todayWordSeenDate === today
  const loginDone = user.lastLoginDate === today
  const doneToday = (id: string) => user.dailyDone?.[id] === today

  const q = isCategoryReady(category) ? engine.questionOfTheDay(category, today) : undefined
  const word = q ? wordFromPrompt(q.prompt) : ''

  const openWord = () => {
    setWordOpen((v) => !v)
    markTodayWordSeen()
  }
  const launch = (mode: 'listening' | 'phrase' | 'example' | 'review', id: string) => {
    setQuizMode(mode)
    setCustomIds(null)
    markDailyTask(id)
    navigate('quiz')
  }

  // 有効な項目（未知IDは無視）＋末尾に login（常設）
  const tasks = user.dailyTasks.filter((id) => TASK_IDS.includes(id as (typeof TASK_IDS)[number]))
  const rows = tasks.map((id) => {
    switch (id) {
      case 'quiz':
        return {
          id,
          done: quizDone,
          label: `${t('daily.quizPre')}${goal}${t('daily.quizUnit')} (${Math.min(answered, goal)}/${goal})`,
          action: quizDone ? undefined : () => { setQuizMode('normal'); setCustomIds(null); navigate('quiz') },
        }
      case 'word':
        return { id, done: wordSeen, label: t('daily.seeWord'), action: openWord }
      default:
        return { id, done: doneToday(id), label: t(TASK_LABEL[id]), action: () => launch(id as 'listening' | 'phrase' | 'example' | 'review', id) }
    }
  })
  const allDone = loginDone && rows.every((r) => r.done)
  const streakAtRisk = user.studyStreak >= 3 && !quizDone && tasks.includes('quiz')

  return (
    <div className={`card p-4 space-y-3 ${allDone ? 'ring-1 ring-success/50' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm">{t('daily.title')} {allDone && t('daily.done')}</h3>
        <div className="flex items-center gap-2">
          <span className="font-black text-gold">🔥 {user.studyStreak}{t('daily.dayUnit')}</span>
          <button onClick={() => setEditOpen(true)} className="text-[11px] text-white/45 active:text-accent2 border border-white/10 rounded-lg px-2 py-0.5">
            {t('daily.edit')}
          </button>
        </div>
      </div>

      {streakAtRisk && (
        <div className="text-xs font-bold text-danger bg-danger/10 rounded-lg px-3 py-2">
          {t('daily.streakWarnPre')}{user.studyStreak}{t('daily.streakWarnMid')}{goal - answered}{t('daily.streakWarnPost')}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((r) => (
          <StepRow key={r.id} done={r.done} label={r.label} action={r.done ? undefined : r.action} />
        ))}
        <StepRow done={loginDone} label={t('daily.itemLogin')} />
      </div>

      {wordOpen && q && (
        <div className="bg-panel2 rounded-xl p-4 text-center animate-slideUp">
          <div className="text-xs text-white/40 mb-1">{t('daily.wordOfDay')}</div>
          <div className="text-xl font-black">{word}</div>
          {q.pronunciation && <div className="text-accent2 font-mono font-bold text-sm mt-0.5">{q.pronunciation}</div>}
          <div className="mt-1 text-white/80">{q.answer}</div>
          {q.example && <div className="mt-2 text-xs text-white/50">{q.example}</div>}
          {canSpeak() && (
            <button onClick={() => speakWord(word, category)} className="mt-2 w-9 h-9 rounded-full bg-white/10 text-base">
              🔊
            </button>
          )}
        </div>
      )}

      {editOpen && <DailySettings onClose={() => setEditOpen(false)} />}
    </div>
  )
}

function DailySettings({ onClose }: { onClose: () => void }) {
  const { user, setDailyGoal, setDailyTasks } = useGame()
  const { t } = useNav()
  const goal = user.dailyGoal || 10
  const toggle = (id: string) => {
    setDailyTasks(user.dailyTasks.includes(id) ? user.dailyTasks.filter((x) => x !== id) : [...user.dailyTasks, id])
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/60 grid place-items-end sm:place-items-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-panel rounded-t-2xl sm:rounded-2xl p-4 space-y-4 max-h-[82vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-black">{t('daily.settingsTitle')}</h2>
          <button onClick={onClose} aria-label={t('common.back')} className="w-8 h-8 grid place-items-center rounded-lg bg-panel2 text-white/60">✕</button>
        </div>

        <div>
          <div className="text-xs font-bold text-white/50 mb-2">{t('daily.goalLabel')}</div>
          <div className="flex gap-2 flex-wrap">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => setDailyGoal(g)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition ${goal === g ? 'bg-accent2 text-night border-accent2' : 'bg-panel2 text-white/60 border-white/10'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-white/50 mb-2">{t('daily.itemsLabel')}</div>
          <div className="space-y-1.5">
            {TASK_IDS.map((id) => {
              const on = user.dailyTasks.includes(id)
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-panel2 text-left active:scale-[0.99] transition"
                >
                  <span className={`w-5 h-5 grid place-items-center rounded-md text-[11px] shrink-0 ${on ? 'bg-accent text-white' : 'bg-white/10 text-white/40'}`}>
                    {on ? '✓' : ''}
                  </span>
                  <span className={`text-sm ${on ? 'font-bold' : 'text-white/60'}`}>{t(TASK_LABEL[id])}</span>
                </button>
              )
            })}
            <div className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-panel2/50 opacity-70">
              <span className="w-5 h-5 grid place-items-center rounded-md text-[11px] shrink-0 bg-success/60 text-white">✓</span>
              <span className="text-sm text-white/50">{t('daily.itemLogin')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepRow({ done, label, action }: { done: boolean; label: string; action?: () => void }) {
  return (
    <button onClick={action} disabled={!action} className="w-full flex items-center gap-2 text-sm text-left disabled:opacity-100">
      <span className={`w-5 h-5 grid place-items-center rounded-full text-[11px] shrink-0 ${done ? 'bg-success text-white' : 'bg-white/10 text-white/40'}`}>
        {done ? '✓' : '·'}
      </span>
      <span className={done ? 'text-white/45 line-through' : 'font-bold'}>{label}</span>
      {action && !done && <span className="ml-auto text-accent2 text-xs font-bold">▶</span>}
    </button>
  )
}
