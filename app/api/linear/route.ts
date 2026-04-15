import { NextRequest, NextResponse } from "next/server";
import { queryLinear } from "~/lib/linear";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'query' field" },
        { status: 400 },
      );
    }

    const data = await queryLinear(query, variables);
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Linear API proxy error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
