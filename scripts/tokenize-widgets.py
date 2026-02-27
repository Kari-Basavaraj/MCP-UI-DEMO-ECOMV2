#!/usr/bin/env python3
"""
Tokenize hardcoded CSS hex colors in MCP widget HTML files.
Replaces all raw hex values with Figma Design System CSS custom property tokens.
Context-aware: differentiates background, color (text), and border properties.
"""
import re
import os

WIDGETS_DIR = "/Users/kari.basavaraj.k.m/Documents/code/MCP-UI-Demo-EcomV1/mcp-server/widgets"

# Files needing full tokenization (100% hardcoded)
FULL_TOKENIZE = [
    "checkout-form.html",
    "order-confirmation.html",
    "price-tag.html",
    "product-detail.html",
    "review-rating.html",
    "wishlist.html",
]

# Files needing partial fixes
PARTIAL_FIX = [
    "cart-summary.html",
    "cart-view.html",
]


def tokenize(content):
    """Replace hardcoded hex colors with CSS custom property tokens."""

    # ── Step 1: Remove body { display:flex; ... background:#f5f5f5; } override ──
    # shared.css already handles body styling
    content = re.sub(
        r'\n?\s*body\s*\{\s*display\s*:\s*flex\s*;[^}]*\}',
        '',
        content
    )

    # ── Step 2: Border replacements (do FIRST so border #d9d9d9 doesn't get caught by bg) ──
    border_solid_map = {
        '#d9d9d9': 'var(--sds-color-border-default-default)',
    }
    for hex_val, token in border_solid_map.items():
        content = re.sub(
            rf'(border\s*:\s*\d+px\s+solid\s+){re.escape(hex_val)}',
            rf'\g<1>{token}',
            content,
            flags=re.IGNORECASE
        )

    border_color_map = {
        '#d9d9d9': 'var(--sds-color-border-default-default)',
        '#2c2c2c': 'var(--sds-color-border-brand-default)',
        '#eb221e': 'var(--sds-color-border-danger-tertiary)',
    }
    for hex_val, token in border_color_map.items():
        content = re.sub(
            rf'(border-color\s*:\s*){re.escape(hex_val)}',
            rf'\g<1>{token}',
            content,
            flags=re.IGNORECASE
        )

    # ── Step 3: Background property replacements ──
    bg_map = [
        ('#ffffff', 'var(--sds-color-background-default-default)'),
        ('#f5f5f5', 'var(--sds-color-background-default-secondary)'),
        ('#2c2c2c', 'var(--sds-color-background-brand-default)'),
        ('#eb221e', 'var(--sds-color-background-danger-default)'),
        ('#fee9e7', 'var(--sds-color-background-danger-tertiary)'),
        ('#ebffee', 'var(--sds-color-background-positive-tertiary)'),
        ('#e5e5e5', 'var(--sds-color-background-default-secondary-hover)'),
        ('#d9d9d9', 'var(--sds-color-background-default-tertiary)'),
        ('#f5a623', 'var(--sds-color-background-warning-default)'),
    ]
    for hex_val, token in bg_map:
        content = re.sub(
            rf'(background(?:-color)?\s*:\s*){re.escape(hex_val)}',
            rf'\g<1>{token}',
            content,
            flags=re.IGNORECASE
        )

    # Handle rgba overlay
    content = re.sub(
        r'(background(?:-color)?\s*:\s*)rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)',
        r'\g<1>var(--sds-color-background-utilities-overlay)',
        content
    )

    # ── Step 4: Text color property replacements ──
    color_map = [
        ('#1e1e1e', 'var(--sds-color-text-default-default)'),
        ('#757575', 'var(--sds-color-text-default-secondary)'),
        ('#b3b3b3', 'var(--sds-color-text-default-tertiary)'),
        ('#2c2c2c', 'var(--sds-color-text-brand-default)'),
        ('#f5f5f5', 'var(--sds-color-text-brand-on-brand)'),
        ('#900b09', 'var(--sds-color-text-danger-default)'),
        ('#8f0b09', 'var(--sds-color-text-danger-default)'),
        ('#02542d', 'var(--sds-color-text-positive-default)'),
        ('#14ae5c', 'var(--sds-color-text-positive-tertiary)'),
        ('#f5a623', 'var(--sds-color-background-warning-default)'),
    ]
    for hex_val, token in color_map:
        # Match "color:" NOT preceded by "background-" or "border-"
        content = re.sub(
            rf'(?<![a-zA-Z-])color\s*:\s*{re.escape(hex_val)}',
            rf'color: {token}',
            content,
            flags=re.IGNORECASE
        )

    # Handle "color: white"
    content = re.sub(
        r'(?<![a-zA-Z-])color\s*:\s*white(?![a-zA-Z])',
        r'color: var(--sds-color-text-brand-on-brand)',
        content,
        flags=re.IGNORECASE
    )

    # ── Step 5: Fix divider backgrounds ──
    # Dividers use "height:1px; background:" as visual separators → should use border token
    content = re.sub(
        r'(height\s*:\s*1px\s*;\s*background\s*:\s*)var\(--sds-color-background-default-tertiary\)',
        r'\g<1>var(--sds-color-border-default-default)',
        content
    )

    return content


def fix_wishlist(content):
    """Fix duplicate </html> in wishlist."""
    return content.replace('</html>\n</html>', '</html>')


def main():
    changes = 0
    all_files = FULL_TOKENIZE + PARTIAL_FIX

    for fname in all_files:
        fpath = os.path.join(WIDGETS_DIR, fname)
        if not os.path.exists(fpath):
            print(f"  SKIP {fname}: not found")
            continue

        with open(fpath, 'r', encoding='utf-8') as f:
            original = f.read()

        updated = tokenize(original)

        if fname == 'wishlist.html':
            updated = fix_wishlist(updated)

        if updated != original:
            with open(fpath, 'w', encoding='utf-8') as f:
                f.write(updated)
            changes += 1

            # Count remaining hardcoded hex values in <style> block
            style_match = re.search(r'<style>(.*?)</style>', updated, re.DOTALL)
            if style_match:
                style_content = style_match.group(1)
                remaining = re.findall(r'#[0-9a-fA-F]{6}\b', style_content)
                if remaining:
                    print(f"  TOKENIZED {fname}  (⚠ {len(remaining)} hex values remain: {remaining})")
                else:
                    print(f"  TOKENIZED {fname}  (✓ 0 hardcoded hex remaining)")
            else:
                print(f"  TOKENIZED {fname}")
        else:
            print(f"  NO CHANGES {fname}")

    print(f"\n  Done. {changes} files updated.")


if __name__ == '__main__':
    main()
