import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LINEAR_API_URL = "https://api.linear.app/graphql";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_REPO_KEY = path.basename(REPO_ROOT);

function env(name) {
  const value = process.env[name];
  if (typeof value !== "string") return "";
  return value.trim();
}

function asBool(value, fallback = false) {
  if (value == null || String(value).trim() === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseJsonObject(rawValue) {
  if (!rawValue || typeof rawValue !== "string") return {};
  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function parseProjectMap(rawValue) {
  const parsedJson = parseJsonObject(rawValue);
  if (Object.keys(parsedJson).length > 0) {
    return Object.fromEntries(
      Object.entries(parsedJson)
        .map(([key, value]) => [String(key || "").trim(), String(value || "").trim()])
        .filter(([key, value]) => key.length > 0 && value.length > 0),
    );
  }

  if (!rawValue || typeof rawValue !== "string") return {};
  return Object.fromEntries(
    rawValue
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const splitAt = entry.indexOf(":");
        if (splitAt === -1) return ["", ""];
        const key = entry.slice(0, splitAt).trim();
        const value = entry.slice(splitAt + 1).trim();
        return [key, value];
      })
      .filter(([key, value]) => key.length > 0 && value.length > 0),
  );
}

function truncate(value, maxLen) {
  const input = String(value || "").trim();
  if (input.length <= maxLen) return input;
  return `${input.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function buildIssueTitle(comment) {
  const base = comment.comment || comment.element || comment.id || "UI feedback item";
  return truncate(`Agentation: ${base}`, 140);
}

function buildIssueDescription(comment) {
  const lines = [];
  lines.push("## Agentation Feedback");
  lines.push("");
  lines.push(`- Annotation ID: \`${comment.id}\``);
  lines.push(`- Session ID: \`${comment.sessionId || "unknown"}\``);
  lines.push(`- Status: \`${comment.status || "pending"}\``);
  if (comment.url) lines.push(`- URL: ${comment.url}`);
  lines.push("");
  lines.push("### Comment");
  lines.push(comment.comment || "_No comment text provided_");
  lines.push("");
  lines.push("### Element Context");
  if (comment.element) lines.push(`- Element: \`${comment.element}\``);
  if (comment.reactComponents) lines.push(`- React Components: \`${comment.reactComponents}\``);
  if (comment.elementPath) lines.push(`- Element Path: \`${comment.elementPath}\``);
  if (comment.fullPath) lines.push(`- Full Path: \`${truncate(comment.fullPath, 400)}\``);
  if (comment.cssClasses) lines.push(`- CSS Classes: \`${truncate(comment.cssClasses, 400)}\``);
  if (comment.selectedText) lines.push(`- Selected Text: ${truncate(comment.selectedText, 500)}`);
  lines.push("");
  lines.push("### Resolution");
  if (comment.resolution?.summary) {
    lines.push(`- Summary: ${comment.resolution.summary}`);
  } else {
    lines.push("- Pending");
  }
  if (comment.resolution?.commitSha) lines.push(`- Commit: \`${comment.resolution.commitSha}\``);
  if (comment.resolution?.commitUrl) lines.push(`- Commit URL: ${comment.resolution.commitUrl}`);
  lines.push("");
  lines.push("_Synced automatically from Agentation webhook events._");
  return lines.join("\n");
}

function mapCommentStatusToLinearStateType(status) {
  switch (String(status || "pending").toLowerCase()) {
    case "acknowledged":
      return "started";
    case "resolved":
      return "completed";
    case "dismissed":
      return "canceled";
    case "pending":
    default:
      return "unstarted";
  }
}

function extractLinearError(payload) {
  if (!payload || typeof payload !== "object") return "Unknown Linear API error";
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((error) => error?.message || "Unknown GraphQL error").join("; ");
  }
  if (payload.error && typeof payload.error === "string") return payload.error;
  return "Unknown Linear API error";
}

function getActiveProjectKey() {
  const explicit = env("AGENTATION_LINEAR_ACTIVE_PROJECT_KEY");
  if (explicit) return explicit;
  return DEFAULT_REPO_KEY;
}

