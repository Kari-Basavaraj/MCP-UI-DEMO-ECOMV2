import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getLinearSyncConfigStatus,
  isLinearSyncEnabled,
  syncCommentToLinear,
} from "./linearSync.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_TRACKER_JSON = path.join(
  REPO_ROOT,
  "docs",
  "code reports",
  "agentation-comments-tracker.json",
);
const DEFAULT_TRACKER_MD = path.join(
  REPO_ROOT,
  "docs",
  "code reports",
  "agentation-comments-tracker.md",
);
const MAX_HISTORY_ENTRIES = 50;
const MAX_SUBMISSIONS = 200;
const VALID_STATUSES = new Set(["pending", "acknowledged", "resolved", "dismissed"]);

function nowIso() {
  return new Date().toISOString();
}

function parseIsoFromTimestamp(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return nowIso();
}

function normalizeStatus(input, fallback = "pending") {
  if (typeof input !== "string") return fallback;
  const candidate = input.trim().toLowerCase();
  return VALID_STATUSES.has(candidate) ? candidate : fallback;
}

function getTrackerPaths() {
  const jsonPath = process.env.AGENTATION_TRACKER_PATH || DEFAULT_TRACKER_JSON;
  const markdownPath =
    process.env.AGENTATION_TRACKER_MARKDOWN_PATH || DEFAULT_TRACKER_MD;
  return { jsonPath, markdownPath };
}

function getEmptyStore() {
  return {
    version: 1,
    updatedAt: nowIso(),
    sessions: {},
    comments: {},
    submissions: [],
    stats: {
      total: 0,
      pending: 0,
      acknowledged: 0,
      resolved: 0,
      dismissed: 0,
    },
  };
}

function ensureTrackerDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadStore(jsonPath) {
  if (!fs.existsSync(jsonPath)) return getEmptyStore();
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return getEmptyStore();
    return {
      ...getEmptyStore(),
      ...parsed,
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
      comments: parsed.comments && typeof parsed.comments === "object" ? parsed.comments : {},
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      stats: parsed.stats && typeof parsed.stats === "object" ? parsed.stats : getEmptyStore().stats,
    };
  } catch {
    return getEmptyStore();
  }
}

function ensureSession(store, annotation) {
  const sessionId =
    typeof annotation.sessionId === "string" && annotation.sessionId.trim().length > 0
      ? annotation.sessionId.trim()
      : "unknown";
  const existing = store.sessions[sessionId] || {
    id: sessionId,
    url: annotation.url || "",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    commentIds: [],
  };
  if (annotation.url) existing.url = annotation.url;
  existing.updatedAt = nowIso();
  store.sessions[sessionId] = existing;
  return existing;
}

function appendHistory(comment, event, details = {}) {
  const entry = {
    at: nowIso(),
    event,
    status: comment.status,
    ...details,
  };
  const current = Array.isArray(comment.history) ? comment.history : [];
  comment.history = [...current.slice(-(MAX_HISTORY_ENTRIES - 1)), entry];
}

function setStatus(comment, status, details = {}) {
  comment.status = normalizeStatus(status, comment.status || "pending");
  if (comment.status === "resolved") {
    comment.resolvedAt = details.resolvedAt || nowIso();
    comment.resolvedBy = details.resolvedBy || "agent";
  }
  if (comment.status === "dismissed") {
    comment.dismissedAt = details.dismissedAt || nowIso();
  }
}

