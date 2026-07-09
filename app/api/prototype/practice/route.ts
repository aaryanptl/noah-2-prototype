import type { NextRequest } from "next/server";
import type { DifficultyBand } from "@/agents/diagnostic/types/index";
import { apiError, apiSuccess } from "@/lib/api-response";
import {
  PRACTICE_DEFAULT_COUNT,
  startPracticeSession,
} from "@/lib/prototype-practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANDS: DifficultyBand[] = ["easy", "medium", "hard"];

/**
 * POST /api/prototype/practice
 * Body: {
 *   grade: number (0-8),
 *   topic: string,
 *   seedBand?: "easy" | "medium" | "hard",  // student's current practice level (default easy)
 *   targetCount?: number                    // session length (default 5)
 * }
 * Starts an adaptive session and returns the seed band + the first buffer of
 * questions. Read-only, no DB writes.
 */
export async function POST(request: NextRequest) {
  let body: {
    grade?: unknown;
    topic?: unknown;
    seedBand?: unknown;
    targetCount?: unknown;
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
  const seedBand: DifficultyBand = BANDS.includes(
    body.seedBand as DifficultyBand,
  )
    ? (body.seedBand as DifficultyBand)
    : "easy";
  const targetCount = Number.isInteger(Number(body.targetCount))
    ? Math.min(Math.max(Number(body.targetCount), 3), 20)
    : PRACTICE_DEFAULT_COUNT;

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
    const session = await startPracticeSession(
      grade,
      topic,
      seedBand,
      targetCount,
    );
    if (session.questions.length === 0) {
      return apiError(
        "NOT_FOUND",
        `No questions found for grade ${grade} / "${topic}".`,
        { status: 404 },
      );
    }
    return apiSuccess(session);
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to build practice.",
      { status: 500 },
    );
  }
}
