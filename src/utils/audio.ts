// 効果音・BGM（Web Audio APIで生成。音声ファイル不要・無料）

let ctx: AudioContext | null = null
function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** 効果音の再生を許可するためのウォームアップ（初回タップ時に呼ぶ） */
export function primeAudio(): void {
  ensureCtx()
}

/** 単純な音を鳴らす */
function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const c = ensureCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime + start)
  gain.gain.setValueAtTime(0, c.currentTime + start)
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur)
  osc.connect(gain).connect(c.destination)
  osc.start(c.currentTime + start)
  osc.stop(c.currentTime + start + dur + 0.02)
}

/** 正解音（軽いピンポン：上がる2音） */
export function playCorrect(volume = 0.5): void {
  if (volume <= 0) return
  tone(880, 0, 0.12, 0.25 * volume, 'sine') // ピン
  tone(1318, 0.1, 0.18, 0.25 * volume, 'sine') // ポン
}

/** 不正解音（ブー：低い音） */
export function playWrong(volume = 0.5): void {
  if (volume <= 0) return
  tone(196, 0, 0.28, 0.3 * volume, 'sawtooth')
  tone(185, 0.02, 0.28, 0.2 * volume, 'square')
}

/** コンボ節目のファンファーレ（上昇アルペジオ。tierが上がるほど高く華やか） */
export function playCombo(volume = 0.5, tier = 1): void {
  if (volume <= 0) return
  const base = [523.25, 659.25, 783.99, 1046.5] // C E G C
  const shift = Math.min(tier - 1, 3) * 1.06 // tierで少し上へ
  base.forEach((f, i) => tone(f * (1 + shift * 0.02), i * 0.06, 0.16, 0.22 * volume, 'triangle'))
  tone(1318.5, base.length * 0.06, 0.22, 0.2 * volume, 'sine') // きらめきの締め
}

// ---- BGM: 柔らかいアルペジオのループ ----
let bgmTimer: number | null = null
let bgmGain: GainNode | null = null
let bgmVol = 0.3
const CHORD = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63] // C E G C G E

export const bgm = {
  start(volume = 0.3) {
    const c = ensureCtx()
    if (!c || bgmTimer !== null) return
    bgmVol = volume
    bgmGain = c.createGain()
    bgmGain.gain.value = bgmVol
    bgmGain.connect(c.destination)
    let i = 0
    const step = () => {
      const cc = ensureCtx()
      if (!cc || !bgmGain) return
      const f = CHORD[i % CHORD.length]
      const osc = cc.createOscillator()
      const g = cc.createGain()
      osc.type = 'triangle'
      osc.frequency.value = f
      g.gain.setValueAtTime(0, cc.currentTime)
      g.gain.linearRampToValueAtTime(0.12, cc.currentTime + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, cc.currentTime + 0.9)
      osc.connect(g).connect(bgmGain)
      osc.start()
      osc.stop(cc.currentTime + 0.95)
      i++
      bgmTimer = window.setTimeout(step, 480)
    }
    step()
  },
  stop() {
    if (bgmTimer !== null) {
      clearTimeout(bgmTimer)
      bgmTimer = null
    }
    if (bgmGain) {
      try {
        bgmGain.disconnect()
      } catch {
        /* noop */
      }
      bgmGain = null
    }
  },
  setVolume(volume: number) {
    bgmVol = volume
    if (bgmGain) bgmGain.gain.value = volume
  },
  isPlaying() {
    return bgmTimer !== null
  },
}
