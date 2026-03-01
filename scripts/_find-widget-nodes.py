#!/usr/bin/env python3
"""Find ecommerce widget component node IDs in V2 Figma file."""
import json, sys

data = json.load(sys.stdin)
comps = data.get("meta", {}).get("components", [])

keywords = [
    "widget", "cart", "product", "checkout", "wishlist",
    "search", "category", "order", "price", "review", "ecomm"
]

for c in comps:
    name = c.get("name", "")
    frame = c.get("containing_frame", {})
    page = frame.get("pageName", "")
    frame_name = frame.get("name", "")
    node_id = c.get("node_id", "")
    cset_name = ""
    if frame.get("containingComponentSet"):
        cset_name = frame["containingComponentSet"].get("name", "")

    searchable = f"{name} {page} {frame_name} {cset_name}".lower()
    if any(kw in searchable for kw in keywords):
        print(f"{node_id:20s}  page={page:30s}  name={name:40s}  frame={frame_name}  cset={cset_name}")
