import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const OVERRIDES_PATH = join(process.cwd(), "data", "overrides.json");

export type RoadmapOverrides = {
  positions?: Record<string, { startMonth: number; duration: number }>;
  additions?: Record<
    string,
    { name: string; startMonth: number; duration: number }[]
  >;
  deletions?: string[]; // "personName:projectName" keys
  renames?: Record<string, string>; // "personName:oldName" -> newName
  dependencies?: { from: string; to: string }[]; // projectId pairs
};

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
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    const overrides = await readOverrides();

    switch (action) {
      case "updatePosition": {
        const { key, startMonth, duration } = payload;
        if (!overrides.positions) overrides.positions = {};
        overrides.positions[key] = { startMonth, duration };
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
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }

    await writeOverrides(overrides);
    return NextResponse.json({ success: true, overrides });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to save override:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
