"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Person, Phase, Project, TaskStatus, Team } from "./roadmap-data";
import type {
  LinearIssue,
  LinearCycle,
} from "~/lib/linear";
import type { RoadmapOverrides } from "./api/roadmap/route";

// ── Zoom types ────────────────────────────────────────────────────────────

type ZoomLevel = "quarter" | "month" | "biweekly" | "week";

const ZOOM_COL_WIDTH: Record<ZoomLevel, number> = {
  quarter: 300,
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

// ── Timeline range: Aug 2026 through Jan 2028 ────────────────────────────
// Month indices in the data stay anchored to Mar 2026 (index 0); this only
// sets which part of the timeline is visible.

const TIMELINE_START = new Date(2026, 7, 1); // Aug 1, 2026
const TIMELINE_END = new Date(2028, 1, 1); // Feb 1, 2028 (end boundary)

function generateColumns(zoom: ZoomLevel): { label: string; date: Date }[] {
  const cols: { label: string; date: Date }[] = [];
  const shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (zoom === "quarter") {
    // Full timeline in calendar quarters (Jan-Mar, Apr-Jun, Jul-Sep, Oct-Dec)
    const d = new Date(TIMELINE_START);
    // Align to start of the quarter containing TIMELINE_START
    d.setMonth(Math.floor(d.getMonth() / 3) * 3);
    d.setDate(1);
    while (d < TIMELINE_END) {
      const q = Math.floor(d.getMonth() / 3) + 1;
      cols.push({
        label: `Q${q} ${d.getFullYear()}`,
        date: new Date(d),
      });
      d.setMonth(d.getMonth() + 3);
    }
  } else if (zoom === "month") {
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
  // Support fractional month indices: JS Date's month arg is truncated, so we split
  // whole-months and fractional-days to place mid-month positions correctly.
  const wholeMonths = Math.floor(monthIndex);
  const fractionalDays = Math.round((monthIndex - wholeMonths) * 30.44);
  const targetDate = new Date(2026, 2 + wholeMonths, 1 + fractionalDays);
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
  initialOverrides?: RoadmapOverrides;
};

function mergeOverridesIntoPeople(
  people: Person[],
  ov: RoadmapOverrides,
): Person[] {
  let updated: Person[] = people.map((person) => ({
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
        const linkOv = ov.linearLinks?.[keyById];
        return {
          ...proj,
          name: renameOv || proj.name,
          startMonth: posOv?.startMonth ?? proj.startMonth,
          duration: posOv?.duration ?? proj.duration,
          order: posOv?.order ?? proj.order,
          linearProjectName: linkOv ?? proj.linearProjectName,
        };
      }),
  }));

  if (ov.additions) {
    const deleted = new Set(ov.deletions ?? []);
    for (const [personName, additions] of Object.entries(ov.additions)) {
      updated = updated.map((person) => {
        if (person.name !== personName) return person;
        const newProjects: Project[] = additions
          .filter((a) => !deleted.has(`${personName}:${a.name}`))
          .map((a) => {
            const stableId = `proj-added-${personName}-${a.name}`;
            const nameKey = `${personName}:${a.name}`;
            const idKey = `${personName}:${stableId}`;
            const posOv = ov.positions?.[nameKey] ?? ov.positions?.[idKey];
            const linkOv = ov.linearLinks?.[idKey];
            const renameOv = ov.renames?.[nameKey];
            return {
              id: stableId,
              name: renameOv || a.name,
              startMonth: posOv?.startMonth ?? a.startMonth,
              duration: posOv?.duration ?? a.duration,
              order: posOv?.order,
              tasks: [],
              linearProjectName: linkOv ?? a.linearProjectName ?? null,
            };
          });
        return { ...person, projects: [...person.projects, ...newProjects] };
      });
    }
  }

  return updated;
}

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

// ── DVD-screensaver shopping carts ─────────────────────────────────────────
// Bounces `count` cart emojis around a row. Bounds are recomputed every frame
// from the wrapper's on-screen rect intersected with the browser window, so
// the carts ricochet off the *visible window* edges rather than escaping into
// the off-screen part of a horizontally-scrolled row. Rendered behind the bars.
const CART_SIZE = 32;
const SIDEBAR_X = 160; // keep carts clear of the sticky person sidebar

function DvdCarts({ emojis = ["🛒"] }: { emojis?: string[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const count = emojis.length;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const els = Array.from(wrap.children) as HTMLElement[];
    if (els.length === 0) return;

    const h0 = wrap.clientHeight || 200;
    const carts = els.map(() => {
      const speed = 3 + Math.random() * 2;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: 120 + Math.random() * 240,
        y: Math.random() * Math.max(1, h0 - CART_SIZE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      const rect = wrap.getBoundingClientRect();
      const h = wrap.clientHeight;
      // Visible window mapped into the wrapper's local coordinate space.
      const minX = Math.max(0, SIDEBAR_X - rect.left);
      const maxX = Math.max(minX + CART_SIZE, window.innerWidth - rect.left - CART_SIZE);
      const maxY = Math.max(CART_SIZE, h - CART_SIZE);
      for (let i = 0; i < carts.length; i++) {
        const c = carts[i];
        c.x += c.vx;
        c.y += c.vy;
        if (c.x <= minX) { c.x = minX; c.vx = Math.abs(c.vx); }
        else if (c.x >= maxX) { c.x = maxX; c.vx = -Math.abs(c.vx); }
        if (c.y <= 0) { c.y = 0; c.vy = Math.abs(c.vy); }
        else if (c.y >= maxY) { c.y = maxY; c.vy = -Math.abs(c.vy); }
        els[i].style.transform = `translate(${c.x}px, ${c.y}px)`;
      }
      if (!prefersReduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            fontSize: CART_SIZE - 4,
            lineHeight: 1,
            willChange: "transform",
          }}
        >
          {emojis[i]}
        </span>
      ))}
    </div>
  );
}

// ── DVD-screensaver "no Pearson" badges ────────────────────────────────────
// Bounces `count` crossed-out Pearson logos around the whole viewport, behind
// page content. Bounds are the browser window; rendered fixed at zIndex 0 so
// opaque cards (zIndex 1) sit on top and the badges peek through the gaps.
const PEARSON_SIZE = 72;

function BouncingPearsons({ count }: { count: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const els = Array.from(wrap.children) as HTMLElement[];
    if (els.length === 0) return;

    const sprites = els.map(() => {
      const speed = 1.8 + Math.random() * 1.2;
      const angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * Math.max(1, window.innerWidth - PEARSON_SIZE),
        y: Math.random() * Math.max(1, window.innerHeight - PEARSON_SIZE),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
      };
    });

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      const maxX = Math.max(1, window.innerWidth - PEARSON_SIZE);
      const maxY = Math.max(1, window.innerHeight - PEARSON_SIZE);
      for (let i = 0; i < sprites.length; i++) {
        const s = sprites[i];
        s.x += s.vx;
        s.y += s.vy;
        if (s.x <= 0) { s.x = 0; s.vx = Math.abs(s.vx); }
        else if (s.x >= maxX) { s.x = maxX; s.vx = -Math.abs(s.vx); }
        if (s.y <= 0) { s.y = 0; s.vy = Math.abs(s.vy); }
        else if (s.y >= maxY) { s.y = maxY; s.vy = -Math.abs(s.vy); }
        els[i].style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
      if (!prefersReduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [count]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{ position: "absolute", left: 0, top: 0, width: PEARSON_SIZE, height: PEARSON_SIZE, willChange: "transform" }}
        >
          <img src="/pearson.png" alt="" style={{ width: "100%", height: "100%", objectFit: "contain", opacity: 0.85 }} />
          <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} aria-hidden>
            <circle cx="50" cy="50" r="44" fill="none" stroke="#dc2626" strokeWidth="9" />
            <line x1="19" y1="19" x2="81" y2="81" stroke="#dc2626" strokeWidth="9" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ── Roaming dachshund ──────────────────────────────────────────────────────
// A little sausage dog with a round-trip routine:
//   1. It bounces in place five times on Cara's row.
//   2. It hops straight down the person column, landing on each row in turn,
//      until it reaches Lucie's row.
//   3. It turns around and hops all the way back up to Cara's row.
//   4. Back home on Cara, it fires `onReturn` — the parent then unleashes a
//      whole pack of dachshunds (see DachshundPack) hopping across the roadmap.
// It pins itself just right of the sticky person sidebar so it hugs the names
// through horizontal scroll, and rides up/down with the rows on vertical
// scroll. Row floors and bounds are read from the live DOM each frame so it
// tracks layout/scroll changes.
const DOG_SIZE = 52;
const DOG_HOP_ARC = 34; // px the dog pops upward at the top of each hop
const DOG_HOP_FRAMES = 24; // frames spent mid-air per hop
const DOG_REST_FRAMES = 16; // frames perched on each row before the next hop
const DOG_INTRO_HOPS = 5; // bounces in place on Cara's row before setting off

function RoamingDachshund({
  scrollRef,
  fromName,
  toName,
  onReturn,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  fromName: string;
  toName: string;
  onReturn?: () => void;
}) {
  const dogRef = useRef<HTMLDivElement>(null);
  // Fall back to the dog emoji if /dachshund.png is missing.
  const [useImg, setUseImg] = useState(true);

  useEffect(() => {
    const dog = dogRef.current;
    const container = dog?.offsetParent as HTMLElement | null;
    if (!dog || !container) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // The round-trip chain of rows: Cara → Lucie → Cara. Resolved lazily once
    // both rows are in the DOM (people can be filtered in/out at any time).
    let path: HTMLElement[] = [];
    const buildPath = () => {
      const rows = Array.from(
        container.querySelectorAll<HTMLElement>("[data-person-row]"),
      );
      const fromIdx = rows.findIndex((r) => r.dataset.personRow === fromName);
      const toIdx = rows.findIndex((r) => r.dataset.personRow === toName);
      if (fromIdx === -1 || toIdx === -1) return false;
      const step = fromIdx <= toIdx ? 1 : -1;
      const down: HTMLElement[] = [];
      for (let i = fromIdx; i !== toIdx + step; i += step) down.push(rows[i]);
      // Append the return leg (back up), skipping the shared turnaround row.
      const up = down.slice(0, -1).reverse();
      path = down.concat(up);
      return true;
    };

    // Where a sprite of the given height rests on a row, in container coords.
    const floorFor = (row: HTMLElement, size: number) =>
      row.offsetTop + row.clientHeight - size - 8;

    // The x just right of the sticky sidebar, in container coords (tracks scroll).
    const nameX = () => (scrollRef.current?.scrollLeft ?? 0) + SIDEBAR_X + 6;

    // Pin the dog beside the name at vertical offset y, with a squash/stretch.
    const pinDog = (y: number, stretch: number) => {
      // The sprite faces left by default — no scaleX flip, so it faces the name.
      dog.style.transform = `translate(${nameX()}px, ${y}px) scaleY(${stretch})`;
    };

    let seg = 0; // index of the row the dog is on within `path`
    let phase: "introHop" | "rest" | "hop" | "done" = "introHop";
    let started = false; // flips once Cara's row scrolls into view (one-way)
    let introLeft = DOG_INTRO_HOPS;
    let hopT = 0; // 0→1 progress through the current hop
    let restTimer = 0;
    let raf = 0;
    let returned = false; // guards the one-shot onReturn call

    const tick = () => {
      if (path.length === 0 && !buildPath()) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Hold the dog sitting on Cara's row until that row is scrolled into
      // view, so the journey kicks off where someone can actually watch it.
      if (!started) {
        pinDog(floorFor(path[0], DOG_SIZE), 0.92);
        const scroller = scrollRef.current;
        if (scroller) {
          const rowRect = path[0].getBoundingClientRect();
          const scRect = scroller.getBoundingClientRect();
          const visible = rowRect.top < scRect.bottom && rowRect.bottom > scRect.top;
          if (!visible) {
            raf = requestAnimationFrame(tick);
            return;
          }
        }
        started = true;
      }

      if (phase === "introHop") {
        // Bounce in place on Cara's row a handful of times.
        const floor = floorFor(path[0], DOG_SIZE);
        if (restTimer > 0) {
          restTimer -= 1;
          pinDog(floor, 0.92);
        } else {
          hopT = Math.min(1, hopT + 1 / DOG_HOP_FRAMES);
          pinDog(floor - DOG_HOP_ARC * Math.sin(Math.PI * hopT), 1 + 0.16 * Math.sin(Math.PI * hopT));
          if (hopT >= 1) {
            hopT = 0;
            introLeft -= 1;
            restTimer = 8;
            if (introLeft <= 0) {
              if (path.length > 1) { phase = "rest"; restTimer = DOG_REST_FRAMES; }
              else phase = "done";
            }
          }
        }
      } else if (phase === "rest") {
        pinDog(floorFor(path[seg], DOG_SIZE), 0.92);
        restTimer -= 1;
        if (restTimer <= 0) {
          if (seg >= path.length - 1) phase = "done";
          else { phase = "hop"; hopT = 0; }
        }
      } else if (phase === "hop") {
        hopT = Math.min(1, hopT + 1 / DOG_HOP_FRAMES);
        const fromY = floorFor(path[seg], DOG_SIZE);
        const toY = floorFor(path[seg + 1], DOG_SIZE);
        const y = fromY + (toY - fromY) * hopT - DOG_HOP_ARC * Math.sin(Math.PI * hopT);
        pinDog(y, 1 + 0.16 * Math.sin(Math.PI * hopT));
        if (hopT >= 1) { seg += 1; phase = "rest"; restTimer = DOG_REST_FRAMES; }
      } else {
        // Home again on Cara's row: rest here and, once, summon the pack.
        pinDog(floorFor(path[path.length - 1], DOG_SIZE), 0.92);
        if (!returned) {
          returned = true;
          onReturn?.();
        }
      }

      if (!prefersReduced) raf = requestAnimationFrame(tick);
    };

    if (prefersReduced) {
      // No journey for reduced-motion: plant the dog back home and summon the
      // pack straight away.
      if (buildPath()) {
        pinDog(floorFor(path[path.length - 1], DOG_SIZE), 0.92);
        onReturn?.();
      }
    } else {
      raf = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(raf);
  }, [scrollRef, fromName, toName, onReturn]);

  return (
    <>
      <div
        ref={dogRef}
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: DOG_SIZE,
          height: DOG_SIZE,
          fontSize: DOG_SIZE - 4,
          lineHeight: 1,
          transformOrigin: "center bottom",
          willChange: "transform",
          pointerEvents: "none",
          zIndex: 3,
        }}
      >
        {useImg ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/dachshund.png"
            alt=""
            onError={() => setUseImg(false)}
            style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
          />
        ) : (
          "🐕"
        )}
      </div>
    </>
  );
}

// ── Dachshund pack ─────────────────────────────────────────────────────────
// Once the roaming dachshund makes it home, the whole pack turns up on that
// same row: `count` little sausage dogs hopping along the bottom of the row and
// trotting back and forth, each ricocheting off the visible window edges (just
// right of the sticky sidebar to the right edge). The row floor and bounds are
// read from the live DOM every frame so the pack tracks layout and scroll.
const PACK_HOP_ARC = 26; // px each pack dog pops upward at the top of a hop

function DachshundPack({
  count,
  rowName,
  scrollRef,
}: {
  count: number;
  rowName: string;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [useImg, setUseImg] = useState(true);

  useEffect(() => {
    const wrap = wrapRef.current;
    const container = wrap?.offsetParent as HTMLElement | null;
    if (!wrap || !container) return;
    const els = Array.from(wrap.children) as HTMLElement[];
    if (els.length === 0) return;

    // Spread the pack out horizontally, each with its own speed/direction.
    const dogs = els.map((_, i) => ({
      x: 0, // seeded on the first frame once the row bounds are known
      vx: (1.6 + (i % 3) * 0.7) * (i % 2 === 0 ? 1 : -1), // px/frame, alternating
      t: (i / count) * Math.PI * 2, // stagger the hop phases
      speed: 0.13 + (i % 3) * 0.03, // a few distinct hop tempos
      seeded: false,
    }));

    const findRow = () =>
      Array.from(container.querySelectorAll<HTMLElement>("[data-person-row]")).find(
        (r) => r.dataset.personRow === rowName,
      ) ?? null;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      const row = findRow();
      if (!row) { raf = requestAnimationFrame(tick); return; }

      const scroller = scrollRef.current;
      const sl = scroller?.scrollLeft ?? 0;
      const viewW = scroller?.clientWidth ?? window.innerWidth;
      const leftB = sl + SIDEBAR_X + 6;
      const rightB = Math.max(leftB + 1, sl + viewW - DOG_SIZE - 6);
      const floor = row.offsetTop + row.clientHeight - DOG_SIZE - 8;

      for (let i = 0; i < dogs.length; i++) {
        const d = dogs[i];
        if (!d.seeded) {
          d.x = leftB + ((i + 0.5) / count) * Math.max(1, rightB - leftB);
          d.seeded = true;
        }
        d.x += d.vx;
        if (d.x <= leftB) { d.x = leftB; d.vx = Math.abs(d.vx); }
        else if (d.x >= rightB) { d.x = rightB; d.vx = -Math.abs(d.vx); }

        d.t += d.speed;
        const lift = Math.max(0, Math.sin(d.t)); // only the up half of the wave
        const y = floor - PACK_HOP_ARC * lift;
        const stretch = 1 + 0.16 * lift;
        // Face the way it's trotting (sprite faces left by default).
        const faceX = d.vx >= 0 ? -1 : 1;
        els[i].style.transform = `translate(${d.x}px, ${y}px) scale(${faceX}, ${stretch})`;
      }
      if (!prefersReduced) raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [count, rowName, scrollRef]);

  return (
    <div ref={wrapRef} aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: DOG_SIZE,
            height: DOG_SIZE,
            fontSize: DOG_SIZE - 4,
            lineHeight: 1,
            transformOrigin: "center bottom",
            willChange: "transform",
          }}
        >
          {useImg ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/dachshund.png"
              alt=""
              onError={() => setUseImg(false)}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            "🐕"
          )}
        </div>
      ))}
    </div>
  );
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

// Linear issues have no writable start date — only the due date can sync.
async function linearUpdateDates(
  issueId: string,
  dueDate?: string | null,
): Promise<{ success: boolean }> {
  const res = await fetch("/api/linear/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueId, dueDate }),
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error || `API error: ${res.status}`);
  }
  return json;
}

/** Update a linked Linear project's start/target dates (matched by name). */
async function syncLinearProjectDates(
  linearProjectName: string,
  startDate: string,
  targetDate: string,
): Promise<void> {
  const data = await linearQuery<{ projects: { nodes: { id: string }[] } }>(
    `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id } } }`,
    { name: linearProjectName },
  );
  const id = data.projects.nodes[0]?.id;
  if (!id) throw new Error(`Linear project "${linearProjectName}" not found`);
  await linearQuery(
    `mutation UpdateProjectDates($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`,
    { id, input: { startDate, targetDate } },
  );
}

// ── Roadmap overrides API ────────────────────────────────────────────────

async function fetchOverrides(): Promise<RoadmapOverrides> {
  // Cache-bust the URL and opt out of all caching layers — we always need the
  // freshest state from the blob, not a stale CDN/browser snapshot.
  const res = await fetch(`/api/roadmap?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) return {};
  return res.json();
}

// Serial queue for overrides writes. Each save is a read-modify-write on a single
// JSON blob; without serialization, concurrent saves race and lose updates.
let _saveQueue: Promise<void> = Promise.resolve();

async function saveOverride(
  action: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const run = async () => {
    const res = await fetch("/api/roadmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${action} failed: ${res.status} ${text}`);
    }
  };
  const next = _saveQueue.then(run, run); // run even if prior failed
  _saveQueue = next.catch(() => {}); // swallow errors in the queue chain
  return next
    .then(() => {
      // Signal success so the view can refetch and reflect the true saved state.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("roadmap-saved"));
      }
    })
    .catch((err) => {
      // Surface the failure to the app (listener attaches in the main view).
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("roadmap-save-failed", {
            detail: { message: err instanceof Error ? err.message : String(err) },
          }),
        );
      }
      throw err;
    });
}

// ── Project resources (linked documents) ──────────────────────────────────

type ProjectResource = { id: string; label: string; url: string };

function newResourceId(): string {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Normalize a user-entered URL so links are clickable even without a scheme.
function normalizeResourceUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Resources section for a project detail slideout. Loads the saved list for the
// given projectKey (`${personName}:${projectId}`), and lets the user add, edit,
// and remove an unlimited number of document links. Persists on each change.
function ProjectResources({ projectKey }: { projectKey: string }) {
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/roadmap?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`overrides load failed: ${res.status}`);
        return res.json();
      })
      .then((ov: RoadmapOverrides) => {
        if (cancelled) return;
        setResources(ov.resources?.[projectKey] ?? []);
        setLoaded(true);
      })
      // Stay unloaded on failure: persisting over an unloaded list would
      // overwrite the project's saved resources with a partial one.
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectKey]);

  const persist = (next: ProjectResource[]) => {
    if (!loaded) return;
    setResources(next);
    saveOverride("saveResources", { key: projectKey, resources: next }).catch(() => {});
  };

  const addResource = () => {
    const url = normalizeResourceUrl(newUrl);
    if (!url) return;
    const label = newLabel.trim() || url.replace(/^https?:\/\//i, "");
    persist([...resources, { id: newResourceId(), label, url }]);
    setNewLabel("");
    setNewUrl("");
    setAdding(false);
  };

  const removeResource = (id: string) => {
    persist(resources.filter((r) => r.id !== id));
  };

  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>Resources</label>

      {loaded && resources.length === 0 && !adding && (
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>No documents linked yet.</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: resources.length > 0 ? 10 : 0 }}>
        {resources.map((r) => (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>🔗</span>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              title={r.url}
              style={{ fontSize: 13, color: "#2563eb", textDecoration: "none", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {r.label}
            </a>
            <button
              onClick={() => removeResource(r.id)}
              aria-label="Remove resource"
              style={{ fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1, background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", padding: "0 2px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {adding ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Design doc)"
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fafbfc", color: "#1e293b", boxSizing: "border-box" }}
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addResource(); }}
            placeholder="Paste a link…"
            style={{ fontFamily: "var(--font-sans)", fontSize: 13, width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fafbfc", color: "#1e293b", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={addResource}
              disabled={!newUrl.trim()}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "1px solid #2563eb", background: newUrl.trim() ? "#2563eb" : "#cbd5e1", color: "white", cursor: newUrl.trim() ? "pointer" : "default" }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewLabel(""); setNewUrl(""); }}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 6, border: "1px dashed #cbd5e1", background: "white", color: "#2563eb", cursor: "pointer" }}
        >
          + Add link
        </button>
      )}
    </div>
  );
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

/** Date-only strings parse as UTC midnight; anchor them to local time. */
function parseDateLocal(dateStr: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr + "T00:00:00" : dateStr);
}

function formatDate(dateStr: string): string {
  const d = parseDateLocal(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert a month index (0 = Mar 2026) to a formatted date like "Apr 14, 2026" */
function formatMonthIndex(monthIndex: number): string {
  // Month index 0 = Mar 2026 (month 2 in JS Date). Fractional indices carry
  // mid-month day precision — JS Date's month arg would truncate them.
  const wholeMonths = Math.floor(monthIndex);
  const fractionalDays = Math.round((monthIndex - wholeMonths) * 30.44);
  const d = monthIndexDate(wholeMonths, fractionalDays);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Convert a month index (0 = Mar 2026) to an ISO date string for input[type=date] */
function monthIndexToDate(idx: number): string {
  // Support fractional month indices (weeks dragged mid-month). JS Date's month
  // arg is truncated, so split whole-months + fractional-days explicitly.
  const wholeMonths = Math.floor(idx);
  const fractionalDays = Math.round((idx - wholeMonths) * 30.44);
  const d = monthIndexDate(wholeMonths, fractionalDays);
  // Format in local time — toISOString() is UTC and can shift the day.
  return toIsoDate(d); // "2026-03-01" format
}

/** Day-of-month clamped date for a whole month index + day offset, so short
 * months (Feb) don't roll the date into the next month. */
function monthIndexDate(wholeMonths: number, fractionalDays: number): Date {
  const base = new Date(2026, 2 + wholeMonths, 1);
  const maxDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  return new Date(base.getFullYear(), base.getMonth(), Math.min(1 + fractionalDays, maxDay));
}

/** Convert a date string from input[type=date] to a fractional month index (Mar 2026 = 0) */
function dateToMonthIndex(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return (d.getFullYear() - 2026) * 12 + d.getMonth() - 2 + (d.getDate() - 1) / 30.44;
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
  onRename,
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
  onRename?: (personName: string, projectId: string, oldName: string, newName: string) => void;
}) {
  const [issues, setIssues] = useState<LinearProjectIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editStartDate, setEditStartDate] = useState(monthIndexToDate(project.startMonth));
  const [editEndDate, setEditEndDate] = useState(monthIndexToDate(project.startMonth + project.duration));
  const [editName, setEditName] = useState(project.name);
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
    let cancelled = false;
    fetchOverrides().then((ov) => {
      if (cancelled) return;
      const key = `${personName}:${project.id}`;
      const desc = ov.descriptions?.[key];
      // Keep whatever the user already typed while the fetch was in flight.
      if (desc) setDescription((cur) => (cur ? cur : desc));
    });
    return () => { cancelled = true; };
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
    // Tolerance: date inputs only carry day-level precision, so a round-trip
    // through them can drift slightly. Don't overwrite a fractional drag position
    // with a whole-day re-parse unless the user actually changed the inputs.
    const DATE_EPS = 0.05; // ≈ 1.5 days in fractional months
    if (
      Math.abs(editStartMonth - project.startMonth) > DATE_EPS ||
      Math.abs(editDuration - project.duration) > DATE_EPS
    ) {
      onUpdateDates(project.id, personName, editStartMonth, editDuration);
    }

    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== project.name) {
      onRename?.(personName, project.id, project.name, trimmedName);
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
          name: trimmedName || project.name,
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

  const fmtIssueDate = (d: string) => parseDateLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
                  setEditName(project.name);
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
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdits(); }}
              autoFocus
              className="detail-title"
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 8px",
                width: "100%",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          ) : (
            <h2 className="detail-title">{project.name}</h2>
          )}
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
                  {Math.round(project.duration * 10) / 10} month{project.duration > 1 ? "s" : ""}
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

        {/* Resources — linked documents */}
        <ProjectResources projectKey={`${personName}:${project.id}`} />

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
  onRename,
  onLinkLinearProject,
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
  onRename?: (personName: string, projectId: string, oldName: string, newName: string) => void;
  onLinkLinearProject?: (personName: string, projectId: string, linearProjectName: string) => void;
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
  const [editName, setEditName] = useState(project.name);
  const [editOwners, setEditOwners] = useState<Set<string>>(() =>
    new Set(people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name))
  );
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Link Linear project picker ─────────────────────────────────────────
  const [linkingMode, setLinkingMode] = useState<false | "search" | "create">(false);
  const [linkProjects, setLinkProjects] = useState<{ id: string; name: string }[] | null>(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkSaving, setLinkSaving] = useState(false);

  // ── Create Linear project form state ───────────────────────────────────
  const [linkTeams, setLinkTeams] = useState<{ id: string; name: string }[] | null>(null);
  const [createName, setCreateName] = useState("");
  const [createTeamId, setCreateTeamId] = useState<string>("");
  const [createStart, setCreateStart] = useState("");
  const [createTarget, setCreateTarget] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (linkingMode !== "search" || linkProjects !== null) return;
    linearQuery<{ projects: { nodes: { id: string; name: string }[] } }>(
      `query { projects(first: 100) { nodes { id name } } }`,
    )
      .then((data) => {
        setLinkProjects(data.projects.nodes.slice().sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setLinkProjects([]));
  }, [linkingMode, linkProjects]);

  useEffect(() => {
    if (linkingMode !== "create" || linkTeams !== null) return;
    linearQuery<{ teams: { nodes: { id: string; name: string }[] } }>(
      `query { teams(first: 50) { nodes { id name } } }`,
    )
      .then((data) => {
        const teams = data.teams.nodes.slice().sort((a, b) => a.name.localeCompare(b.name));
        setLinkTeams(teams);
        if (teams.length > 0) setCreateTeamId((prev) => prev || teams[0].id);
      })
      .catch(() => setLinkTeams([]));
  }, [linkingMode, linkTeams]);

  const handleLinkLinear = (linearName: string) => {
    if (linkSaving) return;
    setLinkSaving(true);
    onLinkLinearProject?.(personName, project.id, linearName);
    saveOverride("linkLinearProject", {
      key: `${personName}:${project.id}`,
      linearProjectName: linearName,
    })
      .catch((err) => console.error("Link Linear project failed:", err))
      .finally(() => {
        setLinkSaving(false);
        // Close so the next click opens the Linear-aware detail panel.
        onClose();
      });
  };

  const handleCreateLinearProject = async () => {
    if (linkSaving) return;
    const name = createName.trim();
    if (!name) {
      setCreateError("Name is required");
      return;
    }
    if (!createTeamId) {
      setCreateError("Team is required");
      return;
    }
    setCreateError(null);
    setLinkSaving(true);
    try {
      const res = await fetch("/api/linear/create-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          teamIds: [createTeamId],
          startDate: createStart || undefined,
          targetDate: createTarget || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create Linear project");
      }
      onLinkLinearProject?.(personName, project.id, name);
      await saveOverride("linkLinearProject", {
        key: `${personName}:${project.id}`,
        linearProjectName: name,
      });
      onClose();
    } catch (err) {
      console.error("Create Linear project failed:", err);
      setCreateError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLinkSaving(false);
    }
  };

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
    const DATE_EPS = 0.05; // ≈ 1.5 days — avoid overwriting fractional drags
    if (
      Math.abs(newStart - project.startMonth) > DATE_EPS ||
      Math.abs(newDuration - project.duration) > DATE_EPS
    ) {
      onUpdateDates(project.id, personName, newStart, newDuration);
    }

    const trimmedName = editName.trim();
    if (trimmedName && trimmedName !== project.name) {
      onRename?.(personName, project.id, project.name, trimmedName);
    }

    // Handle multi-owner changes
    const currentOwners = new Set(
      people.filter((p) => p.projects.some((proj) => proj.name === project.name)).map((p) => p.name)
    );
    for (const name of editOwners) {
      if (!currentOwners.has(name)) {
        onAddProjectToPerson?.(name, {
          name: trimmedName || project.name,
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
                  setEditName(project.name);
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
          {isEditing ? (
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdits(); }}
              autoFocus
              className="detail-title"
              style={{
                background: "white",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                padding: "4px 8px",
                width: "100%",
                fontFamily: "inherit",
                outline: "none",
              }}
            />
          ) : (
            <h2 className="detail-title">{project.name}</h2>
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
                  {Math.round(project.duration * 10) / 10} month{project.duration > 1 ? "s" : ""}
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

        {/* Link to Linear project */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 6 }}>
            Linear Project
          </label>
          {linkingMode === false ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#94a3b8", flex: 1 }}>Not linked</span>
              <button
                onClick={() => setLinkingMode("search")}
                style={{
                  fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                  padding: "6px 12px", cursor: "pointer", borderRadius: 6,
                  border: "1px solid #6366f1", background: "white", color: "#6366f1",
                }}
              >
                Link Linear project
              </button>
              <button
                onClick={() => {
                  setCreateName(project.name);
                  setCreateStart(monthIndexToDate(project.startMonth));
                  setCreateTarget(monthIndexToDate(project.startMonth + project.duration));
                  setCreateError(null);
                  setLinkingMode("create");
                }}
                style={{
                  fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                  padding: "6px 12px", cursor: "pointer", borderRadius: 6,
                  border: "1px solid #6366f1", background: "#6366f1", color: "white",
                }}
              >
                Create new
              </button>
            </div>
          ) : linkingMode === "search" ? (
            <div>
              <input
                type="text"
                autoFocus
                value={linkSearch}
                onChange={(e) => setLinkSearch(e.target.value)}
                placeholder={linkProjects === null ? "Loading Linear projects..." : "Search Linear projects..."}
                disabled={linkProjects === null || linkSaving}
                style={{
                  width: "100%", fontFamily: "var(--font-sans)", fontSize: 13,
                  padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
                  outline: "none", marginBottom: 6,
                }}
              />
              <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                {linkProjects === null && (
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>Loading...</div>
                )}
                {linkProjects !== null && linkProjects
                  .filter((lp) => !linkSearch.trim() || lp.name.toLowerCase().includes(linkSearch.trim().toLowerCase()))
                  .map((lp) => (
                    <div
                      key={lp.id}
                      onClick={() => handleLinkLinear(lp.name)}
                      style={{
                        padding: "6px 10px", fontSize: 13, cursor: "pointer",
                        borderBottom: "1px solid #f1f5f9",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      {lp.name}
                    </div>
                  ))}
                {linkProjects !== null && linkProjects.filter((lp) => !linkSearch.trim() || lp.name.toLowerCase().includes(linkSearch.trim().toLowerCase())).length === 0 && (
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "#94a3b8" }}>No matches</div>
                )}
              </div>
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 6 }}>
                <button
                  onClick={() => {
                    setCreateName(project.name);
                    setCreateStart(monthIndexToDate(project.startMonth));
                    setCreateTarget(monthIndexToDate(project.startMonth + project.duration));
                    setCreateError(null);
                    setLinkingMode("create");
                  }}
                  disabled={linkSaving}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 12, padding: "4px 10px",
                    border: "1px solid #6366f1", borderRadius: 6, background: "white",
                    color: "#6366f1", cursor: linkSaving ? "default" : "pointer",
                  }}
                >
                  + Create new
                </button>
                <button
                  onClick={() => { setLinkingMode(false); setLinkSearch(""); }}
                  disabled={linkSaving}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 12, padding: "4px 10px",
                    border: "1px solid #e0e0ea", borderRadius: 6, background: "white",
                    color: "#475569", cursor: linkSaving ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Name</label>
                  <input
                    type="text"
                    autoFocus
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleCreateLinearProject(); }}
                    disabled={linkSaving}
                    style={{
                      width: "100%", fontFamily: "var(--font-sans)", fontSize: 13,
                      padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Team</label>
                  <select
                    value={createTeamId}
                    onChange={(e) => setCreateTeamId(e.target.value)}
                    disabled={linkTeams === null || linkSaving}
                    style={{
                      width: "100%", fontFamily: "var(--font-sans)", fontSize: 13,
                      padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
                      outline: "none", background: "white",
                    }}
                  >
                    {linkTeams === null && <option value="">Loading teams...</option>}
                    {linkTeams !== null && linkTeams.length === 0 && <option value="">No teams found</option>}
                    {linkTeams?.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Start</label>
                    <input
                      type="date"
                      value={createStart}
                      onChange={(e) => setCreateStart(e.target.value)}
                      disabled={linkSaving}
                      style={{
                        width: "100%", fontFamily: "var(--font-sans)", fontSize: 13,
                        padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
                        outline: "none",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>Target</label>
                    <input
                      type="date"
                      value={createTarget}
                      onChange={(e) => setCreateTarget(e.target.value)}
                      disabled={linkSaving}
                      style={{
                        width: "100%", fontFamily: "var(--font-sans)", fontSize: 13,
                        padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
                        outline: "none",
                      }}
                    />
                  </div>
                </div>
                {createError && (
                  <div style={{ fontSize: 12, color: "#dc2626" }}>{createError}</div>
                )}
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", gap: 6 }}>
                <button
                  onClick={() => { setLinkingMode(false); setCreateError(null); }}
                  disabled={linkSaving}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 12, padding: "4px 10px",
                    border: "1px solid #e0e0ea", borderRadius: 6, background: "white",
                    color: "#475569", cursor: linkSaving ? "default" : "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateLinearProject}
                  disabled={linkSaving || linkTeams === null}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                    padding: "4px 12px", borderRadius: 6,
                    border: "1px solid #6366f1", background: "#6366f1", color: "white",
                    cursor: linkSaving ? "default" : "pointer", opacity: linkSaving ? 0.6 : 1,
                  }}
                >
                  {linkSaving ? "Creating..." : "Create & link"}
                </button>
              </div>
            </div>
          )}
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

        {/* Resources — linked documents */}
        <ProjectResources projectKey={`${personName}:${project.id}`} />

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
  const order: ZoomLevel[] = ["quarter", "month", "biweekly", "week"];
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
  const today = toIsoDate(new Date());
  const threeMonths = toIsoDate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
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
          height: 32, padding: "0 12px", cursor: "pointer", borderRadius: 8,
          border: "1px solid #e0e0ea", background: count > 0 ? "#eef2ff" : "#f8f9fb", color: "#1e293b",
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
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
  viewMode: "projects" | "subtestEdits" | "cycles" | "futureProjects" | "weeklyPlanning" | "normingCountdown" | "metrics";
  onViewMode: (m: "projects" | "subtestEdits" | "cycles" | "futureProjects" | "weeklyPlanning" | "normingCountdown" | "metrics") => void;
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
        <h1 style={{ fontFamily: "var(--font-sans)", fontSize: 18, fontWeight: 800, color: "#f59e0b", margin: 0, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Marker Method Roadmap</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: 2 }}>
            {([
              ["projects", "Projects"],
              ["subtestEdits", "Tasks"],
              ["futureProjects", "Future Projects"],
              ["weeklyPlanning", "Weekly Planning"],
              ["normingCountdown", "Norming Countdown"],
              ["metrics", "Metrics"],
            ] as const).map(([mode, label]) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onViewMode(mode)}
                  style={{
                    fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
                    height: 28, padding: "0 12px", cursor: "pointer", border: "none",
                    borderRadius: 6, whiteSpace: "nowrap",
                    background: active ? "#fff" : "transparent",
                    color: active ? "#1e293b" : "#64748b",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <button
            onClick={onAddProject}
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
              height: 32, padding: "0 14px", cursor: "pointer", border: "none",
              borderRadius: 8, whiteSpace: "nowrap",
              background: "#22c55e", color: "white",
            }}
          >
            + Add Project
          </button>
        </div>
      </div>
      <div className="filter-bar-right">
        <input
          type="text"
          className="filter-search"
          placeholder="Search..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Cmd+Z)"
          style={{
            fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600,
            height: 32, padding: "0 12px", cursor: canUndo ? "pointer" : "not-allowed",
            borderRadius: 8, border: "1px solid #e0e0ea",
            background: "#f8f9fb", color: "#1e293b",
            opacity: canUndo ? 1 : 0.4,
          }}
        >
          Undo
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
    hlib: "Hlib",
    liuda: "Luida",
    john: "John",
    luida: "Luida",
    ak: "AK",
    maria: "Maria",
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
    alex: "Alex",
    "alex.morse": "Alex",
    patrick: "Patrick",
    "patrick.tone": "Patrick",
    daryl: "Daryl",
    darylkang: "Daryl",
  };
  return map[lower] ?? null;
}

