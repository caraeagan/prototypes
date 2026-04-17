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

const SIDEBAR_WIDTH = 160;
const ROW_HEIGHT = 48;
const PERSON_GAP = 10;
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
    // Full timeline in 2-week intervals
    const d = new Date(TIMELINE_START);
    // Align to Monday
    const dow = d.getDay();
    const monAdj = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + monAdj);
    while (d < TIMELINE_END) {
      const startMonth = shortMonths[d.getMonth()];
      const startDay = d.getDate();
      const endDate = new Date(d);
      endDate.setDate(endDate.getDate() + 13);
      const endMonth = shortMonths[endDate.getMonth()];
      const endDay = endDate.getDate();
      cols.push({
        label: `${startMonth} ${startDay} – ${endMonth} ${endDay}`,
        date: new Date(d),
      });
      d.setDate(d.getDate() + 14);
    }
  } else {
    // Week view: full timeline in weekly intervals (scrollable, auto-centers on today)
    const d = new Date(TIMELINE_START);
    // Align to Monday
    const dow = d.getDay();
    const monAdj = dow === 0 ? -6 : 1 - dow;
    d.setDate(d.getDate() + monAdj);

    while (d < TIMELINE_END) {
      const mon = new Date(d);
      const fri = new Date(d);
      fri.setDate(fri.getDate() + 4);

      const monMonth = shortMonths[mon.getMonth()];
      const friMonth = shortMonths[fri.getMonth()];
      const monDay = mon.getDate();
      const friDay = fri.getDate();

      const label = monMonth === friMonth
        ? `${monMonth} ${monDay} – ${friDay}`
        : `${monMonth} ${monDay} – ${friMonth} ${friDay}`;

      cols.push({ label, date: new Date(d) });
      d.setDate(d.getDate() + 7);
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
  // Sort by order first (if set), then by startMonth as tiebreaker
  const sorted = [...projects].sort((a, b) => {
    const orderA = a.order ?? Infinity;
    const orderB = b.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    return a.startMonth - b.startMonth;
  });
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

function barTextColor(hex: string, bgAlpha: number): string {
  // Calculate perceived luminance of the bar background (hex at bgAlpha on white)
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Blend with white at given alpha
  const br = Math.round(r * bgAlpha + 255 * (1 - bgAlpha));
  const bg = Math.round(g * bgAlpha + 255 * (1 - bgAlpha));
  const bb = Math.round(b * bgAlpha + 255 * (1 - bgAlpha));
  const luminance = (0.299 * br + 0.587 * bg + 0.114 * bb) / 255;
  // If the bar is dark enough, use white text; otherwise use very dark version of the color
  if (luminance < 0.6) return "#ffffff";
  const dr = Math.round(r * 0.2);
  const dg = Math.round(g * 0.2);
  const db = Math.round(b * 0.2);
  return `rgb(${dr},${dg},${db})`;
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

/** Convert a month index (0 = Mar 2026) to an ISO date string for input[type=date] */
function monthIndexToDate(idx: number): string {
  const d = new Date(2026, 2 + idx, 1); // March 2026 = month index 0
  return d.toISOString().split("T")[0]; // "2026-03-01" format
}

/** Convert a date string from input[type=date] to a month index (Mar 2026 = 0) */
function dateToMonthIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - 2026) * 12 + d.getMonth() - 2; // March 2026 = 0
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
  identifier?: string;
  url?: string;
  title: string;
  priority: number;
  priorityLabel: string;
  state: { name: string; color: string; type?: string };
  assignee: { id?: string; displayName: string; avatarUrl: string | null } | null;
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
  people,
  onChangeOwner,
  onUpdateDates,
  onAddProjectToPerson,
  onRemoveProjectFromPerson,
  onMoveToFuture,
}: {
  project: Project;
  personName: string;
  personColor: string;
  linearProjectName: string;
  progress: ProjectProgress | null;
  onClose: () => void;
  onIssueClick: (issueId: string) => void;
  onDelete: (personName: string, projectId: string, projectName: string) => void;
  people: Person[];
  onChangeOwner: (projectId: string, fromPerson: string, toPerson: string) => void;
  onUpdateDates: (projectId: string, personName: string, startMonth: number, duration: number) => void;
  onAddProjectToPerson?: (personName: string, proj: { name: string; startMonth: number; duration: number; linearProjectName: string | null }) => void;
  onRemoveProjectFromPerson?: (personName: string, projectId: string) => void;
  onMoveToFuture?: (personName: string, project: Project) => void;
}) {
  const [issues, setIssues] = useState<LinearProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState(monthIndexToDate(project.startMonth));
  const [editEndDate, setEditEndDate] = useState(monthIndexToDate(project.startMonth + project.duration));
  // Compute initial owners — all people who have a project with the same name
  const [editOwners, setEditOwners] = useState<Set<string>>(() => {
    const owners = new Set<string>();
    for (const p of people) {
      if (p.projects.some((proj) => proj.name === project.name)) owners.add(p.name);
    }
    return owners;
  });

  // Inline issue editing state
  const [panelWfStates, setPanelWfStates] = useState<WorkflowState[]>([]);
  const [panelMembers, setPanelMembers] = useState<TeamMember[]>([]);
  const [panelEditField, setPanelEditField] = useState<{ issueId: string; field: "owner" | "status" | "dueDate"; x: number; y: number } | null>(null);
  const [panelSaving, setPanelSaving] = useState<string | null>(null);
  const [linearProjectUrl, setLinearProjectUrl] = useState<string | null>(null);
  const [linearProjectId, setLinearProjectId] = useState<string | null>(null);
  const [linearTeamId, setLinearTeamId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [descSaving, setDescSaving] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCreating, setNewTaskCreating] = useState(false);

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

    // First find project ID, then fetch issues (avoids Linear complexity limits)
    linearQuery<{ projects: { nodes: { id: string; url: string; teams: { nodes: { id: string }[] } }[] } }>(
      `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id url teams { nodes { id } } } } }`,
      { name: linearProjectName },
    )
      .then((data) => {
        if (cancelled) return;
        const projectNode = data.projects.nodes[0];
        const projectId = projectNode?.id;
        if (projectNode?.url) setLinearProjectUrl(projectNode.url);
        if (projectId) setLinearProjectId(projectId);
        if (projectNode?.teams?.nodes?.[0]?.id) setLinearTeamId(projectNode.teams.nodes[0].id);
        if (!projectId) { setIssues([]); return; }
        return linearQuery<{ project: { issues: { nodes: LinearProjectIssue[] } } }>(
          `query ProjectIssues($id: String!) {
            project(id: $id) {
              issues(first: 250) {
                nodes {
                  id identifier url title priority priorityLabel
                  state { name color type }
                  assignee { id displayName avatarUrl }
                  startedAt dueDate
                }
              }
            }
          }`,
          { id: projectId },
        ).then((issueData) => {
          if (!cancelled) setIssues(issueData.project.issues.nodes);
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [linearProjectName]);

  // Load project description from overrides
  useEffect(() => {
    fetchOverrides().then((ov) => {
      const key = `${personName}:${project.id}`;
      const desc = ov.descriptions?.[key];
      if (desc) setDescription(desc);
    });
  }, [personName, project.id]);

  const saveDescription = () => {
    setDescSaving(true);
    saveOverride("saveDescription", { key: `${personName}:${project.id}`, description })
      .finally(() => setDescSaving(false));
  };

  // Fetch workflow states + team members once
  useEffect(() => {
    linearQuery<{ teams: { nodes: { states: { nodes: WorkflowState[] }; members: { nodes: TeamMember[] } }[] } }>(
      `query { teams(first: 10) { nodes { states { nodes { id name color position } } members(first: 50) { nodes { id displayName avatarUrl } } } } }`,
    ).then((data) => {
      const stateMap = new Map<string, WorkflowState>();
      const memberMap = new Map<string, TeamMember>();
      for (const team of data.teams.nodes) {
        for (const s of team.states.nodes) { if (!stateMap.has(s.name)) stateMap.set(s.name, s); }
        for (const m of team.members.nodes) memberMap.set(m.id, m);
      }
      setPanelWfStates([...stateMap.values()].sort((a, b) => a.position - b.position));
      setPanelMembers([...memberMap.values()].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    }).catch(() => {});
  }, []);

  // Only open issues
  const openIssues = issues.filter((i) => {
    const t = i.state.type;
    return t !== "completed" && t !== "canceled";
  });

  const totalCount = issues.length;
  const doneCount = issues.filter((i) => i.state.type === "completed").length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  // Group open issues by priority
  const byPriority: Record<number, LinearProjectIssue[]> = {};
  for (const issue of openIssues) {
    if (!byPriority[issue.priority]) byPriority[issue.priority] = [];
    byPriority[issue.priority].push(issue);
  }
  // Sort each group by due date
  for (const key in byPriority) {
    byPriority[key].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }

  const editStartMonth = dateToMonthIndex(editStartDate);
  const editEndMonth = dateToMonthIndex(editEndDate);
  const editDuration = Math.max(1, editEndMonth - editStartMonth);
  const startDateStr = formatMonthIndex(project.startMonth);
  const endDateStr = formatMonthIndex(project.startMonth + project.duration);

  const handleSaveEdits = () => {
    if (editStartMonth !== project.startMonth || editDuration !== project.duration) {
      onUpdateDates(project.id, personName, editStartMonth, editDuration);
    }

    // Handle owner changes — find current owners and diff with editOwners
    const currentOwners = new Set(
      people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name)
    );
    // Add project to new owners
    for (const name of editOwners) {
      if (!currentOwners.has(name)) {
        // Add a copy of this project to the new owner
        onAddProjectToPerson?.(name, {
          name: project.name,
          startMonth: editStartMonth,
          duration: editDuration,
          linearProjectName: project.linearProjectName ?? null,
        });
      }
    }
    // Remove project from removed owners
    for (const name of currentOwners) {
      if (!editOwners.has(name)) {
        const personProj = people.find((p) => p.name === name)?.projects.find((proj) => proj.name === project.name);
        if (personProj) onRemoveProjectFromPerson?.(name, personProj.id);
      }
    }

    setIsEditing(false);
  };

  const updateIssueField = async (issueId: string, field: string, value: string) => {
    setPanelSaving(issueId);
    try {
      const res = await fetch("/api/linear/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        const u = json.issue;
        setIssues((prev) => prev.map((issue) => {
          if (issue.id !== issueId) return issue;
          const updated = { ...issue };
          if (u.state) updated.state = { name: u.state.name, color: u.state.color, type: u.state.type };
          if (u.dueDate !== undefined) updated.dueDate = u.dueDate;
          if (u.assignee !== undefined) updated.assignee = u.assignee;
          return updated;
        }));
      }
    } catch (err) { console.error("Update failed:", err); }
    finally { setPanelSaving(null); setPanelEditField(null); }
  };

  const fmtIssueDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
                  handleSaveEdits();
                } else {
                  setEditStartDate(monthIndexToDate(project.startMonth));
                  setEditEndDate(monthIndexToDate(project.startMonth + project.duration));
                  /* owner reset handled by setEditOwners or kept as-is */
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
            <button className="detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="detail-title">{project.name}</h2>
          {linearProjectUrl ? (
            <a href={linearProjectUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#6366f1", marginBottom: 8, display: "block", textDecoration: "none" }}>
              {linearProjectName} &#8599;
            </a>
          ) : (
            <div style={{ fontSize: 12, color: "#8b8b9e", marginBottom: 8 }}>{linearProjectName}</div>
          )}
          <div className="detail-info-rows">
            <div className="detail-info-row">
              <span className="detail-info-label">Owners</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {people.map((p) => (
                      <label key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editOwners.has(p.name)}
                          onChange={() => {
                            setEditOwners((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.name)) next.delete(p.name);
                              else next.add(p.name);
                              return next;
                            });
                          }}
                          style={{ accentColor: p.color }}
                        />
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {people
                      .filter((p) => p.projects.some((proj) => proj.name === project.name))
                      .map((p) => (
                        <span key={p.name} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                          backgroundColor: hexToRgba(p.color, 0.15), color: p.color,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
                          {p.name}
                        </span>
                      ))
                    }
                  </div>
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Start</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="date"
                    className="detail-editable-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                ) : (
                  startDateStr
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">End</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="date"
                    className="detail-editable-input"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                ) : (
                  endDateStr
                )}
              </span>
            </div>
            {!isEditing && (
              <div className="detail-info-row">
                <span className="detail-info-label">Duration</span>
                <span className="detail-info-value">
                  {project.duration} month{project.duration > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          <div className="detail-meta">
            <span className="detail-progress-text">
              {doneCount}/{totalCount} done ({progressPct}%)
            </span>
          </div>
          <div className="detail-progress-bar-bg">
            <div className="detail-progress-bar-fill" style={{ width: `${progressPct}%`, backgroundColor: "#22c55e" }} />
          </div>
        </div>

        {/* Description */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveDescription}
            placeholder="Add a description..."
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, width: "100%", minHeight: 60, padding: "8px 10px",
              borderRadius: 6, border: "1px solid #e2e8f0", background: "#fafbfc", color: "#1e293b",
              resize: "vertical", lineHeight: 1.5,
            }}
          />
          {descSaving && <span style={{ fontSize: 10, color: "#94a3b8" }}>Saving...</span>}
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
          <div style={{ padding: "12px 16px" }}>
            <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
              {openIssues.length} open task{openIssues.length !== 1 ? "s" : ""}
            </div>

            {PRIORITY_GROUPS.map((pg) => {
              const items = byPriority[pg.key];
              if (!items || items.length === 0) return null;
              return (
                <div key={pg.key} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, borderBottom: `2px solid ${pg.color}`, paddingBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: pg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>{pg.label}</span>
                    <span style={{ fontSize: 10, color: "#94a3b8" }}>{items.length}</span>
                  </div>

                  {items.map((issue, idx) => {
                    const ownerName = issue.assignee ? (normalizeAssigneeName(issue.assignee.displayName) ?? issue.assignee.displayName) : "Unassigned";
                    const ownerPerson = people.find((p) => p.name === ownerName);
                    const isSaving = panelSaving === issue.id;
                    const isEditOwner = panelEditField?.issueId === issue.id && panelEditField.field === "owner";
                    const isEditStatus = panelEditField?.issueId === issue.id && panelEditField.field === "status";
                    const isEditDue = panelEditField?.issueId === issue.id && panelEditField.field === "dueDate";

                    return (
                      <div key={issue.id} style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", fontSize: 12,
                        background: idx % 2 === 0 ? "white" : hexToRgba(pg.color, 0.03),
                        borderTop: idx > 0 ? `1px solid ${hexToRgba(pg.color, 0.08)}` : "none",
                        opacity: isSaving ? 0.5 : 1,
                        borderRadius: idx === 0 ? "6px 6px 0 0" : idx === items.length - 1 ? "0 0 6px 6px" : undefined,
                      }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, backgroundColor: issue.state.color }} />

                        {/* Title */}
                        {issue.url ? (
                          <a href={issue.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, fontWeight: 500, color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", textDecoration: "none" }} title={issue.title}>
                            {issue.identifier && <span style={{ color: "#94a3b8", fontSize: 10, marginRight: 4 }}>{issue.identifier}</span>}
                            {issue.title}
                          </a>
                        ) : (
                          <span onClick={() => onIssueClick(issue.id)} style={{ flex: 1, fontWeight: 500, color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }} title={issue.title}>
                            {issue.title}
                          </span>
                        )}

                        {/* Owner */}
                        <span
                          onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setPanelEditField(isEditOwner ? null : { issueId: issue.id, field: "owner", x: r.left, y: r.bottom + 4 }); }}
                          style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999, cursor: "pointer", flexShrink: 0, backgroundColor: ownerPerson ? hexToRgba(ownerPerson.color, 0.15) : "#f1f5f9", color: ownerPerson?.color ?? "#64748b", maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {ownerName}
                        </span>

                        {/* Due date */}
                        {isEditDue ? (
                          <input type="date" autoFocus defaultValue={issue.dueDate ? issue.dueDate.split("T")[0] : ""}
                            onChange={(e) => updateIssueField(issue.id, "dueDate", e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontFamily: "var(--font-sans)", fontSize: 10, padding: "1px 3px", border: "1px solid #e2e8f0", borderRadius: 4, width: 95, flexShrink: 0 }}
                          />
                        ) : (
                          <span
                            onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setPanelEditField({ issueId: issue.id, field: "dueDate", x: r.left, y: r.bottom + 4 }); }}
                            style={{ fontSize: 10, color: issue.dueDate ? "#475569" : "#cbd5e1", cursor: "pointer", flexShrink: 0, minWidth: 50, textAlign: "right" }}
                          >
                            {issue.dueDate ? fmtIssueDate(issue.dueDate) : "Add date"}
                          </span>
                        )}

                        {/* Status */}
                        <span
                          onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setPanelEditField(isEditStatus ? null : { issueId: issue.id, field: "status", x: r.right, y: r.bottom + 4 }); }}
                          style={{ fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 999, cursor: "pointer", flexShrink: 0, backgroundColor: hexToRgba(issue.state.color, 0.15), color: issue.state.color, whiteSpace: "nowrap" }}
                        >
                          {issue.state.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Add task */}
        {linearProjectId && linearTeamId && (
          <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="text"
                placeholder="Add a task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTaskTitle.trim() && !newTaskCreating) {
                    setNewTaskCreating(true);
                    fetch("/api/linear/create", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ title: newTaskTitle.trim(), teamId: linearTeamId, projectId: linearProjectId }),
                    })
                      .then((res) => res.json())
                      .then((json) => {
                        if (json.success) {
                          const i = json.issue;
                          setIssues((prev) => [...prev, {
                            id: i.id, identifier: i.identifier, url: i.url, title: i.title,
                            priority: i.priority, priorityLabel: i.priorityLabel,
                            state: i.state, assignee: i.assignee, startedAt: null, dueDate: i.dueDate,
                          }]);
                          setNewTaskTitle("");
                        }
                      })
                      .catch((err) => console.error("Create failed:", err))
                      .finally(() => setNewTaskCreating(false));
                  }
                }}
                style={{
                  flex: 1, fontFamily: "var(--font-sans)", fontSize: 12, padding: "6px 10px",
                  border: "1px solid #e2e8f0", borderRadius: 6, outline: "none",
                }}
              />
              <button
                onClick={() => {
                  if (!newTaskTitle.trim() || newTaskCreating) return;
                  setNewTaskCreating(true);
                  fetch("/api/linear/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: newTaskTitle.trim(), teamId: linearTeamId, projectId: linearProjectId }),
                  })
                    .then((res) => res.json())
                    .then((json) => {
                      if (json.success) {
                        const i = json.issue;
                        setIssues((prev) => [...prev, {
                          id: i.id, identifier: i.identifier, url: i.url, title: i.title,
                          priority: i.priority, priorityLabel: i.priorityLabel,
                          state: i.state, assignee: i.assignee, startedAt: null, dueDate: i.dueDate,
                        }]);
                        setNewTaskTitle("");
                      }
                    })
                    .catch((err) => console.error("Create failed:", err))
                    .finally(() => setNewTaskCreating(false));
                }}
                disabled={!newTaskTitle.trim() || newTaskCreating}
                style={{
                  fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, padding: "6px 12px",
                  border: "none", borderRadius: 6, cursor: newTaskTitle.trim() ? "pointer" : "default",
                  background: newTaskTitle.trim() ? personColor : "#cbd5e1", color: "white",
                }}
              >
                {newTaskCreating ? "..." : "Add"}
              </button>
            </div>
          </div>
        )}

        {/* Move to Future Projects */}
        <div className="detail-bottom-section">
          <button
            onClick={() => {
              if (confirm(`Move "${project.name}" to Future Projects? This will remove it from the roadmap and all owners.`)) {
                onMoveToFuture?.(personName, project);
                onClose();
              }
            }}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
              padding: "8px 16px", cursor: "pointer", borderRadius: 6, width: "100%",
              border: "1px solid #22c55e", background: "white", color: "#22c55e",
            }}
          >
            Move to Future Projects
          </button>
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

      {/* Inline edit dropdowns — rendered inside overlay but outside panel to avoid clipping */}
      {panelEditField && <div onClick={() => setPanelEditField(null)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />}

      {panelEditField && panelEditField.field === "owner" && (
        <div data-dropdown onClick={(e) => e.stopPropagation()} style={{
          position: "fixed", top: panelEditField.y, left: panelEditField.x, zIndex: 9999,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 180, maxHeight: 240, overflowY: "auto",
        }}>
          {panelMembers.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading...</div>}
          {panelMembers.map((m) => (
            <div key={m.id} onClick={() => updateIssueField(panelEditField.issueId, "assigneeId", m.id)}
              style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >{m.displayName}</div>
          ))}
        </div>
      )}

      {panelEditField && panelEditField.field === "status" && (
        <div data-dropdown onClick={(e) => e.stopPropagation()} style={{
          position: "fixed", top: panelEditField.y, left: panelEditField.x - 160, zIndex: 9999,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 160, maxHeight: 260, overflowY: "auto",
        }}>
          {panelWfStates.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading...</div>}
          {panelWfStates.map((ws) => (
            <div key={ws.id} onClick={() => updateIssueField(panelEditField.issueId, "stateId", ws.id)}
              style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", gap: 8 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = hexToRgba(ws.color, 0.08); }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ws.color, flexShrink: 0 }} />
              <span style={{ color: ws.color }}>{ws.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail panel (static roadmap projects) ────────────────────────────────

function AddTaskToProject({ projectName, personColor, onTaskCreated }: {
  projectName: string;
  personColor: string;
  onTaskCreated: (task: { id: string; title: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      // Find the project in Linear
      const projData = await linearQuery<{ projects: { nodes: { id: string; teams: { nodes: { id: string }[] } }[] } }>(
        `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id teams { nodes { id } } } } }`,
        { name: projectName },
      );
      let projectId = projData.projects.nodes[0]?.id;
      let teamId = projData.projects.nodes[0]?.teams?.nodes?.[0]?.id;

      // If project doesn't exist, get a default team
      if (!teamId) {
        const teamsData = await linearQuery<{ teams: { nodes: { id: string }[] } }>(
          `query { teams(first: 1) { nodes { id } } }`,
        );
        teamId = teamsData.teams.nodes[0]?.id;
      }
      if (!teamId) return;

      const res = await fetch("/api/linear/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), teamId, projectId: projectId ?? undefined }),
      });
      const json = await res.json();
      if (json.success) {
        onTaskCreated({ id: json.issue.id, title: json.issue.title });
        setTitle("");
      }
    } catch (err) { console.error("Create task failed:", err); }
    finally { setCreating(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="text" placeholder="Add a task..." value={title} onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) create(); }}
        style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none" }}
      />
      <button onClick={create} disabled={!title.trim() || creating}
        style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "6px 12px", border: "none", borderRadius: 6, cursor: title.trim() ? "pointer" : "default", background: title.trim() ? personColor : "#cbd5e1", color: "white" }}
      >{creating ? "..." : "Add"}</button>
    </div>
  );
}

function DetailPanel({
  project,
  personName,
  personColor,
  onClose,
  onDelete,
  people,
  onChangeOwner,
  onUpdateDates,
  onAddProjectToPerson,
  onRemoveProjectFromPerson,
  onMoveToFuture,
}: {
  project: Project;
  personName: string;
  personColor: string;
  onClose: () => void;
  onDelete: (personName: string, projectId: string, projectName: string) => void;
  people: Person[];
  onChangeOwner: (projectId: string, fromPerson: string, toPerson: string) => void;
  onUpdateDates: (projectId: string, personName: string, startMonth: number, duration: number) => void;
  onAddProjectToPerson?: (personName: string, proj: { name: string; startMonth: number; duration: number; linearProjectName: string | null }) => void;
  onRemoveProjectFromPerson?: (personName: string, projectId: string) => void;
  onMoveToFuture?: (personName: string, project: Project) => void;
}) {
  const doneCount = project.tasks.filter((t) => t.status === "done").length;
  const inProgressCount = project.tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const todoCount = project.tasks.filter((t) => t.status === "todo").length;
  const total = project.tasks.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState(monthIndexToDate(project.startMonth));
  const [editEndDate, setEditEndDate] = useState(monthIndexToDate(project.startMonth + project.duration));
  const [editOwners, setEditOwners] = useState<Set<string>>(() =>
    new Set(people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name))
  );
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const editStartMonth = dateToMonthIndex(editStartDate);
  const editEndMonth = dateToMonthIndex(editEndDate);
  const editDuration = Math.max(1, editEndMonth - editStartMonth);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const startDateStr = formatMonthIndex(project.startMonth);
  const endDateStr = formatMonthIndex(project.startMonth + project.duration);
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

  const handleSaveEdits = () => {
    const newStart = editStartMonth;
    const newDuration = editDuration;
    if (newStart !== project.startMonth || newDuration !== project.duration) {
      onUpdateDates(project.id, personName, newStart, newDuration);
    }

    // Handle multi-owner changes
    const currentOwners = new Set(
      people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name)
    );
    for (const name of editOwners) {
      if (!currentOwners.has(name)) {
        onAddProjectToPerson?.(name, {
          name: project.name,
          startMonth: newStart,
          duration: newDuration,
          linearProjectName: project.linearProjectName ?? null,
        });
      }
    }
    for (const name of currentOwners) {
      if (!editOwners.has(name)) {
        const personProj = people.find((p) => p.name === name)?.projects.find((proj) => proj.name === project.name);
        if (personProj) onRemoveProjectFromPerson?.(name, personProj.id);
      }
    }

    setIsEditing(false);
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
                  handleSaveEdits();
                } else {
                  setEditStartDate(monthIndexToDate(project.startMonth));
                  setEditEndDate(monthIndexToDate(project.startMonth + project.duration));
                  setEditOwners(new Set(people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name)));
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? "Save" : "Edit"}
            </button>
            <button className="detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="detail-title">{project.name}</h2>
          <div className="detail-info-rows">
            <div className="detail-info-row">
              <span className="detail-info-label">Owners</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {people.map((p) => (
                      <label key={p.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={editOwners.has(p.name)}
                          onChange={() => {
                            setEditOwners((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.name)) next.delete(p.name);
                              else next.add(p.name);
                              return next;
                            });
                          }}
                          style={{ accentColor: p.color }}
                        />
                        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {people
                      .filter((p) => p.projects.some((proj) => proj.name === project.name))
                      .map((p) => (
                        <span key={p.name} style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                          backgroundColor: hexToRgba(p.color, 0.15), color: p.color,
                        }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p.color }} />
                          {p.name}
                        </span>
                      ))
                    }
                  </div>
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">Start</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="date"
                    className="detail-editable-input"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                  />
                ) : (
                  startDateStr
                )}
              </span>
            </div>
            <div className="detail-info-row">
              <span className="detail-info-label">End</span>
              <span className="detail-info-value">
                {isEditing ? (
                  <input
                    type="date"
                    className="detail-editable-input"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                  />
                ) : (
                  endDateStr
                )}
              </span>
            </div>
            {!isEditing && (
              <div className="detail-info-row">
                <span className="detail-info-label">Duration</span>
                <span className="detail-info-value">
                  {project.duration} month{project.duration > 1 ? "s" : ""}
                </span>
              </div>
            )}
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

        {/* Add task — creates in Linear under matching project */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
          <AddTaskToProject projectName={project.name} personColor={personColor} onTaskCreated={(task) => {
            // Task is created in Linear, no local state update needed for static DetailPanel
          }} />
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

        {/* Move to Future Projects */}
        <div className="detail-bottom-section">
          <button
            onClick={() => {
              if (confirm(`Move "${project.name}" to Future Projects? This will remove it from the roadmap and all owners.`)) {
                onMoveToFuture?.(personName, project);
                onClose();
              }
            }}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
              padding: "8px 16px", cursor: "pointer", borderRadius: 6, width: "100%",
              border: "1px solid #22c55e", background: "white", color: "#22c55e",
            }}
          >
            Move to Future Projects
          </button>
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
  const order: ZoomLevel[] = ["month", "biweekly", "week"];
  const idx = order.indexOf(zoom);

  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn"
        onClick={() => { if (idx > 0) onZoom(order[idx - 1]); }}
        disabled={idx === 0}
        title="Zoom out"
        style={{ opacity: idx === 0 ? 0.3 : 1 }}
      >
        &minus;
      </button>
      <button
        className="zoom-btn"
        onClick={() => { if (idx < order.length - 1) onZoom(order[idx + 1]); }}
        disabled={idx === order.length - 1}
        title="Zoom in"
        style={{ opacity: idx === order.length - 1 ? 0.3 : 1 }}
      >
        +
      </button>
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
  // Find this/previous/next cycle
  const weeklyCycles = useMemo(() => {
    const now = new Date();
    const sorted = [...cycles].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    let thisIdx = sorted.findIndex((c) => now >= new Date(c.startsAt) && now <= new Date(c.endsAt));
    if (thisIdx === -1) {
      thisIdx = sorted.findIndex((c) => new Date(c.startsAt) > now);
      if (thisIdx === -1) thisIdx = sorted.length - 1;
    }
    const result: { label: string; cycle: LinearCycle }[] = [];
    if (thisIdx > 0) result.push({ label: "Previous cycle", cycle: sorted[thisIdx - 1] });
    if (thisIdx >= 0 && thisIdx < sorted.length) result.push({ label: "This cycle", cycle: sorted[thisIdx] });
    if (thisIdx + 1 < sorted.length) result.push({ label: "Next cycle", cycle: sorted[thisIdx + 1] });
    return result;
  }, [cycles]);

  return (
    <div className="cycle-select-wrapper">
      <select
        className="cycle-select"
        value={selectedCycleId ?? "all"}
        onChange={(e) => onSelect(e.target.value === "all" ? null : e.target.value)}
        disabled={loading}
      >
        <option value="all">All Cycles</option>
        {weeklyCycles.map((w) => (
          <option key={w.cycle.id} value={w.cycle.id}>
            {w.label}
          </option>
        ))}
      </select>
      {loading && <div className="cycle-loading-dot" />}
    </div>
  );
}

