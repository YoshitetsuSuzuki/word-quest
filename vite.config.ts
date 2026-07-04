import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// 本番(build)はGitHub Pagesのプロジェクトパス配下(/word-quest/)、開発はルート(/)
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/word-quest/' : '/',
  plugins: [
    react(),
    VitePWA({
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
            handler: 'CacheFirst',
            options: {
              cacheName: 'wordbank',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
}))
