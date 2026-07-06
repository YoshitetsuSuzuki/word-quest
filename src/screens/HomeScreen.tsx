import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { featureFlags } from '../config/featureFlags'
import { getRaidView } from '../modules/raid/raidLogic'
import { getMissionViews } from '../modules/mission/missionLogic'
import { ProgressBar } from '../components/ProgressBar'
import { DailyLoopCard } from '../components/DailyLoopCard'
import { WeeklyChart } from '../components/WeeklyChart'
import { categories } from '../data/categories'
import { todayStr } from '../state/dateUtils'
import type { Strings } from '../i18n/types'

const DAILY_GOAL = 20

const catNameKey = (id: string) =>
  (id === 'chinese' ? 'cat.chinese' : id === 'korean' ? 'cat.korean' : 'cat.english') as keyof Strings

export function HomeScreen() {
  const { user, ensureCategory, isCategoryReady, engine } = useGame()
  const { navigate, setQuizMode, setCustomIds, category, setCategory, studyLevel, setStudyLevel, t } = useNav()

  const selectCategory = (id: typeof category) => {
    setCategory(id)
    void ensureCategory(id) // 先読みしておく
  }
  const levelLabel = (n: number) => (category === 'chinese' ? `HSK${n}` : `Lv${n}`)
  const ready = isCategoryReady(category)
  const levels = ready ? engine.availableLevels(category) : []

  // デイリー目標
  const todayDone = user.todayAnsweredDate === todayStr() ? user.todayAnswered : 0
  // 習得率（このジャンルで一度でも正解した語 / 出題可能語数）
  const prefix = category === 'chinese' ? 'zh' : category === 'korean' ? 'ko' : 'en'
  const learnedInCat = user.learnedQuestionIds.filter((id) => id.startsWith(prefix)).length
  const totalInCat = ready ? engine.categorySize(category) : 0
  const catLabel = t(catNameKey(category))
  const raid = getRaidView(user)
  const missions = getMissionViews(user)
  const doneMissions = missions.filter((m) => m.completed).length
  const dueReview = user.reviewQueue.filter((r) => r.nextReviewAt <= Date.now()).length

  const tiles: { screen: Parameters<typeof navigate>[0]; label: string; icon: string; on: boolean; hint?: string }[] = [
    { screen: 'battle', label: t('home.battle'), icon: '⚔️', on: featureFlags.battleEnabled, hint: t('home.battleHint') },
    { screen: 'raid', label: t('home.raid'), icon: '🐉', on: featureFlags.raidEnabled, hint: `${Math.round(raid.ratio * 100)}%` },
    { screen: 'missions', label: t('home.missions'), icon: '🎯', on: featureFlags.missionsEnabled, hint: `${doneMissions}/${missions.length}` },
    { screen: 'shop', label: t('home.shop'), icon: '🛍️', on: featureFlags.shopEnabled },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black leading-tight">
          {t('home.heroPre')}<span className="text-accent2">{t('home.heroAccent')}</span>{t('home.heroPost')}
        </h1>
        <p className="text-sm text-white/50 mt-1">
          🔥 {user.studyStreak}{t('home.streakMid')}{user.todayCoin}{t('home.streakEnd')}
        </p>
      </div>

      {/* 今日の一式(デイリーループ) */}
      <DailyLoopCard />

      {/* ジャンル選択（プラットフォームの横展開） */}
      <div>
        <div className="text-xs text-white/45 mb-2 font-bold">{t('home.language')}</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {categories.map((c) => {
            const active = c.id === category
            return (
              <button
                key={c.id}
                disabled={!c.available}
                onClick={() => selectCategory(c.id)}
                className={`shrink-0 px-3 py-2 rounded-xl text-sm font-bold transition border ${
                  active
                    ? 'bg-accent text-white border-accent'
                    : c.available
                      ? 'bg-panel2 text-white/70 border-white/10'
                      : 'bg-panel2 text-white/25 border-white/5'
                }`}
              >
                {c.emoji} {t(catNameKey(c.id))}
                {!c.available && <span className="ml-1 text-[9px]">{t('home.comingSoon')}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* レベル選択（級で選んで学ぶ） */}
      {levels.length > 1 && (
        <div>
          <div className="text-xs text-white/45 mb-2 font-bold">{t('home.level')}</div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {[0, ...levels].map((n) => {
              const active = studyLevel === n
              return (
                <button
                  key={n}
                  onClick={() => setStudyLevel(n)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                    active ? 'bg-accent2 text-night border-accent2' : 'bg-panel2 text-white/60 border-white/10'
                  }`}
                >
                  {n === 0 ? t('home.mixed') : levelLabel(n)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* メインCTA */}
      <button
        onClick={() => {
          setQuizMode('normal')
          setCustomIds(null)
          navigate('quiz')
        }}
        className="btn-primary w-full py-5 text-lg relative overflow-hidden"
      >
        <span className="relative z-10">{t('home.startQuiz')}</span>
      </button>

      {/* リスニングモード */}
      <button
        onClick={() => {
          setQuizMode('listening')
          setCustomIds(null)
          navigate('quiz')
        }}
        className="btn-ghost w-full py-4 text-base flex items-center justify-center gap-2"
      >
        {t('home.listening')}
        <span className="text-xs text-white/45">
          {category === 'english' ? t('home.listenHintSpell') : t('home.listenHintChoice')}
        </span>
      </button>

      {/* 復習の案内 */}
      {featureFlags.reviewEnabled && dueReview > 0 && (
        <button
          onClick={() => {
            setQuizMode('review')
            setCustomIds(null)
            navigate('quiz')
          }}
          className="btn-ghost w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          {t('home.reviewDuePre')} {dueReview} {t('home.reviewDuePost')}
        </button>
      )}

      {/* 今日の目標 & 習得率 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-white/45 font-bold">{t('home.dailyGoal')}</div>
          <div className="mt-1 font-black tabular-nums">
            {todayDone}
            <span className="text-white/40 text-sm"> / {DAILY_GOAL}{t('home.goalUnit')}</span>
          </div>
          <ProgressBar ratio={todayDone / DAILY_GOAL} className="mt-2" barClassName={todayDone >= DAILY_GOAL ? 'bg-success' : 'bg-accent2'} height={8} />
          {todayDone >= DAILY_GOAL && <div className="text-[10px] text-success mt-1 font-bold">{t('home.goalDone')}</div>}
        </div>
        <div className="card p-4">
          <div className="text-xs text-white/45 font-bold">{catLabel}{t('home.masteryOf')}</div>
          <div className="mt-1 font-black tabular-nums">
            {learnedInCat}
            <span className="text-white/40 text-sm"> / {totalInCat}{t('home.masteryUnit')}</span>
          </div>
          <ProgressBar ratio={totalInCat ? learnedInCat / totalInCat : 0} className="mt-2" barClassName="bg-gold" height={8} />
        </div>
      </div>

      {/* 週間学習グラフ */}
      <WeeklyChart />

      {/* 機能タイル */}
      <div className="grid grid-cols-2 gap-3">
        {tiles
          .filter((t) => t.on)
          .map((t) => (
            <button
              key={t.screen}
              onClick={() => navigate(t.screen)}
              className="card p-4 text-left active:scale-95 transition"
            >
              <div className="text-3xl">{t.icon}</div>
              <div className="mt-2 font-bold">{t.label}</div>
              {t.hint && <div className="text-xs text-white/45">{t.hint}</div>}
            </button>
          ))}
      </div>

      {/* 今日のレイド プレビュー */}
      {featureFlags.raidEnabled && (
        <button onClick={() => navigate('raid')} className="card p-4 w-full text-left active:scale-95 transition">
          <div className="flex items-center gap-3">
            <div className="text-4xl">{raid.boss.emoji}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/45">{t('home.todayRaidBoss')}</div>
              <div className="font-bold truncate">{raid.boss.name}</div>
              <ProgressBar ratio={raid.ratio} className="mt-2" barClassName="bg-danger" height={8} />
            </div>
          </div>
        </button>
      )}
    </div>
  )
}
