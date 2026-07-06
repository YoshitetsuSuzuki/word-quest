export type Locale = 'ja' | 'en'
export const LOCALES: Locale[] = ['ja', 'en']
/** 全画面共通のUI文言キー。ja/en は同一キー集合を持つこと。 */
export interface Strings {
  'nav.home': string; 'nav.quiz': string; 'nav.study': string; 'nav.rank': string; 'nav.profile': string
  'home.startQuiz': string; 'home.listening': string; 'home.dailyGoal': string
  'quiz.pickMeaning': string; 'quiz.correct': string; 'quiz.next': string; 'quiz.result': string
  'listening.pickBlank': string; 'listening.pickMeaning': string; 'common.report': string
}
