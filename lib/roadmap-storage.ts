import { get, put } from "@vercel/blob";

const BLOB_PATHNAME = "roadmap/overrides.json";
const TRANSIENT_RETRY_DELAYS_MS = [100, 250, 600];

export type CycleBuckets = {
  priority: string[];
  secondary: string[];
  backlog: string[];
};

export type NormingChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type ProjectResource = {
  id: string;
  label: string;
  url: string;
};

export type RoadmapOverrides = {
  positions?: Record<string, { startMonth: number; duration: number; order?: number }>;
  additions?: Record<
    string,
    { name: string; startMonth: number; duration: number; linearProjectName?: string | null }[]
  >;
  deletions?: string[];
  renames?: Record<string, string>;
  dependencies?: { from: string; to: string }[];
  cycleBuckets?: Record<string, CycleBuckets>;
  descriptions?: Record<string, string>;
  // resources[`${personName}:${projectId}`] = ordered list of linked documents
  // (label + URL) shown in the project detail slideout.
  resources?: Record<string, ProjectResource[]>;
  // linearLinks[`${personName}:${projectId}`] = Linear project name. Lets users
  // attach a Linear project to a roadmap project that was seeded without one.
  linearLinks?: Record<string, string>;
  futureProjects?: { name: string; description: string; linearProjectId?: string; linearProjectUrl?: string; startDate?: string; targetDate?: string }[];
  // weekNotes[weekKey] = top-of-week intro/context for that planning week.
  weekNotes?: Record<string, string>;
  // weekSignoffs[weekKey][personName] = signoff record (presence = signed).
  weekSignoffs?: Record<string, Record<string, { at: string }>>;
  // weeklyPlans[weekKey][personName] = bullet list. weekKey is the ISO date (YYYY-MM-DD) of that week's Monday.
  weeklyPlans?: Record<
    string,
    Record<
      string,
      {
        id: string;
        text: string;
        linearIssue?: { id: string; identifier: string; url: string; title: string };
      }[]
    >
  >;
  // ticketOrders[weekKey][personName] = ordered Linear issue IDs for that
  // person's bullet column in the given week. Unknown IDs fall back to API
  // order (appended at the end).
  ticketOrders?: Record<string, Record<string, string[]>>;
  // projectOrders[weekKey][personName] = ordered Linear project IDs for the
  // auto-grouped weekly view. Projects not in this list render after the
  // ordered ones, sorted alphabetically.
  projectOrders?: Record<string, Record<string, string[]>>;
  // weeklyPersonNotes[weekKey][personName] = free-form notes the person added
  // under their auto-grouped tickets for that week.
  weeklyPersonNotes?: Record<string, Record<string, string>>;
  // weeklyTicketOrders[weekKey][personName][projectId] = ordered Linear issue
  // IDs for the auto-grouped weekly view. Tickets not in this list render
  // after the ordered ones, sorted by Linear priority.
  weeklyTicketOrders?: Record<string, Record<string, Record<string, string[]>>>;
  // normingChecklist[teamName] = ordered checklist items for that team's
  // run-up to the Sept 1 norming deadline.
  normingChecklist?: Record<string, NormingChecklistItem[]>;
  // prenormQa[testName] = true when full QA is manually checked off in the
  // pre-norming Form Updates readiness table.
  prenormQa?: Record<string, boolean>;
  // prenormNotes[testName] = free-form note shown in the readiness table.
  prenormNotes?: Record<string, string>;
  // audioAudit[testName] = manually-updated status for the audio content
  // update effort. Seeded in code from the audit sheet; only edits are stored.
  audioAudit?: Record<string, string>;
  // keyDates = user-managed milestone list on the pre-norming countdown, each
  // with a red/yellow/green confidence status. Stored whole (even empty) so
  // deleting the code-seeded defaults sticks.
  keyDates?: { id: string; text: string; date: string; status: "red" | "yellow" | "green" }[];
  // Same list for the norming (Sep 28) countdown, stored separately.
  normingKeyDates?: { id: string; text: string; date: string; status: "red" | "yellow" | "green" }[];
  // Norming phase strip: which phase is current, plus manual unblocker
  // statuses (ticket-backed unblockers derive status live and aren't stored).
  normingPhases?: { current?: string; statuses?: Record<string, "red" | "yellow" | "green"> };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= TRANSIENT_RETRY_DELAYS_MS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < TRANSIENT_RETRY_DELAYS_MS.length) {
        await sleep(TRANSIENT_RETRY_DELAYS_MS[attempt]);
      }
    }
  }
  throw lastError;
}

export async function readOverrides(): Promise<RoadmapOverrides> {
  return withTransientRetry(async () => {
    const result = await get(BLOB_PATHNAME, { access: "private", useCache: false });
    // Only a definitive "blob does not exist" (null result) may be treated as
    // empty. Any other non-200 must THROW: mutateOverrides does
    // read-modify-write, and treating a failed read as {} would rewrite the
    // store with one entry, destroying everyone's saved data.
    if (!result) return {};
    if (result.statusCode !== 200) {
      throw new Error(`Blob read failed: ${result.statusCode}`);
    }
    const text = await new Response(result.stream).text();
    return JSON.parse(text) as RoadmapOverrides;
  });
}

export async function writeOverrides(overrides: RoadmapOverrides): Promise<void> {
  await withTransientRetry(async () => {
    await put(BLOB_PATHNAME, JSON.stringify(overrides, null, 2), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  });
}

// Serializes read-modify-write within a single function instance.
// Cross-instance races are possible but rare for small-team usage —
// last writer wins, matching pre-migration filesystem semantics.
let writeLock: Promise<void> = Promise.resolve();

export async function mutateOverrides(
  mutate: (overrides: RoadmapOverrides) => void,
): Promise<RoadmapOverrides> {
  let release!: () => void;
  const prevLock = writeLock;
  writeLock = new Promise<void>((r) => {
    release = r;
  });
  await prevLock;

  try {
    const overrides = await readOverrides();
    mutate(overrides);
    await writeOverrides(overrides);
    return overrides;
  } finally {
    release();
  }
}