function getProjectRouting() {
  const enforceProject = asBool(env("AGENTATION_LINEAR_ENFORCE_PROJECT"), true);
  const directProjectId = env("AGENTATION_LINEAR_PROJECT_ID");
  const activeProjectKey = getActiveProjectKey();
  const projectMap = parseProjectMap(env("AGENTATION_LINEAR_PROJECT_MAP"));
  const mappedProjectId = activeProjectKey ? projectMap[activeProjectKey] || "" : "";
  const projectId = directProjectId || mappedProjectId || "";

  if (projectId) {
    return {
      ok: true,
      enforceProject,
      activeProjectKey,
      projectId,
      source: directProjectId ? "AGENTATION_LINEAR_PROJECT_ID" : "AGENTATION_LINEAR_PROJECT_MAP",
      projectMapSize: Object.keys(projectMap).length,
      reason: "",
    };
  }

  return {
    ok: !enforceProject,
    enforceProject,
    activeProjectKey,
    projectId: "",
    source: "",
    projectMapSize: Object.keys(projectMap).length,
    reason: enforceProject ? "linear-project-not-configured-for-active-project" : "",
  };
}

async function linearGraphqlRequest(query, variables = {}) {
  const apiKey = env("LINEAR_API_KEY");
  const apiUrl = env("LINEAR_API_URL") || DEFAULT_LINEAR_API_URL;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY is not configured");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.errors) {
    throw new Error(extractLinearError(payload));
  }
  return payload.data || {};
}

async function getTeamStates(teamId) {
  const query = `
    query TeamStates($teamId: String!) {
      team(id: $teamId) {
        id
        name
        key
        states {
          nodes {
            id
            name
            type
          }
        }
      }
    }
  `;

  const data = await linearGraphqlRequest(query, { teamId });
  const team = data.team;
  if (!team?.id) {
    throw new Error(`Linear team not found: ${teamId}`);
  }
  const states = Array.isArray(team.states?.nodes) ? team.states.nodes : [];
  return { team, states };
}

async function getIssueScope(issueId) {
  const query = `
    query IssueScope($issueId: String!) {
      issue(id: $issueId) {
        id
        identifier
        team {
          id
          key
        }
        project {
          id
          name
        }
      }
    }
  `;

  const data = await linearGraphqlRequest(query, { issueId });
  const issue = data.issue;
  if (!issue?.id) {
    throw new Error(`Linear issue not found: ${issueId}`);
  }
  return issue;
}

function pickStateId(states, desiredType) {
  const primary = states.find((state) => state?.type === desiredType);
  if (primary?.id) return primary.id;
  if (desiredType === "canceled") {
    const fallback = states.find((state) => state?.type === "completed");
    if (fallback?.id) return fallback.id;
  }
  return undefined;
}

async function createLinearIssue(input) {
  const mutation = `
    mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
          state {
            id
            name
            type
          }
        }
      }
    }
  `;

  const data = await linearGraphqlRequest(mutation, { input });
  const created = data.issueCreate;
  if (!created?.success || !created.issue?.id) {
    throw new Error("Linear issueCreate returned unsuccessful response");
  }
  return created.issue;
}

async function updateLinearIssue(id, input) {
  const mutation = `
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue {
          id
          identifier
          url
          state {
            id
            name
            type
          }
        }
      }
    }
  `;

  const data = await linearGraphqlRequest(mutation, { id, input });
  const updated = data.issueUpdate;
  if (!updated?.success || !updated.issue?.id) {
    throw new Error("Linear issueUpdate returned unsuccessful response");
  }
  return updated.issue;
}

export function isLinearSyncEnabled() {
  return (
    asBool(env("AGENTATION_LINEAR_ENABLED"), false) &&
    Boolean(env("LINEAR_API_KEY")) &&
    Boolean(env("AGENTATION_LINEAR_TEAM_ID"))
  );
}

