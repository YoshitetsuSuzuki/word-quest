import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ReviewScheduler } from '../core/ReviewScheduler'
import { equippedEffect } from '../modules/shop/shopLogic'
import { Loading } from '../components/Loading'
import { speak, speakWord, wordFromPrompt, canSpeak, langForCategory } from '../utils/speech'
import { playCorrect, playWrong, playCombo } from '../utils/audio'
import { hapticCorrect, hapticWrong, hapticCombo } from '../utils/haptics'
import { comboTierOf, isComboMilestone } from '../core/comboTier'
import { petBonus } from '../core/PetEngine'
import { todayStr } from '../state/dateUtils'
import { wordErrorReportUrl } from '../utils/report'
import type { Question, AnswerOutcome } from '../types'

const SESSION_SIZE = 10
const SPEED_MS = 8000 // スピードモードの1問あたり制限時間

export function QuizScreen() {
  const game = useGame()
  const { user, engine, answerQuestion, ensureCategory, isCategoryReady, toggleDeck } = game
  const { quizMode, navigate, category, customIds, setCustomIds, soundEnabled, studyLevel, sfxEnabled, sfxVolume, t, locale } = useNav()

  const ready = isCategoryReady(category)
  const [questions, setQuestions] = useState<Question[]>([])
  const [built, setBuilt] = useState(false) // セッション構築を試みたか(空プールで無限ロードにしないため)

  // カテゴリのデータをロード
  useEffect(() => {
    void ensureCategory(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  // ロード完了後にセッションを構築（初回一度だけ）
  useEffect(() => {
    if (!ready || built) return
    let s: Question[]
    if (customIds && customIds.length > 0) {
      // 弱点特訓 / 自分の単語帳テスト: 指定IDだけで出題（一度きり消費）
      s = engine.buildReviewSession(customIds, Math.min(SESSION_SIZE, customIds.length))
      if (s.length === 0) s = engine.buildSession(category, SESSION_SIZE)
      setCustomIds(null)
    } else if (quizMode === 'review') {
      const dueIds = ReviewScheduler.dueQuestionIds(user.reviewQueue)
      const ids = dueIds.length > 0 ? dueIds : user.reviewQueue.map((r) => r.questionId)
      s = engine.buildReviewSession(ids, SESSION_SIZE)
      if (s.length === 0) s = engine.buildSession(category, SESSION_SIZE)
    } else if (quizMode === 'phrase') {
      s = engine.buildPhraseSession(category, SESSION_SIZE, studyLevel, locale)
    } else {
      s = engine.buildSession(category, SESSION_SIZE, studyLevel, locale)
    }
    setQuestions(s)
    setBuilt(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const [index, setIndex] = useState(0)
  const [combo, setCombo] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionCoin, setSessionCoin] = useState(0)
  const [finished, setFinished] = useState(false)
  const [popKey, setPopKey] = useState(0)
  const [milestone, setMilestone] = useState<{ label: string; emoji: string; color: string; key: number } | null>(null)
  const isSpeed = quizMode === 'speed'
  const [timeLeft, setTimeLeft] = useState(SPEED_MS)

  // 問題が切り替わったら自動で発音を再生（音声ONのとき）
  useEffect(() => {
    const q = questions[index]
    if (q && soundEnabled && !finished) {
      speakWord(wordFromPrompt(q.prompt), category)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length])

  // スピードモード: 制限時間のカウントダウン。0で時間切れ＝不正解にして先へ。
  useEffect(() => {
    if (!isSpeed || finished || selected) return
    const q = questions[index]
    if (!q) return
    setTimeLeft(SPEED_MS)
    const started = Date.now()
    const iv = window.setInterval(() => {
      const left = SPEED_MS - (Date.now() - started)
      if (left <= 0) {
        window.clearInterval(iv)
        const res = answerQuestion(q, '__timeout__', combo + 1)
        setSelected('__timeout__')
        setOutcome(res)
        setCombo(0)
        if (sfxEnabled) playWrong(sfxVolume)
        hapticWrong()
      } else {
        setTimeLeft(left)
      }
    }, 100)
    return () => window.clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, selected, isSpeed, finished])

  // ja母語ネイティブ言語(英/中/韓)は保存済み q.choices（挙動不変）。
  // ピボット言語(西/仏/独)は正解が日本語訳(glosses.ja)なので、保存済み(英語)ではなく
  // ロケール別4択を生成する。非jaロケールも同様に生成。
  // 問題ごとに一度だけ計算して再シャッフルを防ぐ。フックは早期returnより前に置く(Rules of Hooks)。
  const qForChoices = questions[index]
  const displayChoices = useMemo(
    () => {
      if (!qForChoices) return []
      const nativeJa = locale === 'ja' && engine.localizedGloss(qForChoices, 'ja') === qForChoices.answer
      return nativeJa ? qForChoices.choices : engine.localizedChoices(qForChoices, locale)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qForChoices?.id, locale],
  )

  if (built && questions.length === 0) {
    // このジャンル×母語で出題できる語がない(例: 英語訳がまだ整備されていない)
    return (
      <div className="text-center py-16 animate-slideUp space-y-4">
        <div className="text-5xl">🚧</div>
        <p className="text-white/60 text-sm px-6">{t('quiz.emptyPool')}</p>
        <button className="btn-primary px-8 py-3" onClick={() => navigate('home')}>
          {t('quiz.toHome')}
        </button>
      </div>
    )
  }
  if (!ready || questions.length === 0) {
    return <Loading label={t('quiz.preparing')} />
  }

  const q = questions[index]
  const effect = equippedEffect(user)
  const correctGloss = engine.localizedGloss(q, locale)
  const ex = engine.localizedExample(q, locale)

  const onSelect = (choice: string) => {
    if (selected) return
    const newCombo = combo + 1 // 正解ならこのコンボ数で報酬計算
    // 下流ロジック(AnswerChecker/wordStats/復習)は q.answer 基準。
    // 非ja では選択肢が訳語なので、正解の訳語を選んだら q.answer に正規化して渡す(ja では localizedGloss===answer なので不変)。
    const answerForCheck = choice === correctGloss ? q.answer : choice
    const res = answerQuestion(q, answerForCheck, newCombo)
    setSelected(choice)
    setOutcome(res)
    setPopKey((k) => k + 1)
    if (res.correct) {
      setCombo(newCombo)
      setSessionCorrect((c) => c + 1)
      setSessionCoin((c) => c + res.gainedCoin)
      // コンボ節目は特別演出（音・触覚・バナー）、通常正解は軽い手応え
      if (isComboMilestone(newCombo)) {
        const tier = comboTierOf(newCombo)
        if (sfxEnabled) playCombo(sfxVolume, tier?.tier ?? 1)
        hapticCombo()
        if (tier) setMilestone({ label: tier.label, emoji: tier.emoji, color: tier.color, key: newCombo })
      } else {
        if (sfxEnabled) playCorrect(sfxVolume)
        hapticCorrect()
      }
    } else {
      setCombo(0)
      if (sfxEnabled) playWrong(sfxVolume)
      hapticWrong()
    }
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setOutcome(null)
    setMilestone(null)
  }

  if (finished) {
    return (
      <div className="text-center py-10 animate-slideUp">
        <div className="text-6xl mb-3">🎓</div>
        <h2 className="text-2xl font-black">{t('quiz.complete')}</h2>
        <div className="card mt-6 p-5 space-y-2 text-left">
          <Row label={t('quiz.correctCount')} value={`${sessionCorrect} / ${questions.length}`} />
          <Row label={t('quiz.gainedCoins')} value={`🪙 ${sessionCoin}`} />
          <Row label={t('quiz.maxCombo')} value={`🔥 ${combo}`} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost py-3" onClick={() => navigate('home')}>
            {t('quiz.toHome')}
          </button>
          <button className="btn-primary py-3" onClick={() => window.location.reload()}>
            {t('quiz.again')}
          </button>
        </div>
      </div>
    )
  }

  const choiceStyle = (choice: string): string => {
    if (!selected) return 'btn-ghost'
    if (choice === correctGloss) return 'btn bg-success/90 text-white ring-2 ring-success'
    if (choice === selected) return 'btn bg-danger/90 text-white ring-2 ring-danger'
    return 'btn bg-panel2 text-white/40'
  }

  return (
    <div className="space-y-5">
      {/* 進捗 & コンボ */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50 font-bold flex items-center gap-2">
          <span>
            {index + 1} / {questions.length}
            {quizMode === 'review' && <span className="ml-2 text-accent2">{t('quiz.reviewMode')}</span>}
          </span>
          {(() => {
            const b = petBonus(user, todayStr())
            if (b.percent <= 0) return null
            const dim = b.mood === 'hungry' || b.mood === 'sad'
            return (
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-black ${dim ? 'bg-danger/15 text-danger' : 'bg-accent2/15 text-accent2'}`} title={t('quiz.petBonusHint')}>
                🐾 +{b.percent}%{dim ? ' ↓' : ''}
              </span>
            )
          })()}
        </span>
        {combo >= 2 && (() => {
          const tier = comboTierOf(combo)
          return (
            <span key={combo} className={`animate-pop font-black ${tier?.color ?? 'text-gold'}`}>
              {tier ? `${tier.emoji} ${combo} ${tier.label}` : `🔥 ${combo} COMBO`}
            </span>
          )
        })()}
      </div>

      {/* スピードモードの残り時間バー */}
      {isSpeed && !selected && (
        <div className="h-1.5 rounded-full bg-panel2 overflow-hidden -mt-2">
          <div
            className={`h-full transition-[width] duration-100 ease-linear ${timeLeft < 3000 ? 'bg-danger' : 'bg-accent2'}`}
            style={{ width: `${Math.max(0, (timeLeft / SPEED_MS) * 100)}%` }}
          />
        </div>
      )}

      {/* 問題カード（不正解時は横揺れ） */}
      <div className={`card p-6 text-center min-h-[140px] grid place-items-center relative ${selected && !outcome?.correct ? 'animate-shake ring-2 ring-danger/60' : ''}`}>
        <div>
          <div className="text-xs text-white/40 mb-2">{t('quiz.pickMeaning')}</div>
          <div className="text-2xl font-black">{locale === 'ja' ? q.prompt : wordFromPrompt(q.prompt)}</div>
          <div className="mt-1.5 flex items-center justify-center gap-2">
            {q.pronunciation && <span className="text-base text-accent2 font-mono font-bold">{q.pronunciation}</span>}
            {canSpeak() && (
              <button
                onClick={() => speakWord(wordFromPrompt(q.prompt), category)}
                aria-label={t('quiz.speak')}
                className="w-7 h-7 grid place-items-center rounded-full bg-white/10 active:scale-90 transition text-sm"
              >
                🔊
              </button>
            )}
          </div>
          <div className="mt-2 text-[11px] text-white/30">{t('quiz.difficulty')} {'★'.repeat(q.difficulty)}</div>
        </div>

        {/* 報酬フロート */}
        {outcome?.correct && (
          <div key={popKey} className="absolute top-3 right-4 animate-floatUp text-right pointer-events-none">
            <div className="text-accent2 font-black">+{outcome.gainedXp} XP</div>
            <div className="text-gold font-black">+{outcome.gainedCoin} 🪙</div>
          </div>
        )}
        {/* 正解エフェクト */}
        {outcome?.correct && effect && (
          <div key={`fx-${popKey}`} className="absolute inset-0 grid place-items-center pointer-events-none text-6xl animate-pop opacity-80">
            {effect}
          </div>
        )}
        {/* コンボ節目のバナー */}
        {milestone && (
          <div key={`ms-${milestone.key}`} className="absolute inset-0 grid place-items-center pointer-events-none animate-pop">
            <div className="px-5 py-2 rounded-2xl bg-night/85 border border-white/15 shadow-2xl animate-glow">
              <div className={`text-2xl font-black ${milestone.color}`}>{milestone.emoji} {milestone.label}</div>
              <div className="text-center text-xs text-white/60 font-bold">{milestone.key} COMBO!</div>
            </div>
          </div>
        )}
      </div>

      {/* 選択肢 */}
      <div className="grid grid-cols-1 gap-3">
        {displayChoices.map((choice) => (
          <button
            key={choice}
            disabled={!!selected}
            onClick={() => onSelect(choice)}
            className={`${choiceStyle(choice)} py-4 text-base`}
          >
            {choice}
          </button>
        ))}
      </div>

      {/* 解説 & 次へ（「次へ」は最上部に置いてスクロール不要に） */}
      {selected && (
        <div className="animate-slideUp space-y-3">
          <button className="btn-primary w-full py-4" onClick={next}>
            {index + 1 >= questions.length ? t('quiz.result') : t('quiz.next')}
          </button>

          {/* 不正解時は正解を表示。例文は音声つき */}
          {(!outcome?.correct || ex) && (
            <div className="card p-3 text-sm space-y-1.5">
              {!outcome?.correct && <div className="font-bold text-danger">{t('quiz.answer')} {correctGloss}</div>}
              {ex && (
                <div className="flex items-start gap-2 text-white/60">
                  <span className="flex-1">{t('quiz.example')} {ex.text}{ex.translation && ` — ${ex.translation}`}</span>
                  {canSpeak() && (
                    <button
                      onClick={() => speak(ex.text, langForCategory(category))}
                      aria-label={t('quiz.speak')}
                      className="shrink-0 w-7 h-7 grid place-items-center rounded-full bg-white/10 text-sm active:scale-90 transition"
                    >
                      🔊
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => toggleDeck(q.id)}
            className={`w-full py-2.5 rounded-xl text-sm font-bold transition border ${
              user.customDeck.includes(q.id)
                ? 'bg-gold/15 text-gold border-gold/40'
                : 'bg-panel2 text-white/60 border-white/10 active:bg-white/5'
            }`}
          >
            {user.customDeck.includes(q.id) ? t('study.inDeckMark') : t('study.addDeck')}
          </button>
          <div className="text-center">
            <a
              href={wordErrorReportUrl(q)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-white/30 underline underline-offset-2"
            >
              {t('common.report')}
            </a>
          </div>
        </div>
      )}
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
