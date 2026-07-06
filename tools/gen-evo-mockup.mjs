// 進化変遷モックアップ生成。PetSprite.tsx と同じ特徴ロジックで 3種×4フォームのSVGを出力。
// 実行: node tools/gen-evo-mockup.mjs > /tmp/evo.svg
const COLORS = {
  grass: { body: '#8fd98a', line: '#4fa84e', belly: '#e4f7dd', motif: '#7fd06a', motif2: '#e9f5a0' },
  fire: { body: '#ffa25c', line: '#e07a2e', belly: '#ffe9d6', motif: '#ff7a3c', motif2: '#ffd24a' },
  water: { body: '#7fc4f5', line: '#3f8fd0', belly: '#dcf0fd', motif: '#59b0ee', motif2: '#bfe6ff' },
}
const EYE = '#3a3a4d'
const CHEEK = '#ff9fb8'
const n = (v) => Math.round(v * 10) / 10

function motif(species, cx, topY, ms, c) {
  if (species === 'grass')
    return `<path d="M${cx} ${topY + 2} q${n(-8 * ms)} ${n(-6 * ms)} ${n(-1 * ms)} ${n(-13 * ms)} q${n(7 * ms)} ${n(5 * ms)} ${n(1 * ms)} ${n(13 * ms)} z" fill="${c.motif}" stroke="#5aa84a" stroke-width="0.8"/>`
  if (species === 'fire')
    return `<path d="M${cx} ${topY - n(11 * ms)} q${n(-6 * ms)} ${n(9 * ms)} 0 ${n(12 * ms)} q${n(6 * ms)} ${n(-4 * ms)} 0 ${n(-12 * ms)} z" fill="${c.motif}"/><path d="M${cx} ${topY - n(6 * ms)} q${n(-3 * ms)} ${n(5 * ms)} 0 ${n(7 * ms)} q${n(3 * ms)} ${n(-3 * ms)} 0 ${n(-7 * ms)} z" fill="${c.motif2}"/>`
  return `<path d="M${cx} ${topY - n(12 * ms)} q${n(-6 * ms)} ${n(8 * ms)} 0 ${n(13 * ms)} q${n(6 * ms)} ${n(-6 * ms)} 0 ${n(-13 * ms)} z" fill="${c.motif}" stroke="${c.line}" stroke-width="0.8"/>`
}

function star(x, y, s) {
  return `<path d="M${n(x)} ${n(y - s)} l${n(s * 0.32)} ${n(s * 0.68)} ${n(s * 0.68)} ${n(s * 0.32)} -${n(s * 0.68)} ${n(s * 0.32)} -${n(s * 0.32)} ${n(s * 0.68)} -${n(s * 0.32)} -${n(s * 0.68)} -${n(s * 0.68)} -${n(s * 0.32)} ${n(s * 0.68)} -${n(s * 0.32)} z" fill="#ffd966"/>`
}

