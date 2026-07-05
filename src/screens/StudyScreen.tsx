import { useMemo, useState, type ReactNode } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ReviewScheduler } from '../core/ReviewScheduler'
import { speakWord, canSpeak } from '../utils/speech'
import type { Question, Category } from '../types'

/** prompt「apple の意味は？」から見出し語 apple を取り出す */
function wordOf(q: Question): string {
  return q.prompt.match(/「(.+?)」/)?.[1] ?? q.prompt
}

type Tab = 'weak' | 'learned' | 'deck'

export function StudyScreen() {
  const { user, engine, isCategoryReady, toggleDeck } = useGame()
  const { navigate, setQuizMode, setCustomIds, category } = useNav()
  const ready = isCategoryReady(category)

  const dueCount = ReviewScheduler.dueQuestionIds(user.reviewQueue).length
  const deckSet = useMemo(() => new Set(user.customDeck), [user.customDeck])

  // 正答率つきの挑戦済み単語（低い順＝苦手順）
  const attempted = useMemo(() => {
    if (!ready) return []
    return Object.entries(user.wordStats)
      .filter(([, s]) => s.t > 0)
      .map(([id, s]) => ({ id, q: engine.getById(id), rate: s.c / s.t, tries: s.t }))
      .filter((x): x is { id: string; q: Question; rate: number; tries: number } => !!x.q)
      .sort((a, b) => a.rate - b.rate || b.tries - a.tries)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.wordStats, ready])

  const learned = useMemo(() => {
    if (!ready) return []
    return user.learnedQuestionIds.map((id) => engine.getById(id)).filter((q): q is Question => !!q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.learnedQuestionIds, ready])

  const deck = useMemo(() => {
    if (!ready) return []
    return user.customDeck.map((id) => engine.getById(id)).filter((q): q is Question => !!q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.customDeck, ready])

  const [tab, setTab] = useState<Tab>('weak')
  const [query, setQuery] = useState('')

  const startReview = () => {
    setCustomIds(null)
    setQuizMode('review')
    navigate('quiz')
  }

  // 正答率の低い単語を集中特訓
  const startWeakDrill = () => {
    const ids = attempted.slice(0, 10).map((x) => x.id)
    if (ids.length === 0) return
    setCustomIds(ids)
    navigate('quiz')
  }

  // 自分の単語帳をテスト
  const startDeckTest = () => {
    if (user.customDeck.length === 0) return
    setCustomIds([...user.customDeck])
    navigate('quiz')
  }

  const filteredLearned = query
    ? learned.filter((q) => wordOf(q).includes(query.toLowerCase()) || q.answer.includes(query))
    : learned

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">📚 まなび</h2>

      {/* 今日の復習 & 弱点特訓 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          className="card p-4 text-left active:scale-95 transition disabled:opacity-40"
          disabled={user.reviewQueue.length === 0}
          onClick={startReview}
        >
          <div className="text-3xl">🔁</div>
          <div className="mt-1 font-bold text-sm">今日の復習</div>
          <div className="text-[11px] text-white/45">{dueCount > 0 ? `${dueCount}問が頃合い` : '待ちなし'}</div>
        </button>
        <button
          className="card p-4 text-left active:scale-95 transition disabled:opacity-40"
          disabled={attempted.length === 0}
          onClick={startWeakDrill}
        >
          <div className="text-3xl">🎯</div>
          <div className="mt-1 font-bold text-sm">弱点特訓</div>
          <div className="text-[11px] text-white/45">正答率が低い順に出題</div>
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1.5">
        {(
          [
            ['weak', `😰 苦手 ${attempted.length ? `(${attempted.length})` : ''}`],
            ['learned', `📖 単語帳 ${learned.length ? `(${learned.length})` : ''}`],
            ['deck', `⭐ マイ ${deck.length ? `(${deck.length})` : ''}`],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${tab === t ? 'bg-accent text-white' : 'bg-panel2 text-white/50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 苦手な単語（正答率つき） */}
      {tab === 'weak' &&
        (attempted.length === 0 ? (
          <EmptyState emoji="🌱" text="まだデータがありません。クイズを解くと、正答率の低い単語がここに集まります。" />
        ) : (
          <div className="space-y-2">
            {attempted.slice(0, 50).map(({ id, q, rate, tries }) => (
              <WordRow
                key={id}
                q={q}
                inDeck={deckSet.has(id)}
                onToggle={() => toggleDeck(id)}
                right={
                  <span className={`text-xs font-bold tabular-nums ${rate < 0.5 ? 'text-danger' : rate < 0.8 ? 'text-gold' : 'text-success'}`}>
                    {Math.round(rate * 100)}%
                    <span className="text-white/30 ml-1">({tries})</span>
                  </span>
                }
              />
            ))}
          </div>
        ))}

      {/* 単語帳（覚えた語） */}
      {tab === 'learned' &&
        (learned.length === 0 ? (
          <EmptyState emoji="📖" text="覚えた単語がここに並びます。クイズで正解すると追加されます。" />
        ) : (
          <div className="space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="単語・意味で検索"
              className="w-full bg-panel2 rounded-xl px-4 py-2.5 text-sm outline-none border border-white/10 focus:border-accent2"
            />
            {filteredLearned.slice(0, 100).map((q) => (
              <WordRow key={q.id} q={q} inDeck={deckSet.has(q.id)} onToggle={() => toggleDeck(q.id)} right={<span className="text-[10px] text-white/30">Lv{q.difficulty}</span>} />
            ))}
            {filteredLearned.length > 100 && <div className="text-center text-xs text-white/40 py-2">ほか {filteredLearned.length - 100} 語</div>}
          </div>
        ))}

      {/* マイ単語帳（暗記カード） */}
      {tab === 'deck' &&
        (deck.length === 0 ? (
          <EmptyState emoji="⭐" text="苦手・単語帳リストの ☆ をタップすると、自分専用の単語帳に追加できます。カードはタップで裏返せます。" />
        ) : (
          <div className="space-y-3">
            <button className="btn-primary w-full py-3" onClick={startDeckTest}>
              📝 マイ単語帳をテストする（{deck.length}語）
            </button>
            {deck.map((q) => (
              <FlashCard key={q.id} q={q} category={category} onRemove={() => toggleDeck(q.id)} />
            ))}
          </div>
        ))}
    </div>
  )
}

function WordRow({ q, inDeck, onToggle, right }: { q: Question; inDeck: boolean; onToggle: () => void; right?: ReactNode }) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-baseline gap-2">
          {wordOf(q)}
          {q.pronunciation && <span className="text-[11px] text-accent2/70 font-mono font-normal">{q.pronunciation}</span>}
        </div>
        <div className="text-sm text-white/55 truncate">{q.answer}</div>
      </div>
      {right}
      <button
        onClick={onToggle}
        aria-label="マイ単語帳"
        className={`shrink-0 text-xl w-8 h-8 grid place-items-center rounded-lg transition ${inDeck ? 'text-gold' : 'text-white/25'}`}
      >
        {inDeck ? '★' : '☆'}
      </button>
    </div>
  )
}

