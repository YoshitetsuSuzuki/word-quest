import json, os, urllib.parse, subprocess, time, sys, collections
CACHE='.cache'
code=sys.argv[1] if len(sys.argv)>1 else 'hi'
rows=json.load(open(os.path.join(CACHE,f'v3-{code}.json'),encoding='utf-8'))
heads=sorted({r['en'] for r in rows})
print(f"照合する英語見出し: {len(heads)} 件")
UA="ChiritsumoTango/1.0 (vocabulary building; contact yoshitetsugames21@gmail.com)"
out={}
CH=150
for i in range(0, len(heads), CH):
    chunk=heads[i:i+CH]
    values=" ".join('"%s"@en' % w.replace('"','') for w in chunk)
    q=f"""SELECT ?enLabel ?t ?ja WHERE {{
 VALUES ?enLabel {{ {values} }}
 ?item rdfs:label ?enLabel .
 ?item rdfs:label ?t . FILTER(lang(?t)='{code}')
 ?item rdfs:label ?ja . FILTER(lang(?ja)='ja')
 FILTER NOT EXISTS {{ ?item wdt:P31/wdt:P279* wd:Q17442446 }}
}}"""
    url="https://query.wikidata.org/sparql?format=json&query="+urllib.parse.quote(q)
    r=subprocess.run(["curl","-sS","--max-time","120","-H",f"User-Agent: {UA}",url],capture_output=True,text=True)
    try:
        d=json.loads(r.stdout)
        for b in d['results']['bindings']:
            en=b['enLabel']['value']
            out.setdefault(en,[]).append({'target':b['t']['value'],'ja':b['ja']['value']})
    except Exception:
        print(f"  chunk {i//CH+1}: 失敗(スキップ)")
    if (i//CH+1) % 5 == 0:
        print(f"  {i+len(chunk)}/{len(heads)} 件 照合済み…")
    time.sleep(1)
json.dump(out, open(os.path.join(CACHE,f'wikidata-{code}.json'),'w',encoding='utf-8'), ensure_ascii=False)
print(f"Wikidataで照合できた英単語: {len(out)} 件 → .cache/wikidata-{code}.json")
