import { useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { streakConfig } from '../data/streak.config'
import { todayStr } from '../state/dateUtils'
import { speakWord, wordFromPrompt, canSpeak } from '../utils/speech'

/** ホーム最上部の「今日の一式」カード。3ステップ全部そろうと✨ */
export function DailyLoopCard() {
  const { user, engine, isCategoryReady, markTodayWordSeen } = useGame()
  const { category, navigate, setQuizMode, setCustomIds } = useNav()
  const [wordOpen, setWordOpen] = useState(false)

  const today = todayStr()
  const answered = user.todayAnsweredDate === today ? user.todayAnswered : 0
  const quizDone = answered >= streakConfig.dailyGoal
  const wordSeen = user.todayWordSeenDate === today
  const loginDone = user.lastLoginDate === today // 起動時に自動受取済み
  const allDone = quizDone && wordSeen && loginDone

  const q = isCategoryReady(category) ? engine.questionOfTheDay(category, today) : undefined
  const word = q ? wordFromPrompt(q.prompt) : ''

  const openWord = () => {
    setWordOpen((v) => !v)
    markTodayWordSeen()
  }

  const streakAtRisk = user.studyStreak >= 3 && !quizDone

  return (
    <div className={`card p-4 space-y-3 ${allDone ? 'ring-1 ring-success/50' : ''}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-black text-sm">📅 今日の一式 {allDone && '✨コンプ！'}</h3>
        <span className="font-black text-gold">🔥 {user.studyStreak}日</span>
      </div>

      {streakAtRisk && (
        <div className="text-xs font-bold text-danger bg-danger/10 rounded-lg px-3 py-2">
          ⚠️ 🔥{user.studyStreak}日のストリークが今夜消えます！あと{streakConfig.dailyGoal - answered}問
        </div>
      )}

      <div className="space-y-2">
        <StepRow
          done={quizDone}
          label={`今日の${streakConfig.dailyGoal}問 (${Math.min(answered, streakConfig.dailyGoal)}/${streakConfig.dailyGoal})`}
          action={
            quizDone
              ? undefined
              : () => {
                  setQuizMode('normal')
                  setCustomIds(null)
                  navigate('quiz')
                }
          }
        />
        <StepRow done={wordSeen} label="今日の単語を見る" action={openWord} />
        <StepRow done={loginDone} label="ログインボーナス" />
      </div>

      {wordOpen && q && (
        <div className="bg-panel2 rounded-xl p-4 text-center animate-slideUp">
          <div className="text-xs text-white/40 mb-1">今日の単語</div>
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
    </div>
  )
}

function StepRow({ done, label, action }: { done: boolean; label: string; action?: () => void }) {
  return (
    <button onClick={action} disabled={!action} className="w-full flex items-center gap-2 text-sm text-left disabled:opacity-100">
      <span
        className={`w-5 h-5 grid place-items-center rounded-full text-[11px] shrink-0 ${done ? 'bg-success text-white' : 'bg-white/10 text-white/40'}`}
      >
        {done ? '✓' : '·'}
      </span>
      <span className={done ? 'text-white/45 line-through' : 'font-bold'}>{label}</span>
      {action && !done && <span className="ml-auto text-accent2 text-xs font-bold">▶</span>}
    </button>
  )
}
