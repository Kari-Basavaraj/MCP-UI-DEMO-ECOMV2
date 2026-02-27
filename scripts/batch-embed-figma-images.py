#!/usr/bin/env python3
"""Batch embed product images into all Figma widget emoji nodes."""
import subprocess, json, os, sys, time

FOXY_DIR = "/Users/kari.basavaraj.k.m/Documents/code/foxy-design-system-master"
IMG_DIR = "../MCP-UI-Demo-EcomV1/assets/product-images"

# Emoji → product image file mapping
EMOJI_TO_IMAGE = {
    "👟": None,  # Contextual: Nike or Ultra Boost - resolved per path
    "👕": f"{IMG_DIR}/crew-tshirt.jpg",
    "🧢": f"{IMG_DIR}/sport-cap.jpg",
    "🧥": f"{IMG_DIR}/bomber-jacket.jpg",
    "🎒": f"{IMG_DIR}/trail-backpack.jpg",
    "⌚": f"{IMG_DIR}/chronograph-watch.jpg",
    "🩳": f"{IMG_DIR}/flex-shorts.jpg",
}

NIKE_IMAGE = f"{IMG_DIR}/nike-air-max.jpg"
ULTRA_IMAGE = f"{IMG_DIR}/ultra-boost.jpg"

def resolve_shoe_image(path):
    """Resolve 👟 to Nike or Ultra Boost based on context."""
    path_lower = path.lower()
    if "ultra" in path_lower:
        return ULTRA_IMAGE
    # Default to Nike for generic shoe references
    return NIKE_IMAGE

# All product-image emoji nodes to embed (parentId = image frame to fill)
# Format: (parentId, emoji, path_context)
EMBED_TARGETS = [
    # === Ecommerce Widget Compositions (main product grid already done) ===
    # Product Card standalone
    ("3039:12293", "👟", "Ecommerce Widget Compositions > Product Card"),

    # === Code-Match Widget Compositions ===
    ("3036:15017", "👟", "Code-Match > Product Card"),
    ("3036:15042", "👟", "Code-Match > Product Grid > Nike Air Max 90"),
    ("3036:15062", "👕", "Code-Match > Product Grid > Classic Crew T-Shirt"),
    ("3036:15082", "🧢", "Code-Match > Product Grid > Sport Flex Cap"),
    ("3036:15102", "🧥", "Code-Match > Product Grid > Urban Bomber Jacket"),
    ("3036:15123", "👟", "Code-Match > Product Grid > Ultra Boost Sneakers"),
    ("3036:15163", "🎒", "Code-Match > Product Grid > Trail Utility Backpack"),
    ("3036:15203", "👟", "Code-Match > Product Detail > image-column"),
    ("3036:15213", "👟", "Code-Match > Product Detail > image-column-2"),
    ("3036:15264", "👟", "Code-Match > Cart View > Nike Air Max 90 > thumbnail"),
    ("3036:15280", "👕", "Code-Match > Cart View > Classic Crew T-Shirt > thumbnail"),
    ("3036:15296", "👟", "Code-Match > Cart View > Ultra Boost Sneakers > thumbnail"),
    ("3036:15338", "👟", "Code-Match > Search Bar > result-0 > thumb"),
    ("3036:15344", "👟", "Code-Match > Search Bar > result-1 > thumb"),
    ("3036:15362", "👟", "Code-Match > Category Filter > Nike Air Max 90"),
    ("3036:15382", "👟", "Code-Match > Category Filter > Ultra Boost Sneakers"),
    ("3036:15550", "👟", "Code-Match > Order Confirmation > Nike Air Max 90"),
    ("3036:15555", "👕", "Code-Match > Order Confirmation > Classic Crew T-Shirt"),
    ("3036:15560", "👟", "Code-Match > Order Confirmation > Ultra Boost Sneakers"),

    # === Ecommerce Widgets → Light ===
    ("3036:15732", "👟", "Light > Product Card"),
    ("3036:16113", "👟", "Light > Cart View > Nike Air Max 90"),
    ("3036:16123", "👕", "Light > Cart View > Classic Crew T-Shirt"),
    ("3036:16133", "🧢", "Light > Cart View > Sport Flex Cap"),
    ("3038:6927", "👟", "Light > Search Bar > trending > Ultra Boost Sneakers"),
    ("3038:6929", "🎒", "Light > Search Bar > trending > Trail Utility Backpack"),
    ("3036:16217", "👟", "Light > Category Filter > Footwear"),
    ("3036:16222", "👕", "Light > Category Filter > Apparel"),
    ("3036:16227", "🧢", "Light > Category Filter > Accessories"),
    ("3036:16232", "🧥", "Light > Category Filter > Outerwear"),
    ("3036:16237", "🎒", "Light > Category Filter > Bags"),
    ("3037:1626", "👟", "Light > Order Confirmation > Nike Air Max 90"),
    ("3037:1633", "👕", "Light > Order Confirmation > Classic Crew T-Shirt"),
    ("3037:1640", "🧢", "Light > Order Confirmation > Sport Flex Cap"),
    ("3038:6994", "👟", "Light > Wishlist > Nike Air Max 90"),
    ("3038:7018", "🎒", "Light > Wishlist > Trail Utility Backpack"),
    ("3038:7030", "🧥", "Light > Wishlist > Urban Bomber Jacket"),
    ("3037:2793", "👟", "Light > Product Detail"),

    # === Ecommerce Widgets → Dark ===
    ("3039:8236", "👟", "Dark > Product Card"),
    ("3039:8254", "👟", "Dark > Product Grid > Nike Air Max 90"),
    ("3039:8266", "👕", "Dark > Product Grid > Classic Crew T-Shirt"),
    ("3039:8278", "🧢", "Dark > Product Grid > Sport Flex Cap"),
    ("3039:8290", "🧥", "Dark > Product Grid > Urban Bomber Jacket"),
    ("3039:8302", "👟", "Dark > Product Grid > Ultra Boost Sneakers"),
    ("3039:8326", "🎒", "Dark > Product Grid > Trail Utility Backpack"),
    ("3039:8355", "👟", "Dark > Cart View > Nike Air Max 90"),
    ("3039:8365", "👕", "Dark > Cart View > Classic Crew T-Shirt"),
    ("3039:8375", "🧢", "Dark > Cart View > Sport Flex Cap"),
    ("3039:8431", "👟", "Dark > Search Bar > Ultra Boost Sneakers"),
    ("3039:8435", "🎒", "Dark > Search Bar > Trail Utility Backpack"),
    ("3039:8444", "👟", "Dark > Category Filter > Footwear"),
    ("3039:8449", "👕", "Dark > Category Filter > Apparel"),
    ("3039:8454", "🧢", "Dark > Category Filter > Accessories"),
    ("3039:8459", "🧥", "Dark > Category Filter > Outerwear"),
    ("3039:8464", "🎒", "Dark > Category Filter > Bags"),
    ("3039:8603", "👟", "Dark > Order Confirmation > Nike Air Max 90"),
    ("3039:8610", "👕", "Dark > Order Confirmation > Classic Crew T-Shirt"),
    ("3039:8617", "🧢", "Dark > Order Confirmation > Sport Flex Cap"),
    ("3039:8636", "👟", "Dark > Wishlist > Nike Air Max 90"),
    ("3039:8660", "🎒", "Dark > Wishlist > Trail Utility Backpack"),
    ("3039:8672", "🧥", "Dark > Wishlist > Urban Bomber Jacket"),
    ("3039:8684", "👟", "Dark > Product Detail"),
]

