# Agentation FeedbackOps Framework (Cross-Project)

Last updated: 2026-02-28

## 1. Evaluation of the Idea

Your idea is strong and production-worthy:

1. It converts UI feedback from ephemeral chat into an auditable delivery pipeline.
2. It reduces context loss across agents/threads by making annotation state durable.
3. It enables measurable execution quality (pending vs acknowledged vs resolved).
4. It creates a direct trace from user feedback to commits and issue tracker state.

Main risks and controls:

1. Over-automation can create noisy tickets:
Control: env-gated sync + dedupe by annotation ID.
2. Provider lock-in:
Control: tracker JSON/MD remains source of truth; issue sync is a mirror.
3. Misconfigured integrations:
Control: explicit `/api/agentation/overview` health/status endpoint.

## 2. Reference Architecture

1. Source:
Agentation toolbar events (`annotation.add`, `submit`, etc.).
2. Ingestion:
Project webhook receiver (`/api/agentation/webhook`).
3. Durable store:
`agentation-comments-tracker.json` + generated `.md` report.
4. Automation layer:
Status transition engine + optional issue-sync adapter.
5. Execution:
Agent resolves comments via API with summary/commit evidence.

## 3. Standard Status Model

Use these canonical states in all repos:

1. `pending`
2. `acknowledged`
3. `resolved`
4. `dismissed`

Required transition rules:

1. `submit` should auto-promote pending -> acknowledged.
2. resolve API should require summary and should accept commit context.
3. delete/clear should convert to dismissed.

## 4. Integration Contract for Any Repo

Minimal required endpoints:

1. `POST /api/agentation/webhook`
2. `GET /api/agentation/comments`
3. `POST /api/agentation/comments/:id/resolve`
4. `GET /api/agentation/overview`

Optional endpoints:

1. `POST /api/agentation/import`
2. `POST /api/agentation/sync-linear`

## 5. Portability Guidelines

1. Never hardcode team/project IDs.
2. Keep integrations env-driven:
- `AGENTATION_LINEAR_ENABLED`
- `LINEAR_API_KEY`
- `AGENTATION_LINEAR_TEAM_ID`
- optional project/assignee/label IDs
3. Fail soft when integration is absent.
4. Keep tracker always functional without third-party services.

## 6. Rollout Plan (Template)

1. Phase 1: Tracker-only mode
- webhook ingest + local status automation + resolve API.
2. Phase 2: Issue sync (optional)
- create/update issues and map states from tracker.
3. Phase 3: Policy enforcement
- CI check ensuring resolved items include resolution summary.
4. Phase 4: Analytics
- weekly report: counts by status, cycle time per annotation.

## 7. Reuse Package Shape (Future)

If you want this everywhere with near-zero setup:

1. Extract `agentationTracker` + issue adapters into a shared package:
`@org/agentation-feedbackops`
2. Keep adapters pluggable:
- Linear adapter
- GitHub Issues adapter
- Jira adapter
3. Each repo only wires route handlers and env values.

## 8. Success Criteria

1. No annotation gets lost.
2. Every resolved annotation has commit evidence.
3. Tracker and issue-system statuses stay aligned.
4. New project setup takes <30 minutes using this framework.
