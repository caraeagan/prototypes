import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

// Reads shipped-content state from the marker-method prod read replica.
// Requires PROD_READ_ONLY_DATABASE_URL in .env.local (read-only creds).
export const dynamic = "force-dynamic";

// A practice question's corrective feedback is complete when all four media
// files (correct/incorrect × animation/audio) are attached.
const CF_COMPLETE = `
  q.metadata->>'correct_feedback_animation_file' IS NOT NULL
  AND q.metadata->>'correct_feedback_audio_file' IS NOT NULL
  AND q.metadata->>'incorrect_feedback_animation_file' IS NOT NULL
  AND q.metadata->>'incorrect_feedback_audio_file' IS NOT NULL
`;

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
    // Built = latest CMS version of each enabled practice question.
    const cfBuilt = await sql.query(`
      SELECT
        q."subtestCode" AS code,
        count(*)::int AS total,
        count(*) FILTER (WHERE ${CF_COMPLETE})::int AS complete
      FROM (
        SELECT DISTINCT ON ("subtestId", "questionId") *
        FROM "Question"
        WHERE "isPractice" AND NOT "isDisabled"
        ORDER BY "subtestId", "questionId", version DESC
      ) q
      GROUP BY 1
    `);

    // Released = the question versions pinned by each subtest's active release.
    const cfReleased = await sql.query(`
      SELECT
        s.code,
        count(*)::int AS total,
        count(*) FILTER (WHERE ${CF_COMPLETE})::int AS complete
      FROM "QuestionsRelease" r
      JOIN "Subtest" s ON s.id = r."subtestId"
      CROSS JOIN LATERAL jsonb_each_text(r.questions) AS m(qid, qver)
      JOIN "Question" q
        ON q."subtestId" = r."subtestId"
       AND q."questionId" = m.qid
       AND q.version = m.qver::int
      WHERE r."isActive" AND q."isPractice"
      GROUP BY 1
    `);

    // Animated instructions: latest built version per subtest + key, with
    // per-scene TTS audio completeness; isActive = released to the player.
    const instructions = await sql.query(`
      SELECT
        s.code,
        s."displayName",
        ai."isActive",
        ai.version,
        count(sc.id)::int AS scenes,
        count(sc.id) FILTER (WHERE sc."scriptAudioFileId" IS NOT NULL)::int AS "scenesWithAudio"
      FROM (
        SELECT DISTINCT ON ("subtestId", "instructionKey") *
        FROM "AnimatedInstruction"
        ORDER BY "subtestId", "instructionKey", version DESC
      ) ai
      JOIN "Subtest" s ON s.id = ai."subtestId"
      LEFT JOIN "AnimatedInstructionScene" sc ON sc."animatedInstructionId" = ai.id
      GROUP BY s.code, s."displayName", ai."isActive", ai.version
      ORDER BY s.code
    `);

    return NextResponse.json({ instructions, cfBuilt, cfReleased });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "query failed" },
      { status: 500 },
    );
  }
}
