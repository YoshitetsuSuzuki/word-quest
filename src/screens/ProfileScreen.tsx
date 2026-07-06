import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { achievements } from '../data/achievements.config'
import { equippedTitle, equippedFrameClass } from '../modules/shop/shopLogic'
import { featureFlags } from '../config/featureFlags'
import { generalReportUrl } from '../utils/report'

export function ProfileScreen() {
  const { user, resetAll } = useGame()
  const {
    soundEnabled,
    setSoundEnabled,
    sfxEnabled,
    setSfxEnabled,
    sfxVolume,
    setSfxVolume,
    bgmEnabled,
    setBgmEnabled,
    bgmVolume,
    setBgmVolume,
    t,
  } = useNav()
  const title = equippedTitle(user)
  const frame = equippedFrameClass(user)
  const totalBattles = user.battleWins + user.battleLosses
  const winRate = totalBattles > 0 ? Math.round((user.battleWins / totalBattles) * 100) : 0
  const unlocked = new Set(user.achievements.map((a) => a.id))

  const stats: { label: string; value: string }[] = [
    { label: t('profile.level'), value: `Lv.${user.level}` },
    { label: t('profile.xp'), value: `${user.xp} / ${t('profile.nextLv')}` },
    { label: t('profile.coins'), value: `🪙 ${user.coin.toLocaleString()}` },
    { label: t('profile.rating'), value: `${user.eloRating}` },
    { label: t('profile.winRate'), value: `${winRate}% (${user.battleWins}${t('profile.win')}${user.battleLosses}${t('profile.loss')})` },
    { label: t('profile.totalCorrect'), value: `${user.totalCorrect}` },
    { label: t('profile.totalAnswered'), value: `${user.totalAnswered}` },
    { label: t('profile.loginStreak'), value: `🔥 ${user.streakDays}${t('profile.dayUnit')}` },
    { label: t('profile.wordsLearned'), value: `${user.learnedQuestionIds.length}` },
  ]

  const onReset = () => {
    if (confirm(t('profile.resetConfirm'))) resetAll()
  }

  return (
    <div className="space-y-5">
      {/* ヘッダー */}
      <div className="card p-5 text-center">
        <div
          className={`w-20 h-20 mx-auto rounded-full bg-accent/30 grid place-items-center text-3xl font-black ring-4 ${
            frame ?? 'ring-accent/40'
          }`}
        >
          {user.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="mt-3 text-xl font-black">{user.name}</div>
        {title && (
          <div className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gold/20 text-gold font-bold">
            {title}
          </div>
        )}
      </div>

      {/* ステータス */}
      <div className="card p-4 divide-y divide-white/5">
        {stats.map((s) => (
          <div key={s.label} className="flex justify-between py-2 text-sm">
            <span className="text-white/55">{s.label}</span>
            <span className="font-bold tabular-nums">{s.value}</span>
          </div>
        ))}
      </div>

      {/* 実績 */}
      {featureFlags.achievementsEnabled && (
        <div>
          <h3 className="font-black mb-2">{t('profile.achievements')}（{unlocked.size}/{achievements.length}）</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {achievements.map((a) => {
              const got = unlocked.has(a.id)
              return (
                <div
                  key={a.id}
                  className={`card p-3 text-center ${got ? '' : 'opacity-35 grayscale'}`}
                  title={a.description}
                >
                  <div className="text-2xl">{a.emoji}</div>
                  <div className="text-[10px] font-bold mt-1 leading-tight">{a.title}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 設定 */}
      <div className="card p-4 space-y-1">
        <h3 className="font-black text-sm mb-2">{t('profile.settings')}</h3>

        <Toggle label={t('profile.autoPlay')} on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />

        <div className="border-t border-white/5 pt-2 mt-2">
          <Toggle label={t('profile.sfx')} on={sfxEnabled} onToggle={() => setSfxEnabled(!sfxEnabled)} />
          {sfxEnabled && <Slider label={t('profile.sfxVolume')} value={sfxVolume} onChange={setSfxVolume} />}
        </div>

        <div className="border-t border-white/5 pt-2 mt-2">
          <Toggle label={t('profile.bgm')} on={bgmEnabled} onToggle={() => setBgmEnabled(!bgmEnabled)} />
          {bgmEnabled && <Slider label={t('profile.bgmVolume')} value={bgmVolume} onChange={setBgmVolume} />}
        </div>
      </div>

      <a
        href={generalReportUrl()}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost w-full py-3 text-sm block text-center"
      >
        {t('profile.feedback')}
      </a>

      <button className="btn-ghost w-full py-3 text-sm text-danger" onClick={onReset}>
        {t('profile.reset')}
      </button>
    </div>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} className="w-full flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      <span className={`relative w-12 h-7 rounded-full transition shrink-0 ${on ? 'bg-accent' : 'bg-white/15'}`}>
        <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-3 py-1 pl-1">
      <span className="text-[11px] text-white/45 shrink-0 w-20">{label}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-accent2"
      />
      <span className="text-[11px] text-white/40 w-8 text-right tabular-nums">{Math.round(value * 100)}</span>
    </div>
  )
}
