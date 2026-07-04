import zlib from 'node:zlib'
import fs from 'node:fs'

// 最小PNGエンコーダ（RGBA, no-filter）
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([len, t, data, crc])
}
function png(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y)
      const o = rowStart + 1 + x * 4
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// カラー
const night = [14, 16, 32, 255]
const accent = [124, 92, 255, 255]
const accent2 = [0, 224, 198, 255]

function make(size, maskable) {
  const cx = size / 2, cy = size / 2
  const r = maskable ? size * 0.30 : size * 0.36
  return png(size, (x, y) => {
    const dx = x - cx, dy = y - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    // 背景（角丸っぽく: maskableは全面塗り）
    let col = night
    if (dist < r) col = accent
    if (dist < r * 0.55) col = accent2
    // 中央に小さな "W" 風の切り欠き（簡易: 中心の縦線）
    if (dist < r && Math.abs(dx) < size * 0.012) col = night
    return col
  })
}

fs.writeFileSync(process.argv[2] + '/pwa-192.png', make(192, false))
fs.writeFileSync(process.argv[2] + '/pwa-512.png', make(512, false))
fs.writeFileSync(process.argv[2] + '/pwa-maskable-512.png', make(512, true))
fs.writeFileSync(process.argv[2] + '/apple-touch-icon.png', make(180, false))
console.log('icons written')
