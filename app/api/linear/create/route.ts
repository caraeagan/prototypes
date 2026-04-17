import { NextRequest, NextResponse } from "next/server";
import { queryLinear } from "~/lib/linear";

const CREATE_ISSUE = `
  mutation IssueCreate($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue {
        id identifier url title priority priorityLabel
        state { name color }
        assignee { displayName avatarUrl }
        dueDate
        project { name }
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, teamId, projectId, cycleId, assigneeId, dueDate, priority } = body;

    if (!title || !teamId) {
      return NextResponse.json(
        { error: "title and teamId are required" },
        { status: 400 },
      );
    }

    const input: Record<string, unknown> = { title, teamId };
    if (projectId) input.projectId = projectId;
    if (cycleId) input.cycleId = cycleId;
    if (assigneeId) input.assigneeId = assigneeId;
    if (dueDate) input.dueDate = dueDate;
    if (priority !== undefined) input.priority = priority;

    const data = await queryLinear<{
      issueCreate: {
        success: boolean;
        issue: {
          id: string;
          identifier: string;
          url: string;
          title: string;
          priority: number;
          priorityLabel: string;
          state: { name: string; color: string };
          assignee: { displayName: string; avatarUrl: string | null } | null;
          dueDate: string | null;
          project: { name: string } | null;
        };
      };
    }>(CREATE_ISSUE, { input });

    if (!data.issueCreate.success) {
      return NextResponse.json(
        { error: "Failed to create issue in Linear" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      issue: data.issueCreate.issue,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Linear create error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
