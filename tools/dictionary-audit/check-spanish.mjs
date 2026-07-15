// check-spanish.mjs — spanish の辞書照合(元データ非改変)。使用: node check-spanish.mjs [--all|--limit N|--offset M|--ids a,b|--no-net]
import { runLanguage } from './shared/runner.mjs'
await runLanguage('spanish', process.argv.slice(2))
