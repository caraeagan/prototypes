"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Person, Phase, Project, Task, TaskStatus, Team } from "./roadmap-data";

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
const RESIZE_HANDLE_WIDTH = 8;

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
    const d = new Date(TIMELINE_START);
    // Align to Monday
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 1) {
      const diff = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
      d.setDate(d.getDate() + (diff > 7 ? diff - 7 : diff));
    }
    // Actually start from TIMELINE_START aligned to its week start
    const start = new Date(TIMELINE_START);
    const startDow = start.getDay();
    // go back to Monday of that week
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
  // The date corresponding to this month index
  const targetDate = new Date(2026, 2 + monthIndex, 1);
  // Find which column it falls in
  for (let i = 0; i < columns.length; i++) {
    const colStart = columns[i].date;
    const colEnd = i + 1 < columns.length ? columns[i + 1].date : TIMELINE_END;
    if (targetDate >= colStart && targetDate < colEnd) {
      // Fractional position within this column
      const totalMs = colEnd.getTime() - colStart.getTime();
      const offsetMs = targetDate.getTime() - colStart.getTime();
      return i + (totalMs > 0 ? offsetMs / totalMs : 0);
    }
  }
  // If target is before the first column
  if (columns.length > 0 && targetDate < columns[0].date) {
    return 0;
  }
  // If target is after all columns
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

// ── Detail panel ───────────────────────────────────────────────────────────

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

// ── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search,
  onSearch,
  peopleCount,
  projectCount,
  zoom,
  onZoom,
}: {
  search: string;
  onSearch: (v: string) => void;
  peopleCount: number;
  projectCount: number;
  zoom: ZoomLevel;
  onZoom: (z: ZoomLevel) => void;
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
  mode: "move" | "resize";
  startMouseX: number;
  originalStartMonth: number;
  originalDuration: number;
  currentStartMonth: number;
  currentDuration: number;
};

// ── Main component ─────────────────────────────────────────────────────────

export function RoadmapView({ people, months, phases, teams }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    project: Project;
    personName: string;
    personColor: string;
  } | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());
  const [localPeople, setLocalPeople] = useState<Person[]>(people);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const colWidth = ZOOM_COL_WIDTH[zoom];
  const columns = useMemo(() => generateColumns(zoom), [zoom]);

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
    const ungrouped: Person[] = [];

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
    for (const p of filteredPeople) {
      if (!allTeamMembers.has(p.name)) {
        ungrouped.push(p);
      }
    }

    return { groups, ungrouped };
  }, [filteredPeople, teams]);

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
          const totalHeight = laneCount * ROW_HEIGHT;
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
      const totalHeight = laneCount * ROW_HEIGHT;
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
  }, [teamGroups, collapsedTeams]);

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
    // Find which column "now" falls in
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
    (e: React.MouseEvent, project: Project, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const state: DragState = {
        projectId: project.id,
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
      // Convert pixel delta to month delta using current zoom
      // Each month at the current zoom level spans a certain number of columns
      // For simplicity, we use an approximate month width
      const approxMonthWidth = (() => {
        if (zoom === "month") return colWidth;
        if (zoom === "biweekly") return colWidth * (30.44 / 14); // ~2.17 biweekly periods per month
        return colWidth * (30.44 / 7); // ~4.35 weeks per month
      })();

      const monthDelta = dx / approxMonthWidth;

      if (ds.mode === "move") {
        const newStart = Math.max(0, Math.round(ds.originalStartMonth + monthDelta));
        if (newStart !== ds.currentStartMonth) {
          ds.currentStartMonth = newStart;
          setDragState({ ...ds });
        }
      } else {
        // resize
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

    dragRef.current = null;
    setDragState(null);
  }, []);

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
            {rowEntries.map((entry, idx) => {
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
                      className={`project-bar${isHovered ? " project-bar-hover" : ""}${isDragging ? " project-bar-dragging" : ""}`}
                      style={{
                        left: x,
                        top: y,
                        width: w,
                        height: BAR_HEIGHT,
                        backgroundColor: hexToRgba(ri.person.color, 0.18),
                        borderLeft: `3px solid ${ri.person.color}`,
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
                        style={{ color: ri.person.color }}
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
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          project={selected.project}
          personName={selected.personName}
          personColor={selected.personColor}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
