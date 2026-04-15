import { NextRequest, NextResponse } from "next/server";
import { queryLinear, UPDATE_ISSUE_DATES } from "~/lib/linear";
import type { IssueUpdateResponse } from "~/lib/linear";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, startDate, dueDate } = body;

    if (!issueId || typeof issueId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'issueId'" },
        { status: 400 },
      );
    }

    const input: Record<string, string> = {};
    if (startDate !== undefined) {
      input.startedAt = startDate;
    }
    if (dueDate !== undefined) {
      input.dueDate = dueDate;
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: "At least one of 'startDate' or 'dueDate' is required" },
        { status: 400 },
      );
    }

    const data = await queryLinear<IssueUpdateResponse>(
      UPDATE_ISSUE_DATES,
      { id: issueId, input },
    );

    if (!data.issueUpdate.success) {
      return NextResponse.json(
        { error: "Failed to update issue in Linear" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      issue: data.issueUpdate.issue,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Linear update error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
