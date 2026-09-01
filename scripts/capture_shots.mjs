// ============================================================================
// capture_shots.mjs  App Store用スクショの生素材を撮る（puppeteer-core + 既存Chrome）
//   デモ状態(VITE_DEMO=1 の dev server)へ接続し、独自機能の画面を実寸で保存する。
//   出力: appstore-screenshots/<name>.png（1320x2868, 6.9インチ相当）
// ============================================================================
import puppeteer from 'puppeteer-core'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(root, 'appstore-screenshots')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://localhost:5173'
const VIEW = { width: 440, height: 956, deviceScaleFactor: 3 } // = 1320x2868

// 独自機能を先頭に。screen はクリックで到達する画面。
const SHOTS = [
  { file: 'u1-pet.png', screen: 'home' }, // ホーム上部＝相棒育成
  { file: 'u2-world.png', screen: 'world' }, // 冒険マップ
  { file: 'u3-raid.png', screen: 'raid' }, // 協力レイド
  { file: 'u4-league.png', screen: 'league' }, // 週次リーグ
  { file: 'u5-quiz.png', screen: 'quiz' }, // クイズ(発音)
  { file: 'u6-study.png', screen: 'study' }, // 多言語・単語帳
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function dismissModals(page) {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) => /受け取る|Claim|はじめる/.test(x.innerText) && x.innerText.trim().length < 12)
    if (b) b.click()
  })
  await sleep(300)
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--hide-scrollbars'],
  defaultViewport: VIEW,
})
const page = await browser.newPage()
await page.setViewport(VIEW)

// 日本語ロケールを固定（主要市場が日本のため）
await page.goto(URL, { waitUntil: 'networkidle2' })
await page.evaluate(() => localStorage.setItem('wordquest.locale', 'ja'))
await page.reload({ waitUntil: 'networkidle2' })
await sleep(800)
await dismissModals(page)

for (const shot of SHOTS) {
  // デモの ?screen= で目的画面に直接遷移（確実）
  await page.goto(`${URL}/?screen=${shot.screen}`, { waitUntil: 'networkidle2' })
  await sleep(1600) // 出題データの読込・演出を待つ
  await dismissModals(page)
  await sleep(600)
  await page.screenshot({ path: path.join(OUT, shot.file) })
  console.log('saved', shot.file, `(${shot.screen})`)
}

await browser.close()
console.log('DONE')
