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
  'home.phrases': string; 'home.phrasesHint': string
  'home.goalUnit': string; 'home.goalDone': string; 'home.masteryOf': string; 'home.masteryUnit': string
  'home.todayRaidBoss': string
  'home.battle': string; 'home.battleHint': string; 'home.raid': string; 'home.missions': string; 'home.shop': string
  'quiz.pickMeaning': string; 'quiz.correct': string; 'quiz.next': string; 'quiz.result': string
  'quiz.preparing': string; 'quiz.reviewMode': string; 'quiz.speak': string; 'quiz.difficulty': string
  'quiz.answer': string; 'quiz.example': string
  'quiz.complete': string; 'quiz.correctCount': string; 'quiz.gainedCoins': string; 'quiz.maxCombo': string
  'quiz.toHome': string; 'quiz.again': string; 'quiz.emptyPool': string
  'listening.pickBlank': string; 'listening.pickMeaning': string; 'common.report': string
  'listening.preparing': string; 'listening.complete': string; 'listening.label': string
  'listening.replay': string; 'listening.typeBlank': string; 'listening.correctMark': string
  'listening.styleType': string; 'listening.styleChoice': string; 'listening.inputPlaceholder': string; 'listening.check': string
  'listening.exampleLabel': string; 'listening.readBlank': string
  'study.header': string; 'study.collection': string; 'study.reviewToday': string; 'study.dueSuffix': string; 'study.noneDue': string
  'study.weakDrill': string; 'study.weakDrillHint': string
  'study.exampleStudy': string; 'study.exampleHint': string
  'study.exampleCard': string; 'study.exampleCardHint': string
  'examplecard.title': string; 'examplecard.tapToFlip': string; 'examplecard.empty': string
  'study.lvBeg': string; 'study.lvInt': string; 'study.lvAdv': string
  'study.phraseQuiz': string; 'study.phraseCard': string
  'phrasecard.title': string
  'study.tabWeak': string; 'study.tabLearned': string; 'study.tabDeck': string
  'study.emptyWeak': string; 'study.emptyLearned': string; 'study.emptyDeck': string
  'study.searchPlaceholder': string; 'study.morePre': string; 'study.moreUnit': string
  'study.shuffle': string; 'study.filterAll': string; 'study.addDeck': string; 'study.inDeckMark': string
  'study.viewActive': string; 'study.viewMastered': string; 'study.markMastered': string; 'study.restore': string
  'study.deckTestPre': string; 'study.deckTestUnit': string
  'study.myDeckAria': string; 'study.meaning': string; 'study.tapToReveal': string; 'study.remove': string
  'profile.level': string; 'profile.xp': string; 'profile.nextLv': string; 'profile.coins': string; 'profile.rating': string
  'profile.winRate': string; 'profile.win': string; 'profile.loss': string; 'profile.totalCorrect': string; 'profile.totalAnswered': string
  'profile.loginStreak': string; 'profile.dayUnit': string; 'profile.wordsLearned': string
  'profile.achievements': string; 'profile.settings': string
  'profile.autoPlay': string; 'profile.sfx': string; 'profile.sfxVolume': string; 'profile.bgm': string; 'profile.bgmVolume': string
  'profile.feedback': string; 'profile.reset': string; 'profile.resetConfirm': string
  'common.back': string
  'rank.title': string; 'rank.coin': string; 'rank.elo': string; 'rank.today': string; 'rank.correct': string
  'rank.unit': string; 'rank.yourRank': string; 'rank.rankSuffix': string; 'rank.you': string
  'battle.title': string; 'battle.you': string; 'battle.vs': string
  'battle.ruleQPre': string; 'battle.ruleQPost': string; 'battle.ruleReward': string; 'battle.ruleFeePre': string
  'battle.joinPre': string; 'battle.joinPost': string; 'battle.notEnough': string
  'battle.myScore': string; 'battle.correctCount': string; 'battle.eloDelta': string
  'raid.title': string; 'raid.hit': string; 'raid.attackPrompt': string
  'raid.contribution': string; 'raid.coop': string; 'raid.rewardPre': string; 'raid.rewardTitlePre': string; 'raid.rewardTitlePost': string
  'raid.clearedClaimed': string; 'raid.claim': string; 'raid.attack': string
  'missions.title': string; 'missions.subtitle': string; 'missions.claimed': string; 'missions.claim': string; 'missions.locked': string
  'shop.title': string; 'shop.subtitle': string; 'shop.freeze': string; 'shop.freezeDesc': string; 'shop.owned': string
  'shop.full': string; 'shop.titles': string; 'shop.frames': string; 'shop.effects': string; 'shop.equip': string; 'shop.equipped': string
  'onboard.welcome': string; 'onboard.intro': string; 'onboard.introAccent': string; 'onboard.introRest': string
  'onboard.bullet1': string; 'onboard.bullet2': string; 'onboard.bullet3': string; 'onboard.start': string
  'onboard.nameTitle': string; 'onboard.nameDesc': string; 'onboard.namePlaceholder': string; 'onboard.startWithName': string; 'onboard.startNoName': string
  'onboarding.chooseLang': string
  'settings.language': string
  'cat.english': string; 'cat.chinese': string; 'cat.korean': string; 'cat.japanese': string
  'cat.spanish': string; 'cat.french': string; 'cat.german': string
  'login.title': string; 'login.streakPre': string; 'login.streakPost': string; 'login.claim': string; 'login.dayUnit': string
  'celebrate.levelupSub': string; 'celebrate.levelupSubPost': string; 'celebrate.raidTitlePre': string; 'celebrate.raidTitlePost': string; 'celebrate.raidClearDefault': string
  'celebrate.achievement': string; 'celebrate.streakPre': string; 'celebrate.streakPost': string; 'celebrate.tapContinue': string
  'daily.title': string; 'daily.done': string; 'daily.dayUnit': string; 'daily.streakWarnPre': string; 'daily.streakWarnMid': string; 'daily.streakWarnPost': string
  'daily.quizPre': string; 'daily.quizUnit': string; 'daily.seeWord': string; 'daily.loginBonus': string; 'daily.wordOfDay': string
  'daily.edit': string; 'daily.settingsTitle': string; 'daily.goalLabel': string; 'daily.itemsLabel': string
  'daily.itemQuiz': string; 'daily.itemWord': string; 'daily.itemListening': string; 'daily.itemPhrase': string; 'daily.itemExample': string; 'daily.itemReview': string; 'daily.itemLogin': string
  'weekly.thisWeek': string; 'weekly.days': string
  'pet.name': string
  'pet.speciesGreen': string; 'pet.speciesFire': string; 'pet.speciesWater': string
  'pet.chooseTitle': string; 'pet.chooseHint': string
  'pet.moodHappy': string; 'pet.moodNormal': string; 'pet.moodHungry': string; 'pet.moodSad': string
  'pet.evolved': string; 'pet.toNextPre': string; 'pet.toNextUnit': string; 'pet.maxLevel': string
  'pet.addBuddy': string; 'pet.buddyMax': string; 'pet.switchAria': string
  'pet.speciesLight': string; 'pet.speciesDark': string; 'pet.speciesThunder': string; 'pet.speciesRainbow': string; 'pet.speciesStar': string
  'pet.catalogTitle': string; 'pet.rarityCommon': string; 'pet.rarityRare': string; 'pet.rarityLegendary': string
  'pet.unlock': string; 'pet.addPet': string; 'pet.owned': string; 'pet.slotFull': string
  'pet.rename': string; 'pet.renameTitle': string; 'pet.namePlaceholder': string; 'pet.renameSave': string
  'pet.openBox': string; 'pet.boxTitle': string; 'pet.setActive': string; 'pet.active': string
  'pet.fuse': string; 'pet.fuseConfirm': string; 'pet.yes': string; 'pet.no': string
  'pet.newBadge': string; 'pet.addedPre': string; 'pet.addedSuffix': string
}
