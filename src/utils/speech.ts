import type { Category } from '../types'

/** ブラウザ標準の音声合成が使えるか */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

// ---- 音声(voice)の読み込みとキャッシュ ----
let voices: SpeechSynthesisVoice[] = []
const voiceCache = new Map<string, SpeechSynthesisVoice | null>()
function loadVoices(): void {
  if (!canSpeak()) return
  const list = window.speechSynthesis.getVoices() ?? []
  if (list.length && list.length !== voices.length) voiceCache.clear() // 顔ぶれが変わったら選択キャッシュを破棄
  if (list.length) voices = list
}
if (canSpeak()) {
  loadVoices()
  // 初回は空のことがあるので voiceschanged で取り直す
  try {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  } catch {
    window.speechSynthesis.onvoiceschanged = loadVoices
  }
  // 一部ブラウザ(特にSafari/iOS)は getVoices() が遅れて埋まるため、数回だけ再取得を試みる
  ;[150, 500, 1500].forEach((ms) => setTimeout(loadVoices, ms))
}

/**
 * 指定言語で最も品質の高そうな音声を選ぶ（スコアリング方式）。
 * Siri/Enhanced/Premium/Neural などの高品質音声を最優先し、ネタ/キャラ音声は強く減点する。
 * 明示的に voice を指定しないと端末が低品質・別言語の既定音声を使い「かすれ」「おかしい発音」の原因になる。
 */
// 品質の低いネタ/キャラ音声（主にmacOS/iOS）。既定で選ばれると音質破綻の原因になるので強く減点。
const NOVELTY_VOICE =
  /(albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|pipe organ|ralph|fred|junior|kathy|bruce|agnes|princess|grandma|grandpa|rocko|shelley|sandy|flo|eddy|reed|rishi|wobble|zarvox)/i
// プラットフォーム横断で高品質を示すマーカー（名前に含まれれば加点）
const HIGH_QUALITY = /(siri|neural|enhanced|premium|natural|google|microsoft)/i
// 各言語で信頼できる標準音声名（高品質マーカーが無い端末での次善）
const KNOWN_GOOD =
  /(samantha|alex|karen|daniel|moira|tessa|kyoko|o-?ren|otoya|ting-?ting|mei-?jia|sin-?ji|yu-?shu|li-?mu|yuna|anna|helena|petra|thomas|aur[eé]lie|am[eé]lie|audrey|m[oó]nica|paulina|jorge|juan|luca|alice)/i

/** 音声の品質スコア（高いほど良い）。base=完全一致の言語タグ。 */
function scoreVoice(v: SpeechSynthesisVoice, base: string): number {
  let s = 0
  if (NOVELTY_VOICE.test(v.name)) s -= 1000 // ネタ音声は事実上除外
  if (HIGH_QUALITY.test(v.name)) s += 100 // Siri/Neural等を最優先
  if (KNOWN_GOOD.test(v.name)) s += 40
  if (v.lang.toLowerCase() === base) s += 20 // 地域まで一致
  if (v.localService) s += 8 // ネット依存でない＝途切れにくい
  if (v.default) s += 4
  return s
}

function bestVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices()
  if (!voices.length) return undefined
  const cached = voiceCache.get(lang)
  if (cached !== undefined) return cached ?? undefined
  const base = lang.toLowerCase()
  const prefix = base.split('-')[0]
  const exact = voices.filter((v) => v.lang.toLowerCase() === base)
  const byPrefix = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix))
  const pool = exact.length ? exact : byPrefix
  // 対象言語の音声が皆無なら voice 未指定にする（別言語の声で読み上げる事故を防ぐ）
  if (!pool.length) {
    voiceCache.set(lang, null)
    return undefined
  }
  const best = pool.reduce((a, b) => (scoreVoice(b, base) > scoreVoice(a, base) ? b : a))
  voiceCache.set(lang, best)
  return best
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
    // iOS/Safari は speak をユーザー操作と同じ実行フロー内で「同期的に」呼ぶ必要がある。
    // setTimeout 等で遅延させると鳴らないため、ここでは同期実行する。
    if (synth.speaking || synth.pending) synth.cancel() // 再生中のみ止める（重なり防止）
    synth.resume() // 一時停止状態に陥っていても復帰（Chrome対策）
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    const v = bestVoice(lang)
    if (v) u.voice = v
    u.rate = 0.92 // 学習用にやや遅め
    u.pitch = 1
    u.volume = 1
    synth.speak(u)
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
