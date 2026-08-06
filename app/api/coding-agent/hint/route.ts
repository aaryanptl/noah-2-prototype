import { NextResponse } from "next/server";

import {
  type DebuggerHintPayload,
  runDebuggerHint,
} from "@/agents/coding-agent/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DebuggerHintPayload;
    const result = await runDebuggerHint(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate a hint.",
      },
      { status: 500 },
    );
  }
}
