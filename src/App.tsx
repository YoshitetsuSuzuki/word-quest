import { useState } from 'react'
import { NavContext, type Screen } from './state/nav'
import type { Category } from './types'
import { TopBar } from './components/TopBar'
import { BottomNav } from './components/BottomNav'
import { CelebrationOverlay } from './components/CelebrationOverlay'
import { LoginBonusModal } from './components/LoginBonusModal'
import { HomeScreen } from './screens/HomeScreen'
import { QuizScreen } from './screens/QuizScreen'
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
  const [quizMode, setQuizMode] = useState<'normal' | 'review'>('normal')
  // 前回選んだ学習ジャンルを記憶（中国語で遊んでいたら次回も中国語のまま）
  const [category, setCategoryState] = useState<Category>(
    () => (localStorage.getItem(CATEGORY_KEY) as Category | null) ?? 'english',
  )
  const [customIds, setCustomIds] = useState<string[] | null>(null)

  const setCategory = (c: Category) => {
    setCategoryState(c)
    localStorage.setItem(CATEGORY_KEY, c)
  }

  const navigate = (s: Screen) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }

  return (
    <NavContext.Provider value={{ screen, navigate, quizMode, setQuizMode, category, setCategory, customIds, setCustomIds }}>
      <div className="min-h-full max-w-md mx-auto flex flex-col relative">
        <TopBar />
        <main className="flex-1 px-4 py-4">
          {screen === 'home' && <HomeScreen />}
          {screen === 'quiz' && <QuizScreen />}
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
      </div>
    </NavContext.Provider>
  )
}
