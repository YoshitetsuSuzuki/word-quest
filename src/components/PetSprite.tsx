import { PET_COLORS, type PetSpecies, type PetMood } from '../config/petConfig'

const EYE = '#3a3a4d'
const CHEEK = '#ff9fb8'

/**
 * 学習相棒のプロシージャルSVG（ポケモン式・劇的進化）。
 * form(1..4)で体型・姿勢・翼・角・尻尾が丸ごと変わる（赤ちゃん→こども→成体→伝説）。
 * species は配色と頭モチーフ(葉/炎/ひれ)で個性を出す。mood は表情。
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

  // 頭モチーフ（種の個性）。頭中心 hx と頭頂 topY、倍率 s。
  function motif(hx: number, topY: number, s: number) {
    if (species === 'green')
      return (
        <path d={`M${hx} ${topY + 2} q${-8 * s} ${-6 * s} ${-1 * s} ${-13 * s} q${7 * s} ${5 * s} ${1 * s} ${13 * s} z`} fill={c.motif} stroke="#5aa84a" strokeWidth="0.8" />
      )
    if (species === 'fire')
      return (
        <>
          <path d={`M${hx} ${topY - 11 * s} q${-6 * s} ${9 * s} 0 ${12 * s} q${6 * s} ${-4 * s} 0 ${-12 * s} z`} fill={c.motif} />
          <path d={`M${hx} ${topY - 6 * s} q${-3 * s} ${5 * s} 0 ${7 * s} q${3 * s} ${-3 * s} 0 ${-7 * s} z`} fill={c.motif2} />
        </>
      )
    return <path d={`M${hx} ${topY - 12 * s} q${-6 * s} ${8 * s} 0 ${13 * s} q${6 * s} ${-6 * s} 0 ${-13 * s} z`} fill={c.motif} stroke={line} strokeWidth="0.8" />
  }

  const star = (x: number, y: number, s: number, key: string) => (
    <path key={key} d={`M${x} ${y - s} l${s * 0.32} ${s * 0.68} ${s * 0.68} ${s * 0.32} -${s * 0.68} ${s * 0.32} -${s * 0.32} ${s * 0.68} -${s * 0.32} -${s * 0.68} -${s * 0.68} -${s * 0.32} ${s * 0.68} -${s * 0.32} z`} fill="#ffd966" />
  )

  // 顔（頭中心 hx,hy 半径 hr）。表情は mood 依存。tough=きりっと眉。
  function face(hx: number, hy: number, hr: number, tough: boolean) {
    const ex = hr * 0.42
    const ey = hy - hr * 0.05
    const erx = hr * 0.2
    const ery = hr * 0.27
    const cy = hy + hr * 0.28
    return (
      <>
        <ellipse cx={hx - hr * 0.6} cy={cy} rx={hr * 0.24} ry={hr * 0.15} fill={CHEEK} opacity="0.85" />
        <ellipse cx={hx + hr * 0.6} cy={cy} rx={hr * 0.24} ry={hr * 0.15} fill={CHEEK} opacity="0.85" />
        {mood === 'happy' ? (
          <>
            <path d={`M${hx - ex - erx} ${ey} q${erx} ${-erx * 1.6} ${erx * 2} 0`} fill="none" stroke={EYE} strokeWidth={hr * 0.16} strokeLinecap="round" />
            <path d={`M${hx + ex - erx} ${ey} q${erx} ${-erx * 1.6} ${erx * 2} 0`} fill="none" stroke={EYE} strokeWidth={hr * 0.16} strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx={hx - ex} cy={ey} rx={erx} ry={ery} fill={EYE} />
            <ellipse cx={hx + ex} cy={ey} rx={erx} ry={ery} fill={EYE} />
            <circle cx={hx - ex - erx * 0.3} cy={ey - ery * 0.4} r={erx * 0.4} fill="#fff" />
            <circle cx={hx + ex - erx * 0.3} cy={ey - ery * 0.4} r={erx * 0.4} fill="#fff" />
            {tough && !sad && (
              <>
                <path d={`M${hx - ex - erx} ${ey - ery} l${erx * 2} ${erx * 0.7}`} stroke={EYE} strokeWidth={hr * 0.13} strokeLinecap="round" />
                <path d={`M${hx + ex + erx} ${ey - ery} l${-erx * 2} ${erx * 0.7}`} stroke={EYE} strokeWidth={hr * 0.13} strokeLinecap="round" />
              </>
            )}
          </>
        )}
        {mood === 'happy' && <path d={`M${hx - hr * 0.28} ${hy + hr * 0.42} q${hr * 0.28} ${hr * 0.42} ${hr * 0.56} 0 q${-hr * 0.28} ${hr * 0.14} ${-hr * 0.56} 0 z`} fill="#ff7d97" stroke={EYE} strokeWidth="1.2" strokeLinejoin="round" />}
        {mood === 'normal' && <path d={`M${hx - hr * 0.2} ${hy + hr * 0.44} q${hr * 0.2} ${hr * 0.16} ${hr * 0.2} 0 q0 ${hr * 0.16} ${hr * 0.2} 0`} fill="none" stroke={EYE} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
        {mood === 'hungry' && <ellipse cx={hx} cy={hy + hr * 0.5} rx={hr * 0.15} ry={hr * 0.2} fill="#ff7d97" stroke={EYE} strokeWidth="1.2" />}
        {mood === 'sad' && <path d={`M${hx - hr * 0.28} ${hy + hr * 0.58} q${hr * 0.28} ${-hr * 0.3} ${hr * 0.56} 0`} fill="none" stroke={EYE} strokeWidth="1.7" strokeLinecap="round" />}
        {mood === 'sad' && <path d={`M${hx + ex} ${cy} q${hr * 0.16} ${hr * 0.4} 0 ${hr * 0.62} q${-hr * 0.16} ${-hr * 0.22} 0 ${-hr * 0.62} z`} fill="#7cc0ff" />}
      </>
    )
  }

  const S = { width: size, height: size, viewBox: '0 0 100 100', role: 'img' as const, 'aria-label': `${species} form ${form} lv ${level} ${mood}` }
  const st = (w: number) => ({ fill: body, stroke: line, strokeWidth: w })

  // ---- Form 1: 赤ちゃん（小さな丸） ----
  if (form <= 1) {
    return (
      <svg {...S}>
        {motif(50, 38, 0.9)}
        <ellipse cx={42} cy={78} rx={7} ry={4.5} {...st(2)} />
        <ellipse cx={58} cy={78} rx={7} ry={4.5} {...st(2)} />
        <ellipse cx={50} cy={56} rx={21} ry={22} {...st(2.5)} />
        <ellipse cx={50} cy={63} rx={12} ry={11} fill={belly} />
        {face(50, 52, 20, false)}
      </svg>
    )
  }

  // ---- Form 2: こども（頭＋丸い体・小さな角と手足） ----
  if (form === 2) {
    return (
      <svg {...S}>
        {/* 角 */}
        <path d="M40 30 l-3 -9 l6 3 z" fill={line} />
        <path d="M60 30 l3 -9 l-6 3 z" fill={line} />
        {motif(50, 26, 0.85)}
        {/* 足 */}
        <ellipse cx={41} cy={86} rx={7} ry={5} {...st(2)} />
        <ellipse cx={59} cy={86} rx={7} ry={5} {...st(2)} />
        {/* 体 */}
        <ellipse cx={50} cy={68} rx={20} ry={17} {...st(2.5)} />
        <ellipse cx={50} cy={72} rx={12} ry={11} fill={belly} />
        {/* 手 */}
        <ellipse cx={31} cy={66} rx={5} ry={7} {...st(2)} />
        <ellipse cx={69} cy={66} rx={5} ry={7} {...st(2)} />
        {/* 頭 */}
        <ellipse cx={50} cy={40} rx={16} ry={15} {...st(2.5)} />
        {face(50, 40, 15, false)}
      </svg>
    )
  }

  // ---- Form 3: 成体（直立・翼と尻尾・角） ----
  if (form === 3) {
    return (
      <svg {...S}>
        {/* 翼(小) */}
        <path d="M36 58 q-20 -8 -26 6 q14 4 26 2 z" fill={c.motif2} stroke={line} strokeWidth="1.5" />
        <path d="M64 58 q20 -8 26 6 q-14 4 -26 2 z" fill={c.motif2} stroke={line} strokeWidth="1.5" />
        {/* 尻尾 */}
        <path d="M64 78 q18 6 16 -10 q-2 10 -14 6 z" fill={body} stroke={line} strokeWidth="1.5" />
        {/* 角 */}
        <path d="M41 22 l-4 -12 l7 4 z" fill={line} />
        <path d="M59 22 l4 -12 l-7 4 z" fill={line} />
        {motif(50, 18, 0.8)}
        {/* 脚 */}
        <ellipse cx={42} cy={90} rx={7} ry={5} {...st(2)} />
        <ellipse cx={58} cy={90} rx={7} ry={5} {...st(2)} />
        <rect x={38} y={74} width={8} height={14} rx={4} fill={body} stroke={line} strokeWidth="1.6" />
        <rect x={54} y={74} width={8} height={14} rx={4} fill={body} stroke={line} strokeWidth="1.6" />
        {/* 胴 */}
        <ellipse cx={50} cy={62} rx={17} ry={21} {...st(2.5)} />
        <ellipse cx={50} cy={66} rx={10} ry={14} fill={belly} />
        {/* 腕 */}
        <ellipse cx={31} cy={58} rx={5} ry={9} {...st(2)} transform="rotate(20 31 58)" />
        <ellipse cx={69} cy={58} rx={5} ry={9} {...st(2)} transform="rotate(-20 69 58)" />
        {/* 頭 */}
        <ellipse cx={50} cy={34} rx={14} ry={13} {...st(2.5)} />
        {face(50, 34, 13, true)}
        {star(16, 46, 3.6, 's1')}
        {star(84, 48, 3, 's2')}
      </svg>
    )
  }

  // ---- Form 4: 伝説（竜・大翼・大角・王冠オーラ） ----
  return (
    <svg {...S}>
      {/* 大翼 */}
      <path d="M34 52 q-30 -16 -32 4 q-2 16 10 18 q10 -14 22 -10 z" fill={c.motif2} stroke={line} strokeWidth="1.6" />
      <path d="M66 52 q30 -16 32 4 q2 16 -10 18 q-10 -14 -22 -10 z" fill={c.motif2} stroke={line} strokeWidth="1.6" />
      <path d="M12 58 l-6 8 M20 62 l-5 9 M80 58 l6 8 M76 62 l5 9" stroke={line} strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* 尻尾(大・カール) */}
      <path d="M64 82 q22 10 20 -14 q6 16 -6 22 q-8 4 -14 -8 z" fill={body} stroke={line} strokeWidth="1.6" />
      <path d="M84 66 l4 -6 -1 7 6 -2 -5 5 z" fill={c.motif} />
      {/* 大角 */}
      <path d="M40 20 q-10 -6 -8 -18 q6 4 12 16 z" fill={line} />
      <path d="M60 20 q10 -6 8 -18 q-6 4 -12 16 z" fill={line} />
      {motif(50, 14, 0.85)}
      {/* 王冠 */}
      <path d="M40 12 l4 8 6 -11 6 11 4 -8 -2 15 -18 0 z" fill="#ffd45e" stroke="#e6a90c" strokeWidth="1.3" strokeLinejoin="round" />
      {/* 脚 */}
      <ellipse cx={41} cy={92} rx={8} ry={5.5} {...st(2)} />
      <ellipse cx={59} cy={92} rx={8} ry={5.5} {...st(2)} />
      <rect x={36} y={74} width={9} height={16} rx={4} fill={body} stroke={line} strokeWidth="1.6" />
      <rect x={55} y={74} width={9} height={16} rx={4} fill={body} stroke={line} strokeWidth="1.6" />
      {/* 胴(大) */}
      <ellipse cx={50} cy={60} rx={19} ry={23} {...st(2.8)} />
      <ellipse cx={50} cy={64} rx={11} ry={15} fill={belly} />
      {/* 腕(太) */}
      <ellipse cx={28} cy={56} rx={6} ry={11} {...st(2.2)} transform="rotate(22 28 56)" />
      <ellipse cx={72} cy={56} rx={6} ry={11} {...st(2.2)} transform="rotate(-22 72 56)" />
      {/* 頭 */}
      <ellipse cx={50} cy={32} rx={15} ry={14} {...st(2.8)} />
      {face(50, 32, 14, true)}
      {star(14, 44, 4, 'l1')}
      {star(86, 46, 3.6, 'l2')}
      {star(24, 30, 3, 'l3')}
      {star(76, 30, 3, 'l4')}
    </svg>
  )
}
