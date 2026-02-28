#!/usr/bin/env python3
"""Export a Figma node to PNG via foxy-tool-call.mjs"""
import base64
import json
import os
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_NODE_ID = "3036:15036"


def resolve_foxy_tool():
    explicit = os.environ.get("FOXY_TOOL_CALL")
    if explicit:
        p = Path(explicit).expanduser().resolve()
        if p.exists():
            return p
        raise FileNotFoundError(f"FOXY_TOOL_CALL does not exist: {p}")

    foxy_root = os.environ.get("FOXY_ROOT")
    if foxy_root:
        p = Path(foxy_root).expanduser().resolve() / "scripts" / "foxy-tool-call.mjs"
        if p.exists():
            return p
        raise FileNotFoundError(f"FOXY_ROOT configured but tool missing: {p}")

    sibling = (REPO_ROOT.parent / "foxy-design-system-master" / "scripts" / "foxy-tool-call.mjs").resolve()
    if sibling.exists():
        return sibling

    raise FileNotFoundError(
        "Unable to resolve foxy-tool-call.mjs. Set FOXY_TOOL_CALL or FOXY_ROOT."
    )


def main():
    node_id = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_NODE_ID
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("assets/product-grid-figma-preview.png")
    if not out_path.is_absolute():
        out_path = (REPO_ROOT / out_path).resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)

    foxy_tool = resolve_foxy_tool()
    foxy_cwd = foxy_tool.parent.parent

    result = subprocess.run(
        ["node", str(foxy_tool)],
        capture_output=True,
        text=True,
        cwd=str(foxy_cwd),
        env={
            **os.environ,
            "JOIN_CHANNEL": os.environ.get("JOIN_CHANNEL", "default"),
            "TOOL": "export_node_as_image",
            "ARGS": json.dumps({"nodeId": node_id, "format": "PNG", "scale": 1}),
        },
        timeout=30,
    )

    raw = result.stdout
    idx = raw.find("RESULT ")
    if idx < 0:
        print("No RESULT found")
        sys.exit(1)

    rest = raw[idx + 7 :]
    obj = json.loads(rest)
    inner = json.loads(obj["content"][0]["text"])

    data = inner.get("data", inner)
    if isinstance(data, dict) and "content" in data:
        for item in data["content"]:
            if item.get("type") == "image":
                img_data = base64.b64decode(item["data"])
                out_path.write_bytes(img_data)
                print(f"Saved {len(img_data)} bytes to {out_path}")
                return

    for item in inner.get("content", []):
        if item.get("type") == "image":
            img_data = base64.b64decode(item["data"])
            out_path.write_bytes(img_data)
            print(f"Saved {len(img_data)} bytes to {out_path}")
            return

    if isinstance(data, str) and len(data) > 100:
        try:
            img_data = base64.b64decode(data)
            out_path.write_bytes(img_data)
            print(f"Saved {len(img_data)} bytes to {out_path}")
            return
        except Exception:
            pass

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


if __name__ == "__main__":
    main()
