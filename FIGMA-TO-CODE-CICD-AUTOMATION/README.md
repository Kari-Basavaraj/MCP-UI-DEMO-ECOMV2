# Figma ↔ Code CI/CD Automation Playbook

**The definitive guide to automated, bidirectional design-token synchronization between Figma and code.**

---

## What This Is

A complete, production-tested CI/CD pipeline that:

- **Pulls** design tokens (colors, typography, spacing) from Figma → CSS custom properties
- **Pushes** CSS edits back to Figma variables (with 6 safety guards)
- **Syncs** Code Connect metadata so Figma Dev Mode shows live code snippets
- **Automates** everything via GitHub Actions with rollback, drift detection, and canary controls

**Stack**: Node.js 22 · ESM Scripts · Figma REST API · GitHub Actions · Figma Webhooks · CSS Custom Properties

---

## 5-Minute Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2.git
cd MCP-UI-DEMO-ECOMV2

# 2. Run the setup wizard
chmod +x FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh
./FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh

# 3. You're done. The wizard handles everything:
#    ✅ Prerequisites check
#    ✅ Figma PAT validation
#    ✅ GitHub secrets configuration
#    ✅ Dependency installation
#    ✅ Initial token pull
#    ✅ Pipeline verification
```

Or manually:

```bash
export FIGMA_ACCESS_TOKEN="figd_..."
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"

npm install
npm run figma:probe          # Test API connectivity
npm run figma:sync:pull      # Pull tokens from Figma
npm run figma:verify         # Verify everything works
```

---

## Playbook Contents

| # | Document | What You'll Learn |
| --- | --- | --- |
| [00](./00-OVERVIEW.md) | **Overview** | Architecture diagram, principles, pipeline summary |
| [01](./01-ONE-TIME-SETUP.md) | **One-Time Setup** | PAT creation, GitHub secrets, environment config |
| [02](./02-ARCHITECTURE.md) | **Architecture** | Script inventory, file dependency map, data flows |
| [03](./03-FIGMA-TO-CODE.md) | **Figma → Code** | Pull pipeline walkthrough (5 steps) |
| [04](./04-CODE-TO-FIGMA.md) | **Code → Figma** | Push pipeline walkthrough (8 steps, 6 guards) |
| [05](./05-CICD-PIPELINES.md) | **CI/CD Pipelines** | All 4 GitHub Actions workflows explained |
| [06](./06-CODE-CONNECT.md) | **Code Connect** | 12 components, `.figma.tsx` anatomy, publishing |
| [07](./07-TROUBLESHOOTING.md) | **Troubleshooting** | 15+ error scenarios with fixes |
| [08](./08-CONFIGURATION-REFERENCE.md) | **Configuration** | Every config file, key, and value documented |
| [09](./09-SAFETY-PATTERNS.md) | **Safety Patterns** | All 11 guards that prevent accidental damage |
| [10](./10-WEBHOOK-SETUP.md) | **Webhook Setup** | Real-time webhook-triggered sync: Figma save → PR in seconds |
| [11](./11-MANUAL-DEVELOPER-GUIDE.md) | **Manual Developer Guide** | Step-by-step local workflow — no deployment required |
| [12](./12-PRODUCTION-AUTOMATION.md) | **Production Automation** | Zero-touch deployed pipeline: webhook → PR → auto-merge |

---

## Essential Commands

| Command | What It Does |
| --- | --- |
| `npm run figma:sync:pull` | Pull Figma → CSS tokens (safe, read-only) |
| `npm run figma:sync:push` | Push CSS → Figma (dry-run, shows what would change) |
| `npm run figma:sync:push -- --apply` | Push CSS → Figma (writes for real) |
| `npm run figma:sync:full` | Full bidirectional sync |
| `npm run figma:verify` | Run 5-check verification suite |
| `npm run figma:probe` | Test API capabilities, recommend route |
| `npm run tokens:sync` | Copy tokens mcp-server → web-client |
| `npm run tokens:check` | Check for token drift between apps |
| `npm run webhook:start` | Start local webhook receiver (port 4848) |
| `npm run webhook:manage -- list` | List registered Figma webhooks |
| `npm run webhook:manage -- create` | Register new Figma webhooks |
| `npm run webhook:test` | Send test payload to local receiver |

---

## Two Modes of Operation

This pipeline supports **both** manual and fully-automated workflows:

| Mode | Guide | Who it's for |
|------|-------|--------------|
| **Manual** | [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md) | Developers who want to run syncs locally, review diffs before committing, or don't have deployment infrastructure. No server needed. |
| **Production Automation** | [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) | Teams wanting zero-touch automation: Figma save → webhook → GitHub Actions → PR → auto-merge. Requires deploying the web-client (e.g. Vercel). |

Both modes use the same underlying scripts and safety guards. Start with Manual to learn the pipeline, graduate to Production when ready.

---

## Safety Model

Every write operation passes through multiple guards before reaching the Figma API:

```text
Your code change
    │
    ├── Write Mode Guard ──── Is writeMode "ci-enabled"?
    ├── Route Gating ──────── Does FIGMA_WRITE_CONTEXT match routes.push?
    ├── Canary Guard ──────── Are we in canary mode? If so, limit scope
    ├── Library Filter ────── Skip read-only library variables
    ├── Rollback Snapshot ─── Save current state before writing
    └── Variable Count ────── Sanity check on payload size
    │
    ▼
  Figma API (POST /variables)
```

Details: [09-SAFETY-PATTERNS.md](./09-SAFETY-PATTERNS.md)

---

## Recommended Reading Order

1. **New to the project?** → Start with [00-OVERVIEW.md](./00-OVERVIEW.md) then [01-ONE-TIME-SETUP.md](./01-ONE-TIME-SETUP.md)
2. **Setting up CI?** → [05-CICD-PIPELINES.md](./05-CICD-PIPELINES.md)
3. **Something broke?** → [07-TROUBLESHOOTING.md](./07-TROUBLESHOOTING.md)
4. **Adding a new component?** → [06-CODE-CONNECT.md](./06-CODE-CONNECT.md)
5. **Understanding token flow?** → [03-FIGMA-TO-CODE.md](./03-FIGMA-TO-CODE.md) then [04-CODE-TO-FIGMA.md](./04-CODE-TO-FIGMA.md)
6. **Want manual control?** → [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md)
7. **Going full automation?** → [10-WEBHOOK-SETUP.md](./10-WEBHOOK-SETUP.md) then [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md)

---

## License

This playbook documents the automation in [MCP-UI-DEMO-ECOMV2](https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2). Use it as a reference or template for your own Figma ↔ Code pipelines.
