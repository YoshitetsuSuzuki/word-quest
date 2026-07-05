import { useEffect, useState } from 'react'
import { NavContext, type Screen } from './state/nav'
import type { Category } from './types'
import { primeSpeech } from './utils/speech'
import { primeAudio, bgm } from './utils/audio'

const numFromLS = (k: string, d: number) => {
  const v = localStorage.getItem(k)
  return v === null ? d : Number(v)
}
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { LoginBonusModal } from './components/LoginBonusModal'
import { OnboardingModal } from './components/OnboardingModal'
import { HomeScreen } from './screens/HomeScreen'
import { QuizScreen } from './screens/QuizScreen'
import { ListeningScreen } from './screens/ListeningScreen'
import { BattleScreen } from './screens/BattleScreen'
import { RaidScreen } from './screens/RaidScreen'
import { RankingScreen } from './screens/RankingScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { ShopScreen } from './screens/ShopScreen'
import { MissionsScreen } from './screens/MissionsScreen'
import { StudyScreen } from './screens/StudyScreen'

const CATEGORY_KEY = 'wordquest.category'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [quizMode, setQuizMode] = useState<'normal' | 'review' | 'listening'>('normal')
  // 前回選んだ学習ジャンルを記憶（中国語で遊んでいたら次回も中国語のまま）
  const [category, setCategoryState] = useState<Category>(
    () => (localStorage.getItem(CATEGORY_KEY) as Category | null) ?? 'english',
  )
  const [customIds, setCustomIds] = useState<string[] | null>(null)
  const [soundEnabled, setSoundEnabledState] = useState(() => localStorage.getItem('wordquest.sound') !== 'off')
  const [studyLevel, setStudyLevelState] = useState<number>(() => Number(localStorage.getItem('wordquest.level') ?? 0))
  const [sfxEnabled, setSfxEnabledState] = useState(() => localStorage.getItem('wordquest.sfx') !== 'off')
  const [sfxVolume, setSfxVolumeState] = useState(() => numFromLS('wordquest.sfxVol', 0.6))
  const [bgmEnabled, setBgmEnabledState] = useState(() => localStorage.getItem('wordquest.bgm') === 'on')
  const [bgmVolume, setBgmVolumeState] = useState(() => numFromLS('wordquest.bgmVol', 0.25))

  const setCategory = (c: Category) => {
    setCategoryState(c)
    localStorage.setItem(CATEGORY_KEY, c)
  }
  const setSoundEnabled = (v: boolean) => {
    setSoundEnabledState(v)
    localStorage.setItem('wordquest.sound', v ? 'on' : 'off')
  }
  const setStudyLevel = (n: number) => {
    setStudyLevelState(n)
    localStorage.setItem('wordquest.level', String(n))
  }
  const setSfxEnabled = (v: boolean) => {
    setSfxEnabledState(v)
    localStorage.setItem('wordquest.sfx', v ? 'on' : 'off')
  }
  const setSfxVolume = (v: number) => {
    setSfxVolumeState(v)
    localStorage.setItem('wordquest.sfxVol', String(v))
  }
  const setBgmEnabled = (v: boolean) => {
    setBgmEnabledState(v)
    localStorage.setItem('wordquest.bgm', v ? 'on' : 'off')
    if (v) bgm.start(bgmVolume)
    else bgm.stop()
  }
  const setBgmVolume = (v: number) => {
    setBgmVolumeState(v)
    localStorage.setItem('wordquest.bgmVol', String(v))
    bgm.setVolume(v)
  }

  // BGMは初回タップ以降にONなら開始（自動再生ポリシー対策）
  useEffect(() => {
    if (!bgmEnabled) return
    const start = () => {
      primeAudio()
      bgm.start(bgmVolume)
      window.removeEventListener('pointerdown', start)
    }
    window.addEventListener('pointerdown', start)
    return () => window.removeEventListener('pointerdown', start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgmEnabled])

  const navigate = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  // 初回タップで音声エンジンを解錠（1問目から自動再生が鳴るように）
  useEffect(() => {
    const prime = () => {
      primeSpeech()
      primeAudio()
      window.removeEventListener('pointerdown', prime)
    }
    window.addEventListener('pointerdown', prime)
    return () => window.removeEventListener('pointerdown', prime)
  }, [])

  return (
    <NavContext.Provider
      value={{
        screen,
        navigate,
        quizMode,
        setQuizMode,
        category,
        setCategory,
        customIds,
        setCustomIds,
        soundEnabled,
        setSoundEnabled,
        studyLevel,
        setStudyLevel,
        sfxEnabled,
        setSfxEnabled,
        sfxVolume,
        setSfxVolume,
        bgmEnabled,
        setBgmEnabled,
        bgmVolume,
        setBgmVolume,
      }}
    >
      <div className="min-h-full max-w-md mx-auto flex flex-col relative">
        <TopBar />
        <main className="flex-1 px-4 py-4">
          {screen === 'home' && <HomeScreen />}
          {screen === 'quiz' && (quizMode === 'listening' ? <ListeningScreen /> : <QuizScreen />)}
          {screen === 'battle' && <BattleScreen />}
          {screen === 'raid' && <RaidScreen />}
          {screen === 'ranking' && <RankingScreen />}
          {screen === 'profile' && <ProfileScreen />}
          {screen === 'shop' && <ShopScreen />}
          {screen === 'missions' && <MissionsScreen />}
          {screen === 'study' && <StudyScreen />}
        </main>
        <BottomNav />
        <LoginBonusModal />
        <CelebrationOverlay />
        <OnboardingModal />
      </div>
    </NavContext.Provider>
  )
}