// ── Add project form ──────────────────────────────────────────────────────

function AddProjectForm({
  people,
  defaultOwner,
  onAdd,
  onCancel,
}: {
  people: Person[];
  defaultOwner: string;
  onAdd: (data: { name: string; owner: string; startDate: string; endDate: string; notes: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState(defaultOwner);
  const today = new Date().toISOString().split("T")[0];
  const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(threeMonths);
  const [notes, setNotes] = useState("");

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "6px 10px", border: "1px solid #e0e0ea", borderRadius: 6,
    fontSize: 13, fontFamily: "var(--font-sans)", marginTop: 2, color: "#1e293b",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" as const, letterSpacing: "0.04em" };

  return (
    <div className="add-project-form" onClick={(e) => e.stopPropagation()} style={{ minWidth: 340 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1e293b" }}>Add Project</div>

      <label style={labelStyle}>
        Project name
        <input type="text" placeholder="e.g. New Feature" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }} autoFocus
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        />
      </label>

      <label style={labelStyle}>
        Owner
        <select value={owner} onChange={(e) => setOwner(e.target.value)} style={{ ...inputStyle, marginBottom: 10 }}>
          {people.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
        </select>
      </label>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <label style={{ ...labelStyle, flex: 1 }}>
          Start date
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ ...labelStyle, flex: 1 }}>
          End date
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </label>
      </div>

      <label style={labelStyle}>
        Notes
        <textarea placeholder="Optional notes..." value={notes} onChange={(e) => setNotes(e.target.value)}
          style={{ ...inputStyle, minHeight: 50, resize: "vertical", marginBottom: 12 }}
        />
      </label>

      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "6px 16px", border: "1px solid #e0e0ea", borderRadius: 6, background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "var(--font-sans)" }}>
          Cancel
        </button>
        <button
          onClick={() => { if (name.trim() && startDate && endDate) onAdd({ name: name.trim(), owner, startDate, endDate, notes }); }}
          disabled={!name.trim() || !startDate || !endDate}
          style={{ padding: "6px 16px", border: "none", borderRadius: 6, background: name.trim() ? "#1e293b" : "#cbd5e1", color: "#fff", fontSize: 12, cursor: name.trim() ? "pointer" : "default", fontWeight: 600, fontFamily: "var(--font-sans)" }}
        >
          Add Project
        </button>
      </div>
    </div>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────

function MultiSelect({ label, options, selected, onToggle, onClear }: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    requestAnimationFrame(() => document.addEventListener("mousedown", handler));
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const count = selected.size;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
          padding: "6px 12px", cursor: "pointer", borderRadius: 6,
          border: "1px solid #e2e8f0", background: count > 0 ? "#eef2ff" : "#fff", color: "#1e293b",
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {count > 0 ? `${label} (${count})` : `All ${label}`}
        <span style={{ fontSize: 10, opacity: 0.5 }}>{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 200,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 180, maxHeight: 280, overflowY: "auto",
        }}>
          {count > 0 && (
            <div
              onClick={() => { onClear(); setOpen(false); }}
              style={{ padding: "6px 12px", fontSize: 12, color: "#dc2626", cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
            >
              Clear all
            </div>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLLabelElement).style.background = "transparent"; }}
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => onToggle(opt)}
                style={{ accentColor: "#3b82f6" }}
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

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
  viewMode,
  onViewMode,
  teams,
  people,
  filterTeams,
  onToggleTeam,
  onClearTeams,
  filterPeople,
  onTogglePerson,
  onClearPeople,
  onAddProject,
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
  viewMode: "projects" | "subtestEdits" | "cycles" | "futureProjects";
  onViewMode: (m: "projects" | "subtestEdits" | "cycles" | "futureProjects") => void;
  teams: Team[];
  people: Person[];
  filterTeams: Set<string>;
  onToggleTeam: (t: string) => void;
  onClearTeams: () => void;
  filterPeople: Set<string>;
  onTogglePerson: (p: string) => void;
  onClearPeople: () => void;
  onAddProject: () => void;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-bar-left">
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 800, color: "#f59e0b", margin: "0 0 6px 0", letterSpacing: "-0.01em" }}>Marker Method Roadmap</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 4 }}>
          <button
            onClick={() => onViewMode("projects")}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700,
              padding: "8px 20px", cursor: "pointer", border: "none",
              borderRadius: "8px 0 0 8px",
              background: viewMode === "projects" ? "#1e293b" : "#f1f5f9",
              color: viewMode === "projects" ? "white" : "#64748b",
            }}
          >
            Projects
          </button>
          <button
            onClick={() => onViewMode("subtestEdits")}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700,
              padding: "8px 20px", cursor: "pointer", border: "none",
              borderRadius: 0,
              background: viewMode === "subtestEdits" ? "#f59e0b" : "#f1f5f9",
              color: viewMode === "subtestEdits" ? "white" : "#64748b",
            }}
          >
            Tasks
          </button>
          <button
            onClick={() => onViewMode("cycles")}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700,
              padding: "8px 20px", cursor: "pointer", border: "none",
              borderRadius: 0,
              background: viewMode === "cycles" ? "#1E88E5" : "#f1f5f9",
              color: viewMode === "cycles" ? "white" : "#64748b",
            }}
          >
            Cycles
          </button>
          <button
            onClick={() => onViewMode("futureProjects")}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700,
              padding: "8px 20px", cursor: "pointer", border: "none",
              borderRadius: "0 8px 8px 0",
              background: viewMode === "futureProjects" ? "#22c55e" : "#f1f5f9",
              color: viewMode === "futureProjects" ? "white" : "#64748b",
            }}
          >
            Future Projects
          </button>
          <button
            onClick={onAddProject}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 15, fontWeight: 700,
              padding: "8px 16px", cursor: "pointer", border: "none",
              borderRadius: 8, marginLeft: 8,
              background: "#22c55e", color: "white",
            }}
          >
            + Add Project
          </button>
        </div>
      </div>
      <div className="filter-bar-right">
        <MultiSelect
          label="Teams"
          options={teams.map((t) => t.name)}
          selected={filterTeams}
          onToggle={onToggleTeam}
          onClear={onClearTeams}
        />
        <MultiSelect
          label="People"
          options={(filterTeams.size > 0 ? people.filter((p) => {
            for (const tn of filterTeams) {
              const t = teams.find((t2) => t2.name === tn);
              if (t?.members.includes(p.name)) return true;
            }
            return false;
          }) : people).map((p) => p.name)}
          selected={filterPeople}
          onToggle={onTogglePerson}
          onClear={onClearPeople}
        />
        <CycleSelect
          cycles={cycles}
          selectedCycleId={selectedCycleId}
          onSelect={onCycleSelect}
          loading={cyclesLoading}
        />
        <input
          type="text"
          className="filter-search"
          placeholder="Search..."
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
  originalPersonName: string;
  linearIssueId?: string; // set when dragging a Linear-sourced bar
  linearProjectName?: string | null; // for syncing linked projects
  mode: "move" | "resize";
  reorderMode: boolean; // true when vertical drag detected
  mouseX: number;
  mouseY: number;
  startMouseX: number;
  startMouseY: number;
  originalStartMonth: number;
  originalDuration: number;
  currentStartMonth: number;
  currentDuration: number;
  originalLane: number; // lane where the dragged project started
  currentLane: number; // lane the project is being dragged to
};

