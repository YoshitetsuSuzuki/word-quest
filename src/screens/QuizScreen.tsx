import { useEffect, useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ReviewScheduler } from '../core/ReviewScheduler'
import { equippedEffect } from '../modules/shop/shopLogic'
import { Loading } from '../components/Loading'
import { speakWord, wordFromPrompt, canSpeak } from '../utils/speech'
import { playCorrect, playWrong } from '../utils/audio'
import { wordErrorReportUrl } from '../utils/report'
import type { Question, AnswerOutcome } from '../types'

const SESSION_SIZE = 10

export function QuizScreen() {
  const game = useGame()
  const { user, engine, answerQuestion, ensureCategory, isCategoryReady } = game
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

  // 問題が切り替わったら自動で発音を再生（音声ONのとき）
  useEffect(() => {
    const q = questions[index]
    if (q && soundEnabled && !finished) {
      speakWord(wordFromPrompt(q.prompt), category)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length])

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
    if (sfxEnabled) (res.correct ? playCorrect : playWrong)(sfxVolume)
    if (res.correct) {
      setCombo(newCombo)
      setSessionCorrect((c) => c + 1)
      setSessionCoin((c) => c + res.gainedCoin)
    } else {
      setCombo(0)
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
        <span className="text-white/50 font-bold">
          {index + 1} / {questions.length}
          {quizMode === 'review' && <span className="ml-2 text-accent2">{t('quiz.reviewMode')}</span>}
        </span>
        {combo >= 2 && (
          <span key={combo} className="animate-pop font-black text-gold">
            🔥 {combo} COMBO
          </span>
        )}
      </div>

      {/* 問題カード */}
      <div className="card p-6 text-center min-h-[140px] grid place-items-center relative">
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

      {/* 解説 & 次へ */}
      {selected && (
        <div className="animate-slideUp space-y-3">
          {!outcome?.correct && (
            <div className="card p-4 text-sm">
              <div className="font-bold text-danger mb-1">{t('quiz.answer')} {correctGloss}</div>
              {ex && (
                <div className="text-white/60">
                  {t('quiz.example')} {ex.text}{ex.translation && ` — ${ex.translation}`}
                </div>
              )}
            </div>
          )}
          {outcome?.correct && ex && (
            <div className="text-center text-xs text-white/40">
              {t('quiz.example')} {ex.text}{ex.translation && ` — ${ex.translation}`}
            </div>
          )}
          <button className="btn-primary w-full py-4" onClick={next}>
            {index + 1 >= questions.length ? t('quiz.result') : t('quiz.next')}
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
