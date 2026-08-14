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
      "removeAddition",
      "deleteProject",
      "undeleteProject",
      "renameProject",
      "addDependency",
      "removeDependency",
      "saveCycleBuckets",
      "addFutureProject",
      "removeFutureProject",
      "updateFutureProject",
      "saveDescription",
      "saveResources",
      "linkLinearProject",
      "saveWeeklyPlan",
      "saveWeekNote",
      "toggleWeekSignoff",
      "saveTicketOrder",
      "saveProjectOrder",
      "saveWeeklyPersonNote",
      "saveWeeklyTicketOrder",
      "saveNormingChecklist",
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
          // Replace rather than duplicate: two same-name additions would get
          // the same derived project id and collide in the UI.
          overrides.additions[personName] = overrides.additions[personName]
            .filter((a) => a.name !== project.name);
          overrides.additions[personName].push(project);
          // A previously deleted or renamed project with the same name must
          // not leak onto the fresh one: the deletion would hide it at load
          // and the stale rename would relabel it.
          const nameKey = `${personName}:${project.name}`;
          if (overrides.deletions) {
            overrides.deletions = overrides.deletions.filter((k) => k !== nameKey);
          }
          if (overrides.renames?.[nameKey] !== undefined) {
            delete overrides.renames[nameKey];
          }
          break;
        }
        case "removeAddition": {
          const { personName, name } = payload as {
            personName: string;
            name: string;
          };
          const list = overrides.additions?.[personName];
          if (list) {
            overrides.additions![personName] = list.filter((a) => a.name !== name);
            if (overrides.additions![personName].length === 0) {
              delete overrides.additions![personName];
            }
          }
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
        case "undeleteProject": {
          // Reverse of deleteProject: the stored deletion may be keyed by the
          // seed name (when the project was renamed), so resolve both forms.
          const { key } = payload as { key: string };
          if (!overrides.deletions) break;
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
          overrides.deletions = overrides.deletions.filter(
            (k) => k !== key && k !== resolvedKey,
          );
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
        case "saveResources": {
          const { key, resources } = payload as {
            key: string;
            resources: { id: string; label: string; url: string }[];
          };
          if (!overrides.resources) overrides.resources = {};
          if (resources && resources.length > 0) {
            overrides.resources[key] = resources;
          } else {
            delete overrides.resources[key];
          }
          break;
        }
        case "linkLinearProject": {
          const { key, linearProjectName } = payload as {
            key: string;
            linearProjectName: string | null;
          };
          if (!overrides.linearLinks) overrides.linearLinks = {};
          if (linearProjectName) {
            overrides.linearLinks[key] = linearProjectName;
          } else {
            delete overrides.linearLinks[key];
          }
          break;
        }
        case "toggleWeekSignoff": {
          const { weekKey, personName, signed } = payload as {
            weekKey: string;
            personName: string;
            signed: boolean;
          };
          if (!overrides.weekSignoffs) overrides.weekSignoffs = {};
          if (!overrides.weekSignoffs[weekKey]) overrides.weekSignoffs[weekKey] = {};
          if (signed) {
            overrides.weekSignoffs[weekKey][personName] = { at: new Date().toISOString() };
          } else {
            delete overrides.weekSignoffs[weekKey][personName];
            if (Object.keys(overrides.weekSignoffs[weekKey]).length === 0) {
              delete overrides.weekSignoffs[weekKey];
            }
          }
          break;
        }
        case "saveWeekNote": {
          const { weekKey, note } = payload as { weekKey: string; note: string };
          if (!overrides.weekNotes) overrides.weekNotes = {};
          if (note && note.trim()) {
            overrides.weekNotes[weekKey] = note;
          } else {
            delete overrides.weekNotes[weekKey];
          }
          break;
        }
        case "saveTicketOrder": {
          const { weekKey, personName, order } = payload as {
            weekKey: string;
            personName: string;
            order: string[];
          };
          if (!overrides.ticketOrders) overrides.ticketOrders = {};
          if (!overrides.ticketOrders[weekKey]) overrides.ticketOrders[weekKey] = {};
          if (!order || order.length === 0) {
            delete overrides.ticketOrders[weekKey][personName];
            if (Object.keys(overrides.ticketOrders[weekKey]).length === 0) {
              delete overrides.ticketOrders[weekKey];
            }
          } else {
            overrides.ticketOrders[weekKey][personName] = order;
          }
          break;
        }
        case "saveProjectOrder": {
          const { weekKey, personName, order } = payload as {
            weekKey: string;
            personName: string;
            order: string[];
          };
          if (!overrides.projectOrders) overrides.projectOrders = {};
          if (!overrides.projectOrders[weekKey]) overrides.projectOrders[weekKey] = {};
          if (!order || order.length === 0) {
            delete overrides.projectOrders[weekKey][personName];
            if (Object.keys(overrides.projectOrders[weekKey]).length === 0) {
              delete overrides.projectOrders[weekKey];
            }
          } else {
            overrides.projectOrders[weekKey][personName] = order;
          }
          break;
        }
        case "saveWeeklyPersonNote": {
          const { weekKey, personName, note } = payload as {
            weekKey: string;
            personName: string;
            note: string;
          };
          if (!overrides.weeklyPersonNotes) overrides.weeklyPersonNotes = {};
          if (!overrides.weeklyPersonNotes[weekKey]) overrides.weeklyPersonNotes[weekKey] = {};
          if (note && note.trim()) {
            overrides.weeklyPersonNotes[weekKey][personName] = note;
          } else {
            delete overrides.weeklyPersonNotes[weekKey][personName];
            if (Object.keys(overrides.weeklyPersonNotes[weekKey]).length === 0) {
              delete overrides.weeklyPersonNotes[weekKey];
            }
          }
          break;
        }
        case "saveWeeklyTicketOrder": {
          const { weekKey, personName, projectId, order } = payload as {
            weekKey: string;
            personName: string;
            projectId: string;
            order: string[];
          };
          if (!overrides.weeklyTicketOrders) overrides.weeklyTicketOrders = {};
          if (!overrides.weeklyTicketOrders[weekKey]) overrides.weeklyTicketOrders[weekKey] = {};
          if (!overrides.weeklyTicketOrders[weekKey][personName]) overrides.weeklyTicketOrders[weekKey][personName] = {};
          if (!order || order.length === 0) {
            delete overrides.weeklyTicketOrders[weekKey][personName][projectId];
            if (Object.keys(overrides.weeklyTicketOrders[weekKey][personName]).length === 0) {
              delete overrides.weeklyTicketOrders[weekKey][personName];
              if (Object.keys(overrides.weeklyTicketOrders[weekKey]).length === 0) {
                delete overrides.weeklyTicketOrders[weekKey];
              }
            }
          } else {
            overrides.weeklyTicketOrders[weekKey][personName][projectId] = order;
          }
          break;
        }
        case "saveNormingChecklist": {
          const { team, items } = payload as {
            team: string;
            items: { id: string; text: string; done: boolean }[];
          };
          if (!overrides.normingChecklist) overrides.normingChecklist = {};
          if (!items || items.length === 0) {
            delete overrides.normingChecklist[team];
          } else {
            overrides.normingChecklist[team] = items;
          }
          break;
        }
        case "saveWeeklyPlan": {
          const { weekKey, personName, bullets } = payload as {
            weekKey: string;
            personName: string;
            bullets: { id: string; text: string }[];
          };
          if (!overrides.weeklyPlans) overrides.weeklyPlans = {};
          if (!overrides.weeklyPlans[weekKey]) overrides.weeklyPlans[weekKey] = {};
          if (!bullets || bullets.length === 0) {
            delete overrides.weeklyPlans[weekKey][personName];
            if (Object.keys(overrides.weeklyPlans[weekKey]).length === 0) {
              delete overrides.weeklyPlans[weekKey];
            }
          } else {
            overrides.weeklyPlans[weekKey][personName] = bullets;
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
