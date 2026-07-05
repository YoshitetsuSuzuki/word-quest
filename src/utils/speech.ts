import type { Category } from '../types'

/** ブラウザ標準の音声合成が使えるか */
export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * 音声エンジンのウォームアップ。初回のユーザー操作中に呼ぶことで、
 * 以降の自動再生（特にiOSの1問目）が確実に鳴るようにする。
 */
let primed = false
export function primeSpeech(): void {
  if (!canSpeak() || primed) return
  try {
    window.speechSynthesis.getVoices()
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

/** テキストを指定言語で読み上げる（無料・オフライン・端末音声） */
export function speak(text: string, lang: string): void {
  if (!canSpeak()) return
  try {
    window.speechSynthesis.cancel() // 前の読み上げを止める
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9 // 学習用にやや遅め
    window.speechSynthesis.speak(u)
  } catch {
    // 未対応環境は無視
  }
}

/** カテゴリに応じた言語で単語を読み上げる */
export function speakWord(word: string, category: Category): void {
  const lang = category === 'chinese' ? 'zh-CN' : category === 'korean' ? 'ko-KR' : 'en-US'
  speak(word, lang)
}

/** prompt「apple の意味は？」から見出し語 apple を取り出す */
export function wordFromPrompt(prompt: string): string {
  return prompt.match(/「(.+?)」/)?.[1] ?? prompt
}
