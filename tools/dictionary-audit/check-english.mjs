// check-english.mjs — english の辞書照合(元データ非改変)。使用: node check-english.mjs [--all|--limit N|--offset M|--ids a,b|--no-net]
import { runLanguage } from './shared/runner.mjs'
await runLanguage('english', process.argv.slice(2))
