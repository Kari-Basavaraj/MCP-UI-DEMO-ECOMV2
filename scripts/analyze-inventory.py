#!/usr/bin/env python3
"""Analyze figma-components-inventory.json to separate icons from DS components."""
import json
import collections
import sys

with open("docs/code reports/figma-components-inventory.json") as f:
    data = json.load(f)

comps = data.get("components", [])

ds_comps = []
icon_count = 0
icon_names = set()
for c in comps:
    name = c.get("name", "")
    cf = c.get("containing_frame", {}).get("name", "")
    # Icons live in size-named frames (16, 20, 24, 32, 40, 48) or unnamed frames
    if cf in ["16", "20", "24", "32", "40", "48", ""]:
        icon_count += 1
        icon_names.add(name.split("/")[0].strip() if "/" in name else name)
        continue
    ds_comps.append(c)

print(f"Icons: {icon_count} ({len(icon_names)} unique families)")
print(f"DS/widget components: {len(ds_comps)}")
print()

# Group DS components by containing_frame
by_frame = collections.defaultdict(list)
for c in ds_comps:
    cf = c.get("containing_frame", {}).get("name", "UNKNOWN")
    by_frame[cf].append(c)

for frame in sorted(by_frame.keys()):
    items = by_frame[frame]
    print(f"\n--- {frame} ({len(items)} components) ---")
    for c in sorted(items, key=lambda x: x["name"]):
        csid = c.get("component_set_id", "")
        node_id = c.get("node_id", "")
        marker = " [SET]" if csid else ""
        print(f"  {node_id:12s} {c['name']}{marker}")

# Also show component_set groupings for Primitives
print("\n\n=== COMPONENT SETS IN PRIMITIVES ===")
primitives = [c for c in ds_comps if c.get("containing_frame", {}).get("name") == "Primitives"]
by_set = collections.defaultdict(list)
for c in primitives:
    csid = c.get("component_set_id", "none")
    by_set[csid].append(c)

for csid, items in sorted(by_set.items()):
    if csid == "none":
        print(f"\n  Standalone components:")
    else:
        print(f"\n  Component Set {csid}:")
    for c in items:
        print(f"    {c['node_id']:12s} {c['name']}")
