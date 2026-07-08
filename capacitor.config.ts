import type { CapacitorConfig } from '@capacitor/cli'

// アプリID(bundle ID)は最初のストア申請後は変更不可。必要なら申請前に変更する。
const config: CapacitorConfig = {
  appId: 'com.wordquest.app',
  appName: 'WordQuest',
  webDir: 'dist',
}

export default config
