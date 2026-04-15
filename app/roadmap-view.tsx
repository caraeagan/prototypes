"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Person, Phase, Project, TaskStatus, Team } from "./roadmap-data";
import type {
  LinearIssue,
  LinearCycle,
} from "~/lib/linear";
import type { RoadmapOverrides } from "./api/roadmap/route";

// ── Zoom types ────────────────────────────────────────────────────────────

type ZoomLevel = "month" | "biweekly" | "week";

const ZOOM_COL_WIDTH: Record<ZoomLevel, number> = {
  month: 120,
  biweekly: 120,
  week: 200,
};

// ── Constants ──────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 210;
const TEAM_LABEL_WIDTH = 30;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 80;
const PHASE_HEIGHT = 36;
const BAR_V_PAD = 5;
const BAR_HEIGHT = ROW_HEIGHT - BAR_V_PAD * 2;

const SUBTEST_PROJECT_ID = "132ad838-091a-4a16-95d8-abb2f8c40d42";

// ── Timeline range: Mar 2026 through Jan 2028 ────────────────────────────

const TIMELINE_START = new Date(2026, 2, 1); // Mar 1, 2026
const TIMELINE_END = new Date(2028, 1, 1); // Feb 1, 2028 (end boundary)

function generateColumns(zoom: ZoomLevel): { label: string; date: Date }[] {
  const cols: { label: string; date: Date }[] = [];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (zoom === "month") {
    // Full timeline
    const d = new Date(TIMELINE_START);
    while (d < TIMELINE_END) {
      cols.push({
        label: `${shortMonths[d.getMonth()]} ${d.getFullYear()}`,
        date: new Date(d),
      });
      d.setMonth(d.getMonth() + 1);
    }
  } else if (zoom === "biweekly") {
    // Current quarter (~3 months centered on today)
    const now = new Date();
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1);
    const d = new Date(Math.max(rangeStart.getTime(), TIMELINE_START.getTime()));
    const end = new Date(Math.min(rangeEnd.getTime(), TIMELINE_END.getTime()));
    while (d < end) {
      const month = shortMonths[d.getMonth()];
      const day = d.getDate();
      cols.push({
        label: `${month} ${day}`,
        date: new Date(d),
      });
      d.setDate(d.getDate() + 14);
    }
  } else {
    // Week view: current month only, broken out by week
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Find the Monday on or before the 1st of the month
    const startDow = monthStart.getDay();
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    const cursor = new Date(monthStart);
    cursor.setDate(cursor.getDate() + mondayOffset);

    // Generate weeks that overlap with the current month
    while (cursor <= monthEnd) {
      const month = shortMonths[cursor.getMonth()];
      const day = cursor.getDate();
      const endOfWeek = new Date(cursor);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const endMonth = shortMonths[endOfWeek.getMonth()];
      const endDay = endOfWeek.getDate();
      cols.push({
        label: `${month} ${day} – ${endMonth} ${endDay}`,
        date: new Date(cursor),
      });
      cursor.setDate(cursor.getDate() + 7);
    }
  }
  return cols;
}

/** Convert a month index (0 = Mar 2026) to a fractional column position for a given zoom level */
function monthIndexToColPos(monthIndex: number, zoom: ZoomLevel, columns: { date: Date }[]): number {
  const targetDate = new Date(2026, 2 + monthIndex, 1);
  for (let i = 0; i < columns.length; i++) {
    const colStart = columns[i].date;
    const colEnd = i + 1 < columns.length ? columns[i + 1].date : TIMELINE_END;
    if (targetDate >= colStart && targetDate < colEnd) {
      const totalMs = colEnd.getTime() - colStart.getTime();
      const offsetMs = targetDate.getTime() - colStart.getTime();
      return i + (totalMs > 0 ? offsetMs / totalMs : 0);
    }
  }
  if (columns.length > 0 && targetDate < columns[0].date) {
    return 0;
  }
  return columns.length;
}

/** Convert an absolute Date to a fractional column position */
function dateToColPos(date: Date, columns: { date: Date }[]): number {
  if (date < TIMELINE_START) return 0;
  if (date >= TIMELINE_END) return columns.length;
  for (let i = 0; i < columns.length; i++) {
    const colStart = columns[i].date;
    const colEnd = i + 1 < columns.length ? columns[i + 1].date : TIMELINE_END;
    if (date >= colStart && date < colEnd) {
      const totalMs = colEnd.getTime() - colStart.getTime();
      const offsetMs = date.getTime() - colStart.getTime();
      return i + (totalMs > 0 ? offsetMs / totalMs : 0);
    }
  }
  return columns.length;
}

/** Convert a duration in months to a column width for the given zoom level */
function monthDurationToCols(startMonthIndex: number, duration: number, zoom: ZoomLevel, columns: { date: Date }[]): number {
  const startPos = monthIndexToColPos(startMonthIndex, zoom, columns);
  const endPos = monthIndexToColPos(startMonthIndex + duration, zoom, columns);
  return endPos - startPos;
}

// ── Props ──────────────────────────────────────────────────────────────────

type RoadmapViewProps = {
  people: Person[];
  months: string[];
  phases: Phase[];
  teams: Team[];
};

// ── Status helpers ─────────────────────────────────────────────────────────

function statusColor(status: TaskStatus): string {
  switch (status) {
    case "done":
      return "#22c55e";
    case "in-progress":
      return "#3b82f6";
    case "todo":
      return "#94a3b8";
  }
}

function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "done":
      return "Done";
    case "in-progress":
      return "In Progress";
    case "todo":
      return "To Do";
  }
}

// ── Lane packing ───────────────────────────────────────────────────────────

type Lane = { project: Project; lane: number };

