import { NextResponse } from "next/server";
import {
  createLearningPlan,
  isPlanFocus,
  listLearningPlans,
  type PlanItemInput,
} from "@/lib/learning-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SESSIONS = 31;

function dayNumber(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  if (studentId && !UUID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }
  const plans = await listLearningPlans(studentId);
  return NextResponse.json({ plans });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const studentId = body.studentId;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const items = body.items;

  if (typeof studentId !== "string" || !UUID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "At least one plan item is required" },
      { status: 400 },
    );
  }
  if (items.length > MAX_SESSIONS) {
    return NextResponse.json(
      { error: `At most ${MAX_SESSIONS} sessions are supported` },
      { status: 400 },
    );
  }

  const parsedItems: PlanItemInput[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const week = item.week;
    const day = item.day;
    const sessionDate = item.sessionDate;
    const topic = typeof item.topic === "string" ? item.topic.trim() : "";
    const activity =
      typeof item.activity === "string" ? item.activity.trim() : "";
    if (
      typeof week !== "number" ||
      week < 1 ||
      typeof day !== "number" ||
      day < 1 ||
      typeof sessionDate !== "string" ||
      !DATE_PATTERN.test(sessionDate) ||
      !isPlanFocus(item.focus) ||
      !topic ||
      !activity
    ) {
      return NextResponse.json(
        {
          error:
            "Each item needs week, day, sessionDate, focus, topic and activity",
        },
        { status: 400 },
      );
    }
    parsedItems.push({
      week,
      day,
      sessionDate,
      sortOrder:
        typeof item.sortOrder === "number"
          ? item.sortOrder
          : parsedItems.length,
      focus: item.focus,
      topic,
      subject: typeof item.subject === "string" ? item.subject : null,
      learningObjective:
        typeof item.learningObjective === "string"
          ? item.learningObjective
          : null,
      activity,
      masteryState:
        typeof item.masteryState === "string" ? item.masteryState : null,
      baselineScore:
        typeof item.baselineScore === "number" ? item.baselineScore : null,
    });
  }

  // The plan's window is derived from the picked session dates.
  const sortedDates = parsedItems.map((item) => item.sessionDate).sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];
  const durationWeeks = Math.max(
    1,
    Math.ceil((dayNumber(endDate) - dayNumber(startDate) + 1) / 7),
  );

  try {
    const planId = await createLearningPlan({
      studentId,
      title,
      subject: typeof body.subject === "string" ? body.subject : null,
      durationWeeks,
      startDate,
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
      items: parsedItems,
    });
    return NextResponse.json({ planId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create learning plan:", error);
    return NextResponse.json(
      { error: "Failed to create learning plan" },
      { status: 500 },
    );
  }
}
