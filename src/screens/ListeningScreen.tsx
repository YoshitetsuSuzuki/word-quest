import { useEffect, useMemo, useRef, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { Loading } from '../components/Loading'
import { speak, speakWord, wordFromPrompt, canSpeak } from '../utils/speech'
import { playCorrect, playWrong } from '../utils/audio'
import { wordErrorReportUrl } from '../utils/report'
import type { Question, AnswerOutcome } from '../types'

const SESSION_SIZE = 10

/** 例文文字列 "英文 — 日本語訳" を分解する */
function splitExample(example: string): { eng: string; jpn: string } {
  const i = example.indexOf(' — ')
  return i >= 0 ? { eng: example.slice(0, i), jpn: example.slice(i + 3) } : { eng: example, jpn: '' }
}

/** 文中の対象語を空欄(＿)にした文を返す。英語は単語境界で、中韓は部分文字列で置換する */
function clozeSentence(sentence: string, form: string): string {
  const blank = '＿'.repeat(Math.min(Math.max(form.length, 2), 8))
  if (/^[\x00-\x7f]+$/.test(form)) {
    // ASCII(英語): 単語境界つきで最初の一致を置換
    const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return sentence.replace(new RegExp(`\\b${escaped}\\b`), blank)
  }
  // CJK: 単語境界が無いので最初の部分一致を置換
  return sentence.replace(form, blank)
}

/**
 * リスニングモード。
 * 英語: 例文をTTSが読み上げ、空欄に入る単語をスペル入力（正解は例文中の実形と完全一致）。
 * 中国語・韓国語: 単語の音声だけを聴いて意味を4択（単語は答え合わせまで非表示）。
 */
export function ListeningScreen() {
  const { engine, answerQuestion, ensureCategory, isCategoryReady } = useGame()
  const { navigate, category, studyLevel, sfxEnabled, sfxVolume, t, locale } = useNav()

  const ready = isCategoryReady(category)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    void ensureCategory(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    if (!ready || questions.length > 0) return
    setQuestions(engine.buildListeningSession(category, SESSION_SIZE, studyLevel, locale))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const [index, setIndex] = useState(0)
  const [combo, setCombo] = useState(0)
  // 穴埋めの回答スタイル: スペル入力 or 4択(設定は記憶する)
  const [answerStyle, setAnswerStyleState] = useState<'type' | 'choice'>(
    () => (localStorage.getItem('wordquest.listenStyle') === 'choice' ? 'choice' : 'type'),
  )
  const setAnswerStyle = (s: 'type' | 'choice') => {
    setAnswerStyleState(s)
    localStorage.setItem('wordquest.listenStyle', s)
  }
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null)
  const [answered, setAnswered] = useState(false)
  const [typed, setTyped] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionCoin, setSessionCoin] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = questions[index]
  const isCloze = !!q?.example && !!q?.exampleForm
  const ex = q?.example ? splitExample(q.example) : null
  // 例文訳・意味のロケール対応(ja では従来の和訳/answer にフォールバック＝挙動不変)
  const exTranslation = q ? engine.localizedExample(q, locale)?.translation ?? (ex?.jpn ?? '') : ''
  const meaningGloss = q ? engine.localizedGloss(q, locale) : ''
  // 音声→意味4択(非cloze)の選択肢。ja は従来の q.choices、それ以外はロケール別4択を問題ごとに固定。
  const meaningChoices = useMemo(
    () => (!q ? [] : locale === 'ja' ? q.choices : engine.localizedChoices(q, locale)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q?.id, locale],
  )
  // 穴埋めのTTS言語(文章読み上げ用)
  const speechLang = category === 'chinese' ? 'zh-CN' : category === 'korean' ? 'ko-KR' : 'en-US'
  // スペル入力は英語のみ。中韓はIME/活用の都合で4択専用
  const effectiveStyle: 'type' | 'choice' = category === 'english' ? answerStyle : 'choice'

  // 4択スタイル用: 同セッションの他の問題の表層形から誤答肢を3つ作る。
  // 韓国語は「用言(다終わり)/体言」が文法上区別されるため、同じ型の語を優先して選ぶ(答えが割れにくくする)。
  const [wordChoices, setWordChoices] = useState<string[]>([])
  useEffect(() => {
    if (!isCloze || !q?.exampleForm) return
    const answer = q.exampleForm!
    const isPredicate = (s: string) => /다$/.test(s)
    const same = isPredicate(answer)
    const others = questions
      .filter((o, i) => i !== index && o.exampleForm && o.exampleForm.toLowerCase() !== answer.toLowerCase())
      .map((o) => o.exampleForm!)
    const shuffled = others.sort(() => Math.random() - 0.5)
    const preferred = shuffled.filter((f) => isPredicate(f) === same)
    const rest = shuffled.filter((f) => isPredicate(f) !== same)
    const picked: string[] = []
    for (const f of [...preferred, ...rest]) {
      if (picked.length >= 3) break
      if (!picked.includes(f)) picked.push(f)
    }
    setWordChoices([answer, ...picked].sort(() => Math.random() - 0.5))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length])

  // 出題時に自動再生（リスニングなので常に読み上げる）
  useEffect(() => {
    if (!q || finished) return
    if (isCloze && ex) speak(ex.eng, speechLang)
    else speakWord(wordFromPrompt(q.prompt), category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length])

  if (!ready || questions.length === 0) {
    return <Loading label={t('listening.preparing')} />
  }

  const replay = () => {
    if (isCloze && ex) speak(ex.eng, speechLang)
    else speakWord(wordFromPrompt(q.prompt), category)
  }

  const finish = (correct: boolean) => {
    const newCombo = combo + 1
    const res = answerQuestion(q, correct ? q.answer : '', newCombo)
    setOutcome(res)
    setAnswered(true)
    if (sfxEnabled) (correct ? playCorrect : playWrong)(sfxVolume)
    if (correct) {
      setCombo(newCombo)
      setSessionCorrect((c) => c + 1)
      setSessionCoin((c) => c + res.gainedCoin)
    } else {
      setCombo(0)
    }
  }

  const submitTyped = () => {
    if (answered || !q.exampleForm) return
    finish(typed.trim().toLowerCase() === q.exampleForm.toLowerCase())
  }

  const selectChoice = (choice: string) => {
    if (answered) return
    setSelected(choice)
    // 非ja では choice は訳語。正解の訳語なら q.answer 基準で正誤判定(ja では meaningGloss===answer なので不変)。
    finish(choice === meaningGloss)
  }

  /** 穴埋め4択スタイル: 単語の選択肢で回答 */
  const selectForm = (f: string) => {
    if (answered || !q.exampleForm) return
    setTyped(f) // 開示表示用
    finish(f.toLowerCase() === q.exampleForm.toLowerCase())
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setFinished(true)
      return
    }
    setIndex((i) => i + 1)
    setOutcome(null)
    setAnswered(false)
    setTyped('')
    setSelected(null)
  }

  if (finished) {
    return (
      <div className="text-center py-10 animate-slideUp">
        <div className="text-6xl mb-3">🎧</div>
        <h2 className="text-2xl font-black">{t('listening.complete')}</h2>
        <div className="card mt-6 p-5 space-y-2 text-left">
          <Row label={t('quiz.correctCount')} value={`${sessionCorrect} / ${questions.length}`} />
          <Row label={t('quiz.gainedCoins')} value={`🪙 ${sessionCoin}`} />
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

  const word = wordFromPrompt(q.prompt)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50 font-bold">
          {index + 1} / {questions.length}
          <span className="ml-2 text-accent2">{t('listening.label')}</span>
        </span>
        {combo >= 2 && <span className="animate-pop font-black text-gold">🔥 {combo} COMBO</span>}
      </div>

      {/* 音声カード */}
      <div className="card p-6 text-center min-h-[150px] grid place-items-center relative">
        <div className="w-full">
          <div className="text-xs text-white/40 mb-3">
            {isCloze
              ? effectiveStyle === 'type'
                ? t('listening.typeBlank')
                : t('listening.pickBlank')
              : t('listening.pickMeaning')}
          </div>
          {canSpeak() && (
            <button
              onClick={replay}
              aria-label={t('listening.replay')}
              className="w-14 h-14 grid place-items-center rounded-full bg-accent/20 border border-accent/40 text-2xl active:scale-90 transition mx-auto"
            >
              🔊
            </button>
          )}
          {isCloze && ex && (
            <div className="mt-4 text-left space-y-1.5">
              <div className="font-bold leading-relaxed">
                {answered ? ex.eng : clozeSentence(ex.eng, q.exampleForm!)}
              </div>
              <div className="text-xs text-white/50">{exTranslation}</div>
            </div>
          )}
          {answered && (
            <div className="mt-3 animate-slideUp">
              <span className="font-black text-lg">{word}</span>
              {q.pronunciation && <span className="ml-2 text-accent2 font-mono font-bold text-sm">{q.pronunciation}</span>}
              <span className="ml-2 text-white/70">= {meaningGloss}</span>
            </div>
          )}
        </div>
        {outcome && (
          <div className="absolute top-3 right-4 text-right pointer-events-none">
            <div className={`font-black text-xl ${outcome.correct ? 'text-success' : 'text-danger'}`}>
              {outcome.correct ? t('listening.correctMark') : '❌'}
            </div>
            {outcome.correct && <div className="text-accent2 font-black text-sm">+{outcome.gainedXp} XP</div>}
          </div>
        )}
      </div>

      {/* 回答エリア */}
      {isCloze ? (
        <div className="space-y-3">
          {!answered && (
            <>
              {/* 回答スタイル切替(スペル入力は英語のみ) */}
              {category === 'english' && (
                <div className="flex justify-center gap-2">
                  {(
                    [
                      ['type', t('listening.styleType')],
                      ['choice', t('listening.styleChoice')],
                    ] as const
                  ).map(([s, label]) => (
                    <button
                      key={s}
                      onClick={() => setAnswerStyle(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        answerStyle === s ? 'bg-accent2 text-night border-accent2' : 'bg-panel2 text-white/60 border-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {effectiveStyle === 'type' ? (
                <>
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                    placeholder={t('listening.inputPlaceholder')}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-4 text-lg font-bold text-center outline-none focus:border-accent"
                  />
                  <button className="btn-primary w-full py-4" disabled={!typed.trim()} onClick={submitTyped}>
                    {t('listening.check')}
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {wordChoices.map((f) => (
                    <button key={f} onClick={() => selectForm(f)} className="btn-ghost py-4 text-base font-bold">
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {meaningChoices.map((choice) => {
            let cls = 'btn-ghost'
            if (answered) {
              if (choice === meaningGloss) cls = 'btn bg-success/90 text-white ring-2 ring-success'
              else if (choice === selected) cls = 'btn bg-danger/90 text-white ring-2 ring-danger'
              else cls = 'btn bg-panel2 text-white/40'
            }
            return (
              <button key={choice} disabled={answered} onClick={() => selectChoice(choice)} className={`${cls} py-4 text-base`}>
                {choice}
              </button>
            )
          })}
        </div>
      )}

      {answered && (
        <div className="animate-slideUp space-y-3">
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
