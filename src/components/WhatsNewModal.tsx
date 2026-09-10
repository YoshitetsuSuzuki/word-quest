import { useState } from 'react'
import { useNav } from '../state/nav'

const SEEN_KEY = 'wordquest.whatsnew.seen'
const ONBOARDED_KEY = 'wordquest.onboarded'
const VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0'

/**
 * アップデート後の初回起動で一度だけ出す「新機能」のお知らせ。
 * ユーザーはストアの更新文をほぼ読まないため、作った機能に気づいてもらう装置。
 * - バージョンごとに1回だけ表示（localStorage にバージョンを記録）
 * - 新規インストール（未オンボーディング）ではスキップ（初回体験を邪魔しない）
 */
export function WhatsNewModal() {
  const { t } = useNav()
  const [open, setOpen] = useState(() => {
    try {
      if (localStorage.getItem(ONBOARDED_KEY) !== '1') {
        // 新規ユーザー: 現行バージョンを既読にして今後のアップデート時のみ表示
        localStorage.setItem(SEEN_KEY, VERSION)
        return false
      }
      return localStorage.getItem(SEEN_KEY) !== VERSION
    } catch {
      return false
    }
  })

  if (!open) return null

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, VERSION)
    } catch {
      // 保存に失敗しても閉じる（次回また出るだけ）
    }
    setOpen(false)
  }

  const items = [t('whatsnew.i1'), t('whatsnew.i5'), t('whatsnew.i2'), t('whatsnew.i3'), t('whatsnew.i4')]

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-night/95 p-6" onClick={close}>
      <div className="card p-6 max-w-xs w-full animate-pop" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-black text-center">{t('whatsnew.title')}</h2>
        <div className="text-center text-[11px] text-white/40 mt-1">v{VERSION}</div>
        <ul className="text-sm text-white/70 mt-4 space-y-2.5 leading-relaxed">
          {items.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <button className="btn-primary w-full py-3 mt-5" onClick={close}>
          {t('whatsnew.cta')}
        </button>
      </div>
    </div>
  )
}