function upsertAnnotation(store, annotation, eventName) {
  if (!annotation || typeof annotation !== "object") return null;
  if (typeof annotation.id !== "string" || annotation.id.trim().length === 0) return null;
  const id = annotation.id.trim();
  const session = ensureSession(store, annotation);
  if (!session.commentIds.includes(id)) {
    session.commentIds.push(id);
  }

  const existing = store.comments[id];
  const comment = existing
    ? { ...existing }
    : {
        id,
        createdAt: annotation.createdAt || parseIsoFromTimestamp(annotation.timestamp),
        history: [],
      };

  comment.sessionId = session.id;
  comment.url = annotation.url || comment.url || session.url || "";
  comment.comment = typeof annotation.comment === "string" ? annotation.comment : comment.comment || "";
  comment.element = typeof annotation.element === "string" ? annotation.element : comment.element || "";
  comment.elementPath =
    typeof annotation.elementPath === "string"
      ? annotation.elementPath
      : comment.elementPath || "";
  comment.fullPath =
    typeof annotation.fullPath === "string" ? annotation.fullPath : comment.fullPath || "";
  comment.cssClasses =
    typeof annotation.cssClasses === "string" ? annotation.cssClasses : comment.cssClasses || "";
  comment.reactComponents =
    typeof annotation.reactComponents === "string"
      ? annotation.reactComponents
      : comment.reactComponents || "";
  comment.selectedText =
    typeof annotation.selectedText === "string"
      ? annotation.selectedText
      : comment.selectedText || "";
  comment.intent = annotation.intent || comment.intent || null;
  comment.severity = annotation.severity || comment.severity || null;
  comment.timestamp =
    typeof annotation.timestamp === "number" ? annotation.timestamp : comment.timestamp || Date.now();
  comment.boundingBox = annotation.boundingBox || comment.boundingBox || null;
  comment.isFixed = Boolean(annotation.isFixed);
  comment.isMultiSelect = Boolean(annotation.isMultiSelect);
  comment.updatedAt = annotation.updatedAt || nowIso();
  setStatus(comment, normalizeStatus(annotation.status, comment.status || "pending"), {
    resolvedAt: annotation.resolvedAt,
    resolvedBy: annotation.resolvedBy,
  });
  appendHistory(comment, eventName, { note: "upserted from annotation payload" });
  store.comments[id] = comment;
  return comment;
}

function markComment(store, id, status, eventName, extra = {}) {
  const current = store.comments[id];
  if (!current) return null;
  const comment = { ...current, updatedAt: nowIso() };
  setStatus(comment, status, extra);
  appendHistory(comment, eventName, extra.note ? { note: extra.note } : {});
  store.comments[id] = comment;
  return comment;
}

function rebuildStats(store) {
  const stats = {
    total: 0,
    pending: 0,
    acknowledged: 0,
    resolved: 0,
    dismissed: 0,
  };
  for (const comment of Object.values(store.comments)) {
    stats.total += 1;
    const status = normalizeStatus(comment.status, "pending");
    stats[status] += 1;
  }
  store.stats = stats;
}

