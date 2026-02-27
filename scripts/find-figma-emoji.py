#!/usr/bin/env python3
"""Find all emoji text nodes in the current Figma page"""
import subprocess, json, os, sys

FOXY_DIR = "/Users/kari.basavaraj.k.m/Documents/code/foxy-design-system-master"

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

result = subprocess.run(
    ["node", "scripts/foxy-tool-call.mjs"],
    capture_output=True, text=True,
    cwd=FOXY_DIR,
    env={
        **os.environ,
        "JOIN_CHANNEL": "default",
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
