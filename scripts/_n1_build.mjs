import fs from 'fs';

// ---------- CSV parse ----------
function parseCSV(text){
  const rows=[]; let row=[]; let field=""; let inQ=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inQ){
      if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else inQ=false; }
      else field+=c;
    } else {
      if(c==='"'){inQ=true;}
      else if(c===','){row.push(field);field="";}
      else if(c==='\n'){row.push(field);rows.push(row);row=[];field="";}
      else if(c==='\r'){}
      else field+=c;
    }
  }
  if(field.length||row.length){row.push(field);rows.push(row);}
  return rows;
}

// ---------- Step A: normalize N1 vocab ----------
const raw=fs.readFileSync('.cache/_n1_raw.csv','utf8');
const rows=parseCSV(raw);
// 表記/読みの正規化:
//  - 括弧注記 (かん)/(花を〜) 等を除去
//  - 空白/カンマ/読点で区切られた複数表記は先頭を採用 (例: "生ける, 活ける" -> "生ける")
//  - 末尾の記号(カンマ・読点)を除去
function normExpr(e){
  let s=e.trim();
  s=s.replace(/[（(][^）)]*[）)]/g,'').trim();   // 括弧注記除去
  s=s.split(/[\s,、，]+/)[0].trim();             // 先頭表記のみ
  s=s.replace(/[,、，。;；]+$/,'').trim();          // 末尾記号除去
  return s;
}
function stripTilde(s){ return s.replace(/[～〜~]/g,'').trim(); }
// チルダ付き(接辞マーカー)判定
function hasAffixMarker(e){ return /[～〜~]/.test(e); }

const seen=new Set();
const vocab=[];
let rawCount=0;
for(let i=1;i<rows.length;i++){
  const r=rows[i];
  if(!r||!r[0]) continue;
  rawCount++;
  const rawExpr=r[0], rawRead=r[1]||'';
  let expr=normExpr(rawExpr);
  let reading=normExpr(rawRead);
  let kana=stripTilde(reading||expr);
  let word=stripTilde(expr||reading);
  if(!word) word=kana;
  if(!kana) kana=word;
  if(!word&&!kana) continue;
  const affix = hasAffixMarker(rawExpr)||hasAffixMarker(rawRead);
  const key=word+'|'+kana;
  if(seen.has(key)) continue;
  seen.add(key);
  vocab.push({word,kana,affix});
}

// ---------- Step B: JMdict index (common優先, full フォールバック) ----------
function buildIndex(path){
  const jm=JSON.parse(fs.readFileSync(path,'utf8'));
  const byKanji=new Map(), byKana=new Map();
  const push=(map,k,e)=>{ if(!map.has(k))map.set(k,[]); map.get(k).push(e); };
  for(const w of jm.words){
    const kanjiTexts=(w.kanji||[]).map(k=>k.text);
    const kanaTexts=(w.kana||[]).map(k=>k.text);
    const entry={w,kanjiTexts,kanaTexts};
    for(const t of kanjiTexts) push(byKanji,t,entry);
    for(const t of kanaTexts) push(byKana,t,entry);
  }
  return {byKanji,byKana};
}
const idxCommon=buildIndex('.cache/jmdict-eng-common-3.6.2.json');
const idxFull=buildIndex('.cache/jmdict-eng-3.6.2.json');

// existing gloss keys to exclude (N5-N2 already shipped)
const existing=JSON.parse(fs.readFileSync('tools/gloss.en.japanese.json','utf8'));
const existingKeys=new Set(Object.keys(existing));
// also exclude by the plain surface used as key (their keys are the "word" form)

// misc tags to avoid for central meaning
// col(口語)は稀用ではなく頻用語なので除外しない。稀用/古語/俗語/罵倒/擬態のみ回避。
const BAD_MISC=new Set(['arch','obs','obsc','rare','sl','vulg','derog','joc','poet','X','dated','hist','male','fem','on-mim','proverb','yoji','id']);
// pos classification
// 真の活用動詞のみ verb 扱い。vs(サ変名詞)は名詞見出しとして 素 のまま。
function isVerb(pos){
  const hasNounLike=pos.some(p=>p==='n'||p==='n-suf'||p==='n-pref'||p==='adj-no'||p==='n-adv'||p==='n-t');
  // conjugating verbs (v1, v5*, vk, vz, vs-i, vs-s, vr, vn)
  const hasConjVerb=pos.some(p=>/^v[15k]/.test(p)||p==='vz'||p==='vs-i'||p==='vs-s'||p==='vr'||p==='vn');
  if(hasConjVerb) return true;
  // bare vs/vs-c without noun-like tag: verbal noun used as verb
  const hasVs=pos.some(p=>p==='vs'||p==='vs-c');
  return hasVs && !hasNounLike;
}
function isAdj(pos){ return pos.some(p=>p==='adj-i'||p==='adj-na'||p==='adj-no'||p==='adj-t'||p==='adj-f'||p==='adj-pn'); }
function isAdv(pos){ return pos.some(p=>p==='adv'||p==='adv-to'); }
function isNoun(pos){ return pos.some(p=>p==='n'||p==='n-adv'||p==='n-t'||p==='n-suf'||p==='n-pref'||p==='pn'); }
// affix/particle pos to reject entirely
function isAffixOnly(pos){
  if(pos.length===0) return false;
  // 接辞(pref/suf)・助詞(prt)・助動詞(aux/cop)・接続詞(conj)・助数詞(ctr)は除外。
  // int(間投詞/挨拶)は独立語として保持。
  return pos.every(p=>p==='pref'||p==='suf'||p==='prt'||p==='cop'||p==='aux'||p==='aux-v'||p==='aux-adj'||p==='ctr'||p==='conj');
}

