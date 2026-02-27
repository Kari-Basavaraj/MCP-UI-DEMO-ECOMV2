import json, sys
from collections import defaultdict

data = json.load(open(sys.argv[1]))
components = data.get('components', [])
print(f'Total components: {len(components)}\n')

by_page = defaultdict(list)
for c in components:
    page = c.get('pageName', 'Unknown')
    by_page[page].append(c)

for page in sorted(by_page.keys()):
    comps = by_page[page]
    print(f'=== {page} ({len(comps)} components) ===')
    sets = defaultdict(list)
    standalone = []
    for c in comps:
        cs = c.get('componentSetName')
        if cs:
            sets[cs].append(c)
        else:
            standalone.append(c)
    for name in sorted(sets.keys()):
        variants = sets[name]
        print(f'  ComponentSet: {name} ({len(variants)} variants)')
        if variants:
            v = variants[0]
            props = v.get('variantProperties', {})
            if props:
                keys = list(props.keys())
                print(f'    Variant axes: {keys}')
                for key in keys:
                    vals = sorted(set(vv.get('variantProperties',{}).get(key,'') for vv in variants))
                    print(f'      {key}: {vals}')
            print(f'    Size: {v.get("width","?")}x{v.get("height","?")}')
            print(f'    ID: {v.get("id","?")}')
    for c in standalone:
        print(f'  Component: {c.get("name","?")} ({c.get("width","?")}x{c.get("height","?")}) id={c.get("id","?")}')
    print()
