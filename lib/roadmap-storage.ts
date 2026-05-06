import { get, put } from "@vercel/blob";

const BLOB_PATHNAME = "roadmap/overrides.json";
const TRANSIENT_RETRY_DELAYS_MS = [100, 250, 600];

export type CycleBuckets = {
  priority: string[];
  secondary: string[];
  backlog: string[];
};

export type RoadmapOverrides = {
  positions?: Record<string, { startMonth: number; duration: number; order?: number }>;
  additions?: Record<
    string,
    { name: string; startMonth: number; duration: number }[]
  >;
  deletions?: string[];
  renames?: Record<string, string>;
  dependencies?: { from: string; to: string }[];
  cycleBuckets?: Record<string, CycleBuckets>;
  descriptions?: Record<string, string>;
  futureProjects?: { name: string; description: string; linearProjectId?: string; linearProjectUrl?: string }[];
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
    if (!result || result.statusCode !== 200) return {};
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
