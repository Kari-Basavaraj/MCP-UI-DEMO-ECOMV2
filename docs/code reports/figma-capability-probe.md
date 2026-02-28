# Figma Capability Probe

- Generated: 2026-02-28T17:18:36.446Z
- Selected route: **Route C**

| Probe | Status | Details |
| --- | --- | --- |
| Variables GET | FAIL | 403 Forbidden |
| Code Connect Parse | PASS | CLI parse succeeded |
| Code Connect Publish Probe | PASS | publish command available |
| Variables Write Probe | FAIL | 403 Forbidden |

## Notes
- Route A: CI/local read+verify, office publish/write fallback.
- Route B: full CI route permitted.
- Route C: office/manual fallback until auth/capabilities are fixed.
