import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { getMissionViews } from '../modules/mission/missionLogic'
import { ProgressBar } from '../components/ProgressBar'

export function MissionsScreen() {
  const { user, claimMission } = useGame()
  const { t } = useNav()
  const missions = getMissionViews(user)

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black">{t('missions.title')}</h2>
      <p className="text-xs text-white/45">{t('missions.subtitle')}</p>

      <div className="space-y-3">
        {missions.map((m) => (
          <div key={m.def.id} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{m.def.title}</span>
              <span className="text-xs text-gold font-bold shrink-0 ml-2">
                🪙{m.def.rewardCoin} / {m.def.rewardXp}XP
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2.5">
              <ProgressBar ratio={m.progress / m.def.target} barClassName="bg-accent" />
              <span className="text-[11px] text-white/50 tabular-nums shrink-0">
                {m.progress}/{m.def.target}
              </span>
            </div>
            <div className="mt-3">
              {m.claimed ? (
                <div className="text-center text-xs text-success font-bold py-1.5">{t('missions.claimed')}</div>
              ) : (
                <button
                  disabled={!m.completed}
                  onClick={() => claimMission(m.def.id)}
                  className="btn-primary w-full py-2 text-sm"
                >
                  {m.completed ? t('missions.claim') : t('missions.locked')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
