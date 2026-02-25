# Figma Sync Workflow (MCP + Code Connect + Variables API)

## Objective

Keep ecommerce widget design and implementation synchronized in both directions:

- Design → Code: Variables/tokens and component intent flow into the codebase.
- Code → Design: Component mappings and implementation parity are visible in Figma workflows.

## Prerequisites

- Figma file with widget components and variables collections.
- Figma access token (or OAuth app) for REST API usage.
- Figma desktop/web access for manual board review when required.
- Code Connect CLI installed in the project toolchain.
- MCP host configured to use Figma MCP capabilities.

## VS Code MCP list setup

To make Figma appear in VS Code MCP server lists for this workspace, add a root `/.mcp.json` file:

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "bearer_token_env_var": "FIGMA_OAUTH_TOKEN",
      "http_headers": {
        "X-Figma-Region": "us-east-1"
      }
    }
  }
}
```

Then ensure your shell/VS Code process has:

- `FIGMA_OAUTH_TOKEN=<your-token>`

After setting env vars, reload VS Code and re-open the MCP list.

## Source of Truth Rules

- Variables/tokens: Figma is source of truth.
- Component behavior/runtime logic: code is source of truth.
- Public component contract (props/variants): agreed contract shared by both.

## Workflow A — Design to Code (Daily)

1. Designer updates variables/components in Figma.
2. Engineer runs variable sync pull.
3. Sync job updates token artifacts in repo.
4. Widget styles consume generated token artifacts.
5. Engineer validates widget render in chat host.

### Suggested token artifacts

- `tokens/figma/variables.raw.json`
- `tokens/figma/variables.normalized.json`
- `src/styles/tokens.css` (or TS token map)

## Workflow B — Code to Design (Component parity)

1. Engineer updates widget component code and props.
2. Run Code Connect mapping command.
3. Publish/refresh mappings to Figma context.
4. Designer reviews mapped component contracts against variants.

## Workflow C — MCP-assisted design context

Use Figma MCP in agent sessions to:

- Retrieve component metadata and naming conventions.
- Validate token naming consistency.
- Cross-check Figma node/component IDs referenced by code mappings.

Note: Some board/file URLs may require an authenticated browser session/WebGL and are not always machine-fetchable in headless tooling.

## Variables API Integration

Use Figma REST API endpoints for variables lifecycle:

- Query variables/collections/modes
- Create/update/delete variables when needed by automation

### Captured workflow from FigJam (Variables API guide)

The pasted FigJam content describes two valid source-of-truth patterns:

1. **Figma as source of truth (pull into codebase)**
  - Trigger from GitHub Actions (schedule or manual dispatch).
  - Step 1: call **GET local variables** API from your workflow/app.
  - Step 2: map Figma variables to your code system names.
  - Step 3: commit generated token changes back to the repo.
  - Use this when design tokens are primarily authored in Figma.

2. **Codebase as source of truth (push into Figma)**
  - Trigger from your app CI job or GitHub Actions.
  - Step 1: call **GET local variables** and **GET local variable collections**.
  - Step 2: map code-side names to existing Figma variable IDs.
  - Step 3: call **POST variables** API to upsert values back into Figma.
  - Use this when tokens are primarily authored in the repository.

Implementation note from the guide: keep a stable mapping table between code token keys and Figma variable IDs to avoid accidental duplicate variable creation.

General API constraints:

- Base URL: `https://api.figma.com`
- Auth: personal access token or OAuth2
- Keep variable IDs, collection IDs, and mode IDs in managed metadata files

## CI/CD Recommendation

- Pull-only sync in CI on schedule (e.g. nightly) and on manual dispatch.
- Open PR with token diff for review.
- Block merge if token schema contract breaks.

If you choose codebase-as-source-of-truth for some collections, use a separate push workflow and require explicit approval before POST updates to Figma.

## Branching + Review Policy

- Designers can change token values freely.
- Token naming/schema changes require engineering approval.
- Component variant removals require migration note in PR.

## Minimal Command Surface (to add in project)

- `npm run figma:pull:variables`
- `npm run figma:normalize:variables`
- `npm run figma:codeconnect:sync`
- `npm run figma:verify`

## Secrets and Config

Store in `.env.local` or CI secrets:

- `FIGMA_ACCESS_TOKEN`
- `FIGMA_FILE_KEY`
- `FIGMA_TEAM_ID` (optional)
- `FIGMA_PROJECT_ID` (optional)

Never commit raw secrets to repo.

## Manual Steps Required Today

1. Open the shared board in a logged-in Figma browser session.
2. Confirm variable collections/modes and component naming.
3. Record stable IDs/file key in secure env.
4. Run sync commands and review generated token diff.

## Definition of Done

- Token pull updates code artifacts reproducibly.
- Widget components consume synced tokens only (no hard-coded visual values).
- Code Connect mapping exists for all ecommerce widgets.
- At least one successful round-trip change has been demonstrated:
  - Figma variable change → code update visible in widget render.