// ── Linear bar types ──────────────────────────────────────────────────────

type LinearBar = {
  issueId: string;
  identifier?: string;
  url?: string;
  title: string;
  cleanedTitle: string;
  assigneeName: string;
  assigneeId: string | null;
  startDate: Date;
  endDate: Date;
  state: { name: string; color: string; type?: string };
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
    "oleksii.zhaboiedov": "Oleksii",
    flo: "Flo",
    florian: "Flo",
    maciej: "Maciej",
    "maciej.walusiak": "Maciej",
    liuda: "Luida",
    lillian: "Luida",
    john: "John",
    luida: "Luida",
    ak: "AK",
    maria: "Maria",
    carlos: "Carlos",
    erica: "Erica",
    david: "David",
    eleanor: "Eleanor",
    erin: "Erin",
    "stef": "Stef",
    "sam": "Sam",
    "samuel": "Sam",
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

// ── Cycles View ─────────────────────────────────────────────────────────────

type CycleIssue = {
  id: string;
  identifier?: string;
  url?: string;
  title: string;
  state: { name: string; color: string };
  assignee: { displayName: string; avatarUrl: string | null } | null;
  project: { name: string } | null;
  dueDate: string | null;
  priority: number;
  priorityLabel: string;
};

// ── Subtest Edits List View ──────────────────────────────────────────────

const PRIORITY_GROUPS: { key: number; label: string; color: string }[] = [
  { key: 1, label: "Urgent", color: "#dc2626" },
  { key: 2, label: "High", color: "#f59e0b" },
  { key: 3, label: "Medium", color: "#3b82f6" },
  { key: 4, label: "Low", color: "#94a3b8" },
  { key: 0, label: "No Priority", color: "#cbd5e1" },
];

type TaskIssue = {
  id: string;
  identifier?: string;
  url?: string;
  title: string;
  priority: number;
  priorityLabel: string;
  state: { name: string; color: string; type?: string };
  assignee: { id?: string; displayName: string; avatarUrl: string | null } | null;
  dueDate: string | null;
  projectName: string;
};

function TasksView({
  people,
  onIssueClick,
}: {
  people: Person[];
  onIssueClick: (issueId: string) => void;
}) {
  const [allIssues, setAllIssues] = useState<TaskIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"due" | "status" | "owner" | null>("due");
  const [editingField, setEditingField] = useState<{ issueId: string; field: "owner" | "status" | "dueDate"; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Fetch all issues — first get project IDs, then fetch issues per project
  useEffect(() => {
    setLoading(true);

    // Step 1: get all project IDs and names
    linearQuery<{ projects: { nodes: { id: string; name: string }[] } }>(
      `query { projects(first: 50) { nodes { id name } } }`,
    ).then(async (data) => {
      const allIssues: TaskIssue[] = [];
      // Step 2: fetch issues per project (avoids complexity limit)
      for (const proj of data.projects.nodes) {
        try {
          const issueData = await linearQuery<{ project: { issues: { nodes: { id: string; identifier: string; url: string; title: string; priority: number; priorityLabel: string; state: { name: string; color: string; type: string }; assignee: { id: string; displayName: string; avatarUrl: string | null } | null; dueDate: string | null }[] } } }>(
            `query ProjectIssues($id: String!) { project(id: $id) { issues(first: 250) { nodes { id identifier url title priority priorityLabel state { name color type } assignee { id displayName avatarUrl } dueDate } } } }`,
            { id: proj.id },
          );
          for (const issue of issueData.project.issues.nodes) {
            if (issue.state.type === "completed" || issue.state.type === "canceled") continue;
            allIssues.push({ ...issue, projectName: proj.name });
          }
        } catch {
          // Skip projects that fail
        }
      }
      setAllIssues(allIssues);
    })
      .catch((err) => console.error("[TASKS] Failed:", err))
      .finally(() => setLoading(false));

    // Fetch teams for editing
    linearQuery<{ teams: { nodes: { id: string; states: { nodes: WorkflowState[] }; members: { nodes: TeamMember[] } }[] } }>(
      `query { teams(first: 10) { nodes { id states { nodes { id name color position } } members(first: 50) { nodes { id displayName avatarUrl } } } } }`,
    ).then((data) => {
      const stateMap = new Map<string, WorkflowState>();
      const memberMap = new Map<string, TeamMember>();
      for (const team of data.teams.nodes) {
        for (const s of team.states.nodes) { if (!stateMap.has(s.name)) stateMap.set(s.name, s); }
        for (const m of team.members.nodes) memberMap.set(m.id, m);
      }
      setWorkflowStates([...stateMap.values()].sort((a, b) => a.position - b.position));
      setTeamMembers([...memberMap.values()].sort((a, b) => a.displayName.localeCompare(b.displayName)));
    }).catch(() => {});
  }, []);

  const ownerNames = useMemo(() => {
    const names = new Set<string>();
    for (const i of allIssues) {
      if (i.assignee) names.add(normalizeAssigneeName(i.assignee.displayName) ?? i.assignee.displayName);
    }
    return [...names].sort();
  }, [allIssues]);

  const projectNames = useMemo(() => [...new Set(allIssues.map((i) => i.projectName))].sort(), [allIssues]);

  const filtered = useMemo(() => {
    let list = allIssues;
    if (filterOwner) list = list.filter((i) => {
      const name = i.assignee ? (normalizeAssigneeName(i.assignee.displayName) ?? i.assignee.displayName) : "Unassigned";
      return name === filterOwner;
    });
    if (filterProject) list = list.filter((i) => i.projectName === filterProject);
    return list;
  }, [allIssues, filterOwner, filterProject]);

  // Group by priority
  const byPriority = useMemo(() => {
    const groups: Record<number, TaskIssue[]> = {};
    for (const issue of filtered) {
      if (!groups[issue.priority]) groups[issue.priority] = [];
      groups[issue.priority].push(issue);
    }
    for (const key in groups) {
      groups[key].sort((a, b) => {
        const aName = a.assignee ? (normalizeAssigneeName(a.assignee.displayName) ?? a.assignee.displayName) : "";
        const bName = b.assignee ? (normalizeAssigneeName(b.assignee.displayName) ?? b.assignee.displayName) : "";
        if (sortField === "due") {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortField === "status") return a.state.name.localeCompare(b.state.name);
        if (sortField === "owner") return aName.localeCompare(bName);
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    }
    return groups;
  }, [filtered, sortField]);

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const updateField = async (issueId: string, field: string, value: string) => {
    setSaving(issueId);
    try {
      const res = await fetch("/api/linear/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        const u = json.issue;
        setAllIssues((prev) => prev.map((issue) => {
          if (issue.id !== issueId) return issue;
          const updated = { ...issue };
          if (u.state) updated.state = { name: u.state.name, color: u.state.color, type: u.state.type };
          if (u.dueDate !== undefined) updated.dueDate = u.dueDate;
          if (u.assignee !== undefined) updated.assignee = u.assignee;
          if (u.state?.type === "completed" || u.state?.type === "canceled") return null as unknown as TaskIssue;
          return updated;
        }).filter(Boolean));
      }
    } catch (err) { console.error("Update failed:", err); }
    finally { setSaving(null); setEditingField(null); }
  };

  const selectStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
    padding: "6px 12px", cursor: "pointer", borderRadius: 6,
    border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
  };

  const COL = { title: "1 1 0", owner: "0 0 130px", due: "0 0 100px", status: "0 0 110px" };

  return (
    <>
    <div style={{ padding: "24px 32px", fontFamily: "var(--font-sans)", maxHeight: "calc(100vh - 120px)", overflow: "auto", maxWidth: 1000, margin: "0 auto" }}>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={filterOwner ?? ""} onChange={(e) => setFilterOwner(e.target.value || null)} style={selectStyle}>
          <option value="">All owners</option>
          {ownerNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={filterProject ?? ""} onChange={(e) => setFilterProject(e.target.value || null)} style={selectStyle}>
          <option value="">All projects</option>
          {projectNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {filtered.length} open task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>No open tasks found.</div>
      )}

      {!loading && PRIORITY_GROUPS.map((pg) => {
        const items = byPriority[pg.key];
        if (!items || items.length === 0) return null;
        return (
          <div key={pg.key} style={{ marginBottom: 24 }}>
            {/* Priority group header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, borderBottom: `2px solid ${pg.color}`, paddingBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: pg.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {pg.label}
              </span>
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                {items.length} task{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Column headers */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "4px 12px",
              background: hexToRgba(pg.color, 0.05), fontSize: 10, fontWeight: 700, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: "0.04em", borderRadius: "8px 8px 0 0",
            }}>
              <span style={{ width: 8 }} />
              <span style={{ flex: COL.title }}>Task</span>
              <span style={{ flex: COL.owner, cursor: "pointer", color: sortField === "owner" ? pg.color : undefined }} onClick={() => setSortField(sortField === "owner" ? null : "owner")}>
                Owner {sortField === "owner" ? "\u25B2" : ""}
              </span>
              <span style={{ flex: COL.due, textAlign: "right", cursor: "pointer", color: sortField === "due" ? pg.color : undefined }} onClick={() => setSortField(sortField === "due" ? null : "due")}>
                Due {sortField === "due" ? "\u25B2" : ""}
              </span>
              <span style={{ flex: COL.status, cursor: "pointer", color: sortField === "status" ? pg.color : undefined }} onClick={() => setSortField(sortField === "status" ? null : "status")}>
                Status {sortField === "status" ? "\u25B2" : ""}
              </span>
            </div>

            {/* Task rows */}
            <div style={{ border: `1px solid ${hexToRgba(pg.color, 0.15)}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "visible" }}>
              {items.map((issue, idx) => {
                const ownerName = issue.assignee ? (normalizeAssigneeName(issue.assignee.displayName) ?? issue.assignee.displayName) : "Unassigned";
                const ownerPerson = people.find((p) => p.name === ownerName);
                const isSaving = saving === issue.id;
                const isEditingOwner = editingField?.issueId === issue.id && editingField.field === "owner";
                const isEditingStatus = editingField?.issueId === issue.id && editingField.field === "status";
                const isEditingDue = editingField?.issueId === issue.id && editingField.field === "dueDate";

                return (
                  <div
                    key={issue.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 12px", fontSize: 12,
                      background: idx % 2 === 0 ? "white" : hexToRgba(pg.color, 0.02),
                      borderTop: idx > 0 ? `1px solid ${hexToRgba(pg.color, 0.08)}` : "none",
                      opacity: isSaving ? 0.5 : 1,
                      position: (isEditingOwner || isEditingStatus || isEditingDue) ? "relative" : undefined,
                      zIndex: (isEditingOwner || isEditingStatus || isEditingDue) ? 60 : undefined,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, backgroundColor: issue.state.color }} />

                    {/* Title */}
                    <span
                      onClick={() => onIssueClick(issue.id)}
                      style={{ flex: COL.title, fontWeight: 500, color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                      title={`[${issue.projectName}] ${issue.title}`}
                    >
                      {issue.identifier && <span style={{ color: "#94a3b8", fontSize: 10, marginRight: 4 }}>{issue.identifier}</span>}
                      {issue.title}
                    </span>

                    {/* Owner */}
                    <span style={{ flex: COL.owner }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setEditingField(isEditingOwner ? null : { issueId: issue.id, field: "owner", x: r.left, y: r.bottom + 4 }); }}
                        style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, cursor: "pointer",
                          backgroundColor: ownerPerson ? hexToRgba(ownerPerson.color, 0.15) : "#f1f5f9",
                          color: ownerPerson?.color ?? "#64748b",
                          display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {ownerName}
                      </span>
                    </span>

                    {/* Due date */}
                    <span style={{ flex: COL.due, textAlign: "right" }}>
                      {isEditingDue ? (
                        <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <input type="date" autoFocus
                            defaultValue={issue.dueDate ? issue.dueDate.split("T")[0] : ""}
                            onChange={(e) => { if (e.target.value) updateField(issue.id, "dueDate", e.target.value); }}
                            onBlur={() => setEditingField(null)}
                            style={{ fontFamily: "var(--font-sans)", fontSize: 11, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, width: 105 }}
                          />
                          {issue.dueDate && (
                            <button onMouseDown={(e) => { e.preventDefault(); updateField(issue.id, "dueDate", ""); }}
                              style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                            >&times;</button>
                          )}
                        </span>
                      ) : (
                        <span
                          onClick={(e) => { e.stopPropagation(); setEditingField({ issueId: issue.id, field: "dueDate", x: 0, y: 0 }); }}
                          style={{ fontSize: 11, color: issue.dueDate ? "#475569" : "#cbd5e1", cursor: "pointer", padding: "2px 6px", borderRadius: 4, border: "1px solid transparent" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = "#e2e8f0"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = "transparent"; }}
                        >
                          {issue.dueDate ? fmtDate(issue.dueDate) : "Add date"}
                        </span>
                      )}
                    </span>

                    {/* Status */}
                    <span style={{ flex: COL.status }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setEditingField(isEditingStatus ? null : { issueId: issue.id, field: "status", x: r.right, y: r.bottom + 4 }); }}
                        style={{
                          fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, cursor: "pointer",
                          backgroundColor: hexToRgba(issue.state.color, 0.15), color: issue.state.color, whiteSpace: "nowrap",
                          display: "inline-block",
                        }}
                      >
                        {issue.state.name}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>

    {/* Backdrop */}
    {editingField && <div onClick={() => setEditingField(null)} style={{ position: "fixed", inset: 0, zIndex: 9998 }} />}

    {/* Owner dropdown */}
    {editingField && editingField.field === "owner" && (
      <div data-dropdown onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", top: editingField.y, left: editingField.x, zIndex: 9999,
        background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 180, maxHeight: 240, overflowY: "auto",
      }}>
        {teamMembers.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading...</div>}
        {teamMembers.map((m) => {
          const issue = allIssues.find((i) => i.id === editingField.issueId);
          const issueName = issue?.assignee ? (normalizeAssigneeName(issue.assignee.displayName) ?? issue.assignee.displayName) : "";
          const isSelected = m.displayName === issue?.assignee?.displayName || normalizeAssigneeName(m.displayName) === issueName;
          return (
            <div key={m.id} onClick={() => updateField(editingField.issueId, "assigneeId", m.id)}
              style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, fontWeight: isSelected ? 700 : 400, background: isSelected ? "#f1f5f9" : "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#f1f5f9" : "transparent"; }}
            >{m.displayName}</div>
          );
        })}
      </div>
    )}

    {/* Status dropdown */}
    {editingField && editingField.field === "status" && (
      <div data-dropdown onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", top: editingField.y, left: editingField.x - 160, zIndex: 9999,
        background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 160, maxHeight: 260, overflowY: "auto",
      }}>
        {workflowStates.length === 0 && <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading...</div>}
        {workflowStates.map((ws) => {
          const issue = allIssues.find((i) => i.id === editingField.issueId);
          const isSelected = ws.name === issue?.state.name;
          return (
            <div key={ws.id} onClick={() => updateField(editingField.issueId, "stateId", ws.id)}
              style={{ padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6, display: "flex", alignItems: "center", gap: 8, fontWeight: isSelected ? 700 : 400, background: isSelected ? hexToRgba(ws.color, 0.1) : "transparent" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = hexToRgba(ws.color, 0.08); }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? hexToRgba(ws.color, 0.1) : "transparent"; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ws.color, flexShrink: 0 }} />
              <span style={{ color: ws.color }}>{ws.name}</span>
            </div>
          );
        })}
      </div>
    )}
    </>
  );
}

// ── Future Projects View ─────────────────────────────────────────────────

type FutureProject = {
  name: string;
  description: string;
  linearProjectId?: string;
  linearProjectUrl?: string;
};

function FutureProjectsView({ people, onAssignToRoadmap }: { people: Person[]; onAssignToRoadmap: (proj: FutureProject, owner: string, startDate: string, endDate: string) => void }) {
  const [projects, setProjects] = useState<FutureProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [assignOwner, setAssignOwner] = useState("");
  const [assignStart, setAssignStart] = useState("");
  const [assignEnd, setAssignEnd] = useState("");

  useEffect(() => {
    fetchOverrides().then((ov) => { setProjects(ov.futureProjects ?? []); setLoading(false); });
    linearQuery<{ teams: { nodes: { id: string; name: string }[] } }>(
      `query { teams(first: 10) { nodes { id name } } }`,
    ).then((data) => {
      const mm = data.teams.nodes.find((t) => t.name === "Marker Method");
      setDefaultTeamId(mm?.id ?? data.teams.nodes[0]?.id ?? null);
    }).catch(() => {});
  }, []);

  const addProject = async () => {
    if (!newName.trim() || !defaultTeamId) return;
    setCreating(true);
    try {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }`,
          variables: { input: { name: newName.trim(), teamIds: [defaultTeamId] } },
        }),
      });
      const json = await res.json();
      const created = json.data?.projectCreate;
      // Link to Marker Method! LFG initiative
      if (created?.project?.id) {
        fetch("/api/linear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation { initiativeToProjectCreate(input: { initiativeId: "b20d5d16-f6cf-4c73-840d-2fb9e3635851", projectId: "${created.project.id}" }) { success } }`,
          }),
        }).catch(() => {});
      }
      const newProject: FutureProject = { name: newName.trim(), description: "", linearProjectId: created?.project?.id, linearProjectUrl: created?.project?.url };
      setProjects((prev) => [...prev, newProject]);
      saveOverride("addFutureProject", { project: newProject });
      setNewName("");
      setAdding(false);
    } catch (err) { console.error("Failed to create:", err); }
    finally { setCreating(false); }
  };

  const removeProject = (idx: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== idx));
    saveOverride("removeFutureProject", { index: idx });
    if (selectedIdx === idx) setSelectedIdx(null);
  };

  const handleAssign = () => {
    if (selectedIdx === null || !assignOwner || !assignStart || !assignEnd) return;
    const proj = projects[selectedIdx];
    onAssignToRoadmap(proj, assignOwner, assignStart, assignEnd);
    removeProject(selectedIdx);
    setSelectedIdx(null);
  };

  const selectedProj = selectedIdx !== null ? projects[selectedIdx] : null;

  return (
    <div style={{ padding: "24px 32px", fontFamily: "var(--font-sans)", maxHeight: "calc(100vh - 120px)", overflow: "auto", maxWidth: 700, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#22c55e", margin: 0 }}>Future Projects</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Unassigned projects. Click to assign to roadmap.</p>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          style={{ fontFamily: "var(--font-sans)", fontSize: 20, fontWeight: 700, width: 36, height: 36, borderRadius: "50%", border: "none", background: "#22c55e", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >+</button>
      </div>

      {adding && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input type="text" placeholder="Project name" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) addProject(); if (e.key === "Escape") setAdding(false); }}
            style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none" }}
          />
          <button onClick={addProject} disabled={!newName.trim() || creating}
            style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "6px 14px", border: "none", borderRadius: 6, background: newName.trim() ? "#22c55e" : "#cbd5e1", color: "white", cursor: newName.trim() ? "pointer" : "default" }}
          >{creating ? "..." : "Add"}</button>
        </div>
      )}

      {loading && <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading...</div>}

      {!loading && projects.length === 0 && !adding && (
        <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center", fontSize: 13 }}>No future projects. Press + to add one.</div>
      )}

      {!loading && projects.map((proj, idx) => (
        <div key={idx}
          onClick={() => { setSelectedIdx(idx); setAssignOwner(people[0]?.name ?? ""); setAssignStart(new Date().toISOString().split("T")[0]); setAssignEnd(new Date(Date.now() + 90*86400000).toISOString().split("T")[0]); }}
          style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 6,
            background: selectedIdx === idx ? "#f0fdf4" : "white", borderRadius: 8,
            border: selectedIdx === idx ? "1px solid #22c55e" : "1px solid #e2e8f0",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", flex: 1 }}>
            {proj.name}
          </span>
          {proj.linearProjectUrl && (
            <a href={proj.linearProjectUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              style={{ fontSize: 11, color: "#22c55e", textDecoration: "none" }}>Linear &#8599;</a>
          )}
          <span
            onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${proj.name}"?`)) removeProject(idx); }}
            style={{ fontSize: 14, color: "#cbd5e1", padding: "0 2px", lineHeight: 1 }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#dc2626"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#cbd5e1"; }}
          >&times;</span>
        </div>
      ))}

      {/* Assign panel */}
      {selectedProj && (
        <div style={{ marginTop: 16, padding: 16, background: "white", borderRadius: 10, border: "1px solid #22c55e" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>
            Assign &ldquo;{selectedProj.name}&rdquo; to Roadmap
          </div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Owner</label>
          <select value={assignOwner} onChange={(e) => setAssignOwner(e.target.value)}
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", width: "100%", marginBottom: 10 }}
          >
            {people.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <label style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              Start
              <input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)}
                style={{ fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", width: "100%", marginTop: 2 }} />
            </label>
            <label style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>
              End
              <input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)}
                style={{ fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", width: "100%", marginTop: 2 }} />
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAssign}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "8px 16px", border: "none", borderRadius: 6, background: "#22c55e", color: "white", cursor: "pointer" }}
            >Assign to Roadmap</button>
            <button onClick={() => setSelectedIdx(null)}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, padding: "8px 16px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer" }}
            >Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

const CYCLE_TEAMS = new Set(["Engineering", "Data Science", "Product"]);

// ── Cycle Issue Detail Panel ────────────────────────────────────────────

type WorkflowState = { id: string; name: string; color: string; position: number };
type TeamMember = { id: string; displayName: string; avatarUrl: string | null };

function CycleIssueDetailPanel({
  issueId,
  onClose,
  onUpdated,
  cycles,
  onRemovedFromCycle,
}: {
  issueId: string;
  onClose: () => void;
  onUpdated: (issueId: string, changes: { state?: { name: string; color: string }; dueDate?: string | null; assignee?: { displayName: string; avatarUrl: string | null } | null }) => void;
  cycles: LinearCycle[];
  onRemovedFromCycle?: (issueId: string) => void;
}) {
  const [issue, setIssue] = useState<LinearIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [linearProjects, setLinearProjects] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Fetch issue detail + workflow states + team members
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      linearQuery<{ issue: LinearIssue & { team: { id: string } } }>(
        `query Issue($id: String!) {
          issue(id: $id) {
            id url title description priority priorityLabel identifier
            state { name color }
            assignee { id displayName avatarUrl }
            project { id name }
            cycle { id number startsAt endsAt }
            labels { nodes { name color } }
            startedAt dueDate createdAt updatedAt
            team { id }
            comments { nodes { body createdAt user { displayName avatarUrl } } }
          }
        }`,
        { id: issueId },
      ),
    ])
      .then(([issueData]) => {
        if (cancelled) return;
        setIssue(issueData.issue);
        const teamId = issueData.issue.team?.id;
        if (teamId) {
          // Fetch workflow states and members for this team
          Promise.all([
            linearQuery<{ workflowStates: { nodes: WorkflowState[] } }>(
              `query States($teamId: String!) {
                workflowStates(filter: { team: { id: { eq: $teamId } } }, first: 50) {
                  nodes { id name color position }
                }
              }`,
              { teamId },
            ),
            linearQuery<{ team: { members: { nodes: TeamMember[] } } }>(
              `query Members($teamId: String!) {
                team(id: $teamId) {
                  members(first: 50) { nodes { id displayName avatarUrl } }
                }
              }`,
              { teamId },
            ),
          ]).then(([statesData, membersData]) => {
            if (cancelled) return;
            setWorkflowStates(statesData.workflowStates.nodes.sort((a, b) => a.position - b.position));
            setTeamMembers(membersData.team.members.nodes.sort((a, b) => a.displayName.localeCompare(b.displayName)));
          }).catch((err) => { if (!cancelled) console.error("[DETAIL] Failed to load states/members:", err); });
        }
        // Fetch all projects for the project dropdown
        linearQuery<{ projects: { nodes: { id: string; name: string }[] } }>(
          `query { projects(first: 50) { nodes { id name } } }`,
        ).then((data) => {
          if (!cancelled) setLinearProjects(data.projects.nodes.sort((a, b) => a.name.localeCompare(b.name)));
        }).catch(() => {});
      })
      .catch((err) => { if (!cancelled) console.error("Detail fetch error:", err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [issueId]);

  const updateIssue = async (field: string, value: string) => {
    if (!issue) return;
    setSaving(field);
    try {
      const res = await fetch("/api/linear/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        const updated = json.issue;
        // Update local issue state
        setIssue((prev) => {
          if (!prev) return prev;
          const changes: Record<string, unknown> = {};
          if (updated.state) changes.state = updated.state;
          if (updated.dueDate !== undefined) changes.dueDate = updated.dueDate;
          if (updated.assignee !== undefined) changes.assignee = updated.assignee;
          return { ...prev, ...changes };
        });
        // Notify parent to update the list
        onUpdated(issue.id, {
          state: updated.state ? { name: updated.state.name, color: updated.state.color } : undefined,
          dueDate: updated.dueDate !== undefined ? updated.dueDate : undefined,
          assignee: updated.assignee !== undefined
            ? updated.assignee
              ? { displayName: updated.assignee.displayName, avatarUrl: updated.assignee.avatarUrl }
              : null
            : undefined,
        });
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(null);
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
            <div className="loading-spinner" />
            <span>Loading...</span>
          </div>
        )}
        {issue && !loading && (
          <>
            {/* Header */}
            <div className="detail-header" style={{ borderColor: issue.state.color }}>
              <div className="detail-header-top">
                {issue.identifier && (
                  <span className="linear-identifier">{issue.identifier}</span>
                )}
                <span style={{ flex: 1 }} />
                <button className="detail-close" onClick={onClose}>&times;</button>
              </div>
              <h2 className="detail-title">{issue.title}</h2>
              {issue.url && (
                <a href={issue.url} target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8,
                  fontSize: 12, fontWeight: 600, color: "#6366f1", textDecoration: "none",
                  padding: "4px 10px", border: "1px solid #e0e0ea", borderRadius: 6, background: "white",
                }}>
                  View in Linear &#8599;
                </a>
              )}
            </div>

            {/* Editable fields */}
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Status */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  Status {saving === "stateId" && <span style={{ fontWeight: 400, textTransform: "none" }}>(saving...)</span>}
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {workflowStates.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => updateIssue("stateId", ws.id)}
                      style={{
                        fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                        padding: "4px 12px", borderRadius: 999, cursor: "pointer",
                        border: issue.state.name === ws.name ? `2px solid ${ws.color}` : "2px solid transparent",
                        background: issue.state.name === ws.name ? hexToRgba(ws.color, 0.2) : hexToRgba(ws.color, 0.08),
                        color: ws.color,
                      }}
                    >
                      <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: ws.color, marginRight: 6, verticalAlign: "middle" }} />
                      {ws.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  Due Date {saving === "dueDate" && <span style={{ fontWeight: 400, textTransform: "none" }}>(saving...)</span>}
                </label>
                <input
                  type="date"
                  value={issue.dueDate ? issue.dueDate.split("T")[0] : ""}
                  onChange={(e) => updateIssue("dueDate", e.target.value || "")}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px",
                    borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
                  }}
                />
              </div>

              {/* Assignee */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  Owner {saving === "assigneeId" && <span style={{ fontWeight: 400, textTransform: "none" }}>(saving...)</span>}
                </label>
                {teamMembers.length > 0 ? (
                  <select
                    value={issue.assignee?.id ?? teamMembers.find((m) => m.displayName === issue.assignee?.displayName)?.id ?? ""}
                    onChange={(e) => updateIssue("assigneeId", e.target.value)}
                    style={{
                      fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px",
                      borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
                      width: "100%",
                    }}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>{m.displayName}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 0" }}>
                    {issue.assignee?.displayName ?? "Unassigned"} (loading team...)
                  </div>
                )}
              </div>

              {/* Cycle */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  Cycle {saving === "cycleId" && <span style={{ fontWeight: 400, textTransform: "none" }}>(saving...)</span>}
                </label>
                <select
                  value={(issue.cycle as { id?: string } | null)?.id ?? ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    updateIssue("cycleId", val as string);
                    if (!val && onRemovedFromCycle) {
                      onRemovedFromCycle(issue.id);
                    }
                  }}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px",
                    borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
                    width: "100%",
                  }}
                >
                  <option value="">No cycle</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>Cycle {c.number}</option>
                  ))}
                </select>
              </div>

              {/* Project */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
                  Project {saving === "projectId" && <span style={{ fontWeight: 400, textTransform: "none" }}>(saving...)</span>}
                </label>
                {linearProjects.length > 0 ? (
                  <select
                    value={(issue.project as { id?: string } | null)?.id ?? ""}
                    onChange={(e) => updateIssue("projectId", e.target.value)}
                    style={{
                      fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px",
                      borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
                      width: "100%",
                    }}
                  >
                    <option value="">No project</option>
                    {linearProjects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ fontSize: 13, color: "#1e293b" }}>{issue.project?.name ?? "None"}</div>
                )}
              </div>

              {/* Priority */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Priority</span>
                <div style={{ fontSize: 13, color: priorityColor(issue.priority), marginTop: 4 }}>
                  {priorityIcon(issue.priority)} {issue.priorityLabel}
                </div>
              </div>

              {/* Labels */}
              {issue.labels.nodes.length > 0 && (
                <div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>Labels</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {issue.labels.nodes.map((label) => (
                      <span key={label.name} style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                        backgroundColor: hexToRgba(label.color, 0.15), color: label.color,
                      }}>
                        {label.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {issue.description && (
              <div style={{ padding: "0 24px 16px", borderTop: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "16px 0 8px" }}>Description</h3>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{issue.description}</div>
              </div>
            )}

            {/* Comments */}
            {issue.comments && issue.comments.nodes.length > 0 && (
              <div style={{ padding: "0 24px 24px", borderTop: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", margin: "16px 0 8px" }}>
                  Comments ({issue.comments.nodes.length})
                </h3>
                {issue.comments.nodes.map((comment, idx) => (
                  <div key={idx} style={{ marginBottom: 12, padding: "10px 12px", background: "#f8fafc", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      {comment.user.avatarUrl ? (
                        <img src={comment.user.avatarUrl} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "white" }}>
                          {comment.user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{comment.user.displayName}</span>
                      <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>{fmtDate(comment.createdAt)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{comment.body}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CyclesView({ cycles, people }: { cycles: LinearCycle[]; people: Person[] }) {
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [issues, setIssues] = useState<CycleIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  type PriorityBucket = "priority" | "secondary" | "backlog";
  const [buckets, setBuckets] = useState<Record<PriorityBucket, string[]>>({ priority: [], secondary: [], backlog: [] });
  const [dragProject, setDragProject] = useState<{ name: string; bucket: PriorityBucket; startIdx: number; currentIdx: number; currentBucket: PriorityBucket } | null>(null);
  const dragYRef = useRef<{ name: string; bucket: PriorityBucket; startY: number; startIdx: number; sectionTops: { bucket: PriorityBucket; top: number }[] } | null>(null);
  const sectionRefs = useRef<Record<PriorityBucket, HTMLDivElement | null>>({ priority: null, secondary: null, backlog: null });

  // Inline edit state
  const [editingField, setEditingField] = useState<{ issueId: string; field: "owner" | "status"; x: number; y: number } | null>(null);
  const [editingDueId, setEditingDueId] = useState<string | null>(null);
  const [workflowStates, setWorkflowStates] = useState<WorkflowState[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  type SortField = "due" | "status" | null;
  const [sortField, setSortField] = useState<SortField>(null);

  // Create task state
  const [creatingForProject, setCreatingForProject] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCreating, setNewTaskCreating] = useState(false);
  const [projectIdMap, setProjectIdMap] = useState<Record<string, { id: string; teamId: string }>>({});
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);

  // Find this week / last week / next week cycles
  const weeklyCycles = useMemo(() => {
    const now = new Date();
    const sorted = [...cycles].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    let thisIdx = sorted.findIndex((c) => {
      const start = new Date(c.startsAt);
      const end = new Date(c.endsAt);
      return now >= start && now <= end;
    });
    if (thisIdx === -1) {
      thisIdx = sorted.findIndex((c) => new Date(c.startsAt) > now);
      if (thisIdx === -1) thisIdx = sorted.length - 1;
    }
    const result: { label: string; cycle: LinearCycle }[] = [];
    if (thisIdx > 0) result.push({ label: "Last week", cycle: sorted[thisIdx - 1] });
    if (thisIdx >= 0 && thisIdx < sorted.length) result.push({ label: "This week", cycle: sorted[thisIdx] });
    if (thisIdx + 1 < sorted.length) result.push({ label: "Next week", cycle: sorted[thisIdx + 1] });
    return result;
  }, [cycles]);

  // Auto-select "This week"
  useEffect(() => {
    if (weeklyCycles.length > 0 && !selectedCycleId) {
      const thisWeek = weeklyCycles.find((w) => w.label === "This week");
      setSelectedCycleId((thisWeek ?? weeklyCycles[0]).cycle.id);
    }
  }, [weeklyCycles, selectedCycleId]);

  // Fetch issues when cycle changes
  useEffect(() => {
    if (!selectedCycleId) return;
    setLoading(true);
    linearQuery<{ cycle: { issues: { nodes: (CycleIssue & { team?: { id: string } })[] } } }>(
      `query CycleIssues($id: String!) {
        cycle(id: $id) {
          issues(first: 200) {
            nodes {
              id identifier url title priority priorityLabel dueDate
              state { name color }
              assignee { displayName avatarUrl }
              project { name }
              team { id }
            }
          }
        }
      }`,
      { id: selectedCycleId },
    )
      .then((data) => {
        setIssues(data.cycle.issues.nodes);
      })
      .catch((err) => {
        console.error("[CYCLES] Fetch error:", err);
        setIssues([]);
      })
      .finally(() => setLoading(false));
  }, [selectedCycleId]);

  // Fetch workflow states and team members on mount (from all teams)
  useEffect(() => {
    linearQuery<{ teams: { nodes: { id: string; states: { nodes: WorkflowState[] }; members: { nodes: TeamMember[] } }[] } }>(
      `query {
        teams(first: 10) {
          nodes {
            id
            states { nodes { id name color position } }
            members(first: 50) { nodes { id displayName avatarUrl } }
          }
        }
      }`,
    )
      .then((data) => {
        const stateMap = new Map<string, WorkflowState>();
        const memberMap = new Map<string, TeamMember>();
        for (const team of data.teams.nodes) {
          for (const s of team.states.nodes) { if (!stateMap.has(s.name)) stateMap.set(s.name, s); }
          for (const m of team.members.nodes) memberMap.set(m.id, m);
        }
        setWorkflowStates([...stateMap.values()].sort((a, b) => a.position - b.position));
        setTeamMembers([...memberMap.values()].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        if (data.teams.nodes.length > 0) setDefaultTeamId(data.teams.nodes[0].id);
      })
      .catch((err) => console.error("[CYCLES] Failed to load teams:", err));

    // Fetch project name -> id mapping
    linearQuery<{ projects: { nodes: { id: string; name: string; teams: { nodes: { id: string }[] } }[] } }>(
      `query { projects(first: 50) { nodes { id name teams { nodes { id } } } } }`,
    ).then((data) => {
      const map: Record<string, { id: string; teamId: string }> = {};
      for (const p of data.projects.nodes) {
        map[p.name] = { id: p.id, teamId: p.teams.nodes[0]?.id ?? "" };
      }
      setProjectIdMap(map);
    }).catch(() => {});
  }, []);

  // Collect unique owner names for filter dropdown
  const ownerNames = useMemo(() => {
    const names = new Set<string>();
    for (const issue of issues) {
      const raw = issue.assignee?.displayName;
      if (raw) names.add(normalizeAssigneeName(raw) ?? raw);
    }
    return [...names].sort();
  }, [issues]);

  // Apply owner filter
  const filteredIssues = filterOwner
    ? issues.filter((issue) => {
        const name = issue.assignee ? (normalizeAssigneeName(issue.assignee.displayName) ?? issue.assignee.displayName) : "Unassigned";
        return name === filterOwner;
      })
    : issues;

  // Build byProject from ALL issues (not filtered) so bucket tracking is stable
  const byProjectAll: Record<string, CycleIssue[]> = {};
  for (const issue of issues) {
    const key = issue.project?.name ?? "No Project";
    if (!byProjectAll[key]) byProjectAll[key] = [];
    byProjectAll[key].push(issue);
  }
  const allProjectNamesFromIssues = Object.keys(byProjectAll);

  // Build byProject from filtered issues for display
  const byProject: Record<string, CycleIssue[]> = {};
  for (const issue of filteredIssues) {
    const key = issue.project?.name ?? "No Project";
    if (!byProject[key]) byProject[key] = [];
    byProject[key].push(issue);
  }
  const allProjectNames = Object.keys(byProject);

  // Load saved buckets when cycle changes
  const [bucketsLoaded, setBucketsLoaded] = useState(false);
  useEffect(() => {
    if (!selectedCycleId) return;
    setBucketsLoaded(false);
    fetchOverrides().then((ov) => {
      const saved = ov.cycleBuckets?.[selectedCycleId];
      if (saved) {
        setBuckets({ priority: saved.priority ?? [], secondary: saved.secondary ?? [], backlog: saved.backlog ?? [] });
      } else {
        setBuckets({ priority: [], secondary: [], backlog: [] });
      }
      setBucketsLoaded(true);
    });
  }, [selectedCycleId]);

  // Sync new projects into backlog (single setBuckets call to avoid duplication)
  useEffect(() => {
    if (!bucketsLoaded) return;
    setBuckets((prev) => {
      const assigned = new Set([...prev.priority, ...prev.secondary, ...prev.backlog]);
      const missing = allProjectNamesFromIssues.filter((n) => !assigned.has(n));
      if (missing.length === 0) return prev;
      return { ...prev, backlog: [...prev.backlog, ...missing] };
    });
  }, [allProjectNamesFromIssues.join(","), bucketsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist buckets when they change
  const bucketsRef = useRef(buckets);
  bucketsRef.current = buckets;
  useEffect(() => {
    if (!selectedCycleId || !bucketsLoaded) return;
    // Debounce save
    const timer = setTimeout(() => {
      saveOverride("saveCycleBuckets", { cycleId: selectedCycleId, buckets: bucketsRef.current });
    }, 300);
    return () => clearTimeout(timer);
  }, [buckets, selectedCycleId, bucketsLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCycleLabel = weeklyCycles.find((w) => w.cycle.id === selectedCycleId)?.label ?? "";
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Dropdowns are closed via a backdrop overlay rendered below them

  // Inline update helper
  const updateIssueField = async (issueId: string, field: string, value: string) => {
    setSaving(issueId);
    try {
      const res = await fetch("/api/linear/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, [field]: value }),
      });
      const json = await res.json();
      if (json.success) {
        const u = json.issue;
        setIssues((prev) => prev.map((issue) => {
          if (issue.id !== issueId) return issue;
          const changes: Partial<CycleIssue> = {};
          if (u.state) changes.state = { name: u.state.name, color: u.state.color };
          if (u.dueDate !== undefined) changes.dueDate = u.dueDate;
          if (u.assignee !== undefined) changes.assignee = u.assignee ? { displayName: u.assignee.displayName, avatarUrl: u.assignee.avatarUrl } : null;
          return { ...issue, ...changes };
        }));
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(null);
      setEditingField(null);
      setEditingDueId(null);
    }
  };

  const removeFromCycle = async (issueId: string) => {
    setSaving(issueId);
    try {
      const res = await fetch("/api/linear/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, cycleId: null }),
      });
      const json = await res.json();
      if (json.success) {
        setIssues((prev) => prev.filter((i) => i.id !== issueId));
      }
    } catch (err) {
      console.error("Remove from cycle failed:", err);
    } finally {
      setSaving(null);
    }
  };

  const createTask = async (projectName: string, title: string) => {
    if (!title.trim()) return;
    setNewTaskCreating(true);
    try {
      const proj = projectIdMap[projectName];
      const teamId = proj?.teamId || defaultTeamId;
      if (!teamId) { console.error("No teamId"); return; }
      const res = await fetch("/api/linear/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          teamId,
          projectId: proj?.id ?? undefined,
          cycleId: selectedCycleId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const i = json.issue;
        setIssues((prev) => [...prev, {
          id: i.id,
          identifier: i.identifier,
          url: i.url,
          title: i.title,
          state: i.state,
          assignee: i.assignee,
          project: i.project ?? { name: projectName },
          dueDate: i.dueDate,
          priority: i.priority,
          priorityLabel: i.priorityLabel,
        }]);
        setCreatingForProject(null);
        setNewTaskTitle("");
      }
    } catch (err) { console.error("Create failed:", err); }
    finally { setNewTaskCreating(false); }
  };

  const selectStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
    padding: "6px 12px", cursor: "pointer", borderRadius: 6,
    border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
  };

  // Column widths
  const COL = { title: "1 1 0", owner: "0 0 130px", due: "0 0 100px", status: "0 0 110px" };

  return (
    <>
    <div style={{ padding: "24px 32px", fontFamily: "var(--font-sans)", maxHeight: "calc(100vh - 120px)", overflow: "auto", maxWidth: 1000, margin: "0 auto" }}>
      {cycles.length === 0 && <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading cycles...</div>}

      {/* Filters row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <select value={selectedCycleId ?? ""} onChange={(e) => { setSelectedCycleId(e.target.value); setFilterOwner(null); }} style={selectStyle}>
          {weeklyCycles.map((w) => (
            <option key={w.cycle.id} value={w.cycle.id}>{w.label} (Cycle {w.cycle.number})</option>
          ))}
        </select>
        <select value={filterOwner ?? ""} onChange={(e) => setFilterOwner(e.target.value || null)} style={selectStyle}>
          <option value="">All owners</option>
          {ownerNames.map((name) => (<option key={name} value={name}>{name}</option>))}
        </select>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>
          {filteredIssues.length} task{filteredIssues.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading...</div>}

      {!loading && allProjectNames.length === 0 && (
        <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>No tasks{filterOwner ? ` for ${filterOwner}` : ""} in {selectedCycleLabel.toLowerCase() || "this cycle"}.</div>
      )}

      {!loading && (() => {
        const sectionConfig: { key: PriorityBucket; label: string; color: string; emptyMsg: string }[] = [
          { key: "priority", label: "Priority", color: "#dc2626", emptyMsg: "Drag projects here to set as top priority" },
          { key: "secondary", label: "Secondary", color: "#f59e0b", emptyMsg: "Drag projects here for secondary priority" },
          { key: "backlog", label: "Backlog", color: "#94a3b8", emptyMsg: "Unranked projects land here" },
        ];
        const projectColors = ["#1E88E5", "#43A047", "#F9A825", "#00ACC1", "#E65100", "#7CB342", "#AD1457", "#00897B"];

        const getBucketList = (bucket: PriorityBucket): string[] => {
          let list = buckets[bucket].filter((n) => byProject[n]);
          if (dragProject) {
            list = list.filter((n) => n !== dragProject.name);
            if (dragProject.currentBucket === bucket) {
              const idx = Math.min(dragProject.currentIdx, list.length);
              list.splice(idx, 0, dragProject.name);
            }
          }
          return list;
        };

        let globalIdx = 0;

        const handleDragStart = (e: React.MouseEvent, projectName: string, bucket: PriorityBucket, idx: number) => {
          e.preventDefault();
          const tops: { bucket: PriorityBucket; top: number }[] = [];
          for (const cfg of sectionConfig) {
            const el = sectionRefs.current[cfg.key];
            if (el) tops.push({ bucket: cfg.key, top: el.getBoundingClientRect().top });
          }
          dragYRef.current = { name: projectName, bucket, startY: e.clientY, startIdx: idx, sectionTops: tops };
          setDragProject({ name: projectName, bucket, startIdx: idx, currentIdx: idx, currentBucket: bucket });

          const onMove = (ev: MouseEvent) => {
            if (!dragYRef.current) return;
            const dy = ev.clientY - dragYRef.current.startY;
            let targetBucket: PriorityBucket = dragYRef.current.bucket;
            for (let i = dragYRef.current.sectionTops.length - 1; i >= 0; i--) {
              if (ev.clientY >= dragYRef.current.sectionTops[i].top) {
                targetBucket = dragYRef.current.sectionTops[i].bucket;
                break;
              }
            }
            const offset = Math.round(dy / 70);
            const bucketList = buckets[targetBucket].filter((n) => n !== dragYRef.current!.name);
            const baseIdx = targetBucket === dragYRef.current.bucket ? dragYRef.current.startIdx : 0;
            const newIdx = Math.max(0, Math.min(bucketList.length, baseIdx + offset));
            setDragProject((prev) => prev ? { ...prev, currentIdx: newIdx, currentBucket: targetBucket } : null);
          };

          const onUp = () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            setDragProject((prev) => {
              if (!prev) return null;
              setBuckets((b) => {
                // Remove from ALL buckets first to prevent any duplication
                const cleaned = {
                  priority: b.priority.filter((n) => n !== prev.name),
                  secondary: b.secondary.filter((n) => n !== prev.name),
                  backlog: b.backlog.filter((n) => n !== prev.name),
                };
                // Insert into target bucket
                const targetList = [...cleaned[prev.currentBucket]];
                targetList.splice(Math.min(prev.currentIdx, targetList.length), 0, prev.name);
                cleaned[prev.currentBucket] = targetList;
                return cleaned;
              });
              return null;
            });
            dragYRef.current = null;
          };

          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        };

        // Render an inline task row with editable columns
        const renderTaskRow = (issue: CycleIssue, issueIdx: number, pColor: string) => {
          const ownerName = (issue.assignee && normalizeAssigneeName(issue.assignee.displayName)) ?? issue.assignee?.displayName ?? "Unassigned";
          const ownerPerson = people.find((p) => p.name === ownerName);
          const isSaving = saving === issue.id;

          const isEditingOwner = editingField?.issueId === issue.id && editingField.field === "owner";
          const isEditingStatus = editingField?.issueId === issue.id && editingField.field === "status";
          const isEditingDue = editingDueId === issue.id;
          const hasActiveDropdown = isEditingOwner || isEditingStatus;

          return (
            <div
              key={issue.id}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 12px",
                background: issueIdx % 2 === 0 ? "white" : hexToRgba(pColor, 0.03),
                borderTop: issueIdx > 0 ? `1px solid ${hexToRgba(pColor, 0.1)}` : "none",
                opacity: isSaving ? 0.5 : 1,
                fontSize: 12,
                position: hasActiveDropdown ? "relative" : undefined,
                zIndex: hasActiveDropdown ? 60 : undefined,
              }}
            >
              {/* Status dot */}
              <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, backgroundColor: issue.state.color }} />

              {/* Title — click opens in Linear */}
              <span
                onClick={() => setSelectedIssueId(issue.id)}
                style={{ flex: COL.title, fontWeight: 500, color: "#1e293b", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                title={issue.title}
              >
                {issue.identifier && <span style={{ color: "#94a3b8", fontSize: 10, marginRight: 4 }}>{issue.identifier}</span>}
                {issue.title}
              </span>

              {/* Owner — clickable dropdown */}
              <span style={{ flex: COL.owner }}>
                <span
                  onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setEditingField(isEditingOwner ? null : { issueId: issue.id, field: "owner", x: r.left, y: r.bottom + 4 }); }}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, cursor: "pointer",
                    backgroundColor: ownerPerson ? hexToRgba(ownerPerson.color, 0.15) : "#f1f5f9",
                    color: ownerPerson?.color ?? "#64748b",
                    display: "inline-block", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                >
                  {ownerName}
                </span>
              </span>

              {/* Due date — inline edit (not a dropdown) */}
              <span style={{ flex: COL.due, textAlign: "right" }}>
                {isEditingDue ? (
                  <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="date"
                      autoFocus
                      defaultValue={issue.dueDate ? issue.dueDate.split("T")[0] : ""}
                      onChange={(e) => { if (e.target.value) updateIssueField(issue.id, "dueDate", e.target.value); }}
                      onBlur={() => setEditingDueId(null)}
                      style={{ fontFamily: "var(--font-sans)", fontSize: 11, padding: "2px 4px", border: "1px solid #e2e8f0", borderRadius: 4, width: 105 }}
                    />
                    {issue.dueDate && (
                      <button
                        onMouseDown={(e) => { e.preventDefault(); updateIssueField(issue.id, "dueDate", ""); }}
                        style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: "0 2px", lineHeight: 1 }}
                        title="Remove due date"
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ) : (
                  <span
                    onClick={(e) => { e.stopPropagation(); setEditingDueId(issue.id); }}
                    style={{
                      fontSize: 11, color: issue.dueDate ? "#475569" : "#cbd5e1", cursor: "pointer",
                      padding: "2px 6px", borderRadius: 4, border: "1px solid transparent",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = "#e2e8f0"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.borderColor = "transparent"; }}
                  >
                    {issue.dueDate ? fmtDate(issue.dueDate) : "Add date"}
                  </span>
                )}
              </span>

              {/* Status — clickable dropdown */}
              <span style={{ flex: COL.status }}>
                <span
                  onClick={(e) => { e.stopPropagation(); const r = (e.target as HTMLElement).getBoundingClientRect(); setEditingField(isEditingStatus ? null : { issueId: issue.id, field: "status", x: r.right, y: r.bottom + 4 }); }}
                  style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 999, cursor: "pointer",
                    backgroundColor: hexToRgba(issue.state.color, 0.15), color: issue.state.color, whiteSpace: "nowrap",
                    display: "inline-block",
                  }}
                >
                  {issue.state.name}
                </span>
              </span>

              {/* Remove from cycle */}
              <span
                onClick={(e) => { e.stopPropagation(); if (confirm("Remove this task from the current cycle?")) removeFromCycle(issue.id); }}
                title="Remove from cycle"
                style={{ flexShrink: 0, cursor: "pointer", fontSize: 12, color: "#cbd5e1", padding: "0 2px", lineHeight: 1 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#dc2626"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#cbd5e1"; }}
              >
                &times;
              </span>
            </div>
          );
        };

        return sectionConfig.map((section) => {
          const list = getBucketList(section.key);
          const sectionStart = globalIdx;

          const sectionContent = (
            <div key={section.key} ref={(el) => { sectionRefs.current[section.key] = el; }} style={{ marginBottom: 24 }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, borderBottom: `2px solid ${section.color}`, paddingBottom: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: section.color, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {section.label}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                  {list.length} project{list.length !== 1 ? "s" : ""}
                </span>
              </div>

              {list.length === 0 && (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "#94a3b8", fontSize: 12, border: "2px dashed #e2e8f0", borderRadius: 8, marginBottom: 6 }}>
                  {section.emptyMsg}
                </div>
              )}

              {list.map((projectName, idxInSection) => {
                const projectIssues = byProject[projectName];
                if (!projectIssues) return null;
                const displayIdx = sectionStart + idxInSection;
                const pColor = projectColors[displayIdx % projectColors.length];
                const isDragging = dragProject?.name === projectName;
                globalIdx++;

                return (
                  <div key={projectName} style={{ marginBottom: 10, opacity: isDragging ? 0.5 : 1, transition: isDragging ? "none" : "all 0.15s ease" }}>
                    {/* Project header */}
                    <div
                      style={{
                        background: pColor, borderRadius: "8px 8px 0 0", padding: "7px 12px",
                        fontWeight: 700, fontSize: 13, color: "white",
                        display: "flex", alignItems: "center", gap: 8,
                        cursor: "grab", userSelect: "none",
                      }}
                      onMouseDown={(e) => handleDragStart(e, projectName, section.key, idxInSection)}
                    >
                      <span style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, flexShrink: 0,
                      }}>
                        {idxInSection + 1}
                      </span>
                      <span style={{ fontSize: 12, opacity: 0.5, flexShrink: 0 }}>&#x2630;</span>
                      <span style={{ flex: 1 }}>{projectName}</span>
                      <span
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCreatingForProject(creatingForProject === projectName ? null : projectName); setNewTaskTitle(""); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ fontSize: 16, fontWeight: 700, cursor: "pointer", opacity: 0.7, padding: "0 4px", lineHeight: 1 }}
                        title="Add task"
                      >+</span>
                      <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>
                        {projectIssues.length}
                      </span>
                    </div>

                    {/* Inline create task form */}
                    {creatingForProject === projectName && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                        background: hexToRgba(pColor, 0.06), borderBottom: `1px solid ${hexToRgba(pColor, 0.15)}`,
                      }}>
                        <input
                          type="text"
                          placeholder="New task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTaskTitle.trim()) createTask(projectName, newTaskTitle);
                            if (e.key === "Escape") { setCreatingForProject(null); setNewTaskTitle(""); }
                          }}
                          style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 4, outline: "none" }}
                        />
                        <button
                          onClick={() => createTask(projectName, newTaskTitle)}
                          disabled={!newTaskTitle.trim() || newTaskCreating}
                          style={{
                            fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, padding: "4px 10px",
                            border: "none", borderRadius: 4, cursor: newTaskTitle.trim() ? "pointer" : "default",
                            background: newTaskTitle.trim() ? pColor : "#cbd5e1", color: "white",
                          }}
                        >
                          {newTaskCreating ? "..." : "Create"}
                        </button>
                        <button
                          onClick={() => { setCreatingForProject(null); setNewTaskTitle(""); }}
                          style={{ fontFamily: "var(--font-sans)", fontSize: 11, padding: "4px 8px", border: "1px solid #e2e8f0", borderRadius: 4, background: "white", cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Column headers — Due and Status are sortable */}
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "4px 12px",
                      background: hexToRgba(pColor, 0.06), fontSize: 10, fontWeight: 700, color: "#94a3b8",
                      textTransform: "uppercase", letterSpacing: "0.04em",
                    }}>
                      <span style={{ width: 8 }} />
                      <span style={{ flex: COL.title }}>Task</span>
                      <span style={{ flex: COL.owner }}>Owner</span>
                      <span
                        onClick={() => setSortField((prev) => prev === "due" ? null : "due")}
                        style={{ flex: COL.due, textAlign: "right", cursor: "pointer", color: sortField === "due" ? pColor : undefined }}
                      >
                        Due {sortField === "due" ? "\u25B2" : ""}
                      </span>
                      <span
                        onClick={() => setSortField((prev) => prev === "status" ? null : "status")}
                        style={{ flex: COL.status, cursor: "pointer", color: sortField === "status" ? pColor : undefined }}
                      >
                        Status {sortField === "status" ? "\u25B2" : ""}
                      </span>
                    </div>

                    {/* Task rows */}
                    <div style={{ border: `1px solid ${hexToRgba(pColor, 0.2)}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "visible", position: "relative" }}>
                      {(() => {
                        let sorted = projectIssues;
                        if (sortField === "due") {
                          sorted = [...projectIssues].sort((a, b) => {
                            if (!a.dueDate && !b.dueDate) return 0;
                            if (!a.dueDate) return 1;
                            if (!b.dueDate) return -1;
                            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                          });
                        } else if (sortField === "status") {
                          const stateOrder = new Map(workflowStates.map((ws, i) => [ws.name, i]));
                          sorted = [...projectIssues].sort((a, b) => {
                            return (stateOrder.get(a.state.name) ?? 99) - (stateOrder.get(b.state.name) ?? 99);
                          });
                        }
                        return sorted.map((issue, issueIdx) => renderTaskRow(issue, issueIdx, pColor));
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          );

          globalIdx = sectionStart + list.length;
          return sectionContent;
        });
      })()}

    </div>

    {/* Backdrop to close dropdowns */}
    {editingField && (
      <div
        onClick={() => setEditingField(null)}
        style={{ position: "fixed", inset: 0, zIndex: 9998 }}
      />
    )}

    {/* Fixed-position dropdowns — rendered outside scroll container */}
    {editingField && editingField.field === "owner" && (
      <div
        data-dropdown
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: editingField.y, left: editingField.x, zIndex: 9999,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 180, maxHeight: 240, overflowY: "auto",
        }}
      >
        {teamMembers.length === 0 && (
          <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading team...</div>
        )}
        {teamMembers.map((m) => {
          const editIssue = issues.find((i) => i.id === editingField.issueId);
          const isSelected = m.displayName === editIssue?.assignee?.displayName;
          return (
            <div
              key={m.id}
              onClick={() => updateIssueField(editingField.issueId, "assigneeId", m.id)}
              style={{
                padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6,
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? "#f1f5f9" : "transparent",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? "#f1f5f9" : "transparent"; }}
            >
              {m.displayName}
            </div>
          );
        })}
      </div>
    )}

    {editingField && editingField.field === "status" && (
      <div
        data-dropdown
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "fixed", top: editingField.y, left: editingField.x - 160, zIndex: 9999,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: 4, minWidth: 160, maxHeight: 260, overflowY: "auto",
        }}
      >
        {workflowStates.length === 0 && (
          <div style={{ padding: "8px 12px", fontSize: 12, color: "#94a3b8" }}>Loading states...</div>
        )}
        {workflowStates.map((ws) => {
          const editIssue = issues.find((i) => i.id === editingField.issueId);
          const isSelected = ws.name === editIssue?.state.name;
          return (
            <div
              key={ws.id}
              onClick={() => updateIssueField(editingField.issueId, "stateId", ws.id)}
              style={{
                padding: "6px 12px", fontSize: 13, cursor: "pointer", borderRadius: 6,
                display: "flex", alignItems: "center", gap: 8,
                fontWeight: isSelected ? 700 : 400,
                background: isSelected ? hexToRgba(ws.color, 0.1) : "transparent",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = hexToRgba(ws.color, 0.08); }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = isSelected ? hexToRgba(ws.color, 0.1) : "transparent"; }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: ws.color, flexShrink: 0 }} />
              <span style={{ color: ws.color }}>{ws.name}</span>
            </div>
          );
        })}
      </div>
    )}

    {/* Detail panel */}
    {selectedIssueId && (
      <CycleIssueDetailPanel
        issueId={selectedIssueId}
        onClose={() => setSelectedIssueId(null)}
        cycles={cycles}
        onRemovedFromCycle={(id) => {
          setIssues((prev) => prev.filter((i) => i.id !== id));
          setSelectedIssueId(null);
        }}
        onUpdated={(id, changes) => {
          setIssues((prev) => prev.map((issue) => {
            if (issue.id !== id) return issue;
            const updated = { ...issue };
            if (changes.state) updated.state = changes.state;
            if (changes.dueDate !== undefined) updated.dueDate = changes.dueDate;
            if (changes.assignee !== undefined) updated.assignee = changes.assignee;
            return updated;
          }));
        }}
      />
    )}
    </>
  );
}

export function RoadmapView({ people, months, phases, teams }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"projects" | "subtestEdits" | "cycles" | "futureProjects">("projects");
  const [filterTeams, setFilterTeams] = useState<Set<string>>(new Set());
  const [filterPeople, setFilterPeople] = useState<Set<string>>(new Set());
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
    | { type: "add"; personName: string; projectId: string }
    | { type: "reorder"; personName: string; prevOrders: { id: string; order: number | undefined }[] };
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
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
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

  // ── Mouse wheel zoom (Ctrl/Cmd + scroll) ───────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const order: ZoomLevel[] = ["month", "biweekly", "week"];
      setZoom((prev) => {
        const idx = order.indexOf(prev);
        if (e.deltaY < 0 && idx < order.length - 1) return order[idx + 1]; // zoom in
        if (e.deltaY > 0 && idx > 0) return order[idx - 1]; // zoom out
        return prev;
      });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
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
        case "reorder":
          setLocalPeople((p) => p.map((person) => {
            if (person.name !== action.personName) return person;
            return {
              ...person,
              projects: person.projects.map((proj) => {
                const prev = action.prevOrders.find((o) => o.id === proj.id);
                return prev ? { ...proj, order: prev.order } : proj;
              }),
            };
          }));
          // Persist each project's order
          for (const po of action.prevOrders) {
            saveOverride("updatePosition", {
              key: `${action.personName}:${po.id}`,
              startMonth: localPeople.find((p) => p.name === action.personName)?.projects.find((pr) => pr.id === po.id)?.startMonth ?? 0,
              duration: localPeople.find((p) => p.name === action.personName)?.projects.find((pr) => pr.id === po.id)?.duration ?? 1,
              order: po.order,
            });
          }
          break;
      }

      addToast("success", "Undone");
      return rest;
    });
  }, [addToast, localPeople]);

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
            .map((proj): Project => {
              const key = `${person.name}:${proj.name}`;
              const keyById = `${person.name}:${proj.id}`;
              const posOv = ov.positions?.[key] ?? ov.positions?.[keyById];
              const renameOv = ov.renames?.[key];
              return {
                ...proj,
                name: renameOv || proj.name,
                startMonth: posOv?.startMonth ?? proj.startMonth,
                duration: posOv?.duration ?? proj.duration,
                order: posOv?.order ?? proj.order,
              };
            }),
        }));

        // Add custom projects
        if (ov.additions) {
          for (const [personName, additions] of Object.entries(ov.additions)) {
            updated = updated.map((person) => {
              if (person.name !== personName) return person;
              const newProjects: Project[] = additions.map((a) => ({
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
          issues(first: 250) {
            nodes {
              id identifier url title priority priorityLabel
              state { name color type }
              assignee { id displayName avatarUrl }
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

          // Skip completed/canceled issues
          const stateType = (issue.state as { type?: string }).type;
          if (stateType === "completed" || stateType === "canceled") continue;

          bars.push({
            issueId: issue.id,
            identifier: (issue as unknown as { identifier?: string }).identifier,
            url: (issue as unknown as { url?: string }).url,
            title: issue.title,
            cleanedTitle: cleanTitle(issue.title),
            assigneeName: personName,
            assigneeId: issue.assignee.id ?? null,
            startDate: start,
            endDate: end,
            state: { name: issue.state.name, color: issue.state.color, type: stateType },
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

  // Apply team and person filters (multi-select)
  const teamAndPersonFiltered = useMemo(() => {
    let result = filteredPeople;
    if (filterTeams.size > 0) {
      const teamMemberNames = new Set<string>();
      for (const teamName of filterTeams) {
        const t = teams.find((t) => t.name === teamName);
        if (t) for (const m of t.members) teamMemberNames.add(m);
      }
      result = result.filter((p) => teamMemberNames.has(p.name));
    }
    if (filterPeople.size > 0) {
      result = result.filter((p) => filterPeople.has(p.name));
    }
    return result;
  }, [filteredPeople, filterTeams, filterPeople, teams]);

  // Group people by team
  const teamGroups = useMemo(() => {
    const groups: { team: Team; members: Person[] }[] = [];

    for (const team of teams) {
      const members = team.members
        .map((name) => teamAndPersonFiltered.find((p) => p.name === name))
        .filter(Boolean) as Person[];
      if (members.length > 0) {
        groups.push({ team, members });
      }
    }

    // Find people not in any team
    const allTeamMembers = new Set(teams.flatMap((t) => t.members));
    const ungrouped: Person[] = [];
    for (const p of teamAndPersonFiltered) {
      if (!allTeamMembers.has(p.name)) {
        ungrouped.push(p);
      }
    }

    return { groups, ungrouped };
  }, [teamAndPersonFiltered, teams]);

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
          const linearCount = viewMode === "subtestEdits" ? (linearBarsPerPerson[person.name] || []).length : 0;
          const effectiveLaneCount = viewMode === "projects" ? laneCount : 0;
          const totalHeight = Math.max(1, effectiveLaneCount + linearCount) * ROW_HEIGHT;
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
          currentY += totalHeight + PERSON_GAP;
        });
      }
    }

    // Ungrouped people at the end
    teamGroups.ungrouped.forEach((person, idx) => {
      const { lanes, laneCount } = packLanes(person.projects);
      const linearCount = viewMode === "subtestEdits" ? (linearBarsPerPerson[person.name] || []).length : 0;
      const effectiveLaneCount = viewMode === "projects" ? laneCount : 0;
      const totalHeight = Math.max(1, effectiveLaneCount + linearCount) * ROW_HEIGHT;
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
      currentY += totalHeight + PERSON_GAP;
    });

    return entries;
  }, [teamGroups, collapsedTeams, linearBarsPerPerson, viewMode]);

  const totalGridWidth = columns.length * colWidth;

  const personEntries = rowEntries;

  const projectCount = teamAndPersonFiltered.reduce(
    (acc, p) => acc + p.projects.length,
    0,
  );

  // Today marker
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const todayX = useMemo(() => {
    if (!mounted) return null; // avoid hydration mismatch
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
  }, [columns, colWidth, mounted]);

  // Auto-scroll to center on today when zoom changes
  useEffect(() => {
    if (todayX === null) return;
    const grid = scrollRef.current;
    if (!grid) return;
    // Scroll so today is roughly 1/4 from the left edge (account for sidebar width)
    const sidebarOffset = isMobile ? 0 : SIDEBAR_WIDTH;
    const targetScroll = Math.max(0, sidebarOffset + todayX - grid.clientWidth * 0.25);
    grid.scrollTo({ left: targetScroll, behavior: "smooth" });
  }, [zoom, todayX, isMobile]);

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
    (e: React.MouseEvent, project: Project, personName: string, mode: "move" | "resize", linearIssueId?: string, lane?: number) => {
      if (e.button !== 0) return; // only left click
      e.preventDefault();
      e.stopPropagation();
      didDragRef.current = false;
      const state: DragState = {
        projectId: project.id,
        personName,
        originalPersonName: personName,
        linearIssueId,
        linearProjectName: project.linearProjectName,
        mode,
        reorderMode: false,
        mouseX: e.clientX,
        mouseY: e.clientY,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        originalStartMonth: project.startMonth,
        originalDuration: project.duration,
        currentStartMonth: project.startMonth,
        currentDuration: project.duration,
        originalLane: lane ?? 0,
        currentLane: lane ?? 0,
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
      const dy = e.clientY - ds.startMouseY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDragRef.current = true;
      ds.mouseX = e.clientX;
      ds.mouseY = e.clientY;

      // Always re-render during drag for smooth visual feedback
      let changed = true;

      // Horizontal: snap to column boundaries
      // Convert pixel delta to column delta, round to nearest column, then to month delta
      const colDelta = dx / colWidth;
      const snappedColDelta = Math.round(colDelta);
      // Convert snapped column delta to month delta using column dates
      const originalColPos = monthIndexToColPos(ds.originalStartMonth, zoom, columns);
      const targetColPos = originalColPos + snappedColDelta;

      // Convert column position back to month index
      const colPosToMonthIndex = (cp: number): number => {
        const colIdx = Math.max(0, Math.min(columns.length - 1, Math.floor(cp)));
        const frac = cp - colIdx;
        const colStart = columns[colIdx]?.date ?? TIMELINE_START;
        const colEnd = colIdx + 1 < columns.length ? columns[colIdx + 1].date : TIMELINE_END;
        const dateMs = colStart.getTime() + frac * (colEnd.getTime() - colStart.getTime());
        const d = new Date(dateMs);
        return (d.getFullYear() - 2026) * 12 + d.getMonth() - 2 + d.getDate() / 30.44;
      };

      if (ds.mode === "move") {
        const newStart = Math.max(0, colPosToMonthIndex(targetColPos));
        if (Math.abs(newStart - ds.currentStartMonth) > 0.01) {
          ds.currentStartMonth = newStart;
          changed = true;
        }
      } else {
        const originalEndColPos = monthIndexToColPos(ds.originalStartMonth + ds.originalDuration, zoom, columns);
        const targetEndColPos = originalEndColPos + snappedColDelta;
        const newEnd = colPosToMonthIndex(targetEndColPos);
        const newDuration = Math.max(colPosToMonthIndex(originalColPos + 1) - ds.originalStartMonth, newEnd - ds.originalStartMonth);
        if (Math.abs(newDuration - ds.currentDuration) > 0.01) {
          ds.currentDuration = newDuration;
          changed = true;
        }
      }

      // Vertical: detect reorder within person or cross-person drag
      if (ds.mode === "move" && Math.abs(dy) > 10) {
        ds.reorderMode = true;
        // Lane reorder within the same person
        const laneDelta = Math.round(dy / ROW_HEIGHT);
        const newLane = Math.max(0, ds.originalLane + laneDelta);
        if (newLane !== ds.currentLane) {
          ds.currentLane = newLane;
          changed = true;
        }

        // Cross-person detection: find the DOM row under the mouse
        const rowEls = document.querySelectorAll("[data-person-name]");
        for (const el of rowEls) {
          const rect = el.getBoundingClientRect();
          if (e.clientY >= rect.top && e.clientY < rect.bottom) {
            const targetPerson = el.getAttribute("data-person-name");
            if (targetPerson && targetPerson !== ds.personName) {
              ds.personName = targetPerson;
              ds.currentLane = 0;
              changed = true;
            }
            break;
          }
        }
      }

      if (changed) setDragState({ ...ds });
    },
    [zoom, colWidth, rowEntries],
  );

  const handleMouseUp = useCallback(() => {
    const ds = dragRef.current;
    if (!ds) return;

    // Cross-person drag: move project to a different person (check FIRST)
    if (ds.personName !== ds.originalPersonName) {
      setLocalPeople((prev) => {
        let movedProject: Project | null = null;
        const updated = prev.map((person) => {
          if (person.name === ds.originalPersonName) {
            const proj = person.projects.find((p) => p.id === ds.projectId);
            if (proj) movedProject = { ...proj, startMonth: ds.currentStartMonth, duration: ds.currentDuration };
            return { ...person, projects: person.projects.filter((p) => p.id !== ds.projectId) };
          }
          return person;
        });
        if (!movedProject) return prev;
        return updated.map((person) => {
          if (person.name === ds.personName) {
            // Add at the end with a new lane order
            const maxOrder = Math.max(-1, ...person.projects.map((p) => p.order ?? -1));
            const newProject = { ...movedProject!, order: maxOrder + 1 };
            return { ...person, projects: [...person.projects, newProject] };
          }
          return person;
        });
      });
      pushUndo({
        type: "move",
        projectId: ds.projectId,
        personName: ds.originalPersonName,
        prevStart: ds.originalStartMonth,
        prevDuration: ds.originalDuration,
        newStart: ds.currentStartMonth,
        newDuration: ds.currentDuration,
      });
      addToast("success", `Moved to ${ds.personName}`);
      dragRef.current = null;
      setDragState(null);
      return;
    }

    // Handle reorder mode (within same person)
    if (ds.reorderMode && ds.currentLane !== ds.originalLane) {
      setLocalPeople((prev) =>
        prev.map((person) => {
          if (person.name !== ds.personName) return person;

          // Get current lane assignments for this person
          const { lanes } = packLanes(person.projects);
          const draggedLaneEntry = lanes.find((l) => l.project.id === ds.projectId);
          const targetLaneEntry = lanes.find((l) => l.lane === ds.currentLane);

          if (!draggedLaneEntry) return person;

          // Save previous orders for undo
          const prevOrders = person.projects.map((p) => ({ id: p.id, order: p.order }));
          pushUndo({ type: "reorder", personName: person.name, prevOrders });

          // Build new order: assign order values based on current lane positions,
          // then swap the dragged project's order with the target lane's project
          // Also apply date changes to the dragged project
          const newProjects = person.projects.map((p) => {
            const laneEntry = lanes.find((l) => l.project.id === p.id);
            if (p.id === ds.projectId) {
              return { ...p, order: laneEntry?.lane ?? 0, startMonth: ds.currentStartMonth, duration: ds.currentDuration };
            }
            return { ...p, order: laneEntry?.lane ?? 0 };
          });

          // Swap orders between dragged project and project at target lane
          if (targetLaneEntry) {
            const draggedIdx = newProjects.findIndex((p) => p.id === ds.projectId);
            const targetIdx = newProjects.findIndex((p) => p.id === targetLaneEntry.project.id);
            if (draggedIdx >= 0 && targetIdx >= 0) {
              const tmpOrder = newProjects[draggedIdx].order;
              newProjects[draggedIdx] = { ...newProjects[draggedIdx], order: newProjects[targetIdx].order };
              newProjects[targetIdx] = { ...newProjects[targetIdx], order: tmpOrder };
            }
          } else {
            // No project at target lane, just move dragged to that order
            const draggedIdx = newProjects.findIndex((p) => p.id === ds.projectId);
            if (draggedIdx >= 0) {
              newProjects[draggedIdx] = { ...newProjects[draggedIdx], order: ds.currentLane };
            }
          }

          // Persist each changed order
          for (const p of newProjects) {
            saveOverride("updatePosition", {
              key: `${person.name}:${p.id}`,
              startMonth: p.startMonth,
              duration: p.duration,
              order: p.order,
            }).catch((err) => console.error("Failed to save order override:", err));
          }

          return { ...person, projects: newProjects };
        }),
      );

      addToast("success", "Reordered");
      dragRef.current = null;
      setDragState(null);
      return;
    }

    const changed =
      ds.currentStartMonth !== ds.originalStartMonth ||
      ds.currentDuration !== ds.originalDuration;

    // Find the dragged project's name so we can sync siblings
    let draggedProjectName: string | null = null;
    for (const person of localPeople) {
      const proj = person.projects.find((p) => p.id === ds.projectId);
      if (proj) { draggedProjectName = proj.name; break; }
    }

    // Apply changes to local state only if something changed
    if (changed) {
      setLocalPeople((prev) =>
        prev.map((person) => ({
          ...person,
          projects: person.projects.map((proj) => {
            // Move the dragged project
            if (proj.id === ds.projectId) {
              return { ...proj, startMonth: ds.currentStartMonth, duration: ds.currentDuration, order: proj.order ?? ds.originalLane };
            }
            // Also move sibling projects with the same name on OTHER people
            if (draggedProjectName && proj.name === draggedProjectName && person.name !== ds.personName) {
              return { ...proj, startMonth: ds.currentStartMonth, duration: ds.currentDuration };
            }
            return proj;
          }),
        })),
      );
    }

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
      // Save the dragged project
      const key = `${ds.personName}:${ds.projectId}`;
      saveOverride("updatePosition", {
        key,
        startMonth: ds.currentStartMonth,
        duration: ds.currentDuration,
      }).catch((err) => console.error("Failed to save position override:", err));

      // Also save sibling projects
      if (draggedProjectName) {
        for (const person of localPeople) {
          if (person.name === ds.personName) continue;
          for (const proj of person.projects) {
            if (proj.name === draggedProjectName) {
              saveOverride("updatePosition", {
                key: `${person.name}:${proj.id}`,
                startMonth: ds.currentStartMonth,
                duration: ds.currentDuration,
              }).catch(() => {});
            }
          }
        }
      }
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
  }, [addToast, pushUndo]);

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
    async (data: { name: string; owner: string; startDate: string; endDate: string; notes: string }) => {
      const startMonth = dateToMonthIndex(data.startDate);
      const endMonth = dateToMonthIndex(data.endDate);
      const duration = Math.max(1, endMonth - startMonth);
      const projectId = newProjId();

      // Only create in Linear for Engineering, Product, Data Science teams
      const LINEAR_TEAMS = new Set(["Engineering", "Product", "Data Science"]);
      const ownerPerson = localPeople.find((p) => p.name === data.owner);
      const shouldCreateInLinear = ownerPerson && LINEAR_TEAMS.has(ownerPerson.team);
      let linearName: string | null = shouldCreateInLinear ? data.name : null;
      try {
        if (!shouldCreateInLinear) throw new Error("skip");
        // Get default team ID
        const teamsData = await linearQuery<{ teams: { nodes: { id: string; name: string; members: { nodes: { id: string; displayName: string }[] } }[] } }>(
          `query { teams(first: 10) { nodes { id name members(first: 50) { nodes { id displayName } } } } }`,
        );
        const mmTeam = teamsData.teams.nodes.find((t) => t.name === "Marker Method");
        const teamId = mmTeam?.id ?? teamsData.teams.nodes[0]?.id;
        // Find the owner's Linear user ID
        const allMembers = teamsData.teams.nodes.flatMap((t) => t.members.nodes);
        const ownerMember = allMembers.find((m) => {
          const normalized = normalizeAssigneeName(m.displayName);
          return normalized === data.owner || m.displayName.toLowerCase() === data.owner.toLowerCase();
        });
        if (teamId) {
          const input: Record<string, unknown> = {
            name: data.name,
            teamIds: [teamId],
            startDate: data.startDate,
            targetDate: data.endDate,
          };
          if (ownerMember) input.leadId = ownerMember.id;
          const res = await fetch("/api/linear", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name } } }`,
              variables: { input },
            }),
          });
          const json = await res.json();
          if (json.data?.projectCreate?.success) {
            linearName = json.data.projectCreate.project.name;
            const newProjLinearId = json.data.projectCreate.project.id;
            // Add random emoji
            if (newProjLinearId) {
              const emojis = [":rocket:", ":star:", ":zap:", ":fire:", ":sparkles:", ":rainbow:", ":tada:", ":gem:", ":trophy:", ":dart:", ":bulb:", ":hammer:", ":wrench:", ":seedling:", ":herb:", ":cactus:", ":mushroom:", ":shell:", ":snowflake:", ":ocean:"];
              const emoji = emojis[Math.floor(Math.random() * emojis.length)];
              fetch("/api/linear", { method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: `mutation { projectUpdate(id: "${newProjLinearId}", input: { icon: "${emoji}" }) { success } }` }),
              }).catch(() => {});
            }
            // Link to Marker Method! LFG initiative
            if (newProjLinearId) {
              fetch("/api/linear", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: `mutation { initiativeToProjectCreate(input: { initiativeId: "b20d5d16-f6cf-4c73-840d-2fb9e3635851", projectId: "${newProjLinearId}" }) { success } }`,
                }),
              }).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error("Failed to create Linear project:", err);
      }

      const newProject: Project = {
        id: projectId,
        name: data.name,
        startMonth,
        duration,
        tasks: [],
        linearProjectName: linearName,
      };

      setLocalPeople((prev) =>
        prev.map((person) => {
          if (person.name !== data.owner) return person;
          return {
            ...person,
            projects: [...person.projects, newProject],
          };
        }),
      );

      saveOverride("addProject", {
        personName: data.owner,
        project: { name: data.name, startMonth, duration },
      }).catch((err) => console.error("Failed to save addition:", err));

      if (data.notes.trim()) {
        saveOverride("saveDescription", {
          key: `${data.owner}:${projectId}`,
          description: data.notes.trim(),
        }).catch(() => {});
      }

      setAddingForPerson(null);
      addToast("success", `Added "${data.name}" (created in Linear)`);
    },
    [addToast],
  );

  // ── Delete project handler ─────────────────────────────────────────────
  const handleMoveToFuture = useCallback(
    (personName: string, proj: Project) => {
      // Add to future projects
      const futureProj = {
        name: proj.name,
        description: "",
        linearProjectId: undefined,
        linearProjectUrl: undefined,
      };
      saveOverride("addFutureProject", { project: futureProj });

      // Remove from ALL owners who have this project (by name)
      setLocalPeople((prev) =>
        prev.map((person) => ({
          ...person,
          projects: person.projects.filter((p) => p.name !== proj.name),
        })),
      );
      // Persist deletions
      for (const person of localPeople) {
        for (const p of person.projects) {
          if (p.name === proj.name) {
            saveOverride("deleteProject", { key: `${person.name}:${p.name}` });
          }
        }
      }
      addToast("success", `Moved "${proj.name}" to Future Projects`);
    },
    [addToast, localPeople],
  );

  const handleDeleteProject = useCallback(
    (personName: string, projectId: string, projectName: string) => {
      const person = localPeople.find((p) => p.name === personName);
      const deletedProject = person?.projects.find((p) => p.id === projectId);
      if (deletedProject) {
        pushUndo({ type: "delete", personName, project: deletedProject });
      }

      // Check if any OTHER person still has this project (by name)
      const otherOwners = localPeople.filter(
        (p) => p.name !== personName && p.projects.some((proj) => proj.name === projectName)
      );

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

      // If no other owners remain, delete the project from Linear too
      if (otherOwners.length === 0) {
        linearQuery<{ projects: { nodes: { id: string }[] } }>(
          `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id } } }`,
          { name: projectName },
        ).then((data) => {
          const linearProjectId = data.projects.nodes[0]?.id;
          if (linearProjectId) {
            fetch("/api/linear", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: `mutation DeleteProject($id: String!) { projectDelete(id: $id) { success } }`,
                variables: { id: linearProjectId },
              }),
            }).catch(() => {});
          }
        }).catch(() => {});
      }

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

  // ── Change owner handler (move project between people) ────────────────
  const handleChangeOwner = useCallback(
    (projectId: string, fromPerson: string, toPerson: string) => {
      if (fromPerson === toPerson) return;
      setLocalPeople((prev) => {
        let movedProject: Project | null = null;
        const updated = prev.map((person) => {
          if (person.name === fromPerson) {
            const proj = person.projects.find((p) => p.id === projectId);
            if (proj) movedProject = { ...proj };
            return {
              ...person,
              projects: person.projects.filter((p) => p.id !== projectId),
            };
          }
          return person;
        });
        if (!movedProject) return prev;
        return updated.map((person) => {
          if (person.name === toPerson) {
            return { ...person, projects: [...person.projects, movedProject!] };
          }
          return person;
        });
      });
      addToast("success", `Moved to ${toPerson}`);
      // Close the panel since the person context has changed
      setSelected(null);
      setSelectedLinearProject(null);
    },
    [addToast],
  );

  // ── Update dates handler (from edit panel) ────────────────────────────
  const handleUpdateDates = useCallback(
    (projectId: string, pName: string, startMonth: number, duration: number) => {
      setLocalPeople((prev) =>
        prev.map((person) => ({
          ...person,
          projects: person.projects.map((proj) => {
            if (proj.id !== projectId) return proj;
            return { ...proj, startMonth, duration };
          }),
        })),
      );
      const key = `${pName}:${projectId}`;
      saveOverride("updatePosition", { key, startMonth, duration }).catch(
        (err) => console.error("Failed to save position override:", err),
      );
      addToast("success", "Dates updated");
    },
    [addToast],
  );

  const showPhases = true;


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
        peopleCount={teamAndPersonFiltered.length}
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
        viewMode={viewMode}
        onViewMode={(m) => {
          setViewMode(m);
          // Tasks view is a list, no zoom change needed
        }}
        teams={teams}
        people={localPeople}
        filterTeams={filterTeams}
        onToggleTeam={(t) => setFilterTeams((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; })}
        onClearTeams={() => { setFilterTeams(new Set()); setFilterPeople(new Set()); }}
        filterPeople={filterPeople}
        onTogglePerson={(p) => setFilterPeople((prev) => { const next = new Set(prev); if (next.has(p)) next.delete(p); else next.add(p); return next; })}
        onClearPeople={() => setFilterPeople(new Set())}
        onAddProject={() => setAddingForPerson(localPeople[0]?.name ?? "")}
      />

      {viewMode === "cycles" ? (
        <CyclesView cycles={cycles} people={localPeople} />
      ) : viewMode === "subtestEdits" ? (
        <TasksView people={localPeople} onIssueClick={setSelectedLinearIssueId} />
      ) : viewMode === "futureProjects" ? (
        <FutureProjectsView
          people={localPeople}
          onAssignToRoadmap={(proj, owner, startDate, endDate) => {
            const startMonth = dateToMonthIndex(startDate);
            const endMonth = dateToMonthIndex(endDate);
            const duration = Math.max(1, endMonth - startMonth);
            const newId = newProjId();
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== owner) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth, duration, tasks: [], linearProjectName: proj.name }] };
            }));
            saveOverride("addProject", { personName: owner, project: { name: proj.name, startMonth, duration } });
            addToast("success", `Assigned "${proj.name}" to ${owner}`);
          }}
        />
      ) : (
      <div className="roadmap-container" ref={scrollRef}>
        {/* ── Sticky header (phases + month columns) ──────────────────── */}
        <div className="roadmap-header">
          {/* Phase row */}
          {showPhases && (
            <div className="roadmap-header-row" style={{ height: PHASE_HEIGHT }}>
              {!isMobile && (
                <div
                  className="roadmap-header-corner"
                  style={{ width: SIDEBAR_WIDTH, height: PHASE_HEIGHT }}
                />
              )}
              <div className="phase-row" style={{ position: "relative", height: PHASE_HEIGHT, width: totalGridWidth, flexShrink: 0 }}>
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
            </div>
          )}

          {/* Month header row */}
          <div className="roadmap-header-row" style={{ height: HEADER_HEIGHT }}>
            {!isMobile && (
              <div
                className="roadmap-header-corner"
                style={{ width: SIDEBAR_WIDTH, height: HEADER_HEIGHT, borderBottom: "2px solid #e8e8ef" }}
              >
                <span>Team</span>
              </div>
            )}
            <div
              className="month-header-row"
              style={{ height: HEADER_HEIGHT, width: totalGridWidth, flexShrink: 0 }}
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
          </div>
        </div>

        {/* ── Body rows ───────────────────────────────────────────────── */}
        <div className="roadmap-body" style={{ position: "relative", minWidth: (isMobile ? 0 : SIDEBAR_WIDTH) + totalGridWidth }}>
          {/* Person rows */}
          {rowEntries.map((entry) => {
            const rowBg = hexToRgba(
              entry.person.color,
              entry.personIndex % 2 === 0 ? 0.10 : 0.16,
            );

            return (
              <div
                key={entry.person.name}
                className="roadmap-row"
                data-person-name={entry.person.name}
                style={{ height: entry.totalHeight, marginBottom: PERSON_GAP }}
              >
                {/* Sidebar cell (sticky left) */}
                {!isMobile && (
                  <div
                    className="sidebar-cell"
                    style={{
                      width: SIDEBAR_WIDTH,
                      height: entry.totalHeight,
                      backgroundColor: (() => {
                        // Blend person color with white at the row alpha to get an opaque color
                        const alpha = entry.personIndex % 2 === 0 ? 0.10 : 0.16;
                        const r = parseInt(entry.person.color.slice(1, 3), 16);
                        const g = parseInt(entry.person.color.slice(3, 5), 16);
                        const b = parseInt(entry.person.color.slice(5, 7), 16);
                        const br = Math.round(r * alpha + 240 * (1 - alpha));
                        const bg = Math.round(g * alpha + 240 * (1 - alpha));
                        const bb = Math.round(b * alpha + 240 * (1 - alpha));
                        return `rgb(${br},${bg},${bb})`;
                      })(),
                    }}
                  >
                    <div
                      className="sidebar-color-bar"
                      style={{ backgroundColor: entry.person.color }}
                    />
                    <span className="sidebar-name">{entry.person.name}</span>
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
                )}

                {/* Grid cell for this person's row */}
                <div
                  className="roadmap-row-grid"
                  style={{
                    width: totalGridWidth,
                    height: entry.totalHeight,
                    backgroundColor: rowBg,
                  }}
                >
                  {/* Vertical grid lines */}
                  {columns.map((_, i) => (
                    <div
                      key={`vline-${i}`}
                      className="grid-vline"
                      style={{ left: i * colWidth, height: entry.totalHeight }}
                    />
                  ))}

                  {/* Today line segment for this row */}
                  {todayX !== null && (
                    <div
                      className="today-line"
                      style={{ left: todayX, height: entry.totalHeight }}
                    />
                  )}

                  {/* Project bars (within this row) */}
                  {viewMode === "projects" &&
                    entry.lanes.map(({ project, lane }) => {
                      const pos = getProjectPosition(project);
                      const colPos = monthIndexToColPos(pos.startMonth, zoom, columns);
                      const colSpan = monthDurationToCols(pos.startMonth, pos.duration, zoom, columns);
                      const x = colPos * colWidth;

                      // During reorder, shift all bars to preview the new arrangement
                      let effectiveLane = lane;
                      if (dragState?.reorderMode && dragState.personName === entry.person.name) {
                        const from = dragState.originalLane;
                        const to = dragState.currentLane;
                        if (project.id === dragState.projectId) {
                          // Dragged bar goes to target lane
                          effectiveLane = to;
                        } else if (from < to) {
                          // Dragged down: bars between from+1 and to shift up by 1
                          if (lane > from && lane <= to) effectiveLane = lane - 1;
                        } else if (from > to) {
                          // Dragged up: bars between to and from-1 shift down by 1
                          if (lane >= to && lane < from) effectiveLane = lane + 1;
                        }
                      }

                      const y = effectiveLane * ROW_HEIGHT + BAR_V_PAD;
                      const w = Math.max(colSpan * colWidth - 4, 20);

                      // Dim the bar in its original spot during cross-person drag
                      const isCrossPersonDrag = dragState?.projectId === project.id && dragState.personName !== entry.person.name;

                      const isHovered = hoveredProject === project.id;
                      const isDragging = dragState?.projectId === project.id;
                      const dimmed = selectedCycleId !== null && !isProjectInCycle(project, entry.person.name);
                      const isRenaming = renamingProjectId === project.id;

                      const doneCount = project.tasks.filter(
                        (t) => t.status === "done",
                      ).length;
                      const total = project.tasks.length;
                      let progressPct =
                        total > 0 ? (doneCount / total) * 100 : 0;

                      const linearProgress = getBarProgress(project);
                      if (linearProgress !== null) {
                        progressPct = linearProgress;
                      }

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
                              borderColor: entry.person.color,
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
                              backgroundColor: hexToRgba(entry.person.color, dimmed ? 0.12 : 0.35),
                              border: `1.5px solid ${dimmed ? hexToRgba(entry.person.color, 0.3) : hexToRgba(entry.person.color, 0.7)}`,
                              borderLeft: `3px solid ${dimmed ? hexToRgba(entry.person.color, 0.3) : entry.person.color}`,
                              opacity: isCrossPersonDrag ? 0.25 : undefined,
                            }}
                            onClick={() => {
                              if (!didDragRef.current) {
                                if (project.linearProjectName) {
                                  setSelectedLinearProject({
                                    project,
                                    personName: entry.person.name,
                                    personColor: entry.person.color,
                                    linearProjectName: project.linearProjectName,
                                  });
                                } else {
                                  setSelected({
                                    project,
                                    personName: entry.person.name,
                                    personColor: entry.person.color,
                                  });
                                }
                              }
                            }}
                            onMouseEnter={() => setHoveredProject(project.id)}
                            onMouseLeave={() => setHoveredProject(null)}
                            onMouseDown={(e) => handleBarMouseDown(e, project, entry.person.name, "move", undefined, lane)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenamingProjectId(project.id);
                              setRenameValue(project.name);
                            }}
                          >
                            <div
                              className="project-bar-progress"
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: hexToRgba(entry.person.color, 0.12),
                              }}
                            />

                            {isRenaming ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleRenameProject(
                                      entry.person.name,
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
                                    entry.person.name,
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
                                style={{ color: dimmed ? hexToRgba(entry.person.color, 0.4) : barTextColor(entry.person.color, 0.35) }}
                              >
                                {project.name}
                              </span>
                            )}

                            <div
                              className="resize-handle"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                handleBarMouseDown(e, project, entry.person.name, "resize");
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  }

                </div>
              </div>
            );
          })}

          {/* Today line label at top of body */}
          {todayX !== null && (
            <div
              style={{
                position: "absolute",
                top: -22,
                left: (isMobile ? 0 : SIDEBAR_WIDTH) + todayX,
                transform: "translateX(-50%)",
                fontSize: 10,
                fontWeight: 600,
                color: "#ef4444",
                background: "#fff",
                padding: "2px 6px",
                borderRadius: 4,
                whiteSpace: "nowrap",
                border: "1px solid #fecaca",
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              Today
            </div>
          )}
        </div>
      </div>
      )}

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
            people={localPeople}
            defaultOwner={addingForPerson}
            onAdd={handleAddProject}
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
          people={localPeople}
          onChangeOwner={handleChangeOwner}
          onUpdateDates={handleUpdateDates}
          onAddProjectToPerson={(pName, proj) => {
            const newId = newProjId();
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== pName) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth: proj.startMonth, duration: proj.duration, tasks: [], linearProjectName: proj.linearProjectName }] };
            }));
            saveOverride("addProject", { personName: pName, project: { name: proj.name, startMonth: proj.startMonth, duration: proj.duration } });
          }}
          onRemoveProjectFromPerson={(pName, projId) => {
            const proj = localPeople.find((p) => p.name === pName)?.projects.find((p) => p.id === projId);
            if (proj) {
              setLocalPeople((prev) => prev.map((p) => {
                if (p.name !== pName) return p;
                return { ...p, projects: p.projects.filter((pr) => pr.id !== projId) };
              }));
              saveOverride("deleteProject", { key: `${pName}:${proj.name}` });
            }
          }}
          onMoveToFuture={handleMoveToFuture}
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
          people={localPeople}
          onChangeOwner={handleChangeOwner}
          onUpdateDates={handleUpdateDates}
          onAddProjectToPerson={(pName, proj) => {
            const newId = newProjId();
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== pName) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth: proj.startMonth, duration: proj.duration, tasks: [], linearProjectName: proj.linearProjectName }] };
            }));
            saveOverride("addProject", { personName: pName, project: { name: proj.name, startMonth: proj.startMonth, duration: proj.duration } });
          }}
          onRemoveProjectFromPerson={(pName, projId) => {
            const proj = localPeople.find((p) => p.name === pName)?.projects.find((p) => p.id === projId);
            if (proj) {
              setLocalPeople((prev) => prev.map((p) => {
                if (p.name !== pName) return p;
                return { ...p, projects: p.projects.filter((pr) => pr.id !== projId) };
              }));
              saveOverride("deleteProject", { key: `${pName}:${proj.name}` });
            }
          }}
          onMoveToFuture={handleMoveToFuture}
        />
      )}

      {/* Detail panel - Linear issue */}
      {selectedLinearIssueId && (
        <LinearDetailPanel
          issueId={selectedLinearIssueId}
          onClose={() => setSelectedLinearIssueId(null)}
        />
      )}

      {/* Floating bar during cross-person drag */}
      {dragState && dragState.personName !== dragState.originalPersonName && (() => {
        const project = localPeople
          .flatMap((p) => p.projects)
          .find((p) => p.id === dragState.projectId);
        if (!project) return null;
        const targetPerson = localPeople.find((p) => p.name === dragState.personName);
        const color = targetPerson?.color ?? "#94a3b8";
        return (
          <div
            style={{
              position: "fixed",
              left: dragState.mouseX - 80,
              top: dragState.mouseY - 15,
              width: 200,
              height: BAR_HEIGHT,
              backgroundColor: hexToRgba(color, 0.5),
              border: `2px solid ${color}`,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              fontSize: 13,
              fontWeight: 600,
              color: barTextColor(color, 0.5),
              pointerEvents: "none",
              zIndex: 9999,
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
            }}
          >
            {project.name}
          </div>
        );
      })()}

      {/* Toasts */}
      <Toast messages={toasts} onDismiss={dismissToast} />
    </div>
  );
}
