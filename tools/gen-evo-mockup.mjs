// 進化変遷モックアップ生成（v3・劇的進化）。PetSprite.tsx と同じ座標で各creatureを入れ子<svg>に配置。
// 実行: node tools/gen-evo-mockup.mjs > out.svg
const COLORS = {
  green: { body: '#8fd98a', line: '#4fa84e', belly: '#e4f7dd', motif: '#7fd06a', motif2: '#e9f5a0' },
  fire: { body: '#ffa25c', line: '#e07a2e', belly: '#ffe9d6', motif: '#ff7a3c', motif2: '#ffd24a' },
  water: { body: '#7fc4f5', line: '#3f8fd0', belly: '#dcf0fd', motif: '#59b0ee', motif2: '#bfe6ff' },
}
const EYE = '#3a3a4d'
const CHEEK = '#ff9fb8'
const st = (c, w) => `fill="${c.body}" stroke="${c.line}" stroke-width="${w}"`

function motif(species, c, hx, topY, s) {
  if (species === 'green') return `<path d="M${hx} ${topY + 2} q${-8 * s} ${-6 * s} ${-1 * s} ${-13 * s} q${7 * s} ${5 * s} ${1 * s} ${13 * s} z" fill="${c.motif}" stroke="#5aa84a" stroke-width="0.8"/>`
  if (species === 'fire') return `<path d="M${hx} ${topY - 11 * s} q${-6 * s} ${9 * s} 0 ${12 * s} q${6 * s} ${-4 * s} 0 ${-12 * s} z" fill="${c.motif}"/><path d="M${hx} ${topY - 6 * s} q${-3 * s} ${5 * s} 0 ${7 * s} q${3 * s} ${-3 * s} 0 ${-7 * s} z" fill="${c.motif2}"/>`
  return `<path d="M${hx} ${topY - 12 * s} q${-6 * s} ${8 * s} 0 ${13 * s} q${6 * s} ${-6 * s} 0 ${-13 * s} z" fill="${c.motif}" stroke="${c.line}" stroke-width="0.8"/>`
}
function face(hx, hy, hr) {
  const ex = hr * 0.42, ey = hy - hr * 0.05, erx = hr * 0.2
  return (
    `<ellipse cx="${hx - hr * 0.6}" cy="${hy + hr * 0.28}" rx="${hr * 0.24}" ry="${hr * 0.15}" fill="${CHEEK}" opacity="0.85"/>` +
    `<ellipse cx="${hx + hr * 0.6}" cy="${hy + hr * 0.28}" rx="${hr * 0.24}" ry="${hr * 0.15}" fill="${CHEEK}" opacity="0.85"/>` +
    `<path d="M${hx - ex - erx} ${ey} q${erx} ${-erx * 1.6} ${erx * 2} 0" fill="none" stroke="${EYE}" stroke-width="${hr * 0.16}" stroke-linecap="round"/>` +
    `<path d="M${hx + ex - erx} ${ey} q${erx} ${-erx * 1.6} ${erx * 2} 0" fill="none" stroke="${EYE}" stroke-width="${hr * 0.16}" stroke-linecap="round"/>` +
    `<path d="M${hx - hr * 0.28} ${hy + hr * 0.42} q${hr * 0.28} ${hr * 0.42} ${hr * 0.56} 0 q${-hr * 0.28} ${hr * 0.14} ${-hr * 0.56} 0 z" fill="#ff7d97" stroke="${EYE}" stroke-width="1.2" stroke-linejoin="round"/>`
  )
}
const star = (x, y, s) => `<path d="M${x} ${y - s} l${s * 0.32} ${s * 0.68} ${s * 0.68} ${s * 0.32} -${s * 0.68} ${s * 0.32} -${s * 0.32} ${s * 0.68} -${s * 0.32} -${s * 0.68} -${s * 0.68} -${s * 0.32} ${s * 0.68} -${s * 0.32} z" fill="#ffd966"/>`

