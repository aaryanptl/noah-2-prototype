import { NextResponse } from "next/server";
import { getDemoStudent } from "@/lib/demo-students";
import { generateAIPlan } from "@/lib/plan-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Structured generation over a full curriculum can take 20–60s.
export const maxDuration = 300;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSION_DATES = 31;
const MAX_INSTRUCTIONS = 2000;

export async function POST(request: Request) {
  let body: { studentId?: string; dates?: unknown; instructions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const profile = getDemoStudent(body.studentId ?? "");
  if (!profile) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const dates = Array.isArray(body.dates)
    ? body.dates.filter((date): date is string => typeof date === "string")
    : [];
  if (dates.length === 0) {
    return NextResponse.json(
      { error: "Pick at least one session date." },
      { status: 400 },
    );
  }
  if (dates.length > MAX_SESSION_DATES) {
    return NextResponse.json(
      { error: `At most ${MAX_SESSION_DATES} session dates are supported.` },
      { status: 400 },
    );
  }
  if (dates.some((date) => !DATE_PATTERN.test(date))) {
    return NextResponse.json(
      { error: "Dates must be formatted YYYY-MM-DD." },
      { status: 400 },
    );
  }

  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  if (instructions.length > MAX_INSTRUCTIONS) {
    return NextResponse.json(
      { error: `Instructions must be under ${MAX_INSTRUCTIONS} characters.` },
      { status: 400 },
    );
  }

  const suggestion = await generateAIPlan(profile, dates, instructions);
  return NextResponse.json(suggestion);
}