function packLanes(projects: Project[]): { lanes: Lane[]; laneCount: number } {
  const sorted = [...projects].sort((a, b) => a.startMonth - b.startMonth);
  const ends: number[] = [];
  const result: Lane[] = [];

  for (const p of sorted) {
    let placed = false;
    for (let i = 0; i < ends.length; i++) {
      if (ends[i] <= p.startMonth) {
        ends[i] = p.startMonth + p.duration;
        result.push({ project: p, lane: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      ends.push(p.startMonth + p.duration);
      result.push({ project: p, lane: ends.length - 1 });
    }
  }

  return { lanes: result, laneCount: Math.max(ends.length, 1) };
}

// ── Hex to rgba ────────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Linear API client helper ──────────────────────────────────────────────

async function linearQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch("/api/linear", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.data as T;
}

async function linearUpdateDates(
  issueId: string,
  startDate?: string | null,
  dueDate?: string | null,
): Promise<{ success: boolean }> {
  const res = await fetch("/api/linear/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueId, startDate, dueDate }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `API error: ${res.status}`);
  }
  return json;
}

// ── Roadmap overrides API ────────────────────────────────────────────────

async function fetchOverrides(): Promise<RoadmapOverrides> {
  const res = await fetch("/api/roadmap");
  if (!res.ok) return {};
  return res.json();
}

async function saveOverride(
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await fetch("/api/roadmap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
}

// ── Priority helpers ──────────────────────────────────────────────────────

function priorityIcon(priority: number): string {
  switch (priority) {
    case 0: return "---";
    case 1: return "!!!";
    case 2: return "!!";
    case 3: return "!";
    case 4: return "~";
    default: return "";
  }
}

function priorityColor(priority: number): string {
  switch (priority) {
    case 1: return "#ef4444";
    case 2: return "#f97316";
    case 3: return "#eab308";
    case 4: return "#94a3b8";
    default: return "#d1d5db";
  }
}

// ── Clean up Linear issue title for bar labels ────────────────────────────

function cleanTitle(title: string): string {
  // Take first meaningful part before common delimiters
  const cleaned = title.split(/[-\u2013\u2014:|]/)[0].trim();
  return cleaned.length > 40 ? cleaned.substring(0, 37) + "..." : cleaned;
}

// ── Format date helpers ───────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert a month index (0 = Mar 2026) to a formatted date like "Apr 14, 2026" */
function formatMonthIndex(monthIndex: number): string {
  // Month index 0 = Mar 2026 (month 2 in JS Date)
  const d = new Date(2026, 2 + monthIndex, 1);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCycleLabel(cycle: LinearCycle): string {
  const start = new Date(cycle.startsAt);
  const end = new Date(cycle.endsAt);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Cycle ${cycle.number} (${fmt(start)}\u2013${fmt(end)})`;
}

// ── Toast component ───────────────────────────────────────────────────────

type ToastType = "success" | "error";
type ToastMessage = { id: number; type: ToastType; text: string };
let toastIdCounter = 0;

function Toast({ messages, onDismiss }: { messages: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toast-container">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`toast toast-${msg.type}`}
          onClick={() => onDismiss(msg.id)}
        >
          <span className="toast-icon">{msg.type === "success" ? "\u2713" : "\u2717"}</span>
          <span className="toast-text">{msg.text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Progress data types ──────────────────────────────────────────────────

type ProjectProgress = {
  total: number;
  done: number;
  inProgress: number;
  todo: number;
  cancelled: number;
};

// ── Linear Issue Detail Panel ─────────────────────────────────────────────

function LinearDetailPanel({
  issueId,
  onClose,
}: {
  issueId: string;
  onClose: () => void;
}) {
  const [issue, setIssue] = useState<LinearIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    linearQuery<{ issue: LinearIssue }>(
      `query Issue($id: String!) {
        issue(id: $id) {
          id title description priority priorityLabel identifier
          state { name color }
          assignee { displayName avatarUrl }
          project { id name }
          cycle { number startsAt endsAt }
          labels { nodes { name color } }
          startedAt dueDate createdAt updatedAt
          comments { nodes { body createdAt user { displayName avatarUrl } } }
        }
      }`,
      { id: issueId },
    )
      .then((data) => {
        if (!cancelled) setIssue(data.issue);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [issueId]);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="linear-detail-loading">
            <div className="loading-spinner" />
            <span>Loading issue details...</span>
          </div>
        )}
        {error && (
          <div className="linear-detail-error">
            <span>Failed to load: {error}</span>
            <button className="detail-close" onClick={onClose}>&times;</button>
          </div>
        )}
        {issue && !loading && (
          <>
            <div className="detail-header" style={{ borderColor: issue.state.color }}>
              <div className="detail-header-top">
                {issue.identifier && (
                  <span className="linear-identifier">{issue.identifier}</span>
                )}
                <span className="detail-person" style={{ flex: 1 }}>
                  {issue.assignee?.displayName || "Unassigned"}
                </span>
                <button className="detail-close" onClick={onClose}>&times;</button>
              </div>
              <h2 className="detail-title">{issue.title}</h2>

              {/* Status + Priority row */}
              <div className="linear-meta-row">
                <span
                  className="linear-status-badge"
                  style={{
                    backgroundColor: hexToRgba(issue.state.color, 0.15),
                    color: issue.state.color,
                    borderColor: issue.state.color,
                  }}
                >
                  <span
                    className="linear-status-dot"
                    style={{ backgroundColor: issue.state.color }}
                  />
                  {issue.state.name}
                </span>
                <span
                  className="linear-priority-badge"
                  style={{
                    color: priorityColor(issue.priority),
                    backgroundColor: hexToRgba(priorityColor(issue.priority), 0.1),
                  }}
                >
                  {priorityIcon(issue.priority)} {issue.priorityLabel}
                </span>
              </div>
            </div>

            {/* Info section */}
            <div className="linear-info-section">
              {issue.assignee && (
                <div className="linear-info-row">
                  <span className="linear-info-label">Assignee</span>
                  <div className="linear-assignee">
                    {issue.assignee.avatarUrl ? (
                      <img
                        className="linear-avatar"
                        src={issue.assignee.avatarUrl}
                        alt={issue.assignee.displayName}
                      />
                    ) : (
                      <div className="linear-avatar-placeholder">
                        {issue.assignee.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span>{issue.assignee.displayName}</span>
                  </div>
                </div>
              )}

              {issue.project && (
                <div className="linear-info-row">
                  <span className="linear-info-label">Project</span>
                  <span className="linear-info-value">{issue.project.name}</span>
                </div>
              )}

              {issue.cycle && (
                <div className="linear-info-row">
                  <span className="linear-info-label">Cycle</span>
                  <span className="linear-info-value">
                    {formatCycleLabel(issue.cycle)}
                  </span>
                </div>
              )}

              {(issue.startedAt || issue.dueDate) && (
                <div className="linear-info-row">
                  <span className="linear-info-label">Dates</span>
                  <span className="linear-info-value">
                    {issue.startedAt ? formatDate(issue.startedAt) : "No start"}{" "}
                    &rarr;{" "}
                    {issue.dueDate ? formatDate(issue.dueDate) : "No due date"}
                  </span>
                </div>
              )}

              {issue.labels.nodes.length > 0 && (
                <div className="linear-info-row">
                  <span className="linear-info-label">Labels</span>
                  <div className="linear-labels">
                    {issue.labels.nodes.map((label) => (
                      <span
                        key={label.name}
                        className="linear-label-badge"
                        style={{
                          backgroundColor: hexToRgba(label.color, 0.15),
                          color: label.color,
                        }}
                      >
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {issue.description && (
              <div className="linear-description-section">
                <h3 className="detail-tasks-title">Description</h3>
                <div className="linear-description">{issue.description}</div>
              </div>
            )}

            {/* Comments */}
            {issue.comments && issue.comments.nodes.length > 0 && (
              <div className="linear-comments-section">
                <h3 className="detail-tasks-title">
                  Comments ({issue.comments.nodes.length})
                </h3>
                <div className="linear-comments-list">
                  {issue.comments.nodes.map((comment, idx) => (
                    <div key={idx} className="linear-comment">
                      <div className="linear-comment-header">
                        <div className="linear-assignee">
                          {comment.user.avatarUrl ? (
                            <img
                              className="linear-avatar-sm"
                              src={comment.user.avatarUrl}
                              alt={comment.user.displayName}
                            />
                          ) : (
                            <div className="linear-avatar-placeholder-sm">
                              {comment.user.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="linear-comment-author">
                            {comment.user.displayName}
                          </span>
                        </div>
                        <span className="linear-comment-date">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div className="linear-comment-body">{comment.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Linear Project Detail Panel ──────────────────────────────────────────
// Shown when clicking a project bar that has a linearProjectName

type LinearProjectIssue = {
  id: string;
  title: string;
  priority: number;
  priorityLabel: string;
  state: { name: string; color: string };
  assignee: { displayName: string; avatarUrl: string | null } | null;
  startedAt: string | null;
  dueDate: string | null;
};

function LinearProjectDetailPanel({
  project,
  personName,
  personColor,
  linearProjectName,
  progress,
  onClose,
  onIssueClick,
  onDelete,
}: {
  project: Project;
  personName: string;
  personColor: string;
  linearProjectName: string;
  progress: ProjectProgress | null;
  onClose: () => void;
  onIssueClick: (issueId: string) => void;
  onDelete: (personName: string, projectId: string, projectName: string) => void;
}) {
  const [issues, setIssues] = useState<LinearProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState(project.startMonth);
  const [editDuration, setEditDuration] = useState(project.duration);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [issueComments, setIssueComments] = useState<Record<string, LinearIssue["comments"]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    linearQuery<{
      projects: {
        nodes: {
          issues: {
            nodes: LinearProjectIssue[];
          };
        }[];
      };
    }>(
      `query ProjectIssuesByName($projectName: String!) {
        projects(filter: { name: { eq: $projectName } }) {
          nodes {
            issues(first: 100) {
              nodes {
                id title priority priorityLabel
                state { name color }
                assignee { displayName avatarUrl }
                startedAt dueDate
              }
            }
          }
        }
      }`,
      { projectName: linearProjectName },
    )
      .then((data) => {
        if (cancelled) return;
        const allIssues = data.projects.nodes.flatMap((p) => p.issues.nodes);
        setIssues(allIssues);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [linearProjectName]);

  const doneIssues = issues.filter((i) => {
    const s = i.state.name.toLowerCase();
    return s === "done" || s === "closed" || s === "completed" || s === "cancelled" || s === "canceled";
  });
  const inProgressIssues = issues.filter((i) => {
    const s = i.state.name.toLowerCase();
    return s === "in progress" || s === "in review" || s === "started";
  });
  const todoIssues = issues.filter(
    (i) => !doneIssues.includes(i) && !inProgressIssues.includes(i),
  );

  const progressPct = progress
    ? progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0
    : issues.length > 0
      ? Math.round((doneIssues.length / issues.length) * 100)
      : 0;

  const startDateStr = formatMonthIndex(isEditing ? editStart : project.startMonth);
  const endDateStr = formatMonthIndex((isEditing ? editStart : project.startMonth) + (isEditing ? editDuration : project.duration));
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);

  // Fetch comments for an expanded issue
  const fetchIssueComments = useCallback((issueId: string) => {
    if (issueComments[issueId]) return;
    linearQuery<{ issue: LinearIssue }>(
      `query Issue($id: String!) {
        issue(id: $id) {
          id
          comments { nodes { body createdAt user { displayName avatarUrl } } }
        }
      }`,
      { id: issueId },
    ).then((data) => {
      setIssueComments((prev) => ({
        ...prev,
        [issueId]: data.issue.comments,
      }));
    }).catch(() => {
      // Silently fail for comments
    });
  }, [issueComments]);

  const handlePostComment = useCallback(async (issueId: string) => {
    const body = commentInputs[issueId]?.trim();
    if (!body) return;
    setPostingComment((prev) => ({ ...prev, [issueId]: true }));
    try {
      await linearQuery(
        `mutation CreateComment($issueId: String!, $body: String!) {
          commentCreate(input: { issueId: $issueId, body: $body }) {
            success
            comment { body createdAt user { displayName avatarUrl } }
          }
        }`,
        { issueId, body },
      );
      // Refresh comments
      setIssueComments((prev) => ({ ...prev, [issueId]: undefined as unknown as LinearIssue["comments"] }));
      setCommentInputs((prev) => ({ ...prev, [issueId]: "" }));
      // Re-fetch
      fetchIssueComments(issueId);
    } catch {
      // Silently fail
    } finally {
      setPostingComment((prev) => ({ ...prev, [issueId]: false }));
    }
  }, [commentInputs, fetchIssueComments]);

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    setSavingNotes(true);
    // In future, this could post to Linear as a comment
    setTimeout(() => {
      setSavingNotes(false);
      setNotes("");
    }, 500);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header" style={{ borderColor: personColor }}>
          <div className="detail-header-top">
            <div
              className="detail-color-dot"
              style={{ backgroundColor: personColor }}
            />
            <span className="detail-person">{personName}</span>
            <button
              className="detail-edit-btn"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setEditStart(project.startMonth);
                  setEditDuration(project.duration);
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
            <button className="detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="detail-title">{project.name}</h2>
          <div style={{ fontSize: 12, color: "#8b8b9e", marginBottom: 8 }}>
            Linear: {linearProjectName}
          </div>
          <div className="detail-info-rows">
            <div className="detail-info-row">
              <span className="detail-info-label">Owner</span>
              <span className="detail-info-value">
                <span className="detail-owner-dot" style={{ backgroundColor: personColor }} />
                {personName}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Start</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="number"
                    className="detail-editable-input"
                    value={editStart}
                    min={0}
                    max={22}
                    onChange={(e) => setEditStart(Number(e.target.value))}
                  />
                ) : (
                  startDateStr
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">End</span>
              <span className="detail-info-value">{endDateStr}</span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Duration</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      className="detail-editable-input"
                      value={editDuration}
                      min={1}
                      max={23}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      style={{ width: 70 }}
                    />
                    <span style={{ fontSize: 12, color: "#8b8b9e" }}>months</span>
                  </span>
                ) : (
                  <>{project.duration} month{project.duration > 1 ? "s" : ""}</>
                )}
              </span>
            </div>
          </div>
          <div className="detail-meta">
            <span className="detail-progress-text">
              {progress
                ? `${progress.done}/${progress.total} done`
                : `${doneIssues.length}/${issues.length} done`}{" "}
              ({progressPct}%)
            </span>
          </div>
          <div className="detail-progress-bar-bg">
            <div
              className="detail-progress-bar-fill"
              style={{
                width: `${progressPct}%`,
                backgroundColor: "#22c55e",
              }}
            />
          </div>
        </div>

        <div className="detail-stats">
          <div className="detail-stat">
            <span className="detail-stat-dot" style={{ backgroundColor: "#22c55e" }} />
            <span className="detail-stat-label">Done</span>
            <span className="detail-stat-count">{progress?.done ?? doneIssues.length}</span>
          </div>
          <div className="detail-stat">
            <span className="detail-stat-dot" style={{ backgroundColor: "#3b82f6" }} />
            <span className="detail-stat-label">In Progress</span>
            <span className="detail-stat-count">{progress?.inProgress ?? inProgressIssues.length}</span>
          </div>
          <div className="detail-stat">
            <span className="detail-stat-dot" style={{ backgroundColor: "#94a3b8" }} />
            <span className="detail-stat-label">To Do</span>
            <span className="detail-stat-count">{progress?.todo ?? todoIssues.length}</span>
          </div>
        </div>

        {loading && (
          <div className="linear-detail-loading">
            <div className="loading-spinner" />
            <span>Loading issues from Linear...</span>
          </div>
        )}

        {error && (
          <div className="linear-detail-error">
            <span>Failed to load: {error}</span>
          </div>
        )}

        {!loading && !error && (
          <div className="detail-tasks">
            <h3 className="detail-tasks-title">
              Issues ({issues.length})
            </h3>
            <ul className="detail-task-list">
              {issues.map((issue) => {
                const isExpanded = expandedIssueId === issue.id;
                const comments = issueComments[issue.id];
                return (
                  <li
                    key={issue.id}
                    className={`detail-task-item-expandable${isExpanded ? " expanded" : ""}`}
                  >
                    <div
                      className="detail-task-item-header"
                      onClick={() => {
                        const nextId = isExpanded ? null : issue.id;
                        setExpandedIssueId(nextId);
                        if (nextId) fetchIssueComments(nextId);
                      }}
                    >
                      <span
                        className={`detail-task-chevron${isExpanded ? " expanded" : ""}`}
                      >
                        &#9654;
                      </span>
                      <span
                        className="detail-task-dot"
                        style={{ backgroundColor: issue.state.color }}
                      />
                      <span className="detail-task-name">{issue.title}</span>
                      <span
                        className="detail-task-badge"
                        style={{
                          backgroundColor: hexToRgba(issue.state.color, 0.12),
                          color: issue.state.color,
                        }}
                      >
                        {issue.state.name}
                      </span>
                    </div>
                    {isExpanded && (
                      <div className="detail-task-expanded-content">
                        <div className="detail-task-detail-row">
                          <span className="detail-task-detail-label">Status</span>
                          <select
                            className="detail-status-select"
                            value={issue.state.name}
                            style={{ color: issue.state.color }}
                            onChange={() => {
                              // Status update would require Linear workflow state IDs
                              // Placeholder for future implementation
                            }}
                          >
                            <option value="Todo">Todo</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Done">Done</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                        {issue.assignee && (
                          <div className="detail-task-detail-row">
                            <span className="detail-task-detail-label">Assignee</span>
                            <span className="detail-task-detail-value">
                              {issue.assignee.displayName}
                            </span>
                          </div>
                        )}
                        {(issue.startedAt || issue.dueDate) && (
                          <div className="detail-task-detail-row">
                            <span className="detail-task-detail-label">Dates</span>
                            <span className="detail-task-detail-value">
                              {issue.startedAt ? formatDate(issue.startedAt) : "No start"}{" "}
                              &rarr;{" "}
                              {issue.dueDate ? formatDate(issue.dueDate) : "No due date"}
                            </span>
                          </div>
                        )}

                        {/* Comments thread */}
                        {comments && comments.nodes && comments.nodes.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: "#8b8b9e", marginBottom: 6 }}>
                              Comments ({comments.nodes.length})
                            </div>
                            {comments.nodes.map((comment, idx) => (
                              <div key={idx} style={{
                                padding: "6px 8px",
                                marginBottom: 4,
                                background: "#f8f9fb",
                                borderRadius: 6,
                                fontSize: 12,
                              }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                  <span style={{ fontWeight: 600, color: "#1a1a2e" }}>{comment.user.displayName}</span>
                                  <span style={{ color: "#8b8b9e", fontSize: 10 }}>{formatDate(comment.createdAt)}</span>
                                </div>
                                <div style={{ color: "#444", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{comment.body}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add comment input */}
                        <div className="detail-comment-input-row">
                          <input
                            type="text"
                            className="detail-comment-input"
                            placeholder="Add a comment..."
                            value={commentInputs[issue.id] || ""}
                            onChange={(e) =>
                              setCommentInputs((prev) => ({ ...prev, [issue.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && commentInputs[issue.id]?.trim()) {
                                handlePostComment(issue.id);
                              }
                            }}
                          />
                          <button
                            className="detail-comment-send-btn"
                            disabled={!commentInputs[issue.id]?.trim() || postingComment[issue.id]}
                            onClick={() => handlePostComment(issue.id)}
                          >
                            {postingComment[issue.id] ? "..." : "Send"}
                          </button>
                        </div>

                        <div style={{ marginTop: 4 }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onIssueClick(issue.id);
                            }}
                            style={{
                              background: "none",
                              border: "1px solid #e0e0ea",
                              borderRadius: 6,
                              padding: "4px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "var(--font-sans)",
                              color: "#6366f1",
                              cursor: "pointer",
                            }}
                          >
                            View full details in Linear
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Notes section */}
        <div className="detail-bottom-section">
          <h3 className="detail-tasks-title">Notes</h3>
          <textarea
            className="detail-notes-textarea"
            placeholder="Add a note..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="detail-notes-save-btn"
              disabled={!notes.trim() || savingNotes}
              onClick={handleSaveNotes}
            >
              {savingNotes ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>

        {/* Delete button at the bottom */}
        <div className="detail-bottom-section">
          <button
            className="detail-delete-btn"
            onClick={() => {
              if (confirm(`Remove "${project.name}" from the roadmap?`)) {
                onDelete(personName, project.id, project.name);
                onClose();
              }
            }}
          >
            Delete from Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail panel (static roadmap projects) ────────────────────────────────

function DetailPanel({
  project,
  personName,
  personColor,
  onClose,
  onDelete,
}: {
  project: Project;
  personName: string;
  personColor: string;
  onClose: () => void;
  onDelete: (personName: string, projectId: string, projectName: string) => void;
}) {
  const doneCount = project.tasks.filter((t) => t.status === "done").length;
  const inProgressCount = project.tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const todoCount = project.tasks.filter((t) => t.status === "todo").length;
  const total = project.tasks.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editStart, setEditStart] = useState(project.startMonth);
  const [editDuration, setEditDuration] = useState(project.duration);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const startDateStr = formatMonthIndex(isEditing ? editStart : project.startMonth);
  const endDateStr = formatMonthIndex((isEditing ? editStart : project.startMonth) + (isEditing ? editDuration : project.duration));
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const handleSaveNotes = async () => {
    if (!notes.trim()) return;
    setSavingNotes(true);
    // Notes saved locally (Linear comment posting would need a project link)
    setTimeout(() => {
      setSavingNotes(false);
      setNotes("");
    }, 500);
  };

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header" style={{ borderColor: personColor }}>
          <div className="detail-header-top">
            <div
              className="detail-color-dot"
              style={{ backgroundColor: personColor }}
            />
            <span className="detail-person">{personName}</span>
            <button
              className="detail-edit-btn"
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setEditStart(project.startMonth);
                  setEditDuration(project.duration);
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Done" : "Edit"}
            </button>
            <button className="detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="detail-title">{project.name}</h2>
          <div className="detail-info-rows">
            <div className="detail-info-row">
              <span className="detail-info-label">Owner</span>
              <span className="detail-info-value">
                <span className="detail-owner-dot" style={{ backgroundColor: personColor }} />
                {personName}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Start</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="number"
                    className="detail-editable-input"
                    value={editStart}
                    min={0}
                    max={22}
                    onChange={(e) => setEditStart(Number(e.target.value))}
                  />
                ) : (
                  startDateStr
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">End</span>
              <span className="detail-info-value">{endDateStr}</span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Duration</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      className="detail-editable-input"
                      value={editDuration}
                      min={1}
                      max={23}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      style={{ width: 70 }}
                    />
                    <span style={{ fontSize: 12, color: "#8b8b9e" }}>months</span>
                  </span>
                ) : (
                  <>{project.duration} month{project.duration > 1 ? "s" : ""}</>
                )}
              </span>
            </div>
          </div>
          <div className="detail-meta">
            <span className="detail-progress-text">{progress}% complete</span>
          </div>
          <div className="detail-progress-bar-bg">
            <div
              className="detail-progress-bar-fill"
              style={{
                width: `${progress}%`,
                backgroundColor: personColor,
              }}
            />
          </div>
        </div>

        <div className="detail-stats">
          <div className="detail-stat">
            <span
              className="detail-stat-dot"
              style={{ backgroundColor: "#22c55e" }}
            />
            <span className="detail-stat-label">Done</span>
            <span className="detail-stat-count">{doneCount}</span>
          </div>
          <div className="detail-stat">
            <span
              className="detail-stat-dot"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <span className="detail-stat-label">In Progress</span>
            <span className="detail-stat-count">{inProgressCount}</span>
          </div>
          <div className="detail-stat">
            <span
              className="detail-stat-dot"
              style={{ backgroundColor: "#94a3b8" }}
            />
            <span className="detail-stat-label">To Do</span>
            <span className="detail-stat-count">{todoCount}</span>
          </div>
        </div>

        <div className="detail-tasks">
          <h3 className="detail-tasks-title">Tasks</h3>
          <ul className="detail-task-list">
            {project.tasks.map((task) => {
              const isExpanded = expandedTaskId === task.id;
              return (
                <li
                  key={task.id}
                  className={`detail-task-item-expandable${isExpanded ? " expanded" : ""}`}
                >
                  <div
                    className="detail-task-item-header"
                    onClick={() =>
                      setExpandedTaskId(isExpanded ? null : task.id)
                    }
                  >
                    <span
                      className={`detail-task-chevron${isExpanded ? " expanded" : ""}`}
                    >
                      &#9654;
                    </span>
                    <span
                      className="detail-task-dot"
                      style={{ backgroundColor: statusColor(task.status) }}
                    />
                    <span className="detail-task-name">{task.title}</span>
                    <span
                      className="detail-task-badge"
                      style={{
                        backgroundColor: hexToRgba(
                          statusColor(task.status),
                          0.12,
                        ),
                        color: statusColor(task.status),
                      }}
                    >
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  {isExpanded && (
                    <div className="detail-task-expanded-content">
                      <div className="detail-task-detail-row">
                        <span className="detail-task-detail-label">Status</span>
                        <span
                          className="detail-task-detail-value"
                          style={{ color: statusColor(task.status) }}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </div>
                      <div className="detail-task-detail-row">
                        <span className="detail-task-detail-label">Assignee</span>
                        <span className="detail-task-detail-value">
                          <span
                            className="detail-owner-dot"
                            style={{
                              backgroundColor: personColor,
                              display: "inline-block",
                              marginRight: 4,
                              verticalAlign: "middle",
                            }}
                          />
                          {personName}
                        </span>
                      </div>
                      <div className="detail-task-detail-row">
                        <span className="detail-task-detail-label">Dates</span>
                        <span className="detail-task-detail-value">
                          {startDateStr} &rarr; {endDateStr}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Notes section */}
        <div className="detail-bottom-section">
          <h3 className="detail-tasks-title">Notes</h3>
          <textarea
            className="detail-notes-textarea"
            placeholder="Add a note..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <button
              className="detail-notes-save-btn"
              disabled={!notes.trim() || savingNotes}
              onClick={handleSaveNotes}
            >
              {savingNotes ? "Saving..." : "Save Note"}
            </button>
          </div>
        </div>

        {/* Delete button at the bottom */}
        <div className="detail-bottom-section">
          <button
            className="detail-delete-btn"
            onClick={() => {
              if (confirm(`Remove "${project.name}" from the roadmap?`)) {
                onDelete(personName, project.id, project.name);
                onClose();
              }
            }}
          >
            Delete from Roadmap
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Zoom controls ──────────────────────────────────────────────────────────

function ZoomControls({
  zoom,
  onZoom,
}: {
  zoom: ZoomLevel;
  onZoom: (z: ZoomLevel) => void;
}) {
  const levels: { key: ZoomLevel; label: string }[] = [
    { key: "month", label: "M" },
    { key: "biweekly", label: "2W" },
    { key: "week", label: "W" },
  ];

  return (
    <div className="zoom-controls">
      {levels.map((l) => (
        <button
          key={l.key}
          className={`zoom-btn${zoom === l.key ? " zoom-btn-active" : ""}`}
          onClick={() => onZoom(l.key)}
          title={l.key === "month" ? "Month view" : l.key === "biweekly" ? "Bi-weekly view" : "Week view"}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

// ── Cycle select ──────────────────────────────────────────────────────────

function CycleSelect({
  cycles,
  selectedCycleId,
  onSelect,
  loading,
}: {
  cycles: LinearCycle[];
  selectedCycleId: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
}) {
  return (
    <div className="cycle-select-wrapper">
      <select
        className="cycle-select"
        value={selectedCycleId ?? "all"}
        onChange={(e) => onSelect(e.target.value === "all" ? null : e.target.value)}
        disabled={loading}
      >
        <option value="all">All Cycles</option>
        {cycles.map((c) => (
          <option key={c.id} value={c.id}>
            {formatCycleLabel(c)}
          </option>
        ))}
      </select>
      {loading && <div className="cycle-loading-dot" />}
    </div>
  );
}

// ── Add project form ──────────────────────────────────────────────────────

function AddProjectForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, startMonth: number, duration: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [startMonth, setStartMonth] = useState(0);
  const [duration, setDuration] = useState(2);

  return (
    <div className="add-project-form" onClick={(e) => e.stopPropagation()}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Add Project</div>
      <input
        type="text"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 10px",
          border: "1px solid #e0e0ea",
          borderRadius: 6,
          fontSize: 13,
          fontFamily: "var(--font-sans)",
          marginBottom: 8,
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && name.trim()) {
            onAdd(name.trim(), startMonth, duration);
          }
          if (e.key === "Escape") onCancel();
        }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <label style={{ fontSize: 12, flex: 1 }}>
          Start month
          <input
            type="number"
            min={0}
            max={22}
            value={startMonth}
            onChange={(e) => setStartMonth(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "4px 8px",
              border: "1px solid #e0e0ea",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              marginTop: 2,
            }}
          />
        </label>
        <label style={{ fontSize: 12, flex: 1 }}>
          Duration
          <input
            type="number"
            min={1}
            max={23}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "4px 8px",
              border: "1px solid #e0e0ea",
              borderRadius: 6,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              marginTop: 2,
            }}
          />
        </label>
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "4px 12px",
            border: "1px solid #e0e0ea",
            borderRadius: 6,
            background: "#fff",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (name.trim()) onAdd(name.trim(), startMonth, duration);
          }}
          style={{
            padding: "4px 12px",
            border: "none",
            borderRadius: 6,
            background: "#6366f1",
            color: "#fff",
            fontSize: 12,
            cursor: "pointer",
            fontWeight: 600,
            fontFamily: "var(--font-sans)",
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search,
  onSearch,
  peopleCount,
  projectCount,
  zoom,
  onZoom,
  cycles,
  selectedCycleId,
  onCycleSelect,
  cyclesLoading,
  onPrint,
  onUndo,
  canUndo,
}: {
  search: string;
  onSearch: (v: string) => void;
  peopleCount: number;
  projectCount: number;
  zoom: ZoomLevel;
  onZoom: (z: ZoomLevel) => void;
  cycles: LinearCycle[];
  selectedCycleId: string | null;
  onCycleSelect: (id: string | null) => void;
  cyclesLoading: boolean;
  onPrint: () => void;
  onUndo: () => void;
  canUndo: boolean;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-left">
        <h1 className="filter-title">Marker Learning Roadmap</h1>
        <span className="filter-counts">
          {peopleCount} people &middot; {projectCount} projects
        </span>
      </div>
      <div className="filter-bar-right">
        <CycleSelect
          cycles={cycles}
          selectedCycleId={selectedCycleId}
          onSelect={onCycleSelect}
          loading={cyclesLoading}
        />
        <input
          type="text"
          className="filter-search"
          placeholder="Search people or projects..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <ZoomControls zoom={zoom} onZoom={onZoom} />
        <button
          className="zoom-btn"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          style={{ padding: "6px 12px", fontSize: 14, opacity: canUndo ? 1 : 0.3 }}
        >
          Undo
        </button>
        <button
          className="zoom-btn"
          onClick={onPrint}
          title="Print / Export"
          style={{ padding: "6px 12px", fontSize: 14 }}
        >
          Print
        </button>
      </div>
    </div>
  );
}

// ── Types for row info ─────────────────────────────────────────────────────

type PersonRowInfo = {
  kind: "person";
  person: Person;
  lanes: Lane[];
  laneCount: number;
  yOffset: number;
  totalHeight: number;
  teamName: string;
  teamColor: string;
  personIndex: number; // index within the team group for alternating bg
};

type RowEntry = PersonRowInfo;

// ── Drag state ─────────────────────────────────────────────────────────────

type DragState = {
  projectId: string;
  personName: string;
  linearIssueId?: string; // set when dragging a Linear-sourced bar
  mode: "move" | "resize";
  startMouseX: number;
  originalStartMonth: number;
  originalDuration: number;
  currentStartMonth: number;
  currentDuration: number;
};

// ── Linear bar types ──────────────────────────────────────────────────────

type LinearBar = {
  issueId: string;
  title: string;
  cleanedTitle: string;
  assigneeName: string;
  startDate: Date;
  endDate: Date;
  state: { name: string; color: string };
  priority: number;
  priorityLabel: string;
  labels: { name: string; color: string }[];
};

// ── Dependency state ─────────────────────────────────────────────────────

type DependencyLink = {
  from: string; // projectId
  to: string; // projectId
};

type LinkingState = {
  fromProjectId: string;
  side: "left" | "right";
};

// ── Assignee name normalization ───────────────────────────────────────────
// Linear displayName -> roadmap person name mapping
function normalizeAssigneeName(displayName: string): string | null {
  const lower = displayName.toLowerCase();
  const map: Record<string, string> = {
    oleksii: "Oleksii",
    flo: "Flo",
    "florian": "Flo",
    maciej: "Maciej",
    "maciej.walusiak": "Maciej",
    john: "John",
    luida: "Luida",
    ak: "AK",
    maria: "Maria",
    carlos: "Carlos",
    erica: "Erica",
    david: "David",
    eleanor: "Eleanor",
    erin: "Erin",
    "stef": "Stef / Sam",
    "sam": "Stef / Sam",
    molly: "Molly",
    cara: "Cara",
    lucie: "Lucie",
  };
  return map[lower] ?? null;
}

// ── Unique project ID for new projects ─────────────────────────────────

let _addedProjectCounter = 1000;
function newProjId(): string {
  _addedProjectCounter += 1;
  return `proj-added-${_addedProjectCounter}`;
}

// ── Main component ─────────────────────────────────────────────────────────

export function RoadmapView({ people, months, phases, teams }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    project: Project;
    personName: string;
    personColor: string;
  } | null>(null);
  const [selectedLinearIssueId, setSelectedLinearIssueId] = useState<string | null>(null);
  const [selectedLinearProject, setSelectedLinearProject] = useState<{
    project: Project;
    personName: string;
    personColor: string;
    linearProjectName: string;
  } | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [localPeople, setLocalPeople] = useState<Person[]>(people);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Undo stack
  type UndoAction = { type: "move"; projectId: string; personName: string; prevStart: number; prevDuration: number; newStart: number; newDuration: number }
    | { type: "delete"; personName: string; project: Project }
    | { type: "rename"; personName: string; projectId: string; prevName: string; newName: string }
    | { type: "add"; personName: string; projectId: string };
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  const pushUndo = useCallback((action: UndoAction) => {
    setUndoStack((prev) => [...prev.slice(-50), action]);
  }, []);

  // Linear state
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleIssueIds, setCycleIssueIds] = useState<Set<string> | null>(null);
  const [cycleProjectNames, setCycleProjectNames] = useState<Set<string> | null>(null);
  const [linearBars, setLinearBars] = useState<LinearBar[]>([]);
  const [linearBarsLoading, setLinearBarsLoading] = useState(true);

  // Progress tracking state
  const [projectProgress, setProjectProgress] = useState<Record<string, ProjectProgress>>({});

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Add project form state
  const [addingForPerson, setAddingForPerson] = useState<string | null>(null);

  // Inline rename state
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Dependencies
  const [dependencies, setDependencies] = useState<DependencyLink[]>([]);
  const [linkingState, setLinkingState] = useState<LinkingState | null>(null);

  // Mobile state
  const [mobilePersonFilter, setMobilePersonFilter] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const columns = useMemo(() => generateColumns(zoom), [zoom]);

  // Dynamically compute column width: for week/biweekly, expand to fill available width
  const colWidth = useMemo(() => {
    if (zoom === "week" || zoom === "biweekly") {
      if (containerWidth > 0 && columns.length > 0) {
        const availableWidth = containerWidth - (isMobile ? 0 : SIDEBAR_WIDTH);
        return Math.max(ZOOM_COL_WIDTH[zoom], Math.floor(availableWidth / columns.length));
      }
    }
    return ZOOM_COL_WIDTH[zoom];
  }, [zoom, containerWidth, columns.length, isMobile]);

  // ── Check for mobile ───────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 768);
      setContainerWidth(window.innerWidth);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Toast helpers ─────────────────────────────────────────────────────
  const addToast = useCallback((type: ToastType, text: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Undo handler ────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const action = prev[prev.length - 1];
      const rest = prev.slice(0, -1);

      switch (action.type) {
        case "move":
          setLocalPeople((p) => p.map((person) => ({
            ...person,
            projects: person.projects.map((proj) =>
              proj.id === action.projectId ? { ...proj, startMonth: action.prevStart, duration: action.prevDuration } : proj
            ),
          })));
          saveOverride("updatePosition", {
            key: `${action.personName}:${action.projectId}`,
            startMonth: action.prevStart,
            duration: action.prevDuration,
          });
          break;
        case "delete":
          setLocalPeople((p) => p.map((person) =>
            person.name === action.personName ? { ...person, projects: [...person.projects, action.project] } : person
          ));
          saveOverride("undoDelete", { key: `${action.personName}:${action.project.name}` });
          break;
        case "rename":
          setLocalPeople((p) => p.map((person) => ({
            ...person,
            projects: person.projects.map((proj) =>
              proj.id === action.projectId ? { ...proj, name: action.prevName } : proj
            ),
          })));
          saveOverride("rename", { key: `${action.personName}:${action.prevName}`, newName: action.prevName });
          break;
        case "add":
          setLocalPeople((p) => p.map((person) => ({
            ...person,
            projects: person.projects.filter((proj) => proj.id !== action.projectId),
          })));
          saveOverride("delete", { key: `${action.personName}:${action.projectId}` });
          break;
      }

      addToast("success", "Undone");
      return rest;
    });
  }, [addToast]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleUndo]);

  // ── Load overrides on mount ───────────────────────────────────────────
  useEffect(() => {
    fetchOverrides().then((ov) => {
      if (!ov) return;
      setLocalPeople((prev) => {
        let updated = prev.map((person) => ({
          ...person,
          projects: person.projects
            .filter((proj) => {
              const key = `${person.name}:${proj.name}`;
              return !ov.deletions?.includes(key);
            })
            .map((proj) => {
              const key = `${person.name}:${proj.name}`;
              const posOv = ov.positions?.[key];
              const renameOv = ov.renames?.[key];
              return {
                ...proj,
                name: renameOv || proj.name,
                startMonth: posOv?.startMonth ?? proj.startMonth,
                duration: posOv?.duration ?? proj.duration,
              };
            }),
        }));

        // Add custom projects
        if (ov.additions) {
          for (const [personName, additions] of Object.entries(ov.additions)) {
            updated = updated.map((person) => {
              if (person.name !== personName) return person;
              const newProjects = additions.map((a) => ({
                id: newProjId(),
                name: a.name,
                startMonth: a.startMonth,
                duration: a.duration,
                tasks: [],
                linearProjectName: null,
              }));
              return {
                ...person,
                projects: [...person.projects, ...newProjects],
              };
            });
          }
        }

        return updated;
      });

      // Load dependencies
      if (ov.dependencies) {
        setDependencies(ov.dependencies);
      }
    });
  }, []);

  // ── Fetch cycles on mount ──────────────────────────────────────────────
  useEffect(() => {
    setCyclesLoading(true);
    linearQuery<{ cycles: { nodes: LinearCycle[] } }>(
      `query { cycles(first: 50, orderBy: createdAt) { nodes { id number startsAt endsAt } } }`,
    )
      .then((data) => {
        // Sort descending by number so newest is first
        const sorted = [...data.cycles.nodes].sort((a, b) => b.number - a.number);
        setCycles(sorted);
      })
      .catch((err) => {
        console.error("Failed to fetch cycles:", err);
      })
      .finally(() => setCyclesLoading(false));
  }, []);

  // ── Fetch subtest project issues on mount ──────────────────────────────
  useEffect(() => {
    setLinearBarsLoading(true);
    linearQuery<{
      project: {
        issues: {
          nodes: LinearIssue[];
        };
      };
    }>(
      `query ProjectIssues($projectId: String!) {
        project(id: $projectId) {
          issues {
            nodes {
              id title priority priorityLabel
              state { name color }
              assignee { displayName avatarUrl }
              labels { nodes { name color } }
              startedAt dueDate createdAt updatedAt
            }
          }
        }
      }`,
      { projectId: SUBTEST_PROJECT_ID },
    )
      .then((data) => {
        const bars: LinearBar[] = [];
        for (const issue of data.project.issues.nodes) {
          if (!issue.assignee) continue;
          const personName = normalizeAssigneeName(issue.assignee.displayName);
          if (!personName) continue;

          // Use dates if present, otherwise use createdAt + 1 week
          const start = issue.startedAt
            ? new Date(issue.startedAt)
            : new Date(issue.createdAt);
          const end = issue.dueDate
            ? new Date(issue.dueDate)
            : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Only show if within timeline
          if (end < TIMELINE_START || start >= TIMELINE_END) continue;

          bars.push({
            issueId: issue.id,
            title: issue.title,
            cleanedTitle: cleanTitle(issue.title),
            assigneeName: personName,
            startDate: start,
            endDate: end,
            state: issue.state,
            priority: issue.priority,
            priorityLabel: issue.priorityLabel,
            labels: issue.labels.nodes,
          });
        }
        setLinearBars(bars);
      })
      .catch((err) => {
        console.error("Failed to fetch subtest project issues:", err);
      })
      .finally(() => setLinearBarsLoading(false));
  }, []);

  // ── Fetch all projects progress on mount ──────────────────────────────
  useEffect(() => {
    linearQuery<{
      projects: {
        nodes: {
          id: string;
          name: string;
          issues: {
            nodes: {
              id: string;
              state: { name: string; type: string };
            }[];
          };
        }[];
      };
    }>(
      `query AllProjectsProgress {
        projects(first: 50) {
          nodes {
            id name
            issues {
              nodes {
                id
                state { name type }
              }
            }
          }
        }
      }`,
    )
      .then((data) => {
        const progressMap: Record<string, ProjectProgress> = {};
        for (const project of data.projects.nodes) {
          const total = project.issues.nodes.length;
          let done = 0;
          let inProgress = 0;
          let cancelled = 0;
          for (const issue of project.issues.nodes) {
            const stateType = issue.state.type?.toLowerCase?.() || "";
            const stateName = issue.state.name.toLowerCase();
            if (stateType === "completed" || stateName === "done" || stateName === "closed" || stateName === "completed") {
              done++;
            } else if (stateType === "cancelled" || stateName === "cancelled" || stateName === "canceled") {
              cancelled++;
            } else if (stateType === "started" || stateName === "in progress" || stateName === "in review" || stateName === "started") {
              inProgress++;
            }
          }
          const todo = total - done - inProgress - cancelled;
          progressMap[project.name] = { total, done, inProgress, todo, cancelled };
        }
        setProjectProgress(progressMap);
      })
      .catch((err) => {
        console.error("Failed to fetch project progress:", err);
      });
  }, []);

  // ── Fetch cycle issues when cycle is selected ──────────────────────────
  useEffect(() => {
    if (!selectedCycleId) {
      setCycleIssueIds(null);
      setCycleProjectNames(null);
      return;
    }

    linearQuery<{
      cycle: {
        issues: {
          nodes: { id: string; title: string; project: { name: string } | null; assignee: { displayName: string } | null }[];
        };
      };
    }>(
      `query CycleIssues($cycleId: String!) {
        cycle(id: $cycleId) {
          issues {
            nodes {
              id
              title
              project { name }
              assignee { displayName }
            }
          }
        }
      }`,
      { cycleId: selectedCycleId },
    )
      .then((data) => {
        const issueIds = new Set(data.cycle.issues.nodes.map((i) => i.id));
        setCycleIssueIds(issueIds);

        // Build a set of project names that appear in this cycle
        const projNames = new Set<string>();
        for (const issue of data.cycle.issues.nodes) {
          if (issue.project) {
            projNames.add(issue.project.name);
          }
          // Also try matching to roadmap projects by assignee activity
          if (issue.assignee) {
            const name = normalizeAssigneeName(issue.assignee.displayName);
            if (name) {
              const person = people.find((p) => p.name === name);
              if (person) {
                for (const proj of person.projects) {
                  projNames.add(proj.name);
                }
              }
            }
          }
        }
        setCycleProjectNames(projNames);
      })
      .catch((err) => {
        console.error("Failed to fetch cycle issues:", err);
        setCycleIssueIds(null);
        setCycleProjectNames(null);
      });
  }, [selectedCycleId, people]);

  // Sync vertical scroll between sidebar and grid
  const handleGridScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const grid = scrollRef.current;
    const sidebar = sidebarRef.current;
    if (grid && sidebar) {
      sidebar.scrollTop = grid.scrollTop;
    }
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  const handleSidebarScroll = useCallback(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    const grid = scrollRef.current;
    const sidebar = sidebarRef.current;
    if (grid && sidebar) {
      grid.scrollTop = sidebar.scrollTop;
    }
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, []);

  // Toggle team collapse
  const toggleTeam = useCallback((teamName: string) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamName)) {
        next.delete(teamName);
      } else {
        next.add(teamName);
      }
      return next;
    });
  }, []);

  // Filter people by search (and mobile filter)
  const filteredPeople = useMemo(() => {
    let result = localPeople;

    // Mobile person filter
    if (isMobile && mobilePersonFilter) {
      result = result.filter((p) => p.name === mobilePersonFilter);
    }

    if (!search.trim()) return result;
    const lowerSearch = search.toLowerCase();
    return result
      .map((p) => {
        const nameMatch = p.name.toLowerCase().includes(lowerSearch);
        const matchingProjects = p.projects.filter((proj) =>
          proj.name.toLowerCase().includes(lowerSearch),
        );
        if (nameMatch) return p;
        if (matchingProjects.length > 0)
          return { ...p, projects: matchingProjects };
        return null;
      })
      .filter(Boolean) as Person[];
  }, [localPeople, search, isMobile, mobilePersonFilter]);

  // Group people by team
  const teamGroups = useMemo(() => {
    const groups: { team: Team; members: Person[] }[] = [];

    for (const team of teams) {
      const members = team.members
        .map((name) => filteredPeople.find((p) => p.name === name))
        .filter(Boolean) as Person[];
      if (members.length > 0) {
        groups.push({ team, members });
      }
    }

    // Find people not in any team
    const allTeamMembers = new Set(teams.flatMap((t) => t.members));
    const ungrouped: Person[] = [];
    for (const p of filteredPeople) {
      if (!allTeamMembers.has(p.name)) {
        ungrouped.push(p);
      }
    }

    return { groups, ungrouped };
  }, [filteredPeople, teams]);

  // Count linear bars per person for lane packing
  const linearBarsPerPerson = useMemo(() => {
    const map: Record<string, LinearBar[]> = {};
    for (const bar of linearBars) {
      // If cycle filter is active, only show bars in that cycle
      if (cycleIssueIds && !cycleIssueIds.has(bar.issueId)) continue;
      if (!map[bar.assigneeName]) map[bar.assigneeName] = [];
      map[bar.assigneeName].push(bar);
    }
    return map;
  }, [linearBars, cycleIssueIds]);

  // Build row entries (no team header rows - teams are vertical labels)
  const rowEntries: RowEntry[] = useMemo(() => {
    const entries: RowEntry[] = [];
    let currentY = 0;

    for (const { team, members } of teamGroups.groups) {
      const isCollapsed = collapsedTeams.has(team.name);

      if (!isCollapsed) {
        members.forEach((person, idx) => {
          const { lanes, laneCount } = packLanes(person.projects);
          const linearCount = (linearBarsPerPerson[person.name] || []).length;
          const extraLanes = linearCount > 0 ? 1 : 0;
          const totalHeight = (laneCount + extraLanes) * ROW_HEIGHT;
          entries.push({
            kind: "person",
            person,
            lanes,
            laneCount,
            yOffset: currentY,
            totalHeight,
            teamName: team.name,
            teamColor: team.color,
            personIndex: idx,
          });
          currentY += totalHeight;
        });
      }
    }

    // Ungrouped people at the end
    teamGroups.ungrouped.forEach((person, idx) => {
      const { lanes, laneCount } = packLanes(person.projects);
      const linearCount = (linearBarsPerPerson[person.name] || []).length;
      const extraLanes = linearCount > 0 ? 1 : 0;
      const totalHeight = (laneCount + extraLanes) * ROW_HEIGHT;
      entries.push({
        kind: "person",
        person,
        lanes,
        laneCount,
        yOffset: currentY,
        totalHeight,
        teamName: "",
        teamColor: "#94a3b8",
        personIndex: idx,
      });
      currentY += totalHeight;
    });

    return entries;
  }, [teamGroups, collapsedTeams, linearBarsPerPerson]);

  const totalGridHeight = rowEntries.length > 0
    ? rowEntries[rowEntries.length - 1].yOffset + rowEntries[rowEntries.length - 1].totalHeight
    : 0;
  const totalGridWidth = columns.length * colWidth;

  const personEntries = rowEntries;

  const projectCount = filteredPeople.reduce(
    (acc, p) => acc + p.projects.length,
    0,
  );

  // Today marker
  const todayX = useMemo(() => {
    const now = new Date();
    if (now < TIMELINE_START || now >= TIMELINE_END) return null;
    for (let i = 0; i < columns.length; i++) {
      const colStart = columns[i].date;
      const colEnd = i + 1 < columns.length ? columns[i + 1].date : TIMELINE_END;
      if (now >= colStart && now < colEnd) {
        const totalMs = colEnd.getTime() - colStart.getTime();
        const offsetMs = now.getTime() - colStart.getTime();
        const frac = totalMs > 0 ? offsetMs / totalMs : 0;
        return (i + frac) * colWidth;
      }
    }
    return null;
  }, [columns, colWidth]);

  // Auto-scroll to center on today when zoom changes
  useEffect(() => {
    if (todayX === null) return;
    const grid = scrollRef.current;
    if (!grid) return;
    // Scroll so today is roughly 1/4 from the left edge
    const targetScroll = Math.max(0, todayX - grid.clientWidth * 0.25);
    grid.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [zoom, todayX]);

  // Phase positions scaled to current zoom
  const phasePositions = useMemo(() => {
    return phases.map((phase) => {
      const x = monthIndexToColPos(phase.startMonth, zoom, columns) * colWidth;
      const w = monthDurationToCols(phase.startMonth, phase.duration, zoom, columns) * colWidth;
      return { phase, x, w };
    });
  }, [phases, zoom, columns, colWidth]);

  // ── Build a map of project id to position for dependency arrows ────────
  const projectPositionMap = useMemo(() => {
    const map: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const ri of personEntries) {
      for (const { project, lane } of ri.lanes) {
        const pos = { startMonth: project.startMonth, duration: project.duration };
        const colPos = monthIndexToColPos(pos.startMonth, zoom, columns);
        const colSpan = monthDurationToCols(pos.startMonth, pos.duration, zoom, columns);
        const x = colPos * colWidth + 2;
        const y = ri.yOffset + lane * ROW_HEIGHT + BAR_V_PAD;
        const w = Math.max(colSpan * colWidth - 4, 20);
        map[project.id] = { x, y, w, h: BAR_HEIGHT };
      }
    }
    return map;
  }, [personEntries, zoom, columns, colWidth]);

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, project: Project, personName: string, mode: "move" | "resize", linearIssueId?: string) => {
      if (e.button !== 0) return; // only left click
      e.preventDefault();
      e.stopPropagation();
      console.log("[DRAG] mousedown on", project.name, mode);
      const state: DragState = {
        projectId: project.id,
        personName,
        linearIssueId,
        mode,
        startMouseX: e.clientX,
        originalStartMonth: project.startMonth,
        originalDuration: project.duration,
        currentStartMonth: project.startMonth,
        currentDuration: project.duration,
      };
      dragRef.current = state;
      setDragState(state);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;

      const dx = e.clientX - ds.startMouseX;
      if (Math.abs(dx) > 5) console.log("[DRAG] moving", dx);
      const approxMonthWidth = (() => {
        if (zoom === "month") return colWidth;
        if (zoom === "biweekly") return colWidth * (30.44 / 14);
        return colWidth * (30.44 / 7);
      })();

      const monthDelta = dx / approxMonthWidth;

      if (ds.mode === "move") {
        const newStart = Math.max(0, Math.round(ds.originalStartMonth + monthDelta));
        if (newStart !== ds.currentStartMonth) {
          ds.currentStartMonth = newStart;
          setDragState({ ...ds });
        }
      } else {
        const newDuration = Math.max(1, Math.round(ds.originalDuration + monthDelta));
        if (newDuration !== ds.currentDuration) {
          ds.currentDuration = newDuration;
          setDragState({ ...ds });
        }
      }
    },
    [zoom, colWidth],
  );

  const handleMouseUp = useCallback(() => {
    const ds = dragRef.current;
    if (!ds) return;

    const changed =
      ds.currentStartMonth !== ds.originalStartMonth ||
      ds.currentDuration !== ds.originalDuration;

    // Apply changes to local state
    setLocalPeople((prev) =>
      prev.map((person) => ({
        ...person,
        projects: person.projects.map((proj) => {
          if (proj.id !== ds.projectId) return proj;
          return {
            ...proj,
            startMonth: ds.currentStartMonth,
            duration: ds.currentDuration,
          };
        }),
      })),
    );

    // If changed, persist to overrides and push undo
    if (changed) {
      pushUndo({
        type: "move",
        projectId: ds.projectId,
        personName: ds.personName,
        prevStart: ds.originalStartMonth,
        prevDuration: ds.originalDuration,
        newStart: ds.currentStartMonth,
        newDuration: ds.currentDuration,
      });
      const key = `${ds.personName}:${ds.projectId}`;
      saveOverride("updatePosition", {
        key,
        startMonth: ds.currentStartMonth,
        duration: ds.currentDuration,
      }).catch((err) => console.error("Failed to save position override:", err));
    }

    // If this was a Linear-linked bar and dates changed, update in Linear
    if (ds.linearIssueId && changed) {
      const startDate = new Date(2026, 2 + ds.currentStartMonth, 1);
      const endDate = new Date(2026, 2 + ds.currentStartMonth + ds.currentDuration, 1);
      const startIso = startDate.toISOString().split("T")[0];
      const endIso = endDate.toISOString().split("T")[0];

      linearUpdateDates(ds.linearIssueId, startIso, endIso)
        .then(() => addToast("success", "Updated in Linear"))
        .catch((err) => {
          addToast("error", `Failed to save: ${err.message}`);
          // Revert
          setLocalPeople((prev) =>
            prev.map((person) => ({
              ...person,
              projects: person.projects.map((proj) => {
                if (proj.id !== ds.projectId) return proj;
                return {
                  ...proj,
                  startMonth: ds.originalStartMonth,
                  duration: ds.originalDuration,
                };
              }),
            })),
          );
        });
    }

    dragRef.current = null;
    setDragState(null);
  }, [addToast]);

  useEffect(() => {
    if (dragState) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      document.body.classList.add("dragging");
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove("dragging");
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Get the effective start/duration for a project (may be overridden by drag)
  const getProjectPosition = useCallback(
    (project: Project) => {
      if (dragState && dragState.projectId === project.id) {
        return {
          startMonth: dragState.currentStartMonth,
          duration: dragState.currentDuration,
        };
      }
      return { startMonth: project.startMonth, duration: project.duration };
    },
    [dragState],
  );

  // Check if a project should be dimmed when cycle filter is active
  const isProjectInCycle = useCallback(
    (project: Project, personName: string): boolean => {
      if (!cycleProjectNames) return true; // no filter
      // If any of the cycle's issues belong to this person, highlight all their projects
      // More precisely: check if any cycle issue assignee matches this person
      if (cycleIssueIds) {
        for (const bar of linearBars) {
          if (cycleIssueIds.has(bar.issueId) && bar.assigneeName === personName) {
            return true;
          }
        }
      }
      return cycleProjectNames.has(project.name);
    },
    [cycleProjectNames, cycleIssueIds, linearBars],
  );

  // ── Add project handler ────────────────────────────────────────────────
  const handleAddProject = useCallback(
    (personName: string, name: string, startMonth: number, duration: number) => {
      const newProject: Project = {
        id: newProjId(),
        name,
        startMonth,
        duration,
        tasks: [],
        linearProjectName: null,
      };

      setLocalPeople((prev) =>
        prev.map((person) => {
          if (person.name !== personName) return person;
          return {
            ...person,
            projects: [...person.projects, newProject],
          };
        }),
      );

      saveOverride("addProject", {
        personName,
        project: { name, startMonth, duration },
      }).catch((err) => console.error("Failed to save addition:", err));

      setAddingForPerson(null);
      addToast("success", `Added "${name}"`);
    },
    [addToast],
  );

  // ── Delete project handler ─────────────────────────────────────────────
  const handleDeleteProject = useCallback(
    (personName: string, projectId: string, projectName: string) => {
      // Find the project before deleting for undo
      const person = localPeople.find((p) => p.name === personName);
      const deletedProject = person?.projects.find((p) => p.id === projectId);
      if (deletedProject) {
        pushUndo({ type: "delete", personName, project: deletedProject });
      }

      setLocalPeople((prev) =>
        prev.map((person) => {
          if (person.name !== personName) return person;
          return {
            ...person,
            projects: person.projects.filter((p) => p.id !== projectId),
          };
        }),
      );

      const key = `${personName}:${projectName}`;
      saveOverride("deleteProject", { key }).catch((err) =>
        console.error("Failed to save deletion:", err),
      );

      addToast("success", `Removed "${projectName}"`);
    },
    [addToast],
  );

  // ── Rename project handler ────────────────────────────────────────────
  const handleRenameProject = useCallback(
    (personName: string, projectId: string, oldName: string, newName: string) => {
      if (!newName.trim() || newName === oldName) {
        setRenamingProjectId(null);
        return;
      }

      setLocalPeople((prev) =>
        prev.map((person) => {
          if (person.name !== personName) return person;
          return {
            ...person,
            projects: person.projects.map((p) => {
              if (p.id !== projectId) return p;
              return { ...p, name: newName };
            }),
          };
        }),
      );

      const key = `${personName}:${oldName}`;
      saveOverride("renameProject", { key, newName }).catch((err) =>
        console.error("Failed to save rename:", err),
      );

      setRenamingProjectId(null);
      addToast("success", `Renamed to "${newName}"`);
    },
    [addToast],
  );

  // ── Dependency handlers ───────────────────────────────────────────────
  const handleLinkDotClick = useCallback(
    (projectId: string, side: "left" | "right") => {
      if (linkingState) {
        // Complete the link
        if (linkingState.fromProjectId !== projectId) {
          const newDep: DependencyLink = {
            from: linkingState.fromProjectId,
            to: projectId,
          };
          setDependencies((prev) => {
            const exists = prev.some(
              (d) => d.from === newDep.from && d.to === newDep.to,
            );
            if (exists) return prev;
            return [...prev, newDep];
          });
          saveOverride("addDependency", newDep).catch((err) =>
            console.error("Failed to save dependency:", err),
          );
          addToast("success", "Dependency created");
        }
        setLinkingState(null);
      } else {
        // Start linking
        setLinkingState({ fromProjectId: projectId, side });
      }
    },
    [linkingState, addToast],
  );

  const handleRemoveDependency = useCallback(
    (from: string, to: string) => {
      setDependencies((prev) =>
        prev.filter((d) => !(d.from === from && d.to === to)),
      );
      saveOverride("removeDependency", { from, to }).catch((err) =>
        console.error("Failed to remove dependency:", err),
      );
    },
    [],
  );

  // Cancel linking on Escape
  useEffect(() => {
    if (!linkingState) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLinkingState(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [linkingState]);

  // ── Print handler ────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const showPhases = zoom === "month";
  const stickyTop = (showPhases ? PHASE_HEIGHT : 0) + HEADER_HEIGHT;

  // ── Compute team label spans for vertical sidebar labels ──────────────
  const teamLabelSpans = useMemo(() => {
    const spans: { teamName: string; teamColor: string; yStart: number; height: number }[] = [];
    let currentTeam: string | null = null;
    let spanStart = 0;
    let spanHeight = 0;

    for (const entry of rowEntries) {
      if (entry.teamName !== currentTeam) {
        if (currentTeam !== null && spanHeight > 0) {
          const team = teams.find((t) => t.name === currentTeam);
          spans.push({
            teamName: currentTeam,
            teamColor: team?.color || "#94a3b8",
            yStart: spanStart,
            height: spanHeight,
          });
        }
        currentTeam = entry.teamName;
        spanStart = entry.yOffset;
        spanHeight = entry.totalHeight;
      } else {
        spanHeight += entry.totalHeight;
      }
    }
    if (currentTeam !== null && spanHeight > 0) {
      const team = teams.find((t) => t.name === currentTeam);
      spans.push({
        teamName: currentTeam,
        teamColor: team?.color || "#94a3b8",
        yStart: spanStart,
        height: spanHeight,
      });
    }
    return spans;
  }, [rowEntries, teams]);

  // ── Compute progress pct for a given project ───────────────────────────
  const getBarProgress = useCallback(
    (project: Project): number | null => {
      if (project.linearProjectName && projectProgress[project.linearProjectName]) {
        const p = projectProgress[project.linearProjectName];
        return p.total > 0 ? (p.done / p.total) * 100 : 0;
      }
      return null;
    },
    [projectProgress],
  );

  return (
    <div className="roadmap-root">
      {/* Mobile person filter */}
      {isMobile && (
        <div style={{
          padding: "8px 16px",
          background: "#fff",
          borderBottom: "1px solid #e8e8ef",
        }}>
          <select
            value={mobilePersonFilter ?? "all"}
            onChange={(e) =>
              setMobilePersonFilter(e.target.value === "all" ? null : e.target.value)
            }
            style={{
              width: "100%",
              padding: "8px 12px",
              border: "1px solid #e0e0ea",
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "var(--font-sans)",
            }}
          >
            <option value="all">All People</option>
            {localPeople.map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <FilterBar
        search={search}
        onSearch={setSearch}
        peopleCount={filteredPeople.length}
        projectCount={projectCount}
        zoom={zoom}
        onZoom={setZoom}
        cycles={cycles}
        selectedCycleId={selectedCycleId}
        onCycleSelect={setSelectedCycleId}
        cyclesLoading={cyclesLoading}
        onPrint={handlePrint}
        onUndo={handleUndo}
        canUndo={undoStack.length > 0}
      />

      <div className="roadmap-container">
        {/* Sticky sidebar (hidden on mobile) */}
        {!isMobile && (
          <div className="roadmap-sidebar" style={{ width: SIDEBAR_WIDTH }}>
            <div className="sidebar-corner" style={{ height: stickyTop }}>
              <span>Team</span>
            </div>
            <div
              className="sidebar-inner"
              ref={sidebarRef}
              onScroll={handleSidebarScroll}
            >
              {/* Vertical team labels column */}
              <div className="sidebar-team-labels">
                {teamLabelSpans.map((span) => (
                  <div
                    key={`team-label-${span.teamName}`}
                    className="sidebar-team-label"
                    style={{
                      height: span.height,
                      backgroundColor: span.teamColor,
                    }}
                    onClick={() => toggleTeam(span.teamName)}
                    title={span.teamName}
                  >
                    {span.teamName}
                  </div>
                ))}
              </div>
              {/* Person names column */}
              <div className="sidebar-person-list">
                {rowEntries.map((entry) => (
                  <div
                    key={entry.person.name}
                    className="sidebar-person"
                    style={{
                      height: entry.totalHeight,
                      backgroundColor: hexToRgba(
                        entry.person.color,
                        entry.personIndex % 2 === 0 ? 0.06 : 0.10,
                      ),
                    }}
                  >
                    <div
                      className="sidebar-color-bar"
                      style={{ backgroundColor: entry.person.color }}
                    />
                    <span className="sidebar-name">{entry.person.name}</span>
                    {/* Add project button */}
                    <button
                      className="sidebar-add-btn"
                      title="Add project"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingForPerson(
                          addingForPerson === entry.person.name
                            ? null
                            : entry.person.name,
                        );
                      }}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Scrollable grid */}
        <div
          className="roadmap-scroll"
          ref={scrollRef}
          onScroll={handleGridScroll}
        >
          {/* Phase row (hidden for week/biweekly zoom) */}
          {showPhases && (
            <div
              className="phase-row"
              style={{ height: PHASE_HEIGHT, width: totalGridWidth }}
            >
              {phasePositions.map(({ phase, x, w }) => (
                <div
                  key={phase.name}
                  className="phase-cell"
                  style={{
                    left: x,
                    width: w,
                    backgroundColor: phase.color,
                  }}
                >
                  {phase.name}
                </div>
              ))}
            </div>
          )}

          {/* Column headers */}
          <div
            className="month-header-row"
            style={{ height: HEADER_HEIGHT, width: totalGridWidth, top: showPhases ? PHASE_HEIGHT : 0 }}
          >
            {columns.map((col, i) => {
              const parts = col.label.split(" ");
              const primary = parts[0];
              const secondary = parts[1] || "";
              return (
                <div
                  key={`col-${i}`}
                  className="month-header-cell"
                  style={{ left: i * colWidth, width: colWidth }}
                >
                  <span className="month-label">{primary}</span>
                  <span className="year-label">{secondary}</span>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div
            className="grid-body"
            style={{
              width: totalGridWidth,
              height: totalGridHeight,
            }}
          >
            {/* Vertical grid lines */}
            {columns.map((_, i) => (
              <div
                key={`vline-${i}`}
                className="grid-vline"
                style={{ left: i * colWidth, height: totalGridHeight }}
              />
            ))}

            {/* Row backgrounds with personal color tints */}
            {rowEntries.map((entry) => (
              <div
                key={`rowbg-${entry.person.name}`}
                className="grid-row-bg"
                style={{
                  top: entry.yOffset,
                  height: entry.totalHeight,
                  backgroundColor: hexToRgba(
                    entry.person.color,
                    entry.personIndex % 2 === 0 ? 0.06 : 0.10,
                  ),
                }}
              />
            ))}

            {/* Horizontal row separators */}
            {rowEntries.map((entry) => (
              <div
                key={`hline-${entry.person.name}`}
                className="grid-hline"
                style={{ top: entry.yOffset + entry.totalHeight }}
              />
            ))}

            {/* Today line */}
            {todayX !== null && (
              <div
                className="today-line"
                style={{ left: todayX, height: totalGridHeight }}
              >
                <div className="today-label">Today</div>
              </div>
            )}

            {/* Dependency arrows (SVG overlay) */}
            <svg
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: totalGridWidth,
                height: totalGridHeight,
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <defs>
                <marker
                  id="dep-arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
                </marker>
              </defs>
              {dependencies.map((dep) => {
                const fromPos = projectPositionMap[dep.from];
                const toPos = projectPositionMap[dep.to];
                if (!fromPos || !toPos) return null;

                const x1 = fromPos.x + fromPos.w;
                const y1 = fromPos.y + fromPos.h / 2;
                const x2 = toPos.x;
                const y2 = toPos.y + toPos.h / 2;

                // Curved path
                const midX = (x1 + x2) / 2;
                const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

                return (
                  <g key={`dep-${dep.from}-${dep.to}`}>
                    <path
                      d={d}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth={1.5}
                      markerEnd="url(#dep-arrow)"
                      style={{ pointerEvents: "stroke", cursor: "pointer" }}
                      onClick={() => handleRemoveDependency(dep.from, dep.to)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Project bars */}
            {personEntries.map((ri) =>
              ri.lanes.map(({ project, lane }) => {
                const pos = getProjectPosition(project);
                const colPos = monthIndexToColPos(pos.startMonth, zoom, columns);
                const colSpan = monthDurationToCols(pos.startMonth, pos.duration, zoom, columns);
                const x = colPos * colWidth + 2;
                const y = ri.yOffset + lane * ROW_HEIGHT + BAR_V_PAD;
                const w = Math.max(colSpan * colWidth - 4, 20);
                const isHovered = hoveredProject === project.id;
                const isDragging = dragState?.projectId === project.id;
                const dimmed = selectedCycleId !== null && !isProjectInCycle(project, ri.person.name);
                const isRenaming = renamingProjectId === project.id;

                const doneCount = project.tasks.filter(
                  (t) => t.status === "done",
                ).length;
                const total = project.tasks.length;
                let progressPct =
                  total > 0 ? (doneCount / total) * 100 : 0;

                // Use Linear progress if available
                const linearProgress = getBarProgress(project);
                if (linearProgress !== null) {
                  progressPct = linearProgress;
                }

                // Ghost bar (original position) when dragging
                let ghostBar = null;
                if (isDragging) {
                  const origColPos = monthIndexToColPos(dragState.originalStartMonth, zoom, columns);
                  const origColSpan = monthDurationToCols(dragState.originalStartMonth, dragState.originalDuration, zoom, columns);
                  const gx = origColPos * colWidth + 2;
                  const gw = Math.max(origColSpan * colWidth - 4, 20);
                  ghostBar = (
                    <div
                      className="project-bar-ghost"
                      style={{
                        left: gx,
                        top: y,
                        width: gw,
                        height: BAR_HEIGHT,
                        borderColor: ri.person.color,
                      }}
                    />
                  );
                }

                return (
                  <div key={project.id}>
                    {ghostBar}
                    <div
                      className={`project-bar${isHovered ? " project-bar-hover" : ""}${isDragging ? " project-bar-dragging" : ""}${dimmed ? " project-bar-dimmed" : ""}`}
                      style={{
                        left: x,
                        top: y,
                        width: w,
                        height: BAR_HEIGHT,
                        backgroundColor: hexToRgba(ri.person.color, dimmed ? 0.08 : 0.18),
                        borderLeft: `3px solid ${dimmed ? hexToRgba(ri.person.color, 0.3) : ri.person.color}`,
                      }}
                      onClick={() => {
                        if (!isDragging) {
                          if (project.linearProjectName) {
                            setSelectedLinearProject({
                              project,
                              personName: ri.person.name,
                              personColor: ri.person.color,
                              linearProjectName: project.linearProjectName,
                            });
                          } else {
                            setSelected({
                              project,
                              personName: ri.person.name,
                              personColor: ri.person.color,
                            });
                          }
                        }
                      }}
                      onMouseEnter={() => setHoveredProject(project.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onMouseDown={(e) => handleBarMouseDown(e, project, ri.person.name, "move")}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingProjectId(project.id);
                        setRenameValue(project.name);
                      }}
                    >
                      {/* Progress background fill */}
                      <div
                        className="project-bar-progress"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: hexToRgba(ri.person.color, 0.12),
                        }}
                      />


                      {/* Label or inline rename input */}
                      {isRenaming ? (
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleRenameProject(
                                ri.person.name,
                                project.id,
                                project.name,
                                renameValue,
                              );
                            }
                            if (e.key === "Escape") {
                              setRenamingProjectId(null);
                            }
                          }}
                          onBlur={() => {
                            handleRenameProject(
                              ri.person.name,
                              project.id,
                              project.name,
                              renameValue,
                            );
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          autoFocus
                          style={{
                            position: "relative",
                            zIndex: 1,
                            background: "rgba(255,255,255,0.9)",
                            border: "1px solid #6366f1",
                            borderRadius: 3,
                            padding: "0 4px",
                            fontSize: 11,
                            fontWeight: 600,
                            fontFamily: "var(--font-sans)",
                            width: "90%",
                            maxWidth: "calc(100% - 16px)",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <span
                          className="project-bar-label"
                          style={{ color: dimmed ? hexToRgba(ri.person.color, 0.4) : ri.person.color }}
                        >
                          {project.name}
                        </span>
                      )}

                      {/* Dependency link dots on hover */}
                      {(isHovered || linkingState) && !isDragging && !isRenaming && (
                        <>
                          <div
                            className={`link-dot link-dot-left${linkingState ? " link-dot-active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkDotClick(project.id, "left");
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                          <div
                            className={`link-dot link-dot-right${linkingState ? " link-dot-active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLinkDotClick(project.id, "right");
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                          />
                        </>
                      )}

                      {/* Resize handle */}
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleBarMouseDown(e, project, ri.person.name, "resize");
                        }}
                      />
                    </div>
                  </div>
                );
              }),
            )}

            {/* Linear bars (Subtest project issues) */}
            {personEntries.map((ri) => {
              const bars = linearBarsPerPerson[ri.person.name];
              if (!bars || bars.length === 0) return null;
              const linearLaneY = ri.yOffset + ri.laneCount * ROW_HEIGHT;

              return bars.map((bar) => {
                const startCol = dateToColPos(bar.startDate, columns);
                const endCol = dateToColPos(bar.endDate, columns);
                const x = startCol * colWidth + 2;
                const w = Math.max((endCol - startCol) * colWidth - 4, 30);
                const y = linearLaneY + BAR_V_PAD;
                const isHovered = hoveredProject === `linear-${bar.issueId}`;

                return (
                  <div
                    key={`linear-${bar.issueId}`}
                    className={`project-bar linear-bar${isHovered ? " project-bar-hover" : ""}`}
                    style={{
                      left: x,
                      top: y,
                      width: w,
                      height: BAR_HEIGHT,
                      backgroundColor: hexToRgba(bar.state.color, 0.1),
                      borderLeft: `3px solid ${bar.state.color}`,
                    }}
                    onClick={() => setSelectedLinearIssueId(bar.issueId)}
                    onMouseEnter={() => setHoveredProject(`linear-${bar.issueId}`)}
                    onMouseLeave={() => setHoveredProject(null)}
                  >
                    <span
                      className="project-bar-label linear-bar-label"
                      style={{ color: bar.state.color }}
                    >
                      {bar.cleanedTitle}
                    </span>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      {/* Add project form popup */}
      {addingForPerson && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 150,
          }}
        >
          <AddProjectForm
            onAdd={(name, startMonth, duration) =>
              handleAddProject(addingForPerson, name, startMonth, duration)
            }
            onCancel={() => setAddingForPerson(null)}
          />
        </div>
      )}
      {addingForPerson && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.2)",
            zIndex: 140,
          }}
          onClick={() => setAddingForPerson(null)}
        />
      )}

      {/* Detail panel - static project (no Linear connection) */}
      {selected && (
        <DetailPanel
          project={selected.project}
          personName={selected.personName}
          personColor={selected.personColor}
          onClose={() => setSelected(null)}
          onDelete={handleDeleteProject}
        />
      )}

      {/* Detail panel - Linear project issues */}
      {selectedLinearProject && (
        <LinearProjectDetailPanel
          project={selectedLinearProject.project}
          personName={selectedLinearProject.personName}
          personColor={selectedLinearProject.personColor}
          linearProjectName={selectedLinearProject.linearProjectName}
          progress={projectProgress[selectedLinearProject.linearProjectName] || null}
          onClose={() => setSelectedLinearProject(null)}
          onIssueClick={(issueId) => {
            setSelectedLinearProject(null);
            setSelectedLinearIssueId(issueId);
          }}
          onDelete={handleDeleteProject}
        />
      )}

      {/* Detail panel - Linear issue */}
      {selectedLinearIssueId && (
        <LinearDetailPanel
          issueId={selectedLinearIssueId}
          onClose={() => setSelectedLinearIssueId(null)}
        />
      )}

      {/* Toasts */}
      <Toast messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
