import type { CapacitorConfig } from '@capacitor/cli'

// アプリID(bundle ID)は最初のストア申請後は変更不可。必要なら申請前に変更する。
const config: CapacitorConfig = {
  appId: 'com.infinitygames.wordquest',
  appName: 'ちりつも単語',
  webDir: 'dist',
}

export default config
