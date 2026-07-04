import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { shopItems } from '../data/shop.config'
import type { ShopItemKind } from '../types'

const sections: { kind: ShopItemKind; label: string }[] = [
  { kind: 'title', label: '称号' },
  { kind: 'frame', label: 'アイコン枠' },
  { kind: 'effect', label: '正解エフェクト' },
]

export function ShopScreen() {
  const { user, buyItem, equipItem } = useGame()
  const { navigate } = useNav()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black">🛍️ ショップ</h2>
        <span className="bg-black/30 rounded-full px-3 py-1 text-sm font-black">🪙 {user.coin.toLocaleString()}</span>
      </div>
      <p className="text-xs text-white/45">見た目のみ販売。Pay to Winなし。</p>

      {sections.map((sec) => (
        <div key={sec.kind}>
          <h3 className="font-bold text-sm text-white/70 mb-2">{sec.label}</h3>
          <div className="space-y-2.5">
            {shopItems
              .filter((i) => i.kind === sec.kind)
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
                          <span className="text-xs font-bold text-success px-2">装備中</span>
                        ) : (
                          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => equipItem(item.id)}>
                            装備
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
        もどる
      </button>
    </div>
  )
}
