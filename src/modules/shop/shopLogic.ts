import type { User, ShopItemDef } from '../../types'
import { shopItems } from '../../data/shop.config'

/** 購入。所持済み or Coin不足なら失敗。成功時はCoin減算＋所持追加＋自動装備。 */
export function buyItem(user: User, itemId: string): { user: User; ok: boolean; reason?: string } {
  const item = shopItems.find((i) => i.id === itemId)
  if (!item) return { user, ok: false, reason: 'not_found' }
  if (user.ownedItemIds.includes(itemId)) return { user, ok: false, reason: 'owned' }
  if (user.coin < item.price) return { user, ok: false, reason: 'no_coin' }

  const equipped = { ...user.equipped, [item.kind]: item.id }
  return {
    user: {
      ...user,
      coin: user.coin - item.price,
      ownedItemIds: [...user.ownedItemIds, itemId],
      equipped,
    },
    ok: true,
  }
}

/** 所持済みアイテムを装備する（同種は1つだけ） */
export function equipItem(user: User, itemId: string): User {
  const item = shopItems.find((i) => i.id === itemId)
  if (!item || !user.ownedItemIds.includes(itemId)) return user
  return { ...user, equipped: { ...user.equipped, [item.kind]: item.id } }
}

/** 装備中の称号テキストを返す */
export function equippedTitle(user: User): string | undefined {
  const id = user.equipped.title
  return shopItems.find((i) => i.id === id)?.preview
}

/** 装備中の正解エフェクト絵文字を返す */
export function equippedEffect(user: User): string | undefined {
  const id = user.equipped.effect
  return shopItems.find((i) => i.id === id)?.preview
}

/** 装備中のアイコン枠クラスを返す */
export function equippedFrameClass(user: User): string | undefined {
  const id = user.equipped.frame
  return shopItems.find((i) => i.id === id)?.preview
}

export function getShopItem(id: string): ShopItemDef | undefined {
  return shopItems.find((i) => i.id === id)
}