export function getLinearSyncConfigStatus() {
  const routing = getProjectRouting();
  return {
    enabled: isLinearSyncEnabled(),
    hasApiKey: Boolean(env("LINEAR_API_KEY")),
    hasTeamId: Boolean(env("AGENTATION_LINEAR_TEAM_ID")),
    hasProjectId: Boolean(env("AGENTATION_LINEAR_PROJECT_ID")),
    hasProjectRouting: Boolean(routing.projectId),
    enforceProject: routing.enforceProject,
    activeProjectKey: routing.activeProjectKey,
    projectRoutingSource: routing.source,
    projectRoutingReason: routing.reason,
    projectMapSize: routing.projectMapSize,
    hasAssigneeId: Boolean(env("AGENTATION_LINEAR_ASSIGNEE_ID")),
    hasLabelId: Boolean(env("AGENTATION_LINEAR_LABEL_ID")),
    apiUrl: env("LINEAR_API_URL") || DEFAULT_LINEAR_API_URL,
  };
}

export async function syncCommentToLinear(comment, { reason = "sync" } = {}) {
  if (!comment || typeof comment !== "object" || !comment.id) {
    return { ok: false, skipped: true, reason: "invalid-comment" };
  }

  if (!isLinearSyncEnabled()) {
    return { ok: false, skipped: true, reason: "linear-sync-disabled" };
  }

  const teamId = env("AGENTATION_LINEAR_TEAM_ID");
  const projectRouting = getProjectRouting();
  if (!projectRouting.ok) {
    return {
      ok: false,
      skipped: true,
      reason: projectRouting.reason,
      updatedComment: comment,
    };
  }

  const projectId = projectRouting.projectId;
  const assigneeId = env("AGENTATION_LINEAR_ASSIGNEE_ID");
  const labelId = env("AGENTATION_LINEAR_LABEL_ID");
  const desiredStateType = mapCommentStatusToLinearStateType(comment.status);
  const verifyIssueScope = asBool(env("AGENTATION_LINEAR_VERIFY_ISSUE_SCOPE"), true);

  const { states } = await getTeamStates(teamId);
  const desiredStateId = pickStateId(states, desiredStateType);
  const title = buildIssueTitle(comment);
  const description = buildIssueDescription(comment);

  const linearMeta = comment.linear && typeof comment.linear === "object" ? comment.linear : {};
  const syncAt = new Date().toISOString();

  let issue = null;
  if (!linearMeta.issueId) {
    const input = {
      teamId,
      title,
      description,
      ...(projectId ? { projectId } : {}),
      ...(assigneeId ? { assigneeId } : {}),
      ...(labelId ? { labelIds: [labelId] } : {}),
      ...(desiredStateId ? { stateId: desiredStateId } : {}),
    };
    issue = await createLinearIssue(input);
  } else {
    if (verifyIssueScope) {
      const scope = await getIssueScope(linearMeta.issueId);
      if (scope.team?.id && scope.team.id !== teamId) {
        throw new Error(
          `Linear issue ${scope.identifier || scope.id} is in team ${scope.team.id}, expected ${teamId}`,
        );
      }
      if (projectId && scope.project?.id && scope.project.id !== projectId) {
        throw new Error(
          `Linear issue ${scope.identifier || scope.id} is in project ${scope.project.id}, expected ${projectId}`,
        );
      }
      if (projectId && !scope.project?.id) {
        throw new Error(
          `Linear issue ${scope.identifier || scope.id} has no project; expected ${projectId}`,
        );
      }
    }

    const input = {
      title,
      description,
      ...(projectId ? { projectId } : {}),
      ...(desiredStateId ? { stateId: desiredStateId } : {}),
    };
    issue = await updateLinearIssue(linearMeta.issueId, input);
  }

  const updatedComment = {
    ...comment,
    linear: {
      issueId: issue.id,
      identifier: issue.identifier,
      url: issue.url,
      stateId: issue.state?.id || "",
      stateName: issue.state?.name || "",
      stateType: issue.state?.type || "",
      lastSyncAt: syncAt,
      lastSyncReason: reason,
      syncError: "",
    },
    updatedAt: syncAt,
  };

  return {
    ok: true,
    skipped: false,
    updatedComment,
  };
}