function creature(species, form) {
  const c = COLORS[species]
  if (form === 1)
    return motif(species, c, 50, 38, 0.9) +
      `<ellipse cx="42" cy="78" rx="7" ry="4.5" ${st(c, 2)}/><ellipse cx="58" cy="78" rx="7" ry="4.5" ${st(c, 2)}/>` +
      `<ellipse cx="50" cy="56" rx="21" ry="22" ${st(c, 2.5)}/><ellipse cx="50" cy="63" rx="12" ry="11" fill="${c.belly}"/>` + face(50, 52, 20)
  if (form === 2)
    return `<path d="M40 30 l-3 -9 l6 3 z" fill="${c.line}"/><path d="M60 30 l3 -9 l-6 3 z" fill="${c.line}"/>` +
      motif(species, c, 50, 26, 0.85) +
      `<ellipse cx="41" cy="86" rx="7" ry="5" ${st(c, 2)}/><ellipse cx="59" cy="86" rx="7" ry="5" ${st(c, 2)}/>` +
      `<ellipse cx="50" cy="68" rx="20" ry="17" ${st(c, 2.5)}/><ellipse cx="50" cy="72" rx="12" ry="11" fill="${c.belly}"/>` +
      `<ellipse cx="31" cy="66" rx="5" ry="7" ${st(c, 2)}/><ellipse cx="69" cy="66" rx="5" ry="7" ${st(c, 2)}/>` +
      `<ellipse cx="50" cy="40" rx="16" ry="15" ${st(c, 2.5)}/>` + face(50, 40, 15)
  if (form === 3)
    return `<path d="M36 58 q-20 -8 -26 6 q14 4 26 2 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.5"/><path d="M64 58 q20 -8 26 6 q-14 4 -26 2 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.5"/>` +
      `<path d="M64 78 q18 6 16 -10 q-2 10 -14 6 z" ${st(c, 1.5)}/>` +
      `<path d="M41 22 l-4 -12 l7 4 z" fill="${c.line}"/><path d="M59 22 l4 -12 l-7 4 z" fill="${c.line}"/>` +
      motif(species, c, 50, 18, 0.8) +
      `<ellipse cx="42" cy="90" rx="7" ry="5" ${st(c, 2)}/><ellipse cx="58" cy="90" rx="7" ry="5" ${st(c, 2)}/>` +
      `<rect x="38" y="74" width="8" height="14" rx="4" ${st(c, 1.6)}/><rect x="54" y="74" width="8" height="14" rx="4" ${st(c, 1.6)}/>` +
      `<ellipse cx="50" cy="62" rx="17" ry="21" ${st(c, 2.5)}/><ellipse cx="50" cy="66" rx="10" ry="14" fill="${c.belly}"/>` +
      `<ellipse cx="31" cy="58" rx="5" ry="9" ${st(c, 2)} transform="rotate(20 31 58)"/><ellipse cx="69" cy="58" rx="5" ry="9" ${st(c, 2)} transform="rotate(-20 69 58)"/>` +
      `<ellipse cx="50" cy="34" rx="14" ry="13" ${st(c, 2.5)}/>` + face(50, 34, 13) + star(16, 46, 3.6) + star(84, 48, 3)
  return `<path d="M34 52 q-30 -16 -32 4 q-2 16 10 18 q10 -14 22 -10 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.6"/><path d="M66 52 q30 -16 32 4 q2 16 -10 18 q-10 -14 -22 -10 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.6"/>` +
    `<path d="M12 58 l-6 8 M20 62 l-5 9 M80 58 l6 8 M76 62 l5 9" stroke="${c.line}" stroke-width="1" fill="none" stroke-linecap="round"/>` +
    `<path d="M64 82 q22 10 20 -14 q6 16 -6 22 q-8 4 -14 -8 z" ${st(c, 1.6)}/><path d="M84 66 l4 -6 -1 7 6 -2 -5 5 z" fill="${c.motif}"/>` +
    `<path d="M40 20 q-10 -6 -8 -18 q6 4 12 16 z" fill="${c.line}"/><path d="M60 20 q10 -6 8 -18 q-6 4 -12 16 z" fill="${c.line}"/>` +
    motif(species, c, 50, 14, 0.85) +
    `<path d="M40 12 l4 8 6 -11 6 11 4 -8 -2 15 -18 0 z" fill="#ffd45e" stroke="#e6a90c" stroke-width="1.3" stroke-linejoin="round"/>` +
    `<ellipse cx="41" cy="92" rx="8" ry="5.5" ${st(c, 2)}/><ellipse cx="59" cy="92" rx="8" ry="5.5" ${st(c, 2)}/>` +
    `<rect x="36" y="74" width="9" height="16" rx="4" ${st(c, 1.6)}/><rect x="55" y="74" width="9" height="16" rx="4" ${st(c, 1.6)}/>` +
    `<ellipse cx="50" cy="60" rx="19" ry="23" ${st(c, 2.8)}/><ellipse cx="50" cy="64" rx="11" ry="15" fill="${c.belly}"/>` +
    `<ellipse cx="28" cy="56" rx="6" ry="11" ${st(c, 2.2)} transform="rotate(22 28 56)"/><ellipse cx="72" cy="56" rx="6" ry="11" ${st(c, 2.2)} transform="rotate(-22 72 56)"/>` +
    `<ellipse cx="50" cy="32" rx="15" ry="14" ${st(c, 2.8)}/>` + face(50, 32, 14) + star(14, 44, 4) + star(86, 46, 3.6) + star(24, 30, 3) + star(76, 30, 3)
}

const rows = [['green', 'くさ'], ['fire', 'ほのお'], ['water', 'みず']]
const colsX = [58, 140, 222, 302]
const rowsY = [52, 162, 272]
const cell = 76
const lvLabels = ['Lv.1', 'Lv.20', 'Lv.50', 'Lv.80']

let out = `<svg width="100%" viewBox="0 0 380 372" role="img" xmlns="http://www.w3.org/2000/svg"><title>3種の劇的進化</title><desc>くさ・ほのお・みずの Lv.1→20→50→80 進化ライン</desc>`
lvLabels.forEach((lb, i) => { out += `<text x="${colsX[i] + cell / 2}" y="36" font-family="sans-serif" font-size="12" font-weight="500" fill="#8a8f98" text-anchor="middle">${lb}</text>` })
rows.forEach(([sp, name], ri) => {
  out += `<text x="8" y="${rowsY[ri] + cell / 2 + 4}" font-family="sans-serif" font-size="13" font-weight="500" fill="#8a8f98">${name}</text>`
  colsX.forEach((x, ci) => {
    out += `<svg x="${x}" y="${rowsY[ri]}" width="${cell}" height="${cell}" viewBox="0 0 100 100">${creature(sp, ci + 1)}</svg>`
  })
})
out += `<text x="40" y="362" font-family="sans-serif" font-size="12" fill="#a0a4ab">赤ちゃん→こども→成体→伝説。姿ごと変わり、種は色とモチーフで個性</text></svg>`
process.stdout.write(out)
