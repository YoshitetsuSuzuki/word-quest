import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// CAP=1 のときは Capacitor ネイティブアプリ用ビルド。
// - base は相対パス './'（WebView 内はルートが異なるため絶対パスだと真っ白になる）
// - Service Worker(PWA) は無効化（ネイティブ WebView 内の SW キャッシュ事故を回避。資産は元々同梱）
const isCap = process.env.CAP === '1'

// 本番(GitHub Pages build)は /word-quest/ 配下、開発はルート(/)、アプリは相対(./)
export default defineConfig(({ command }) => ({
  base: isCap ? './' : command === 'build' ? '/word-quest/' : '/',
  plugins: [
    react(),
    // プラグインは常に読み込む（virtual:pwa-register を解決するため）。
    // アプリ(CAP)ビルドでは disable:true にして Service Worker 生成のみ止める。
    VitePWA({
      disable: isCap,
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'WordQuest — 英単語で世界一を目指す学習ゲーム',
        short_name: 'WordQuest',
        description: '遊んでいたら英単語が身につく学習ゲーム',
        theme_color: '#0e1020',
        background_color: '#0e1020',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // ワードバンクJSONは初回取得時にキャッシュ（インストール肥大を回避しつつオフライン対応）
        runtimeCaching: [
          {
            urlPattern: /\/wordbank\//,
            // StaleWhileRevalidate: キャッシュを返しつつ裏で更新（IPA追加等が反映される）
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'wordbank-v2',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
}))