// ── Unique project ID for new projects ─────────────────────────────────



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

  const fmtDate = (d: string) => parseDateLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
  startDate?: string;
  targetDate?: string;
};

type FPDragState = {
  index: number;
  mode: "move" | "resize";
  startMouseX: number;
  originalStart: Date;
  originalEnd: Date;
  currentStart: Date;
  currentEnd: Date;
};

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FutureProjectsView({
  people,
  phases,
  onAssignToRoadmap,
}: {
  people: Person[];
  phases?: Phase[];
  onAssignToRoadmap: (proj: FutureProject, owner: string, startDate: string, endDate: string) => void;
}) {
  const [projects, setProjects] = useState<FutureProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [defaultTeamId, setDefaultTeamId] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [assignOwner, setAssignOwner] = useState("");
  const [assignStart, setAssignStart] = useState("");
  const [assignEnd, setAssignEnd] = useState("");
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupName, setPopupName] = useState("");

  const today = new Date();
  const [granularity, setGranularity] = useState<PRGranularity>("year");
  // The Year window runs Aug(year)-Jul(year+2), so Jan-Jul dates belong to
  // the window that started the PREVIOUS August.
  const [year, setYear] = useState(today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1);
  const [month, setMonth] = useState(today.getMonth());
  const [weekStartIso, setWeekStartIso] = useState(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return toIsoDate(d);
  });

  useEffect(() => {
    fetchOverrides().then((ov) => {
      const list = ov.futureProjects ?? [];
      const todayIso = toIsoDate(new Date());
      const monthOutIso = toIsoDate(new Date(Date.now() + 30 * 86400000));
      const migrated = list.map((p) => {
        if (p.startDate && p.targetDate) return p;
        return { ...p, startDate: p.startDate ?? todayIso, targetDate: p.targetDate ?? monthOutIso };
      });
      setProjects(migrated);
      setLoading(false);
      list.forEach((p, idx) => {
        if (!p.startDate || !p.targetDate) {
          const u = migrated[idx];
          saveOverride("updateFutureProject", {
            index: idx,
            project: { startDate: u.startDate, targetDate: u.targetDate },
          }).catch(() => {});
        }
      });
    });
    linearQuery<{ teams: { nodes: { id: string; name: string }[] } }>(
      `query { teams(first: 10) { nodes { id name } } }`,
    ).then((data) => {
      const mm = data.teams.nodes.find((t) => t.name === "Marker Method");
      setDefaultTeamId(mm?.id ?? data.teams.nodes[0]?.id ?? null);
    }).catch(() => {});
  }, []);

  const columns = useMemo<{ start: Date; end: Date; label: string }[]>(() => {
    if (granularity === "year") {
      // 24 months starting from August of the selected year, matching the
      // Projects tab.
      return Array.from({ length: 24 }, (_, i) => {
        const m = (7 + i) % 12;
        const y = year + Math.floor((7 + i) / 12);
        return {
          start: prStartOfMonth(y, m),
          end: prEndOfMonth(y, m),
          label: i === 0 || m === 0 ? `${PR_SHORT_MO[m]} ${y}` : PR_SHORT_MO[m],
        };
      });
    }
    if (granularity === "month") return prWeeksInMonth(year, month);
    const start = new Date(weekStartIso + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const sm = PR_SHORT_MO[start.getMonth()];
    const em = PR_SHORT_MO[end.getMonth()];
    const label = sm === em
      ? `${sm} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
      : `${sm} ${start.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
    return [{ start, end, label }];
  }, [granularity, year, month, weekStartIso]);

  const visibleRange = useMemo(() => {
    if (columns.length === 0) return null;
    return { start: columns[0].start, end: columns[columns.length - 1].end };
  }, [columns]);

  const navigatePrev = () => {
    if (granularity === "year") setYear((y) => y - 1);
    else if (granularity === "month") {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); }
      else setMonth((m) => m - 1);
    } else {
      const d = new Date(weekStartIso + "T00:00:00");
      d.setDate(d.getDate() - 7);
      setWeekStartIso(toIsoDate(d));
    }
  };
  const navigateNext = () => {
    if (granularity === "year") setYear((y) => y + 1);
    else if (granularity === "month") {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); }
      else setMonth((m) => m + 1);
    } else {
      const d = new Date(weekStartIso + "T00:00:00");
      d.setDate(d.getDate() + 7);
      setWeekStartIso(toIsoDate(d));
    }
  };
  const navigateToday = () => {
    const t = new Date();
    // Year view anchors its Aug-start window; Month/Week use the calendar year.
    if (granularity === "year") {
      setYear(t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1);
    } else {
      setYear(t.getFullYear());
    }
    setMonth(t.getMonth());
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    setWeekStartIso(toIsoDate(d));
  };

  const title = useMemo(() => {
    if (granularity === "year") return "";
    if (granularity === "month") return `${PR_FULL_MO[month]} ${year}`;
    return `Week of ${columns[0]?.label ?? ""}`;
  }, [granularity, year, month, columns]);

  const SIDEBAR = 160;
  const MIN_COL_WIDTH = granularity === "week" ? 720 : granularity === "year" ? 100 : 220;
  const ROW_PAD_Y = 12;
  const ROW_BAR_HEIGHT = 30;
  const ROW_BAR_GAP = 6;
  const PHASE_HEIGHT_LOCAL = 32;
  const TOOLBAR_HEIGHT = 70;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const colWidth = useMemo(() => {
    if (containerWidth <= 0 || columns.length === 0) return MIN_COL_WIDTH;
    const avail = containerWidth - SIDEBAR;
    return Math.max(MIN_COL_WIDTH, Math.floor(avail / columns.length));
  }, [containerWidth, columns.length, MIN_COL_WIDTH]);

  const dragRef = useRef<FPDragState | null>(null);
  const didDragRef = useRef(false);
  const [, setDragTick] = useState(0);
  const forceRender = () => setDragTick((t) => t + 1);

  const [datelessDragIdx, setDatelessDragIdx] = useState<number | null>(null);
  const [dropPreviewX, setDropPreviewX] = useState<number | null>(null);

  const xToDateOnTimeline = (x: number): Date => {
    if (columns.length === 0) return new Date();
    const fractional = x / colWidth;
    const colIdx = Math.max(0, Math.min(columns.length - 1, Math.floor(fractional)));
    const frac = Math.max(0, Math.min(1, fractional - Math.floor(fractional)));
    const col = columns[colIdx];
    const colEnd = new Date(col.end);
    colEnd.setDate(colEnd.getDate() + 1);
    const span = colEnd.getTime() - col.start.getTime();
    return new Date(col.start.getTime() + frac * span);
  };

  useEffect(() => {
    const daysPerCol = granularity === "year" ? 30.44 : 7;
    const daysPerPx = daysPerCol / colWidth;
    const onMove = (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startMouseX;
      if (Math.abs(dx) > 3) didDragRef.current = true;
      const dMs = dx * daysPerPx * 86400000;
      if (ds.mode === "move") {
        ds.currentStart = new Date(ds.originalStart.getTime() + dMs);
        ds.currentEnd = new Date(ds.originalEnd.getTime() + dMs);
      } else {
        const minMs = 86400000; // 1 day minimum span
        let newEnd = new Date(ds.originalEnd.getTime() + dMs);
        if (newEnd.getTime() < ds.currentStart.getTime() + minMs) {
          newEnd = new Date(ds.currentStart.getTime() + minMs);
        }
        ds.currentEnd = newEnd;
      }
      forceRender();
    };
    const onUp = () => {
      const ds = dragRef.current;
      if (!ds) return;
      if (didDragRef.current) {
        const snap = (d: Date) => {
          const x = new Date(d);
          x.setHours(0, 0, 0, 0);
          return x;
        };
        const newStart = snap(ds.currentStart);
        const newEnd = snap(ds.currentEnd);
        const startIso = toIsoDate(newStart);
        const endIso = toIsoDate(newEnd);
        const idx = ds.index;
        setProjects((prev) => prev.map((p, i) => i === idx ? { ...p, startDate: startIso, targetDate: endIso } : p));
        saveOverride("updateFutureProject", { index: idx, project: { startDate: startIso, targetDate: endIso } }).catch(() => {});
      }
      dragRef.current = null;
      setTimeout(() => { didDragRef.current = false; }, 0);
      forceRender();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [granularity, colWidth]);

  const startDrag = (
    e: React.MouseEvent,
    index: number,
    startIso: string,
    endIso: string,
    mode: "move" | "resize",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;
    const start = new Date(startIso + "T00:00:00");
    const end = new Date(endIso + "T00:00:00");
    dragRef.current = {
      index, mode, startMouseX: e.clientX,
      originalStart: start, originalEnd: end,
      currentStart: start, currentEnd: end,
    };
    forceRender();
  };

  const createProject = async (rawName: string, withDates: boolean): Promise<FutureProject | null> => {
    const name = rawName.trim();
    if (!name || !defaultTeamId) return null;
    setCreating(true);
    try {
      const res = await fetch("/api/linear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `mutation CreateProject($input: ProjectCreateInput!) { projectCreate(input: $input) { success project { id name url } } }`,
          variables: { input: { name, teamIds: [defaultTeamId] } },
        }),
      });
      const json = await res.json();
      const created = json.data?.projectCreate;
      if (created?.project?.id) {
        fetch("/api/linear", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `mutation { initiativeToProjectCreate(input: { initiativeId: "b20d5d16-f6cf-4c73-840d-2fb9e3635851", projectId: "${created.project.id}" }) { success } }`,
          }),
        }).catch(() => {});
      }
      const newProject: FutureProject = {
        name,
        description: "",
        linearProjectId: created?.project?.id,
        linearProjectUrl: created?.project?.url,
        ...(withDates ? {
          startDate: toIsoDate(new Date()),
          targetDate: toIsoDate(new Date(Date.now() + 30 * 86400000)),
        } : {}),
      };
      setProjects((prev) => [...prev, newProject]);
      saveOverride("addFutureProject", { project: newProject });
      return newProject;
    } catch (err) { console.error("Failed to create:", err); return null; }
    finally { setCreating(false); }
  };

  const addProjectFromPopup = async () => {
    const created = await createProject(popupName, false);
    if (created) { setPopupName(""); setPopupOpen(false); }
  };

  const removeProject = (idx: number) => {
    setProjects((prev) => prev.filter((_, i) => i !== idx));
    saveOverride("removeFutureProject", { index: idx });
    if (selectedIdx === idx) setSelectedIdx(null);
    else if (selectedIdx !== null && selectedIdx > idx) setSelectedIdx(selectedIdx - 1);
  };

  const openPanel = (idx: number) => {
    const p = projects[idx];
    if (!p) return;
    setSelectedIdx(idx);
    setAssignOwner("");
    setAssignStart(p.startDate ?? toIsoDate(new Date()));
    setAssignEnd(p.targetDate ?? toIsoDate(new Date(Date.now() + 90 * 86400000)));
  };

  const assignWithOwner = (owner: string) => {
    if (selectedIdx === null || !owner || !assignStart || !assignEnd) return;
    const proj = projects[selectedIdx];
    onAssignToRoadmap(proj, owner, assignStart, assignEnd);
    removeProject(selectedIdx);
    setSelectedIdx(null);
  };

  const saveDates = () => {
    if (selectedIdx === null || !assignStart || !assignEnd) return;
    const idx = selectedIdx;
    setProjects((prev) => prev.map((p, i) => i === idx ? { ...p, startDate: assignStart, targetDate: assignEnd } : p));
    saveOverride("updateFutureProject", { index: idx, project: { startDate: assignStart, targetDate: assignEnd } }).catch(() => {});
  };

  const selectedProj = selectedIdx !== null ? projects[selectedIdx] : null;

  // Build dated/dateless lists with original indices preserved
  const enriched = projects.map((proj, idx) => ({ proj, idx }));
  const dated = enriched.filter(({ proj }) => proj.startDate && proj.targetDate);
  const dateless = enriched.filter(({ proj }) => !proj.startDate || !proj.targetDate);

  type BarItem = { proj: FutureProject; idx: number; range: { start: Date; end: Date } };
  const bars: BarItem[] = dated.map(({ proj, idx }) => ({
    proj, idx,
    range: {
      start: new Date(proj.startDate! + "T00:00:00"),
      end: new Date(proj.targetDate! + "T00:00:00"),
    },
  }));

  const ds = dragRef.current;
  const effectiveRange = (b: BarItem): { start: Date; end: Date } => {
    if (ds && ds.index === b.idx) return { start: ds.currentStart, end: ds.currentEnd };
    return b.range;
  };

  const visibleBars: BarItem[] = visibleRange
    ? bars
        .map((b) => ({ ...b, range: effectiveRange(b) }))
        .filter(({ range }) => rangesOverlap(range, visibleRange))
        .sort((a, b) => a.range.start.getTime() - b.range.start.getTime())
    : [];

  type LanedBar = BarItem & { lane: number };
  const laneEnds: number[] = [];
  const laned: LanedBar[] = [];
  for (const b of visibleBars) {
    let placed = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] < b.range.start.getTime()) {
        laneEnds[i] = b.range.end.getTime();
        laned.push({ ...b, lane: i });
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(b.range.end.getTime());
      laned.push({ ...b, lane: laneEnds.length - 1 });
    }
  }
  const laneCount = Math.max(1, laneEnds.length);
  const barsHeight = laneCount * (ROW_BAR_HEIGHT + ROW_BAR_GAP);
  const rowHeight = Math.max(120, ROW_PAD_Y * 2 + barsHeight);

  const BAR_COLOR = "#22c55e";
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 };
  const inputStyle: React.CSSProperties = { fontFamily: "var(--font-sans)", fontSize: 14, padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", width: "100%", outline: "none" };

  const breadcrumb = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: 2 }}>
        {(["year", "month", "week"] as PRGranularity[]).map((g) => {
          const active = granularity === g;
          return (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                height: 26,
                padding: "0 12px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "capitalize",
                background: active ? "white" : "transparent",
                color: active ? "#1e293b" : "#64748b",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
      <button onClick={navigatePrev} style={prNavBtnStyle}>‹</button>
      <button onClick={navigateNext} style={prNavBtnStyle}>›</button>
      <button onClick={navigateToday} style={{ ...prNavBtnStyle, width: "auto", padding: "0 10px" }}>Today</button>
      <h2 style={{ margin: "0 0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title || "Future Projects"}</h2>
    </div>
  );

  return (
    <div style={{ position: "relative", height: "calc(100vh - 80px)", overflow: "hidden" }}>
      <div
        ref={containerRef}
        style={{ height: "100%", overflow: "auto", background: "#fafafa", fontFamily: "var(--font-sans)" }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e8e8ef",
            background: "white",
            position: "sticky",
            top: 0,
            zIndex: 5,
          }}
        >
          {breadcrumb}
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
            {loading
              ? "Loading…"
              : `${dated.length} scheduled · ${dateless.length} without dates`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", minWidth: SIDEBAR + columns.length * colWidth }}>
          {phases && phases.length > 0 && visibleRange && (() => {
            const visiblePhases = phases
              .map((ph) => ({ phase: ph, range: projectAbsoluteRange(ph) }))
              .filter(({ range }) => rangesOverlap(range, visibleRange));
            return (
              <div
                style={{
                  display: "flex",
                  position: "sticky",
                  top: TOOLBAR_HEIGHT,
                  zIndex: 4,
                  background: "white",
                  borderBottom: "1px solid #e8e8ef",
                }}
              >
                <div
                  style={{
                    width: SIDEBAR,
                    flexShrink: 0,
                    height: PHASE_HEIGHT_LOCAL,
                    borderRight: "1px solid #e8e8ef",
                    background: "white",
                  }}
                />
                <div style={{ position: "relative", flex: 1, height: PHASE_HEIGHT_LOCAL }}>
                  {visiblePhases.map(({ phase, range }) => {
                    const drawStart = range.start < visibleRange.start ? visibleRange.start : range.start;
                    const drawEndInclusive = range.end > visibleRange.end ? visibleRange.end : range.end;
                    const drawEndExclusive = new Date(drawEndInclusive);
                    drawEndExclusive.setDate(drawEndExclusive.getDate() + 1);
                    const startPos = prFractionalColPos(drawStart, columns);
                    const endPos = prFractionalColPos(drawEndExclusive, columns);
                    const x = startPos * colWidth;
                    const w = Math.max(0, (endPos - startPos) * colWidth);
                    return (
                      <div
                        key={phase.name}
                        title={phase.name}
                        style={{
                          position: "absolute",
                          left: x,
                          top: 0,
                          width: w,
                          height: PHASE_HEIGHT_LOCAL,
                          background: phase.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-sans)",
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          borderRight: "1px solid rgba(15,23,42,0.06)",
                        }}
                      >
                        {phase.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <div
            style={{
              display: "flex",
              position: "sticky",
              top: phases && phases.length > 0 ? TOOLBAR_HEIGHT + PHASE_HEIGHT_LOCAL : TOOLBAR_HEIGHT,
              zIndex: 4,
              background: "white",
              borderBottom: "2px solid #e8e8ef",
            }}
          >
            <div
              style={{
                width: SIDEBAR,
                flexShrink: 0,
                padding: "10px 12px",
                fontSize: 12,
                fontWeight: 700,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                borderRight: "1px solid #e8e8ef",
                background: "white",
              }}
            >
              Unassigned
            </div>
            {columns.map((c, i) => {
              const drillable = granularity !== "week";
              return (
                <button
                  key={`col-${i}`}
                  onClick={() => {
                    if (!drillable) return;
                    // Columns start at August, so index i is not calendar month i.
                    if (granularity === "year") { setYear(c.start.getFullYear()); setMonth(c.start.getMonth()); setGranularity("month"); }
                    else if (granularity === "month") {
                      const w = columns[i];
                      setWeekStartIso(toIsoDate(w.start));
                      setGranularity("week");
                    }
                  }}
                  disabled={!drillable}
                  style={{
                    width: colWidth,
                    flexShrink: 0,
                    padding: "10px 12px",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#0f172a",
                    background: "white",
                    border: "none",
                    borderLeft: i === 0 ? "none" : "1px solid #e8e8ef",
                    textAlign: "left",
                    cursor: drillable ? "pointer" : "default",
                  }}
                  title={drillable ? `Drill into ${c.label}` : undefined}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Timeline row */}
          {visibleRange && (
            <div
              style={{
                display: "flex",
                minHeight: rowHeight,
                background: hexToRgba(BAR_COLOR, 0.05),
                borderBottom: "1px solid #e8e8ef",
              }}
            >
              <div
                style={{
                  width: SIDEBAR,
                  flexShrink: 0,
                  padding: "10px 12px",
                  position: "sticky",
                  left: 0,
                  zIndex: 2,
                  background: hexToRgba(BAR_COLOR, 0.08),
                  borderRight: "1px solid #e8e8ef",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div style={{ width: 4, height: 28, background: BAR_COLOR, borderRadius: 2 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Future Projects</span>
              </div>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: rowHeight,
                  outline: datelessDragIdx !== null ? `2px dashed ${BAR_COLOR}` : "none",
                  outlineOffset: -2,
                  background: datelessDragIdx !== null ? hexToRgba(BAR_COLOR, 0.04) : "transparent",
                }}
                onDragOver={(e) => {
                  if (datelessDragIdx === null) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDropPreviewX(e.clientX - rect.left);
                }}
                onDragLeave={() => setDropPreviewX(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  const idxStr = e.dataTransfer.getData("text/plain");
                  const idx = parseInt(idxStr, 10);
                  setDatelessDragIdx(null);
                  setDropPreviewX(null);
                  if (isNaN(idx)) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const startDate = xToDateOnTimeline(x);
                  startDate.setHours(0, 0, 0, 0);
                  const endDate = new Date(startDate.getTime() + 30 * 86400000);
                  const startIso = toIsoDate(startDate);
                  const endIso = toIsoDate(endDate);
                  setProjects((prev) => prev.map((p, i) => i === idx ? { ...p, startDate: startIso, targetDate: endIso } : p));
                  saveOverride("updateFutureProject", { index: idx, project: { startDate: startIso, targetDate: endIso } }).catch(() => {});
                }}
              >
                {columns.map((_, i) => (
                  <div
                    key={`vline-${i}`}
                    style={{
                      position: "absolute",
                      left: i * colWidth,
                      top: 0,
                      width: 1,
                      height: rowHeight,
                      background: "rgba(15,23,42,0.06)",
                    }}
                  />
                ))}

                {datelessDragIdx !== null && dropPreviewX !== null && (
                  <div
                    style={{
                      position: "absolute",
                      left: dropPreviewX,
                      top: ROW_PAD_Y,
                      width: Math.max(20, (30 / (granularity === "year" ? 30.44 : 7)) * colWidth - 8),
                      height: ROW_BAR_HEIGHT,
                      background: hexToRgba(BAR_COLOR, 0.35),
                      border: `2px dashed ${BAR_COLOR}`,
                      borderRadius: 6,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {laned.map(({ proj, idx, range, lane }) => {
                  const drawStart = range.start < visibleRange.start ? visibleRange.start : range.start;
                  const drawEndInclusive = range.end > visibleRange.end ? visibleRange.end : range.end;
                  const drawEndExclusive = new Date(drawEndInclusive);
                  drawEndExclusive.setDate(drawEndExclusive.getDate() + 1);
                  const startPos = prFractionalColPos(drawStart, columns);
                  const endPos = prFractionalColPos(drawEndExclusive, columns);
                  const x = startPos * colWidth + 4;
                  const w = Math.max(20, (endPos - startPos) * colWidth - 8);
                  const y = ROW_PAD_Y + lane * (ROW_BAR_HEIGHT + ROW_BAR_GAP);
                  const isDragging = !!ds && ds.index === idx;
                  return (
                    <div
                      key={`bar-${idx}`}
                      style={{
                        position: "absolute",
                        left: x,
                        top: y,
                        width: w,
                        height: ROW_BAR_HEIGHT,
                        background: hexToRgba(BAR_COLOR, isDragging ? 0.95 : 0.85),
                        color: "white",
                        borderRadius: 6,
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        boxShadow: isDragging
                          ? "0 4px 12px rgba(15,23,42,0.18)"
                          : "0 1px 2px rgba(15,23,42,0.08)",
                        cursor: "grab",
                        userSelect: "none",
                      }}
                      title={`${proj.name}\n${range.start.toLocaleDateString()} – ${range.end.toLocaleDateString()}`}
                      onMouseDown={(e) => startDrag(e, idx, proj.startDate!, proj.targetDate!, "move")}
                      onClick={(e) => {
                        if (didDragRef.current) { e.preventDefault(); return; }
                        openPanel(idx);
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          padding: "0 10px",
                          display: "flex",
                          alignItems: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {proj.name}
                      </div>
                      <div
                        onMouseDown={(e) => startDrag(e, idx, proj.startDate!, proj.targetDate!, "resize")}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          width: 6,
                          height: "100%",
                          cursor: "ew-resize",
                          background: "rgba(255,255,255,0.0)",
                        }}
                        title="Drag to resize"
                      />
                    </div>
                  );
                })}

                {!loading && laned.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                      fontSize: 13,
                      pointerEvents: "none",
                    }}
                  >
                    No scheduled future projects in this range
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Without Dates list */}
          <div
            style={{
              padding: "20px 24px",
              background: "white",
              position: "sticky",
              left: 0,
              width: containerWidth > 0 ? containerWidth : "100%",
              boxSizing: "border-box",
              borderTop: "1px solid #e8e8ef",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Without Dates
              </h3>
              <button
                onClick={() => { setPopupName(""); setPopupOpen(true); }}
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  padding: "6px 14px",
                  border: "none",
                  borderRadius: 8,
                  background: BAR_COLOR,
                  color: "white",
                  cursor: "pointer",
                }}
              >
                + Add Project
              </button>
            </div>
            {loading && (
              <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>Loading…</div>
            )}
            {!loading && dateless.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>
                No undated projects. Click <strong>+ Add Project</strong> to create one, then drag it onto the timeline.
              </div>
            )}
            {!loading && dateless.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dateless.map(({ proj, idx }) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(idx));
                      e.dataTransfer.effectAllowed = "move";
                      setDatelessDragIdx(idx);
                    }}
                    onDragEnd={() => { setDatelessDragIdx(null); setDropPreviewX(null); }}
                    onClick={() => openPanel(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: selectedIdx === idx ? "#f0fdf4" : "#f8fafc",
                      borderRadius: 8,
                      border: selectedIdx === idx ? `2px solid ${BAR_COLOR}` : "1px solid #e2e8f0",
                      cursor: "grab",
                      opacity: datelessDragIdx === idx ? 0.4 : 1,
                    }}
                  >
                    <span
                      style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1, cursor: "grab", flexShrink: 0 }}
                      title="Drag to timeline"
                    >
                      ⋮⋮
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#1e293b", flex: 1 }}>
                      {proj.name}
                    </span>
                    {proj.linearProjectUrl && (
                      <a
                        href={proj.linearProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 12, color: BAR_COLOR, textDecoration: "none" }}
                      >
                        Linear &#8599;
                      </a>
                    )}
                    <span
                      onClick={(e) => { e.stopPropagation(); if (confirm(`Remove "${proj.name}"?`)) removeProject(idx); }}
                      style={{ fontSize: 16, color: "#cbd5e1", padding: "0 4px", lineHeight: 1 }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#dc2626"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = "#cbd5e1"; }}
                    >
                      &times;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Project popup */}
      {popupOpen && (
        <div
          onClick={() => { if (!creating) setPopupOpen(false); }}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,23,42,0.40)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 20,
            fontFamily: "var(--font-sans)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 14,
              boxShadow: "0 20px 60px rgba(15,23,42,0.25)",
              width: 440,
              maxWidth: "90vw",
              padding: "24px 24px 20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>New Future Project</h3>
              <button
                onClick={() => { if (!creating) setPopupOpen(false); }}
                aria-label="Close"
                style={{ fontFamily: "var(--font-sans)", fontSize: 20, lineHeight: 1, background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0 4px" }}
              >
                &times;
              </button>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 6 }}>
              Project Name
            </label>
            <input
              type="text"
              value={popupName}
              onChange={(e) => setPopupName(e.target.value)}
              autoFocus
              placeholder="e.g. Adaptive Pacing v2"
              onKeyDown={(e) => {
                if (e.key === "Enter" && popupName.trim() && !creating) addProjectFromPopup();
                if (e.key === "Escape" && !creating) setPopupOpen(false);
              }}
              style={{ width: "100%", fontFamily: "var(--font-sans)", fontSize: 15, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", marginBottom: 8 }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 20 }}>
              Added without dates. Drag it onto the timeline to schedule.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                onClick={() => { if (!creating) setPopupOpen(false); }}
                disabled={creating}
                style={{ fontFamily: "var(--font-sans)", fontSize: 14, padding: "10px 18px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", color: "#64748b", cursor: creating ? "default" : "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={addProjectFromPopup}
                disabled={!popupName.trim() || creating}
                style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 700, padding: "10px 20px", border: "none", borderRadius: 8, background: popupName.trim() && !creating ? BAR_COLOR : "#cbd5e1", color: "white", cursor: popupName.trim() && !creating ? "pointer" : "default" }}
              >
                {creating ? "Adding…" : "Add Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in side panel */}
      {selectedProj && (
        <>
          <div
            onClick={() => setSelectedIdx(null)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,23,42,0.18)",
              zIndex: 10,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 420,
              background: "white",
              boxShadow: "-8px 0 24px rgba(15,23,42,0.10)",
              padding: "24px 28px",
              overflow: "auto",
              zIndex: 11,
              fontFamily: "var(--font-sans)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", margin: 0, lineHeight: 1.25 }}>{selectedProj.name}</h2>
              <button
                onClick={() => setSelectedIdx(null)}
                aria-label="Close"
                style={{ fontFamily: "var(--font-sans)", fontSize: 20, lineHeight: 1, background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "0 4px" }}
              >
                &times;
              </button>
            </div>
            {selectedProj.linearProjectUrl && (
              <a
                href={selectedProj.linearProjectUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: BAR_COLOR, textDecoration: "none", display: "inline-block", marginBottom: 20 }}
              >
                View in Linear &#8599;
              </a>
            )}
            {!selectedProj.linearProjectUrl && <div style={{ marginBottom: 20 }} />}

            <div style={{ background: "#f8fafc", borderRadius: 12, border: "1px solid #e2e8f0", padding: 20 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Owner</label>
                <select
                  value={assignOwner}
                  onChange={(e) => {
                    const v = e.target.value;
                    setAssignOwner(v);
                    if (v) assignWithOwner(v);
                  }}
                  style={inputStyle}
                >
                  <option value="">Select owner…</option>
                  {people.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                  Pick an owner to assign this project to the roadmap.
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Date</label>
                  <input type="date" value={assignStart} onChange={(e) => setAssignStart(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Date</label>
                  <input type="date" value={assignEnd} onChange={(e) => setAssignEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={saveDates}
                  style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, padding: "10px 20px", border: "1px solid #e2e8f0", borderRadius: 8, background: "white", color: "#1e293b", cursor: "pointer" }}
                >
                  Save Dates Only
                </button>
              </div>
            </div>

            <button
              onClick={() => { if (confirm(`Remove "${selectedProj.name}" from future projects?`)) removeProject(selectedIdx!); }}
              style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", marginTop: 20, padding: 0 }}
            >
              Remove from Future Projects
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Product Roadmap View ───────────────────────────────────────────────

type PRGranularity = "year" | "month" | "week";
type PRTeamFilter = "all" | "engProd" | "opsGtm";

const PR_ENG_PROD_PEOPLE = new Set([
  "Cara",
  "Alex",
  "Lucie",
  "John",
  "Luida",
  "Oleksii",
  "AK",
  "Hlib",
]);

type StandaloneTicket = {
  id: string;
  identifier: string;
  url: string;
  title: string;
  state: { name: string; color: string; type: string };
  dueDate: string;
  assigneeName: string;
  projectId: string | null;
  projectName: string | null;
  priority: number;
  cycleId: string | null;
};

const PR_SHORT_MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PR_FULL_MO = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function projectAbsoluteRange(p: { startMonth: number; duration: number }): { start: Date; end: Date } {
  const startWhole = Math.floor(p.startMonth);
  const startFrac = Math.round((p.startMonth - startWhole) * 30.44);
  const start = new Date(2026, 2 + startWhole, 1 + startFrac);
  const endIdx = p.startMonth + p.duration;
  const endWhole = Math.floor(endIdx);
  const endFrac = Math.round((endIdx - endWhole) * 30.44);
  const endExclusive = new Date(2026, 2 + endWhole, 1 + endFrac);
  const end = new Date(endExclusive);
  end.setDate(end.getDate() - 1);
  return { start, end };
}

function rangesOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
  return a.start <= b.end && a.end >= b.start;
}

function prStartOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}
function prEndOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

function prWeeksInMonth(year: number, month: number): { start: Date; end: Date; label: string }[] {
  const weeks: { start: Date; end: Date; label: string }[] = [];
  const firstOfMonth = prStartOfMonth(year, month);
  const lastOfMonth = prEndOfMonth(year, month);
  const cursor = new Date(firstOfMonth);
  const dow = cursor.getDay();
  cursor.setDate(cursor.getDate() + (dow === 0 ? -6 : 1 - dow));
  while (cursor <= lastOfMonth) {
    const sun = new Date(cursor);
    sun.setDate(sun.getDate() + 6);
    const sm = PR_SHORT_MO[cursor.getMonth()];
    const em = PR_SHORT_MO[sun.getMonth()];
    const label = sm === em
      ? `${sm} ${cursor.getDate()}–${sun.getDate()}`
      : `${sm} ${cursor.getDate()} – ${em} ${sun.getDate()}`;
    weeks.push({ start: new Date(cursor), end: sun, label });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

function ghostDimensionsFor(p: { startDate: string | null; targetDate: string | null }): { startMonth: number; duration: number } | null {
  let start: Date | null = p.startDate ? new Date(p.startDate + "T00:00:00") : null;
  let end: Date | null = p.targetDate ? new Date(p.targetDate + "T00:00:00") : null;
  if (!start && !end) {
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(end.getDate() + 28);
  } else if (!start && end) {
    start = new Date(end);
    start.setDate(start.getDate() - 28);
  } else if (start && !end) {
    end = new Date(start);
    end.setDate(end.getDate() + 28);
  }
  const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const startMonth = Math.max(0, dateToMonthIndex(toIso(start!)));
  const endMonth = dateToMonthIndex(toIso(end!));
  return {
    startMonth,
    // Duration from the clamped start, so a pre-timeline startDate doesn't
    // stretch the bar's end date past the project's real target.
    duration: Math.max(0.25, endMonth - startMonth),
  };
}

function prFractionalColPos(date: Date, columns: { start: Date; end: Date }[]): number {
  if (columns.length === 0) return 0;
  if (date < columns[0].start) return 0;
  for (let i = 0; i < columns.length; i++) {
    const colStart = columns[i].start;
    const colEnd = new Date(columns[i].end);
    colEnd.setDate(colEnd.getDate() + 1);
    if (date >= colStart && date < colEnd) {
      const total = colEnd.getTime() - colStart.getTime();
      return i + (total > 0 ? (date.getTime() - colStart.getTime()) / total : 0);
    }
  }
  return columns.length;
}

const prNavBtnStyle: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  fontSize: 13,
  fontWeight: 600,
  width: 28,
  height: 28,
  padding: 0,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  background: "white",
  color: "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

type PRDragState = {
  projectId: string;
  personName: string;
  mode: "move" | "resize";
  startMouseX: number;
  originalStartMonth: number;
  originalDuration: number;
  currentStartMonth: number;
  currentDuration: number;
};

function FilterPopover({
  people,
  teamFilter,
  setTeamFilter,
  selectedPeople,
  setSelectedPeople,
  showDiscovered,
  setShowDiscovered,
  onClose,
  anchorRef,
}: {
  people: Person[];
  teamFilter: PRTeamFilter;
  setTeamFilter: (t: PRTeamFilter) => void;
  selectedPeople: Set<string>;
  setSelectedPeople: (s: Set<string>) => void;
  showDiscovered: boolean;
  setShowDiscovered: (v: boolean) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  // Show only people within the active team filter for the person checklist.
  const peopleForChecklist = useMemo(() => {
    if (teamFilter === "engProd") {
      return people.filter((p) => PR_ENG_PROD_PEOPLE.has(p.name));
    }
    if (teamFilter === "opsGtm") {
      return people.filter((p) => !PR_ENG_PROD_PEOPLE.has(p.name));
    }
    return people;
  }, [people, teamFilter]);

  const togglePerson = (name: string) => {
    const next = new Set(selectedPeople);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedPeople(next);
  };

  const clearAll = () => {
    setTeamFilter("all");
    setSelectedPeople(new Set());
    setShowDiscovered(false);
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: 300,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
        zIndex: 1000,
        padding: 12,
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
        Team
      </div>
      <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 8, padding: 2, marginBottom: 14 }}>
        {([
          ["all", "All"],
          ["engProd", "Eng / Prod"],
          ["opsGtm", "Ops / GTM"],
        ] as const).map(([key, label]) => {
          const active = teamFilter === key;
          return (
            <button
              key={key}
              onClick={() => {
                setTeamFilter(key);
                // Clearing person filter when switching teams keeps the
                // checklist consistent — picks from the previous team would
                // otherwise show as "missing" from the new view.
                setSelectedPeople(new Set());
              }}
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: 600,
                height: 26,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: active ? "white" : "transparent",
                color: active ? "#1e293b" : "#64748b",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          People
        </span>
        {selectedPeople.size > 0 && (
          <button
            onClick={() => setSelectedPeople(new Set())}
            style={{ fontSize: 11, color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Clear
          </button>
        )}
      </div>
      <div style={{ maxHeight: 220, overflow: "auto", marginBottom: 14, border: "1px solid #e2e8f0", borderRadius: 8 }}>
        {peopleForChecklist.length === 0 && (
          <div style={{ padding: 10, fontSize: 12, color: "#94a3b8" }}>No people in this team.</div>
        )}
        {peopleForChecklist.map((p) => {
          const checked = selectedPeople.has(p.name);
          return (
            <label
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: 13,
                color: "#1e293b",
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => togglePerson(p.name)}
                style={{ margin: 0, cursor: "pointer" }}
              />
              <span style={{ width: 8, height: 8, borderRadius: 999, background: p.color }} />
              {p.name}
            </label>
          );
        })}
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 10px",
          cursor: "pointer",
          fontSize: 13,
          color: "#1e293b",
          borderRadius: 8,
          background: showDiscovered ? "#eef2ff" : "transparent",
          border: `1px solid ${showDiscovered ? "#c7d2fe" : "transparent"}`,
        }}
      >
        <input
          type="checkbox"
          checked={showDiscovered}
          onChange={(e) => setShowDiscovered(e.target.checked)}
          style={{ margin: 0, cursor: "pointer" }}
        />
        Show all Linear projects
      </label>

      <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
        <button
          onClick={clearAll}
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            height: 30,
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            background: "white",
            color: "#475569",
            cursor: "pointer",
          }}
        >
          Reset
        </button>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            height: 30,
            border: "none",
            borderRadius: 6,
            background: "#0f172a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function ProductRoadmapView({
  people,
  phases,
  cycles,
  restrictPeople,
  onProjectClick,
  onIssueClick,
  onMoveProject,
}: {
  people: Person[];
  phases?: Phase[];
  cycles?: LinearCycle[];
  restrictPeople?: string[] | null;
  onProjectClick: (project: Project, person: Person) => void;
  onIssueClick: (issueId: string) => void;
  onMoveProject?: (
    personName: string,
    projectId: string,
    newStartMonth: number,
    newDuration: number,
    prevStartMonth: number,
    prevDuration: number,
  ) => void;
}) {
  const today = new Date();
  const [granularity, setGranularity] = useState<PRGranularity>("year");
  // The Year window runs Aug(year)-Jul(year+2), so Jan-Jul dates belong to
  // the window that started the PREVIOUS August.
  const [year, setYear] = useState(today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1);
  const [month, setMonth] = useState(today.getMonth());
  const [weekStartIso, setWeekStartIso] = useState(() => {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const [tickets, setTickets] = useState<StandaloneTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [showSubtestEdits, setShowSubtestEdits] = useState(false);
  const [teamFilter, setTeamFilter] = useState<PRTeamFilter>("all");
  const [selectedPeople, setSelectedPeople] = useState<Set<string>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement | null>(null);

  // Saved per-cell ticket orderings. Key: "weekKey|personName" → ordered IDs.
  const [ticketOrders, setTicketOrders] = useState<Record<string, Record<string, string[]>>>({});
  useEffect(() => {
    let cancelled = false;
    fetchOverrides().then((ov) => {
      if (!cancelled) setTicketOrders(ov.ticketOrders ?? {});
    });
    const onSaved = () => {
      fetchOverrides().then((ov) => {
        if (!cancelled) setTicketOrders(ov.ticketOrders ?? {});
      });
    };
    window.addEventListener("roadmap-saved", onSaved);
    return () => {
      cancelled = true;
      window.removeEventListener("roadmap-saved", onSaved);
    };
  }, []);

  type TicketDragState = {
    weekKey: string;
    personName: string;
    ticketId: string;
    fromIndex: number;
    currentIndex: number;
    items: string[]; // current ordered IDs (for preview)
  };
  const ticketDragRef = useRef<TicketDragState | null>(null);
  const ticketDidDragRef = useRef(false);
  const [, setTicketDragTick] = useState(0);
  const bumpTicketDrag = () => setTicketDragTick((t) => t + 1);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const ds = ticketDragRef.current;
      if (!ds) return;
      ticketDidDragRef.current = true;
      const container = document.querySelector<HTMLElement>(
        `[data-bullets-cell="${CSS.escape(ds.weekKey)}:${CSS.escape(ds.personName)}"]`,
      );
      if (!container) return;
      const bullets = Array.from(
        container.querySelectorAll<HTMLElement>("[data-bullet-row]"),
      );
      if (bullets.length === 0) return;
      let next = bullets.length - 1;
      for (let i = 0; i < bullets.length; i++) {
        const rect = bullets[i].getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
          next = i;
          break;
        }
      }
      if (next !== ds.currentIndex) {
        ds.currentIndex = next;
        bumpTicketDrag();
      }
    };
    const onUp = () => {
      const ds = ticketDragRef.current;
      if (!ds) return;
      const moved = ds.fromIndex !== ds.currentIndex;
      if (moved && ticketDidDragRef.current) {
        const next = [...ds.items];
        const [m] = next.splice(ds.fromIndex, 1);
        next.splice(ds.currentIndex, 0, m);
        // Optimistic local update
        setTicketOrders((prev) => {
          const copy = { ...prev };
          if (!copy[ds.weekKey]) copy[ds.weekKey] = {};
          else copy[ds.weekKey] = { ...copy[ds.weekKey] };
          copy[ds.weekKey][ds.personName] = next;
          return copy;
        });
        saveOverride("saveTicketOrder", {
          weekKey: ds.weekKey,
          personName: ds.personName,
          order: next,
        }).catch(() => {});
      }
      ticketDragRef.current = null;
      // Defer clearing didDrag so the click handler can read it.
      setTimeout(() => { ticketDidDragRef.current = false; }, 0);
      bumpTicketDrag();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startTicketDrag = (
    e: React.MouseEvent,
    weekKey: string,
    personName: string,
    ticketId: string,
    items: string[],
  ) => {
    e.stopPropagation();
    e.preventDefault();
    ticketDidDragRef.current = false;
    const fromIndex = items.indexOf(ticketId);
    if (fromIndex < 0) return;
    ticketDragRef.current = {
      weekKey,
      personName,
      ticketId,
      fromIndex,
      currentIndex: fromIndex,
      items,
    };
    bumpTicketDrag();
  };

  // Auto-discovered Linear projects (not in roadmap-data.ts). One ghost bar
  // per (project, assignee with open work).
  type DiscoveredProject = {
    id: string;
    name: string;
    startDate: string | null;
    targetDate: string | null;
    assigneeNames: Set<string>;
  };
  const [discoveredProjects, setDiscoveredProjects] = useState<DiscoveredProject[]>([]);
  const [showDiscovered, setShowDiscovered] = useState(false);

  // Lazy fetch all Linear projects + open ticket assignees — only when the
  // user toggles "Show all Linear projects" on. Eager-fetching ran into
  // Linear's 10000 complexity limit on first load.
  useEffect(() => {
    if (!showDiscovered) return;
    if (discoveredProjects.length > 0) return; // already fetched once
    let cancelled = false;
    linearQuery<{
      projects: {
        nodes: {
          id: string;
          name: string;
          startDate: string | null;
          targetDate: string | null;
          state: string;
          issues: {
            nodes: {
              state: { type: string };
              assignee: { displayName: string } | null;
            }[];
          };
        }[];
      };
    }>(
      `query AllProjectsAssignees {
        projects(first: 50, includeArchived: true) {
          nodes {
            id name startDate targetDate state
            issues(first: 50, includeArchived: true) {
              nodes {
                state { type }
                assignee { displayName }
              }
            }
          }
        }
      }`,
    )
      .then((data) => {
        if (cancelled) return;
        const out: DiscoveredProject[] = [];
        for (const p of data.projects.nodes) {
          if (p.state === "completed" || p.state === "canceled") continue;
          const assignees = new Set<string>();
          for (const issue of p.issues?.nodes ?? []) {
            if (issue.state.type === "completed" || issue.state.type === "canceled") continue;
            if (!issue.assignee) continue;
            const norm = normalizeAssigneeName(issue.assignee.displayName);
            if (norm) assignees.add(norm);
          }
          if (assignees.size === 0) continue;
          out.push({
            id: p.id,
            name: p.name,
            startDate: p.startDate,
            targetDate: p.targetDate,
            assigneeNames: assignees,
          });
        }
        setDiscoveredProjects(out);
      })
      .catch(() => {
        if (cancelled) return;
        setDiscoveredProjects([]);
      });
    return () => {
      cancelled = true;
    };
  }, [showDiscovered, discoveredProjects.length]);


  const dragRef = useRef<PRDragState | null>(null);
  const didDragRef = useRef(false);
  const [, setDragTick] = useState(0);
  const forceRender = () => setDragTick((t) => t + 1);

  const visiblePeople = useMemo(() => {
    let base: Person[];
    if (restrictPeople && restrictPeople.length > 0) {
      const byName: Record<string, Person> = {};
      for (const p of people) byName[p.name] = p;
      base = restrictPeople
        .map((n) => byName[n])
        .filter((p): p is Person => !!p);
    } else {
      base = people;
    }
    if (teamFilter === "engProd") {
      base = base.filter((p) => PR_ENG_PROD_PEOPLE.has(p.name));
    } else if (teamFilter === "opsGtm") {
      base = base.filter((p) => !PR_ENG_PROD_PEOPLE.has(p.name));
    }
    if (selectedPeople.size > 0) {
      base = base.filter((p) => selectedPeople.has(p.name));
    }
    return base;
  }, [people, restrictPeople, teamFilter, selectedPeople]);

  useEffect(() => {
    let cancelled = false;
    setTicketsLoading(true);
    // Fetch every open issue with an assignee, across all projects, paginating
    // until the workspace's open backlog is fully loaded.
    type IssuesPage = {
      issues: {
        nodes: {
          id: string;
          identifier: string;
          url: string;
          title: string;
          state: { name: string; color: string; type: string };
          assignee: { id: string; displayName: string } | null;
          project: { id: string; name: string } | null;
          cycle: { id: string } | null;
          dueDate: string | null;
          startedAt: string | null;
          createdAt: string;
          priority: number;
        }[];
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    };
    (async () => {
      const collected: StandaloneTicket[] = [];
      let after: string | null = null;
      let pages = 0;
      try {
        while (pages < 8) {
          const data: IssuesPage = await linearQuery<IssuesPage>(
            `query OpenAssignedIssues($after: String) {
              issues(first: 250, after: $after, includeArchived: true) {
                nodes {
                  id identifier url title
                  state { name color type }
                  assignee { id displayName }
                  project { id name }
                  cycle { id }
                  dueDate startedAt createdAt priority
                }
                pageInfo { hasNextPage endCursor }
              }
            }`,
            { after: after as string | null },
          );
          for (const n of data.issues.nodes) {
            if (!n.assignee) continue;
            const personName = normalizeAssigneeName(n.assignee.displayName);
            if (!personName) continue;
            if (n.state.type === "completed" || n.state.type === "canceled") continue;
            const fallbackDate = n.dueDate ?? n.startedAt ?? n.createdAt;
            collected.push({
              id: n.id,
              identifier: n.identifier,
              url: n.url,
              title: n.title,
              state: n.state,
              dueDate: fallbackDate.split("T")[0],
              assigneeName: personName,
              projectId: n.project?.id ?? null,
              projectName: n.project?.name ?? null,
              priority: n.priority,
              cycleId: n.cycle?.id ?? null,
            });
          }
          if (!data.issues.pageInfo.hasNextPage || !data.issues.pageInfo.endCursor) break;
          after = data.issues.pageInfo.endCursor;
          pages += 1;
        }
        if (!cancelled) {
          setTickets(collected);
          setTicketsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setTickets([]);
          setTicketsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns = useMemo<{ start: Date; end: Date; label: string }[]>(() => {
    if (granularity === "year") {
      // Show 24 months starting from August of the selected year, so users
      // can see into the following year(s) without paginating.
      return Array.from({ length: 24 }, (_, i) => {
        const m = (7 + i) % 12;
        const y = year + Math.floor((7 + i) / 12);
        return {
          start: prStartOfMonth(y, m),
          end: prEndOfMonth(y, m),
          label: i === 0 || m === 0 ? `${PR_SHORT_MO[m]} ${y}` : PR_SHORT_MO[m],
        };
      });
    }
    if (granularity === "month") {
      return prWeeksInMonth(year, month);
    }
    const start = new Date(weekStartIso + "T00:00:00");
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const sm = PR_SHORT_MO[start.getMonth()];
    const em = PR_SHORT_MO[end.getMonth()];
    const label = sm === em
      ? `${sm} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`
      : `${sm} ${start.getDate()} – ${em} ${end.getDate()}, ${end.getFullYear()}`;
    return [{ start, end, label }];
  }, [granularity, year, month, weekStartIso]);

  const visibleRange = useMemo(() => {
    if (columns.length === 0) return null;
    return { start: columns[0].start, end: columns[columns.length - 1].end };
  }, [columns]);

  const navigatePrev = () => {
    if (granularity === "year") setYear((y) => y - 1);
    else if (granularity === "month") {
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else setMonth((m) => m - 1);
    } else {
      const d = new Date(weekStartIso + "T00:00:00");
      d.setDate(d.getDate() - 7);
      setWeekStartIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  };
  const navigateNext = () => {
    if (granularity === "year") setYear((y) => y + 1);
    else if (granularity === "month") {
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else setMonth((m) => m + 1);
    } else {
      const d = new Date(weekStartIso + "T00:00:00");
      d.setDate(d.getDate() + 7);
      setWeekStartIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
  };
  const navigateToday = () => {
    const t = new Date();
    // Year view anchors its Aug-start window; Month/Week use the calendar year.
    if (granularity === "year") {
      setYear(t.getMonth() >= 7 ? t.getFullYear() : t.getFullYear() - 1);
    } else {
      setYear(t.getFullYear());
    }
    setMonth(t.getMonth());
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
    setWeekStartIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  };

  const title = useMemo(() => {
    if (granularity === "year") return "";
    if (granularity === "month") return `${PR_FULL_MO[month]} ${year}`;
    return `Week of ${columns[0]?.label ?? ""}`;
  }, [granularity, year, month, columns]);

  const SIDEBAR = 160;
  const MIN_COL_WIDTH = granularity === "week" ? 720 : granularity === "year" ? 100 : 220;
  const ROW_PAD_Y = 12;
  const ROW_BAR_HEIGHT = 30;
  const ROW_BAR_GAP = 6;
  const BULLET_LINE_HEIGHT = 22;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  // Flips true once the roaming dachshund completes its round trip back to
  // Cara, at which point a whole pack of dachshunds pops up across the roadmap.
  const [dogPackVisible, setDogPackVisible] = useState(false);
  const summonDogPack = useCallback(() => setDogPackVisible(true), []);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setContainerWidth(e.contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const colWidth = useMemo(() => {
    if (containerWidth <= 0 || columns.length === 0) return MIN_COL_WIDTH;
    const avail = containerWidth - SIDEBAR;
    return Math.max(MIN_COL_WIDTH, Math.floor(avail / columns.length));
  }, [containerWidth, columns.length, MIN_COL_WIDTH]);

  // Drag listeners. Pixel→fractional-month conversion uses days-per-column
  // based on the active granularity (year=month per col, month/week=week per col).
  useEffect(() => {
    if (!onMoveProject) return;
    const daysPerCol = granularity === "year" ? 30.44 : 7;
    const monthsPerPx = (daysPerCol / colWidth) / 30.44;
    const onMove = (e: MouseEvent) => {
      const ds = dragRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startMouseX;
      if (Math.abs(dx) > 3) didDragRef.current = true;
      const dMonths = dx * monthsPerPx;
      if (ds.mode === "move") {
        ds.currentStartMonth = Math.max(0, ds.originalStartMonth + dMonths);
      } else {
        const minDur = 7 / 30.44;
        ds.currentDuration = Math.max(minDur, ds.originalDuration + dMonths);
      }
      forceRender();
    };
    const onUp = () => {
      const ds = dragRef.current;
      if (!ds) return;
      if (didDragRef.current) {
        // Snap to whole weeks for cleaner placement
        const snap = (m: number) => Math.round((m * 30.44) / 7) * 7 / 30.44;
        const newStart = snap(ds.currentStartMonth);
        const newDuration = Math.max(7 / 30.44, snap(ds.currentDuration));
        if (
          Math.abs(newStart - ds.originalStartMonth) > 0.005 ||
          Math.abs(newDuration - ds.originalDuration) > 0.005
        ) {
          onMoveProject(
            ds.personName,
            ds.projectId,
            newStart,
            newDuration,
            ds.originalStartMonth,
            ds.originalDuration,
          );
        }
      }
      dragRef.current = null;
      // Defer clearing didDrag so the click handler can read it.
      setTimeout(() => { didDragRef.current = false; }, 0);
      forceRender();
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [granularity, colWidth, onMoveProject]);

  const startDrag = (e: React.MouseEvent, project: Project, person: Person, mode: "move" | "resize") => {
    if (!onMoveProject) return;
    e.stopPropagation();
    e.preventDefault();
    didDragRef.current = false;
    dragRef.current = {
      projectId: project.id,
      personName: person.name,
      mode,
      startMouseX: e.clientX,
      originalStartMonth: project.startMonth,
      originalDuration: project.duration,
      currentStartMonth: project.startMonth,
      currentDuration: project.duration,
    };
    forceRender();
  };

  function ticketColumnIndex(dueDate: string): number {
    const d = new Date(dueDate + "T00:00:00");
    for (let i = 0; i < columns.length; i++) {
      const colEnd = new Date(columns[i].end);
      colEnd.setHours(23, 59, 59, 999);
      if (d >= columns[i].start && d <= colEnd) return i;
    }
    return -1;
  }

  // For each visible column, the Linear cycle whose date range overlaps it.
  // null when no cycle covers the column. Cycles are 7-day Mon-Sun windows
  // for the Marker Method team.
  const cycleByColumn = useMemo<(LinearCycle | null)[]>(() => {
    if (!cycles || cycles.length === 0) return columns.map(() => null);
    return columns.map((col) => {
      const colStart = col.start;
      const colEnd = new Date(col.end);
      colEnd.setHours(23, 59, 59, 999);
      // Pick the cycle whose window has the largest overlap with the column.
      let best: LinearCycle | null = null;
      let bestOverlap = 0;
      for (const c of cycles) {
        const cs = new Date(c.startsAt);
        const ce = new Date(c.endsAt);
        const overlapStart = Math.max(cs.getTime(), colStart.getTime());
        const overlapEnd = Math.min(ce.getTime(), colEnd.getTime());
        const overlap = overlapEnd - overlapStart;
        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          best = c;
        }
      }
      return best;
    });
  }, [columns, cycles]);

  // Where to drop expanded-project tickets when their date is missing or out
  // of the visible window — pick the column containing today, else first.
  const anchorColumnIndex = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    for (let i = 0; i < columns.length; i++) {
      const colEnd = new Date(columns[i].end);
      colEnd.setHours(23, 59, 59, 999);
      if (t >= columns[i].start && t <= colEnd) return i;
    }
    return 0;
  }, [columns]);

  const showBullets = granularity !== "year";

  const activeFilterCount =
    (teamFilter !== "all" ? 1 : 0) +
    (selectedPeople.size > 0 ? 1 : 0) +
    (showDiscovered ? 1 : 0);

  const onColumnHeaderClick = (i: number) => {
    if (granularity === "year") {
      // Columns start at August, so index i is not calendar month i.
      setYear(columns[i].start.getFullYear());
      setMonth(columns[i].start.getMonth());
      setGranularity("month");
    } else if (granularity === "month") {
      const w = columns[i];
      setWeekStartIso(`${w.start.getFullYear()}-${String(w.start.getMonth() + 1).padStart(2, "0")}-${String(w.start.getDate()).padStart(2, "0")}`);
      setGranularity("week");
    }
  };

  const renderRow = (person: Person, idx: number) => {
    if (!visibleRange) return null;

    const ds = dragRef.current;
    const effectiveDims = (project: Project) => {
      if (ds && ds.projectId === project.id && ds.personName === person.name) {
        return { startMonth: ds.currentStartMonth, duration: ds.currentDuration };
      }
      return { startMonth: project.startMonth, duration: project.duration };
    };

    // Synthesize ghost projects (auto-discovered Linear projects with open work
    // assigned to this person but not represented in roadmap-data.ts).
    const ghostProjectIds = new Set<string>();
    const ghostProjects: Project[] = [];
    if (showDiscovered) {
      const existingNames = new Set<string>();
      for (const p of person.projects) {
        existingNames.add(p.name);
        if (p.linearProjectName) existingNames.add(p.linearProjectName);
      }
      for (const dp of discoveredProjects) {
        if (!dp.assigneeNames.has(person.name)) continue;
        if (existingNames.has(dp.name)) continue;
        const dims = ghostDimensionsFor(dp);
        if (!dims) continue;
        const id = `disc-${dp.id}`;
        ghostProjectIds.add(id);
        ghostProjects.push({
          id,
          name: dp.name,
          linearProjectName: dp.name,
          startMonth: dims.startMonth,
          duration: dims.duration,
          tasks: [],
        });
      }
    }

    const allProjects: Project[] = [...person.projects, ...ghostProjects];

    const personProjects = allProjects
      .map((p) => ({ project: p, range: projectAbsoluteRange(effectiveDims(p)) }))
      .filter(({ range }) => rangesOverlap(range, visibleRange))
      .sort((a, b) => a.range.start.getTime() - b.range.start.getTime());

    type LanedProj = { project: Project; range: { start: Date; end: Date }; lane: number };
    const laneEnds: number[] = [];
    const laned: LanedProj[] = [];
    for (const { project, range } of personProjects) {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] < range.start.getTime()) {
          laneEnds[i] = range.end.getTime();
          laned.push({ project, range, lane: i });
          placed = true;
          break;
        }
      }
      if (!placed) {
        laneEnds.push(range.end.getTime());
        laned.push({ project, range, lane: laneEnds.length - 1 });
      }
    }
    const laneCount = Math.max(1, laneEnds.length);

    type RowTicket = StandaloneTicket & { columnIndexOverride: number };
    // Tickets only render when their Linear cycle matches a visible column's
    // cycle. A ticket without a cycle is hidden — it isn't planned for any
    // visible week.
    const personTickets: RowTicket[] = [];
    if (showSubtestEdits) {
      const cycleColumnByCycleId = new Map<string, number>();
      cycleByColumn.forEach((cyc, i) => {
        if (cyc) cycleColumnByCycleId.set(cyc.id, i);
      });
      for (const t of tickets) {
        if (t.assigneeName !== person.name) continue;
        if (!t.cycleId) continue;
        const ci = cycleColumnByCycleId.get(t.cycleId);
        if (ci === undefined) continue;
        personTickets.push({ ...t, columnIndexOverride: ci });
      }
    }

    const byColumn: StandaloneTicket[][] = columns.map(() => []);
    for (const t of personTickets) {
      const ci = t.columnIndexOverride;
      if (ci >= 0 && ci < columns.length) byColumn[ci].push(t);
    }

    const maxBulletsInColumn = showBullets ? Math.max(0, ...byColumn.map((b) => b.length)) : 0;
    const barsHeight = laneCount * (ROW_BAR_HEIGHT + ROW_BAR_GAP);
    const bulletsHeight = showBullets
      ? maxBulletsInColumn * BULLET_LINE_HEIGHT + (maxBulletsInColumn > 0 ? 6 : 0)
      : 0;
    const rowHeight = Math.max(
      ROW_PAD_Y * 2 + barsHeight + bulletsHeight,
      person.minRowHeight ?? 0,
    );

    const rowBg = hexToRgba(person.color, idx % 2 === 0 ? 0.10 : 0.16);
    const sidebarBg = (() => {
      const alpha = idx % 2 === 0 ? 0.10 : 0.16;
      const r = parseInt(person.color.slice(1, 3), 16);
      const g = parseInt(person.color.slice(3, 5), 16);
      const b = parseInt(person.color.slice(5, 7), 16);
      const br = Math.round(r * alpha + 240 * (1 - alpha));
      const bg = Math.round(g * alpha + 240 * (1 - alpha));
      const bb = Math.round(b * alpha + 240 * (1 - alpha));
      return `rgb(${br},${bg},${bb})`;
    })();

    return (
      <div
        key={person.name}
        data-person-row={person.name}
        style={{
          display: "flex",
          minHeight: rowHeight,
          background: rowBg,
          borderBottom: "1px solid #e8e8ef",
        }}
      >
        {person.avatar ? (
          <div
            style={{
              width: SIDEBAR,
              flexShrink: 0,
              padding: 0,
              position: "sticky",
              left: 0,
              zIndex: 2,
              borderRight: "1px solid #e8e8ef",
              overflow: "hidden",
            }}
          >
            <img
              src={person.avatar}
              alt={person.name}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 8,
                bottom: 8,
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                border: "1.5px solid #fff",
                borderRadius: 4,
                padding: "2px 8px",
                background: "rgba(0,0,0,0.3)",
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {person.name}
            </span>
          </div>
        ) : (
          <div
            style={{
              width: SIDEBAR,
              flexShrink: 0,
              padding: "10px 12px",
              position: "sticky",
              left: 0,
              zIndex: 2,
              background: sidebarBg,
              borderRight: "1px solid #e8e8ef",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              className={person.sparkle ? "sparkle-swatch" : undefined}
              style={{ width: 4, height: 28, background: person.sparkle ? undefined : person.color, borderRadius: 2 }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{person.name}</span>
          </div>
        )}
        <div style={{ flex: 1, position: "relative", height: rowHeight }}>
          {/* Lucie's row gets a trash can, vomit, and clown bouncing DVD-style. */}
          {person.dvdCart && <DvdCarts emojis={["🗑️", "🤮", "🤡"]} />}
          {columns.map((_, i) => (
            <div
              key={`vline-${i}`}
              style={{
                position: "absolute",
                left: i * colWidth,
                top: 0,
                width: 1,
                height: rowHeight,
                background: "rgba(15,23,42,0.06)",
              }}
            />
          ))}

          {laned.map(({ project, range, lane }) => {
            const drawStart = range.start < visibleRange.start ? visibleRange.start : range.start;
            const drawEndInclusive = range.end > visibleRange.end ? visibleRange.end : range.end;
            const drawEndExclusive = new Date(drawEndInclusive);
            drawEndExclusive.setDate(drawEndExclusive.getDate() + 1);
            const startPos = prFractionalColPos(drawStart, columns);
            const endPos = prFractionalColPos(drawEndExclusive, columns);
            const x = startPos * colWidth + 4;
            const w = Math.max(20, (endPos - startPos) * colWidth - 8);
            const y = ROW_PAD_Y + lane * (ROW_BAR_HEIGHT + ROW_BAR_GAP);
            const isDragging = !!ds && ds.projectId === project.id && ds.personName === person.name;
            const isGhost = ghostProjectIds.has(project.id);
            const sparkle = !!person.sparkle && !isGhost;
            return (
              <div
                key={project.id}
                className={sparkle ? "sparkle-bar" : undefined}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  width: w,
                  height: ROW_BAR_HEIGHT,
                  background: sparkle
                    ? undefined
                    : isGhost
                      ? hexToRgba(person.color, 0.18)
                      : hexToRgba(person.color, isDragging ? 0.95 : 0.85),
                  color: sparkle ? "#7c2d12" : isGhost ? "#1e293b" : barTextColor(person.color, 0.85),
                  border: isGhost ? `1px dashed ${hexToRgba(person.color, 0.7)}` : "none",
                  borderRadius: 6,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  boxShadow: isDragging
                    ? "0 4px 12px rgba(15,23,42,0.18)"
                    : sparkle
                      ? undefined
                      : isGhost
                        ? "none"
                        : "0 1px 2px rgba(15,23,42,0.08)",
                  cursor: isGhost ? "pointer" : onMoveProject ? "grab" : "pointer",
                  userSelect: "none",
                }}
                title={`${project.name}${isGhost ? " (auto-discovered)" : ""}\n${range.start.toLocaleDateString()} – ${range.end.toLocaleDateString()}`}
                onMouseDown={(e) => {
                  if (!isGhost) startDrag(e, project, person, "move");
                }}
                onClick={(e) => {
                  if (didDragRef.current) {
                    e.preventDefault();
                    return;
                  }
                  onProjectClick(project, person);
                }}
              >
                <div
                  style={{
                    height: "100%",
                    padding: "0 10px",
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {project.name}
                </div>
                {onMoveProject && !isGhost && (
                  <div
                    onMouseDown={(e) => startDrag(e, project, person, "resize")}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 0,
                      width: 6,
                      height: "100%",
                      cursor: "ew-resize",
                      background: "rgba(255,255,255,0.0)",
                    }}
                    title="Drag to resize"
                  />
                )}
              </div>
            );
          })}

          {showBullets && byColumn.map((items, i) => (
            <div
              key={`bullets-${i}`}
              style={{
                position: "absolute",
                left: i * colWidth + 8,
                top: ROW_PAD_Y + barsHeight + 4,
                width: colWidth - 12,
                fontSize: 12,
                color: "#1e293b",
                fontFamily: "var(--font-sans)",
              }}
            >
              {items.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    lineHeight: `${BULLET_LINE_HEIGHT}px`,
                  }}
                >
                  <span
                    title={t.state.name}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: t.state.color,
                      border: t.state.type === "unstarted" || t.state.type === "backlog"
                        ? `1.5px solid ${t.state.color}`
                        : "none",
                      backgroundColor: t.state.type === "unstarted" || t.state.type === "backlog"
                        ? "transparent"
                        : t.state.color,
                      flexShrink: 0,
                      cursor: "help",
                    }}
                  />
                  <button
                    onClick={() => onIssueClick(t.id)}
                    title={`${t.identifier} · ${t.state.name} · Due ${formatDate(t.dueDate)}`}
                    style={{
                      flex: 1,
                      textAlign: "left",
                      padding: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#1e293b",
                      fontFamily: "var(--font-sans)",
                      fontSize: 12,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    <span style={{ fontWeight: 700, color: "#6366f1", marginRight: 6 }}>{t.identifier}</span>
                    {t.title}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const breadcrumb = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", background: "#f1f5f9", borderRadius: 8, padding: 2 }}>
        {(["year", "month", "week"] as PRGranularity[]).map((g) => {
          const active = granularity === g;
          return (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 12,
                fontWeight: 600,
                height: 26,
                padding: "0 12px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textTransform: "capitalize",
                background: active ? "white" : "transparent",
                color: active ? "#1e293b" : "#64748b",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
      <button onClick={navigatePrev} style={prNavBtnStyle}>‹</button>
      <button onClick={navigateNext} style={prNavBtnStyle}>›</button>
      <button onClick={navigateToday} style={{ ...prNavBtnStyle, width: "auto", padding: "0 10px" }}>Today</button>
      <h2 style={{ margin: "0 0 0 8px", fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{title}</h2>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginLeft: "auto",
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          background: showSubtestEdits ? "#eef2ff" : "white",
          color: showSubtestEdits ? "#4338ca" : "#475569",
          fontFamily: "var(--font-sans)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        <input
          type="checkbox"
          checked={showSubtestEdits}
          onChange={(e) => setShowSubtestEdits(e.target.checked)}
          style={{ margin: 0, cursor: "pointer" }}
        />
        Show tickets
      </label>
      <div style={{ position: "relative" }}>
        <button
          ref={filterBtnRef}
          onClick={() => setFilterOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: activeFilterCount > 0 ? "#eef2ff" : "white",
            color: activeFilterCount > 0 ? "#4338ca" : "#475569",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Filters
          {activeFilterCount > 0 && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                background: "#4338ca",
                color: "white",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {activeFilterCount}
            </span>
          )}
        </button>
        {filterOpen && (
          <FilterPopover
            people={people}
            teamFilter={teamFilter}
            setTeamFilter={setTeamFilter}
            selectedPeople={selectedPeople}
            setSelectedPeople={setSelectedPeople}
            showDiscovered={showDiscovered}
            setShowDiscovered={setShowDiscovered}
            onClose={() => setFilterOpen(false)}
            anchorRef={filterBtnRef}
          />
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      style={{ height: "calc(100vh - 80px)", overflow: "auto", background: "#fafafa", fontFamily: "var(--font-sans)" }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid #e8e8ef",
          background: "white",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        {breadcrumb}
        <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
          {ticketsLoading
            ? "Loading tickets…"
            : `Showing ${visiblePeople.length} ${visiblePeople.length === 1 ? "person" : "people"}`}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", position: "relative", minWidth: SIDEBAR + columns.length * colWidth }}>
        {phases && phases.length > 0 && visibleRange && (() => {
          const PHASE_HEIGHT_LOCAL = 32;
          const visiblePhases = phases
            .map((ph) => ({ phase: ph, range: projectAbsoluteRange(ph) }))
            .filter(({ range }) => rangesOverlap(range, visibleRange));
          return (
            <div
              style={{
                display: "flex",
                position: "sticky",
                top: 70,
                zIndex: 4,
                background: "white",
                borderBottom: "1px solid #e8e8ef",
              }}
            >
              <div
                style={{
                  width: SIDEBAR,
                  flexShrink: 0,
                  height: PHASE_HEIGHT_LOCAL,
                  borderRight: "1px solid #e8e8ef",
                  background: "white",
                }}
              />
              <div style={{ position: "relative", flex: 1, height: PHASE_HEIGHT_LOCAL }}>
                {visiblePhases.map(({ phase, range }) => {
                  const drawStart = range.start < visibleRange.start ? visibleRange.start : range.start;
                  const drawEndInclusive = range.end > visibleRange.end ? visibleRange.end : range.end;
                  const drawEndExclusive = new Date(drawEndInclusive);
                  drawEndExclusive.setDate(drawEndExclusive.getDate() + 1);
                  const startPos = prFractionalColPos(drawStart, columns);
                  const endPos = prFractionalColPos(drawEndExclusive, columns);
                  const x = startPos * colWidth;
                  const w = Math.max(0, (endPos - startPos) * colWidth);
                  return (
                    <div
                      key={phase.name}
                      title={phase.name}
                      style={{
                        position: "absolute",
                        left: x,
                        top: 0,
                        width: w,
                        height: PHASE_HEIGHT_LOCAL,
                        background: phase.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: "var(--font-sans)",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#1e293b",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        borderRight: "1px solid rgba(15,23,42,0.06)",
                      }}
                    >
                      {phase.name}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        <div
          style={{
            display: "flex",
            position: "sticky",
            top: phases && phases.length > 0 ? 70 + 32 : 70,
            zIndex: 4,
            background: "white",
            borderBottom: "2px solid #e8e8ef",
          }}
        >
          <div
            style={{
              width: SIDEBAR,
              flexShrink: 0,
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              borderRight: "1px solid #e8e8ef",
              background: "white",
            }}
          >
            Person
          </div>
          {columns.map((c, i) => {
            const drillable = granularity !== "week";
            const cyc = cycleByColumn[i];
            return (
              <button
                key={`col-${i}`}
                onClick={() => drillable && onColumnHeaderClick(i)}
                disabled={!drillable}
                style={{
                  width: colWidth,
                  flexShrink: 0,
                  padding: "10px 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#0f172a",
                  background: "white",
                  border: "none",
                  borderLeft: i === 0 ? "none" : "1px solid #e8e8ef",
                  textAlign: "left",
                  cursor: drillable ? "pointer" : "default",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  alignItems: "flex-start",
                }}
                title={drillable ? `Drill into ${c.label}` : undefined}
              >
                <span>{c.label}</span>
                {granularity !== "year" && cyc && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#64748b" }}>
                    Cycle {cyc.number}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {visiblePeople.map((p, i) => renderRow(p, i))}

        {visiblePeople.some((p) => p.name === "Cara") &&
          visiblePeople.some((p) => p.name === "Lucie") && (
            <>
              <RoamingDachshund
                scrollRef={containerRef}
                fromName="Cara"
                toName="Lucie"
                onReturn={summonDogPack}
              />
              {dogPackVisible && (
                <DachshundPack count={5} rowName="Cara" scrollRef={containerRef} />
              )}
            </>
          )}
      </div>
    </div>
  );
}

// ── Norming Countdown View ──────────────────────────────────────────────

type NormingItem = { id: string; text: string; done: boolean };

// The deadline everything counts down to.
const NORMING_TARGET = new Date("2026-09-28T00:00:00");

// Teams shown on the norming checklist (independent of the roadmap's TEAMS).
const NORMING_TEAMS: { name: string; color: string }[] = [
  { name: "Engineering", color: "#2563EB" },
  { name: "Product", color: "#EAB308" },
  { name: "Psychometrics", color: "#D97706" },
  { name: "Operations", color: "#1D4ED8" },
  { name: "Recruiting", color: "#7C3AED" },
];

// One-off pre-norming tasks that don't belong to a team checklist or a
// Linear-tracked section. Lives in the same checklist store.
const MISC_TASKS_TEAM = { name: "Miscellaneous Tasks", color: "#64748b" };

function newNormingItemId(): string {
  return `norm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Pre-norming projects tracked live from Linear: each card lists the
// project's tickets and derives status from ticket state. Names must match
// the Linear project names exactly.
const PRENORM_PROJECTS: { name: string; title?: string; color: string; prenormLabelOnly?: boolean }[] = [
  { name: "Between-Subtest Student Experience", color: "#0EA5E9" },
  { name: "Test Renaming & Task Model", color: "#16A34A" },
  // Only this project's tickets that carry the pre-norming label, not the whole project.
  { name: "Subtest Feedback & Assessment Player Edits", title: "Assessment Player", color: "#9333EA", prenormLabelOnly: true },
];

// The norming (Sep 28) view reuses the same card, filtered by the norming label.
const NORMING_PROJECTS: typeof PRENORM_PROJECTS = [
  { name: "Subtest Feedback & Assessment Player Edits", title: "Assessment Player", color: "#9333EA", prenormLabelOnly: true },
];

// Render a Linear description's markdown links ([text](<url>)) and bare URLs
// as anchors; everything else stays plain text.
function linkifyDescription(text: string): React.ReactNode[] {
  const re = /\[([^\]]+)\]\(<?(https?:\/\/[^)>\s]+)>?\)|(https?:\/\/[^\s)]+)/g;
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const href = m[2] ?? m[3];
    out.push(
      <a key={m.index} href={href} target="_blank" rel="noreferrer" style={{ color: "#2563eb", wordBreak: "break-all" }}>
        {m[1] ?? href}
      </a>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type PrenormLinearProject = {
  name: string;
  description: string | null;
  url: string;
  targetDate: string | null;
  lead: { displayName: string; avatarUrl: string | null } | null;
};

// Slide-over showing a pre-norming project's Linear description and owner.
function PrenormProjectPanel({ name, color, onClose }: { name: string; color: string; onClose: () => void }) {
  // undefined = loading, null = not found / error
  const [project, setProject] = useState<PrenormLinearProject | null | undefined>(undefined);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    linearQuery<{ projects: { nodes: PrenormLinearProject[] } }>(
      `query Project($name: String!) {
        projects(filter: { name: { eq: $name } }, first: 1) {
          nodes { name description url targetDate lead { displayName avatarUrl } }
        }
      }`,
      { name },
    )
      .then((d) => setProject(d.projects.nodes[0] ?? null))
      .catch(() => setProject(null));
  }, [name]);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
        {project === undefined && (
          <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading project from Linear...</div>
        )}
        {project === null && (
          <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>Couldn&apos;t load this project from Linear.</div>
        )}
        {project && (
          <>
            <div className="detail-header" style={{ borderColor: color }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>{project.name}</h2>
              <a href={project.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
                Open in Linear ↗
              </a>
            </div>
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 24, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Owner</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                    {project.lead?.avatarUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={project.lead.avatarUrl} alt="" style={{ width: 22, height: 22, borderRadius: "50%" }} />
                    )}
                    {project.lead?.displayName ?? "Unassigned"}
                  </div>
                </div>
                {project.targetDate && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Due</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                      {parseDateLocal(project.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  </div>
                )}
              </div>
              {project.description && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Description</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {linkifyDescription(project.description)}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type PrenormProjectIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: { name: string; type: string; color: string };
  assignee: { displayName: string } | null;
  project: { name: string } | null;
};

type CountNode = { id: string; state: { type: string }; project: { name: string } | null };

// Auto-tracked project cards: tickets load live from Linear per project.
// `label` scopes the labelOnly cards' tickets (pre-norming by default).
function PrenormProjectsSection({ label = PRENORMING_LABEL, projects = PRENORM_PROJECTS, title = "Projects", description }: { label?: string; projects?: typeof PRENORM_PROJECTS; title?: string; description?: string }) {
  // "Pre-norming (Sep 8)" -> "Pre-norming", for the card's badge text.
  const labelShort = label.replace(/\s*\(.*\)$/, "");
  const [issues, setIssues] = useState<PrenormProjectIssue[] | null>(null);
  // Per-project norming-label and total ticket counts for the label-only cards' hover hint.
  const [labelCounts, setLabelCounts] = useState<Record<string, { norming?: number; total?: number }>>({});
  const [error, setError] = useState(false);
  const [openProject, setOpenProject] = useState<{ name: string; color: string } | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  // Project name whose "?" count hint is hovered.
  const [hoveredHint, setHoveredHint] = useState<string | null>(null);

  const load = useCallback(() => {
    const labeledNames = projects.filter((p) => p.prenormLabelOnly).map((p) => p.name);
    linearQuery<{
      full: { nodes: PrenormProjectIssue[] };
      labeled: { nodes: PrenormProjectIssue[] };
      norming: { nodes: CountNode[] };
    }>(
      `query PrenormProjectIssues($names: [String!], $labeledNames: [String!], $label: String!) {
        full: issues(first: 100, filter: { project: { name: { in: $names } } }) {
          nodes { ...PrenormProjIssue }
        }
        labeled: issues(first: 100, filter: { project: { name: { in: $labeledNames } }, labels: { name: { eq: $label } } }) {
          nodes { ...PrenormProjIssue }
        }
        norming: issues(first: 250, filter: { project: { name: { in: $labeledNames } }, labels: { name: { eq: "Norming (Sep 28)" } } }) {
          nodes { id state { type } project { name } }
        }
      }
      fragment PrenormProjIssue on Issue {
        id identifier title url
        state { name type color }
        assignee { displayName }
        project { name }
      }`,
      {
        names: projects.filter((p) => !p.prenormLabelOnly).map((p) => p.name),
        labeledNames,
        label,
      },
    )
      .then((d) => {
        setIssues([...d.full.nodes, ...d.labeled.nodes]);
        setLabelCounts((prev) => {
          const next = { ...prev };
          for (const name of labeledNames) next[name] = { ...next[name], norming: 0 };
          for (const n of d.norming.nodes) {
            if (n.state.type === "canceled" || n.state.type === "duplicate") continue;
            const c = next[n.project?.name ?? ""];
            if (c) c.norming = (c.norming ?? 0) + 1;
          }
          return next;
        });
      })
      .catch(() => setError(true));

    // Open (not completed/canceled) ticket counts paginate separately: the
    // feedback project has 400+ tickets, past Linear's 250-per-page cap.
    // Failures just leave the hover hint on its loading text.
    (async () => {
      const totals: Record<string, number> = {};
      for (const name of labeledNames) totals[name] = 0;
      let after: string | null = null;
      do {
        const d: { issues: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: CountNode[] } } =
          await linearQuery(
            `query PrenormProjectTotals($names: [String!], $after: String) {
              issues(first: 250, after: $after, filter: { project: { name: { in: $names } } }) {
                pageInfo { hasNextPage endCursor }
                nodes { id state { type } project { name } }
              }
            }`,
            { names: labeledNames, after },
          );
        for (const n of d.issues.nodes) {
          if (n.state.type === "completed" || n.state.type === "canceled" || n.state.type === "duplicate") continue;
          const key = n.project?.name ?? "";
          if (key in totals) totals[key]++;
        }
        after = d.issues.pageInfo.hasNextPage ? d.issues.pageInfo.endCursor : null;
      } while (after);
      setLabelCounts((prev) => {
        const next = { ...prev };
        for (const name of labeledNames) next[name] = { ...next[name], total: totals[name] };
        return next;
      });
    })().catch(() => {});
  }, [label, projects]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Readiness</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{title}</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from Linear · click a project name for details</span>
      </div>

      {description && <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>{description}</div>}

      {error && <div style={{ color: "#dc2626", padding: "20px 0", textAlign: "center" }}>Couldn&apos;t load project tickets from Linear.</div>}
      {!error && !issues && <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Loading tickets from Linear...</div>}

      {issues && projects.map((p) => {
        const projIssues = issues.filter(
          (i) => i.project?.name === p.name && i.state.type !== "canceled" && i.state.type !== "duplicate",
        );
        const done = projIssues.filter((i) => i.state.type === "completed").length;
        const pct = projIssues.length > 0 ? Math.round((done / projIssues.length) * 100) : 0;
        return (
          <section key={p.name} style={{ marginBottom: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
            <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #e2e8f0", borderLeft: `4px solid ${p.color}`, background: "#f8fafc" }}>
              <h3
                onClick={() => setOpenProject(p)}
                title="View project details"
                style={{
                  margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase",
                  letterSpacing: "0.08em", flex: 1, cursor: "pointer",
                  textDecoration: "underline dotted #94a3b8", textUnderlineOffset: 3,
                }}
              >
                {p.title ?? p.name}
              </h3>
              {p.prenormLabelOnly && (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {labelShort} tickets only
                  <span style={{ position: "relative", display: "inline-flex" }}>
                    <span
                      onMouseEnter={() => setHoveredHint(p.name)}
                      onMouseLeave={() => setHoveredHint(null)}
                      style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        width: 14, height: 14, borderRadius: "50%", border: "1px solid #cbd5e1",
                        fontSize: 9, fontWeight: 800, color: "#64748b", cursor: "help",
                      }}
                    >
                      ?
                    </span>
                    {hoveredHint === p.name && (
                      <span
                        style={{
                          // Below the icon: the card clips overflow, so a bubble above would be cut off.
                          position: "absolute", right: -8, top: "calc(100% + 8px)",
                          background: "#1e293b", color: "#fff", fontSize: 12, fontWeight: 600,
                          padding: "5px 9px", borderRadius: 6, whiteSpace: "nowrap", pointerEvents: "none",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)", zIndex: 20,
                        }}
                      >
                        Norming (Sep 28) tickets: {labelCounts[p.name]?.norming ?? "loading..."} · Open tickets: {labelCounts[p.name]?.total ?? "loading..."}
                      </span>
                    )}
                  </span>
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 88, height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: p.color, transition: "width 0.3s ease" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", fontVariantNumeric: "tabular-nums", minWidth: 42, textAlign: "right" }}>
                  {done} / {projIssues.length}
                </span>
              </div>
            </header>
            {projIssues.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "16px 18px" }}>
                {p.prenormLabelOnly ? `No ${labelShort.toLowerCase()} tickets in this project yet.` : "No tickets in this project yet."}
              </div>
            )}
            {projIssues.map((i) => (
              <div
                key={i.id}
                onClick={() => setSelectedIssueId(i.id)}
                title={`${i.identifier} · ${i.state.name} · ${i.assignee?.displayName ?? "Unassigned"}`}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: "center", color: i.state.type === "completed" ? "#16a34a" : i.state.type === "started" ? "#2563eb" : "#cbd5e1" }}>
                  {i.state.type === "completed" ? "✓" : i.state.type === "started" ? "●" : "○"}
                </span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: i.state.type === "completed" ? "#94a3b8" : "#1e293b", textDecoration: i.state.type === "completed" ? "line-through" : "none" }}>
                  {i.title}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {ownerFirstName(i.assignee?.displayName)}
                </span>
                {(() => {
                  const s = cellStatus([i]);
                  return s ? (
                    <span style={{
                      display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: s.color, background: s.bg,
                    }}>
                      {s.label}
                    </span>
                  ) : null;
                })()}
              </div>
            ))}
          </section>
        );
      })}

      {openProject && (
        <PrenormProjectPanel name={openProject.name} color={openProject.color} onClose={() => setOpenProject(null)} />
      )}
      {selectedIssueId && (
        <CycleIssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          cycles={[]}
          onUpdated={() => load()}
        />
      )}
    </div>
  );
}

// ── Norming Phases ──────────────────────────────────────────────────────
// The norming run as a sequence of gates: each phase lists what unlocks it.
// Ticket-backed unblockers derive status live from Linear; the rest are
// manual red/yellow/green chips (click the dot). "Current" is a manual call.
// Each phase is its goal plus date-led key dates ("Sep 28: Launch!") — the
// milestone dates are the deadlines we run on. Line-item tracking lives in
// Linear (the norming label), not here.
type PhaseMilestone = { date: string; title: string };
type NormingPhase = { id: string; code: string; name: string; start: string; end: string; color: string; goal: string; milestones: PhaseMilestone[] };

// Restructured 8/19: Spanish folds into NP1 (turn-on Oct 5 per Eleanor);
// NP2 scales everything at once incl. the Dec 7 Arabic + Mandarin launch with
// a few weeks to prove out those groups; NP3 is the Jan–Mar close out.
const NORMING_PHASES: NormingPhase[] = [
  {
    id: "np1", code: "NP1", name: "Initial Launch", start: "2026-09-28", end: "2026-10-26", color: "#eab308",
    goal: "Open norming to monolingual and high English-exposure multilingual students, prove the machine at volume, and turn Spanish on mid-phase to lay the foundation of our multilingual ops and tech.",
    milestones: [
      { date: "2026-09-28", title: "Launch!" },
      { date: "2026-10-05", title: "Spanish launches" },
      { date: "2026-10-26", title: "NP1 complete" },
    ],
  },
  {
    id: "np2", code: "NP2", name: "Scaling", start: "2026-10-26", end: "2026-12-24", color: "#9333EA",
    goal: "Scale the run to every group: external batteries and rating scales start, scheduling machinery runs at volume, and Arabic + Mandarin launch with a few weeks to prove out recruiting.",
    milestones: [
      { date: "2026-10-26", title: "Correlation studies begin" },
      { date: "2026-10-26", title: "Ops evaluate staffing needs and actuals for scaling recruiting push" },
      { date: "2026-12-07", title: "Arabic + Mandarin launch" },
      { date: "2026-12-24", title: "NP2 complete" },
    ],
  },
  {
    id: "np3", code: "NP3", name: "Final Lap", start: "2027-01-04", end: "2027-04-02", color: "#0EA5E9",
    goal: "Fill the remaining cells, wrap the correlation studies, and land the data for analysis.",
    milestones: [
      { date: "2027-01-04", title: "Final examiner recruiting push based on remaining sessions left in Norming" },
      { date: "2027-01-04", title: "Evaluate participant recruiting needs for remaining demographics needed in Study" },
      { date: "2027-01-15", title: "Initial psychometrics structural analysis" },
      { date: "2027-02-01", title: "Hard-to-reach audit and game plan" },
      { date: "2027-04-02", title: "Done!" },
    ],
  },
];

// Month-scale timeline the phase bars are positioned against.
const NP_RANGE_START = new Date(2026, 8, 1); // Sep 1, 2026
const NP_RANGE_END = new Date(2027, 4, 1); // May 1, 2027
function npPct(d: Date): number {
  const pct = ((d.getTime() - NP_RANGE_START.getTime()) / (NP_RANGE_END.getTime() - NP_RANGE_START.getTime())) * 100;
  return Math.min(100, Math.max(0, pct));
}
const NP_MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"].map((label, i) => ({
  label,
  date: new Date(2026, 8 + i, 1),
}));
function npFmt(dateStr: string): string {
  return parseDateLocal(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function npDays(start: string, end: string): number {
  return Math.round((parseDateLocal(end).getTime() - parseDateLocal(start).getTime()) / (24 * 60 * 60 * 1000));
}

type NormingPhaseId = "np1" | "np2" | "np3";

function NormingPhasesSection({ selected, onSelect }: { selected: NormingPhaseId; onSelect: (p: NormingPhaseId) => void }) {
  // Line-item readiness tracking lives in Linear via the norming label, not
  // on these cards; the red today line marks where we are in the run.
  // Cards (and timeline bars) are the phase selector for the sections below.
  const todayPct = npPct(new Date());

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Roadmap</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Phases</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Sep 28, 2026 → Apr 2, 2027</span>
      </div>

      {/* Month-scale timeline: phase bars sized by duration, targets flagged */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 18px 10px", marginBottom: 16 }}>
        <div style={{ position: "relative", height: 88 }}>
          {NP_MONTHS.map((m) => (
            <div key={m.label} style={{ position: "absolute", left: `${npPct(m.date)}%`, top: 0, bottom: 0 }}>
              <div style={{ position: "absolute", top: 18, bottom: 0, borderLeft: "1px dashed #e2e8f0" }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", paddingLeft: 4 }}>{m.label}</div>
            </div>
          ))}
          {NORMING_PHASES.map((p) => {
            const left = npPct(parseDateLocal(p.start));
            const width = npPct(parseDateLocal(p.end)) - left;
            const isSelected = selected === p.id;
            return (
              <div
                key={p.id}
                onClick={() => onSelect(p.id as NormingPhaseId)}
                title={`${p.code} · ${p.name}: ${npFmt(p.start)} → ${npFmt(p.end)} (${npDays(p.start, p.end)} days)`}
                style={{
                  position: "absolute", left: `${left}%`, width: `${width}%`, top: 28, height: 30,
                  background: p.color, borderRadius: 8, display: "flex", alignItems: "center", paddingLeft: 8,
                  color: "#fff", fontSize: 11, fontWeight: 800, letterSpacing: "0.04em",
                  whiteSpace: "nowrap", overflow: "hidden", cursor: "pointer",
                  opacity: isSelected ? 1 : 0.55,
                  boxShadow: isSelected ? `0 0 0 2px #fff, 0 0 0 4px ${p.color}` : "none",
                }}
              >
                {p.code}
              </div>
            );
          })}
          {/* Target-date callouts under each phase's end */}
          {NORMING_PHASES.map((p) => (
            <div key={`${p.id}-target`} style={{ position: "absolute", left: `${npPct(parseDateLocal(p.end))}%`, top: 58 }}>
              <div style={{ position: "absolute", top: 0, height: 7, borderLeft: `2px solid ${p.color}`, transform: "translateX(-1px)" }} />
              <div style={{ position: "absolute", top: 9, transform: "translateX(-50%)", fontSize: 10, fontWeight: 800, color: p.color, whiteSpace: "nowrap" }}>{npFmt(p.end)}</div>
            </div>
          ))}
          {todayPct > 0 && todayPct < 100 && (
            <div title="Today" style={{ position: "absolute", left: `${todayPct}%`, top: 18, height: 44, borderLeft: "2px solid #ef4444" }} />
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {NORMING_PHASES.map((p) => {
          const isSelected = selected === p.id;
          // Count of sections shown below for this phase: NP1 has Internal App
          // + Assessment Player, the others just Internal App.
          const projectCount = p.id === "np1" ? 2 : 1;
          return (
            <div
              key={p.id}
              onClick={() => onSelect(p.id as NormingPhaseId)}
              style={{
                textAlign: "left", fontFamily: "inherit", cursor: "pointer",
                background: isSelected ? `${p.color}0d` : "#fff", borderRadius: 12, padding: "14px 16px",
                border: isSelected ? `2px solid ${p.color}` : "1px solid #e2e8f0",
                borderTop: `4px solid ${p.color}`,
                boxShadow: isSelected ? `0 2px 10px ${p.color}33` : "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
                <span style={{ color: p.color }}>{p.code}:</span> {p.name}
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{npFmt(p.start)} → {npFmt(p.end)} · {npDays(p.start, p.end)} days</div>
              <div style={{ display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: isSelected ? "#fff" : p.color, background: isSelected ? p.color : `${p.color}1a`, borderRadius: 999, padding: "3px 10px", marginBottom: 10 }}>
                {projectCount} {projectCount === 1 ? "project" : "projects"} {isSelected ? "· shown below" : ""}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, marginBottom: 12 }}>{p.goal}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Key dates</div>
              {p.milestones.map((m) => (
                <div key={`${m.date}-${m.title}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "3px 0", fontSize: 12, lineHeight: 1.45 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0, marginTop: 5 }} />
                  <span style={{ color: "#1e293b" }}>
                    <span style={{ fontWeight: 800, color: p.color }}>{npFmt(m.date)}:</span>{" "}
                    <span style={{ fontWeight: 600 }}>{m.title}</span>
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Norming Internal App (per-phase big chunks) ─────────────────────────
// The big chunks of internal-app work landing before or during each phase.
// Ticket-backed rows derive status live from Linear; note rows are manual
// ops or not-yet-ticketed work. Hacky internal v1 by design (Aug 18 call).
type NormingChunk = { name: string; ids?: string[]; note?: string };

const NORMING_INTERNAL_APP: Record<"np1" | "np2" | "np3", { description: string; chunks: NormingChunk[] }> = {
  np1: {
    description:
      "Unlike the player, the internal app keeps shipping through norming — it's where recruiting, scheduling, and study ops actually run. These are the big chunks landing before or during NP1.",
    chunks: [
      { name: "LEI compute + language calendar surfacing (due Sep 20, before norming intake send)", note: "no ticket yet" },
      { name: "Low-LEI examiner routing", ids: ["MAR2-2095"] },
      { name: "Multilingual definition + waitlist hold", ids: ["MAR2-2037"] },
      { name: "Session packing + predicted minutes", ids: ["MAR2-1918", "MAR2-2121"] },
      { name: "Pre-booked sessions + no-show cascade", ids: ["MAR2-1917"] },
      { name: "Norming consent updates (due Sep 14)", ids: ["MAR2-1512", "MAR2-1513"] },
      { name: "Clinical cell attribution writer", ids: ["MAR2-2066"] },
      { name: "Launch app items (editable fields, note stamps)", ids: ["MAR2-1688", "MAR2-1793"] },
    ],
  },
  np2: {
    description:
      "Correlation-study tooling and scale machinery. Deliberately hacky internal v1: research-only, ~200 kids. Weigh manual effort against building at Eleanor's $40/hour examiner heuristic.",
    chunks: [
      { name: "Multi-battery assignment + booking", ids: ["MAR2-1875"] },
      { name: "External battery completion flow", ids: ["MAR2-1877"] },
      { name: "Examiner companion tool (prescribed order, timers, raw score entry)", note: "no ticket yet" },
      { name: "Rating scales queue + reminders (50 ADHD + 50 autism)", note: "no ticket yet" },
      { name: "Battery close-out under 30 predicted minutes", ids: ["MAR2-1919"] },
      { name: "Q Global score workflow", note: "manual ops · Erin/Lucie" },
      { name: "Arabic + Mandarin calendar routing", note: "config on MAR2-2095's build" },
    ],
  },
  np3: {
    description:
      "Mostly ops and analysis: eng supports data pulls, targeted fixes, and the retention policy. New build only if the hard-to-reach audit demands it.",
    chunks: [
      { name: "Retention & destruction policy live", ids: ["MAR2-2116"] },
      { name: "Data QA + freeze support for psychometrics", note: "scoped with Erica during NP2" },
    ],
  },
};

function NormingInternalAppSection({ phase }: { phase: "np1" | "np2" | "np3" }) {
  // identifier -> live Linear issue, null while loading. Fetched by number
  // across all phases once, so tab switches don't refetch.
  const [tickets, setTickets] = useState<Record<string, PrenormProjectIssue> | null>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  useEffect(() => {
    const ids = Object.values(NORMING_INTERNAL_APP).flatMap((s) => s.chunks.flatMap((c) => c.ids ?? []));
    // Linear filters by issue number, not identifier; the number-in query can
    // return same-numbered issues from other teams, so match identifiers after.
    const nums = [...new Set(ids.map((i) => Number(i.split("-")[1])))];
    linearQuery<{ issues: { nodes: PrenormProjectIssue[] } }>(
      `query NormingChunkTickets($nums: [Float!]) {
        issues(first: 100, filter: { number: { in: $nums } }) {
          nodes { id identifier title url state { name type color } assignee { displayName } project { name } }
        }
      }`,
      { nums },
    )
      .then((d) => {
        const wanted = new Set(ids);
        const map: Record<string, PrenormProjectIssue> = {};
        for (const n of d.issues.nodes) if (wanted.has(n.identifier)) map[n.identifier] = n;
        setTickets(map);
      })
      .catch(() => setTickets({}));
  }, []);

  const section = NORMING_INTERNAL_APP[phase];
  const phaseMeta = NORMING_PHASES.find((p) => p.id === phase);
  const rows = section.chunks.map((c) => {
    const ts = (c.ids ?? []).map((id) => tickets?.[id]).filter((t): t is PrenormProjectIssue => !!t);
    return { ...c, tickets: ts, status: c.ids ? cellStatus(ts) : null };
  });
  const done = rows.filter((r) => r.status?.done).length;
  const tracked = rows.filter((r) => r.ids).length;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{phaseMeta?.code} readiness</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Internal App</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from Linear</span>
      </div>
      <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, marginBottom: 14 }}>{section.description}</div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Big items</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{done} / {tracked} tracked done</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.name}
            onClick={r.tickets.length > 0 ? () => setSelectedIssueId((r.tickets.find((t) => t.state.type !== "completed") ?? r.tickets[0]).id) : undefined}
            title={r.tickets.map((t) => `${t.identifier} · ${t.state.name} · ${t.assignee?.displayName ?? "Unassigned"}`).join("\n") || r.note}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f1f5f9", cursor: r.tickets.length > 0 ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (r.tickets.length > 0) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center", color: r.status?.done ? "#16a34a" : r.status?.label === "In Progress" ? "#2563eb" : "#cbd5e1" }}>
              {r.status?.done ? "✓" : r.status?.label === "In Progress" ? "●" : "○"}
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.status?.done ? "#94a3b8" : "#1e293b", textDecoration: r.status?.done ? "line-through" : "none" }}>
              {r.name}
            </span>
            {r.ids ? (
              tickets === null ? (
                <span style={{ fontSize: 12, color: "#94a3b8" }}>loading…</span>
              ) : r.status ? (
                <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: r.status.color, background: r.status.bg }}>
                  {r.status.label} · {r.tickets.filter((t) => t.state.type === "completed").length}/{r.tickets.length}
                </span>
              ) : (
                <span style={{ fontSize: 12, color: "#dc2626" }}>tickets not found</span>
              )
            ) : r.note === "no ticket yet" ? (
              <span style={{ display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: "#b91c1c", background: "#fee2e2" }}>No ticket yet</span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap" }}>{r.note}</span>
            )}
          </div>
        ))}
      </div>

      {selectedIssueId && (
        <CycleIssueDetailPanel issueId={selectedIssueId} onClose={() => setSelectedIssueId(null)} cycles={[]} onUpdated={() => {}} />
      )}
    </div>
  );
}

// ── Pre-Norming (Sep 8) ─────────────────────────────────────────────────
const PRENORMING_TARGET = new Date("2026-09-08T00:00:00");
// Linear label that marks every ticket that must land before pre-norming.
const PRENORMING_LABEL = "Pre-norming (Sep 8)";

type PrenormIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: { name: string; type: string; color: string };
  assignee: { displayName: string } | null;
  team: { key: string } | null;
  project: { name: string } | null;
  projectMilestone: { name: string } | null;
  // Carries the "Norming visibility" label: shown with an asterisk for
  // awareness, but excluded from readiness and all counters.
  isVisibility?: boolean;
};

const PRENORM_VIS_HINT =
  "Shown for visibility — not a pre-norming dependency. We're confident scoring can be worked out during norming without affecting form design.";

// Labeled tickets plus everything in the Form Updates project, so tests whose
// norming forms already shipped (Done tickets, no label) still show as Done.
const PRENORM_ISSUES_QUERY = `
  query PrenormIssues($label: String!) {
    labeled: issues(first: 100, filter: { labels: { name: { eq: $label } } }) {
      nodes {
        id
        identifier
        title
        url
        state { name type color }
        assignee { displayName }
        team { key }
        project { name }
        projectMilestone { name }
      }
    }
    formUpdates: issues(first: 200, filter: { project: { name: { eq: "Form Updates" } } }) {
      nodes {
        id
        identifier
        title
        url
        state { name type color }
        assignee { displayName }
        team { key }
        project { name }
        projectMilestone { name }
      }
    }
    visibility: issues(first: 50, filter: { labels: { name: { eq: "Norming visibility" } } }) {
      nodes {
        id
        identifier
        title
        url
        state { name type color }
        assignee { displayName }
        team { key }
        project { name }
        projectMilestone { name }
      }
    }
  }
`;

// All 48 tests from the Norming Form Prep sheet (the PA and Math Fluency
// parents are represented by their subtests). Tickets are matched to tests by
// case-insensitive title substring; extra aliases cover old test names still
// used in ticket titles (e.g. "Numeric Capacity Backward" for Numbers
// Backward, "Orthographic Choice" for Spelling Recognition).
// engNone marks tests with no engineering work needed: the Engineering cell
// shows "None" and counts as done in the engineering total. psychNone marks
// tests credited as done for psychometrics without a ticket — we're confident
// the scoring model can be worked out during norming without affecting form
// design.
const PRENORM_TESTS: { name: string; matches: string[]; engNone?: boolean; psychNone?: boolean }[] = [
  { name: "Pictorial Analogies", matches: ["pictorial analogies"] },
  { name: "Verbal Analogies", matches: ["verbal analogies"] },
  { name: "Receptive Vocabulary", matches: ["receptive vocabulary"] },
  { name: "Visual Pattern Reasoning", matches: ["visual pattern reasoning"] },
  { name: "Sequencing and Planning", matches: ["sequencing and planning", "sequencing & planning"] },
  { name: "Numbers Forward", matches: ["numbers forward", "numeric capacity forward"] },
  { name: "Numbers Backward", matches: ["numbers backward", "numeric capacity backward"] },
  { name: "Visual Memory", matches: ["visual memory"] },
  { name: "Shape Rotation", matches: ["shape rotation"] },
  { name: "Symbol-Sound Learning", matches: ["symbsnd1"] },
  { name: "Symbol-Sound Learning–Delayed", matches: ["symbsnd2"] },
  { name: "Semantic Fluency", matches: ["semantic fluency"], engNone: true },
  { name: "Speeded Symbol Matching", matches: ["speeded symbol matching", "spdsymat"] },
  { name: "Figure Copying", matches: ["figure copying"], engNone: true },
  { name: "Figure Tracing", matches: ["figure tracing"], engNone: true },
  { name: "Handwritten Letter Fluency", matches: ["handwritten letter fluency", "handwritten alphabetic fluency"], engNone: true },
  { name: "Handwritten Number Fluency", matches: ["handwritten number fluency", "handwritten numeric fluency"], engNone: true },
  { name: "Keyboarding Fluency", matches: ["keyboarding fluency", "keyboard transcription fluency"], engNone: true },
  { name: "PA: Rhyme Recognition", matches: ["rhyme recognition"] },
  { name: "PA: Rhyme Production", matches: ["rhyme production"] },
  { name: "PA: Syllable Counting", matches: ["syllable counting"] },
  { name: "PA: Blending", matches: ["blending"] },
  { name: "PA: Segmenting", matches: ["segmenting"] },
  { name: "PA: Sound ID", matches: ["sound identification", "sound id"] },
  { name: "PA: Substitution", matches: ["substitution"] },
  { name: "Word Reading", matches: ["letter and word identification"] },
  { name: "Nonsense Word Decoding", matches: ["nonsense word decoding"] },
  { name: "Sentence Comprehension", matches: ["sentence comprehension"] },
  { name: "Passage Comprehension", matches: ["passage comprehension"] },
  { name: "Word Reading Fluency", matches: ["word reading fluency"] },
  { name: "Oral Reading Fluency", matches: ["oral reading fluency"] },
  { name: "Math Computation", matches: ["math computation", "mthcmput"] },
  { name: "Math Fluency: Addition", matches: ["math fluency: addition"] },
  { name: "Math Fluency: Subtraction", matches: ["math fluency: subtraction"] },
  { name: "Math Fluency: Multiplication", matches: ["math fluency: multiplication"] },
  { name: "Math Fluency: Division", matches: ["math fluency: division"] },
  { name: "Math Applications", matches: ["math concepts and applications", "math applications"] },
  { name: "Math Concepts", matches: ["applied math vocabulary", "mthcncep"] },
  { name: "Value Estimation", matches: ["value estimation"] },
  { name: "Spelling Production", matches: ["spelling production", "spelling: norming"] },
  { name: "Spelling Recognition", matches: ["spelling recognition", "orthographic choice"] },
  { name: "Dictation", matches: ["dictation"] },
  { name: "Written Expression Fluency", matches: ["written expression fluency", "sentence composition fluency"], engNone: true },
  { name: "Handwritten Essay Writing", matches: ["handwritten essay", "essay scoring"], engNone: true, psychNone: true },
  { name: "Typed Essay Writing", matches: ["typed essay", "essay scoring"], engNone: true, psychNone: true },
  { name: "Letter and Number Formation", matches: ["letter and number formation"], engNone: true, psychNone: true },
  { name: "Listening Comprehension", matches: ["listening comprehension"] },
  { name: "Oral Expression Fluency", matches: ["oral expression fluency"], engNone: true },
];

// Which column a labeled ticket belongs to. Tickets outside the Form Updates
// scope (e.g. Internal App work) return null and stay out of this table.
function prenormBucket(i: PrenormIssue): "psych" | "eng" | "other" | null {
  if (i.team?.key === "PSY") return "psych";
  if (/booklet/i.test(i.title)) return "other";
  if (i.project?.name === "Form Updates") return "eng";
  return null;
}

// Collapse a cell's tickets into one status. No tickets = nothing needed.
function cellStatus(tickets: { state: { type: string } }[]): { label: string; color: string; bg: string; done: boolean } | null {
  if (tickets.length === 0) return null;
  if (tickets.every((t) => t.state.type === "completed")) return { label: "Done", color: "#15803d", bg: "#dcfce7", done: true };
  if (tickets.some((t) => t.state.type === "started")) return { label: "In Progress", color: "#1d4ed8", bg: "#dbeafe", done: false };
  return { label: "Todo", color: "#b45309", bg: "#fef3c7", done: false };
}

// "oleksii.zhaboiedov" / "erica.laforte" / "Cara Eagan" -> "Oleksii" / "Erica" / "Cara"
function ownerFirstName(displayName: string | undefined): string {
  if (!displayName) return "Unassigned";
  const first = displayName.split(/[.\s_]/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function PrenormStatusCell({ tickets, onOpen, none, derivedDone, onOpenNone, visibility }: {
  tickets: PrenormIssue[];
  onOpen: (id: string) => void;
  none?: boolean;
  derivedDone?: boolean;
  onOpenNone?: () => void;
  visibility?: PrenormIssue[];
}) {
  const status = cellStatus(tickets);
  const visStatus = visibility && visibility.length > 0 ? cellStatus(visibility) : null;
  const visPill = visStatus ? (
    <div>
      <button
        onClick={() => onOpen(visibility![0].id)}
        title={`${PRENORM_VIS_HINT}\n${visibility!.map((t) => `${t.identifier} · ${t.assignee?.displayName ?? "Unassigned"}`).join("\n")}`}
        style={{
          display: "inline-block", border: "1px dashed #cbd5e1", cursor: "pointer", fontFamily: "inherit",
          fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "2px 9px", borderRadius: 999, whiteSpace: "nowrap", color: "#64748b", background: "#f8fafc",
        }}
      >
        {visStatus.label} *
      </button>
      <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap" }}>
        {[...new Set(visibility!.filter((t) => t.state.type !== "completed").map((t) => ownerFirstName(t.assignee?.displayName)))].join(", ")}
      </div>
    </div>
  ) : null;
  if (!status && derivedDone) {
    return (
      <td style={{ padding: "10px 14px", textAlign: "center" }}>
        <button
          onClick={onOpenNone}
          title="No separate psychometrics ticket — the design shipped with the engineering ticket, or scoring is deferred to norming (see the row note)"
          style={{
            display: "inline-block", border: "none", cursor: "pointer", fontFamily: "inherit",
            fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
            padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: "#15803d", background: "#dcfce7",
          }}
        >
          Done
        </button>
      </td>
    );
  }
  if (!status && none) {
    return (
      <td style={{ padding: "10px 14px", textAlign: "center" }}>
        <span style={{
          display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: "#64748b", background: "#f1f5f9",
        }}>
          None
        </span>
      </td>
    );
  }
  if (!status) {
    return (
      <td style={{ padding: "10px 14px", textAlign: "center", color: "#cbd5e1" }}>
        {visPill ?? "–"}
      </td>
    );
  }
  const owners = [...new Set(
    tickets.filter((t) => t.state.type !== "completed").map((t) => ownerFirstName(t.assignee?.displayName)),
  )];
  return (
    <td style={{ padding: "10px 14px", textAlign: "center" }}>
      <button
        onClick={() => onOpen(tickets[0].id)}
        title={tickets.map((t) => `${t.identifier} · ${t.assignee?.displayName ?? "Unassigned"}`).join("\n")}
        style={{
          display: "inline-block", border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
          padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
          color: status.color, background: status.bg,
        }}
      >
        {status.label}
      </button>
      {owners.length > 0 && (
        <div style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 3, whiteSpace: "nowrap" }}>
          {owners.join(", ")}
        </div>
      )}
      {visPill && <div style={{ marginTop: 6 }}>{visPill}</div>}
    </td>
  );
}

function PrenormStat({ label, done, total, color, hint }: { label: string; done: number; total: number; color: string; hint?: string }) {
  const [showHint, setShowHint] = useState(false);
  return (
    <div
      onMouseEnter={() => setShowHint(true)}
      onMouseLeave={() => setShowHint(false)}
      style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 150, cursor: hint ? "help" : "default", position: "relative" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {hint && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", border: "1px solid #cbd5e1", borderRadius: "50%", width: 14, height: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>?</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>{done}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>/ {total}</span>
      </div>
      {hint && showHint && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, width: 240,
          background: "#1e293b", color: "#f1f5f9", fontSize: 12, lineHeight: 1.5, fontWeight: 500,
          padding: "10px 12px", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          {hint}
        </div>
      )}
    </div>
  );
}

// Form Updates readiness math, shared by the pre-norming table and the
// Metrics tab so the two never drift.
function computePrenormReadiness(issues: PrenormIssue[], qa: Record<string, boolean>) {
  // Only norming-related tickets belong in the table; the title guard keeps
  // unrelated Form Updates work (e.g. "Dictation Routing") out of test rows.
  const active = issues.filter(
    (i) => i.state.type !== "canceled" && i.state.type !== "duplicate" && (/norming|booklet/i.test(i.title) || i.isVisibility),
  );
  const rows = PRENORM_TESTS.map((test) => {
    const matched = active.filter((i) => test.matches.some((m) => i.title.toLowerCase().includes(m)));
    const vis = matched.filter((i) => i.isVisibility);
    const real = matched.filter((i) => !i.isVisibility);
    const psych = real.filter((i) => prenormBucket(i) === "psych");
    const eng = real.filter((i) => prenormBucket(i) === "eng");
    const other = real.filter((i) => prenormBucket(i) === "other");
    const tracked = [...psych, ...eng, ...other];
    // Ready = every tracked ticket for this test is complete. Tests need at
    // least one ticket to count (so unticketed tests don't read as ready by
    // accident), unless engineering is explicitly marked None.
    const ready = (tracked.length > 0 || !!test.engNone) && tracked.every((i) => i.state.type === "completed");
    // Psych cell shows a derived Done when there's no psych ticket but the
    // form design already shipped with the engineering ticket (completed, or
    // spec'd in the Norming Forms milestone).
    const psychDerivedDone = psych.length === 0 && (
      !!test.psychNone ||
      eng.some((i) => i.state.type === "completed" || i.projectMilestone?.name === "Norming Forms")
    );
    return { test, psych, eng, other, vis, ready, psychDerivedDone, qaDone: !!qa[test.name] };
  });

  // The engineering metric only counts tests that need engineering work;
  // tests marked None are excluded from numerator and denominator alike.
  const withEng = rows.filter((r) => r.eng.length > 0);
  const engNoneCount = rows.filter((r) => r.test.engNone && r.eng.length === 0).length;
  const engDone = withEng.filter((r) => r.eng.every((i) => i.state.type === "completed")).length;
  // Psychometrics is measured against all 48 tests. A test counts as done
  // when its PSY tickets are all complete, or when its form design was
  // already delivered to engineering: the eng ticket is completed or carries
  // the "Norming Forms" milestone (a full design spec). Bare engineering
  // placeholders don't count — the design work is still ahead of psych.
  const psychDone = rows.filter((r) => {
    if (r.psych.some((i) => i.state.type !== "completed")) return false;
    if (r.psych.length > 0) return true;
    if (r.test.psychNone) return true;
    return r.eng.some((i) => i.state.type === "completed" || i.projectMilestone?.name === "Norming Forms");
  }).length;
  const readyCount = rows.filter((r) => r.ready).length;
  const qaCount = rows.filter((r) => r.qaDone).length;

  return { rows, withEng, engNoneCount, engDone, psychDone, readyCount, qaCount };
}

function PrenormingSection() {
  const [issues, setIssues] = useState<PrenormIssue[] | null>(null);
  const [error, setError] = useState(false);
  const [qa, setQa] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [showNoTicket, setShowNoTicket] = useState(false);

  const loadIssues = useCallback(() => {
    fetch("/api/linear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: PRENORM_ISSUES_QUERY, variables: { label: PRENORMING_LABEL } }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        const labeled: PrenormIssue[] = j.data?.labeled?.nodes ?? [];
        const formUpdates: PrenormIssue[] = j.data?.formUpdates?.nodes ?? [];
        const visibility: PrenormIssue[] = j.data?.visibility?.nodes ?? [];
        const byId = new Map<string, PrenormIssue>();
        for (const i of [...labeled, ...formUpdates]) byId.set(i.id, i);
        for (const i of visibility) byId.set(i.id, { ...i, isVisibility: true });
        setIssues([...byId.values()]);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    loadIssues();
    fetchOverrides().then((ov) => {
      setQa(ov.prenormQa ?? {});
      setNotes(ov.prenormNotes ?? {});
    });
  }, [loadIssues]);

  const saveNote = (test: string, note: string) => {
    saveOverride("setPrenormNote", { test, note }).catch(() => {});
  };

  const toggleQa = (test: string) => {
    const done = !qa[test];
    setQa((prev) => ({ ...prev, [test]: done }));
    saveOverride("setPrenormQa", { test, done }).catch(() => {
      setQa((prev) => ({ ...prev, [test]: !done }));
    });
  };

  if (error) {
    return <div style={{ color: "#dc2626", padding: "40px 0", textAlign: "center" }}>Couldn&apos;t load tickets from Linear.</div>;
  }
  if (!issues) {
    return <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading tickets from Linear...</div>;
  }

  const { rows, withEng, engNoneCount, engDone, psychDone, readyCount, qaCount } = computePrenormReadiness(issues, qa);

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center",
    borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Readiness</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Form Updates</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from Linear · label &ldquo;{PRENORMING_LABEL}&rdquo;</span>
      </div>

      {/* Counters */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <PrenormStat
          label="Tests ready"
          done={readyCount}
          total={rows.length}
          color="#16a34a"
          hint={`Counts all ${rows.length} tests. A test is ready when every tracked psychometrics, engineering, and booklet ticket is complete. Tests that need no engineering (e.g. essays) can be ready with no tickets, so this can run ahead of the Engineering count.`}
        />
        <PrenormStat
          label="Psychometrics"
          done={psychDone}
          total={rows.length}
          color="#D97706"
          hint={`Psychometrics owns all ${rows.length} tests. A test counts as done when its PSY tickets are complete, its form design was already delivered to engineering, or scoring is deferred to norming (essays, Letter and Number Formation). ${rows.length - psychDone} left.`}
        />
        <PrenormStat
          label="Engineering"
          done={engDone}
          total={withEng.length}
          color="#2563EB"
          hint={`Counts only the ${withEng.length} tests with engineering work. ${engNoneCount} tests are marked None (no engineering needed) and are excluded.`}
        />
        <PrenormStat
          label="Full QA"
          done={qaCount}
          total={rows.length}
          color="#7C3AED"
          hint="Cara working on defining QA process, update coming soon"
        />
      </div>

      {/* Readiness table */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto", boxShadow: "0 1px 2px rgba(0,0,0,0.04)", marginBottom: 36 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ ...thStyle, textAlign: "left" }}>Test</th>
              <th style={thStyle}>Psychometrics</th>
              <th style={thStyle}>Engineering</th>
              <th style={thStyle}>Other</th>
              <th style={thStyle}>Ready</th>
              <th style={thStyle}>Full QA</th>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 200 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.test.name} style={{ borderBottom: "1px solid #f1f5f9", background: r.ready && r.qaDone ? "#fafdfb" : "#fff" }}>
                <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{r.test.name}</td>
                <PrenormStatusCell tickets={r.psych} onOpen={setSelectedIssueId} derivedDone={r.psychDerivedDone} onOpenNone={() => setShowNoTicket(true)} />
                <PrenormStatusCell tickets={r.eng} onOpen={setSelectedIssueId} none={r.test.engNone} />
                <PrenormStatusCell tickets={r.other} onOpen={setSelectedIssueId} visibility={r.vis} />
                <td style={{ padding: "10px 14px", textAlign: "center", fontSize: 16 }}>
                  {r.ready ? <span style={{ color: "#16a34a" }}>✓</span> : <span style={{ color: "#cbd5e1" }}>–</span>}
                </td>
                <td style={{ padding: "10px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={r.qaDone}
                    onChange={() => toggleQa(r.test.name)}
                    style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#7C3AED" }}
                  />
                </td>
                <td style={{ padding: "4px 8px" }}>
                  <input
                    type="text"
                    value={notes[r.test.name] ?? ""}
                    placeholder="Add note..."
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r.test.name]: e.target.value }))}
                    onBlur={(e) => saveNote(r.test.name, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    style={{
                      width: "100%", border: "1px solid transparent", borderRadius: 6, padding: "5px 8px",
                      fontSize: 13, fontFamily: "inherit", color: "#334155", background: "transparent", outline: "none",
                    }}
                    onFocus={(e) => { e.target.style.border = "1px solid #cbd5e1"; e.target.style.background = "#fff"; }}
                    onBlurCapture={(e) => { e.target.style.border = "1px solid transparent"; e.target.style.background = "transparent"; }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIssueId && (
        <CycleIssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          cycles={[]}
          onUpdated={() => loadIssues()}
        />
      )}

      {showNoTicket && (
        <div className="detail-overlay" onClick={() => setShowNoTicket(false)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "48px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginBottom: 8 }}>No linked ticket</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                There&apos;s no separate psychometrics ticket for this test. Either the norming form design was delivered directly in the engineering ticket (click the Engineering pill to see it), or the scoring model is deliberately deferred to norming — see the row&apos;s note.
              </div>
              <button
                onClick={() => setShowNoTicket(false)}
                style={{ marginTop: 20, border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, padding: "7px 16px", fontSize: 13, fontWeight: 600, color: "#334155", cursor: "pointer", fontFamily: "inherit" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Internal App section ──────────────────────────────────────────────────

// Linear label marking tickets that must land before norming (Sep 28).
const NORMING_LABEL = "Norming (Sep 28)";

// Big chunks of Internal App work, each mapped to the Linear tickets that
// prove it done. Status derives from ticket state — no hand-ticking.
const INTERNAL_APP_ROCKS: { name: string; ids: string[] }[] = [
  { name: "Intake survey redesign", ids: ["MAR2-1897", "MAR2-2057", "MAR2-2067"] },
  { name: "Repeat-participant (PP3) identity linking", ids: ["MAR2-1921", "MAR2-1978"] },
  { name: "Multi-battery / concurrent validity", ids: ["MAR2-1875", "MAR2-1877"] },
  { name: "Monthly targets & availability forecasting", ids: ["MAR2-2053"] },
  { name: "Norming scheduling & session packing", ids: ["MAR2-1917", "MAR2-1918", "MAR2-1919", "MAR2-2068"] },
  { name: "Clinical cell attribution writer", ids: ["MAR2-2066"] },
  { name: "Shipstation integration", ids: ["MAR2-2052"] },
  { name: "Consent form language updates", ids: ["MAR2-1512", "MAR2-1513"] },
];

type InternalAppIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: { name: string; type: string; color: string };
  assignee: { displayName: string } | null;
  labels: { nodes: { name: string }[] };
};

// ponytail: fetches the whole project (191 issues today); paginate past 250 if it ever grows there.
const INTERNAL_APP_QUERY = `
  query InternalAppIssues {
    issues(first: 250, filter: { project: { name: { eq: "Internal App" } } }) {
      nodes {
        id
        identifier
        title
        url
        state { name type color }
        assignee { displayName }
        labels { nodes { name } }
      }
    }
  }
`;

function InternalAppSection({ label, accent }: { label: string; accent: string }) {
  const [issues, setIssues] = useState<InternalAppIssue[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  const loadIssues = useCallback(() => {
    fetch("/api/linear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: INTERNAL_APP_QUERY }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setIssues(j.data?.issues?.nodes ?? []);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const header = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Readiness</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Internal App</h2>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from Linear · label &ldquo;{label}&rdquo;</span>
    </div>
  );

  if (error) {
    return (
      <div style={{ marginBottom: 36 }}>
        {header}
        <div style={{ color: "#dc2626", padding: "20px 0", textAlign: "center" }}>Couldn&apos;t load Internal App tickets from Linear.</div>
      </div>
    );
  }
  if (!issues) {
    return (
      <div style={{ marginBottom: 36 }}>
        {header}
        <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Loading tickets from Linear...</div>
      </div>
    );
  }

  const active = issues.filter((i) => i.state.type !== "canceled" && i.state.type !== "duplicate");
  const labeled = active.filter((i) => i.labels.nodes.some((l) => l.name === label));
  const labeledDone = labeled.filter((i) => i.state.type === "completed").length;
  const pct = labeled.length > 0 ? Math.round((labeledDone / labeled.length) * 100) : 0;

  const byIdent = new Map(active.map((i) => [i.identifier, i]));
  const rocks = INTERNAL_APP_ROCKS.map((r) => {
    const tickets = r.ids.map((id) => byIdent.get(id)).filter((i): i is InternalAppIssue => !!i);
    return { name: r.name, tickets, status: cellStatus(tickets) };
  });
  const rocksDone = rocks.filter((r) => r.status?.done).length;

  return (
    <div style={{ marginBottom: 36 }}>
      {header}

      {/* Labeled-ticket progress */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", marginBottom: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            {labeledDone} / {labeled.length} labeled tickets done
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{pct}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: accent, borderRadius: 999, transition: "width 0.4s ease" }} />
        </div>
      </div>

      {/* Big rocks */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Big items</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{rocksDone} / {rocks.length} done</span>
        </div>
        {rocks.map((r) => (
          <div
            key={r.name}
            onClick={r.status ? () => setSelectedIssueId((r.tickets.find((t) => t.state.type !== "completed") ?? r.tickets[0]).id) : undefined}
            title={r.tickets.map((t) => `${t.identifier} · ${t.state.name} · ${t.assignee?.displayName ?? "Unassigned"}`).join("\n")}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid #f1f5f9", cursor: r.status ? "pointer" : "default" }}
            onMouseEnter={(e) => { if (r.status) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: "center", color: r.status?.done ? "#16a34a" : r.status?.label === "In Progress" ? "#2563eb" : "#cbd5e1" }}>
              {r.status?.done ? "✓" : r.status?.label === "In Progress" ? "●" : "○"}
            </span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.status?.done ? "#94a3b8" : "#1e293b", textDecoration: r.status?.done ? "line-through" : "none" }}>
              {r.name}
            </span>
            {r.status ? (
              <span style={{
                display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
                color: r.status.color, background: r.status.bg,
              }}>
                {r.status.label} · {r.tickets.filter((t) => t.state.type === "completed").length}/{r.tickets.length}
              </span>
            ) : (
              <span style={{ fontSize: 12, color: "#cbd5e1" }}>no tickets</span>
            )}
          </div>
        ))}
      </div>

      {selectedIssueId && (
        <CycleIssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          cycles={[]}
          onUpdated={() => loadIssues()}
        />
      )}
    </div>
  );
}

// ── Instructions & Corrective Feedback section ────────────────────────────
// Shipped-content state read from the marker-method prod read replica.

type CfRow = { code: string; total: number; complete: number };
type AiRow = { code: string; displayName: string; isActive: boolean; version: number; scenes: number; scenesWithAudio: number };

// The 18 subtests that get corrective feedback animations, per the content
// team's tracker sheet. Everything else with practice items is "UI example
// only" and needs no feedback media.
const CF_NEEDED = new Set([
  "verbalAnalogies",
  "appliedMathVocabulary",
  "oralExpressionFluency",
  "sentenceCompositionFluency",
  "shapeRotation",
  "pictorialAnalogies",
  "numericCapacityForward",
  "numericCapacityBackward",
  "semanticFluency",
  "sequencingAndPlanning",
  "valueEstimation",
  "phonologicalAwarenessRhymeRecognition",
  "phonologicalAwarenessRhymeProduction",
  "phonologicalAwarenessSyllabication",
  "phonologicalAwarenessBlending",
  "phonologicalAwarenessSegmenting",
  "phonologicalAwarenessSoundId",
  "phonologicalAwarenessSubstitution",
]);

function ReadinessPill({ complete, total }: { complete: number; total: number }) {
  const done = total > 0 && complete === total;
  const some = complete > 0;
  const c = done
    ? { color: "#15803d", bg: "#dcfce7" }
    : some
      ? { color: "#1d4ed8", bg: "#dbeafe" }
      : { color: "#b45309", bg: "#fef3c7" };
  return (
    <span style={{
      display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
      padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: c.color, background: c.bg,
      fontVariantNumeric: "tabular-nums",
    }}>
      {complete}/{total}
    </span>
  );
}

const NONE_BADGE = (
  <span style={{
    display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
    padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: "#64748b", background: "#f1f5f9",
  }}>
    None
  </span>
);

function ContentReadinessSection() {
  const [data, setData] = useState<{ instructions: AiRow[]; cfBuilt: CfRow[]; cfReleased: CfRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/content-readiness")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "failed"));
  }, []);

  const thStyle: React.CSSProperties = {
    padding: "10px 14px", fontSize: 11, fontWeight: 800, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center",
    borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = { padding: "8px 14px", textAlign: "center" };

  let body: React.ReactNode;
  if (error) {
    body = <div style={{ color: "#dc2626", padding: "20px 0", textAlign: "center", fontSize: 13 }}>Couldn&apos;t load content readiness: {error}</div>;
  } else if (!data) {
    body = <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center", fontSize: 13 }}>Loading from prod replica...</div>;
  } else {
    const cfBuiltByCode = new Map(data.cfBuilt.map((r) => [r.code, r]));
    const cfReleasedByCode = new Map(data.cfReleased.map((r) => [r.code, r]));
    // CF-needed subtests first (that's where the work is), then the rest.
    const rows = [...data.instructions].sort((a, b) => {
      const an = CF_NEEDED.has(a.code) ? 0 : 1;
      const bn = CF_NEEDED.has(b.code) ? 0 : 1;
      return an - bn || a.displayName.localeCompare(b.displayName);
    });

    const instrBuilt = rows.filter((r) => r.scenes > 0 && r.scenesWithAudio === r.scenes).length;
    const instrReleased = rows.filter((r) => r.isActive).length;
    const cfNeededRows = rows.filter((r) => CF_NEEDED.has(r.code));
    const cfBuiltDone = cfNeededRows.filter((r) => {
      const b = cfBuiltByCode.get(r.code);
      return b && b.total > 0 && b.complete === b.total;
    }).length;
    const cfReleasedDone = cfNeededRows.filter((r) => {
      const b = cfReleasedByCode.get(r.code);
      return b && b.total > 0 && b.complete === b.total;
    }).length;

    body = (
      <>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <PrenormStat label="EN instructions built" done={instrBuilt} total={rows.length} color="#2563EB" />
          <PrenormStat label="Instructions released" done={instrReleased} total={rows.length} color="#16a34a" />
          <PrenormStat label="EN feedback built" done={cfBuiltDone} total={cfNeededRows.length} color="#D97706" />
          <PrenormStat label="Feedback released" done={cfReleasedDone} total={cfNeededRows.length} color="#7C3AED" />
        </div>

        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ ...thStyle, textAlign: "left" }}>Subtest</th>
                <th style={thStyle}>
                  <span className="hover-tip" data-tip="Counts instruction scenes: how many of the subtest's scenes have their audio file, out of the total scenes">EN Instructions Built</span>
                </th>
                <th style={thStyle}>Instructions released</th>
                <th style={thStyle}>
                  <span className="hover-tip" data-tip="No tooling in CMS for corrective feedback yet. Counts are based on # of practice items">EN Feedback Built</span>
                </th>
                <th style={thStyle}>Feedback released</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const needsCf = CF_NEEDED.has(r.code);
                const built = cfBuiltByCode.get(r.code);
                const released = cfReleasedByCode.get(r.code);
                return (
                  <tr key={r.code} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "8px 14px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{r.displayName}</td>
                    <td style={tdStyle} title={`${r.scenesWithAudio} of ${r.scenes} scenes have audio (v${r.version})`}>
                      {r.scenes > 0 ? <ReadinessPill complete={r.scenesWithAudio} total={r.scenes} /> : <span style={{ color: "#cbd5e1" }}>–</span>}
                    </td>
                    <td style={tdStyle}>
                      {r.isActive
                        ? <span style={{ color: "#16a34a", fontSize: 16 }}>✓</span>
                        : <span style={{ color: "#cbd5e1" }}>–</span>}
                    </td>
                    <td style={tdStyle} title={needsCf && built ? `${built.complete} of ${built.total} practice items have all four feedback files` : undefined}>
                      {!needsCf ? NONE_BADGE : built ? <ReadinessPill complete={built.complete} total={built.total} /> : <ReadinessPill complete={0} total={0} />}
                    </td>
                    <td style={tdStyle}>
                      {!needsCf
                        ? <span style={{ color: "#cbd5e1" }}>–</span>
                        : released && released.total > 0 && released.complete === released.total
                          ? <span style={{ color: "#16a34a", fontSize: 16 }}>✓</span>
                          : released ? <ReadinessPill complete={released.complete} total={released.total} /> : <span style={{ color: "#cbd5e1" }}>–</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "8px 2px", fontSize: 11, color: "#94a3b8" }}>
          Built = latest CMS version (instruction scenes with audio; practice items with all four feedback files).
          Released = live in the player (active instruction; active question release). &ldquo;None&rdquo; = no feedback planned per the content tracker.
        </div>
      </>
    );
  }

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Readiness</div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Instructions &amp; Corrective Feedback</h2>
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from marker-method prod (read-only)</span>
      </div>
      {body}
    </div>
  );
}

// ── Audio Content Updates ──────────────────────────────────────────────────
// Pipeline statuses read live from the "Audio content audit" Google sheet via
// /api/audio-audit (read-only service account). The one manual, app-side bit
// is the Live checkbox — audio actually replaced in the product — stored in
// the shared overrides blob as audioAudit[testName] = "Live".
const AUDIO_AUDIT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1PcsGqvVzf4ZbJimthnzPOKPCirLw2kTXIaj2lplgKkU/edit";

// Pipeline order, least → most done. "Live" is the app-side terminal stage
// (audio actually replaced in the product); the sheet itself stops at
// "Ready for Upload".
const AUDIO_STAGES = [
  { name: "Pending", color: "#cbd5e1" },
  { name: "Planned", color: "#f59e0b" },
  { name: "In Progress", color: "#0ea5e9" },
  { name: "In Review", color: "#2563eb" },
  { name: "Final Edit", color: "#7c3aed" },
  { name: "Ready for Upload", color: "#4ade80" },
  { name: "Live", color: "#16a34a" },
] as const;

type AudioAuditTest = { name: string; status: string };
type DeployFrequency = { windowDays: number; total: number; last30: number; perWeek: number; daysSinceLast: number | null };

type EngMetrics = {
  prWindowDays: number;
  prsMerged: number;
  prsPerWeek: number;
  prCycleMedianHours: number | null;
  leadTimeMedianHours: number | null;
  deploys: { windowDays: number; total: number; failed: number; failurePct: number | null };
  unreleasedPrs: number;
  lastReleaseDaysAgo: number | null;
  series: {
    weekStarts: string[];
    prsPerWeek: number[];
    prCycleHours: (number | null)[];
    leadTimeHours: (number | null)[];
    releasesPerWeek: number[];
  };
};

// "18.4h" under a day, "2.3d" beyond it.
function formatHours(h: number | null): string {
  if (h === null) return "–";
  return h < 24 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`;
}

function weekLabels(eng: EngMetrics): string[] {
  return eng.series.weekStarts.map((d) => parseDateLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
}

// Eng side of the audio replacement work: the "Content Updates" Linear
// project (Molly files per-subtest replacement tickets, eng swaps them in).
function AudioEngDependencies() {
  const [issues, setIssues] = useState<PrenormProjectIssue[] | null>(null);
  const [error, setError] = useState(false);
  // Content Updates project + team ids, needed to create new tickets into it.
  const [ids, setIds] = useState<{ projectId: string; teamId: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    linearQuery<{
      issues: { nodes: PrenormProjectIssue[] };
      projects: { nodes: { id: string; teams: { nodes: { id: string }[] } }[] };
    }>(
      `query AudioEngDeps {
        issues(first: 50, filter: { project: { name: { eq: "Content Updates" } } }) {
          nodes {
            id identifier title url
            state { name type color }
            assignee { displayName }
            project { name }
          }
        }
        projects(filter: { name: { eq: "Content Updates" } }, first: 1) {
          nodes { id teams(first: 1) { nodes { id } } }
        }
      }`,
    )
      .then((d) => {
        setIssues(d.issues.nodes.filter((i) => i.state.type !== "canceled" && i.state.type !== "duplicate"));
        const p = d.projects.nodes[0];
        if (p?.teams.nodes[0]) setIds({ projectId: p.id, teamId: p.teams.nodes[0].id });
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTicket = async () => {
    const title = newTitle.trim();
    if (!title || !ids || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/linear/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, teamId: ids.teamId, projectId: ids.projectId }),
      });
      const json = await res.json();
      // Refetch instead of appending: the create response's state has no
      // `type`, which the sort and status pill need.
      if (json.success) { setNewTitle(""); load(); }
    } catch (err) { console.error("Create ticket failed:", err); }
    finally { setCreating(false); }
  };

  const stateOrder: Record<string, number> = { started: 0, unstarted: 1, backlog: 2, completed: 3 };
  const rows = issues ? [...issues].sort((a, b) => (stateOrder[a.state.type] ?? 9) - (stateOrder[b.state.type] ?? 9)) : null;

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
        Eng Dependencies
        <span style={{ fontWeight: 600, textTransform: "none", letterSpacing: 0, marginLeft: 8 }}>Content Updates project · live from Linear</span>
      </div>
      {error && <div style={{ color: "#dc2626", fontSize: 13, padding: "12px 0" }}>Couldn&apos;t load Content Updates tickets from Linear.</div>}
      {!error && !rows && <div style={{ color: "#94a3b8", fontSize: 13, padding: "12px 0" }}>Loading tickets from Linear...</div>}
      {rows && rows.length === 0 && <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "12px 0" }}>No open tickets.</div>}
      {rows && rows.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
          {rows.map((i) => {
            const s = cellStatus([i]);
            return (
              <a
                key={i.id}
                href={i.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: "1px solid #f1f5f9", textDecoration: "none" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 15, width: 18, textAlign: "center", color: i.state.type === "completed" ? "#16a34a" : i.state.type === "started" ? "#2563eb" : "#cbd5e1" }}>
                  {i.state.type === "completed" ? "✓" : i.state.type === "started" ? "●" : "○"}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: i.state.type === "completed" ? "#94a3b8" : "#1e293b", textDecoration: i.state.type === "completed" ? "line-through" : "none" }}>
                  {i.title}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {ownerFirstName(i.assignee?.displayName)}
                </span>
                {s && (
                  <span style={{
                    display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap", color: s.color, background: s.bg,
                  }}>
                    {s.label}
                  </span>
                )}
              </a>
            );
          })}
        </div>
      )}
      {ids && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <input
            type="text"
            placeholder="Add a ticket to Content Updates..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") createTicket(); }}
            style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 13, padding: "7px 10px", border: "1px solid #e2e8f0", borderRadius: 8, outline: "none", background: "#fff" }}
          />
          <button
            onClick={createTicket}
            disabled={!newTitle.trim() || creating}
            style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, padding: "7px 14px", border: "none", borderRadius: 8, cursor: newTitle.trim() && !creating ? "pointer" : "default", background: newTitle.trim() && !creating ? "#2563eb" : "#cbd5e1", color: "#fff" }}
          >
            {creating ? "Adding..." : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}

function AudioAuditSection() {
  const [tests, setTests] = useState<AudioAuditTest[] | null>(null);
  const [edits, setEdits] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/audio-audit")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setTests(j.tests);
      })
      .catch(() => setError(true));
    fetchOverrides().then((ov) => setEdits(ov.audioAudit ?? {}));
  }, []);

  const isLive = (name: string) => edits?.[name] === "Live";
  const setLive = (test: string, live: boolean) => {
    setEdits((prev) => {
      const next = { ...prev };
      if (live) next[test] = "Live";
      else delete next[test];
      return next;
    });
    saveOverride("setAudioAuditStatus", { test, status: live ? "Live" : "" }).catch(() => {});
  };

  // Live (manually ticked) trumps the sheet's pipeline status.
  const statusOf = (t: AudioAuditTest) => (isLive(t.name) ? "Live" : t.status);

  const header = (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #1e293b" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>Readiness</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Audio Content Updates</h2>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
        Live from the{" "}
        <a href={AUDIO_AUDIT_SHEET_URL} target="_blank" rel="noreferrer" style={{ color: "#2563eb" }}>audit sheet</a>
        {" "}· Live checkbox tracked here
      </span>
    </div>
  );

  if (error) {
    return (
      <div style={{ marginBottom: 36 }}>
        {header}
        <div style={{ color: "#dc2626", padding: "20px 0", textAlign: "center" }}>Couldn&apos;t load the audit sheet.</div>
      </div>
    );
  }
  if (!tests) {
    return (
      <div style={{ marginBottom: 36 }}>
        {header}
        <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center" }}>Loading from the audit sheet...</div>
      </div>
    );
  }

  const counts: { name: string; color: string; count: number }[] = AUDIO_STAGES.map((s) => ({
    ...s,
    count: tests.filter((t) => statusOf(t) === s.name).length,
  }));
  // Sheet statuses we don't recognize still show up instead of silently
  // falling out of the bar and key.
  const knownNames = new Set<string>(AUDIO_STAGES.map((s) => s.name));
  const unknownCount = tests.filter((t) => !knownNames.has(statusOf(t))).length;
  if (unknownCount > 0) counts.unshift({ name: "Other", color: "#94a3b8", count: unknownCount });
  const liveCount = counts.find((c) => c.name === "Live")?.count ?? 0;

  return (
    <div style={{ marginBottom: 36 }}>
      {header}

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", marginBottom: 16, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
            {liveCount} / {tests.length} live
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{tests.length} tests need new audio</span>
        </div>
        {/* Stacked pipeline bar, most-done stage on the left */}
        <div style={{ display: "flex", height: 12, borderRadius: 999, overflow: "hidden", background: "#f1f5f9" }}>
          {[...counts].reverse().filter((c) => c.count > 0).map((c) => (
            <div key={c.name} title={`${c.name}: ${c.count}`} style={{ width: `${(c.count / tests.length) * 100}%`, background: c.color }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
          {counts.filter((c) => c.count > 0).map((c) => (
            <span key={c.name} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#475569" }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: c.color, display: "inline-block" }} />
              {c.name} · {c.count}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 1px 2px rgba(0,0,0,0.04)", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}>
        {tests.map((t) => {
          const status = statusOf(t);
          const stage = AUDIO_STAGES.find((s) => s.name === status);
          return (
            <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", borderBottom: "1px solid #f1f5f9" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: stage?.color ?? "#cbd5e1", flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: status === "Live" ? "#94a3b8" : "#1e293b" }}>{t.name}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", whiteSpace: "nowrap" }}>{status}</span>
              <label title="Audio actually replaced in the product" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={isLive(t.name)}
                  disabled={edits === null}
                  onChange={(e) => setLive(t.name, e.target.checked)}
                  style={{ width: 14, height: 14, cursor: "pointer", accentColor: "#16a34a" }}
                />
                Live
              </label>
            </div>
          );
        })}
      </div>

      <AudioEngDependencies />
    </div>
  );
}

// ── Key Dates ───────────────────────────────────────────────────────────────
// User-managed milestone list under the pre-norming countdown. Anyone can
// add, edit, or delete rows; each has a red/yellow/green confidence status.
type KeyDate = { id: string; text: string; date: string; status: "red" | "yellow" | "green" };

const KEY_DATE_COLORS: Record<KeyDate["status"], { dot: string; bg: string }> = {
  red: { dot: "#dc2626", bg: "#fef2f2" },
  yellow: { dot: "#eab308", bg: "#fefce8" },
  green: { dot: "#16a34a", bg: "#f0fdf4" },
};
const KEY_DATE_CYCLE: KeyDate["status"][] = ["green", "yellow", "red"];

// Shown until someone saves an edit; after that the stored list is truth.
const DEFAULT_KEY_DATES: KeyDate[] = [
  { id: "seed-intake-form", text: "Send out intake form", date: "2026-08-28", status: "green" },
];
const NORMING_DEFAULT_KEY_DATES: KeyDate[] = [
  { id: "seed-norming-intake-form", text: "Send out intake form", date: "2026-09-14", status: "green" },
];

// Compact chip row inside the countdown card. Each chip: status dot (click
// cycles green/yellow/red), inline-editable title, click-to-edit date, ×.
// scope="norming" reads/writes the norming list; default is pre-norming.
function KeyDatesBar({ scope }: { scope?: "norming" }) {
  const [items, setItems] = useState<KeyDate[] | null>(null);
  // Chip id whose date is being edited (shows the native date input).
  const [editingDate, setEditingDate] = useState<string | null>(null);

  useEffect(() => {
    fetchOverrides().then((ov) =>
      setItems(scope === "norming" ? (ov.normingKeyDates ?? NORMING_DEFAULT_KEY_DATES) : (ov.keyDates ?? DEFAULT_KEY_DATES)),
    );
  }, [scope]);

  const persist = (next: KeyDate[]) => {
    const sorted = [...next].sort((a, b) => a.date.localeCompare(b.date));
    setItems(sorted);
    saveOverride("saveKeyDates", { items: sorted, scope }).catch(() => {});
  };

  const update = (id: string, patch: Partial<KeyDate>) => {
    if (!items) return;
    persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  if (!items) return null;

  return (
    <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2 }}>Key dates</span>
      {items.map((it) => {
        const c = KEY_DATE_COLORS[it.status];
        return (
          <span key={it.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: c.bg, border: "1px solid #e2e8f0", borderRadius: 999, padding: "4px 10px 4px 6px" }}>
            <button
              onClick={() => update(it.id, { status: KEY_DATE_CYCLE[(KEY_DATE_CYCLE.indexOf(it.status) + 1) % KEY_DATE_CYCLE.length] })}
              title={`Status: ${it.status} — click to change`}
              style={{ width: 12, height: 12, borderRadius: "50%", background: c.dot, border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
            />
            <input
              value={it.text}
              placeholder="What needs to happen"
              size={Math.max(it.text.length, 12)}
              onChange={(e) => {
                // Local-only while typing; persisted on blur to avoid a save per keystroke.
                setItems((prev) => prev!.map((p) => (p.id === it.id ? { ...p, text: e.target.value } : p)));
              }}
              onBlur={(e) => update(it.id, { text: e.target.value.trim() })}
              style={{ fontSize: 12, fontWeight: 600, color: "#1e293b", fontFamily: "inherit", border: "none", outline: "none", background: "transparent", padding: 0 }}
            />
            {editingDate === it.id ? (
              <input
                type="date"
                value={it.date}
                autoFocus
                onChange={(e) => { if (e.target.value) update(it.id, { date: e.target.value }); }}
                onBlur={() => setEditingDate(null)}
                style={{ fontSize: 11, fontFamily: "inherit", color: "#64748b", border: "1px solid #e2e8f0", borderRadius: 6, padding: "0 4px", background: "#fff" }}
              />
            ) : (
              <button
                onClick={() => setEditingDate(it.id)}
                title="Change date"
                style={{ fontSize: 12, fontWeight: 700, color: "#475569", whiteSpace: "nowrap", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", padding: 0 }}
              >
                {parseDateLocal(it.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </button>
            )}
            <button
              onClick={() => persist(items.filter((p) => p.id !== it.id))}
              title="Delete"
              style={{ border: "none", background: "transparent", color: "#cbd5e1", fontSize: 14, cursor: "pointer", padding: 0, lineHeight: 1 }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#dc2626"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#cbd5e1"; }}
            >
              ×
            </button>
          </span>
        );
      })}
      <button
        onClick={() => persist([...items, { id: newNormingItemId(), text: "", date: new Date().toISOString().slice(0, 10), status: "yellow" }])}
        style={{ border: "1px dashed #cbd5e1", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", borderRadius: 999, padding: "4px 10px" }}
      >
        + Add
      </button>
    </div>
  );
}

// ── Metrics tab ─────────────────────────────────────────────────────────────
// One-screen summary of the numbers that matter for norming readiness. Every
// tile reuses the same data sources and math as its detailed section on the
// Norming Countdown tab, so the two always agree.
function MetricTile({ label, done, total, color, note }: { label: string; done: number; total: number; color: string; note: string }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{done}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#94a3b8" }}>/ {total}</span>
        <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 800, color: "#475569", fontVariantNumeric: "tabular-nums" }}>{pct}%</span>
      </div>
      <div style={{ height: 8, borderRadius: 999, background: "#f1f5f9", overflow: "hidden", marginBottom: 10 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width 0.4s ease" }} />
      </div>
      <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

// A plain number tile for metrics that aren't a done/total fraction.
// Weekly trend chart inside a stat tile: recessive axes (0 / mid / max
// gridlines, first / mid / last week labels), gray line with the current
// week's point in the tile's accent, hover shows the week's value.
type Trend = {
  points: (number | null)[];
  labels: string[];
  format: (v: number) => string;
  // Compact axis-tick formatter; defaults to rounded numbers.
  tickFormat?: (v: number) => string;
};

function Sparkline({ trend, accent }: { trend: Trend; accent: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const { points, labels, format } = trend;
  const tickFormat = trend.tickFormat ?? ((v: number) => String(Math.round(v)));
  const nonNull = points.filter((v): v is number => v !== null);
  if (nonNull.length < 2) return null;
  const w = 240;
  const h = 88;
  const padL = 34;
  const padR = 8;
  const padT = 16;
  const padB = 16;
  const max = Math.max(...nonNull, 1);
  const x = (i: number) => padL + (i * (w - padL - padR)) / (points.length - 1);
  const y = (v: number) => h - padB - (v / max) * (h - padT - padB);
  // One path with gaps where a week has no data.
  let d = "";
  let pen = false;
  points.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  const lastIdx = points.length - 1 - [...points].reverse().findIndex((v) => v !== null);
  const slot = (w - padL - padR) / (points.length - 1);
  const mid = Math.floor((points.length - 1) / 2);
  const yTicks = [0, max / 2, max];
  const hoverV = hover !== null ? points[hover] : null;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="12-week trend"
      style={{ width: "100%", height: h, display: "block", marginTop: 12 }}
      onMouseLeave={() => setHover(null)}
    >
      {/* y axis: gridlines + compact tick labels */}
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#f1f5f9" strokeWidth={1} />
          <text x={padL - 5} y={y(t) + 2.5} textAnchor="end" fontSize={8} fill="#94a3b8" fontFamily="inherit">
            {tickFormat(t)}
          </text>
        </g>
      ))}
      {/* x axis: first / mid / last week */}
      {[0, mid, points.length - 1].map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={h - 4}
          textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
          fontSize={8}
          fill="#94a3b8"
          fontFamily="inherit"
        >
          {labels[i]}
        </text>
      ))}
      <path d={d} fill="none" stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {points[lastIdx] !== null && <circle cx={x(lastIdx)} cy={y(points[lastIdx])} r={3.5} fill={accent} />}
      {/* hover: guide line, point, and value readout */}
      {hover !== null && hoverV !== null && (
        <g pointerEvents="none">
          <line x1={x(hover)} x2={x(hover)} y1={padT - 4} y2={h - padB} stroke="#e2e8f0" strokeWidth={1} />
          <circle cx={x(hover)} cy={y(hoverV)} r={3.5} fill={accent} />
          <text
            x={x(hover)}
            y={padT - 6}
            textAnchor={hover < points.length / 3 ? "start" : hover > (2 * points.length) / 3 ? "end" : "middle"}
            fontSize={9}
            fontWeight={700}
            fill="#334155"
            fontFamily="inherit"
            stroke="#fff"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {labels[hover]} · {format(hoverV)}
          </text>
        </g>
      )}
      {points.map((v, i) =>
        v === null ? null : (
          <rect
            key={i}
            x={x(i) - slot / 2}
            y={0}
            width={slot}
            height={h}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ),
      )}
    </svg>
  );
}

function StatTile({
  label,
  value,
  unit,
  color,
  note,
  definition,
  trend,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  note?: string;
  definition?: string;
  trend?: Trend;
}) {
  const [showDef, setShowDef] = useState(false);
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        {definition && (
          <span style={{ position: "relative", display: "inline-flex" }}>
            <span
              onMouseEnter={() => setShowDef(true)}
              onMouseLeave={() => setShowDef(false)}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 14, height: 14, borderRadius: "50%", border: "1px solid #cbd5e1",
                fontSize: 9, fontWeight: 800, color: "#64748b", cursor: "help",
              }}
            >
              ?
            </span>
            {showDef && (
              <span
                style={{
                  position: "absolute", left: -8, top: "calc(100% + 8px)", width: 240,
                  background: "#1e293b", color: "#fff", fontSize: 12, fontWeight: 500, lineHeight: 1.5,
                  padding: "8px 10px", borderRadius: 6, pointerEvents: "none",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)", zIndex: 20,
                }}
              >
                {definition}
              </span>
            )}
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: note ? 12 : 0 }}>
        <span style={{ fontSize: 36, fontWeight: 900, color, lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#94a3b8" }}>{unit}</span>
      </div>
      {note && <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{note}</div>}
      {trend && <Sparkline trend={trend} accent={color} />}
    </div>
  );
}

// Section header used across the Metrics tab, matching the eyebrow + rule
// style of the Norming Countdown sections.
function MetricsSectionHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "36px 0 18px", paddingBottom: 12, borderBottom: "2px solid #1e293b", flexWrap: "wrap", gap: 8 }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>{eyebrow}</div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>{title}</h2>
      </div>
      {hint && <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>{hint}</span>}
    </div>
  );
}

// ── Bugs section (Metrics tab) ──────────────────────────────────────────
// Everything carrying Linear's "Bug" label: flow stats up top, then the
// actual open list grouped by priority — at ~a dozen open bugs, titles beat
// aggregates. Rows open the standard Linear detail panel.
type BugIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  priority: number; // 0 none, 1 urgent, 2 high, 3 medium, 4 low
  createdAt: string;
  completedAt: string | null;
  canceledAt: string | null;
  state: { name: string; type: string; color: string };
  assignee: { displayName: string } | null;
};

const BUG_PRIORITIES: { value: number; label: string; color: string; bg: string }[] = [
  { value: 1, label: "Urgent", color: "#dc2626", bg: "#fef2f2" },
  { value: 2, label: "High", color: "#ea580c", bg: "#fff7ed" },
  { value: 3, label: "Medium", color: "#ca8a04", bg: "#fefce8" },
  { value: 4, label: "Low", color: "#64748b", bg: "#f8fafc" },
  { value: 0, label: "No priority", color: "#94a3b8", bg: "#f8fafc" },
];

const OPEN_STATE_TYPES = new Set(["triage", "backlog", "unstarted", "started"]);

function BugsSection() {
  const [bugs, setBugs] = useState<BugIssue[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  // Priority groups the user has expanded; all collapsed by default.
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({});

  const load = useCallback(() => {
    linearQuery<{ issues: { nodes: BugIssue[] } }>(
      `query Bugs {
        issues(first: 250, filter: { labels: { name: { eq: "Bug" } } }) {
          nodes {
            id identifier title url priority createdAt completedAt canceledAt
            state { name type color }
            assignee { displayName }
          }
        }
      }`,
    )
      .then((d) => setBugs(d.issues.nodes))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const open = (bugs ?? []).filter((b) => OPEN_STATE_TYPES.has(b.state.type));
  const opened30 = (bugs ?? []).filter((b) => now - new Date(b.createdAt).getTime() < 30 * day).length;
  const fixed30 = (bugs ?? []).filter(
    (b) => b.state.type === "completed" && b.completedAt && now - new Date(b.completedAt).getTime() < 30 * day,
  ).length;
  const triage = open.filter((b) => b.state.type === "triage").length;
  const ageDays = (b: BugIssue) => Math.floor((now - new Date(b.createdAt).getTime()) / day);

  // Median report -> fix over 90 days. 30 days is too few fixes to trust:
  // one old-backlog cleanup sweep poisons the small window.
  const fixedBugs = (bugs ?? []).filter(
    (b) => b.state.type === "completed" && b.completedAt && now - new Date(b.completedAt!).getTime() < 90 * day,
  );
  const timeToFixFor = (priority?: number): { median: number | null; n: number } => {
    const ts = fixedBugs
      .filter((b) => priority === undefined || b.priority === priority)
      .map((b) => (new Date(b.completedAt!).getTime() - new Date(b.createdAt).getTime()) / day)
      .sort((a, b) => a - b);
    if (ts.length === 0) return { median: null, n: 0 };
    const mid = Math.floor(ts.length / 2);
    return { median: ts.length % 2 ? ts[mid] : (ts[mid - 1] + ts[mid]) / 2, n: ts.length };
  };
  const formatFix = (d2: number) => (d2 < 1 ? `${Math.round(d2 * 24)}h` : `${d2.toFixed(1)}d`);
  const ttfAll = timeToFixFor();
  const ttfUrgent = timeToFixFor(1);
  const ttfHigh = timeToFixFor(2);

  // Open-backlog history: for each of the last 12 weeks, how many bugs were
  // open at that week's end. Reconstructed from created/closed timestamps.
  const WEEK = 7 * day;
  const thisWeek = Math.floor((now - 4 * day) / WEEK) * WEEK + 4 * day; // Mondays (epoch was a Thursday)
  const weekStarts = Array.from({ length: 12 }, (_, i) => thisWeek - (11 - i) * WEEK);
  const closedAtOf = (b: BugIssue): number | null => {
    const ts = b.completedAt ?? b.canceledAt;
    if (ts) return new Date(ts).getTime();
    // Closed-type state but no timestamp (old imports): treat as closed at
    // creation so it never inflates the historical open count.
    return OPEN_STATE_TYPES.has(b.state.type) ? null : new Date(b.createdAt).getTime();
  };
  const backlogSeries = weekStarts.map((ws) => {
    const t = Math.min(ws + WEEK, now);
    return (bugs ?? []).filter((b) => {
      if (new Date(b.createdAt).getTime() > t) return false;
      const closed = closedAtOf(b);
      return closed === null || closed > t;
    }).length;
  });
  const backlogLabels = weekStarts.map((ws) => new Date(ws).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));

  return (
    <>
      <MetricsSectionHeader eyebrow="Quality" title="Bugs" hint={'Live from Linear · everything labeled "Bug"'} />
      {error && <div style={{ color: "#dc2626", padding: "12px 0" }}>Couldn&apos;t load bugs from Linear.</div>}
      {!error && !bugs && <div style={{ color: "#94a3b8", padding: "12px 0" }}>Loading bugs from Linear...</div>}
      {bugs && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16, marginBottom: 16 }}>
            <StatTile
              label="Open bugs"
              value={String(open.length)}
              unit="across all priorities"
              color={open.some((b) => b.priority === 1) ? "#dc2626" : "#0f766e"}
              definition={'Everything carrying Linear\'s "Bug" label that isn\'t done, canceled, or a duplicate. The trend shows how many bugs were open at the end of each of the last 12 weeks, reconstructed from report and close dates.'}
              trend={{ points: backlogSeries, labels: backlogLabels, format: (v) => `${v} open bugs` }}
            />
            <StatTile
              label="In triage"
              value={String(triage)}
              unit="awaiting a priority call"
              color={triage > 0 ? "#b45309" : "#0f766e"}
              definition="Bug reports still in Linear's triage state: nobody has accepted or prioritized them yet."
            />
            <StatTile
              label="Bug flow"
              value={`${opened30} / ${fixed30}`}
              unit="opened / fixed, last 30 days"
              color={opened30 > fixed30 ? "#b45309" : "#0f766e"}
              definition="Bugs reported vs bugs fixed over the last 30 days. More opened than fixed means the backlog is growing."
            />
            <StatTile
              label="Time to fix"
              value={ttfAll.median === null ? "–" : formatFix(ttfAll.median)}
              unit={`median, ${ttfAll.n} fixes in 90 days`}
              color="#0f766e"
              definition="Median time from a bug being reported to being fixed, over the last 90 days. Blends all priorities, so deliberate low-priority waiting counts against it; a jump here often just means old backlog bugs got cleaned up."
            />
            <StatTile
              label="Time to fix · urgent"
              value={ttfUrgent.median === null ? "–" : formatFix(ttfUrgent.median)}
              unit={ttfUrgent.n === 0 ? "no urgent bugs fixed in 90 days" : `median, ${ttfUrgent.n} fixes in 90 days`}
              color={ttfUrgent.median !== null && ttfUrgent.median > 2 ? "#dc2626" : "#0f766e"}
              definition="Median report-to-fix time for urgent-priority bugs over the last 90 days. A dash means none were filed and fixed, which is the good outcome. Turns red if the median passes 2 days."
            />
            <StatTile
              label="Time to fix · high"
              value={ttfHigh.median === null ? "–" : formatFix(ttfHigh.median)}
              unit={ttfHigh.n === 0 ? "no high-priority bugs fixed in 90 days" : `median, ${ttfHigh.n} fixes in 90 days`}
              color={ttfHigh.median !== null && ttfHigh.median > 7 ? "#b45309" : "#0f766e"}
              definition="Median report-to-fix time for high-priority bugs over the last 90 days. Small sample: with only a handful of fixes, one slow bug moves this a lot. Turns amber if the median passes a week."
            />
          </div>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            {open.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "16px 18px" }}>No open bugs.</div>
            )}
            {BUG_PRIORITIES.map((p) => {
              const rows = open
                .filter((b) => b.priority === p.value)
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
              if (rows.length === 0) return null;
              const isOpen = openGroups[p.value] ?? false;
              return (
                <div key={p.value}>
                  <div
                    onClick={() => setOpenGroups((g) => ({ ...g, [p.value]: !isOpen }))}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", borderTop: "1px solid #e2e8f0", cursor: "pointer", userSelect: "none" }}
                  >
                    <span style={{ fontSize: 10, color: "#94a3b8", width: 10 }}>{isOpen ? "▾" : "▸"}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: p.color, background: p.bg, borderRadius: 999, padding: "3px 10px" }}>
                      {p.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8" }}>{rows.length}</span>
                    {!isOpen && (
                      <span style={{ fontSize: 12, color: "#cbd5e1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {rows.map((b) => b.identifier).join(" · ")}
                      </span>
                    )}
                  </div>
                  {isOpen && rows.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedIssueId(b.id)}
                      title={`${b.identifier} · ${b.state.name}`}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", whiteSpace: "nowrap", minWidth: 74 }}>{b.identifier}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{b.title}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {ownerFirstName(b.assignee?.displayName)}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: ageDays(b) > 60 ? "#b45309" : "#94a3b8", whiteSpace: "nowrap", minWidth: 44, textAlign: "right" }} title="Age since reported">
                        {ageDays(b)}d old
                      </span>
                      <span style={{
                        display: "inline-block", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                        padding: "3px 10px", borderRadius: 999, whiteSpace: "nowrap",
                        color: b.state.type === "started" ? "#2563eb" : "#64748b",
                        background: b.state.type === "started" ? "#eff6ff" : "#f1f5f9",
                      }}>
                        {b.state.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {selectedIssueId && (
            <CycleIssueDetailPanel
              issueId={selectedIssueId}
              onClose={() => setSelectedIssueId(null)}
              cycles={[]}
              onUpdated={() => load()}
            />
          )}
        </>
      )}
    </>
  );
}

function MetricsView() {
  const [prenormIssues, setPrenormIssues] = useState<PrenormIssue[] | null>(null);
  const [content, setContent] = useState<{ instructions: AiRow[]; cfBuilt: CfRow[] } | null>(null);
  const [overrides, setOverrides] = useState<RoadmapOverrides | null>(null);
  const [audioTests, setAudioTests] = useState<AudioAuditTest[] | null>(null);
  const [deploys, setDeploys] = useState<DeployFrequency | null>(null);
  const [eng, setEng] = useState<EngMetrics | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/linear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: PRENORM_ISSUES_QUERY, variables: { label: PRENORMING_LABEL } }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        const labeled: PrenormIssue[] = j.data?.labeled?.nodes ?? [];
        const formUpdates: PrenormIssue[] = j.data?.formUpdates?.nodes ?? [];
        const visibility: PrenormIssue[] = j.data?.visibility?.nodes ?? [];
        const byId = new Map<string, PrenormIssue>();
        for (const i of [...labeled, ...formUpdates]) byId.set(i.id, i);
        for (const i of visibility) byId.set(i.id, { ...i, isVisibility: true });
        setPrenormIssues([...byId.values()]);
      })
      .catch(() => setErrors((e) => [...e, "Linear tickets"]));
    fetch("/api/content-readiness")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setContent(j);
      })
      .catch(() => setErrors((e) => [...e, "shipped content"]));
    fetch("/api/audio-audit")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setAudioTests(j.tests);
      })
      .catch(() => setErrors((e) => [...e, "audio audit sheet"]));
    fetch("/api/release-frequency")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setDeploys(j);
      })
      .catch(() => setErrors((e) => [...e, "release frequency"]));
    fetch("/api/eng-metrics")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setEng(j);
      })
      .catch(() => setErrors((e) => [...e, "engineering metrics"]));
    fetchOverrides().then(setOverrides);
  }, []);

  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysToPrenorm = Math.max(0, Math.ceil((PRENORMING_TARGET.getTime() - now.getTime()) / msPerDay));
  const daysToNorm = Math.max(0, Math.ceil((NORMING_TARGET.getTime() - now.getTime()) / msPerDay));

  // Form Updates readiness (same math as the pre-norming table).
  const readiness = prenormIssues ? computePrenormReadiness(prenormIssues, overrides?.prenormQa ?? {}) : null;

  // All tickets carrying the pre-norming label, workspace-wide.
  const labeledLive = (prenormIssues ?? []).filter(
    (i) => !i.isVisibility && i.state.type !== "canceled" && i.state.type !== "duplicate",
  );
  const labeledDone = labeledLive.filter((i) => i.state.type === "completed").length;

  // Instructions: a subtest counts when every scene of its latest version has audio.
  const instrRows = content?.instructions ?? [];
  const instrBuilt = instrRows.filter((r) => r.scenes > 0 && r.scenesWithAudio === r.scenes).length;
  const instrReleased = instrRows.filter((r) => r.isActive).length;

  // Corrective feedback: only the subtests the content tracker says need it.
  const cfRows = (content?.cfBuilt ?? []).filter((r) => CF_NEEDED.has(r.code));
  const cfDone = cfRows.filter((r) => r.total > 0 && r.complete === r.total).length;

  // Audio content updates: scope from the audit sheet, Live ticks from the app.
  const audioEdits = overrides?.audioAudit ?? {};
  const audioLive = (audioTests ?? []).filter((t) => audioEdits[t.name] === "Live").length;

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "calc(100vh - 80px)", overflow: "auto", background: "#f8fafc" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 32px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Key Metrics</h1>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Live from Linear, GitHub, and the content trackers · hover a ? for definitions</span>
        </div>

        {errors.length > 0 && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#b91c1c", fontSize: 13, fontWeight: 600, padding: "10px 14px", marginBottom: 16 }}>
            Couldn&apos;t load: {[...new Set(errors)].join(", ")}. The rest of the page is unaffected.
          </div>
        )}

        <MetricsSectionHeader eyebrow="Norming" title="Readiness" hint="Same sources and math as the Norming Countdown tab" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 16 }}>
          {[
            { label: "Days to pre-norming", days: daysToPrenorm, date: "Sep 8", color: "#f97316" },
            { label: "Days to norming", days: daysToNorm, date: "Sep 28", color: "#eab308" },
          ].map((d) => (
            <div key={d.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "20px 22px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>{d.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 900, color: d.color, lineHeight: 1 }}>{d.days}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{d.date}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {readiness && (
            <MetricTile
              label="Tests ready for pre-norming"
              done={readiness.readyCount}
              total={readiness.rows.length}
              color="#16a34a"
              note="Norming form fully done: every tracked psychometrics and engineering ticket complete."
            />
          )}
          {prenormIssues && (
            <MetricTile
              label="Pre-norming tickets done"
              done={labeledDone}
              total={labeledLive.length}
              color="#f97316"
              note={`Every ticket carrying the "${PRENORMING_LABEL}" label in Linear.`}
            />
          )}
          {content && (
            <MetricTile
              label="English instructions built"
              done={instrBuilt}
              total={instrRows.length}
              color="#2563EB"
              note={`Subtests whose English instruction scenes all have audio. ${instrReleased} released to the player so far.`}
            />
          )}
          {content && (
            <MetricTile
              label="Corrective feedback built"
              done={cfDone}
              total={CF_NEEDED.size}
              color="#D97706"
              note="Subtests where every practice item has all four feedback files."
            />
          )}
          {overrides && audioTests && (
            <MetricTile
              label="Audio updates live"
              done={audioLive}
              total={audioTests.length}
              color="#7C3AED"
              note="Replacement audio actually live in the product. Scope from the audit sheet; Live ticked in the app."
            />
          )}
        </div>

        <MetricsSectionHeader eyebrow="marker-method" title="Engineering" hint="Live from GitHub · PR stats over 30 days, deploys over 90" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {deploys && (
            <StatTile
              label="Release frequency"
              value={deploys.perWeek.toFixed(1)}
              unit="releases / week"
              color="#0f766e"
              definition={`How often marker-method ships to production: successful runs of the Deploy to Production workflow (main merged to production) per week, over the last ${deploys.windowDays} days. The trend line is a 4-week rolling rate.`}
              note={`${deploys.total} releases in ${deploys.windowDays} days · ${deploys.last30} in the last 30 · last release ${deploys.daysSinceLast === null ? "unknown" : deploys.daysSinceLast === 0 ? "today" : `${deploys.daysSinceLast}d ago`}`}
              trend={eng ? { points: eng.series.releasesPerWeek, labels: weekLabels(eng), format: (v) => `${v.toFixed(1)} releases/wk (4-wk avg)`, tickFormat: (v) => v.toFixed(1) } : undefined}
            />
          )}
          {eng && (
            <StatTile
              label="Unreleased PRs"
              value={String(eng.unreleasedPrs)}
              unit="merged, awaiting release"
              color={eng.unreleasedPrs > 40 ? "#b45309" : "#0f766e"}
              definition="Work that's merged into main but not yet in production: PRs merged since the last successful Deploy to Production run. Grows between releases and resets to zero when one ships."
              note={eng.lastReleaseDaysAgo === null ? undefined : `Queued since the last release, ${eng.lastReleaseDaysAgo === 0 ? "today" : `${eng.lastReleaseDaysAgo}d ago`}`}
            />
          )}
          {eng && (
            <StatTile
              label="PR throughput"
              value={eng.prsPerWeek.toFixed(1)}
              unit="PRs merged / week"
              color="#0f766e"
              definition={`How much work lands: pull requests merged into marker-method's main branch per week, over the last ${eng.prWindowDays} days.`}
              note={`${eng.prsMerged} PRs merged in the last ${eng.prWindowDays} days`}
              trend={{ points: eng.series.prsPerWeek, labels: weekLabels(eng), format: (v) => `${v} PRs merged` }}
            />
          )}
          {eng && (
            <StatTile
              label="PR cycle time"
              value={formatHours(eng.prCycleMedianHours)}
              unit="median, open → merge"
              color="#0f766e"
              definition={`How long work waits in review: median time from a PR being opened to merging into main, over the last ${eng.prWindowDays} days. Lower is better.`}
              trend={{ points: eng.series.prCycleHours, labels: weekLabels(eng), format: (v) => `${formatHours(v)} median`, tickFormat: (v) => (v === 0 ? "0" : formatHours(v)) }}
            />
          )}
          {eng && (
            <StatTile
              label="Lead time to prod"
              value={formatHours(eng.leadTimeMedianHours)}
              unit="median, merge → release"
              color="#0f766e"
              definition={`How long merged work waits to ship: median time from a PR merging into main until the production release that included it, over the last ${eng.prWindowDays} days. The trend line is a 4-week rolling median. Lower is better.`}
              trend={{ points: eng.series.leadTimeHours, labels: weekLabels(eng), format: (v) => `${formatHours(v)} median (4-wk)`, tickFormat: (v) => (v === 0 ? "0" : formatHours(v)) }}
            />
          )}
          {eng && eng.deploys.failurePct !== null && (
            <StatTile
              label="Change failure rate"
              value={`${eng.deploys.failurePct}%`}
              unit="failed deploy runs"
              color={eng.deploys.failurePct > 10 ? "#dc2626" : "#0f766e"}
              definition={`How often shipping breaks: the share of Deploy to Production workflow runs that failed, over the last ${eng.deploys.windowDays} days. Too few deploys to trend honestly, so this stays a single number.`}
              note={`${eng.deploys.failed} of ${eng.deploys.total} deploy runs failed in ${eng.deploys.windowDays} days`}
            />
          )}
        </div>

        <BugsSection />

        {(!prenormIssues || !content || !overrides) && errors.length === 0 && (
          <div style={{ color: "#94a3b8", padding: "20px 0", textAlign: "center", fontSize: 13 }}>Loading metrics...</div>
        )}
      </div>
    </div>
  );
}

// Examiner/student progress toward the pre-norming goals, live from the prod
// read replica via /api/norming-progress.
function GoalProgressBars() {
  // undefined = loading, null = error
  const [data, setData] = useState<{ examiners: number; students: number } | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/norming-progress")
      .then((r) => r.json())
      .then((j) => {
        if (j.error) throw new Error(j.error);
        setData(j);
      })
      .catch(() => setData(null));
  }, []);

  const bars = [
    {
      label: "Examiners",
      done: data?.examiners ?? 0,
      total: 14,
      color: "#2563eb",
      tip: "Distinct examiners with at least one completed norming-phase session. Live from the read-only database; stays 0 until the norming study phase exists and sessions complete.",
    },
    {
      label: "Students",
      done: data?.students ?? 0,
      total: 25,
      color: "#16a34a",
      tip: "Students whose norming examination is marked completed. Live from the read-only database; stays 0 until the norming study phase exists and exams complete.",
    },
  ];

  return (
    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
      {bars.map((g) => (
        <div key={g.label} style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#64748b" }}>
              {g.label}
              <span
                className="hover-tip"
                data-tip={g.tip}
                style={{ fontSize: 9, fontWeight: 700, color: "#94a3b8", border: "1px solid #cbd5e1", borderRadius: "50%", width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
              >
                ?
              </span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", fontVariantNumeric: "tabular-nums" }}>
              {data === undefined ? "…" : data === null ? "–" : g.done} / {g.total}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "#f1f5f9", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, (g.done / g.total) * 100)}%`, height: "100%", background: g.color, borderRadius: 999, transition: "width 0.4s ease" }} />
          </div>
        </div>
      ))}
      {data === null && (
        <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>Couldn&apos;t load from the database.</span>
      )}
    </div>
  );
}

function NormingCountdownView() {
  // This component only mounts client-side (after a tab click or the hash
  // effect), so reading the hash in the initializer is hydration-safe.
  const [subView, setSubView] = useState<"norming" | "prenorming">(() =>
    typeof window !== "undefined" && window.location.hash === "#norming" ? "norming" : "prenorming",
  );

  useEffect(() => {
    window.history.replaceState(null, "", `#${subView}`);
  }, [subView]);
  // Which norming phase's work is shown below the phase cards.
  const [phaseTab, setPhaseTab] = useState<"np1" | "np2" | "np3">("np1");
  const [checklist, setChecklist] = useState<Record<string, NormingItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | "idle">("idle");
  // Re-render the countdown roughly once a minute so it stays live.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchOverrides().then((ov) => {
      setChecklist(ov.normingChecklist ?? {});
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const onSaved = () => {
      fetchOverrides().then((ov) => setChecklist(ov.normingChecklist ?? {}));
    };
    window.addEventListener("roadmap-saved", onSaved);
    return () => window.removeEventListener("roadmap-saved", onSaved);
  }, []);

  const persist = (team: string, items: NormingItem[]) => {
    setChecklist((prev) => ({ ...prev, [team]: items }));
    setSaveState("saving");
    saveOverride("saveNormingChecklist", { team, items })
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  };

  const addItem = (team: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const items = [...(checklist[team] ?? []), { id: newNormingItemId(), text: trimmed, done: false }];
    persist(team, items);
  };

  const toggleItem = (team: string, id: string) => {
    const items = (checklist[team] ?? []).map((it) => (it.id === id ? { ...it, done: !it.done } : it));
    persist(team, items);
  };

  const removeItem = (team: string, id: string) => {
    const items = (checklist[team] ?? []).filter((it) => it.id !== id);
    persist(team, items);
  };

  // ── Countdown math ──
  const isPrenorm = subView === "prenorming";
  const target = isPrenorm ? PRENORMING_TARGET : NORMING_TARGET;
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / msPerDay));
  const targetLabel = target.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const accent = isPrenorm ? "#f97316" : "#eab308";

  // Progress reflects checklist completion across all teams (prenorm project
  // checklists live in the same store but don't count here).
  const allItems = NORMING_TEAMS.flatMap((t) => checklist[t.name] ?? []);
  const doneCount = allItems.filter((it) => it.done).length;
  const progress = allItems.length > 0 ? doneCount / allItems.length : 0;
  const progressPct = Math.round(progress * 100);

  const saveStateLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";
  const saveStateColor = saveState === "error" ? "#dc2626" : saveState === "saving" ? "#94a3b8" : "#22c55e";

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "calc(100vh - 80px)", overflow: "auto", background: "#fef9c3", position: "relative" }}>
      <div style={{ maxWidth: isPrenorm ? 1140 : 820, margin: "0 auto", padding: "32px 32px 80px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
              {isPrenorm ? "Pre-Norming Countdown" : "Norming Countdown"}
            </h1>
            {!isPrenorm && (
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a16207", background: "#fef08a", border: "1px solid #facc15", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                🚧 Under construction
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {saveStateLabel && (
              <span style={{ fontSize: 12, color: saveStateColor, fontWeight: 500 }}>{saveStateLabel}</span>
            )}
            <div style={{ display: "flex", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 999, padding: 3 }}>
              {([["prenorming", "Pre-norming · Sep 8"], ["norming", "Norming · Sep 28"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setSubView(key)}
                  style={{
                    border: "none", cursor: "pointer", borderRadius: 999, padding: "6px 14px",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    background: subView === key ? (key === "prenorming" ? "#f97316" : "#eab308") : "transparent",
                    color: subView === key ? "#fff" : "#64748b",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Countdown + progress */}
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: "28px 28px 24px", marginBottom: 36, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: accent, lineHeight: 1, letterSpacing: "-0.03em" }}>{daysRemaining}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#334155" }}>{daysRemaining === 1 ? "day" : "days"} until {isPrenorm ? "pre-norming" : "norming"}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>Target: {targetLabel}</span>
          </div>
          {isPrenorm && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Goals</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#c2410c", background: "#fff7ed", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>Primary</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Validate that the assessment player is bug free and ready for norming</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", background: "#f1f5f9", borderRadius: 999, padding: "2px 8px", whiteSpace: "nowrap" }}>Secondary</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>Prove the internal app ops workflow scales out to all examiners</span>
                </div>
              </div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 10 }}>
                We will have 14 examiners test 25 monolingual students.
              </div>
              <GoalProgressBars />
            </div>
          )}
          {!isPrenorm && (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Goals</div>
              <div style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>To be filled out.</div>
            </div>
          )}
          <KeyDatesBar key={subView} scope={isPrenorm ? undefined : "norming"} />
        </div>

        {!isPrenorm && <NormingPhasesSection selected={phaseTab} onSelect={setPhaseTab} />}

        {!isPrenorm && <NormingInternalAppSection phase={phaseTab} />}

        {!isPrenorm && phaseTab === "np1" && (
          <PrenormProjectsSection
            label={NORMING_LABEL}
            projects={NORMING_PROJECTS}
            title="Assessment Player"
            description="The assessment player is locked before norming starts — these are the final player tickets to land before Sep 28. After launch, player changes freeze so every student takes the same test."
          />
        )}

        {isPrenorm && <PrenormingSection />}

        {isPrenorm && <InternalAppSection label={PRENORMING_LABEL} accent={accent} />}

        {isPrenorm && <ContentReadinessSection />}

        {isPrenorm && <AudioAuditSection />}

        {/* Pre-norming projects, tracked live from Linear */}
        {isPrenorm && <PrenormProjectsSection />}

        {isPrenorm && !loading && (
          <TeamChecklist
            team={MISC_TASKS_TEAM}
            items={checklist[MISC_TASKS_TEAM.name] ?? []}
            onAdd={(text) => addItem(MISC_TASKS_TEAM.name, text)}
            onToggle={(id) => toggleItem(MISC_TASKS_TEAM.name, id)}
            onRemove={(id) => removeItem(MISC_TASKS_TEAM.name, id)}
          />
        )}

      </div>
    </div>
  );
}

// Linear tickets in checklist text: a linear.app issue URL or a bare
// identifier like MAR2-123 (two-plus uppercase chars, so prose survives).
const LINEAR_TICKET_RE = /https?:\/\/linear\.app\/[\w-]+\/issue\/([A-Za-z][A-Za-z0-9]*-\d+)(?:\/[^\s]*)?|\b([A-Z][A-Z0-9]+-\d+)\b/g;

function checklistTicketIds(text: string): string[] {
  return [...text.matchAll(LINEAR_TICKET_RE)].map((m) => (m[1] ?? m[2]).toUpperCase());
}

function TeamChecklist({
  team,
  items,
  onAdd,
  onToggle,
  onRemove,
}: {
  team: { name: string; color: string };
  items: NormingItem[];
  onAdd: (text: string) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [draft, setDraft] = useState("");
  // Linear ticket open in the detail slide-over (UUID), if any.
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  // identifier -> live Linear issue for any ticket mentioned in item text.
  const [linked, setLinked] = useState<Record<string, { id: string; url: string; title: string; state: { name: string; type: string }; assignee: { displayName: string } | null }>>({});
  const ticketKey = [...new Set(items.flatMap((it) => checklistTicketIds(it.text)))].sort().join(",");
  const loadTickets = useCallback(() => {
    if (!ticketKey) return;
    const ids = ticketKey.split(",");
    // Linear filters by issue number, not identifier; match identifiers after.
    const nums = [...new Set(ids.map((i) => Number(i.split("-")[1])))];
    linearQuery<{ issues: { nodes: { id: string; identifier: string; url: string; title: string; state: { name: string; type: string }; assignee: { displayName: string } | null }[] } }>(
      `query ChecklistTickets($nums: [Float!]) {
        issues(first: 100, filter: { number: { in: $nums } }) {
          nodes { id identifier url title state { name type } assignee { displayName } }
        }
      }`,
      { nums },
    )
      .then((d) => {
        const wanted = new Set(ids);
        const map: typeof linked = {};
        for (const n of d.issues.nodes) if (wanted.has(n.identifier)) map[n.identifier] = n;
        setLinked(map);
      })
      .catch(() => {});
  }, [ticketKey]);
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // A row with linked tickets checks itself off when they're all completed;
  // the stored done flag still works for rows without tickets (or as an override).
  const isDone = (it: NormingItem) => {
    if (it.done) return true;
    const ids = checklistTicketIds(it.text);
    return ids.length > 0 && ids.every((id) => linked[id]?.state.type === "completed");
  };
  const doneCount = items.filter(isDone).length;
  const pct = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  const ticketPill = (id: string, key: string) => {
    const t = linked[id];
    return (
      <a
        key={key}
        href={t?.url ?? `https://linear.app/markerlearning/issue/${id}`}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        title={t ? `${t.title} · ${t.state.name}` : `Open ${id} in Linear`}
        style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.04em", textDecoration: "none",
          padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap", verticalAlign: "middle",
          color: t?.state.type === "completed" ? "#16a34a" : t?.state.type === "started" ? "#2563eb" : "#64748b",
          background: t?.state.type === "completed" ? "#f0fdf4" : t?.state.type === "started" ? "#eff6ff" : "#f1f5f9",
        }}
      >
        {id}{t ? ` · ${t.state.name}` : ""}
      </a>
    );
  };

  // Item text with any Linear mention replaced by a clickable status pill.
  // An item that's nothing but a ticket reference shows the ticket's title.
  const renderText = (text: string) => {
    if (!text.replace(LINEAR_TICKET_RE, "").trim()) {
      return checklistTicketIds(text).flatMap((id, i) => [
        <span key={`t-${id}-${i}`}>{linked[id]?.title ?? id} </span>,
        ticketPill(id, `p-${id}-${i}`),
      ]);
    }
    const out: React.ReactNode[] = [];
    let last = 0;
    for (const m of text.matchAll(LINEAR_TICKET_RE)) {
      const id = (m[1] ?? m[2]).toUpperCase();
      if (m.index > last) out.push(text.slice(last, m.index));
      out.push(ticketPill(id, `${id}-${m.index}`));
      last = m.index + m[0].length;
    }
    if (last < text.length) out.push(text.slice(last));
    return out;
  };

  const submit = () => {
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <section style={{ marginBottom: 24, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}>
      {/* Section header */}
      <header style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid #e2e8f0", borderLeft: `4px solid ${team.color}`, background: "#f8fafc" }}>
        <h3 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.08em", flex: 1 }}>
          {team.name}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 88, height: 6, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: team.color, transition: "width 0.3s ease" }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#475569", fontVariantNumeric: "tabular-nums", minWidth: 42, textAlign: "right" }}>
            {doneCount} / {items.length}
          </span>
        </div>
      </header>

      {/* Line items */}
      <div>
        {items.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: "16px 18px" }}>No requirements recorded.</div>
        )}
        {items.map((it, idx) => {
          const done = isDone(it);
          // First linked ticket resolved from Linear, if any: row click opens it.
          const linkedIssue = checklistTicketIds(it.text).map((id) => linked[id]).find(Boolean);
          return (
            <div
              key={it.id}
              onClick={() => { if (linkedIssue) setSelectedIssueId(linkedIssue.id); }}
              title={linkedIssue ? "View ticket details" : undefined}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 18px",
                cursor: linkedIssue ? "pointer" : "default",
                borderBottom: "1px solid #f1f5f9",
                background: done ? "#fafdfb" : "#fff",
              }}
              onMouseEnter={(e) => { if (linkedIssue) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = done ? "#fafdfb" : "#fff"; }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: "#cbd5e1", fontVariantNumeric: "tabular-nums", minWidth: 22 }}>
                {String(idx + 1).padStart(2, "0")}
              </span>
              <input
                type="checkbox"
                checked={done}
                onClick={(e) => e.stopPropagation()}
                onChange={() => onToggle(it.id)}
                title={linkedIssue && !it.done && done ? "Checked automatically: the linked ticket is done" : undefined}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: team.color }}
              />
              <span
                style={{
                  flex: 1, fontSize: 14, lineHeight: 1.4, color: done ? "#94a3b8" : "#1e293b",
                  textDecoration: done ? "line-through" : "none",
                }}
              >
                {renderText(it.text)}
              </span>
              {linkedIssue?.assignee && (
                <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {ownerFirstName(linkedIssue.assignee.displayName)}
                </span>
              )}
              <span
                style={{
                  fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                  padding: "3px 8px", borderRadius: 999,
                  color: done ? "#15803d" : "#b45309",
                  background: done ? "#dcfce7" : "#fef3c7",
                }}
              >
                {done ? "Complete" : "Pending"}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(it.id); }}
                title="Remove requirement"
                style={{ border: "none", background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "2px 4px" }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Add row */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder={`Add a requirement for ${team.name}… paste a Linear ID or URL to link it`}
          style={{
            flex: 1, fontFamily: "var(--font-sans)", fontSize: 14, padding: "9px 12px",
            border: "1px solid #cbd5e1", borderRadius: 6, outline: "none", color: "#1e293b", background: "#fff",
          }}
        />
        <button
          onClick={submit}
          disabled={!draft.trim()}
          style={{
            fontSize: 13, fontWeight: 700, padding: "9px 16px", border: "none", borderRadius: 6,
            background: draft.trim() ? "#1e293b" : "#cbd5e1", color: "white",
            cursor: draft.trim() ? "pointer" : "default", whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          Add
        </button>
      </div>

      {selectedIssueId && (
        <CycleIssueDetailPanel
          issueId={selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          cycles={[]}
          onUpdated={() => loadTickets()}
        />
      )}
    </section>
  );
}

// ── Weekly Planning View ────────────────────────────────────────────────

const WEEKLY_PLANNING_TEAMS = ["Engineering", "Product", "Psychometrics"];
const WEEKLY_SIGNOFF_PEOPLE = ["John", "Alex", "Cara", "Lucie"];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to most recent Monday on or before
  d.setDate(d.getDate() + diff);
  return d;
}

function formatWeekKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseWeekKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const startMonth = monday.toLocaleString("en-US", { month: "short" });
  const endMonth = sunday.toLocaleString("en-US", { month: "short" });
  if (startMonth === endMonth) {
    return `${startMonth} ${monday.getDate()}–${sunday.getDate()}, ${sunday.getFullYear()}`;
  }
  return `${startMonth} ${monday.getDate()} – ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;
}

type LinearIssueLink = { id: string; identifier: string; url: string; title: string };
type Bullet = { id: string; text: string; linearIssue?: LinearIssueLink };

// Issue assigned to someone for the selected week — used by the auto
// "From Linear" section in Weekly Planning.
type WeeklyLinearIssue = {
  id: string;
  identifier: string;
  url: string;
  title: string;
  priority: number;
  state: { name: string; color: string; type: string };
  projectId: string | null;
  projectName: string | null;
  projectColor: string | null;
};

function newBulletId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const LINEAR_URL_REGEX = /https?:\/\/linear\.app\/[^/]+\/issue\/([A-Za-z0-9-]+)(?:\/[^\s]*)?/i;

function extractLinearIdentifier(text: string): string | null {
  const m = text.match(LINEAR_URL_REGEX);
  return m ? m[1].toUpperCase() : null;
}

async function fetchLinearIssueByIdentifier(identifier: string): Promise<LinearIssueLink | null> {
  const m = identifier.match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (!m) return null;
  const teamKey = m[1].toUpperCase();
  const num = parseFloat(m[2]);
  try {
    const data = await linearQuery<{ issues: { nodes: { id: string; identifier: string; url: string; title: string }[] } }>(
      `query Issue($team: String!, $num: Float!) {
        issues(filter: { team: { key: { eq: $team } }, number: { eq: $num } }, first: 1) {
          nodes { id identifier url title }
        }
      }`,
      { team: teamKey, num },
    );
    return data.issues.nodes[0] ?? null;
  } catch {
    return null;
  }
}

function LinearSearchPopover({
  anchorRect,
  initialQuery,
  onSelect,
  onClose,
}: {
  anchorRect: DOMRect;
  initialQuery: string;
  onSelect: (issue: LinearIssueLink) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<LinearIssueLink[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const term = query.trim();
        // If user typed/pasted an identifier, look it up directly via team+number
        // (issueSearch / searchIssues searches text only — identifiers don't match).
        const idMatch = term.match(/^([A-Za-z0-9]+)-(\d+)$/);
        if (idMatch) {
          const data = await linearQuery<{ issues: { nodes: { id: string; identifier: string; url: string; title: string }[] } }>(
            `query Issue($team: String!, $num: Float!) {
              issues(filter: { team: { key: { eq: $team } }, number: { eq: $num } }, first: 1) {
                nodes { id identifier url title }
              }
            }`,
            { team: idMatch[1].toUpperCase(), num: parseFloat(idMatch[2]) },
          );
          if (!cancelled) setResults(data.issues.nodes);
        } else {
          const data = await linearQuery<{ searchIssues: { nodes: { id: string; identifier: string; url: string; title: string }[] } }>(
            `query S($q: String!) { searchIssues(term: $q, first: 8) { nodes { id identifier url title } } }`,
            { q: term },
          );
          if (!cancelled) setResults(data.searchIssues.nodes);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-linear-popover]")) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      data-linear-popover
      style={{
        position: "fixed",
        top: anchorRect.bottom + 6,
        left: Math.min(anchorRect.left, window.innerWidth - 380),
        width: 360,
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 10,
        boxShadow: "0 12px 32px rgba(15,23,42,0.18)",
        padding: 10,
        zIndex: 1000,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder="Search Linear issues or paste URL..."
        onChange={(e) => setQuery(e.target.value)}
        onPaste={(e) => {
          const pasted = e.clipboardData.getData("text");
          const ident = extractLinearIdentifier(pasted);
          if (ident) {
            e.preventDefault();
            setQuery(ident);
          }
        }}
        style={{
          fontFamily: "var(--font-sans)", fontSize: 13, width: "100%",
          padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 6,
          outline: "none",
        }}
      />
      <div style={{ marginTop: 8, maxHeight: 280, overflow: "auto" }}>
        {loading && <div style={{ color: "#94a3b8", fontSize: 12, padding: "8px 4px" }}>Searching...</div>}
        {!loading && query.trim() && results.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 12, padding: "8px 4px" }}>No results</div>
        )}
        {results.map((issue) => (
          <button
            key={issue.id}
            onClick={() => onSelect(issue)}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 10px", borderRadius: 6, border: "none",
              background: "transparent", cursor: "pointer",
              fontFamily: "var(--font-sans)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", marginBottom: 2 }}>{issue.identifier}</div>
            <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.35 }}>{issue.title}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function PersonAutoLinearSection({
  person,
  issues,
  loading,
  projectOrder,
  onSaveProjectOrder,
  ticketOrders,
  onSaveTicketOrder,
}: {
  person: Person;
  issues: WeeklyLinearIssue[];
  loading: boolean;
  projectOrder: string[];
  onSaveProjectOrder: (personName: string, order: string[]) => void;
  ticketOrders: Record<string, string[]>;
  onSaveTicketOrder: (personName: string, projectId: string, order: string[]) => void;
}) {
  // Group issues by project. Use "__no_project__" sentinel for issues with
  // no project so they still render in one bucket at the end.
  const groups = useMemo(() => {
    type Group = {
      projectId: string;
      projectName: string;
      projectColor: string | null;
      issues: WeeklyLinearIssue[];
    };
    const byId: Record<string, Group> = {};
    for (const i of issues) {
      const pid = i.projectId ?? "__no_project__";
      const pname = i.projectName ?? "No project";
      if (!byId[pid]) {
        byId[pid] = { projectId: pid, projectName: pname, projectColor: i.projectColor, issues: [] };
      }
      byId[pid].issues.push(i);
    }
    // Apply saved per-project ticket order; unknown IDs append in priority
    // order (1=urgent first, 0=No priority last).
    for (const g of Object.values(byId)) {
      const saved = ticketOrders[g.projectId] ?? [];
      const byIdMap: Record<string, WeeklyLinearIssue> = {};
      for (const t of g.issues) byIdMap[t.id] = t;
      const orderedIds = saved.filter((id) => byIdMap[id]);
      const orderedSet = new Set(orderedIds);
      const rest = g.issues
        .filter((t) => !orderedSet.has(t.id))
        .sort((a, b) => {
          const pa = a.priority === 0 ? 99 : a.priority;
          const pb = b.priority === 0 ? 99 : b.priority;
          if (pa !== pb) return pa - pb;
          return a.title.localeCompare(b.title);
        });
      g.issues = [...orderedIds.map((id) => byIdMap[id]), ...rest];
    }
    // Apply saved project order; unknown IDs append alphabetically.
    const orderedIds = projectOrder.filter((id) => byId[id]);
    const orderedSet = new Set(orderedIds);
    const rest = Object.values(byId)
      .filter((g) => !orderedSet.has(g.projectId))
      .sort((a, b) => {
        // "__no_project__" goes last; otherwise alphabetical.
        if (a.projectId === "__no_project__") return 1;
        if (b.projectId === "__no_project__") return -1;
        return a.projectName.localeCompare(b.projectName);
      });
    return [...orderedIds.map((id) => byId[id]), ...rest];
  }, [issues, projectOrder, ticketOrders]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<"before" | "after" | null>(null);

  // Ticket-level drag state — scoped per project to avoid cross-project drops.
  const [ticketDrag, setTicketDrag] = useState<{ projectId: string; ticketId: string } | null>(null);
  const [ticketDragOver, setTicketDragOver] = useState<{ projectId: string; ticketId: string; pos: "before" | "after" } | null>(null);

  const reorder = (fromId: string, toId: string, pos: "before" | "after") => {
    if (fromId === toId) return;
    const ids = groups.map((g) => g.projectId);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    let insertAt = toIdx + (pos === "after" ? 1 : 0);
    if (fromIdx < toIdx) insertAt -= 1;
    next.splice(insertAt, 0, moved);
    onSaveProjectOrder(person.name, next);
  };

  const reorderTickets = (projectId: string, fromId: string, toId: string, pos: "before" | "after") => {
    if (fromId === toId) return;
    const group = groups.find((g) => g.projectId === projectId);
    if (!group) return;
    const ids = group.issues.map((t) => t.id);
    const fromIdx = ids.indexOf(fromId);
    const toIdx = ids.indexOf(toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    const [moved] = next.splice(fromIdx, 1);
    let insertAt = toIdx + (pos === "after" ? 1 : 0);
    if (fromIdx < toIdx) insertAt -= 1;
    next.splice(insertAt, 0, moved);
    onSaveTicketOrder(person.name, projectId, next);
  };

  if (loading) {
    return (
      <div style={{ paddingLeft: 20, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
        Loading tickets…
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{ paddingLeft: 20, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
        No Linear tickets in this week.
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: 20, marginBottom: 14 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase",
        letterSpacing: "0.06em", marginBottom: 8,
      }}>
        From Linear
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {groups.map((g) => {
          const isDragging = draggingId === g.projectId;
          const showIndicator = dragOverId === g.projectId && draggingId && draggingId !== g.projectId;
          return (
            <div
              key={g.projectId}
              onDragOver={(e) => {
                if (!draggingId || draggingId === g.projectId) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                if (dragOverId !== g.projectId || dragOverPos !== pos) {
                  setDragOverId(g.projectId);
                  setDragOverPos(pos);
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  if (dragOverId === g.projectId) {
                    setDragOverId(null);
                    setDragOverPos(null);
                  }
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const fromId = e.dataTransfer.getData("text/project-id") || draggingId;
                if (fromId && dragOverPos) reorder(fromId, g.projectId, dragOverPos);
                setDraggingId(null);
                setDragOverId(null);
                setDragOverPos(null);
              }}
              style={{
                opacity: isDragging ? 0.4 : 1,
                borderTop: showIndicator && dragOverPos === "before" ? "2px solid #6366f1" : "2px solid transparent",
                borderBottom: showIndicator && dragOverPos === "after" ? "2px solid #6366f1" : "2px solid transparent",
                transition: "border-color 80ms ease",
              }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "4px 8px",
                background: "#fef9c3", border: "1px solid #facc15", borderRadius: 6,
              }}>
                <span
                  draggable
                  onDragStart={(e) => {
                    setDraggingId(g.projectId);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/project-id", g.projectId);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDragOverId(null);
                    setDragOverPos(null);
                  }}
                  title="Drag to reorder"
                  aria-label="Drag to reorder project"
                  style={{
                    flexShrink: 0, color: "#94a3b8", cursor: "grab",
                    userSelect: "none", fontSize: 14, lineHeight: 1,
                  }}
                >
                  ⋮⋮
                </span>
                {g.projectColor && (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                    background: g.projectColor,
                  }} />
                )}
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                  {g.projectName}
                </span>
                <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: "auto" }}>
                  {g.issues.length} ticket{g.issues.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ul style={{ listStyle: "none", margin: 0, padding: "4px 0 4px 24px" }}>
                {g.issues.map((i) => {
                  const isTDragging = ticketDrag?.ticketId === i.id;
                  const isTOver = ticketDragOver?.projectId === g.projectId && ticketDragOver.ticketId === i.id && ticketDrag?.ticketId !== i.id;
                  return (
                  <li
                    key={i.id}
                    onDragOver={(e) => {
                      if (!ticketDrag || ticketDrag.projectId !== g.projectId || ticketDrag.ticketId === i.id) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      const rect = e.currentTarget.getBoundingClientRect();
                      const pos: "before" | "after" = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
                      if (ticketDragOver?.ticketId !== i.id || ticketDragOver.pos !== pos) {
                        setTicketDragOver({ projectId: g.projectId, ticketId: i.id, pos });
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                        if (ticketDragOver?.ticketId === i.id) setTicketDragOver(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = e.dataTransfer.getData("text/ticket-id") || ticketDrag?.ticketId;
                      const pos = ticketDragOver?.pos;
                      if (fromId && pos) reorderTickets(g.projectId, fromId, i.id, pos);
                      setTicketDrag(null);
                      setTicketDragOver(null);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "3px 0",
                      fontSize: 12, color: "#1e293b",
                      opacity: isTDragging ? 0.4 : 1,
                      borderTop: isTOver && ticketDragOver?.pos === "before" ? "2px solid #6366f1" : "2px solid transparent",
                      borderBottom: isTOver && ticketDragOver?.pos === "after" ? "2px solid #6366f1" : "2px solid transparent",
                      transition: "border-color 80ms ease",
                    }}
                  >
                    <span
                      draggable
                      onDragStart={(e) => {
                        setTicketDrag({ projectId: g.projectId, ticketId: i.id });
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/ticket-id", i.id);
                      }}
                      onDragEnd={() => {
                        setTicketDrag(null);
                        setTicketDragOver(null);
                      }}
                      title="Drag to reorder"
                      aria-label="Drag to reorder ticket"
                      style={{
                        flexShrink: 0, color: "#cbd5e1", cursor: "grab",
                        userSelect: "none", fontSize: 12, lineHeight: 1,
                      }}
                    >
                      ⋮⋮
                    </span>
                    <span style={{
                      width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      backgroundColor: i.state.color,
                    }} />
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "#475569", fontSize: 10, textDecoration: "none", flexShrink: 0 }}
                    >
                      {i.identifier}
                    </a>
                    <a
                      href={i.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "#1e293b", textDecoration: "none", flex: 1,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                      title={i.title}
                    >
                      {i.title}
                    </a>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 999,
                      backgroundColor: hexToRgba(i.state.color, 0.15), color: i.state.color,
                      flexShrink: 0,
                    }}>
                      {i.state.name}
                    </span>
                  </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonWeekSection({
  person,
  weekKey,
  onSavedStateChange,
  autoIssues,
  autoIssuesLoading,
  projectOrder,
  onSaveProjectOrder,
  ticketOrders,
  onSaveTicketOrder,
  initialNote,
}: {
  person: Person;
  weekKey: string;
  onSavedStateChange: (state: "saving" | "saved" | "error") => void;
  autoIssues: WeeklyLinearIssue[];
  autoIssuesLoading: boolean;
  projectOrder: string[];
  onSaveProjectOrder: (personName: string, order: string[]) => void;
  ticketOrders: Record<string, string[]>;
  onSaveTicketOrder: (personName: string, projectId: string, order: string[]) => void;
  initialNote: string;
}) {
  const [noteDraft, setNoteDraft] = useState(initialNote);
  const noteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Holds a typed-but-not-yet-saved value so it can be flushed on unmount
  // and so background refetches don't clobber in-progress typing.
  const pendingNote = useRef<string | null>(null);

  // Reset note when switching weeks/people — but never while the user has
  // unsaved typing: the post-save refetch fires `initialNote` updates that
  // would otherwise overwrite newer keystrokes.
  useEffect(() => {
    if (pendingNote.current !== null) return;
    setNoteDraft(initialNote);
  }, [weekKey, person.name, initialNote]);

  const onNoteChange = (value: string) => {
    setNoteDraft(value);
    pendingNote.current = value;
    if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
    onSavedStateChange("saving");
    noteSaveTimer.current = setTimeout(() => {
      pendingNote.current = null;
      saveOverride("saveWeeklyPersonNote", { weekKey, personName: person.name, note: value })
        .then(() => onSavedStateChange("saved"))
        .catch(() => onSavedStateChange("error"));
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (noteSaveTimer.current) clearTimeout(noteSaveTimer.current);
      // Flush instead of dropping: switching weeks within the debounce window
      // must not lose the note. (Keyed by week+person, so these captures are
      // correct for this instance's whole lifetime.)
      if (pendingNote.current !== null) {
        saveOverride("saveWeeklyPersonNote", {
          weekKey,
          personName: person.name,
          note: pendingNote.current,
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div
          style={{
            width: 10, height: 10, borderRadius: 999, background: person.color,
          }}
        />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{person.name}</h3>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{person.team}</span>
      </div>
      <PersonAutoLinearSection
        person={person}
        issues={autoIssues}
        loading={autoIssuesLoading}
        projectOrder={projectOrder}
        onSaveProjectOrder={onSaveProjectOrder}
        ticketOrders={ticketOrders}
        onSaveTicketOrder={onSaveTicketOrder}
      />
      <div style={{ paddingLeft: 20, marginTop: 10 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
          Notes
        </label>
        <textarea
          value={noteDraft}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Add notes for this week…"
          style={{
            fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1.5,
            width: "100%", minHeight: 60, padding: "8px 10px",
            border: "1px solid #e2e8f0", borderRadius: 8,
            background: "#fff", color: "#1e293b", outline: "none",
            resize: "vertical",
          }}
        />
      </div>
    </section>
  );
}

function WeeklyPlanningView({ people }: { people: Person[] }) {
  const [weekKey, setWeekKey] = useState<string>(() => formatWeekKey(getMondayOfWeek(new Date())));
  const [projectOrders, setProjectOrders] = useState<Record<string, Record<string, string[]>>>({});
  const [ticketOrders, setTicketOrders] = useState<Record<string, Record<string, Record<string, string[]>>>>({});
  const [personNotes, setPersonNotes] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"saving" | "saved" | "error" | "idle">("idle");

  // Linear issues for the selected week, grouped by normalized assignee name.
  const [weeklyIssues, setWeeklyIssues] = useState<Record<string, WeeklyLinearIssue[]>>({});
  const [weeklyIssuesLoading, setWeeklyIssuesLoading] = useState(false);

  useEffect(() => {
    fetchOverrides().then((ov) => {
      setProjectOrders(ov.projectOrders ?? {});
      setTicketOrders(ov.weeklyTicketOrders ?? {});
      setPersonNotes(ov.weeklyPersonNotes ?? {});
      setLoading(false);
    });
  }, []);

  // Refetch when another tab/component triggers a save
  useEffect(() => {
    const onSaved = () => {
      fetchOverrides().then((ov) => {
        setProjectOrders(ov.projectOrders ?? {});
        setTicketOrders(ov.weeklyTicketOrders ?? {});
        setPersonNotes(ov.weeklyPersonNotes ?? {});
      });
    };
    window.addEventListener("roadmap-saved", onSaved);
    return () => window.removeEventListener("roadmap-saved", onSaved);
  }, []);

  // Fetch Linear issues whose cycle covers the selected week (or whose
  // dueDate falls within Mon–Sun for teams without cycles). Grouped by
  // assignee using normalizeAssigneeName so they match roadmap people.
  useEffect(() => {
    let cancelled = false;
    // Identify the cycle for the selected week by cycle.startsAt being within
    // ±24h of the selected Monday. Linear stores cycle.startsAt in the team's
    // local timezone, so a tighter Mon→Sun UTC window still overlaps the
    // previous cycle. The ±24h window picks exactly one cycle per team — the
    // one that "starts on this Monday" regardless of timezone.
    const mondayUtc = new Date(`${weekKey}T00:00:00.000Z`);
    const windowStart = new Date(mondayUtc.getTime() - 24 * 3600 * 1000).toISOString();
    const windowEnd = new Date(mondayUtc.getTime() + 24 * 3600 * 1000).toISOString();
    // Mon–Sun dueDate range for teams that don't use cycles.
    const weekStartDate = weekKey;
    const weekEndDate = toIsoDate(new Date(new Date(`${weekKey}T00:00:00`).getTime() + 6 * 24 * 3600 * 1000));

    setWeeklyIssuesLoading(true);
    linearQuery<{
      issues: {
        nodes: {
          id: string;
          identifier: string;
          url: string;
          title: string;
          priority: number;
          state: { name: string; color: string; type: string };
          assignee: { displayName: string } | null;
          project: { id: string; name: string; color: string | null } | null;
        }[];
      };
    }>(
      `query WeeklyAssigneeIssues($windowStart: DateTimeOrDuration!, $windowEnd: DateTimeOrDuration!, $weekStart: TimelessDateOrDuration!, $weekEnd: TimelessDateOrDuration!) {
        issues(
          first: 100,
          filter: {
            or: [
              { cycle: { startsAt: { gte: $windowStart, lt: $windowEnd } } },
              { dueDate: { gte: $weekStart, lte: $weekEnd } }
            ]
          }
        ) {
          nodes {
            id identifier url title priority
            state { name color type }
            assignee { displayName }
            project { id name color }
          }
        }
      }`,
      { windowStart, windowEnd, weekStart: weekStartDate, weekEnd: weekEndDate },
    )
      .then((data) => {
        if (cancelled) return;
        const byPerson: Record<string, WeeklyLinearIssue[]> = {};
        for (const issue of data.issues.nodes) {
          // Skip completed/canceled — we only want open work for the week.
          if (issue.state.type === "completed" || issue.state.type === "canceled") continue;
          if (!issue.assignee) continue;
          const name = normalizeAssigneeName(issue.assignee.displayName);
          if (!name) continue;
          if (!byPerson[name]) byPerson[name] = [];
          byPerson[name].push({
            id: issue.id,
            identifier: issue.identifier,
            url: issue.url,
            title: issue.title,
            priority: issue.priority,
            state: issue.state,
            projectId: issue.project?.id ?? null,
            projectName: issue.project?.name ?? null,
            projectColor: issue.project?.color ?? null,
          });
        }
        setWeeklyIssues(byPerson);
      })
      .catch((err) => {
        if (!cancelled) console.error("Failed to fetch weekly issues:", err);
      })
      .finally(() => {
        if (!cancelled) setWeeklyIssuesLoading(false);
      });

    return () => { cancelled = true; };
  }, [weekKey]);

  const saveProjectOrder = (personName: string, order: string[]) => {
    setProjectOrders((prev) => {
      const copy = { ...prev };
      if (!copy[weekKey]) copy[weekKey] = {};
      else copy[weekKey] = { ...copy[weekKey] };
      copy[weekKey][personName] = order;
      return copy;
    });
    setSaveState("saving");
    saveOverride("saveProjectOrder", { weekKey, personName, order })
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  };

  const saveTicketOrderForProject = (personName: string, projectId: string, order: string[]) => {
    setTicketOrders((prev) => {
      const copy = { ...prev };
      if (!copy[weekKey]) copy[weekKey] = {};
      else copy[weekKey] = { ...copy[weekKey] };
      if (!copy[weekKey][personName]) copy[weekKey][personName] = {};
      else copy[weekKey][personName] = { ...copy[weekKey][personName] };
      copy[weekKey][personName][projectId] = order;
      return copy;
    });
    setSaveState("saving");
    saveOverride("saveWeeklyTicketOrder", { weekKey, personName, projectId, order })
      .then(() => setSaveState("saved"))
      .catch(() => setSaveState("error"));
  };

  const monday = parseWeekKey(weekKey);

  const handleDateChange = (value: string) => {
    if (!value) return;
    const picked = new Date(value + "T00:00:00");
    const mon = getMondayOfWeek(picked);
    setWeekKey(formatWeekKey(mon));
  };

  const shiftWeek = (deltaDays: number) => {
    const d = parseWeekKey(weekKey);
    d.setDate(d.getDate() + deltaDays);
    setWeekKey(formatWeekKey(getMondayOfWeek(d)));
  };

  const peopleByTeam = WEEKLY_PLANNING_TEAMS.map((teamName) => ({
    team: teamName,
    members: people.filter((p) => p.team === teamName),
  })).filter((g) => g.members.length > 0);

  const saveStateLabel = saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Save failed" : "";
  const saveStateColor = saveState === "error" ? "#dc2626" : saveState === "saving" ? "#94a3b8" : "#22c55e";

  return (
    <div style={{ fontFamily: "var(--font-sans)", height: "calc(100vh - 80px)", overflow: "auto", background: "#fafafa" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "32px 32px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>Weekly Planning</h1>
          {saveStateLabel && (
            <span style={{ fontSize: 12, color: saveStateColor, fontWeight: 500 }}>{saveStateLabel}</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "10px 12px", background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0" }}>
          <button
            onClick={() => shiftWeek(-7)}
            style={{ fontSize: 14, fontWeight: 600, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", color: "#475569" }}
          >‹</button>
          <input
            type="date"
            value={weekKey}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{ fontFamily: "var(--font-sans)", fontSize: 14, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, outline: "none" }}
          />
          <button
            onClick={() => shiftWeek(7)}
            style={{ fontSize: 14, fontWeight: 600, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", color: "#475569" }}
          >›</button>
          <button
            onClick={() => setWeekKey(formatWeekKey(getMondayOfWeek(new Date())))}
            style={{ fontSize: 12, fontWeight: 600, padding: "6px 10px", border: "1px solid #e2e8f0", borderRadius: 6, background: "white", cursor: "pointer", color: "#475569", marginLeft: 4 }}
          >This week</button>
          <span style={{ marginLeft: "auto", fontSize: 14, color: "#475569", fontWeight: 600 }}>
            Week of {formatWeekRange(monday)}
          </span>
        </div>

        {loading ? (
          <div style={{ color: "#94a3b8", padding: "40px 0", textAlign: "center" }}>Loading...</div>
        ) : (
          peopleByTeam.map((group) => (
            <div key={group.team} style={{ marginBottom: 36 }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {group.team}
              </h2>
              <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "20px 24px" }}>
                {group.members.map((person) => (
                  <PersonWeekSection
                    key={`${weekKey}-${person.name}`}
                    person={person}
                    weekKey={weekKey}
                    onSavedStateChange={(s) => setSaveState(s)}
                    autoIssues={weeklyIssues[person.name] ?? []}
                    autoIssuesLoading={weeklyIssuesLoading}
                    projectOrder={projectOrders[weekKey]?.[person.name] ?? []}
                    onSaveProjectOrder={saveProjectOrder}
                    ticketOrders={ticketOrders[weekKey]?.[person.name] ?? {}}
                    onSaveTicketOrder={saveTicketOrderForProject}
                    initialNote={personNotes[weekKey]?.[person.name] ?? ""}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const CYCLE_TEAMS = new Set(["Engineering", "Product"]);

// ── Cycle Issue Detail Panel ────────────────────────────────────────────

type WorkflowState = { id: string; name: string; color: string; position: number };
type TeamMember = { id: string; displayName: string; avatarUrl: string | null };

function SearchableProjectSelect({ projects, currentProjectId, currentProjectName, onSelect }: {
  projects: { id: string; name: string }[];
  currentProjectId: string | null;
  currentProjectName: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    requestAnimationFrame(() => document.addEventListener("mousedown", handler));
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => { setOpen(!open); setSearch(""); }}
        style={{
          fontFamily: "var(--font-sans)", fontSize: 13, padding: "6px 10px",
          borderRadius: 6, border: "1px solid #e2e8f0", background: "white", color: "#1e293b",
          width: "100%", textAlign: "left", cursor: "pointer",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}
      >
        <span>{currentProjectName ?? "No project"}</span>
        <span style={{ fontSize: 10, opacity: 0.5 }}>{open ? "\u25B2" : "\u25BC"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 200,
          background: "white", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden",
        }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              fontFamily: "var(--font-sans)", fontSize: 13, padding: "8px 10px",
              border: "none", borderBottom: "1px solid #e2e8f0", width: "100%", outline: "none",
            }}
          />
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            <div
              onClick={() => { onSelect(""); setOpen(false); }}
              style={{
                padding: "6px 10px", fontSize: 13, cursor: "pointer",
                fontWeight: !currentProjectId ? 700 : 400,
                background: !currentProjectId ? "#f1f5f9" : "transparent",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = !currentProjectId ? "#f1f5f9" : "transparent"; }}
            >
              No project
            </div>
            {filtered.map((p) => (
              <div
                key={p.id}
                onClick={() => { onSelect(p.id); setOpen(false); }}
                style={{
                  padding: "6px 10px", fontSize: 13, cursor: "pointer",
                  fontWeight: p.id === currentProjectId ? 700 : 400,
                  background: p.id === currentProjectId ? "#f1f5f9" : "transparent",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = p.id === currentProjectId ? "#f1f5f9" : "transparent"; }}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  const updateIssue = async (field: string, value: string): Promise<boolean> => {
    if (!issue) return false;
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
          // Handle project change locally
          if (field === "projectId" && value) {
            const proj = linearProjects.find((p) => p.id === value);
            if (proj) changes.project = { id: proj.id, name: proj.name };
          } else if (field === "projectId" && !value) {
            changes.project = null;
          }
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
      return !!json.success;
    } catch (err) {
      console.error("Update failed:", err);
      return false;
    } finally {
      setSaving(null);
    }
  };

  const fmtDate = (d: string) => parseDateLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
                    updateIssue("cycleId", val as string).then((ok) => {
                      if (ok && !val && onRemovedFromCycle) {
                        onRemovedFromCycle(issue.id);
                      }
                    });
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
                <SearchableProjectSelect
                  projects={linearProjects}
                  currentProjectId={(issue.project as { id?: string } | null)?.id ?? null}
                  currentProjectName={issue.project?.name ?? null}
                  onSelect={(id) => updateIssue("projectId", id)}
                />
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

  // Fetch issues when cycle changes. Cancelled on switch so a slow response
  // for the previous cycle can't display under (and get bucketed into) the
  // newly selected one.
  useEffect(() => {
    if (!selectedCycleId) return;
    setLoading(true);
    let cancelled = false;
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
        if (!cancelled) setIssues(data.cycle.issues.nodes);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[CYCLES] Fetch error:", err);
        setIssues([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
    // Cancellation matters: without it, a slow fetch for the PREVIOUS cycle
    // can resolve after switching and its buckets get persisted under the
    // newly selected cycle, corrupting that cycle's saved ordering.
    let cancelled = false;
    fetchOverrides().then((ov) => {
      if (cancelled) return;
      const saved = ov.cycleBuckets?.[selectedCycleId];
      if (saved) {
        setBuckets({ priority: saved.priority ?? [], secondary: saved.secondary ?? [], backlog: saved.backlog ?? [] });
      } else {
        setBuckets({ priority: [], secondary: [], backlog: [] });
      }
      setBucketsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
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
  const fmtDate = (d: string) => parseDateLocal(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

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
                    <div style={{ borderLeft: `1px solid ${hexToRgba(pColor, 0.2)}`, borderRight: `1px solid ${hexToRgba(pColor, 0.2)}`, borderBottom: `1px solid ${hexToRgba(pColor, 0.2)}`, borderTop: "none", borderRadius: "0 0 8px 8px", overflow: "visible", position: "relative" }}>
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

export function RoadmapView({ people, months, phases, teams, initialOverrides }: RoadmapViewProps) {
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"projects" | "subtestEdits" | "cycles" | "futureProjects" | "weeklyPlanning" | "normingCountdown" | "metrics">("projects");

  // Keep the active view in the URL hash so reloads stay on the same page and
  // links like #prenorming are shareable. The norming view writes its own
  // #norming / #prenorming hash (it owns the sub-view toggle).
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (h === "norming" || h === "prenorming") setViewMode("normingCountdown");
    else if (["projects", "subtestEdits", "cycles", "futureProjects", "weeklyPlanning", "metrics"].includes(h)) {
      setViewMode(h as "projects" | "subtestEdits" | "cycles" | "futureProjects" | "weeklyPlanning" | "metrics");
    }
  }, []);
  useEffect(() => {
    if (viewMode !== "normingCountdown") {
      window.history.replaceState(null, "", `#${viewMode}`);
    }
  }, [viewMode]);
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
  const [localPeople, setLocalPeople] = useState<Person[]>(() =>
    initialOverrides ? mergeOverridesIntoPeople(people, initialOverrides) : people,
  );
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [syncStatus, setSyncStatus] = useState<{
    state: "loading" | "synced" | "error";
    message: string;
    at: number;
  }>(() =>
    initialOverrides
      ? {
          state: "synced",
          message: `Loaded ${Object.keys(initialOverrides.positions ?? {}).length} positions`,
          at: 0,
        }
      : { state: "loading", message: "Loading saved state…", at: 0 },
  );

  // Stamp `at` with a real timestamp only after hydration — Date.now() at
  // render time would produce a different value on server vs client and break
  // the `title={new Date(syncStatus.at).toLocaleTimeString()}` hydration match.
  useEffect(() => {
    setSyncStatus((s) => (s.at === 0 ? { ...s, at: Date.now() } : s));
  }, []);

  // Undo stack
  type UndoAction = { type: "move"; projectId: string; personName: string; prevStart: number; prevDuration: number; newStart: number; newDuration: number }
    | { type: "delete"; personName: string; project: Project }
    | { type: "rename"; personName: string; projectId: string; prevName: string; newName: string }
    | { type: "add"; personName: string; projectId: string; projectName: string }
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
  const [dependencies, setDependencies] = useState<DependencyLink[]>(
    () => initialOverrides?.dependencies ?? [],
  );
  const [linkingState, setLinkingState] = useState<LinkingState | null>(null);

  // Mobile state
  const [mobilePersonFilter, setMobilePersonFilter] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didDragRef = useRef(false);
  // Defers bar onClick so onDoubleClick (rename) can cancel it.
  const clickTimeoutRef = useRef<number | null>(null);
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
      const order: ZoomLevel[] = ["quarter", "month", "biweekly", "week"];
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

  // Surface save failures from the module-level save queue as toasts.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string }>).detail;
      addToast("error", `Save failed: ${detail?.message ?? "unknown error"}`);
    };
    window.addEventListener("roadmap-save-failed", handler);
    return () => window.removeEventListener("roadmap-save-failed", handler);
  }, [addToast]);

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
          saveOverride("undeleteProject", { key: `${action.personName}:${action.project.name}` });
          break;
        case "rename":
          setLocalPeople((p) => p.map((person) => ({
            ...person,
            projects: person.projects.map((proj) =>
              proj.id === action.projectId ? { ...proj, name: action.prevName } : proj
            ),
          })));
          // The rename map is keyed by the CURRENT name; renaming back to
          // prevName makes the server collapse the chain.
          saveOverride("renameProject", { key: `${action.personName}:${action.newName}`, newName: action.prevName });
          break;
        case "add":
          setLocalPeople((p) => p.map((person) => ({
            ...person,
            projects: person.projects.filter((proj) => proj.id !== action.projectId),
          })));
          saveOverride("removeAddition", { personName: action.personName, name: action.projectName });
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

  // ── Apply overrides to seed data (pure function of blob state) ────────
  const applyOverridesToSeed = useCallback(
    (ov: RoadmapOverrides) => {
      setLocalPeople(mergeOverridesIntoPeople(people, ov));
      if (ov.dependencies) setDependencies(ov.dependencies);
    },
    [people],
  );

  const refreshFromBlob = useCallback(async () => {
    try {
      const ov = await fetchOverrides();
      if (!ov) {
        setSyncStatus({ state: "error", message: "Empty response", at: Date.now() });
        return;
      }
      applyOverridesToSeed(ov);
      const posCount = Object.keys(ov.positions ?? {}).length;
      const addCount = Object.values(ov.additions ?? {}).reduce(
        (n, a) => n + a.length,
        0,
      );
      setSyncStatus({
        state: "synced",
        message: `Loaded ${posCount} positions, ${addCount} additions`,
        at: Date.now(),
      });
    } catch (err) {
      setSyncStatus({
        state: "error",
        message: err instanceof Error ? err.message : "Unknown",
        at: Date.now(),
      });
    }
  }, [applyOverridesToSeed]);

  // Initial load only, and only when SSR didn't already hydrate us with the
  // latest blob state (via initialOverrides). We trust the optimistic update
  // after each save — refetching afterward risks reading a stale edge-cached
  // blob that reverts the UI.
  useEffect(() => {
    if (initialOverrides) return;
    refreshFromBlob();
  }, [refreshFromBlob, initialOverrides]);

  // ── Fetch cycles on mount ──────────────────────────────────────────────
  useEffect(() => {
    setCyclesLoading(true);
    // Filter to the Marker Method team only — pulling all teams' cycles makes
    // "this week / next week" ambiguous when other teams (e.g. Psychometrics)
    // have their own cycles overlapping the same date range.
    linearQuery<{ cycles: { nodes: LinearCycle[] } }>(
      `query { cycles(filter: { team: { key: { eq: "MAR2" } } }, first: 50, orderBy: createdAt) { nodes { id number startsAt endsAt } } }`,
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

      // Horizontal: drag freely, then snap target date to nearest Monday.
      // Gives week-level placement at any zoom (mid-month starts, etc.).
      const colDelta = dx / colWidth;
      const originalColPos = monthIndexToColPos(ds.originalStartMonth, zoom, columns);
      const targetColPos = originalColPos + colDelta;

      const colPosToDate = (cp: number): Date => {
        const colIdx = Math.max(0, Math.min(columns.length - 1, Math.floor(cp)));
        const frac = cp - colIdx;
        const colStart = columns[colIdx]?.date ?? TIMELINE_START;
        const colEnd = colIdx + 1 < columns.length ? columns[colIdx + 1].date : TIMELINE_END;
        return new Date(colStart.getTime() + frac * (colEnd.getTime() - colStart.getTime()));
      };
      const MS_PER_DAY = 86400000;
      const snapToMonday = (d: Date): Date => {
        // JS: Sun=0, Mon=1, …, Sat=6. Distance to previous Mon, then pick nearer.
        const dayOfWeek = d.getDay();
        const daysSinceMon = (dayOfWeek + 6) % 7; // 0..6 where 0 = Mon
        const prevMon = new Date(d.getTime() - daysSinceMon * MS_PER_DAY);
        prevMon.setHours(0, 0, 0, 0);
        const nextMon = new Date(prevMon.getTime() + 7 * MS_PER_DAY);
        return Math.abs(d.getTime() - prevMon.getTime()) <=
          Math.abs(d.getTime() - nextMon.getTime())
          ? prevMon
          : nextMon;
      };
      const dateToFracMonth = (d: Date): number =>
        (d.getFullYear() - 2026) * 12 + d.getMonth() - 2 + (d.getDate() - 1) / 30.44;

      if (ds.mode === "move") {
        const snappedStart = snapToMonday(colPosToDate(targetColPos));
        const newStart = Math.max(0, dateToFracMonth(snappedStart));
        if (Math.abs(newStart - ds.currentStartMonth) > 0.01) {
          ds.currentStartMonth = newStart;
          changed = true;
        }
      } else {
        const originalEndColPos = monthIndexToColPos(ds.originalStartMonth + ds.originalDuration, zoom, columns);
        const targetEndColPos = originalEndColPos + colDelta;
        const snappedEnd = snapToMonday(colPosToDate(targetEndColPos));
        const newEnd = dateToFracMonth(snappedEnd);
        // Minimum duration: one week
        const minDuration = 7 / 30.44;
        const newDuration = Math.max(minDuration, newEnd - ds.originalStartMonth);
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
      // Persist the move: hide it on the old owner, add it to the new one.
      const movedProj = localPeople
        .find((p) => p.name === ds.originalPersonName)
        ?.projects.find((p) => p.id === ds.projectId);
      if (movedProj) {
        saveOverride("deleteProject", {
          key: `${ds.originalPersonName}:${movedProj.name}`,
        }).catch(() => {});
        saveOverride("addProject", {
          personName: ds.personName,
          project: {
            name: movedProj.name,
            startMonth: ds.currentStartMonth,
            duration: ds.currentDuration,
            linearProjectName: movedProj.linearProjectName ?? null,
          },
        }).catch(() => {});
      }
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

    // If this was a Linear-linked bar and dates changed, update in Linear.
    // monthIndexToDate handles fractional (mid-month) positions; JS Date's
    // month arg truncates them, which used to snap synced dates to the 1st.
    if (ds.linearIssueId && changed) {
      const endIso = monthIndexToDate(ds.currentStartMonth + ds.currentDuration);

      linearUpdateDates(ds.linearIssueId, endIso)
        .then(() => addToast("success", "Due date updated in Linear"))
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

    // Project bars: push the new dates to the linked Linear project
    if (!ds.linearIssueId && changed) {
      let linkedName: string | null = null;
      for (const person of localPeople) {
        const proj = person.projects.find((p) => p.id === ds.projectId);
        if (proj) { linkedName = proj.linearProjectName ?? null; break; }
      }
      if (linkedName) {
        syncLinearProjectDates(
          linkedName,
          monthIndexToDate(ds.currentStartMonth),
          monthIndexToDate(ds.currentStartMonth + ds.currentDuration),
        )
          .then(() => addToast("success", "Updated in Linear"))
          .catch((err) =>
            addToast("error", `Linear date sync failed: ${err.message}`),
          );
      }
    }

    dragRef.current = null;
    setDragState(null);
  }, [addToast, pushUndo, localPeople]);

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
      // Same id format mergeOverridesIntoPeople derives on reload, so
      // id-keyed overrides (notes, positions, links) survive the session.
      const projectId = `proj-added-${data.owner}-${data.name}`;

      // Only create in Linear for Engineering, Product teams
      const LINEAR_TEAMS = new Set(["Engineering", "Product"]);
      const ownerPerson = localPeople.find((p) => p.name === data.owner);
      const shouldCreateInLinear = ownerPerson && LINEAR_TEAMS.has(ownerPerson.team);
      // Only set once Linear confirms the create — a bar must not claim a
      // link to a Linear project that failed to come into existence.
      let linearName: string | null = null;
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
        project: { name: data.name, startMonth, duration, linearProjectName: linearName ?? null },
      }).catch((err) => console.error("Failed to save addition:", err));

      if (data.notes.trim()) {
        saveOverride("saveDescription", {
          key: `${data.owner}:${projectId}`,
          description: data.notes.trim(),
        }).catch(() => {});
      }

      setAddingForPerson(null);
      if (linearName) {
        addToast("success", `Added "${data.name}" (created in Linear)`);
      } else if (shouldCreateInLinear) {
        addToast("error", `Added "${data.name}" locally, but creating it in Linear failed`);
      } else {
        addToast("success", `Added "${data.name}"`);
      }
    },
    [addToast, localPeople],
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

      // Check if any OTHER person still points at the same project — by
      // display name, or by Linear link when the deleted bar is linked.
      const linkName = deletedProject?.linearProjectName ?? null;
      const otherOwners = localPeople.filter(
        (p) =>
          p.name !== personName &&
          p.projects.some(
            (proj) =>
              proj.name === projectName ||
              (linkName !== null && proj.linearProjectName === linkName),
          ),
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

      // If no other owners remain AND the bar is explicitly linked, delete
      // the Linear project too. Unlinked bars never touch Linear — a name
      // coincidence must not delete someone else's Linear project.
      if (otherOwners.length === 0 && linkName) {
        linearQuery<{ projects: { nodes: { id: string }[] } }>(
          `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id } } }`,
          { name: linkName },
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
    [addToast, pushUndo, localPeople],
  );

  // ── Rename project handler ────────────────────────────────────────────
  const handleRenameProject = useCallback(
    (personName: string, projectId: string, oldName: string, newName: string) => {
      if (!newName.trim() || newName === oldName) {
        setRenamingProjectId(null);
        return;
      }

      const proj = localPeople
        .find((p) => p.name === personName)
        ?.projects.find((p) => p.id === projectId);
      const linkedLinearName = proj?.linearProjectName ?? null;

      // A project can sit on several people's rows (matched by name). Rename
      // every copy so owners don't diverge and their Linear links stay valid.
      const owners: { personName: string; projectId: string; linked: boolean }[] = [];
      for (const person of localPeople) {
        for (const p of person.projects) {
          if (p.name === oldName) {
            owners.push({
              personName: person.name,
              projectId: p.id,
              linked: !!p.linearProjectName && p.linearProjectName === linkedLinearName,
            });
          }
        }
      }

      setLocalPeople((prev) =>
        prev.map((person) => ({
          ...person,
          projects: person.projects.map((p) =>
            p.name === oldName ? { ...p, name: newName } : p,
          ),
        })),
      );

      for (const o of owners) {
        saveOverride("renameProject", {
          key: `${o.personName}:${oldName}`,
          newName,
        }).catch((err) => console.error("Failed to save rename:", err));
      }

      // Rename the Linear project too — only for explicitly linked bars, so a
      // name coincidence can't rename an unrelated Linear project.
      if (!linkedLinearName) {
        setRenamingProjectId(null);
        addToast("success", `Renamed to "${newName}"`);
        return;
      }
      linearQuery<{ projects: { nodes: { id: string }[] } }>(
        `query FindProject($name: String!) { projects(filter: { name: { eq: $name } }) { nodes { id } } }`,
        { name: linkedLinearName },
      )
        .then(async (data) => {
          const linearProjectId = data.projects.nodes[0]?.id;
          if (!linearProjectId) return;
          await linearQuery(
            `mutation RenameProject($id: String!, $input: ProjectUpdateInput!) { projectUpdate(id: $id, input: $input) { success } }`,
            { id: linearProjectId, input: { name: newName } },
          );
          // Links are by name — repoint every owner's link at the renamed project.
          if (linkedLinearName) {
            setLocalPeople((prev) =>
              prev.map((person) => ({
                ...person,
                projects: person.projects.map((p) =>
                  p.linearProjectName === linkedLinearName
                    ? { ...p, linearProjectName: newName }
                    : p,
                ),
              })),
            );
            for (const o of owners) {
              if (!o.linked) continue;
              saveOverride("linkLinearProject", {
                key: `${o.personName}:${o.projectId}`,
                linearProjectName: newName,
              }).catch(() => {});
            }
          }
        })
        .catch((err) => console.error("Failed to rename Linear project:", err));

      setRenamingProjectId(null);
      addToast("success", `Renamed to "${newName}"`);
    },
    [addToast, localPeople],
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
      // Persist the move: hide it on the old owner, add it to the new one.
      const movedProj = localPeople
        .find((p) => p.name === fromPerson)
        ?.projects.find((p) => p.id === projectId);
      if (movedProj) {
        saveOverride("deleteProject", {
          key: `${fromPerson}:${movedProj.name}`,
        }).catch(() => {});
        saveOverride("addProject", {
          personName: toPerson,
          project: {
            name: movedProj.name,
            startMonth: movedProj.startMonth,
            duration: movedProj.duration,
            linearProjectName: movedProj.linearProjectName ?? null,
          },
        }).catch(() => {});
      }
      addToast("success", `Moved to ${toPerson}`);
      // Close the panel since the person context has changed
      setSelected(null);
      setSelectedLinearProject(null);
    },
    [addToast, localPeople],
  );

  // ── Update dates handler (from edit panel) ────────────────────────────
  const handleUpdateDates = useCallback(
    (projectId: string, pName: string, startMonth: number, duration: number) => {
      const proj = localPeople
        .find((p) => p.name === pName)
        ?.projects.find((p) => p.id === projectId);
      const projName = proj?.name ?? null;

      // Same-name copies on other people are the same project — keep them in
      // step, matching the drag path's sibling sync.
      setLocalPeople((prev) =>
        prev.map((person) => ({
          ...person,
          projects: person.projects.map((p) => {
            if (p.id === projectId || (projName !== null && p.name === projName)) {
              return { ...p, startMonth, duration };
            }
            return p;
          }),
        })),
      );

      saveOverride("updatePosition", {
        key: `${pName}:${projectId}`,
        startMonth,
        duration,
      }).catch((err) => console.error("Failed to save position override:", err));
      if (projName !== null) {
        for (const person of localPeople) {
          if (person.name === pName) continue;
          for (const p of person.projects) {
            if (p.name === projName) {
              saveOverride("updatePosition", {
                key: `${person.name}:${p.id}`,
                startMonth,
                duration,
              }).catch(() => {});
            }
          }
        }
      }

      // Push the new dates to the linked Linear project
      if (proj?.linearProjectName) {
        syncLinearProjectDates(
          proj.linearProjectName,
          monthIndexToDate(startMonth),
          monthIndexToDate(startMonth + duration),
        )
          .then(() => addToast("success", "Dates updated in Linear"))
          .catch((err) =>
            addToast("error", `Linear date sync failed: ${err.message}`),
          );
      }

      addToast("success", "Dates updated");
    },
    [addToast, localPeople],
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
      {/* Sync status indicator */}
      <div
        style={{
          position: "fixed",
          bottom: 8,
          right: 12,
          zIndex: 200,
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 999,
          background:
            syncStatus.state === "error"
              ? "#fee2e2"
              : syncStatus.state === "synced"
                ? "#dcfce7"
                : "#f1f5f9",
          color:
            syncStatus.state === "error"
              ? "#991b1b"
              : syncStatus.state === "synced"
                ? "#166534"
                : "#64748b",
          border: "1px solid rgba(0,0,0,0.05)",
        }}
        title={new Date(syncStatus.at).toLocaleTimeString()}
      >
        {syncStatus.state === "loading" && "⏳ "}
        {syncStatus.state === "synced" && "✓ "}
        {syncStatus.state === "error" && "⚠ "}
        {syncStatus.message}
      </div>
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
      ) : viewMode === "weeklyPlanning" ? (
        <WeeklyPlanningView people={localPeople} />
      ) : viewMode === "normingCountdown" ? (
        <NormingCountdownView />
      ) : viewMode === "metrics" ? (
        <MetricsView />
      ) : viewMode === "futureProjects" ? (
        <FutureProjectsView
          people={localPeople}
          phases={phases}
          onAssignToRoadmap={(proj, owner, startDate, endDate) => {
            const startMonth = dateToMonthIndex(startDate);
            const endMonth = dateToMonthIndex(endDate);
            const duration = Math.max(1, endMonth - startMonth);
            const newId = `proj-added-${owner}-${proj.name}`;
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== owner) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth, duration, tasks: [], linearProjectName: proj.name }] };
            }));
            saveOverride("addProject", { personName: owner, project: { name: proj.name, startMonth, duration, linearProjectName: proj.name } });
            addToast("success", `Assigned "${proj.name}" to ${owner}`);
          }}
        />
      ) : viewMode === "projects" ? (
        <ProductRoadmapView
          people={teamAndPersonFiltered}
          phases={phases}
          cycles={cycles}
          onProjectClick={(project, person) => {
            if (project.linearProjectName) {
              setSelectedLinearProject({
                project,
                personName: person.name,
                personColor: person.color,
                linearProjectName: project.linearProjectName,
              });
            } else {
              setSelected({ project, personName: person.name, personColor: person.color });
            }
          }}
          onIssueClick={setSelectedLinearIssueId}
          onMoveProject={(personName, projectId, newStart, newDuration, prevStart, prevDuration) => {
            setLocalPeople((prev) =>
              prev.map((p) =>
                p.name !== personName
                  ? p
                  : {
                      ...p,
                      projects: p.projects.map((pr) =>
                        pr.id !== projectId
                          ? pr
                          : { ...pr, startMonth: newStart, duration: newDuration },
                      ),
                    },
              ),
            );
            saveOverride("updatePosition", {
              key: `${personName}:${projectId}`,
              startMonth: newStart,
              duration: newDuration,
            });
            pushUndo({
              type: "move",
              projectId,
              personName,
              prevStart,
              prevDuration,
              newStart,
              newDuration,
            });
          }}
        />
      ) : (
      <div className="roadmap-container" ref={scrollRef} style={{ display: "none" }}>
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
                              if (didDragRef.current) return;
                              // Defer so dblclick (rename) can cancel.
                              if (clickTimeoutRef.current) {
                                window.clearTimeout(clickTimeoutRef.current);
                              }
                              clickTimeoutRef.current = window.setTimeout(() => {
                                clickTimeoutRef.current = null;
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
                              }, 220);
                            }}
                            onMouseEnter={() => setHoveredProject(project.id)}
                            onMouseLeave={() => setHoveredProject(null)}
                            onMouseDown={(e) => handleBarMouseDown(e, project, entry.person.name, "move", undefined, lane)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              if (clickTimeoutRef.current) {
                                window.clearTimeout(clickTimeoutRef.current);
                                clickTimeoutRef.current = null;
                              }
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
                          {isHovered && !isRenaming && !isDragging && (
                            <div
                              className="project-bar-tooltip"
                              style={{
                                position: "absolute",
                                left: x + w / 2,
                                top: y - 8,
                                transform: "translate(-50%, -100%)",
                                background: "#1e293b",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 600,
                                padding: "5px 9px",
                                borderRadius: 6,
                                whiteSpace: "nowrap",
                                pointerEvents: "none",
                                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.18)",
                                zIndex: 20,
                              }}
                            >
                              {project.name}
                            </div>
                          )}
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
          project={
            localPeople
              .find((p) => p.name === selected.personName)
              ?.projects.find((p) => p.id === selected.project.id) ?? selected.project
          }
          personName={selected.personName}
          personColor={selected.personColor}
          onClose={() => setSelected(null)}
          onDelete={handleDeleteProject}
          people={localPeople}
          onChangeOwner={handleChangeOwner}
          onUpdateDates={handleUpdateDates}
          onAddProjectToPerson={(pName, proj) => {
            const newId = `proj-added-${pName}-${proj.name}`;
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== pName) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth: proj.startMonth, duration: proj.duration, tasks: [], linearProjectName: proj.linearProjectName }] };
            }));
            saveOverride("addProject", { personName: pName, project: { name: proj.name, startMonth: proj.startMonth, duration: proj.duration, linearProjectName: proj.linearProjectName } });
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
          onRename={handleRenameProject}
          onLinkLinearProject={(pName, projId, linearName) => {
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== pName) return p;
              return {
                ...p,
                projects: p.projects.map((pr) =>
                  pr.id !== projId ? pr : { ...pr, linearProjectName: linearName },
                ),
              };
            }));
          }}
        />
      )}

      {/* Detail panel - Linear project issues */}
      {selectedLinearProject && (
        <LinearProjectDetailPanel
          project={
            localPeople
              .find((p) => p.name === selectedLinearProject.personName)
              ?.projects.find((p) => p.id === selectedLinearProject.project.id) ??
            selectedLinearProject.project
          }
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
            const newId = `proj-added-${pName}-${proj.name}`;
            setLocalPeople((prev) => prev.map((p) => {
              if (p.name !== pName) return p;
              return { ...p, projects: [...p.projects, { id: newId, name: proj.name, startMonth: proj.startMonth, duration: proj.duration, tasks: [], linearProjectName: proj.linearProjectName }] };
            }));
            saveOverride("addProject", { personName: pName, project: { name: proj.name, startMonth: proj.startMonth, duration: proj.duration, linearProjectName: proj.linearProjectName } });
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
          onRename={handleRenameProject}
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
