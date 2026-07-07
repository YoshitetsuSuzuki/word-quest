import { PET_COLORS, type PetSpecies, type PetMood } from '../config/petConfig'

const EYE = '#3a3a4d'
const CHEEK = '#ff9fb8'

/**
 * 学習相棒のプロシージャルSVG。
 * species ごとに体そのものが別デザイン（竜/海ヘビ/悪魔/天使/電気獣/不死鳥/天体/植物獣）。
 * form(1..5=レベル帯) は サイズ・オーラ・光背 で「強そうさ」を上乗せ。mood は表情。
 */
export function PetSprite({
  species,
  form,
  level,
  mood,
  fusion = 0,
  size = 96,
}: {
  species: PetSpecies
  form: number
  level: number
  mood: PetMood
  fusion?: number
  size?: number
}) {
  const c = PET_COLORS[species]
  const sad = mood === 'sad'
  const body = sad ? c.bodySad : c.body
  const line = sad ? c.lineSad : c.line
  const belly = c.belly
  const tough = form >= 3

  function starD(cx: number, cy: number, spikes: number, outer: number, inner: number) {
    let d = ''
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? outer : inner
      const a = (Math.PI / spikes) * i - Math.PI / 2
      d += `${i === 0 ? 'M' : 'L'}${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)} `
    }
    return d + 'z'
  }
  const sparkle = (x: number, y: number, s: number, key: string) => (
    <path key={key} d={starD(x, y, 4, s, s * 0.4)} fill="#ffd966" />
  )

  // 顔（頭中心 hx,hy 半径 hr）
  function face(hx: number, hy: number, hr: number) {
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
  const foot = (x: number, y: number) => <ellipse cx={x} cy={y} rx="7" ry="4.5" fill={body} stroke={line} strokeWidth="2" />
  const hand = (x: number, y: number) => <ellipse cx={x} cy={y} rx="5" ry="6.5" fill={body} stroke={line} strokeWidth="2" />

  // ---- 種ごとの creature（すべて 0..100 座標・頭は上部）----
  function creature() {
    switch (species) {
      case 'green': // 植物獣：葉の角＋葉の尻尾
        return (
          <>
            <path d={`M40 40 q-9 -12 -2 -23 q8 7 5 21 z`} fill={c.motif} stroke="#5aa84a" strokeWidth="1" />
            <path d={`M60 40 q9 -12 2 -23 q-8 7 -5 21 z`} fill={c.motif} stroke="#5aa84a" strokeWidth="1" />
            <path d={`M70 76 q17 3 16 -13 q7 12 -5 19 q-9 2 -13 -6 z`} fill={c.motif2} stroke="#5aa84a" strokeWidth="1" />
            {foot(41, 88)}{foot(59, 88)}
            <ellipse cx="50" cy="62" rx="23" ry="24" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="68" rx="13" ry="13" fill={belly} />
            {hand(28, 64)}{hand(72, 64)}
            {face(50, 54, 18)}
          </>
        )
      case 'fire': // 二足ドラゴン：翼・角・炎鬣・尻尾＋炎
        return (
          <>
            <path d={`M40 52 q-26 -14 -34 4 q14 6 31 0 z`} fill={line} />
            <path d={`M60 52 q26 -14 34 4 q-14 6 -31 0 z`} fill={line} />
            <path d={`M62 80 q24 6 20 -16 q10 14 -4 24 q-10 4 -16 -8 z`} fill={body} stroke={line} strokeWidth="2" />
            <path d={`M80 60 l5 -8 -1 9 8 -3 -7 9 z`} fill={c.motif2} />
            {foot(42, 90)}{foot(58, 90)}
            <ellipse cx="50" cy="66" rx="16" ry="19" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="70" rx="9" ry="12" fill={belly} />
            {hand(33, 66)}{hand(67, 66)}
            <path d="M40 26 q-4 -13 3 -20 q4 8 2 20 z" fill={line} />
            <path d="M60 26 q4 -13 -3 -20 q-4 8 -2 20 z" fill={line} />
            <path d="M42 24 q3 -9 6 -2 q3 -8 6 0 q4 -3 4 5 l-3 5 q-8 -4 -14 0 z" fill={c.motif2} />
            <ellipse cx="49" cy="34" rx="14" ry="12" fill={body} stroke={line} strokeWidth="2.5" />
            <path d="M34 38 q-8 1 -10 5 q9 3 12 -1 z" fill={body} stroke={line} strokeWidth="1.5" />
            {face(49, 34, 12)}
          </>
        )
      case 'water': // 海ヘビ：とぐろ胴＋ひれ
        return (
          <>
            <path d="M50 90 q-18 -2 -20 -21 q-2 -20 17 -24 q20 -4 21 -19" fill="none" stroke={line} strokeWidth="15" strokeLinecap="round" />
            <path d="M50 90 q-18 -2 -20 -21 q-2 -20 17 -24 q20 -4 21 -19" fill="none" stroke={body} strokeWidth="9.5" strokeLinecap="round" />
            <path d="M27 66 l-11 -4 7 8 -9 3 11 4 z" fill={c.motif} stroke={line} strokeWidth="1.5" />
            <path d="M50 92 q-7 4 -13 2 q5 -6 13 -4 z" fill={c.motif} />
            <path d="M44 16 q3 -11 8 -9 q6 -2 9 9 q-9 -4 -17 0 z" fill={c.motif2} stroke={line} strokeWidth="1" />
            <ellipse cx="52" cy="30" rx="15" ry="14" fill={body} stroke={line} strokeWidth="2.5" />
            {face(52, 30, 13)}
          </>
        )
      case 'light': // 天使：羽根翼＋光輪
        return (
          <>
            <path d="M40 54 q-28 -20 -38 -2 q-3 13 7 18 q15 4 31 -7 z" fill={belly} stroke={line} strokeWidth="1.5" />
            <path d="M60 54 q28 -20 38 -2 q3 13 -7 18 q-15 4 -31 -7 z" fill={belly} stroke={line} strokeWidth="1.5" />
            <ellipse cx="50" cy="16" rx="11" ry="3.5" fill="none" stroke={c.motif} strokeWidth="3" />
            {foot(43, 88)}{foot(57, 88)}
            <ellipse cx="50" cy="62" rx="20" ry="22" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="67" rx="11" ry="13" fill={belly} />
            {face(50, 40, 15)}
          </>
        )
      case 'dark': // 悪魔：大きな曲角＋コウモリ翼＋槍尻尾
        return (
          <>
            <path d="M44 50 q-32 -8 -38 -26 q-4 22 8 33 q14 7 30 1 z" fill={line} />
            <path d="M56 50 q32 -8 38 -26 q4 22 -8 33 q-14 7 -30 1 z" fill={line} />
            <path d="M60 80 q22 6 20 -14 q8 14 -4 22 q-10 4 -16 -8 z" fill={body} stroke={line} strokeWidth="2" />
            <path d="M80 88 l8 6 -9 1 3 8 -7 -6 z" fill={line} />
            {foot(42, 90)}{foot(58, 90)}
            <path d="M35 26 q-9 -16 -1 -23 q11 8 9 25 z" fill={line} stroke="#2a1a4a" strokeWidth="1" />
            <path d="M65 26 q9 -16 1 -23 q-11 8 -9 25 z" fill={line} stroke="#2a1a4a" strokeWidth="1" />
            <ellipse cx="50" cy="64" rx="17" ry="20" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="68" rx="10" ry="13" fill={belly} />
            {hand(32, 64)}{hand(68, 64)}
            <ellipse cx="50" cy="36" rx="15" ry="13" fill={body} stroke={line} strokeWidth="2.5" />
            {face(50, 36, 13)}
          </>
        )
      case 'thunder': // 電気獣：大きな尖り耳＋稲妻尻尾
        return (
          <>
            <path d="M36 34 l-8 -24 18 14 z" fill={body} stroke={line} strokeWidth="2" />
            <path d="M64 34 l8 -24 -18 14 z" fill={body} stroke={line} strokeWidth="2" />
            <path d="M39 22 l-4 -12 9 7 z" fill={c.motif} />
            <path d="M61 22 l4 -12 -9 7 z" fill={c.motif} />
            <path d="M70 74 l10 -3 -5 8 9 1 -12 12 3 -9 -8 2 z" fill={c.motif} stroke={line} strokeWidth="1" />
            {foot(41, 88)}{foot(59, 88)}
            <ellipse cx="50" cy="60" rx="23" ry="23" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="66" rx="13" ry="12" fill={belly} />
            {hand(29, 62)}{hand(71, 62)}
            <circle cx="34" cy="60" r="3.4" fill={c.motif} opacity="0.9" />
            <circle cx="66" cy="60" r="3.4" fill={c.motif} opacity="0.9" />
            {face(50, 52, 17)}
          </>
        )
      case 'rainbow': // 不死鳥：大きな羽＋長い尾羽＋冠羽
        return (
          <>
            <path d="M40 54 q-30 -24 -40 0 q-2 14 8 18 q16 4 32 -8 z" fill={c.motif2} stroke={line} strokeWidth="1.5" />
            <path d="M60 54 q30 -24 40 0 q2 14 -8 18 q-16 4 -32 -8 z" fill={c.motif} stroke={line} strokeWidth="1.5" />
            <path d="M50 82 q-6 16 -14 22 q10 0 14 -8 q4 8 14 8 q-8 -6 -14 -22 z" fill={c.motif} stroke={line} strokeWidth="1" />
            <path d="M44 20 q-4 -12 2 -16 q3 6 4 14 z" fill={c.motif} />
            <path d="M50 18 q0 -14 6 -17 q1 8 -2 15 z" fill={c.motif2} />
            <path d="M56 20 q4 -12 8 -14 q-1 8 -4 14 z" fill={c.motif} />
            {foot(43, 88)}{foot(57, 88)}
            <ellipse cx="50" cy="62" rx="19" ry="21" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="67" rx="11" ry="12" fill={belly} />
            {face(50, 42, 15)}
          </>
        )
      default: // star 天体：星付き翼＋星の光輪＋星の尾
        return (
          <>
            <path d="M40 52 q-24 -16 -34 2 q14 8 32 4 z" fill={c.motif2} stroke={line} strokeWidth="1.5" />
            <path d="M60 52 q24 -16 34 2 q-14 8 -32 4 z" fill={c.motif2} stroke={line} strokeWidth="1.5" />
            <path d={starD(12, 46, 5, 5, 2)} fill={c.motif} />
            <path d={starD(88, 46, 5, 5, 2)} fill={c.motif} />
            <path d={starD(78, 80, 5, 5, 2)} fill={c.motif} />
            {foot(42, 88)}{foot(58, 88)}
            <ellipse cx="50" cy="60" rx="20" ry="21" fill={body} stroke={line} strokeWidth="2.5" />
            <ellipse cx="50" cy="66" rx="11" ry="12" fill={belly} />
            {hand(30, 60)}{hand(70, 60)}
            <path d={starD(50, 22, 5, 9, 3.6)} fill={c.motif} stroke="#c99a1e" strokeWidth="0.6" />
            {face(50, 46, 15)}
          </>
        )
    }
  }

  // form によるサイズ・オーラ・光背（強そうさ）
  const scale = [0.85, 0.85, 0.93, 1.0, 1.06, 1.12][form] ?? 1
  const auraN = form >= 5 ? 6 : form >= 4 ? 4 : form >= 3 ? 2 : 0
  const auraPos: [number, number, number][] = [
    [14, 40, 4], [86, 42, 3.6], [24, 24, 3], [76, 24, 3], [50, 8, 4.5], [90, 74, 3.4],
  ]

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${species} form ${form} lv ${level} ${mood}`}>
      {form >= 5 && (
        <g opacity="0.9">
          <circle cx="50" cy="54" r="46" fill="none" stroke="#ffe08a" strokeWidth="1" opacity="0.5" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6
            return <line key={`ray${i}`} x1={50 + Math.cos(a) * 40} y1={54 + Math.sin(a) * 40} x2={50 + Math.cos(a) * 48} y2={54 + Math.sin(a) * 48} stroke="#ffd45e" strokeWidth="2" strokeLinecap="round" />
          })}
        </g>
      )}
      {/* 合体段階の背面エフェクト（段階が上がるほど豪華） */}
      {fusion >= 1 && <circle cx="50" cy="54" r="44" fill="none" stroke="#ffd45e" strokeWidth={1 + fusion * 0.4} opacity={0.28 + fusion * 0.06} />}
      {fusion >= 3 && <circle cx="50" cy="54" r="47" fill="none" stroke={c.motif} strokeWidth="1.2" opacity="0.5" />}
      {fusion >= 2 &&
        Array.from({ length: fusion >= 5 ? 12 : fusion >= 4 ? 10 : 8 }).map((_, i) => {
          const n = fusion >= 5 ? 12 : fusion >= 4 ? 10 : 8
          const a = (i * 2 * Math.PI) / n
          const r1 = 40, r2 = 40 + (fusion >= 4 ? 8 : 5)
          return <line key={`fr${i}`} x1={50 + Math.cos(a) * r1} y1={54 + Math.sin(a) * r1} x2={50 + Math.cos(a) * r2} y2={54 + Math.sin(a) * r2} stroke={fusion >= 5 ? '#ffcf4d' : '#ffe08a'} strokeWidth={fusion >= 4 ? 2 : 1.4} strokeLinecap="round" />
        })}
      <g transform={`translate(50 56) scale(${scale}) translate(-50 -56)`}>{creature()}</g>
      {auraPos.slice(0, auraN).map(([x, y, s], i) => sparkle(x, y, s, `a${i}`))}
      {/* 合体のきらめき（段階数だけ増える） */}
      {[[18, 28, 4.5], [82, 30, 4], [70, 80, 3.6], [30, 80, 3.2], [50, 6, 5], [10, 60, 3]]
        .slice(0, Math.min(6, fusion + 1))
        .map(([x, y, s], i) => (fusion >= 1 ? sparkle(x, y, s, `fx${i}`) : null))}
    </svg>
  )
}
