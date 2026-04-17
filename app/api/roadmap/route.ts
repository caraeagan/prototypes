import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const OVERRIDES_PATH = join(process.cwd(), "data", "overrides.json");

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
  deletions?: string[]; // "personName:projectName" keys
  renames?: Record<string, string>; // "personName:oldName" -> newName
  dependencies?: { from: string; to: string }[]; // projectId pairs
  cycleBuckets?: Record<string, CycleBuckets>; // cycleId -> buckets
  descriptions?: Record<string, string>; // "personName:projectId" -> description text
  futureProjects?: { name: string; description: string; linearProjectId?: string; linearProjectUrl?: string }[];
};

// Simple mutex to prevent concurrent read-modify-write races
let writeLock: Promise<void> = Promise.resolve();

async function readOverrides(): Promise<RoadmapOverrides> {
  try {
    const data = await readFile(OVERRIDES_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeOverrides(overrides: RoadmapOverrides): Promise<void> {
  const dir = join(process.cwd(), "data");
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // directory exists
  }
  await writeFile(OVERRIDES_PATH, JSON.stringify(overrides, null, 2), "utf-8");
}

export async function GET() {
  try {
    const overrides = await readOverrides();
    return NextResponse.json(overrides);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read overrides:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Serialize all writes through a lock to prevent race conditions
  let resolve: () => void;
  const prevLock = writeLock;
  writeLock = new Promise<void>((r) => { resolve = r; });
  await prevLock;

  try {
    const body = await request.json();
    const { action, ...payload } = body;

    const overrides = await readOverrides();

    switch (action) {
      case "updatePosition": {
        const { key, startMonth, duration, order } = payload;
        if (!overrides.positions) overrides.positions = {};
        overrides.positions[key] = { startMonth, duration, ...(order !== undefined ? { order } : {}) };
        break;
      }
      case "addProject": {
        const { personName, project } = payload;
        if (!overrides.additions) overrides.additions = {};
        if (!overrides.additions[personName])
          overrides.additions[personName] = [];
        overrides.additions[personName].push(project);
        break;
      }
      case "deleteProject": {
        const { key } = payload;
        if (!overrides.deletions) overrides.deletions = [];
        if (!overrides.deletions.includes(key)) {
          overrides.deletions.push(key);
        }
        // Also remove any position overrides for this key
        if (overrides.positions && overrides.positions[key]) {
          delete overrides.positions[key];
        }
        break;
      }
      case "renameProject": {
        const { key, newName } = payload;
        if (!overrides.renames) overrides.renames = {};
        overrides.renames[key] = newName;
        break;
      }
      case "addDependency": {
        const { from, to } = payload;
        if (!overrides.dependencies) overrides.dependencies = [];
        const exists = overrides.dependencies.some(
          (d) => d.from === from && d.to === to,
        );
        if (!exists) {
          overrides.dependencies.push({ from, to });
        }
        break;
      }
      case "removeDependency": {
        const { from, to } = payload;
        if (overrides.dependencies) {
          overrides.dependencies = overrides.dependencies.filter(
            (d) => !(d.from === from && d.to === to),
          );
        }
        break;
      }
      case "saveCycleBuckets": {
        const { cycleId, buckets } = payload;
        if (!overrides.cycleBuckets) overrides.cycleBuckets = {};
        overrides.cycleBuckets[cycleId] = buckets;
        break;
      }
      case "addFutureProject": {
        const { project } = payload;
        if (!overrides.futureProjects) overrides.futureProjects = [];
        overrides.futureProjects.push(project);
        break;
      }
      case "removeFutureProject": {
        const { index } = payload;
        if (overrides.futureProjects) {
          overrides.futureProjects.splice(index, 1);
        }
        break;
      }
      case "updateFutureProject": {
        const { index, project } = payload;
        if (overrides.futureProjects && overrides.futureProjects[index]) {
          overrides.futureProjects[index] = { ...overrides.futureProjects[index], ...project };
        }
        break;
      }
      case "saveDescription": {
        const { key, description } = payload;
        if (!overrides.descriptions) overrides.descriptions = {};
        if (description) {
          overrides.descriptions[key] = description;
        } else {
          delete overrides.descriptions[key];
        }
        break;
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    await writeOverrides(overrides);
    resolve!();
    return NextResponse.json({ success: true, overrides });
  } catch (error) {
    resolve!();
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to save override:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
