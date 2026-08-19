import { NextResponse } from "next/server";

// Engineering metrics from GitHub for marker-method:
// - PR cycle time + throughput (pulls API, merged into main, last 30 days)
// - Lead time: PR merge -> the production release that shipped it
// - Change failure rate: Deploy to Production workflow run outcomes (90 days)
// GITHUB_TOKEN: fine-grained PAT, marker-method only, read-only
// (contents + pull requests + actions).
export const dynamic = "force-dynamic";

const REPO = "markerlearning/marker-method";
const DEPLOY_WORKFLOW = "deploy-production.yml";
const PR_WINDOW_DAYS = 30;
const DEPLOY_WINDOW_DAYS = 90;
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
// Trend series length; PRs are fetched back this far so every bucket is real.
const TREND_WEEKS = 12;

type PR = { created_at: string; updated_at: string; merged_at: string | null; base: { ref: string } };
type Run = { conclusion: string | null; created_at: string };

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

async function gh(token: string, path: string): Promise<unknown> {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path.split("?")[0]}`);
  return res.json();
}

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN is not set" }, { status: 500 });
  }
  try {
    const now = Date.now();
    const prSince = now - PR_WINDOW_DAYS * DAY;
    // Monday 00:00 UTC of the current week, then TREND_WEEKS buckets back.
    const thisWeek = Math.floor((now - 4 * DAY) / WEEK) * WEEK + 4 * DAY; // epoch was a Thursday
    const weekStarts = Array.from({ length: TREND_WEEKS }, (_, i) => thisWeek - (TREND_WEEKS - 1 - i) * WEEK);
    const trendSince = weekStarts[0];
    // Rolling 4-week windows on the earliest buckets reach 3 weeks further back.
    const fetchSince = trendSince - 3 * WEEK;

    // Merged PRs into main, fetched back to the start of the trend window.
    // Sorted by last-update desc; stop once a page is entirely older (cap 10 pages).
    const merged: { createdAt: number; mergedAt: number }[] = [];
    for (let page = 1; page <= 10; page++) {
      const prs = (await gh(
        token,
        `/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=100&page=${page}`,
      )) as PR[];
      for (const pr of prs) {
        if (!pr.merged_at) continue;
        const mergedAt = new Date(pr.merged_at).getTime();
        if (mergedAt >= fetchSince) merged.push({ createdAt: new Date(pr.created_at).getTime(), mergedAt });
      }
      if (prs.length < 100 || prs.every((p) => new Date(p.updated_at).getTime() < fetchSince)) break;
    }
    const merged30 = merged.filter((p) => p.mergedAt >= prSince);

    // Deploy workflow runs, fetched back far enough for the earliest rolling
    // bucket. Successful runs double as release timestamps for lead time; the
    // failure stat itself only counts the last DEPLOY_WINDOW_DAYS.
    const runsSince = new Date(Math.min(now - DEPLOY_WINDOW_DAYS * DAY, fetchSince)).toISOString().slice(0, 10);
    const runsResp = (await gh(
      token,
      `/actions/workflows/${DEPLOY_WORKFLOW}/runs?per_page=100&created=>${runsSince}`,
    )) as { workflow_runs: Run[] };
    const allFinished = runsResp.workflow_runs.filter((r) => r.conclusion !== null && r.conclusion !== "cancelled");
    const finished = allFinished.filter((r) => new Date(r.created_at).getTime() >= now - DEPLOY_WINDOW_DAYS * DAY);
    const failed = finished.filter((r) => r.conclusion !== "success").length;
    const releases = allFinished
      .filter((r) => r.conclusion === "success")
      .map((r) => new Date(r.created_at).getTime())
      .sort((a, b) => a - b);

    // Lead time: merge -> first release at or after the merge.
    const leadTimeOf = (pr: { mergedAt: number }): number | null => {
      const release = releases.find((r) => r >= pr.mergedAt);
      return release === undefined ? null : release - pr.mergedAt;
    };
    const leadTimes30 = merged30.map(leadTimeOf).filter((t): t is number => t !== null);

    const hours = (ms: number | null) => (ms === null ? null : Math.round((ms / 3600000) * 10) / 10);

    // Merged into main after the last release = waiting to ship. The PR fetch
    // reaches ~15 weeks back, plenty unless releases stop for months.
    const lastRelease = releases.length > 0 ? releases[releases.length - 1] : null;
    const unreleasedPrs = lastRelease === null ? merged.length : merged.filter((p) => p.mergedAt > lastRelease).length;

    // Weekly trend series. Sparse metrics (lead time, releases) use a 4-week
    // rolling window per point so the line doesn't read as noise.
    const inWeek = (t: number, ws: number) => t >= ws && t < ws + WEEK;
    const inRolling = (t: number, ws: number) => t >= ws - 3 * WEEK && t < ws + WEEK;
    const series = {
      weekStarts: weekStarts.map((ws) => new Date(ws).toISOString().slice(0, 10)),
      prsPerWeek: weekStarts.map((ws) => merged.filter((p) => inWeek(p.mergedAt, ws)).length),
      prCycleHours: weekStarts.map((ws) =>
        hours(median(merged.filter((p) => inWeek(p.mergedAt, ws)).map((p) => p.mergedAt - p.createdAt))),
      ),
      leadTimeHours: weekStarts.map((ws) =>
        hours(
          median(
            merged
              .filter((p) => inRolling(p.mergedAt, ws))
              .map(leadTimeOf)
              .filter((t): t is number => t !== null),
          ),
        ),
      ),
      releasesPerWeek: weekStarts.map(
        (ws) => Math.round((releases.filter((r) => inRolling(r, ws)).length / 4) * 10) / 10,
      ),
    };

    return NextResponse.json({
      prWindowDays: PR_WINDOW_DAYS,
      prsMerged: merged30.length,
      prsPerWeek: Math.round((merged30.length / (PR_WINDOW_DAYS / 7)) * 10) / 10,
      prCycleMedianHours: hours(median(merged30.map((p) => p.mergedAt - p.createdAt))),
      leadTimeMedianHours: hours(median(leadTimes30)),
      deploys: {
        windowDays: DEPLOY_WINDOW_DAYS,
        total: finished.length,
        failed,
        failurePct: finished.length > 0 ? Math.round((failed / finished.length) * 100) : null,
      },
      unreleasedPrs,
      lastReleaseDaysAgo: lastRelease === null ? null : Math.floor((now - lastRelease) / DAY),
      series,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "GitHub fetch failed" },
      { status: 500 },
    );
  }
}
