#!/usr/bin/env python3
"""Replace V1 node IDs with V2 component node IDs in Code Connect files."""
import os

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# V1 -> V2 node ID mapping
mapping = {
    "3068:13907": "5007:4606",  # ProductGrid
    "3068:14121": "5007:4605",  # ProductCard
    "3068:13922": "5007:4607",  # ProductDetail
    "3068:13935": "5007:4608",  # CartView
    "3068:13956": "5007:4609",  # CartSummary
    "3068:13974": "5007:4610",  # SearchBar
    "3068:13992": "5007:4611",  # CategoryFilter
    "3068:14012": "5007:4612",  # CheckoutForm
    "3068:14037": "5007:4613",  # PriceTag
    "3068:14054": "5007:4614",  # ReviewRating
    "3068:14069": "5007:4615",  # OrderConfirmation
    "3068:14087": "5007:4667",  # Wishlist
}

# Also map hyphenated versions (used in URLs)
mapping_hyphen = {k.replace(":", "-"): v.replace(":", "-") for k, v in mapping.items()}


def replace_in_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()
    original = content
    for old, new in mapping.items():
        content = content.replace(old, new)
    for old, new in mapping_hyphen.items():
        content = content.replace(old, new)
    if content != original:
        with open(filepath, "w") as f:
            f.write(content)
        return True
    return False


# Update .figma.tsx files
tsx_dir = "figma/code-connect/components"
for fname in sorted(os.listdir(tsx_dir)):
    if fname.endswith(".figma.tsx"):
        path = os.path.join(tsx_dir, fname)
        changed = replace_in_file(path)
        print(f"  {fname}: {'UPDATED' if changed else 'no change'}")

# Update mappings JSONs
for fname in [
    "figma/code-connect/mappings.source.json",
    "figma/code-connect/mappings.generated.json",
]:
    changed = replace_in_file(fname)
    print(f"  {os.path.basename(fname)}: {'UPDATED' if changed else 'no change'}")

print("Done!")
