import { PET_COLORS, type PetSpecies, type PetMood } from '../config/petConfig'

/**
 * 学習相棒のプロシージャルSVG（ポケモン式）。
 * species=種(色・モチーフ)、form=大進化(1..4, 角/翼/王冠が増える)、level=連続強化(サイズ・オーラ)、mood=表情。
 * 色は物理色なのでハードコード（透明背景に乗せる）。
 */
export function PetSprite({
  species,
  form,
  level,
  mood,
  size = 96,
}: {
  species: PetSpecies
  form: number
  level: number
  mood: PetMood
  size?: number
}) {
  const c = PET_COLORS[species]
  const sad = mood === 'sad'
  const body = sad ? c.bodySad : c.body
  const line = sad ? c.lineSad : c.line
  const belly = c.belly
  const eye = '#3a3a4d'
  const cheek = '#ff9fb8'

  const cx = 50
  const cy = 58
  const rx = 22 + form * 2 + Math.min(6, Math.floor(level / 25))
  const ry = rx + 1
  const tough = form >= 3 // 強そうな見た目(角・翼・きりっと眉)

  // 種ごとの頭モチーフ（フォームで大きくなる）
  const ms = 0.8 + form * 0.18
  const topY = cy - ry
  const motif = () => {
    if (species === 'green')
      return (
        <>
          <path d={`M${cx} ${topY + 2} q${-10 * ms} ${-7 * ms} ${-1.5 * ms} ${-14 * ms} q${7 * ms} ${5 * ms} ${1.5 * ms} ${14 * ms}`} fill={c.motif} stroke="#5aa84a" strokeWidth="1" />
          <path d={`M${cx} ${topY + 2} q${8 * ms} ${-6 * ms} ${1 * ms} ${-12 * ms}`} fill={c.motif2} />
        </>
      )
    if (species === 'fire')
      return (
        <>
          <path d={`M${cx} ${topY - 12 * ms} q${-6 * ms} ${10 * ms} 0 ${13 * ms} q${6 * ms} ${-4 * ms} 0 ${-13 * ms} z`} fill={c.motif} />
          <path d={`M${cx} ${topY - 7 * ms} q${-3 * ms} ${6 * ms} 0 ${8 * ms} q${3 * ms} ${-3 * ms} 0 ${-8 * ms} z`} fill={c.motif2} />
        </>
      )
    return (
      <path d={`M${cx} ${topY - 13 * ms} q${-7 * ms} ${8 * ms} 0 ${14 * ms} q${7 * ms} ${-6 * ms} 0 ${-14 * ms} z`} fill={c.motif} stroke={line} strokeWidth="1" />
    )
  }

  const sparkle = (x: number, y: number, s: number, key: string) => (
    <path key={key} d={`M${x} ${y - s} l${s * 0.32} ${s * 0.68} ${s * 0.68} ${s * 0.32} -${s * 0.68} ${s * 0.32} -${s * 0.32} ${s * 0.68} -${s * 0.32} -${s * 0.68} -${s * 0.68} -${s * 0.32} ${s * 0.68} -${s * 0.32} z`} fill="#ffd966" />
  )
  const auraCount = Math.max(0, form - 2) + (level % 10 >= 5 ? 1 : 0)

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${species} form ${form} lv ${level} ${mood}`}>
      {/* 翼(form>=3) — 体の後ろ */}
      {form >= 3 && (
        <>
          <path
            d={`M${cx - rx * 0.7} ${cy - 2} q${-20 - (form - 3) * 8} ${-6} ${-24 - (form - 3) * 10} ${12} q${14} ${2} ${24 + (form - 3) * 10} ${-4} z`}
            fill={c.motif2}
            stroke={line}
            strokeWidth="1.5"
          />
          <path
            d={`M${cx + rx * 0.7} ${cy - 2} q${20 + (form - 3) * 8} ${-6} ${24 + (form - 3) * 10} ${12} q${-14} ${2} ${-24 - (form - 3) * 10} ${-4} z`}
            fill={c.motif2}
            stroke={line}
            strokeWidth="1.5"
          />
        </>
      )}

      {/* 角(form>=2) */}
      {form >= 2 && (
        <>
          <path d={`M${cx - rx * 0.5} ${topY + 6} l${-2 - form} ${-8 - form * 2} l${5 + form} ${3} z`} fill={line} stroke={line} strokeWidth="1" strokeLinejoin="round" />
          <path d={`M${cx + rx * 0.5} ${topY + 6} l${2 + form} ${-8 - form * 2} l${-5 - form} ${3} z`} fill={line} stroke={line} strokeWidth="1" strokeLinejoin="round" />
        </>
      )}

      {/* 頭モチーフ */}
      {motif()}

      {/* 王冠(form>=4) */}
      {form >= 4 && (
        <path d={`M${cx - 12} ${topY - 1} l5 8 5 -10 5 10 5 -8 -2 15 -16 0 z`} fill="#ffd45e" stroke="#e6a90c" strokeWidth="1.3" strokeLinejoin="round" />
      )}

      {/* 足 */}
      <ellipse cx={cx - 10} cy={cy + ry - 2} rx="7" ry="4.5" fill={body} stroke={line} strokeWidth="2" />
      <ellipse cx={cx + 10} cy={cy + ry - 2} rx="7" ry="4.5" fill={body} stroke={line} strokeWidth="2" />
      {/* 体 */}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={body} stroke={line} strokeWidth="2.5" />
      {/* おなか */}
      <ellipse cx={cx} cy={cy + ry * 0.28} rx={rx * 0.6} ry={ry * 0.55} fill={belly} />
      {/* 手 */}
      <ellipse cx={cx - rx + 1} cy={cy + 5} rx="5" ry="6.5" fill={body} stroke={line} strokeWidth="2" />
      <ellipse cx={cx + rx - 1} cy={cy + 5} rx="5" ry="6.5" fill={body} stroke={line} strokeWidth="2" />

      {/* ほっぺ */}
      <ellipse cx={cx - 14} cy={cy + 4} rx="5" ry="3.2" fill={cheek} opacity="0.85" />
      <ellipse cx={cx + 14} cy={cy + 4} rx="5" ry="3.2" fill={cheek} opacity="0.85" />

      {/* 目 */}
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
          {tough && !sad && (
            <>
              <path d={`M${cx - 15} ${cy - 9} l9 3`} stroke={eye} strokeWidth="2" strokeLinecap="round" />
              <path d={`M${cx + 15} ${cy - 9} l-9 3`} stroke={eye} strokeWidth="2" strokeLinecap="round" />
            </>
          )}
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
      {mood === 'normal' && <path d={`M${cx - 4} ${cy + 8} q4 3 4 0 q0 3 4 0`} fill="none" stroke={eye} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {mood === 'hungry' && <ellipse cx={cx} cy={cy + 9} rx="3" ry="3.6" fill="#ff7d97" stroke={eye} strokeWidth="1.4" />}
      {mood === 'sad' && <path d={`M${cx - 5} ${cy + 11} q5 -5 10 0`} fill="none" stroke={eye} strokeWidth="1.8" strokeLinecap="round" />}

      {/* 汗/なみだ */}
      {mood === 'hungry' && <path d={`M${cx + rx - 4} ${cy - 12} q4 6 0 10 q-4 -4 0 -10 z`} fill="#7cc0ff" />}
      {mood === 'sad' && <path d={`M${cx + 10} ${cy + 4} q3 7 0 11 q-3 -4 0 -11 z`} fill="#7cc0ff" />}

      {/* オーラのキラキラ(form>=3) */}
      {auraCount >= 1 && sparkle(cx - rx - 3, cy - ry * 0.3, 4, 'a1')}
      {auraCount >= 2 && sparkle(cx + rx + 3, cy, 3.4, 'a2')}
      {auraCount >= 3 && sparkle(cx + rx * 0.2, topY - 6, 3, 'a3')}
    </svg>
  )
}
