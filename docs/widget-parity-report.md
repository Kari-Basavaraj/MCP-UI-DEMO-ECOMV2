# Widget Parity Report

Generated: 2026-02-28T06:16:45.736Z
Schema: 1.1.0

## Summary
- Total widgets: 12
- Compared widgets: 12
- Missing widgets: 0
- Average parity score: 70.81%
- Severity counts: critical=6, high=1, medium=3, low=2, pass=0

## Top Offenders
| Rank | Widget | Status | Severity | Parity Score | Diff Ratio |
|---:|---|---|---|---:|---:|
| 1 | price-tag | ok | critical | 19.05% | 80.95% |
| 2 | product-grid | ok | critical | 52.61% | 47.39% |
| 3 | product-card | ok | critical | 56.89% | 43.11% |
| 4 | category-filter | ok | critical | 58.91% | 41.09% |
| 5 | wishlist | ok | critical | 63.52% | 36.48% |

## Widget Details
| Widget | Status | Severity | Parity Score | Diff Ratio | Compared Size | Diff Image |
|---|---|---|---:|---:|---|---|
| price-tag | ok | critical | 19.05% | 80.95% | 420x203 | screenshots/diff/price-tag.png |
| product-grid | ok | critical | 52.61% | 47.39% | 950x855 | screenshots/diff/product-grid.png |
| product-card | ok | critical | 56.89% | 43.11% | 420x370 | screenshots/diff/product-card.png |
| category-filter | ok | critical | 58.91% | 41.09% | 950x453 | screenshots/diff/category-filter.png |
| wishlist | ok | critical | 63.52% | 36.48% | 950x438 | screenshots/diff/wishlist.png |
| product-detail | ok | critical | 68.14% | 31.86% | 860x499 | screenshots/diff/product-detail.png |
| cart-view | ok | high | 75.79% | 24.21% | 520x426 | screenshots/diff/cart-view.png |
| checkout-form | ok | medium | 88.93% | 11.07% | 520x757 | screenshots/diff/checkout-form.png |
| review-rating | ok | medium | 89.78% | 10.22% | 520x580 | screenshots/diff/review-rating.png |
| order-confirmation | ok | medium | 89.81% | 10.19% | 540x703 | screenshots/diff/order-confirmation.png |
| cart-summary | ok | low | 92.68% | 7.32% | 420x100 | screenshots/diff/cart-summary.png |
| search-bar | ok | low | 93.62% | 6.38% | 520x120 | screenshots/diff/search-bar.png |

## Remediation Queue
- price-tag: Inspect price-tag spacing/typography/layout against reference and patch widget source before rerun.
- product-grid: Inspect product-grid spacing/typography/layout against reference and patch widget source before rerun.
- product-card: Inspect product-card spacing/typography/layout against reference and patch widget source before rerun.
- category-filter: Inspect category-filter spacing/typography/layout against reference and patch widget source before rerun.
- wishlist: Inspect wishlist spacing/typography/layout against reference and patch widget source before rerun.
- product-detail: Inspect product-detail spacing/typography/layout against reference and patch widget source before rerun.
- cart-view: Inspect cart-view spacing/typography/layout against reference and patch widget source before rerun.
- checkout-form: Tighten dimensions and token usage for checkout-form; rerun parity check.
- review-rating: Tighten dimensions and token usage for review-rating; rerun parity check.
- order-confirmation: Tighten dimensions and token usage for order-confirmation; rerun parity check.
- cart-summary: Review minor visual drift for cart-summary; fix if user-visible.
- search-bar: Review minor visual drift for search-bar; fix if user-visible.