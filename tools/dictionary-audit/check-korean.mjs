// check-korean.mjs — korean の辞書照合(元データ非改変)。使用: node check-korean.mjs [--all|--limit N|--offset M|--ids a,b|--no-net]
import { runLanguage } from './shared/runner.mjs'
await runLanguage('korean', process.argv.slice(2))
