// ============================================================================
// blocklist.english.mjs  卑語・スラー除外リスト(共有モジュール)
//
// 用途:
//   - build-wordbank.mjs      … Lv6-7 候補プール(subtitles由来)からの語の除外
//   - build-examples-english.mjs … Tatoeba 例文の選定時、これらを含む文を除外
// ============================================================================
export const EXT_BLOCKLIST = new Set([
  'fuck', 'fucking', 'fucked', 'fucker', 'fuckers', 'motherfucker', 'motherfuckers',
  'shit', 'shits', 'shitty', 'shite', 'bullshit', 'dipshit', 'horseshit',
  'bitch', 'bitches', 'bitchy', 'asshole', 'assholes', 'arsehole', 'arse',
  'bastard', 'bastards', 'cunt', 'cunts', 'dick', 'dicks', 'dickhead',
  'cock', 'cocks', 'cocksucker', 'pussy', 'pussies', 'prick', 'pricks',
  'whore', 'whores', 'slut', 'sluts', 'hooker', 'hookers', 'skank',
  'fag', 'faggot', 'faggots', 'dyke', 'tranny', 'homo',
  'nigger', 'niggers', 'nigga', 'niggas', 'negro', 'kike', 'chink', 'gook', 'spic', 'wetback',
  'retard', 'retarded', 'spastic', 'schmuck', 'jackass', 'dumbass', 'douche', 'douchebag',
  'wanker', 'wank', 'bollocks', 'twat', 'piss', 'pissed', 'pissing',
  'tits', 'titties', 'boobs', 'boner', 'jizz', 'blowjob', 'handjob', 'dildo', 'milf', 'horny',
  'goddamn', 'goddamned', 'damn', 'dammit', 'crap', 'crappy',
])
