import type { PetStage, PetMood } from '../config/petConfig'

/**
 * 学習相棒のプロシージャルSVG。段階(stage)で見た目が育ち、気分(mood)で表情が変わる。
 * 絵柄アセット不要・コード生成。色は物理色なのでハードコード（透明背景に乗せる）。
 */
export function PetSprite({ stage, mood, size = 96 }: { stage: PetStage; mood: PetMood; size?: number }) {
  const sad = mood === 'sad'
  const body = sad ? '#8fb9b3' : '#7dd3c8'
  const line = sad ? '#5c8f88' : '#34a99a'
  const eye = '#22303f'
  const cheek = '#ff9e9e'
  const drop = '#7cc0ff'

  // stage1 は「たまご」。表情は出さず、そっと待っている見た目。
  if (stage === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="egg">
        <ellipse cx="50" cy="56" rx="26" ry="33" fill="#fdf1d6" stroke="#e3c98f" strokeWidth="2" />
        <polyline
          points="36,54 46,48 40,60 52,52 46,64 60,56"
          fill="none"
          stroke="#c9ad6a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    )
  }

  const r = 24 + stage * 2 // 段階が上がるほど少し大きく

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`pet stage ${stage} ${mood}`}>
      {/* 王冠(でんせつ) と キラキラ */}
      {stage >= 5 && (
        <>
          <polygon points="34,22 42,32 50,20 58,32 66,22 63,40 37,40" fill="#f4c430" stroke="#d9a406" strokeWidth="1.5" />
          <path d="M22 34 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z" fill="#f4c430" />
          <path d="M78 40 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5 z" fill="#f4c430" />
        </>
      )}
      {/* 芽(ひな) */}
      {stage === 2 && <path d="M47 26 q3 -9 6 0" fill="none" stroke="#6cc24a" strokeWidth="3" strokeLinecap="round" />}
      {/* 耳(わか以降) */}
      {stage >= 3 && (
        <>
          <path d={`M${50 - r * 0.5} ${58 - r * 0.7} l7 14 -14 0 z`} fill={body} stroke={line} strokeWidth="2" />
          <path d={`M${50 + r * 0.5} ${58 - r * 0.7} l-7 14 14 0 z`} fill={body} stroke={line} strokeWidth="2" />
        </>
      )}
      {/* 体 */}
      <circle cx="50" cy="58" r={r} fill={body} stroke={line} strokeWidth="2" />
      {/* マフラー(せいちょう以降) */}
      {stage >= 4 && <rect x={50 - r * 0.7} y={58 + r * 0.72} width={r * 1.4} height="7" rx="3" fill="#ff9e9e" />}

      {/* 目 */}
      {mood === 'happy' ? (
        <>
          <path d="M40 55 q4 -5 8 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M52 55 q4 -5 8 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : sad ? (
        <>
          <path d="M41 55 q3 4 7 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />
          <path d="M52 55 q3 4 7 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="43" cy="55" r="2.8" fill={eye} />
          <circle cx="57" cy="55" r="2.8" fill={eye} />
        </>
      )}

      {/* ほっぺ(ごきげん時) */}
      {mood === 'happy' && (
        <>
          <circle cx="37" cy="63" r="3.4" fill={cheek} />
          <circle cx="63" cy="63" r="3.4" fill={cheek} />
        </>
      )}

      {/* 口 */}
      {mood === 'happy' && <path d="M42 63 q8 8 16 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />}
      {mood === 'normal' && <line x1="45" y1="65" x2="55" y2="65" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />}
      {mood === 'hungry' && <circle cx="50" cy="66" r="3.2" fill="none" stroke={eye} strokeWidth="2" />}
      {mood === 'sad' && <path d="M43 68 q7 -6 14 0" fill="none" stroke={eye} strokeWidth="2.2" strokeLinecap="round" />}

      {/* 汗(おなかすいた) / なみだ(しょんぼり) */}
      {mood === 'hungry' && <path d="M70 46 q4 6 0 10 q-4 -4 0 -10 z" fill={drop} />}
      {mood === 'sad' && <path d="M60 60 q3 8 0 12 q-3 -4 0 -12 z" fill={drop} />}
    </svg>
  )
}
