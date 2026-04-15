"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Person, Phase, Project, Task, TaskStatus } from "./roadmap-data";

// ── Constants ──────────────────────────────────────────────────────────────

const COL_WIDTH = 120;
const SIDEBAR_WIDTH = 180;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 80;
const PHASE_HEIGHT = 36;
const BAR_V_PAD = 5;
const BAR_HEIGHT = ROW_HEIGHT - BAR_V_PAD * 2;

// ── Props ──────────────────────────────────────────────────────────────────

type RoadmapViewProps = {
  people: Person[];
  months: string[];
  phases: Phase[];
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

  // Close on Escape
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

// ── Filter bar ─────────────────────────────────────────────────────────────

function FilterBar({
  search,
  onSearch,
  peopleCount,
  projectCount,
}: {
  search: string;
  onSearch: (v: string) => void;
  peopleCount: number;
  projectCount: number;
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
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type RowInfo = {
  person: Person;
  lanes: Lane[];
  laneCount: number;
  yOffset: number;
  totalHeight: number;
};

export function RoadmapView({ people, months, phases }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{
    project: Project;
    personName: string;
    personColor: string;
  } | null>(null);
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

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

  // Filter people by search
  const filteredPeople = search.trim()
    ? (people
        .map((p) => {
          const lowerSearch = search.toLowerCase();
          const nameMatch = p.name.toLowerCase().includes(lowerSearch);
          const matchingProjects = p.projects.filter((proj) =>
            proj.name.toLowerCase().includes(lowerSearch),
          );
          if (nameMatch) return p;
          if (matchingProjects.length > 0)
            return { ...p, projects: matchingProjects };
          return null;
        })
        .filter(Boolean) as Person[])
    : people;

  // Precompute row positions
  const rowInfos: RowInfo[] = [];
  let currentY = 0;

  for (const person of filteredPeople) {
    const { lanes, laneCount } = packLanes(person.projects);
    const totalHeight = laneCount * ROW_HEIGHT;
    rowInfos.push({
      person,
      lanes,
      laneCount,
      yOffset: currentY,
      totalHeight,
    });
    currentY += totalHeight;
  }

  const totalGridHeight = currentY;
  const totalGridWidth = months.length * COL_WIDTH;

  const projectCount = filteredPeople.reduce(
    (acc, p) => acc + p.projects.length,
    0,
  );

  // Today marker
  const now = new Date();
  const startDate = new Date(2026, 2, 1); // Mar 2026
  const monthsSinceStart =
    (now.getFullYear() - startDate.getFullYear()) * 12 +
    (now.getMonth() - startDate.getMonth()) +
    now.getDate() / 30;
  const todayX =
    monthsSinceStart >= 0 && monthsSinceStart < months.length
      ? monthsSinceStart * COL_WIDTH
      : null;

  const stickyTop = PHASE_HEIGHT + HEADER_HEIGHT;

  return (
    <div className="roadmap-root">
      <FilterBar
        search={search}
        onSearch={setSearch}
        peopleCount={filteredPeople.length}
        projectCount={projectCount}
      />

      <div className="roadmap-container">
        {/* ── Sticky sidebar ── */}
        <div className="roadmap-sidebar" style={{ width: SIDEBAR_WIDTH }}>
          <div
            className="sidebar-corner"
            style={{ height: stickyTop }}
          >
            <span>Team</span>
          </div>
          <div
            className="sidebar-names"
            ref={sidebarRef}
            onScroll={handleSidebarScroll}
          >
            {rowInfos.map((ri) => (
              <div
                key={ri.person.name}
                className="sidebar-person"
                style={{ height: ri.totalHeight }}
              >
                <div
                  className="sidebar-color-bar"
                  style={{ backgroundColor: ri.person.color }}
                />
                <span className="sidebar-name">{ri.person.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Scrollable grid ── */}
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
            {phases.map((phase) => (
              <div
                key={phase.name}
                className="phase-cell"
                style={{
                  left: phase.startMonth * COL_WIDTH,
                  width: phase.duration * COL_WIDTH,
                  backgroundColor: phase.color,
                }}
              >
                {phase.name}
              </div>
            ))}
          </div>

          {/* Month headers */}
          <div
            className="month-header-row"
            style={{ height: HEADER_HEIGHT, width: totalGridWidth }}
          >
            {months.map((m, i) => {
              const parts = m.split(" ");
              const monthStr = parts[0];
              const yearStr = parts[1];
              return (
                <div
                  key={m}
                  className="month-header-cell"
                  style={{ left: i * COL_WIDTH, width: COL_WIDTH }}
                >
                  <span className="month-label">{monthStr}</span>
                  <span className="year-label">{yearStr}</span>
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
            {months.map((_, i) => (
              <div
                key={`vline-${i}`}
                className="grid-vline"
                style={{ left: i * COL_WIDTH, height: totalGridHeight }}
              />
            ))}

            {/* Alternating row backgrounds */}
            {rowInfos.map((ri, idx) => (
              <div
                key={`rowbg-${ri.person.name}`}
                className="grid-row-bg"
                style={{
                  top: ri.yOffset,
                  height: ri.totalHeight,
                  backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)",
                }}
              />
            ))}

            {/* Horizontal row separators */}
            {rowInfos.map((ri) => (
              <div
                key={`hline-${ri.person.name}`}
                className="grid-hline"
                style={{ top: ri.yOffset + ri.totalHeight }}
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
            {rowInfos.map((ri) =>
              ri.lanes.map(({ project, lane }) => {
                const x = project.startMonth * COL_WIDTH + 2;
                const y = ri.yOffset + lane * ROW_HEIGHT + BAR_V_PAD;
                const w = project.duration * COL_WIDTH - 4;
                const isHovered = hoveredProject === project.id;

                const doneCount = project.tasks.filter(
                  (t) => t.status === "done",
                ).length;
                const total = project.tasks.length;
                const progressPct =
                  total > 0 ? (doneCount / total) * 100 : 0;

                return (
                  <div
                    key={project.id}
                    className={`project-bar${isHovered ? " project-bar-hover" : ""}`}
                    style={{
                      left: x,
                      top: y,
                      width: w,
                      height: BAR_HEIGHT,
                      backgroundColor: hexToRgba(ri.person.color, 0.18),
                      borderLeft: `3px solid ${ri.person.color}`,
                    }}
                    onClick={() =>
                      setSelected({
                        project,
                        personName: ri.person.name,
                        personColor: ri.person.color,
                      })
                    }
                    onMouseEnter={() => setHoveredProject(project.id)}
                    onMouseLeave={() => setHoveredProject(null)}
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
