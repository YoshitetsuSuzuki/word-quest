export type Locale = 'ja' | 'en'
export const LOCALES: Locale[] = ['ja', 'en']
/** 全画面共通のUI文言キー。ja/en は同一キー集合を持つこと。 */
export interface Strings {
  'nav.home': string; 'nav.quiz': string; 'nav.study': string; 'nav.rank': string; 'nav.profile': string
  'home.startQuiz': string; 'home.listening': string; 'home.dailyGoal': string
  'home.heroPre': string; 'home.heroAccent': string; 'home.heroPost': string
  'home.streakMid': string; 'home.streakEnd': string
  'home.language': string; 'home.comingSoon': string; 'home.level': string; 'home.mixed': string
  'home.listenHintSpell': string; 'home.listenHintChoice': string
  'home.reviewDuePre': string; 'home.reviewDuePost': string
  'home.goalUnit': string; 'home.goalDone': string; 'home.masteryOf': string; 'home.masteryUnit': string
  'home.todayRaidBoss': string
  'home.battle': string; 'home.battleHint': string; 'home.raid': string; 'home.missions': string; 'home.shop': string
  'quiz.pickMeaning': string; 'quiz.correct': string; 'quiz.next': string; 'quiz.result': string
  'listening.pickBlank': string; 'listening.pickMeaning': string; 'common.report': string
}
