import { useEffect, useState } from 'react'
import { useNav } from '../state/nav'
import { getCategoryInfo } from '../data/categories'
import { loadGuide } from '../repositories/GuideRepository'
import type { GuideChart, GuideContent, GuideSample } from '../types/guide'
import type { Category } from '../types'

/**
 * 「はじめかた」ガイド。
 *
 * その言語を初めて選んだ人は、文字が読めないまま4択を迫られていた。
 * 最初の3分で「読める・言える」まで持っていくための最小限の説明を出す。
 * - 初めてそのジャンルを選んだときに自動で開く
 * - 以降はホームのボタンからいつでも開ける
 */
const SEEN_KEY = 'wordquest.guide.seen'

/** 一度でもガイドを見たジャンルの集合 */
function seenSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

export function markGuideSeen(c: Category): void {
  try {
    const s = seenSet()
    s.add(c)
    localStorage.setItem(SEEN_KEY, JSON.stringify([...s]))
  } catch {
    // 保存できなくても動作は続く（次回また自動で開くだけ）
  }
}

export function hasSeenGuide(c: Category): boolean {
  return seenSet().has(c)
}

function Sample({ s }: { s: GuideSample }) {
  return (
    <div className="mt-2 rounded-xl bg-panel2 px-3 py-2.5">
      <div className="text-lg font-black leading-snug">{s.text}</div>
      <div className="text-[11px] text-accent2 mt-0.5">{s.reading}</div>
      <div className="text-[11px] text-white/50 mt-0.5">{s.meaning}</div>
    </div>
  )
}

/**
 * 文字の一覧。
 * 「全部でこれだけしかない」と目で分かることが目的なので、
 * 1マスを小さく詰めて、1画面で見渡せる形にする。
 */
function Chart({ label, c }: { label: string; c: GuideChart }) {
  return (
    <section className="mt-5">
      <div className="text-[10px] font-black tracking-widest text-accent2/80">{label}</div>
      <h3 className="font-bold text-sm mt-1 leading-snug">{c.title}</h3>
      {c.note && <p className="text-[12px] text-white/55 mt-1.5 leading-relaxed">{c.note}</p>}
      {c.groups.map((g) => (
        <div className="mt-3" key={g.label}>
          <div className="text-[11px] text-white/45">{g.label}</div>
          <div
            className="mt-1.5 grid gap-1"
            dir={g.rtl ? 'rtl' : undefined}
            style={{ gridTemplateColumns: `repeat(${g.cols ?? 5}, minmax(0, 1fr))` }}
          >
            {g.cells.map((cell, i) =>
              // 空きマスは五十音の「や行」のように並びを揃えるためだけに置く
              cell.char === '' ? (
                <div key={i} />
              ) : (
                <div key={i} className="rounded-lg bg-panel2 px-1 py-1.5 text-center">
                  <div className="text-base font-black leading-tight break-words">{cell.char}</div>
                  <div className="text-[10px] text-accent2 leading-tight mt-0.5 break-words">{cell.reading}</div>
                  {cell.hint && <div className="text-[10px] text-white/45 leading-tight mt-0.5 break-words">{cell.hint}</div>}
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </section>
  )
}

function Section({ label, title, body, children }: { label: string; title: string; body: string; children?: React.ReactNode }) {
  return (
    <section className="mt-5">
      <div className="text-[10px] font-black tracking-widest text-accent2/80">{label}</div>
      <h3 className="font-bold text-sm mt-1 leading-snug">{title}</h3>
      <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">{body}</p>
      {children}
    </section>
  )
}

export function GuideModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const { locale, t } = useNav()
  const [g, setG] = useState<GuideContent | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    void loadGuide(category).then((data) => {
      if (!alive) return
      if (!data) return setMissing(true)
      setG(locale === 'en' ? data.en : data.ja)
    })
    return () => {
      alive = false
    }
  }, [category, locale])

  const close = () => {
    markGuideSeen(category)
    onClose()
  }

  const info = getCategoryInfo(category)

  return (
    <div className="fixed inset-0 z-50 bg-night/95 overflow-y-auto" onClick={close}>
      <div className="min-h-full p-4 pb-28 grid place-items-start">
        <div className="card p-5 w-full max-w-md mx-auto animate-pop" onClick={(e) => e.stopPropagation()}>
          <div className="text-center">
            <div className="text-4xl">{info.emoji}</div>
            <h2 className="text-lg font-black mt-1">
              {t('guide.title').replace('%s', t(`cat.${category}` as never))}
            </h2>
          </div>

          {missing && <p className="text-sm text-white/55 mt-5 text-center">{t('guide.none')}</p>}

          {g && (
            <>
              <p className="text-[13px] text-white/75 mt-3 leading-relaxed text-center">{g.tagline}</p>

              <Section label={t('guide.script')} title={g.script.title} body={g.script.body}>
                {g.script.build && (
                  <div className="mt-2.5 flex items-center justify-center gap-3 rounded-xl bg-panel2 px-3 py-3">
                    <span className="text-base text-white/70">{g.script.build.parts}</span>
                    <span className="text-white/35">→</span>
                    <div className="text-center">
                      <div className="text-2xl font-black">{g.script.build.result}</div>
                      <div className="text-[11px] text-accent2">{g.script.build.reading}</div>
                    </div>
                  </div>
                )}
                {g.script.sample && <Sample s={g.script.sample} />}
              </Section>

              {g.chart && <Chart label={t('guide.chart')} c={g.chart} />}

              <Section label={t('guide.sounds')} title={g.sounds[0]?.title ?? ''} body={g.sounds[0]?.body ?? ''}>
                {g.sounds[0]?.sample && <Sample s={g.sounds[0].sample} />}
              </Section>
              {g.sounds.slice(1).map((p) => (
                <section className="mt-4" key={p.title}>
                  <h3 className="font-bold text-sm leading-snug">{p.title}</h3>
                  <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">{p.body}</p>
                  {p.sample && <Sample s={p.sample} />}
                </section>
              ))}

              <Section label={t('guide.order')} title={g.order.title} body={g.order.body}>
                <div className="text-[11px] text-white/45 mt-2">{g.order.type}</div>
                <Sample s={g.order.sample!} />
              </Section>

              <section className="mt-5">
                <div className="text-[10px] font-black tracking-widest text-accent2/80">{t('guide.greetings')}</div>
                <div className="mt-2 space-y-2">
                  {g.greetings.map((s) => (
                    <div key={s.text} className="rounded-xl bg-panel2 px-3 py-2.5">
                      <div className="font-black leading-snug">{s.text}</div>
                      <div className="text-[11px] text-accent2 mt-0.5">{s.reading}</div>
                      <div className="text-[11px] text-white/50 mt-0.5">{s.meaning}</div>
                    </div>
                  ))}
                </div>
              </section>

              <Section label={t('guide.pitfall')} title={g.pitfall.title} body={g.pitfall.body}>
                {g.pitfall.sample && <Sample s={g.pitfall.sample} />}
              </Section>
            </>
          )}

          <button className="btn-primary w-full py-3 mt-6" onClick={close}>
            {t('guide.cta')}
          </button>
        </div>
      </div>
    </div>
  )
}
