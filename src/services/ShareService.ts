// ============================================================================
// ShareService  成果のシェア（自然流入・バイラル導線）
//   - ネイティブは Capacitor Share（OS標準の共有シート）、Web は navigator.share、
//     どちらも無い環境はクリップボードにコピー。すべて失敗しても静かに無視。
//   - 送信は端末のOS共有に委ねる。個人情報は含めない（自分の成果テキストのみ）。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Analytics } from './Analytics'

const STORE_URL = 'https://yoshitetsusuzuki.github.io/word-quest/'

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const ShareService = {
  /** 共有UIを出せる環境か（ボタン表示の可否判定に使う） */
  canShare(): boolean {
    if (isNative()) return true
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : null
    if (!nav) return false
    return typeof nav.share === 'function' || !!nav.clipboard
  },

  /**
   * テキストを共有する。title/text/url を OS 共有シートへ渡す。
   * @returns 共有シートを開けたら true（クリップボードコピーでも true）
   */
  async share(text: string, opts?: { title?: string; url?: string }): Promise<boolean> {
    const url = opts?.url ?? STORE_URL
    const title = opts?.title ?? 'ちりつも単語'
    Analytics.track('share_open', {})
    try {
      if (isNative()) {
        await Share.share({ title, text, url, dialogTitle: title })
        return true
      }
      const nav = typeof navigator !== 'undefined' ? (navigator as Navigator) : null
      if (nav && typeof nav.share === 'function') {
        await nav.share({ title, text, url })
        return true
      }
      if (nav && nav.clipboard) {
        await nav.clipboard.writeText(`${text} ${url}`)
        return true
      }
      return false
    } catch {
      // ユーザーが共有シートを閉じた場合も例外になるため、静かに無視する
      return false
    }
  },
}