function buildMarkdown(store) {
  const comments = Object.values(store.comments)
    .sort((a, b) => {
      const order = { pending: 0, acknowledged: 1, resolved: 2, dismissed: 3 };
      const aOrder = order[normalizeStatus(a.status)] ?? 4;
      const bOrder = order[normalizeStatus(b.status)] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    });

  const lines = [];
  lines.push("# Agentation Comments Tracker");
  lines.push("");
  lines.push(`Last updated: ${store.updatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Total: ${store.stats.total}`);
  lines.push(`- Pending: ${store.stats.pending}`);
  lines.push(`- Acknowledged: ${store.stats.acknowledged}`);
  lines.push(`- Resolved: ${store.stats.resolved}`);
  lines.push(`- Dismissed: ${store.stats.dismissed}`);
  lines.push("");
  lines.push("## Comments");
  lines.push("");

  if (comments.length === 0) {
    lines.push("_No comments tracked yet._");
    lines.push("");
    return `${lines.join("\n")}\n`;
  }

  lines.push("| ID | Status | Comment | React Components | Path | Updated |");
  lines.push("|---|---|---|---|---|---|");
  for (const comment of comments) {
    const compactComment = String(comment.comment || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140);
    const compactComponents = String(comment.reactComponents || "").slice(0, 120);
    const compactPath = String(comment.elementPath || comment.fullPath || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120);
    lines.push(
      `| \`${comment.id}\` | ${normalizeStatus(comment.status)} | ${compactComment} | ${compactComponents} | ${compactPath} | ${comment.updatedAt || ""} |`,
    );
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function writeStore(paths, store) {
  store.updatedAt = nowIso();
  rebuildStats(store);
  ensureTrackerDir(paths.jsonPath);
  fs.writeFileSync(paths.jsonPath, `${JSON.stringify(store, null, 2)}\n`, "utf-8");
  ensureTrackerDir(paths.markdownPath);
  fs.writeFileSync(paths.markdownPath, buildMarkdown(store), "utf-8");
}

function applyWebhookEvent(store, payload) {
  const event =
    typeof payload.event === "string" && payload.event.trim().length > 0
      ? payload.event.trim()
      : "unknown";
  const processedIds = [];
  const annotation = payload.annotation && typeof payload.annotation === "object" ? payload.annotation : null;
  const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];

  if (event === "annotation.add" || event === "annotation.update") {
    if (annotation) {
      const comment = upsertAnnotation(store, annotation, event);
      if (comment) processedIds.push(comment.id);
    }
  } else if (event === "annotation.delete") {
    const id =
      (annotation && typeof annotation.id === "string" && annotation.id) ||
      (typeof payload.annotationId === "string" ? payload.annotationId : "");
    if (id) {
      const comment = markComment(store, id, "dismissed", event, {
        dismissedAt: nowIso(),
        note: "deleted from agentation",
      });
      if (comment) processedIds.push(comment.id);
    }
  } else if (event === "annotations.clear") {
    for (const item of annotations) {
      if (!item || typeof item.id !== "string") continue;
      const comment = markComment(store, item.id, "dismissed", event, {
        dismissedAt: nowIso(),
        note: "cleared from agentation",
      });
      if (comment) processedIds.push(comment.id);
    }
  } else if (event === "submit") {
    const submissionId = `sub_${Date.now()}`;
    const output = typeof payload.output === "string" ? payload.output : "";
    store.submissions = [
      ...store.submissions.slice(-(MAX_SUBMISSIONS - 1)),
      {
        id: submissionId,
        at: nowIso(),
        url: typeof payload.url === "string" ? payload.url : "",
        annotationIds: annotations.map((item) => item?.id).filter((id) => typeof id === "string"),
        outputExcerpt: output.slice(0, 800),
      },
    ];

    for (const item of annotations) {
      if (!item || typeof item !== "object") continue;
      const existing = upsertAnnotation(store, item, "submit.upsert");
      if (!existing) continue;
      if (normalizeStatus(existing.status) === "pending") {
        const updated = markComment(store, existing.id, "acknowledged", "submit", {
          note: "auto-acknowledged on submit",
        });
        if (updated) processedIds.push(updated.id);
      } else {
        processedIds.push(existing.id);
      }
    }
  } else {
    if (annotation) {
      const comment = upsertAnnotation(store, annotation, `${event}.upsert`);
      if (comment) processedIds.push(comment.id);
    }
  }

  return { event, processedIds };
}

function getSortedComments(store) {
  return Object.values(store.comments).sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")),
  );
}

export function processAgentationWebhook(payload) {
  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  const result = applyWebhookEvent(store, payload || {});
  writeStore(paths, store);
  return {
    ok: true,
    event: result.event,
    processedCount: result.processedIds.length,
    processedIds: result.processedIds,
    stats: store.stats,
  };
}

export function listAgentationComments({ status, sessionId } = {}) {
  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const comments = getSortedComments(store).filter((comment) => {
    if (normalizedStatus && comment.status !== normalizedStatus) return false;
    if (sessionId && comment.sessionId !== sessionId) return false;
    return true;
  });
  return {
    comments,
    stats: store.stats,
    updatedAt: store.updatedAt,
    total: comments.length,
  };
}

export function getAgentationTrackerOverview() {
  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  return {
    updatedAt: store.updatedAt,
    stats: store.stats,
    sessionCount: Object.keys(store.sessions).length,
    linear: getLinearSyncConfigStatus(),
    trackerPaths: {
      jsonPath: paths.jsonPath,
      markdownPath: paths.markdownPath,
    },
  };
}

export function resolveAgentationComment(id, resolution = {}) {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error("Invalid annotation id");
  }
  const annotationId = id.trim();
  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  const comment = store.comments[annotationId];
  if (!comment) {
    throw new Error(`Annotation not found: ${annotationId}`);
  }

  const resolvedAt = nowIso();
  const updated = {
    ...comment,
    updatedAt: resolvedAt,
    resolution: {
      summary:
        typeof resolution.summary === "string" ? resolution.summary.trim() : comment.resolution?.summary || "",
      commitSha:
        typeof resolution.commitSha === "string"
          ? resolution.commitSha.trim()
          : comment.resolution?.commitSha || "",
      commitUrl:
        typeof resolution.commitUrl === "string"
          ? resolution.commitUrl.trim()
          : comment.resolution?.commitUrl || "",
      resolvedBy:
        typeof resolution.resolvedBy === "string" && resolution.resolvedBy.trim().length > 0
          ? resolution.resolvedBy.trim()
          : "agent",
      resolvedAt,
    },
  };
  setStatus(updated, "resolved", {
    resolvedAt,
    resolvedBy: updated.resolution.resolvedBy,
  });
  appendHistory(updated, "comment.resolve", {
    note: updated.resolution.summary || "resolved via API",
  });
  store.comments[annotationId] = updated;
  writeStore(paths, store);
  return updated;
}

