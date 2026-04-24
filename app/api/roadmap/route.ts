import { NextRequest, NextResponse } from "next/server";
import {
  readOverrides,
  mutateOverrides,
  type CycleBuckets,
  type RoadmapOverrides,
} from "~/lib/roadmap-storage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type { CycleBuckets, RoadmapOverrides };

export async function GET() {
  try {
    const overrides = await readOverrides();
    return NextResponse.json(overrides, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read overrides:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    const knownActions = new Set([
      "updatePosition",
      "addProject",
      "deleteProject",
      "renameProject",
      "addDependency",
      "removeDependency",
      "saveCycleBuckets",
      "addFutureProject",
      "removeFutureProject",
      "updateFutureProject",
      "saveDescription",
    ]);
    if (!knownActions.has(action)) {
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 },
      );
    }

    const overrides = await mutateOverrides((overrides) => {
      switch (action) {
        case "updatePosition": {
          const { key, startMonth, duration, order } = payload;
          if (!overrides.positions) overrides.positions = {};
          overrides.positions[key] = {
            startMonth,
            duration,
            ...(order !== undefined ? { order } : {}),
          };
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
          // If this project has been renamed, the incoming key uses the current
          // (renamed) name. Deletions are matched on the seed name at load time,
          // so resolve back to the seed name here.
          let resolvedKey = key;
          if (overrides.renames) {
            const colonIdx = key.indexOf(":");
            const personName = colonIdx >= 0 ? key.slice(0, colonIdx) : "";
            const currentName = colonIdx >= 0 ? key.slice(colonIdx + 1) : key;
            const seedEntry = Object.entries(overrides.renames).find(
              ([k, v]) => k.startsWith(`${personName}:`) && v === currentName,
            );
            if (seedEntry) resolvedKey = seedEntry[0];
          }
          if (!overrides.deletions.includes(resolvedKey)) {
            overrides.deletions.push(resolvedKey);
          }
          if (overrides.positions && overrides.positions[resolvedKey]) {
            delete overrides.positions[resolvedKey];
          }
          if (overrides.positions && overrides.positions[key]) {
            delete overrides.positions[key];
          }
          break;
        }
        case "renameProject": {
          const { key, newName } = payload;
          if (!overrides.renames) overrides.renames = {};
          // If the oldName in this key is already the value of an existing rename,
          // update that entry in place — otherwise chained renames accumulate and
          // the load logic (which looks up by seed name) can't follow them.
          const colonIdx = key.indexOf(":");
          const personName = colonIdx >= 0 ? key.slice(0, colonIdx) : "";
          const oldName = colonIdx >= 0 ? key.slice(colonIdx + 1) : key;
          const existingKey = Object.keys(overrides.renames).find(
            (k) =>
              k.startsWith(`${personName}:`) &&
              overrides.renames![k] === oldName,
          );
          if (existingKey) {
            overrides.renames[existingKey] = newName;
          } else {
            overrides.renames[key] = newName;
          }
          break;
        }
        case "addDependency": {
          const { from, to } = payload;
          if (!overrides.dependencies) overrides.dependencies = [];
          const exists = overrides.dependencies.some(
            (d) => d.from === from && d.to === to,
          );
          if (!exists) overrides.dependencies.push({ from, to });
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
            overrides.futureProjects[index] = {
              ...overrides.futureProjects[index],
              ...project,
            };
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
      }
    });

    return NextResponse.json(
      { success: true, overrides },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to save override:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
