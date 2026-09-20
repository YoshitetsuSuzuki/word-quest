// ============================================================================
// ShareImage  成果カードを画像にして共有する（Instagram ストーリー等へ）
//   - テキスト共有ではストーリーに載せられないため、9:16 の PNG を自前で描く。
//   - 外部ライブラリは使わず canvas に直接描画する（依存もCDNも増やさない）。
//   - ネイティブは一時ファイルへ書き出して共有シートへ、Web はダウンロード。
//   - 失敗しても決してアプリを止めない。
// ============================================================================
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Analytics } from './Analytics'

/** ストーリーの標準比率。9:16 で作れば Instagram / TikTok どちらにも合う */
const W = 1080
const H = 1920

export interface ShareCardData {
  /** 相棒の名前 */
  petName: string
  /** 連続学習日数 */
  streak: number
  /** 覚えた語の総数 */
  learned: number
  /** 今日解いた問題数 */
  todayCount: number
  /** 学習中の言語名（「英単語」など） */
  languageLabel: string
  /** 見出し・添え書き（i18n 済みの文字列を受け取る） */
  text: {
    title: string
    streakLabel: string
    learnedLabel: string
    todayLabel: string
    appName: string
    tagline: string
  }
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

/** 角丸の矩形パス */
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** 数字と単位を組にして中央へ置く */
function stat(c: CanvasRenderingContext2D, cx: number, y: number, value: string, label: string, color: string): void {
  c.textAlign = 'center'
  c.fillStyle = color
  c.font = '900 108px -apple-system, "Hiragino Sans", sans-serif'
  c.fillText(value, cx, y)
  c.fillStyle = 'rgba(255,255,255,0.5)'
  c.font = '700 34px -apple-system, "Hiragino Sans", sans-serif'
  c.fillText(label, cx, y + 52)
}

/** 成果カードを描いて PNG の dataURL を返す */
export function renderShareCard(d: ShareCardData): string | null {
  try {
    const cv = document.createElement('canvas')
    cv.width = W
    cv.height = H
    const c = cv.getContext('2d')
    if (!c) return null

    // 背景（アプリの夜空と同じ色味の縦グラデーション）
    const g = c.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, '#191c31')
    g.addColorStop(0.55, '#0e1020')
    g.addColorStop(1, '#141830')
    c.fillStyle = g
    c.fillRect(0, 0, W, H)

    // 背景の光。中央のカードを浮かせるためのごく淡い円
    const glow = c.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H * 0.42, W * 0.7)
    glow.addColorStop(0, 'rgba(124,92,255,0.22)')
    glow.addColorStop(1, 'rgba(124,92,255,0)')
    c.fillStyle = glow
    c.fillRect(0, 0, W, H)

    // 見出し
    c.textAlign = 'center'
    c.fillStyle = 'rgba(255,255,255,0.55)'
    c.font = '700 40px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(d.languageLabel, W / 2, 300)

    c.fillStyle = '#ffffff'
    c.font = '900 76px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(d.text.title, W / 2, 400)

    // 中央のカード
    const cardX = 90
    const cardY = 520
    const cardW = W - 180
    const cardH = 620
    c.fillStyle = 'rgba(255,255,255,0.06)'
    roundRect(c, cardX, cardY, cardW, cardH, 48)
    c.fill()
    c.strokeStyle = 'rgba(255,255,255,0.10)'
    c.lineWidth = 2
    c.stroke()

    // 主役は連続日数。いちばん大きく出す
    c.textAlign = 'center'
    c.fillStyle = '#ffcc4d'
    c.font = '900 230px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(String(d.streak), W / 2, cardY + 280)
    c.fillStyle = 'rgba(255,255,255,0.6)'
    c.font = '800 46px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(d.text.streakLabel, W / 2, cardY + 350)

    // 覚えた語数と今日の問題数を左右に
    stat(c, cardX + cardW * 0.3, cardY + 500, d.learned.toLocaleString(), d.text.learnedLabel, '#00e0c6')
    stat(c, cardX + cardW * 0.7, cardY + 500, String(d.todayCount), d.text.todayLabel, '#7c5cff')

    // 相棒の名前
    c.fillStyle = 'rgba(255,255,255,0.45)'
    c.font = '700 38px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(`🐣 ${d.petName}`, W / 2, cardY + cardH + 90)

    // フッター: アプリ名とひとこと
    c.fillStyle = '#ffffff'
    c.font = '900 62px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(d.text.appName, W / 2, H - 220)
    c.fillStyle = 'rgba(255,255,255,0.45)'
    c.font = '600 36px -apple-system, "Hiragino Sans", sans-serif'
    c.fillText(d.text.tagline, W / 2, H - 150)

    return cv.toDataURL('image/png')
  } catch {
    return null
  }
}

/**
 * 成果カードを画像として共有する。
 * @returns 共有シートを開けたら true
 */
export async function shareCardImage(d: ShareCardData, message: string): Promise<boolean> {
  const dataUrl = renderShareCard(d)
  if (!dataUrl) return false
  Analytics.track('share_image', {})

  if (isNative()) {
    try {
      const base64 = dataUrl.split(',')[1]
      const name = `chiritsumo-${Date.now()}.png`
      // 共有のために一時領域へ書き出す。Cache なので OS がいずれ掃除する
      const w = await Filesystem.writeFile({ path: name, data: base64, directory: Directory.Cache })
      await Share.share({ title: d.text.appName, text: message, files: [w.uri] })
      return true
    } catch {
      return false
    }
  }

  // Web: 共有APIがファイルに対応していればそれを、駄目ならダウンロード
  try {
    const blob = await (await fetch(dataUrl)).blob()
    const file = new File([blob], 'chiritsumo.png', { type: 'image/png' })
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean }
    if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], text: message })
      return true
    }
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'chiritsumo.png'
    a.click()
    return true
  } catch {
    return false
  }
}
