"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Person, Phase, Project, TaskStatus, Team } from "./roadmap-data";
import type {
  LinearIssue,
  LinearCycle,
} from "~/lib/linear";

// ── Zoom types ────────────────────────────────────────────────────────────

type ZoomLevel = "month" | "biweekly" | "week";

const ZOOM_COL_WIDTH: Record<ZoomLevel, number> = {
  month: 120,
  biweekly: 80,
  week: 60,
};

// ── Constants ──────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 180;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 80;
const PHASE_HEIGHT = 36;
const TEAM_HEADER_HEIGHT = 36;
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
    const d = new Date(TIMELINE_START);
    while (d < TIMELINE_END) {
      cols.push({
        label: `${shortMonths[d.getMonth()]} ${d.getFullYear()}`,
        date: new Date(d),
      });
      d.setMonth(d.getMonth() + 1);
    }
  } else if (zoom === "biweekly") {
    const d = new Date(TIMELINE_START);
    while (d < TIMELINE_END) {
      const month = shortMonths[d.getMonth()];
      const day = d.getDate();
      cols.push({
        label: `${month} ${day}`,
        date: new Date(d),
      });
      d.setDate(d.getDate() + 14);
    }
  } else {
    // week
    const start = new Date(TIMELINE_START);
    const startDow = start.getDay();
    const mondayOffset = startDow === 0 ? -6 : 1 - startDow;
    start.setDate(start.getDate() + mondayOffset);

    const cursor = new Date(start);
    while (cursor < TIMELINE_END) {
      if (cursor >= new Date(TIMELINE_START.getFullYear(), TIMELINE_START.getMonth(), TIMELINE_START.getDate() - 7)) {
        const month = shortMonths[cursor.getMonth()];
        const day = cursor.getDate();
        cols.push({
          label: `${month} ${day}`,
          date: new Date(cursor),
        });
      }
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
  const cleaned = title.split(/[-–—:|]/)[0].trim();
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

// ── Detail panel (static roadmap projects) ────────────────────────────────

function DetailPanel({
  project,
  personName,
  personColor,
  onClose,
}: {
  project: Project;
  personName: string;
  personColor: string;
  onClose: () => void;
}) {
  const doneCount = project.tasks.filter((t) => t.status === "done").length;
  const inProgressCount = project.tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const todoCount = project.tasks.filter((t) => t.status === "todo").length;
  const total = project.tasks.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
            <button className="detail-close" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="detail-title">{project.name}</h2>
          <div className="detail-meta">
            <span className="detail-duration">
              {project.duration} month{project.duration > 1 ? "s" : ""}
            </span>
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
            {project.tasks.map((task) => (
              <li key={task.id} className="detail-task-item">
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
              </li>
            ))}
          </ul>
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
};

type TeamHeaderInfo = {
  kind: "team-header";
  team: Team;
  yOffset: number;
  totalHeight: number;
  collapsed: boolean;
};

type RowEntry = PersonRowInfo | TeamHeaderInfo;

// ── Drag state ─────────────────────────────────────────────────────────────

type DragState = {
  projectId: string;
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

// ── Main component ─────────────────────────────────────────────────────────

export function RoadmapView({ people, months, phases, teams }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    project: Project;
    personName: string;
    personColor: string;
  } | null>(null);
  const [selectedLinearIssueId, setSelectedLinearIssueId] = useState<string | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [localPeople, setLocalPeople] = useState<Person[]>(people);
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Linear state
  const [cycles, setCycles] = useState<LinearCycle[]>([]);
  const [cyclesLoading, setCyclesLoading] = useState(true);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [cycleIssueIds, setCycleIssueIds] = useState<Set<string> | null>(null);
  const [cycleProjectNames, setCycleProjectNames] = useState<Set<string> | null>(null);
  const [linearBars, setLinearBars] = useState<LinearBar[]>([]);
  const [linearBarsLoading, setLinearBarsLoading] = useState(true);

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const colWidth = ZOOM_COL_WIDTH[zoom];
  const columns = useMemo(() => generateColumns(zoom), [zoom]);

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

  // Filter people by search
  const filteredPeople = useMemo(() => {
    if (!search.trim()) return localPeople;
    const lowerSearch = search.toLowerCase();
    return localPeople
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
  }, [localPeople, search]);

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

  // Build row entries with team headers
  const rowEntries: RowEntry[] = useMemo(() => {
    const entries: RowEntry[] = [];
    let currentY = 0;

    for (const { team, members } of teamGroups.groups) {
      const isCollapsed = collapsedTeams.has(team.name);
      entries.push({
        kind: "team-header",
        team,
        yOffset: currentY,
        totalHeight: TEAM_HEADER_HEIGHT,
        collapsed: isCollapsed,
      });
      currentY += TEAM_HEADER_HEIGHT;

      if (!isCollapsed) {
        for (const person of members) {
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
          });
          currentY += totalHeight;
        }
      }
    }

    // Ungrouped people at the end
    for (const person of teamGroups.ungrouped) {
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
      });
      currentY += totalHeight;
    }

    return entries;
  }, [teamGroups, collapsedTeams, linearBarsPerPerson]);

  const totalGridHeight = rowEntries.length > 0
    ? rowEntries[rowEntries.length - 1].yOffset + rowEntries[rowEntries.length - 1].totalHeight
    : 0;
  const totalGridWidth = columns.length * colWidth;

  const personEntries = rowEntries.filter((e): e is PersonRowInfo => e.kind === "person");

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

  // Phase positions scaled to current zoom
  const phasePositions = useMemo(() => {
    return phases.map((phase) => {
      const x = monthIndexToColPos(phase.startMonth, zoom, columns) * colWidth;
      const w = monthDurationToCols(phase.startMonth, phase.duration, zoom, columns) * colWidth;
      return { phase, x, w };
    });
  }, [phases, zoom, columns, colWidth]);

  // ── Drag handlers ──────────────────────────────────────────────────────

  const handleBarMouseDown = useCallback(
    (e: React.MouseEvent, project: Project, mode: "move" | "resize", linearIssueId?: string) => {
      e.preventDefault();
      e.stopPropagation();
      const state: DragState = {
        projectId: project.id,
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

  const stickyTop = PHASE_HEIGHT + HEADER_HEIGHT;

  return (
    <div className="roadmap-root">
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
      />

      <div className="roadmap-container">
        {/* Sticky sidebar */}
        <div className="roadmap-sidebar" style={{ width: SIDEBAR_WIDTH }}>
          <div className="sidebar-corner" style={{ height: stickyTop }}>
            <span>Team</span>
          </div>
          <div
            className="sidebar-names"
            ref={sidebarRef}
            onScroll={handleSidebarScroll}
          >
            {rowEntries.map((entry) => {
              if (entry.kind === "team-header") {
                return (
                  <div
                    key={`team-${entry.team.name}`}
                    className="sidebar-team-header"
                    style={{
                      height: entry.totalHeight,
                      borderLeftColor: entry.team.color,
                      backgroundColor: hexToRgba(entry.team.color, 0.06),
                    }}
                    onClick={() => toggleTeam(entry.team.name)}
                  >
                    <span
                      className={`sidebar-team-chevron${entry.collapsed ? " collapsed" : ""}`}
                    >
                      &#9662;
                    </span>
                    <span className="sidebar-team-name">{entry.team.name}</span>
                    <span className="sidebar-team-count">
                      {entry.team.members.length}
                    </span>
                  </div>
                );
              }
              return (
                <div
                  key={entry.person.name}
                  className="sidebar-person"
                  style={{ height: entry.totalHeight }}
                >
                  <div
                    className="sidebar-color-bar"
                    style={{ backgroundColor: entry.person.color }}
                  />
                  <span className="sidebar-name">{entry.person.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable grid */}
        <div
          className="roadmap-scroll"
          ref={scrollRef}
          onScroll={handleGridScroll}
        >
          {/* Phase row */}
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

          {/* Column headers */}
          <div
            className="month-header-row"
            style={{ height: HEADER_HEIGHT, width: totalGridWidth }}
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

            {/* Row backgrounds and separators */}
            {rowEntries.map((entry) => {
              if (entry.kind === "team-header") {
                return (
                  <div
                    key={`team-row-${entry.team.name}`}
                    className="grid-team-header-bg"
                    style={{
                      top: entry.yOffset,
                      height: entry.totalHeight,
                      borderLeftColor: entry.team.color,
                      backgroundColor: hexToRgba(entry.team.color, 0.04),
                    }}
                  />
                );
              }
              const personIdx = personEntries.indexOf(entry);
              return (
                <div
                  key={`rowbg-${entry.person.name}`}
                  className="grid-row-bg"
                  style={{
                    top: entry.yOffset,
                    height: entry.totalHeight,
                    backgroundColor:
                      personIdx % 2 === 0
                        ? "transparent"
                        : "rgba(0,0,0,0.015)",
                  }}
                />
              );
            })}

            {/* Horizontal row separators */}
            {rowEntries.map((entry) => (
              <div
                key={`hline-${entry.kind === "team-header" ? `team-${entry.team.name}` : entry.person.name}`}
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

                const doneCount = project.tasks.filter(
                  (t) => t.status === "done",
                ).length;
                const total = project.tasks.length;
                const progressPct =
                  total > 0 ? (doneCount / total) * 100 : 0;

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
                          setSelected({
                            project,
                            personName: ri.person.name,
                            personColor: ri.person.color,
                          });
                        }
                      }}
                      onMouseEnter={() => setHoveredProject(project.id)}
                      onMouseLeave={() => setHoveredProject(null)}
                      onMouseDown={(e) => handleBarMouseDown(e, project, "move")}
                    >
                      <div
                        className="project-bar-progress"
                        style={{
                          width: `${progressPct}%`,
                          backgroundColor: hexToRgba(ri.person.color, 0.12),
                        }}
                      />
                      <span
                        className="project-bar-label"
                        style={{ color: dimmed ? hexToRgba(ri.person.color, 0.4) : ri.person.color }}
                      >
                        {project.name}
                      </span>
                      {/* Resize handle */}
                      <div
                        className="resize-handle"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleBarMouseDown(e, project, "resize");
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

              return bars.map((bar, idx) => {
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

      {/* Detail panel - static project */}
      {selected && (
        <DetailPanel
          project={selected.project}
          personName={selected.personName}
          personColor={selected.personColor}
          onClose={() => setSelected(null)}
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
