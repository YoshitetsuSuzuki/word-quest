// ============================================================================
// inflect.english.mjs  英語の屈折形生成(共有モジュール)
// build-examples-english.mjs(例文選定) と build-example-forms.mjs(表層形抽出)
// が同一ロジックを使うことで、選定時と抽出時のマッチングを完全に一致させる。
// ============================================================================

// base: [past, pastParticiple, ...] (baseと同綴りの形は含めなくてよい)
export const IRREGULAR_VERBS = {
  arise: ['arose', 'arisen'], awake: ['awoke', 'awoken'], bear: ['bore', 'borne', 'born'],
  beat: ['beaten'], become: ['became'], begin: ['began', 'begun'], bend: ['bent'],
  bind: ['bound'], bite: ['bit', 'bitten'], bleed: ['bled'], blow: ['blew', 'blown'],
  break: ['broke', 'broken'], breed: ['bred'], bring: ['brought'], build: ['built'],
  burn: ['burnt'], buy: ['bought'], catch: ['caught'], choose: ['chose', 'chosen'],
  cling: ['clung'], come: ['came'], creep: ['crept'], deal: ['dealt'], dig: ['dug'],
  draw: ['drew', 'drawn'], dream: ['dreamt'], drink: ['drank', 'drunk'],
  drive: ['drove', 'driven'], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'],
  feed: ['fed'], feel: ['felt'], fight: ['fought'], find: ['found'], flee: ['fled'],
  fling: ['flung'], fly: ['flew', 'flown'], forbid: ['forbade', 'forbidden'],
  forget: ['forgot', 'forgotten'], forgive: ['forgave', 'forgiven'],
  freeze: ['froze', 'frozen'], get: ['got', 'gotten'], give: ['gave', 'given'],
  go: ['went', 'gone'], grind: ['ground'], grow: ['grew', 'grown'], hang: ['hung'],
  have: ['had'], hear: ['heard'], hide: ['hid', 'hidden'], hold: ['held'],
  keep: ['kept'], kneel: ['knelt'], know: ['knew', 'known'], lay: ['laid'],
  lead: ['led'], leap: ['leapt'], learn: ['learnt'], leave: ['left'], lend: ['lent'],
  lie: ['lay', 'lain'], light: ['lit'], lose: ['lost'], make: ['made'],
  mean: ['meant'], meet: ['met'], mistake: ['mistook', 'mistaken'],
  overcome: ['overcame'], pay: ['paid'], ride: ['rode', 'ridden'],
  ring: ['rang', 'rung'], rise: ['rose', 'risen'], run: ['ran'], say: ['said'],
  see: ['saw', 'seen'], seek: ['sought'], sell: ['sold'], send: ['sent'],
  sew: ['sewn'], shake: ['shook', 'shaken'], shine: ['shone'], shoot: ['shot'],
  show: ['shown'], shrink: ['shrank', 'shrunk'], sing: ['sang', 'sung'],
  sink: ['sank', 'sunk'], sit: ['sat'], sleep: ['slept'], slide: ['slid'],
  sling: ['slung'], speak: ['spoke', 'spoken'], speed: ['sped'], spend: ['spent'],
  spin: ['spun'], spit: ['spat'], spring: ['sprang', 'sprung'], stand: ['stood'],
  steal: ['stole', 'stolen'], stick: ['stuck'], sting: ['stung'],
  stink: ['stank', 'stunk'], strike: ['struck'], string: ['strung'],
  strive: ['strove', 'striven'], swear: ['swore', 'sworn'], sweep: ['swept'],
  swell: ['swollen'], swim: ['swam', 'swum'], swing: ['swung'],
  take: ['took', 'taken'], teach: ['taught'], tear: ['tore', 'torn'],
  tell: ['told'], think: ['thought'], throw: ['threw', 'thrown'],
  tread: ['trod', 'trodden'], understand: ['understood'], undergo: ['underwent', 'undergone'],
  wake: ['woke', 'woken'], wear: ['wore', 'worn'], weave: ['wove', 'woven'],
  weep: ['wept'], win: ['won'], wind: ['wound'], withdraw: ['withdrew', 'withdrawn'],
  write: ['wrote', 'written'],
}

export const IRREGULAR_PLURALS = {
  man: ['men'], woman: ['women'], child: ['children'], foot: ['feet'],
  tooth: ['teeth'], mouse: ['mice'], goose: ['geese'], person: ['people'],
  ox: ['oxen'], phenomenon: ['phenomena'], criterion: ['criteria'],
  analysis: ['analyses'], crisis: ['crises'], basis: ['bases'], thesis: ['theses'],
  hypothesis: ['hypotheses'], leaf: ['leaves'], knife: ['knives'], wife: ['wives'],
  life: ['lives'], wolf: ['wolves'], shelf: ['shelves'], half: ['halves'],
  thief: ['thieves'], loaf: ['loaves'], calf: ['calves'], self: ['selves'],
  scarf: ['scarves'],
}

// 一般動詞の不規則過去/過去分詞と同綴りの見出し語は、コーパス中の用例の大半が
// 動詞の過去形であり語義(名詞等)と食い違うため、例文付与の対象外とする。
// ただし名詞用法が明確に優勢な語(KEEP)は付与対象に残す。
export const AMBIG_KEEP = new Set(['ground', 'wound', 'people', 'lives', 'bases'])
export const IRREGULAR_FORMS = new Set(
  Object.values(IRREGULAR_VERBS).flat().filter((f) => !AMBIG_KEEP.has(f)),
)

/** 見出し語の規則変化+主要不規則変化を生成(見出し形そのものは含まない) */
export function inflections(word) {
  const forms = new Set()
  // 複数形・三単現
  if (/(?:[sxz]|[cs]h)$/.test(word)) forms.add(word + 'es')
  else if (/[^aeiou]y$/.test(word)) forms.add(word.slice(0, -1) + 'ies')
  else forms.add(word + 's')
  if (/o$/.test(word)) forms.add(word + 'es') // go→goes, potato→potatoes
  // 過去形・過去分詞 (-ed)
  if (/e$/.test(word)) forms.add(word + 'd')
  else if (/[^aeiou]y$/.test(word)) forms.add(word.slice(0, -1) + 'ied')
  else forms.add(word + 'ed')
  // ing形
  if (/ie$/.test(word)) forms.add(word.slice(0, -2) + 'ying') // lie→lying
  else if (/e$/.test(word) && !/ee$/.test(word)) forms.add(word.slice(0, -1) + 'ing')
  else forms.add(word + 'ing')
  // 短母音+子音の子音重複 (stop→stopped/stopping)
  if (/[^aeiou][aeiou][bcdfglmnprtvz]$/.test(word)) {
    const c = word.at(-1)
    forms.add(word + c + 'ed')
    forms.add(word + c + 'ing')
  }
  // 不規則変化
  for (const f of IRREGULAR_VERBS[word] ?? []) forms.add(f)
  for (const f of IRREGULAR_PLURALS[word] ?? []) forms.add(f)
  forms.delete(word)
  return forms
}
