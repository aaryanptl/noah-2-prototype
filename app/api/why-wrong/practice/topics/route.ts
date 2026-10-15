import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { listPracticeTopics } from "@/lib/why-wrong/csv-source";
import { jevConfigured } from "@/lib/why-wrong/jev";
import type { PracticeMix } from "@/lib/why-wrong/practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIXES: PracticeMix[] = ["mcq", "fitb", "mixed"];

/**
 * GET /api/why-wrong/practice/topics?grade=class5&type=mcq
 *
 * Topics in the CSV banks with questions at every band, so the ladder has room
 * to move either way.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const grade = (params.get("grade") ?? "").trim();
  if (!/^class(KG|\d{1,2})$/.test(grade)) {
    return apiError("VALIDATION_ERROR", "A `grade` like class5 is required.");
  }
  const typeRaw = (params.get("type") ?? "mcq") as PracticeMix;
  const type = MIXES.includes(typeRaw) ? typeRaw : "mcq";

  try {
    return apiSuccess({
      topics: listPracticeTopics(grade, type),
      jevConfigured: jevConfigured(),
    });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load topics.",
      { status: 500 },
    );
  }
}
