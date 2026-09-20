import { useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { useNav } from '../state/nav'
import { NotificationService } from '../services/NotificationService'
import { todayStr } from '../state/dateUtils'
import { comebackSchedule } from '../modules/comeback/comebackPlan'
import { activePet } from '../core/PetEngine'

/**
 * 学習状況に応じたローカル通知の付け外し係（UIなし）。
 *   - ストリーク危機: 「今日まだ0問」の間だけ今夜21:30の単発通知を予約し、
 *     1問でも解いたら即解除する（既に学習した人に鳴らさない）。
 *   - リーグ結果: 毎週月曜8:00の繰り返し通知を1本だけ維持する。
 *   - 復帰通知: 最終学習日を起点に3日後〜1年後まで10本を予約する。学習するたびに
 *     貼り直すので、続けている人には一通も届かない（次の予約で常に先送りされる）。
 * すべてネイティブのみ・失敗しても無害（NotificationService側で no-op 保証）。
 */
export function NotificationCoordinator() {
  const { user } = useGame()
  const { t, locale } = useNav()

  const studiedToday = user.todayAnsweredDate === todayStr() && user.todayAnswered > 0
  const petName = activePet(user).name?.trim() || t('pet.name')
  const learnedCount = user.learnedQuestionIds.length

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

  // 復帰通知。最終学習日が動くたびに10本まとめて貼り直す。
  useEffect(() => {
    if (!NotificationService.isSupported()) return
    void (async () => {
      if (!(await NotificationService.hasPermission())) return
      const base = user.lastStudyDate ? new Date(`${user.lastStudyDate}T00:00:00`) : new Date()
      const items = comebackSchedule(base).map((x) => ({
        id: x.id,
        at: x.at,
        // 相棒の名前と、それまでに覚えた語数を差し込む
        title: t(`comeback.t.${x.key}` as never).replace('%s', petName),
        // 語数は3桁区切りにする（1235語より1,235語のほうが一目で量が伝わる）
        body: t(`comeback.b.${x.key}` as never).replace('%s', petName).replace('%d', learnedCount.toLocaleString()),
      }))
      await NotificationService.scheduleComeback(items)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.lastStudyDate, petName, learnedCount, locale])

  return null
}
