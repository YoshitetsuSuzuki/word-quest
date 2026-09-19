import { useCallback, useEffect, useState } from 'react'
import type { Category } from '../types'

const KEY = 'wordquest.pinnedCategories'
const EVT = 'wordquest:pinnedChanged'

function read(): Category[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as Category[]) : []
  } catch {
    return []
  }
}

function write(list: Category[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    // 保存できなくても表示順が既定に戻るだけなので握りつぶす
  }
  try {
    window.dispatchEvent(new CustomEvent(EVT))
  } catch {
    // 無視
  }
}

/**
 * 学習中の言語をホームに固定する（ピン留め）。
 * 言語が増えると横スクロールから目当てを探すのが大変なので、
 * 固定した言語を先頭にまとめて出す。端末内のみに保存する。
 */
export function usePinnedCategories() {
  const [pinned, setPinned] = useState<Category[]>(read)

  // 別の画面で変更されても追従する
  useEffect(() => {
    const sync = () => setPinned(read())
    window.addEventListener(EVT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(EVT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggle = useCallback((id: Category) => {
    const next = read().includes(id) ? read().filter((x) => x !== id) : [...read(), id]
    write(next)
    setPinned(next)
  }, [])

  const isPinned = useCallback((id: Category) => pinned.includes(id), [pinned])

  /** 固定した言語を先頭へ（固定した順を保つ）。残りは元の並びのまま。 */
  const sortPinnedFirst = useCallback(
    <T extends { id: Category }>(list: T[]): T[] => {
      const rank = new Map(pinned.map((id, i) => [id, i]))
      return [...list].sort((a, b) => {
        const ra = rank.has(a.id) ? (rank.get(a.id) as number) : Number.MAX_SAFE_INTEGER
        const rb = rank.has(b.id) ? (rank.get(b.id) as number) : Number.MAX_SAFE_INTEGER
        return ra - rb
      })
    },
    [pinned],
  )

  return { pinned, isPinned, toggle, sortPinnedFirst }
}
