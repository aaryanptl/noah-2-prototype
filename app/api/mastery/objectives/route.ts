import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { loadObjectives } from "@/lib/mastery/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/mastery/objectives?topic=57 — a topic and its learning objectives. */
export async function GET(request: NextRequest) {
  const topic = Number(request.nextUrl.searchParams.get("topic"));
  if (!Number.isInteger(topic)) {
    return apiError("VALIDATION_ERROR", "topic must be an integer.", {
      status: 400,
    });
  }
  try {
    const result = await loadObjectives(topic);
    if (!result)
      return apiError("NOT_FOUND", `Topic ${topic} does not exist.`, {
        status: 404,
      });
    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load objectives.",
      { status: 500 },
    );
  }
}
