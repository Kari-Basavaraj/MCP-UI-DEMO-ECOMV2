# PM Prompts -> Skills Conversion Matrix (2026-02-28)

## Goal
Define how `deanpeters/product-manager-prompts` should be used alongside `deanpeters/Product-Manager-Skills` without creating duplicate or conflicting skill behavior.

## Decision Rules
1. Prefer canonical skills from `Product-Manager-Skills` when an equivalent framework exists.
2. Convert prompt files into new skills only when there is no strong canonical equivalent.
3. Keep novelty, duplicate, and tooling-specific assets as references unless there is repeated operational demand.

## Summary
- Total assets reviewed: 35
- Link to canonical `Product-Manager-Skills`: 20
- Convert now (prompt-derived skills): 6 source files -> 4 new skills
- Keep as reference assets: 9

## Mapping

| Source | Action | Target Skill / Note |
|---|---|---|
| `prompts/backlog-epic-hypothesis.md` | Link | `epic-hypothesis` |
| `prompts/company-profile-executive-insights-research.md` | Link | `company-research` |
| `prompts/customer-journey-mapping-prompt-template.md` | Link | `customer-journey-map`, `customer-journey-mapping-workshop` |
| `prompts/eol-for-a-product-message.md` | Link | `eol-message` |
| `prompts/framing-the-problem-statement.md` | Link | `problem-statement`, `problem-framing-canvas` |
| `prompts/jobs-to-be-done.md` | Link | `jobs-to-be-done` |
| `prompts/pestel-analysis-prompt-template.md` | Link | `pestel-analysis` |
| `prompts/positioning-statement.md` | Link | `positioning-statement`, `positioning-workshop` |
| `prompts/proto-persona-profile.md` | Link | `proto-persona` |
| `prompts/recommendation-canvas-template.md` | Link | `recommendation-canvas` |
| `prompts/storyboard-storytelling-prompt.md` | Link | `storyboard` |
| `prompts/user-story-mapping.md` | Link | `user-story-mapping`, `user-story-mapping-workshop` |
| `prompts/user-story-prompt-template.md` | Link | `user-story` |
| `prompts/user-story-splitting-prompt-template.md` | Link | `user-story-splitting` |
| `prompts/user-story_ai-enhanced_prompt-template.md` | Link | `user-story` |
| `prompts/visionary-press-release.md` | Link | `press-release` |
| `prompt-generators/jobs-to-be-done customer circle.md` | Link | `jobs-to-be-done` |
| `prompt-generators/storyboarding-prompt-generator-prompt.md` | Link | `storyboard` |
| `prompt-generators/tam-sam-som-prompt-generator.md` | Link | `tam-sam-som-calculator` |
| `prompt-generators/user-story-prompt-generator-prompt.md` | Link | `user-story` |
| `prompts/a-generative-AI-prompt-builder-for-product-professionals.md` | Convert | New skill: `pm-prompt-builder` |
| `prompt-generators/a-generative-AI-prompt-builder-for-product-professionals.md` | Convert | New skill: `pm-prompt-builder` (same family source) |
| `prompts/futuristic-product-faq.md` | Convert | New skill: `futuristic-product-faq` |
| `prompts/strategic-scrum-team-session-kickoff.md` | Convert | New skill: `strategic-scrum-kickoff` |
| `prompts/reverse-engineer-IEEE830srs-to-PRD-prompt-template.md` | Convert | New skill: `legacy-spec-to-prd` |
| `prompts/reverse-engineer-ISO29148-to-PRD-prompt-template.md` | Convert | New skill: `legacy-spec-to-prd` (merged source) |
| `prompts/Dangerous Animals of Product Management Beast Generator.md` | Keep reference | Optional novelty prompt, not core workflow |
| `prompts/Nightmares of Product Management Movie Title Generator Prompt.md` | Keep reference | Optional novelty prompt, not core workflow |
| `prompts/README.md` | Keep reference | Documentation only |
| `prompts/howto.md` | Keep reference | Usage notes only |
| `prompt-generators/Memo of AI Existential Corporate Dread — Prompt Generator Prompt.md` | Keep reference | Novelty/creative asset |
| `prompt-generators/memo-of-AI-existential-corporate-dread_prompt-generator-prompt.md` | Keep reference | Duplicate novelty variant |
| `prompt-generators/market-requirements-generator-prompt.md` | Keep reference | Candidate for future conversion after usage validation |
| `prompt-generators/README.md` | Keep reference | Documentation only |
| `flows/The TAM-SAM-SOM-o-Matic 4000™.json` | Keep reference | Langflow asset, not a Codex-native skill |

## New Skill Set Introduced
1. `pm-master-orchestrator` (routes to canonical and prompt-derived skills)
2. `pm-prompt-builder`
3. `legacy-spec-to-prd`
4. `strategic-scrum-kickoff`
5. `futuristic-product-faq`

## Operating Policy
1. Canonical-first routing is mandatory.
2. Prompt-derived skills are fallback/extension skills, not replacements.
3. If a converted skill begins to overlap with canonical behavior, deprecate the converted one and route back to canonical.

