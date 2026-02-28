# Figma Capability Probe

- Generated: 2026-02-28T19:05:06.387Z
- Selected route: **Route B**

| Probe | Status | Details |
| --- | --- | --- |
| Variables GET | PASS | 200 OK |
| Code Connect Parse | PASS | CLI parse succeeded |
| Code Connect Publish Probe | PASS | publish command available |
| Variables Write Probe | PASS | 200 OK |

## Notes
- Route A: CI/local read+verify, office publish/write fallback.
- Route B: full CI route permitted.
- Route C: office/manual fallback until auth/capabilities are fixed.
