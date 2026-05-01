// One-off seed for the Weekly Planning view.
// Usage: node scripts/seed-weekly-plan.mjs
// Requires the dev server running on http://localhost:3517.

const BASE = process.env.BASE_URL || "http://localhost:3517";
const WEEK_KEY = process.env.WEEK_KEY || "2026-05-04";

const NOTE = `Hey team! Canceled our EOW sync because of board meeting but wanted to throw plan for next week here. Let me know what you all think and I can start to make sure that the board for next cycle reflects all of this work. Please note that the items here are not including backlog items for everyone. So this is meant to be just top priorities for everyone next week.`;

// personName must match data; "Liuda" in the message is "Luida" in the roster.
const PLAN = {
  Alex: [
    { text: "Audio issues", identifier: "MAR2-1533" },
    { text: "Mirror functionality", identifier: "MAR2-1553" },
    { text: "Offline mode work", identifier: "MAR2-1532" },
  ],
  Oleksii: [
    { text: "Forms (as they come in)" },
    { text: "File Loading", identifier: "MAR2-1342" },
    { text: "iPad video instructions", identifier: "MAR2-1386" },
    { text: "Sizing problems", identifier: "MAR2-1146" },
  ],
  Luida: [
    { text: "Score Review (NWD, Oral Expression Fluency, Sentence Composition Fluency)", identifier: "MAR2-1529" },
    { text: "Custom components for scoring box", identifier: "MAR2-1534" },
    { text: "Audio playing before image", identifier: "MAR2-1500" },
  ],
  AK: [
    { text: "Migration work (Stop using Liveblocks webhooks as an async bus)", identifier: "MAR2-1431" },
  ],
  Hlib: [
    { text: "Filter math questions", identifier: "MAR2-1488" },
    { text: "Student progressing to next question", identifier: "MAR2-1536" },
    { text: "NWD pronunciation guide", identifier: "MAR2-1071" },
    { text: "Upload links expiring", identifier: "MAR2-1517" },
  ],
};

async function linearLookup(identifier) {
  const m = identifier.match(/^([A-Za-z0-9]+)-(\d+)$/);
  if (!m) return null;
  const teamKey = m[1].toUpperCase();
  const number = parseFloat(m[2]);
  const res = await fetch(`${BASE}/api/linear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query Issue($team: String!, $num: Float!) {
        issues(filter: { team: { key: { eq: $team } }, number: { eq: $num } }, first: 1) {
          nodes { id identifier url title }
        }
      }`,
      variables: { team: teamKey, num: number },
    }),
  });
  const json = await res.json();
  if (json.error) console.warn("  api error:", json.error);
  const nodes = json?.data?.issues?.nodes || [];
  return nodes[0] || null;
}

function newBulletId(i) {
  return `b-seed-${Date.now().toString(36)}-${i}`;
}

async function saveBullets(personName, bullets) {
  const res = await fetch(`${BASE}/api/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveWeeklyPlan", weekKey: WEEK_KEY, personName, bullets }),
  });
  if (!res.ok) throw new Error(`saveBullets ${personName} failed: ${res.status} ${await res.text()}`);
}

async function saveNote(note) {
  const res = await fetch(`${BASE}/api/roadmap`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveWeekNote", weekKey: WEEK_KEY, note }),
  });
  if (!res.ok) throw new Error(`saveNote failed: ${res.status} ${await res.text()}`);
}

async function main() {
  console.log(`Seeding week ${WEEK_KEY} via ${BASE}`);
  await saveNote(NOTE);
  console.log("note saved");

  for (const [personName, items] of Object.entries(PLAN)) {
    const bullets = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let linearIssue = undefined;
      if (item.identifier) {
        const issue = await linearLookup(item.identifier);
        if (issue) {
          linearIssue = { id: issue.id, identifier: issue.identifier, url: issue.url, title: issue.title };
        } else {
          console.warn(`  ! could not resolve ${item.identifier}`);
        }
      }
      bullets.push({ id: newBulletId(`${personName}-${i}`), text: item.text, ...(linearIssue ? { linearIssue } : {}) });
    }
    await saveBullets(personName, bullets);
    console.log(`  ✓ ${personName} (${bullets.length} bullets)`);
  }
  console.log("done");
}

main().catch((err) => { console.error(err); process.exit(1); });
