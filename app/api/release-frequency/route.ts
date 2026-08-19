import { NextResponse } from "next/server";

// Release frequency from GitHub: each release is a successful run of the
// "Deploy to Production" workflow (which merges main into production).
// GITHUB_TOKEN is a fine-grained PAT scoped to marker-method, read-only.
export const dynamic = "force-dynamic";

const REPO = "markerlearning/marker-method";
const DEPLOY_WORKFLOW = "deploy-production.yml";
const WINDOW_DAYS = 90;

type Run = { created_at: string };

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN is not set" }, { status: 500 });
  }
  try {
    const day = 24 * 60 * 60 * 1000;
    // Fetch a week past the window and filter by exact timestamp ourselves:
    // GitHub's created=> filter runs on an eventually-consistent search index
    // that has been observed to drop recent runs.
    const since = new Date(Date.now() - (WINDOW_DAYS + 7) * day).toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/${DEPLOY_WORKFLOW}/runs?status=success&created=>${since}&per_page=100`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      },
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const { workflow_runs } = (await res.json()) as { workflow_runs: Run[] };
    const releases = workflow_runs
      .map((r) => new Date(r.created_at).getTime())
      .filter((t) => t >= Date.now() - WINDOW_DAYS * day);

    const last30 = releases.filter((t) => t > Date.now() - 30 * day).length;
    const latest = releases.length > 0 ? Math.max(...releases) : null;

    return NextResponse.json({
      windowDays: WINDOW_DAYS,
      total: releases.length,
      last30,
      perWeek: Math.round((releases.length / (WINDOW_DAYS / 7)) * 10) / 10,
      daysSinceLast: latest === null ? null : Math.floor((Date.now() - latest) / day),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub fetch failed" },
      { status: 500 },
    );
  }
}