/** タップで表裏（単語⇄意味）を切り替える暗記カード */
function FlashCard({ q, category, onRemove }: { q: Question; category: Category; onRemove: () => void }) {
  const [showMeaning, setShowMeaning] = useState(false)
  return (
    <div className="card p-0 overflow-hidden relative">
      {canSpeak() && (
        <button
          onClick={() => speakWord(wordOf(q), category)}
          aria-label="発音を聞く"
          className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/10 active:scale-90 transition z-10"
        >
          🔊
        </button>
      )}
      <button onClick={() => setShowMeaning((v) => !v)} className="w-full p-5 text-center active:scale-[0.98] transition">
        {showMeaning ? (
          <div className="text-xl font-black text-accent2 animate-pop">{q.answer}</div>
        ) : (
          <div>
            <div className="text-2xl font-black">{wordOf(q)}</div>
            {q.pronunciation && <div className="text-sm text-accent2/70 font-mono mt-1">{q.pronunciation}</div>}
          </div>
        )}
        <div className="text-[10px] text-white/30 mt-2">{showMeaning ? '意味' : 'タップで意味を表示'}</div>
      </button>
      <button onClick={onRemove} className="w-full py-2 text-xs text-white/40 border-t border-white/5 active:bg-white/5">
        削除
      </button>
    </div>
  )
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="card p-8 text-center">
      <div className="text-4xl mb-2">{emoji}</div>
      <p className="text-sm text-white/50">{text}</p>
    </div>
  )
}
