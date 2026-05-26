import { NextRequest, NextResponse } from "next/server";
import { queryLinear } from "~/lib/linear";

const CREATE_PROJECT = `
  mutation ProjectCreate($input: ProjectCreateInput!) {
    projectCreate(input: $input) {
      success
      project {
        id
        name
        url
        startDate
        targetDate
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, teamIds, description, startDate, targetDate } = body;

    if (!name || !Array.isArray(teamIds) || teamIds.length === 0) {
      return NextResponse.json(
        { error: "name and teamIds (non-empty array) are required" },
        { status: 400 },
      );
    }

    const input: Record<string, unknown> = { name, teamIds };
    if (description) input.description = description;
    if (startDate) input.startDate = startDate;
    if (targetDate) input.targetDate = targetDate;

    const data = await queryLinear<{
      projectCreate: {
        success: boolean;
        project: {
          id: string;
          name: string;
          url: string;
          startDate: string | null;
          targetDate: string | null;
        };
      };
    }>(CREATE_PROJECT, { input });

    if (!data.projectCreate.success) {
      return NextResponse.json(
        { error: "Failed to create project in Linear" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      project: data.projectCreate.project,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Linear create-project error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
