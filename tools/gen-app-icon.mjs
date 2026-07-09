// アプリのアイコン(1024)と起動画面(2732)を生成する。
// 既存ブランド（ネイビー地に紫の円＋ティールの内円＋縦の分割線）を高解像度で再現。
// 出力: resources/icon.png, resources/splash.png, resources/splash-dark.png
// これを @capacitor/assets が各OSの全サイズへ展開する。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'resources')
fs.mkdirSync(outDir, { recursive: true })

const NAVY = '#0e1020'
const PURPLE = '#7b61ff'
const TEAL = '#12d6b4'

// アイコン本体マーク（中心(cx,cy)、外円半径r）
const mark = (cx, cy, r) => {
  const inner = r * 0.57
  const lineW = r * 0.066
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${PURPLE}"/>
    <circle cx="${cx}" cy="${cy}" r="${inner}" fill="${TEAL}"/>
    <rect x="${cx - lineW / 2}" y="${cy - r}" width="${lineW}" height="${r * 2}" fill="${NAVY}"/>`
}

const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="${NAVY}"/>
  ${mark(512, 512, 362)}
</svg>`

const splashSvg = `<svg width="2732" height="2732" viewBox="0 0 2732 2732" xmlns="http://www.w3.org/2000/svg">
  <rect width="2732" height="2732" fill="${NAVY}"/>
  ${mark(1366, 1240, 300)}
  <text x="1366" y="1720" text-anchor="middle" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="150" font-weight="800" fill="#ffffff">WordQuest</text>
</svg>`

await sharp(Buffer.from(iconSvg)).png().toFile(path.join(outDir, 'icon.png'))
await sharp(Buffer.from(splashSvg)).png().toFile(path.join(outDir, 'splash.png'))
await sharp(Buffer.from(splashSvg)).png().toFile(path.join(outDir, 'splash-dark.png'))
console.log('生成: resources/icon.png (1024), splash.png / splash-dark.png (2732)')
