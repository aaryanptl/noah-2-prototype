import { NextResponse } from "next/server";

import {
  type DebuggerRunPayload,
  runStudentCode,
} from "@/agents/coding-agent/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DebuggerRunPayload;
    const result = await runStudentCode(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        output: "",
        error: error instanceof Error ? error.message : "Unable to run code.",
      },
      { status: 500 },
    );
  }
}