def embed_image(node_id, image_path, context):
    """Embed an image into a Figma node."""
    result = subprocess.run(
        ["node", "scripts/foxy-tool-call.mjs"],
        capture_output=True, text=True,
        cwd=FOXY_DIR,
        env={
            **os.environ,
            "JOIN_CHANNEL": "default",
            "TOOL": "embed_image_in_node",
            "ARGS": json.dumps({
                "nodeId": node_id,
                "imagePath": image_path,
                "removePlaceholderText": True,
            }),
        },
        timeout=30,
    )
    raw = result.stdout
    idx = raw.find("RESULT ")
    if idx >= 0:
        obj = json.loads(raw[idx + 7:])
        inner = json.loads(obj["content"][0]["text"])
        if inner.get("success"):
            return True, inner.get("data", "OK")
        return False, inner.get("data", "unknown error")
    return False, f"No RESULT in output: {raw[:200]}"

def main():
    start_from = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    total = len(EMBED_TARGETS)
    success = 0
    failed = 0

    for i, (node_id, emoji, context) in enumerate(EMBED_TARGETS, 1):
        if i < start_from:
            continue
        # Resolve image path
        if emoji == "👟":
            image_path = resolve_shoe_image(context)
        else:
            image_path = EMOJI_TO_IMAGE.get(emoji)

        if not image_path:
            print(f"[{i}/{total}] SKIP {context} — no image for {emoji}")
            continue

        ok, msg = embed_image(node_id, image_path, context)
        status = "✅" if ok else "❌"
        if ok:
            success += 1
        else:
            failed += 1
        print(f"[{i}/{total}] {status} {context} ({node_id}) → {os.path.basename(image_path)}")
        if not ok:
            print(f"         Error: {msg}")

    print(f"\nDone: {success} succeeded, {failed} failed out of {total}")

if __name__ == "__main__":
    main()
