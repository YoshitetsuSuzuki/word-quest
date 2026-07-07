import type { Category } from '../types'

/** ブラウザ標準の音声合成が使えるか */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// ---- 音声(voice)の読み込みとキャッシュ ----
let voices: SpeechSynthesisVoice[] = []
function loadVoices(): void {
  if (canSpeak()) voices = window.speechSynthesis.getVoices() ?? []
}
if (canSpeak()) {
  loadVoices()
  // 初回は空のことがあるので voiceschanged で取り直す
  try {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  } catch {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
}

/**
 * 指定言語で最も品質の高そうな音声を選ぶ。
 * 完全一致 > 言語プレフィックス一致 の順で、Google/Microsoft/自然音声などを優先。
 * 明示的に voice を指定しないと端末が低品質な既定音声を使い「かすれ」の原因になる。
 */
// 品質の低いネタ/キャラ音声（主にmacOS）。既定で選ばれると「かすれ」の原因になるので除外。
const NOVELTY_VOICE =
  /(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|pipe organ|ralph|fred|junior|kathy|bruce|agnes|princess|grandma|grandpa|rocko|shelley|sandy|flo|eddy|reed|rishi|trinoids)/i
// 各プラットフォームの高品質・標準音声を優先
const GOOD_VOICE =
  /(google|microsoft|siri|natural|enhanced|premium|neural|samantha|alex|karen|daniel|moira|tessa|kyoko|o-?ren|otoya|ting-?ting|mei-?jia|sin-?ji|yu-?shu|li-?mu|anna|helena|petra|thomas|aur[eé]lie|am[eé]lie|audrey|m[oó]nica|paulina|jorge|juan|luca|alice)/i

function bestVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  if (!voices.length) return undefined
  const base = lang.toLowerCase()
  const prefix = base.split('-')[0]
  const exact = voices.filter((v) => v.lang.toLowerCase() === base)
  const byPrefix = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix))
  const pool = exact.length ? exact : byPrefix
  if (!pool.length) return undefined
  // ネタ音声を除外（全部ネタなら仕方なく元プール）
  const clean = pool.filter((v) => !NOVELTY_VOICE.test(v.name))
  const usable = clean.length ? clean : pool
  return (
    usable.find((v) => GOOD_VOICE.test(v.name)) ??
    usable.find((v) => v.default) ??
    usable.find((v) => v.localService) ??
    usable[0]
  )
}

/**
 * 音声エンジンのウォームアップ。初回のユーザー操作中に呼ぶことで、
 * 以降の自動再生（特にiOSの1問目）が確実に鳴るようにする。
 */
let primed = false
export function primeSpeech(): void {
  if (!canSpeak() || primed) return
  try {
    loadVoices()
    window.speechSynthesis.resume()
    // 空文字はiOSで無視されるため、無音(volume0)の短い実発話でエンジンを起こす
    const u = new SpeechSynthesisUtterance('a')
    u.volume = 0
    window.speechSynthesis.speak(u)
    primed = true
  } catch {
    // 無視
  }
}

// 同一発話の二重発火（再描画などによる重なり＝歪み）を抑制
let lastKey = ''
let lastAt = 0
let pendingTimer: ReturnType<typeof setTimeout> | null = null

/** テキストを指定言語で読み上げる（無料・オフライン・端末音声） */
export function speak(text: string, lang: string): void {
  if (!canSpeak() || !text) return
  const now = Date.now()
  const key = `${lang}|${text}`
  // 直近と同じ発話は短時間なら無視（自動再生と再描画の重複対策）
  if (key === lastKey && now - lastAt < 500) return
  lastKey = key
  lastAt = now
  try {
    const synth = window.speechSynthesis
    if (pendingTimer) clearTimeout(pendingTimer)
    synth.cancel() // 前の読み上げを止める（重なりによる歪み防止）
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    const v = bestVoice(lang)
    if (v) u.voice = v
    u.rate = 0.92 // 学習用にやや遅め
    u.pitch = 1
    u.volume = 1
    // cancel直後のspeakはChromeで無視される既知バグがあるため少し遅らせて発話する
    pendingTimer = setTimeout(() => {
      try {
        synth.resume() // 一時停止状態に陥っていても復帰
        synth.speak(u)
      } catch {
        // 無視
      }
    }, 70)
  } catch {
    // 未対応環境は無視
  }
}

/** カテゴリ(学習ターゲット言語)に対応するBCP-47言語タグ */
export function langForCategory(category: Category): string {
  switch (category) {
    case 'chinese': return 'zh-CN'
    case 'korean': return 'ko-KR'
    case 'japanese': return 'ja-JP'
    case 'spanish': return 'es-ES'
    case 'french': return 'fr-FR'
    case 'german': return 'de-DE'
    default: return 'en-US'
  }
}

/** カテゴリに応じた言語で単語を読み上げる */
export function speakWord(word: string, category: Category): void {
  speak(word, langForCategory(category))
}

/** prompt「apple の意味は？」から見出し語 apple を取り出す */
export function wordFromPrompt(prompt: string): string {
  return prompt.match(/「(.+?)」/)?.[1] ?? prompt
}
