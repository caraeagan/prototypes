import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

// Norming-phase testing progress from the marker-method prod read replica:
// completed sessions, distinct examiners on them, and students whose norming
// examination is completed. Zero across the board until a norming StudyPhase
// exists (matched by phaseType or name — the phaseType column isn't always
// populated).
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.PROD_READ_ONLY_DATABASE_URL;
  if (!url) {
    return NextResponse.json(
      { error: "PROD_READ_ONLY_DATABASE_URL is not set" },
      { status: 500 },
    );
  }
  const sql = neon(url);
  try {
    const rows = await sql.query(`
      SELECT
        count(*) FILTER (WHERE s.status = 'COMPLETED')::int AS "completedSessions",
        count(DISTINCT s."examinerId") FILTER (WHERE s.status = 'COMPLETED')::int AS "examiners",
        count(DISTINCT e."studentId") FILTER (WHERE e.status = 'COMPLETED')::int AS "students"
      FROM "Session" s
      JOIN "Examination" e ON e.id = s."examinationId"
      JOIN "StudyPhase" p ON p.id = e."studyPhaseId"
      WHERE p."phaseType" = 'NORMING' OR p.name ILIKE '%norming%'
    `);
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "query failed" },
      { status: 500 },
    );
  }
}
