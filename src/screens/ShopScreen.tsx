import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { shopItems } from '../data/shop.config'
import { streakConfig } from '../data/streak.config'
import type { ShopItemKind } from '../types'
import type { Strings } from '../i18n/types'

const sections: { kind: ShopItemKind; labelKey: keyof Strings }[] = [
  { kind: 'title', labelKey: 'shop.titles' },
  { kind: 'frame', labelKey: 'shop.frames' },
  { kind: 'effect', labelKey: 'shop.effects' },
]

export function ShopScreen() {
  const { user, buyItem, equipItem, buyStreakFreeze } = useGame()
  const { navigate, t } = useNav()
  const freezeFull = user.streakFreezes >= streakConfig.freezeMax
  const freezePoor = user.coin < streakConfig.freezePrice

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">{t('shop.title')}</h2>
        <span className="bg-black/30 rounded-full px-3 py-1 text-sm font-black">🪙 {user.coin.toLocaleString()}</span>
      </div>
      <p className="text-xs text-white/45">{t('shop.subtitle')}</p>

      {/* ストリークフリーズ(消耗品) */}
      <div className="card p-3 flex items-center gap-3">
        <div className="w-11 h-11 shrink-0 rounded-lg bg-panel2 grid place-items-center text-lg">🧊</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{t('shop.freeze')}</div>
          <div className="text-[11px] text-white/45">{t('shop.freezeDesc')}</div>
          <div className="text-[11px] text-accent2 font-bold mt-0.5">
            {t('shop.owned')} {user.streakFreezes} / {streakConfig.freezeMax}
          </div>
        </div>
        <button
          className="btn-primary px-3 py-1.5 text-xs shrink-0"
          disabled={freezeFull || freezePoor}
          onClick={() => buyStreakFreeze()}
        >
          {freezeFull ? t('shop.full') : `🪙${streakConfig.freezePrice}`}
        </button>
      </div>

      {sections.map((sec) => (
        <div key={sec.kind}>
          <h3 className="font-bold text-sm text-white/70 mb-2">{t(sec.labelKey)}</h3>
          <div className="space-y-2.5">
            {shopItems
              .filter((i) => i.kind === sec.kind && (!i.limited || user.ownedItemIds.includes(i.id)))
              .map((item) => {
                const owned = user.ownedItemIds.includes(item.id)
                const equipped = user.equipped[item.kind] === item.id
                return (
                  <div key={item.id} className="card p-3 flex items-center gap-3">
                    <div
                      className={`w-11 h-11 shrink-0 rounded-lg bg-panel2 grid place-items-center text-lg ${
                        item.kind === 'frame' ? `ring-2 ${item.preview}` : ''
                      }`}
                    >
                      {item.kind === 'frame' ? '👤' : item.preview}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{item.name}</div>
                      <div className="text-[11px] text-white/45 truncate">{item.description}</div>
                    </div>
                    <div className="shrink-0">
                      {owned ? (
                        equipped ? (
                          <span className="text-xs font-bold text-success px-2">{t('shop.equipped')}</span>
                        ) : (
                          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => equipItem(item.id)}>
                            {t('shop.equip')}
                          </button>
                        )
                      ) : (
                        <button
                          className="btn-primary px-3 py-1.5 text-xs"
                          disabled={user.coin < item.price}
                          onClick={() => buyItem(item.id)}
                        >
                          🪙{item.price}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      ))}

      <button className="btn-ghost w-full py-3" onClick={() => navigate('home')}>
        {t('common.back')}
      </button>
    </div>
  )
}
