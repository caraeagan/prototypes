import { NextRequest, NextResponse } from "next/server";
import { queryLinear } from "~/lib/linear";

const UPDATE_ISSUE = `
  mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue {
        id
        startedAt
        dueDate
        priority
        priorityLabel
        state { id name color }
        assignee { id displayName avatarUrl }
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { issueId, dueDate, stateId, assigneeId, priority } = body;

    if (!issueId || typeof issueId !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'issueId'" },
        { status: 400 },
      );
    }

    // Note: IssueUpdateInput has no writable start date (startedAt is set by
    // Linear when an issue enters In Progress), so only dueDate can sync.
    const input: Record<string, string | number | null> = {};
    if (dueDate !== undefined) input.dueDate = dueDate || null;
    if (stateId !== undefined) input.stateId = stateId;
    if (assigneeId !== undefined) input.assigneeId = assigneeId || null;
    if (body.cycleId !== undefined) input.cycleId = body.cycleId;
    if (body.projectId !== undefined) input.projectId = body.projectId || null;
    // Linear priority is 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low. 0 is a
    // real value, so check the type rather than truthiness.
    if (priority !== undefined) {
      const p = Number(priority);
      if (!Number.isInteger(p) || p < 0 || p > 4) {
        return NextResponse.json(
          { error: "'priority' must be an integer 0-4" },
          { status: 400 },
        );
      }
      input.priority = p;
    }

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: "At least one field to update is required" },
        { status: 400 },
      );
    }

    const data = await queryLinear<{
      issueUpdate: {
        success: boolean;
        issue: {
          id: string;
          startedAt: string | null;
          dueDate: string | null;
          priority: number;
          priorityLabel: string;
          state: { id: string; name: string; color: string };
          assignee: { id: string; displayName: string; avatarUrl: string | null } | null;
        };
      };
    }>(UPDATE_ISSUE, { id: issueId, input });

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
