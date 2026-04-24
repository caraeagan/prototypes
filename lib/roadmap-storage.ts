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