function creature(cx, cy, form, species) {
  const c = COLORS[species]
  const r = 16 + form * 2
  const topY = cy - r
  const ms = 0.75 + form * 0.16
  let s = ''
  // wings (form>=3)
  if (form >= 3) {
    const ext = (form - 3) * 8
    s += `<path d="M${n(cx - r * 0.7)} ${cy - 1} q${n(-16 - ext)} -5 ${n(-20 - ext * 1.2)} 10 q12 2 ${n(20 + ext * 1.2)} -4 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.2"/>`
    s += `<path d="M${n(cx + r * 0.7)} ${cy - 1} q${n(16 + ext)} -5 ${n(20 + ext * 1.2)} 10 q-12 2 ${n(-20 - ext * 1.2)} -4 z" fill="${c.motif2}" stroke="${c.line}" stroke-width="1.2"/>`
  }
  // horns (form>=2)
  if (form >= 2) {
    s += `<path d="M${n(cx - r * 0.5)} ${topY + 5} l${n(-2 - form)} ${n(-7 - form * 2)} l${n(5 + form)} 2 z" fill="${c.line}"/>`
    s += `<path d="M${n(cx + r * 0.5)} ${topY + 5} l${n(2 + form)} ${n(-7 - form * 2)} l${n(-5 - form)} 2 z" fill="${c.line}"/>`
  }
  // motif
  s += motif(species, cx, topY, ms, c)
  // crown (form>=4)
  if (form >= 4) s += `<path d="M${cx - 11} ${topY - 1} l4 7 5 -9 5 9 4 -7 -2 13 -15 0 z" fill="#ffd45e" stroke="#e6a90c" stroke-width="1.1" stroke-linejoin="round"/>`
  // feet
  s += `<ellipse cx="${cx - 8}" cy="${n(cy + r - 1)}" rx="6" ry="4" fill="${c.body}" stroke="${c.line}" stroke-width="1.8"/><ellipse cx="${cx + 8}" cy="${n(cy + r - 1)}" rx="6" ry="4" fill="${c.body}" stroke="${c.line}" stroke-width="1.8"/>`
  // body + belly
  s += `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r + 1}" fill="${c.body}" stroke="${c.line}" stroke-width="2.2"/>`
  s += `<ellipse cx="${cx}" cy="${n(cy + r * 0.28)}" rx="${n(r * 0.58)}" ry="${n(r * 0.5)}" fill="${c.belly}"/>`
  // hands
  s += `<ellipse cx="${n(cx - r + 1)}" cy="${cy + 4}" rx="4" ry="5.5" fill="${c.body}" stroke="${c.line}" stroke-width="1.6"/><ellipse cx="${n(cx + r - 1)}" cy="${cy + 4}" rx="4" ry="5.5" fill="${c.body}" stroke="${c.line}" stroke-width="1.6"/>`
  // cheeks
  s += `<ellipse cx="${cx - 11}" cy="${cy + 3}" rx="4" ry="2.6" fill="${CHEEK}" opacity="0.85"/><ellipse cx="${cx + 11}" cy="${cy + 3}" rx="4" ry="2.6" fill="${CHEEK}" opacity="0.85"/>`
  // eyes (happy arcs) + tough brows (form>=3)
  s += `<path d="M${cx - 11} ${cy - 2} q3 -5 7 0" fill="none" stroke="${EYE}" stroke-width="2.4" stroke-linecap="round"/><path d="M${cx + 4} ${cy - 2} q3 -5 7 0" fill="none" stroke="${EYE}" stroke-width="2.4" stroke-linecap="round"/>`
  // mouth
  s += `<path d="M${cx - 5} ${cy + 6} q5 6 10 0 q-5 2 -10 0 z" fill="#ff7d97" stroke="${EYE}" stroke-width="1.1" stroke-linejoin="round"/>`
  // aura
  if (form >= 3) s += star(cx - r - 3, cy - r * 0.3, 3.6)
  if (form >= 4) { s += star(cx + r + 3, cy, 3); s += star(cx + r * 0.2, topY - 5, 2.6) }
  return `<g>${s}</g>`
}

const rows = [['grass', 'くさ'], ['fire', 'ほのお'], ['water', 'みず']]
const colsX = [95, 173, 251, 329]
const rowsY = [110, 225, 340]
const lvLabels = ['Lv.1', 'Lv.20', 'Lv.50', 'Lv.80']

let out = `<svg width="100%" viewBox="0 0 380 410" role="img" xmlns="http://www.w3.org/2000/svg"><title>3種の進化変遷</title><desc>くさ・ほのお・みずの Lv.1→20→50→80 進化ライン</desc>`
lvLabels.forEach((lb, i) => {
  out += `<text x="${colsX[i]}" y="42" font-family="sans-serif" font-size="12" font-weight="500" fill="#8a8f98" text-anchor="middle">${lb}</text>`
})
rows.forEach(([sp, name], ri) => {
  out += `<text x="14" y="${rowsY[ri] + 4}" font-family="sans-serif" font-size="13" font-weight="500" fill="#8a8f98">${name}</text>`
  colsX.forEach((cx, ci) => {
    out += creature(cx, rowsY[ri], ci + 1, sp)
  })
})
out += `<text x="40" y="398" font-family="sans-serif" font-size="12" fill="#a0a4ab">レベルが上がるほど 角→翼→王冠 が増え、オーラで強そうに</text>`
out += `</svg>`
process.stdout.write(out)