function cleanGloss(t){
  let s=t.trim();
  // 冗長な括弧注記(例示・補足)を除去して簡潔化: "grasp (of the situation, ...)" -> "grasp"
  // ただし括弧を除いて空になる/意味が変わる場合は保持
  const stripped=s.replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s+/g,' ').trim();
  if(stripped) s=stripped;
  // 先頭の "(one's) mother" のような所有注記も除去済み
  return s.trim();
}
// "to (finally) arrive at" 等の動詞接頭辞後の括弧を整える
function normVerbParen(g){
  // pattern: "to (xxx) verb" -> "to verb"
  return g.replace(/^to \([^)]*\)\s*/,'to ');
}

// 候補群からかな読みで絞る (同音異義判別)
function refine(cands,kana){
  if(cands.length>1){
    const kanaMatch=cands.filter(c=>c.kanaTexts.includes(kana));
    if(kanaMatch.length>0) return kanaMatch;
  }
  return cands;
}
// 表記(kanji)照合のみ
function bySurface(idx,word){ return idx.byKanji.has(word)? idx.byKanji.get(word).slice():[]; }
// かな見出し照合のみ (word がかなの場合 or 表記無し語)
function byReading(idx,key){ return idx.byKana.has(key)? idx.byKana.get(key).slice():[]; }

// pickEntry: 表記照合を全索引で最優先し、その後にかな照合へフォールバック。
// これにより「点線(表記あり)」がかな「てんせん」で別語(転戦)に誤マッチするのを防ぐ。
function pickEntry(word,kana){
  const hasKanji = word && word!==kana; // 表記語か
  // 1) 表記照合: common -> full
  if(hasKanji){
    let c=refine(bySurface(idxCommon,word),kana); if(c.length) return c[0];
    c=refine(bySurface(idxFull,word),kana); if(c.length) return c[0];
  }
  // 2) 表記語が表記索引に無い / かな見出し語: word をかな見出しとして照合
  let c=refine(byReading(idxCommon,word),kana); if(c.length) return c[0];
  c=refine(byReading(idxFull,word),kana); if(c.length) return c[0];
  // 3) 最後に純粋なかな読み照合 (word!=kana のとき)
  if(hasKanji){
    c=refine(byReading(idxCommon,kana),kana); if(c.length) return c[0];
    c=refine(byReading(idxFull,kana),kana); if(c.length) return c[0];
  }
  return null;
}

function pickGloss(entry){
  // iterate senses; find first sense whose misc is acceptable and has gloss
  for(const s of entry.w.sense){
    const misc=s.misc||[];
    if(misc.some(m=>BAD_MISC.has(m))) continue;
    const pos=s.partOfSpeech||[];
    if(isAffixOnly(pos)) return {reject:'affix'};
    const glosses=(s.gloss||[]).map(g=>g.text).filter(Boolean);
    if(glosses.length===0) continue;
    let g=cleanGloss(glosses[0]);
    if(!g){ // 括弧除去で空になったら次のglossを試す
      const alt=glosses.map(cleanGloss).find(x=>x);
      if(alt) g=alt; else continue;
    }
    // verb formatting: ensure "to ..." if verb pos and not already
    if(isVerb(pos) && !/^to /.test(g)){
      g='to '+g;
    }
    g=normVerbParen(g);
    return {gloss:g,pos};
  }
  return {reject:'no-usable-sense'};
}

const out={};
const excluded=[];
const stats={total:vocab.length,confirmed:0,ex_existing:0,ex_nomatch:0,ex_affix:0,ex_nosense:0,ex_dup:0};
const outSeen=new Set();

for(const v of vocab){
  const key=v.word;
  if(existingKeys.has(key)){ stats.ex_existing++; excluded.push([key,'existing']); continue; }
  const entry=pickEntry(v.word,v.kana);
  if(!entry){ stats.ex_nomatch++; excluded.push([key,'no-jmdict-match']); continue; }
  const res=pickGloss(entry);
  if(res.reject==='affix'){ stats.ex_affix++; excluded.push([key,'affix/particle']); continue; }
  if(res.reject){ stats.ex_nosense++; excluded.push([key,'no-usable-sense']); continue; }
  if(outSeen.has(key)){ stats.ex_dup++; continue; }
  // final: skip empty
  if(!res.gloss || !res.gloss.trim()){ stats.ex_nosense++; excluded.push([key,'empty-gloss']); continue; }
  out[key]=res.gloss;
  outSeen.add(key);
  stats.confirmed++;
}

// write outputs
fs.writeFileSync('.cache/jlpt-n1.json', JSON.stringify(vocab,null,2)+'\n');
fs.writeFileSync('tools/gloss.en.japanese.n1.json', JSON.stringify(out,null,2)+'\n');

console.log('=== STATS ===');
console.log(JSON.stringify(stats,null,2));
console.log('rawCount(csv rows):',rawCount,'vocab(dedup):',vocab.length);
console.log('=== confirmed sample 10 ===');
console.log(Object.entries(out).slice(0,10).map(([k,g])=>k+' -> '+g).join('\n'));
