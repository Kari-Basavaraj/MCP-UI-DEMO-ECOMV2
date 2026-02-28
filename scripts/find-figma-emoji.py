#!/usr/bin/env python3
"""Find all emoji text nodes in the current Figma page."""
import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


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

code = r"""
const page = figma.currentPage;
const emojiPattern = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const results = [];
page.findAll(n => {
  if (n.type === "TEXT") {
    const chars = n.characters || "";
    if (emojiPattern.test(chars) && chars.length <= 4) {
      let parentInfo = "";
      let p = n.parent;
      while (p && p.type !== "PAGE") {
        parentInfo = p.name + " > " + parentInfo;
        p = p.parent;
      }
      results.push({
        id: n.id,
        chars: chars,
        parentId: n.parent ? n.parent.id : null,
        parentType: n.parent ? n.parent.type : null,
        path: parentInfo.slice(0, -3)
      });
    }
  }
  return false;
});
return results;
"""

FOXY_TOOL = resolve_foxy_tool()
FOXY_DIR = FOXY_TOOL.parent.parent

result = subprocess.run(
    ["node", str(FOXY_TOOL)],
    capture_output=True, text=True,
    cwd=str(FOXY_DIR),
    env={
        **os.environ,
        "JOIN_CHANNEL": os.environ.get("JOIN_CHANNEL", "default"),
        "TOOL": "execute_figma_code",
        "ARGS": json.dumps({"code": code.strip()}),
    },
    timeout=30,
)

raw = result.stdout
idx = raw.find("RESULT ")
if idx < 0:
    print("No RESULT found")
    print(raw[:500])
    sys.exit(1)

obj = json.loads(raw[idx + 7:])
inner = json.loads(obj["content"][0]["text"])
data = inner["data"]

for item in data:
    print(f"{item['chars']}  id={item['id']}  parentId={item['parentId']}  parentType={item['parentType']}")
    print(f"   path: {item['path']}")

print(f"\nTotal: {len(data)} emoji nodes")
