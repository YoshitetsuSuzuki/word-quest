import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App'
import { GameProvider } from './state/GameContext'

// Service Worker 登録（オフライン動作 / 自動更新）
registerSW({ immediate: true })

// 注: StrictMode は付けない。ゲームロジックの副作用ある操作を
// 開発時に二重実行させないため（報酬の二重加算防止）。
createRoot(document.getElementById('root')!).render(
  <GameProvider>
    <App />
  </GameProvider>,
)
