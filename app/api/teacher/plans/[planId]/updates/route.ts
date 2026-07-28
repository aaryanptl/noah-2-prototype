import { NextResponse } from "next/server";
import {
  applyPlanUpdate,
  getPlanState,
  type PlanUpdate,
} from "@/lib/plan-updates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }
  const state = await getPlanState(planId);
  if (!state) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ state });
}

function parseTopicIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.length > 0);
}

/**
 * The single write path for plan changes, used by the glimpse form (kind
 * "class") and the SPR edit flow (kind "manual"). The nightly pass calls
 * applyPlanUpdate directly rather than going over HTTP.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = body.kind;
  if (kind !== "manual" && kind !== "class" && kind !== "auto") {
    return NextResponse.json(
      { error: 'kind must be "manual", "class" or "auto"' },
      { status: 400 },
    );
  }

  const actor = typeof body.actor === "string" ? body.actor : "teacher";
  let update: PlanUpdate;

  if (kind === "class") {
    const covered = Array.isArray(body.topicsCovered) ? body.topicsCovered : [];
    update = {
      kind: "class",
      actor,
      topicsCovered: covered
        .map((raw) => raw as Record<string, unknown>)
        .filter((t) => typeof t.topicId === "string")
        .map((t) => ({
          topicId: t.topicId as string,
          activitiesDone:
            typeof t.activitiesDone === "number" && t.activitiesDone >= 0
              ? t.activitiesDone
              : 0,
          masteryScore:
            typeof t.masteryScore === "number" &&
            t.masteryScore >= 0 &&
            t.masteryScore <= 100
              ? t.masteryScore
              : undefined,
        })),
      completedTopicIds: parseTopicIdList(body.completedTopicIds),
      addTopicIds: parseTopicIdList(body.addTopicIds),
      removeTopicIds: parseTopicIdList(body.removeTopicIds),
      classesConsumed:
        typeof body.classesConsumed === "number" && body.classesConsumed >= 0
          ? body.classesConsumed
          : 1,
    };
  } else if (kind === "manual") {
    const setClasses = Array.isArray(body.setClasses) ? body.setClasses : [];
    const setActivities = Array.isArray(body.setActivities)
      ? body.setActivities
      : [];
    update = {
      kind: "manual",
      actor,
      addTopicIds: parseTopicIdList(body.addTopicIds),
      removeTopicIds: parseTopicIdList(body.removeTopicIds),
      setClasses: setClasses
        .map((raw) => raw as Record<string, unknown>)
        .filter(
          (t) => typeof t.topicId === "string" && typeof t.classes === "number",
        )
        .map((t) => ({
          topicId: t.topicId as string,
          classes: t.classes as number,
        })),
      setActivities: setActivities
        .map((raw) => raw as Record<string, unknown>)
        .filter(
          (t) =>
            typeof t.topicId === "string" && typeof t.activities === "number",
        )
        .map((t) => ({
          topicId: t.topicId as string,
          activities: t.activities as number,
        })),
    };
  } else {
    update = { kind: "auto", actor };
  }

  try {
    const result = await applyPlanUpdate(planId, update);
    // A refusal is a normal outcome (the precedence rule), not a server error,
    // so it comes back 200 with applied:false for the UI to explain.
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to apply plan update:", error);
    return NextResponse.json(
      { error: "Failed to apply plan update" },
      { status: 500 },
    );
  }
}
