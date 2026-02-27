#!/usr/bin/env python3
"""Export a Figma node to PNG via foxy-tool-call.mjs"""
import subprocess, json, base64, sys

node_id = sys.argv[1] if len(sys.argv) > 1 else "3036:15036"
out_path = sys.argv[2] if len(sys.argv) > 2 else "assets/product-grid-figma-preview.png"

result = subprocess.run(
    ["node", "scripts/foxy-tool-call.mjs"],
    capture_output=True, text=True,
    cwd="/Users/kari.basavaraj.k.m/Documents/code/foxy-design-system-master",
    env={
        **__import__("os").environ,
        "JOIN_CHANNEL": "default",
        "TOOL": "export_node_as_image",
        "ARGS": json.dumps({"nodeId": node_id, "format": "PNG", "scale": 1}),
    },
    timeout=30,
)

raw = result.stdout
idx = raw.find("RESULT ")
if idx < 0:
    print("No RESULT found"); sys.exit(1)

rest = raw[idx + 7:]
obj = json.loads(rest)
inner = json.loads(obj["content"][0]["text"])

# The data might be directly in inner or nested
# Debug: show structure
data = inner.get("data", inner)
if isinstance(data, dict) and "content" in data:
    for item in data["content"]:
        if item.get("type") == "image":
            img_data = base64.b64decode(item["data"])
            with open(out_path, "wb") as f:
                f.write(img_data)
            print(f"Saved {len(img_data)} bytes to {out_path}")
            sys.exit(0)

# Try directly in inner content
for item in inner.get("content", []):
    if item.get("type") == "image":
        img_data = base64.b64decode(item["data"])
        with open(out_path, "wb") as f:
            f.write(img_data)
        print(f"Saved {len(img_data)} bytes to {out_path}")
        sys.exit(0)

# If data is a base64 string directly
if isinstance(data, str) and len(data) > 100:
    try:
        img_data = base64.b64decode(data)
        with open(out_path, "wb") as f:
            f.write(img_data)
        print(f"Saved {len(img_data)} bytes to {out_path}")
        sys.exit(0)
    except Exception:
        pass

# Debug dump
print("Structure keys:", list(inner.keys()) if isinstance(inner, dict) else type(inner))
if isinstance(inner, dict):
    for k, v in inner.items():
        if isinstance(v, str):
            print(f"  {k}: {v[:100]}")
        elif isinstance(v, list):
            print(f"  {k}: list of {len(v)}")
            for i, item in enumerate(v[:3]):
                if isinstance(item, dict):
                    print(f"    [{i}] keys={list(item.keys())}, type={item.get('type')}")
        else:
            print(f"  {k}: {type(v)}")
sys.exit(1)
