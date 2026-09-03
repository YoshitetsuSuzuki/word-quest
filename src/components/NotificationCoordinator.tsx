import { useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { NotificationService } from '../services/NotificationService'
import { todayStr } from '../state/dateUtils'

/**
 * 学習状況に応じたローカル通知の付け外し係（UIなし）。
 *   - ストリーク危機: 「今日まだ0問」の間だけ今夜21:30の単発通知を予約し、
 *     1問でも解いたら即解除する（既に学習した人に鳴らさない）。
 *   - リーグ結果: 毎週月曜8:00の繰り返し通知を1本だけ維持する。
 * すべてネイティブのみ・失敗しても無害（NotificationService側で no-op 保証）。
 */
export function NotificationCoordinator() {
  const { user } = useGame()
  const { t, locale } = useNav()

  const studiedToday = user.todayAnsweredDate === todayStr() && user.todayAnswered > 0

  useEffect(() => {
    if (!NotificationService.isSupported()) return
    void (async () => {
      if (await NotificationService.hasPermission()) {
        if (studiedToday) await NotificationService.cancelStreakGuard()
        else await NotificationService.scheduleStreakGuard(t('notify.streakTitle'), t('notify.streakBody'))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studiedToday, locale])

  useEffect(() => {
    if (!NotificationService.isSupported()) return
    void (async () => {
      if (await NotificationService.hasPermission()) {
        await NotificationService.scheduleLeagueResult(t('notify.leagueTitle'), t('notify.leagueBody'))
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])

  return null
}
