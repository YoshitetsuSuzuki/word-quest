import type { PetStage, PetMood } from '../config/petConfig'

/**
 * 学習相棒のプロシージャルSVG（かわいい版）。
 * 大きなうるうる目・ぷっくり体型・ほっぺ・手足で愛らしく。段階(stage)で育ち、気分(mood)で表情が変わる。
 * 色は物理色なのでハードコード（透明背景に乗せる）。
 */
export function PetSprite({ stage, mood, size = 96 }: { stage: PetStage; mood: PetMood; size?: number }) {
  const sad = mood === 'sad'
  const body = sad ? '#a9c8c2' : '#86e0cf'
  const belly = sad ? '#e7f0ee' : '#d8f7ef'
  const line = sad ? '#7fa39c' : '#3fb9a7'
  const eye = '#3a3a4d'
  const cheek = '#ff9fb8'

  // stage1 は「たまご」。ぷっくり卵にほんのりほっぺとキラキラ。
  if (stage === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="egg">
        <ellipse cx="50" cy="55" rx="27" ry="33" fill="#fff5da" stroke="#efd79a" strokeWidth="2.5" />
        <ellipse cx="50" cy="66" rx="20" ry="16" fill="#fffdf3" opacity="0.7" />
        <ellipse cx="40" cy="60" rx="4" ry="2.6" fill="#ffc9d6" opacity="0.8" />
        <ellipse cx="60" cy="60" rx="4" ry="2.6" fill="#ffc9d6" opacity="0.8" />
        <path d="M34 40 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" fill="#ffd966" />
        <circle cx="64" cy="44" r="2" fill="#ffd966" />
      </svg>
    )
  }

  const cx = 50
  const cy = 58
  const rx = 24 + stage // ぷっくり。段階で少し成長
  const ry = 25 + stage

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`pet stage ${stage} ${mood}`}>
      {/* 王冠(でんせつ) & キラキラ */}
      {stage >= 5 && (
        <>
          <path d="M31 20 l7 10 6 -12 6 12 7 -10 -2 18 -22 0 z" fill="#ffd45e" stroke="#e6a90c" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="31" cy="20" r="2.6" fill="#ffe08a" />
          <circle cx="69" cy="20" r="2.6" fill="#ffe08a" />
          <path d="M18 40 l1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" fill="#ffd966" />
          <path d="M82 46 l1.3 2.8 2.8 1.3 -2.8 1.3 -1.3 2.8 -1.3 -2.8 -2.8 -1.3 2.8 -1.3 z" fill="#ffd966" />
        </>
      )}
      {/* 耳(わか以降) — 丸くてやわらかい */}
      {stage >= 3 && (
        <>
          <ellipse cx={cx - rx * 0.62} cy={cy - ry * 0.72} rx="8" ry="11" fill={body} stroke={line} strokeWidth="2" transform={`rotate(-20 ${cx - rx * 0.62} ${cy - ry * 0.72})`} />
          <ellipse cx={cx + rx * 0.62} cy={cy - ry * 0.72} rx="8" ry="11" fill={body} stroke={line} strokeWidth="2" transform={`rotate(20 ${cx + rx * 0.62} ${cy - ry * 0.72})`} />
          <ellipse cx={cx - rx * 0.62} cy={cy - ry * 0.72} rx="3.5" ry="5.5" fill="#ffc9d6" transform={`rotate(-20 ${cx - rx * 0.62} ${cy - ry * 0.72})`} />
          <ellipse cx={cx + rx * 0.62} cy={cy - ry * 0.72} rx="3.5" ry="5.5" fill="#ffc9d6" transform={`rotate(20 ${cx + rx * 0.62} ${cy - ry * 0.72})`} />
        </>
      )}
      {/* 芽(ひな) — ちょこんと */}
      {stage === 2 && (
        <>
          <path d={`M${cx} ${cy - ry - 1} q-8 -6 -1 -12 q5 5 1 12`} fill="#7fd06a" stroke="#5aa84a" strokeWidth="1" />
          <path d={`M${cx} ${cy - ry - 1} q8 -5 1 -11`} fill="#8fdb7a" />
        </>
      )}

      {/* 足 */}
      <ellipse cx={cx - 10} cy={cy + ry - 2} rx="7" ry="4.5" fill={body} stroke={line} strokeWidth="2" />
      <ellipse cx={cx + 10} cy={cy + ry - 2} rx="7" ry="4.5" fill={body} stroke={line} strokeWidth="2" />
      {/* 体 */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={body} stroke={line} strokeWidth="2.5" />
      {/* おなか */}
      <ellipse cx={cx} cy={cy + ry * 0.28} rx={rx * 0.62} ry={ry * 0.55} fill={belly} />
      {/* 手 */}
      <ellipse cx={cx - rx + 1} cy={cy + 5} rx="5" ry="6.5" fill={body} stroke={line} strokeWidth="2" />
      <ellipse cx={cx + rx - 1} cy={cy + 5} rx="5" ry="6.5" fill={body} stroke={line} strokeWidth="2" />
      {/* マフラー(せいちょう以降) */}
      {stage >= 4 && (
        <>
          <path d={`M${cx - rx * 0.72} ${cy + ry * 0.55} q${rx * 0.72} 12 ${rx * 1.44} 0 l0 6 q-${rx * 0.72} 10 -${rx * 1.44} 0 z`} fill="#ff8fa8" />
          <rect x={cx + rx * 0.4} y={cy + ry * 0.58} width="7" height="12" rx="3" fill="#ff8fa8" />
        </>
      )}

      {/* ほっぺ(いつも) */}
      <ellipse cx={cx - 14} cy={cy + 4} rx="5" ry="3.2" fill={cheek} opacity="0.85" />
      <ellipse cx={cx + 14} cy={cy + 4} rx="5" ry="3.2" fill={cheek} opacity="0.85" />

      {/* 目 — 大きくうるうる */}
      {mood === 'happy' ? (
        <>
          <path d={`M${cx - 14} ${cy - 2} q4 -6 8 0`} fill="none" stroke={eye} strokeWidth="3" strokeLinecap="round" />
          <path d={`M${cx + 6} ${cy - 2} q4 -6 8 0`} fill="none" stroke={eye} strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx={cx - 10} cy={cy - 2} rx="4.6" ry="6" fill={eye} />
          <ellipse cx={cx + 10} cy={cy - 2} rx="4.6" ry="6" fill={eye} />
          <circle cx={cx - 11.5} cy={cy - 4.5} r="1.9" fill="#fff" />
          <circle cx={cx + 8.5} cy={cy - 4.5} r="1.9" fill="#fff" />
          <circle cx={cx - 8.5} cy={cy} r="1" fill="#fff" />
          <circle cx={cx + 11.5} cy={cy} r="1" fill="#fff" />
          {sad && (
            <>
              <path d={`M${cx - 15} ${cy - 7} q5 -3 10 0`} fill="none" stroke={eye} strokeWidth="1.6" strokeLinecap="round" />
              <path d={`M${cx + 5} ${cy - 7} q5 -3 10 0`} fill="none" stroke={eye} strokeWidth="1.6" strokeLinecap="round" />
            </>
          )}
        </>
      )}

      {/* 口 */}
      {mood === 'happy' && <path d={`M${cx - 6} ${cy + 8} q6 7 12 0 q-6 3 -12 0 z`} fill="#ff7d97" stroke={eye} strokeWidth="1.4" strokeLinejoin="round" />}
      {mood === 'normal' && (
        <path d={`M${cx - 4} ${cy + 8} q4 3 4 0 q0 3 4 0`} fill="none" stroke={eye} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {mood === 'hungry' && <ellipse cx={cx} cy={cy + 9} rx="3" ry="3.6" fill="#ff7d97" stroke={eye} strokeWidth="1.4" />}
      {mood === 'sad' && <path d={`M${cx - 5} ${cy + 11} q5 -5 10 0`} fill="none" stroke={eye} strokeWidth="1.8" strokeLinecap="round" />}

      {/* 汗(おなかすいた) / なみだ(しょんぼり) */}
      {mood === 'hungry' && <path d={`M${cx + rx - 4} ${cy - 12} q4 6 0 10 q-4 -4 0 -10 z`} fill="#7cc0ff" />}
      {mood === 'sad' && <path d={`M${cx + 10} ${cy + 4} q3 7 0 11 q-3 -4 0 -11 z`} fill="#7cc0ff" />}
    </svg>
  )
}
