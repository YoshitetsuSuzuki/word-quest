import { useState } from 'react'
import { useNav } from '../state/nav'

/** 相棒の名前を入力するモーダル（ウィジェット・ボックス共用） */
export function RenamePetModal({ current, onSave, onClose }: { current: string; onSave: (n: string) => void; onClose: () => void }) {
  const { t } = useNav()
  const [value, setValue] = useState(current)
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 grid place-items-center p-4" onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="w-full max-w-xs bg-panel rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-black text-sm">{t('pet.renameTitle')}</h2>
        <input
          autoFocus
          value={value}
          maxLength={12}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSave(value)}
          placeholder={t('pet.namePlaceholder')}
          className="w-full bg-panel2 border border-white/10 rounded-xl px-4 py-3 text-base outline-none focus:border-accent2"
        />
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onClose} className="btn-ghost py-2.5 text-sm">{t('common.back')}</button>
          <button onClick={() => onSave(value)} className="btn-primary py-2.5 text-sm">{t('pet.renameSave')}</button>
        </div>
      </div>
    </div>
  )
}
