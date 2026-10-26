import { NextResponse } from "next/server";
import { getCodingChallengeById } from "@/agents/coding-agent/challenges";
import { generateCodeLabScaffold } from "@/agents/coding-agent/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { challengeId, mode } = body;

    const challenge = getCodingChallengeById(Number(challengeId));
    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    if (mode !== "pair" && mode !== "guide") {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    const scaffoldData = await generateCodeLabScaffold(challenge, mode);
    return NextResponse.json(scaffoldData);
  } catch (error) {
    console.error("Scaffold error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate scaffold.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
