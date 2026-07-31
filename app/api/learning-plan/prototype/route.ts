import { NextResponse } from "next/server";
import {
  savePrototypePlan,
  updatePrototypePlan,
  type PrototypePlanUpdate,
} from "@/lib/learning-plan/prototype-persistence";
import type { DemoStudent, GeneratedPlan } from "@/lib/learning-plan/types";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlan(value: unknown): value is GeneratedPlan {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    Array.isArray(value.allocations) &&
    Array.isArray(value.items) &&
    isRecord(value.capacity)
  );
}

function isStudent(value: unknown): value is DemoStudent {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.grade === "number"
  );
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isStudent(body.student) || !isPlan(body.plan)) {
    return NextResponse.json(
      { error: "A prototype student and plan are required" },
      { status: 400 },
    );
  }

  try {
    if (body.action === "save") {
      return NextResponse.json(await savePrototypePlan(body.student, body.plan), {
        status: 201,
      });
    }
    if (
      body.action === "update" &&
      typeof body.planId === "string" &&
      isRecord(body.update)
    ) {
      const update = body.update;
      const kind = update.kind;
      if (kind !== "manual" && kind !== "class" && kind !== "auto") {
        return NextResponse.json({ error: "Invalid update kind" }, { status: 400 });
      }
      const payload: PrototypePlanUpdate = {
        plan: body.plan,
        completedCount:
          typeof update.completedCount === "number" ? update.completedCount : 0,
        kind,
        changes: Array.isArray(update.changes)
          ? update.changes.filter(
              (change): change is string => typeof change === "string",
            )
          : [],
        outcome:
          update.outcome === "faster" ||
          update.outcome === "on-track" ||
          update.outcome === "needs-time"
            ? update.outcome
            : undefined,
        note: typeof update.note === "string" ? update.note : undefined,
        taughtPrototypeTopicId:
          typeof update.taughtPrototypeTopicId === "number"
            ? update.taughtPrototypeTopicId
            : undefined,
        autoApplied: update.autoApplied === true,
      };
      return NextResponse.json(
        await updatePrototypePlan(body.planId, body.student, payload),
      );
    }
    return NextResponse.json({ error: "Invalid persistence action" }, { status: 400 });
  } catch (error) {
    console.error("Learning-plan prototype persistence failed:", error);
    return NextResponse.json(
      { error: "Could not save the learning plan" },
      { status: 500 },
    );
  }
}
