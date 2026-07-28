import { NextResponse } from "next/server";
import {
  createLearningPlan,
  isPlanFocus,
  listLearningPlans,
  type PlanItemInput,
  type PlanTopicInput,
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

  // The topic allocation the sessions were derived from. Optional so an older
  // client can still save, but a plan without it can't be updated after a class.
  const parsedTopics: PlanTopicInput[] = [];
  if (Array.isArray(body.topics)) {
    for (const raw of body.topics) {
      const topic = raw as Record<string, unknown>;
      const topicName =
        typeof topic.topicName === "string" ? topic.topicName.trim() : "";
      const plannedClasses = topic.plannedClasses;
      if (
        !topicName ||
        typeof plannedClasses !== "number" ||
        plannedClasses < 1
      ) {
        return NextResponse.json(
          { error: "Each topic needs topicName and plannedClasses >= 1" },
          { status: 400 },
        );
      }
      parsedTopics.push({
        topicId: typeof topic.topicId === "string" ? topic.topicId : null,
        topicName,
        sequence:
          typeof topic.sequence === "number"
            ? topic.sequence
            : parsedTopics.length + 1,
        plannedClasses,
        plannedActivities:
          typeof topic.plannedActivities === "number"
            ? topic.plannedActivities
            : 0,
        priority: typeof topic.priority === "number" ? topic.priority : null,
        reason: typeof topic.reason === "string" ? topic.reason : null,
      });
    }
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
      grade: typeof body.grade === "string" ? body.grade : null,
      durationWeeks,
      startDate,
      notes:
        typeof body.notes === "string" && body.notes.trim()
          ? body.notes.trim()
          : null,
      classesRemaining:
        typeof body.classesRemaining === "number"
          ? body.classesRemaining
          : parsedItems.length,
      items: parsedItems,
      topics: parsedTopics,
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
