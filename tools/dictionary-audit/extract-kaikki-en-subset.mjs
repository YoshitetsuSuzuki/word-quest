// 第2ソース: Kaikki英語ダンプ(3.19GB)をストリームし、指定見出し語(353対象)一致行のみ抽出
import fs from 'node:fs'; import readline from 'node:readline'; import { Readable } from 'node:stream'
const words = new Set(JSON.parse(fs.readFileSync('/tmp/en-err-words.json','utf8')))
const lower = new Set([...words].map(w=>w.toLowerCase()))
const url='https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl'
const out='data/raw/kaikki-english-subset.jsonl'; const tmp=out+'.tmp'
const r=await fetch(url,{signal:AbortSignal.timeout(1800000),headers:{'User-Agent':'WordQuest-DictAudit/1.0 (verification only)'}})
if(!r.ok){console.error('HTTP',r.status);process.exit(1)}
const rl=readline.createInterface({input:Readable.fromWeb(r.body),crlfDelay:Infinity})
const ws=fs.createWriteStream(tmp); let scanned=0,kept=0
for await(const line of rl){if(!line)continue;scanned++;let e;try{e=JSON.parse(line)}catch{continue};const w=e.word;if(w&&(words.has(w)||lower.has(String(w).toLowerCase()))){ws.write(line+'\n');kept++}}
ws.end();await new Promise(res=>ws.on('finish',res));fs.renameSync(tmp,out)
console.log('抽出完了 走査'+scanned+'行 → 一致'+kept+'件('+(fs.statSync(out).size/1024).toFixed(0)+'KB)')
