import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { pickPracticeQuestion } from "@/lib/why-wrong/csv-source";
import { BANDS, type DifficultyBand } from "@/lib/why-wrong/ladder";
import type { PracticeMix, PracticeQuestion } from "@/lib/why-wrong/practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIXES: PracticeMix[] = ["mcq", "fitb", "mixed"];

interface NextBody {
  grade?: unknown;
  topic?: unknown;
  type?: unknown;
  band?: unknown;
  exclude?: unknown;
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

/**
 * POST /api/why-wrong/practice/next
 *   { grade, topic, type, band, exclude: [ids already served] }
 *
 * One question at the band the ladder chose. The key stays server-side; the
 * answer route reads it back by id.
 */
export async function POST(request: NextRequest) {
  let body: NextBody;
  try {
    body = (await request.json()) as NextBody;
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const grade = typeof body.grade === "string" ? body.grade : "";
  const topic = typeof body.topic === "string" ? body.topic : "";
  if (!grade || !topic) {
    return apiError("VALIDATION_ERROR", "`grade` and `topic` are required.");
  }
  const type = MIXES.includes(body.type as PracticeMix)
    ? (body.type as PracticeMix)
    : "mcq";
  const band = BANDS.includes(body.band as DifficultyBand)
    ? (body.band as DifficultyBand)
    : "medium";
  const exclude = new Set(
    Array.isArray(body.exclude) ? body.exclude.map((v) => String(v)) : [],
  );

  try {
    const row = pickPracticeQuestion({ grade, topic, type, band, exclude });
    if (!row) {
      return apiError("NOT_FOUND", "No unseen questions left in this topic.", {
        status: 404,
      });
    }
    const question: PracticeQuestion = {
      id: row.id,
      type: row.type,
      question: row.question,
      options: shuffle(row.options.map((o) => o.text)),
      grade: row.grade,
      topic: row.topic,
      subtopic: row.subtopic,
      learningObjective: row.learningObjective,
      band: row.band,
    };
    return apiSuccess({ question, requestedBand: band });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to pick a question.",
      { status: 500 },
    );
  }
}
