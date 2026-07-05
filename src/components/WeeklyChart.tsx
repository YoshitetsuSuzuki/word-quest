import { useGame } from '../state/GameContext'
import { streakConfig } from '../data/streak.config'
import { todayStr } from '../state/dateUtils'

/** 直近7日の回答数バー。目標到達日は金色 */
export function WeeklyChart() {
  const { user } = useGame()
  const days: { key: string; label: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = todayStr(d)
    days.push({ key, label: '日月火水木金土'[d.getDay()], count: user.dailyHistory[key] ?? 0 })
  }
  const max = Math.max(streakConfig.dailyGoal, ...days.map((d) => d.count))
  return (
    <div className="card p-4">
      <div className="text-xs text-white/45 font-bold mb-2">この1週間</div>
      <div className="flex items-end gap-2 h-16">
        {days.map((d) => (
          <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className={`w-full rounded-t ${d.count >= streakConfig.dailyGoal ? 'bg-gold' : 'bg-accent2/70'}`}
              style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
            />
            <div className="text-[9px] text-white/40 shrink-0">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
