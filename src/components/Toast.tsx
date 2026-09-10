import { useEffect, useState } from 'react'

const EVT = 'wordquest:toast'

/** 画面下部に短いメッセージを2.5秒だけ出す（どこからでも呼べる軽量トースト） */
export function showToast(message: string): void {
  try {
    window.dispatchEvent(new CustomEvent(EVT, { detail: message }))
  } catch {
    // 無視
  }
}

/** トーストの表示係。App直下に1つだけ置く。 */
export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let timer = 0
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      if (!detail) return
      setMsg(detail)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMsg(null), 2500)
    }
    window.addEventListener(EVT, onToast)
    return () => {
      window.removeEventListener(EVT, onToast)
      window.clearTimeout(timer)
    }
  }, [])

  if (!msg) return null

  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[60] pointer-events-none animate-pop">
      <div className="bg-panel2/95 text-white/85 text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg border border-white/10 max-w-[85vw] text-center">
        {msg}
      </div>
    </div>
  )
}
