import type { NextRequest } from "next/server";

import type { DifficultyBand } from "@/agents/diagnostic/types/index";
import { apiError, apiSuccess } from "@/lib/api-response";
import { serveNextPracticeQuestion } from "@/lib/prototype-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANDS: DifficultyBand[] = ["easy", "medium", "hard"];

/**
 * POST /api/prototype/practice/next
 * Body: {
 *   grade: number (0-8),
 *   topic: string,
 *   band: "easy" | "medium" | "hard",   // the band the Streak Ladder currently says
 *   excludeIds: string[]                 // everything already served this session
 * }
 * Serves ONE more question at the requested band (the just-in-time step that
 * keeps the buffer ~2 ahead). Returns { question: null } when the pool is
 * exhausted even after band fallback. Read-only.
 */
export async function POST(request: NextRequest) {
  let body: {
    grade?: unknown;
    topic?: unknown;
    band?: unknown;
    excludeIds?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  const grade = Number(body.grade);
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const band: DifficultyBand = BANDS.includes(body.band as DifficultyBand)
    ? (body.band as DifficultyBand)
    : "easy";
  const excludeIds = Array.isArray(body.excludeIds)
    ? body.excludeIds.filter((x): x is string => typeof x === "string")
    : [];

  const errors: Array<{ field: string; issue: string }> = [];
  if (!Number.isInteger(grade) || grade < 0 || grade > 8) {
    errors.push({ field: "grade", issue: "Must be an integer 0-8 (0 = KG)." });
  }
  if (!topic) errors.push({ field: "topic", issue: "Required." });
  if (errors.length > 0) {
    return apiError("VALIDATION_ERROR", "One or more parameters are invalid.", {
      status: 400,
      details: errors,
    });
  }

  try {
    const question = await serveNextPracticeQuestion(
      grade,
      topic,
      band,
      excludeIds,
    );
    return apiSuccess({ question });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to serve question.",
      { status: 500 },
    );
  }
}