export async function importAgentationSessions({ endpoint = "http://localhost:4747" } = {}) {
  const base = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!base) {
    throw new Error("Invalid endpoint");
  }

  const sessionsResponse = await fetch(`${base}/sessions`);
  if (!sessionsResponse.ok) {
    throw new Error(`Failed to fetch sessions: ${sessionsResponse.status}`);
  }
  const sessions = await sessionsResponse.json();
  if (!Array.isArray(sessions)) {
    throw new Error("Invalid sessions payload");
  }

  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  let importedCount = 0;
  let createdCount = 0;

  for (const session of sessions) {
    if (!session || typeof session.id !== "string") continue;
    const detailResponse = await fetch(`${base}/sessions/${session.id}`);
    if (!detailResponse.ok) continue;
    const detail = await detailResponse.json();
    const annotations = Array.isArray(detail.annotations) ? detail.annotations : [];
    for (const annotation of annotations) {
      const existedBefore = Boolean(store.comments[annotation?.id]);
      const comment = upsertAnnotation(store, annotation, "import.session");
      if (comment) {
        importedCount += 1;
        if (!existedBefore) createdCount += 1;
      }
    }
  }

  writeStore(paths, store);
  return {
    ok: true,
    importedCount,
    createdCount,
    stats: store.stats,
    sessionCount: sessions.length,
  };
}

export async function syncAgentationCommentsToLinear({
  commentIds,
  reason = "manual",
  syncAll = false,
} = {}) {
  const paths = getTrackerPaths();
  const store = loadStore(paths.jsonPath);
  const linearStatus = getLinearSyncConfigStatus();

  if (!isLinearSyncEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: "linear-sync-disabled",
      linear: linearStatus,
      synced: 0,
      failed: 0,
      results: [],
    };
  }

  const idsToSync = syncAll
    ? Object.keys(store.comments)
    : Array.from(
        new Set(
          (Array.isArray(commentIds) ? commentIds : []).filter(
            (id) => typeof id === "string" && id.trim().length > 0,
          ),
        ),
      );

  const results = [];
  for (const id of idsToSync) {
    const existing = store.comments[id];
    if (!existing) {
      results.push({
        annotationId: id,
        ok: false,
        skipped: true,
        reason: "comment-not-found",
      });
      continue;
    }

    try {
      const syncResult = await syncCommentToLinear(existing, { reason });
      if (syncResult.updatedComment) {
        const comment = {
          ...syncResult.updatedComment,
          history: Array.isArray(syncResult.updatedComment.history)
            ? syncResult.updatedComment.history
            : existing.history || [],
        };
        appendHistory(comment, "linear.sync", {
          note: `synced to ${comment.linear?.identifier || comment.linear?.issueId || "issue"}`,
        });
        store.comments[id] = comment;
      }
      results.push({
        annotationId: id,
        ok: syncResult.ok,
        skipped: Boolean(syncResult.skipped),
        reason: syncResult.reason || "",
        linearIssueId: syncResult.updatedComment?.linear?.issueId || "",
        linearIdentifier: syncResult.updatedComment?.linear?.identifier || "",
      });
    } catch (error) {
      const failedAt = nowIso();
      const failedComment = {
        ...existing,
        updatedAt: failedAt,
        linear: {
          ...(existing.linear || {}),
          lastSyncAt: failedAt,
          lastSyncReason: reason,
          syncError: error?.message || "Linear sync failed",
        },
      };
      appendHistory(failedComment, "linear.sync.failed", {
        note: failedComment.linear.syncError,
      });
      store.comments[id] = failedComment;
      results.push({
        annotationId: id,
        ok: false,
        skipped: false,
        reason: failedComment.linear.syncError,
      });
    }
  }

  writeStore(paths, store);

  const synced = results.filter((item) => item.ok).length;
  const failed = results.filter((item) => !item.ok && !item.skipped).length;
  return {
    ok: failed === 0,
    skipped: false,
    linear: linearStatus,
    synced,
    failed,
    totalRequested: idsToSync.length,
    results,
  };
}
