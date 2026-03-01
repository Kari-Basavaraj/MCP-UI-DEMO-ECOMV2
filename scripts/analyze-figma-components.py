#!/usr/bin/env python3
"""Analyze the Figma component inventory from MCP output."""
import json
import sys
from collections import Counter

INPUT_FILE = sys.argv[1] if len(sys.argv) > 1 else '/Users/kari.basavaraj.k.m/Library/Application Support/Code/User/workspaceStorage/cb51544ffd997adb9291227b28cfe4bf/GitHub.copilot-chat/chat-session-resources/b28cb6fd-c412-4fc1-9f84-b39660392047/toolu_vrtx_01EC92ENgz1omHQXt5KFHN4y__vscode-1772368644767/content.json'

with open(INPUT_FILE) as f:
    data = json.load(f)

result = data.get('result', data)
if isinstance(result, str):
    result = json.loads(result)

print(f"Component Sets: {result.get('totalComponentSets')}")
print(f"Standalone Components: {result.get('totalStandaloneComponents')}")
print()

items = result.get('items', [])

# Group by parent
parents = Counter()
for item in items:
    parents[item['parentName']] += 1

print("--- By parent section ---")
for name, count in parents.most_common(40):
    print(f"  {name}: {count}")

print()
print("--- All component sets (DS primitives) ---")
sets = [i for i in items if i['type'] == 'COMPONENT_SET']
for s in sorted(sets, key=lambda x: x['name']):
    print(f"  {s['name']} (id={s['id']}, variants={s['variantCount']}, parent={s['parentName']})")

print()
print("--- Standalone components (not in a set) ---")
standalone = [i for i in items if i['type'] == 'COMPONENT']
for s in sorted(standalone, key=lambda x: x['name']):
    print(f"  {s['name']} (id={s['id']}, parent={s['parentName']})")

# Save clean inventory for code connect
output = {
    'componentSets': [
        {'id': s['id'], 'name': s['name'], 'variantCount': s['variantCount'], 'parent': s['parentName'], 'description': s['description']}
        for s in sorted(sets, key=lambda x: x['name'])
    ],
    'standaloneComponents': [
        {'id': s['id'], 'name': s['name'], 'parent': s['parentName'], 'description': s['description']}
        for s in sorted(standalone, key=lambda x: x['name'])
    ]
}

out_path = '/Users/kari.basavaraj.k.m/code/MCP-UI-DEMO-ECOMV2/docs/code reports/figma-ds-components.json'
with open(out_path, 'w') as f:
    json.dump(output, f, indent=2)
print(f"\nSaved clean inventory to {out_path}")
