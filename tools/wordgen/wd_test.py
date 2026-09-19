import urllib.parse, json, subprocess
words=["house","water","fire","city","truth","help","book","tree","river","mother","teacher","hospital","bridge","flower","moon"]
values=" ".join(f'"{w}"@en' for w in words)
q=f"""
SELECT ?enLabel ?hi ?ja WHERE {{
  VALUES ?enLabel {{ {values} }}
  ?item rdfs:label ?enLabel .
  ?item rdfs:label ?hi . FILTER(lang(?hi)='hi')
  ?item rdfs:label ?ja . FILTER(lang(?ja)='ja')
  FILTER NOT EXISTS {{ ?item wdt:P31/wdt:P279* wd:Q17442446 }}
}} LIMIT 200
"""
url="https://query.wikidata.org/sparql?format=json&query="+urllib.parse.quote(q)
out=subprocess.run(["curl","-sS","--max-time","90","-H","User-Agent: ChiritsumoTango/1.0 (vocab building)",url],capture_output=True,text=True)
try:
    d=json.loads(out.stdout)
except Exception:
    print("応答:", out.stdout[:300], out.stderr[:200]); raise SystemExit
rows=d['results']['bindings']
print(f"取得: {len(rows)} 行")
seen=set()
for r in rows:
    en=r['enLabel']['value']
    if en in seen: continue
    seen.add(en)
    print(f"  {en:<10} → hi: {r['hi']['value']:<14} ja: {r['ja']['value']}")
print(f"\n照合できた英単語: {len(seen)} / {len(words)}")
