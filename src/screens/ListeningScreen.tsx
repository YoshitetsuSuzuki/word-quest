import { useEffect, useRef, useState } from 'react'
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

/** 英文中の表層形を空欄(____)にした文を返す */
function clozeSentence(eng: string, form: string): string {
  const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return eng.replace(new RegExp(`\\b${escaped}\\b`), '＿'.repeat(Math.min(form.length, 8)))
}

/**
 * リスニングモード。
 * 英語: 例文をTTSが読み上げ、空欄に入る単語をスペル入力（正解は例文中の実形と完全一致）。
 * 中国語・韓国語: 単語の音声だけを聴いて意味を4択（単語は答え合わせまで非表示）。
 */
export function ListeningScreen() {
  const { engine, answerQuestion, ensureCategory, isCategoryReady } = useGame()
  const { navigate, category, studyLevel, sfxEnabled, sfxVolume } = useNav()

  const ready = isCategoryReady(category)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    void ensureCategory(category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  useEffect(() => {
    if (!ready || questions.length > 0) return
    setQuestions(engine.buildListeningSession(category, SESSION_SIZE, studyLevel))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const [index, setIndex] = useState(0)
  const [combo, setCombo] = useState(0)
  const [outcome, setOutcome] = useState<AnswerOutcome | null>(null)
  const [answered, setAnswered] = useState(false)
  const [typed, setTyped] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [sessionCoin, setSessionCoin] = useState(0)
  const [finished, setFinished] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const q = questions[index]
  const isCloze = category === 'english' && !!q?.example && !!q?.exampleForm
  const ex = q?.example ? splitExample(q.example) : null

  // 出題時に自動再生（リスニングなので常に読み上げる）
  useEffect(() => {
    if (!q || finished) return
    if (isCloze && ex) speak(ex.eng, 'en-US')
    else speakWord(wordFromPrompt(q.prompt), category)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length])

  if (!ready || questions.length === 0) {
    return <Loading label="リスニングを準備中…" />
  }

  const replay = () => {
    if (isCloze && ex) speak(ex.eng, 'en-US')
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
    finish(choice === q.answer)
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
        <h2 className="text-2xl font-black">リスニング完了！</h2>
        <div className="card mt-6 p-5 space-y-2 text-left">
          <Row label="正解数" value={`${sessionCorrect} / ${questions.length}`} />
          <Row label="獲得コイン" value={`🪙 ${sessionCoin}`} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost py-3" onClick={() => navigate('home')}>
            ホームへ
          </button>
          <button className="btn-primary py-3" onClick={() => window.location.reload()}>
            もう一度
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
          <span className="ml-2 text-accent2">🎧 リスニング</span>
        </span>
        {combo >= 2 && <span className="animate-pop font-black text-gold">🔥 {combo} COMBO</span>}
      </div>

      {/* 音声カード */}
      <div className="card p-6 text-center min-h-[150px] grid place-items-center relative">
        <div className="w-full">
          <div className="text-xs text-white/40 mb-3">{isCloze ? '文を聴いて、空欄の単語を入力しよう' : '音声を聴いて、意味を選ぼう'}</div>
          {canSpeak() && (
            <button
              onClick={replay}
              aria-label="もう一度聞く"
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
              <div className="text-xs text-white/50">{ex.jpn}</div>
            </div>
          )}
          {answered && (
            <div className="mt-3 animate-slideUp">
              <span className="font-black text-lg">{word}</span>
              {q.pronunciation && <span className="ml-2 text-accent2 font-mono font-bold text-sm">{q.pronunciation}</span>}
              <span className="ml-2 text-white/70">= {q.answer}</span>
            </div>
          )}
        </div>
        {outcome && (
          <div className="absolute top-3 right-4 text-right pointer-events-none">
            <div className={`font-black text-xl ${outcome.correct ? 'text-success' : 'text-danger'}`}>
              {outcome.correct ? '⭕ 正解！' : '❌'}
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
              <input
                ref={inputRef}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
                placeholder="聞こえた単語を入力"
                autoCapitalize="off"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-4 text-lg font-bold text-center outline-none focus:border-accent"
              />
              <button className="btn-primary w-full py-4" disabled={!typed.trim()} onClick={submitTyped}>
                答え合わせ
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {q.choices.map((choice) => {
            let cls = 'btn-ghost'
            if (answered) {
              if (choice === q.answer) cls = 'btn bg-success/90 text-white ring-2 ring-success'
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
            {index + 1 >= questions.length ? '結果を見る' : '次の問題へ →'}
          </button>
          <div className="text-center">
            <a
              href={wordErrorReportUrl(q)}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] text-white/30 underline underline-offset-2"
            >
              ⚠️ この単語の誤りを報告
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
