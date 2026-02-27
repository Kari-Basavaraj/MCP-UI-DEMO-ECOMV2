import sys, json
raw = sys.stdin.read().strip()
r = json.loads(raw)
inner = json.loads(r['content'][0]['text'])
data = inner.get('data', inner)
if isinstance(data, str):
    data = json.loads(data)
print(json.dumps(data, indent=2))
