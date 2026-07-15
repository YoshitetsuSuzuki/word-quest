// check-polish.mjs — polish の辞書照合(元データ非改変)。使用: node check-polish.mjs [--all|--limit N|--offset M|--ids a,b|--no-net]
import { runLanguage } from './shared/runner.mjs'
await runLanguage('polish', process.argv.slice(2))
