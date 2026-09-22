import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { loadTopicEvidence } from "@/lib/mastery/evidence";
import { replay } from "@/lib/mastery/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/mastery/decide?student=ID&topic=57
 * Builds the scorecard from the student's real sessions on the topic, replays
 * the router before every session, and returns the decision for right now.
 */
export async function GET(request: NextRequest) {
  const student = request.nextUrl.searchParams.get("student")?.trim();
  const topic = Number(request.nextUrl.searchParams.get("topic"));
  if (!student || !Number.isInteger(topic)) {
    return apiError(
      "VALIDATION_ERROR",
      "student and an integer topic are required.",
      { status: 400 },
    );
  }
  try {
    const evidence = await loadTopicEvidence(student, topic);
    if (!evidence) {
      return apiError("NOT_FOUND", `Topic ${topic} does not exist.`, {
        status: 404,
      });
    }
    const { steps, now, card } = replay(
      evidence.objectives,
      evidence.measurements,
    );
    return apiSuccess({
      student,
      topic: evidence.topic,
      objectives: evidence.objectives,
      placement: evidence.placement,
      scorecard: card,
      decision: now,
      steps,
    });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to build the decision.",
      { status: 500 },
    );
  }
}
