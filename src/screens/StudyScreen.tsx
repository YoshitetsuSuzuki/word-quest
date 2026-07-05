import { useMemo, useState } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { ReviewScheduler } from '../core/ReviewScheduler'
import type { Question } from '../types'

/** prompt「apple の意味は？」から見出し語 apple を取り出す */
function wordOf(q: Question): string {
  return q.prompt.match(/「(.+?)」/)?.[1] ?? q.prompt
}

type Tab = 'weak' | 'learned'

export function StudyScreen() {
  const { user, engine, isCategoryReady } = useGame()
  const { navigate, setQuizMode, category } = useNav()
  const ready = isCategoryReady(category)

  const dueCount = ReviewScheduler.dueQuestionIds(user.reviewQueue).length

  // 苦手な単語: 復習キューを「易しさ係数が低い＝苦手」順に並べる
  const weak = useMemo(() => {
    if (!ready) return []
    return user.reviewQueue
      .map((r) => ({ r, q: engine.getById(r.questionId) }))
      .filter((x): x is { r: (typeof user.reviewQueue)[number]; q: Question } => !!x.q)
      .sort((a, b) => a.r.easeFactor - b.r.easeFactor || a.r.repetitions - b.r.repetitions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.reviewQueue, ready])

  // 覚えた単語帳
  const learned = useMemo(() => {
    if (!ready) return []
    return user.learnedQuestionIds
      .map((id) => engine.getById(id))
      .filter((q): q is Question => !!q)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.learnedQuestionIds, ready])

  const [tab, setTab] = useState<Tab>('weak')
  const [query, setQuery] = useState('')

  const startReview = () => {
    setQuizMode('review')
    navigate('quiz')
  }

  const filteredLearned = query
    ? learned.filter((q) => wordOf(q).includes(query.toLowerCase()) || q.answer.includes(query))
    : learned

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">📚 まなび</h2>

      {/* 今日の復習 */}
      <div className="card p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🔁</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold">今日の復習</div>
            <div className="text-xs text-white/50">
              {dueCount > 0 ? `${dueCount} 問が復習の頃合いです` : '今は復習待ちの単語はありません'}
            </div>
          </div>
        </div>
        <button
          className="btn-primary w-full py-3 mt-3 disabled:opacity-40"
          disabled={user.reviewQueue.length === 0}
          onClick={startReview}
        >
          {user.reviewQueue.length === 0 ? 'まずはクイズを解こう' : dueCount > 0 ? '復習をはじめる' : '苦手だけ特訓する'}
        </button>
      </div>

      {/* タブ */}
      <div className="flex gap-1.5">
        <button
          onClick={() => setTab('weak')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'weak' ? 'bg-accent text-white' : 'bg-panel2 text-white/50'}`}
        >
          😰 苦手な単語 {weak.length > 0 && `(${weak.length})`}
        </button>
        <button
          onClick={() => setTab('learned')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'learned' ? 'bg-accent text-white' : 'bg-panel2 text-white/50'}`}
        >
          📖 単語帳 {learned.length > 0 && `(${learned.length})`}
        </button>
      </div>

      {/* 苦手な単語 */}
      {tab === 'weak' &&
        (weak.length === 0 ? (
          <EmptyState emoji="🌱" text="まだ苦手な単語はありません。クイズで間違えた単語がここに集まります。" />
        ) : (
          <div className="space-y-2">
            {weak.slice(0, 50).map(({ r, q }) => (
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{wordOf(q)}</div>
                  <div className="text-sm text-white/55 truncate">{q.answer}</div>
                </div>
                {/* 定着度: 連続正解数を星で */}
                <div className="text-xs text-white/40 shrink-0">
                  {'★'.repeat(Math.min(3, r.repetitions))}
                  {'☆'.repeat(Math.max(0, 3 - r.repetitions))}
                </div>
              </div>
            ))}
          </div>
        ))}

      {/* 単語帳 */}
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
              <div key={q.id} className="card p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold">{wordOf(q)}</div>
                  <div className="text-sm text-white/55 truncate">{q.answer}</div>
                </div>
                <div className="text-[10px] text-white/30 shrink-0">Lv{q.difficulty}</div>
              </div>
            ))}
            {filteredLearned.length > 100 && (
              <div className="text-center text-xs text-white/40 py-2">ほか {filteredLearned.length - 100} 語</div>
            )}
          </div>
        ))}
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
