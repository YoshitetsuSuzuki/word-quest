// ============================================================================
// PurchaseService  RevenueCat による買い切り課金「広告除去＋プレミアム」ラッパー
//   - ネイティブ(iOS/Android)かつ APIキー設定済みのときのみ有効。
//     Web・キー未設定では isAvailable() が false になり、UI側で購入導線を隠す。
//   - エンタイトルメント 'premium' が有効なら広告除去＋プレミアム扱い。
//   - 商品はストア(App Store Connect / Play Console)で作成し RevenueCat に連携。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

// TODO(本番): RevenueCatダッシュボードで発行した「公開SDKキー」を記入
//   iOS  は appl_ で始まるキー / Android は goog_ で始まるキー
const API_KEYS = { ios: '', android: '' }

/** RevenueCatで作成するエンタイトルメントID（広告除去＋プレミアムの権利） */
const ENTITLEMENT_ID = 'premium'

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

function apiKey(): string {
  return Capacitor.getPlatform() === 'ios' ? API_KEYS.ios : API_KEYS.android
}

let configured = false

export const PurchaseService = {
  /** 課金が利用可能か（ネイティブ＋APIキー設定済み） */
  isAvailable(): boolean {
    return isNative() && apiKey().length > 0
  },

  /** SDK初期化（未設定・Webでは何もしない） */
  async init(): Promise<void> {
    if (!this.isAvailable() || configured) return
    try {
      await Purchases.configure({ apiKey: apiKey() })
      configured = true
    } catch (e) {
      console.warn('[PurchaseService] configure failed', e)
    }
  },

  /** 現在プレミアム（広告除去）が有効かをストアの購入情報から判定 */
  async hasPremium(): Promise<boolean> {
    if (!this.isAvailable()) return false
    try {
      await this.init()
      const { customerInfo } = await Purchases.getCustomerInfo()
      return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID])
    } catch (e) {
      console.warn('[PurchaseService] getCustomerInfo failed', e)
      return false
    }
  },

  /** 「広告除去＋プレミアム」を購入。ok=true で権利取得 */
  async purchaseRemoveAds(): Promise<{ ok: boolean; reason?: string }> {
    if (!this.isAvailable()) return { ok: false, reason: 'unavailable' }
    try {
      await this.init()
      const offerings = await Purchases.getOfferings()
      const pkg = offerings.current?.availablePackages?.[0]
      if (!pkg) return { ok: false, reason: 'no_offering' }
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
      return { ok: Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID]) }
    } catch (e) {
      const err = e as { code?: string; userCancelled?: boolean }
      if (err?.userCancelled) return { ok: false, reason: 'cancelled' }
      console.warn('[PurchaseService] purchase failed', e)
      return { ok: false, reason: 'error' }
    }
  },

  /** 購入を復元（機種変更・再インストール時）。復元後にプレミアム有効なら true */
  async restore(): Promise<boolean> {
    if (!this.isAvailable()) return false
    try {
      await this.init()
      const { customerInfo } = await Purchases.restorePurchases()
      return Boolean(customerInfo.entitlements.active[ENTITLEMENT_ID])
    } catch (e) {
      console.warn('[PurchaseService] restore failed', e)
      return false
    }
  },
}
