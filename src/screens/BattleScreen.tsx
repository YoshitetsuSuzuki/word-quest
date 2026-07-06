import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import {
  BATTLE_QUESTIONS,
  BATTLE_ENTRY_FEE,
  pickOpponent,
  resolveBattle,
  computeScore,
  type BattleAnswerLog,
} from '../modules/battle/battleLogic'
import type { BattleResult, Question } from '../types'

type Phase = 'intro' | 'playing' | 'result'

export function BattleScreen() {
  const { user, engine, finishBattle, chargeBattleFee, ensureCategory, isCategoryReady } = useGame()
  const { navigate, category, t } = useNav()
  const opponent = useMemo(() => pickOpponent(user.eloRating), [user.eloRating])
  const ready = isCategoryReady(category)

  useEffect(() => {
    void ensureCategory(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [logs, setLogs] = useState<BattleAnswerLog[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [shownAt, setShownAt] = useState(0)
  const [result, setResult] = useState<BattleResult | null>(null)

  const start = () => {
    if (!ready) return
    if (!chargeBattleFee(BATTLE_ENTRY_FEE)) return
    setQuestions(engine.buildSession(category, BATTLE_QUESTIONS))
    setIndex(0)
    setLogs([])
    setSelected(null)
    setShownAt(Date.now())
    setPhase('playing')
  }

  const answer = (choice: string, q: Question) => {
    if (selected) return
    const correct = choice === q.answer
    const log: BattleAnswerLog = { correct, timeMs: Date.now() - shownAt }
    const nextLogs = [...logs, log]
    setSelected(choice)
    setLogs(nextLogs)

    window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        const res = resolveBattle(nextLogs, opponent, user.eloRating)
        setResult(res)
        finishBattle(res)
        setPhase('result')
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
        setShownAt(Date.now())
      }
    }, 450)
  }

  // ---- intro ----
  if (phase === 'intro') {
    const canAfford = user.coin >= BATTLE_ENTRY_FEE
    return (
      <div className="space-y-5">
        <h2 className="text-xl font-black">{t('battle.title')}</h2>
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <div className="text-3xl">🧑‍🎓</div>
              <div className="font-bold mt-1">{t('battle.you')}</div>
              <div className="text-xs text-accent2">Elo {user.eloRating}</div>
            </div>
            <div className="text-2xl font-black text-white/40">{t('battle.vs')}</div>
            <div className="text-center flex-1">
              <div className="text-3xl">🤖</div>
              <div className="font-bold mt-1">{opponent.name}</div>
              <div className="text-xs text-danger">Elo {opponent.elo}</div>
            </div>
          </div>
        </div>
        <ul className="text-sm text-white/60 space-y-1">
          <li>{t('battle.ruleQPre')}{BATTLE_QUESTIONS}{t('battle.ruleQPost')}</li>
          <li>{t('battle.ruleReward')}</li>
          <li>{t('battle.ruleFeePre')}{BATTLE_ENTRY_FEE}</li>
        </ul>
        <button className="btn-primary w-full py-4" disabled={!canAfford || !ready} onClick={start}>
          {!ready ? t('quiz.preparing') : canAfford ? `${t('battle.joinPre')}${BATTLE_ENTRY_FEE}${t('battle.joinPost')}` : t('battle.notEnough')}
        </button>
        <button className="btn-ghost w-full py-3" onClick={() => navigate('home')}>
          {t('common.back')}
        </button>
      </div>
    )
  }

  // ---- playing ----
  if (phase === 'playing') {
    const q = questions[index]
    const myLive = computeScore(logs)
    const style = (choice: string) => {
      if (!selected) return 'btn-ghost'
      if (choice === q.answer) return 'btn bg-success/90 text-white'
      if (choice === selected) return 'btn bg-danger/90 text-white'
      return 'btn bg-panel2 text-white/40'
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-between text-sm font-bold">
          <span className="text-white/50">
            {index + 1} / {questions.length}
          </span>
          <span className="text-accent2">SCORE {myLive.score}</span>
        </div>
        <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: `${((index + (selected ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>
        <div className="card p-6 text-center min-h-[110px] grid place-items-center">
          <div className="text-2xl font-black">{q.prompt}</div>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {q.choices.map((c) => (
            <button key={c} disabled={!!selected} onClick={() => answer(c, q)} className={`${style(c)} py-3.5`}>
              {c}
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ---- result ----
  const win = result?.win
  return (
    <div className="text-center py-8 animate-slideUp">
      <div className="text-6xl mb-2">{win ? '🏆' : '💧'}</div>
      <h2 className={`text-3xl font-black ${win ? 'text-gold' : 'text-white/70'}`}>
        {win ? 'WIN!' : 'LOSE'}
      </h2>
      <div className="card mt-6 p-5 space-y-2 text-left">
        <Row label={t('battle.myScore')} value={`${result?.myScore}`} />
        <Row label={`${result?.opponentName}`} value={`${result?.opponentScore}`} />
        <Row label={t('battle.correctCount')} value={`${result?.myCorrect} / ${BATTLE_QUESTIONS}`} />
        <Row label={t('battle.eloDelta')} value={`${(result?.eloDelta ?? 0) >= 0 ? '+' : ''}${result?.eloDelta}`} />
        <Row label={t('quiz.gainedCoins')} value={`🪙 +${result?.gainedCoin}`} />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="btn-ghost py-3" onClick={() => navigate('home')}>
          {t('quiz.toHome')}
        </button>
        <button className="btn-primary py-3" onClick={() => setPhase('intro')}>
          {t('quiz.again')}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-white/55">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  )
}
