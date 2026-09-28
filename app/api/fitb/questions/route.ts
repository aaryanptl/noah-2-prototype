import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import {
  FITB_CSV_RELATIVE_PATH,
  listFitbQuestions,
  listTopics,
} from "@/lib/fitb/csv-source";
import { resolveApiKey } from "@/lib/fitb/jev";
import { defaultStrictness } from "@/lib/fitb/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A FITB blank as the pages consume it. */
export interface BenchQuestion {
  id: string;
  question: string;
  /** Blank when `hideAnswers=1` — the student attempt flow must not see it. */
  referenceAnswer: string;
  acceptableAnswers: string[];
  subject: string;
  grade: string;
  topic: string;
  difficulty: string;
  category: string;
  region: string;
  defaultStrictness: ReturnType<typeof defaultStrictness>;
}

/**
 * GET /api/fitb/questions
 *   ?grade=class5&topic=...&region=global&category=Text&difficulty=easy
 *   &search=...&limit=24&hideAnswers=1
 *
 * Serves from the FITB CSV (see lib/fitb/csv-source.ts), not the bank.
 *
 * The answer key rides along by default because the bench needs it to seed
 * variants - that page is an internal tool. Pass `hideAnswers=1` for anything a
 * student sits in front of: the key then stays server-side, where
 * /api/fitb/check reads it back by id.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const gradeRaw = (params.get("grade") ?? "").trim();
  const grade = /^class(KG|\d{1,2})$/i.test(gradeRaw) ? gradeRaw : undefined;

  const topic = (params.get("topic") ?? "").trim() || undefined;
  const region = (params.get("region") ?? "").trim() || undefined;
  const category = (params.get("category") ?? "").trim() || undefined;
  const difficulty = (params.get("difficulty") ?? "").trim() || undefined;
  const search = (params.get("search") ?? "").trim() || undefined;
  const hideAnswers = params.get("hideAnswers") === "1";

  const limit = Math.min(
    Math.max(Number.parseInt(params.get("limit") ?? "24", 10) || 24, 1),
    60,
  );

  try {
    const { rows, total, bank } = listFitbQuestions(
      { grade, topic, region, category, difficulty, search },
      limit,
    );

    const questions: BenchQuestion[] = rows.map((row) => ({
      id: row.id,
      question: row.question,
      referenceAnswer: hideAnswers ? "" : row.answer,
      acceptableAnswers: hideAnswers ? [] : row.acceptableAnswers,
      subject: row.subject,
      grade: row.grade,
      topic: row.topic,
      difficulty: row.difficulty,
      category: row.category,
      region: row.region,
      defaultStrictness: defaultStrictness(row.subject),
    }));

    return apiSuccess(
      {
        questions,
        keyConfigured: resolveApiKey().name !== null,
        facets: {
          grades: bank.grades,
          regions: bank.regions,
          categories: bank.categories,
          topics: listTopics({ grade, region }).slice(0, 40),
        },
      },
      {
        meta: {
          total,
          returned: questions.length,
          bankSize: bank.rows.length,
          source: FITB_CSV_RELATIVE_PATH,
          filters: {
            grade: grade ?? null,
            topic: topic ?? null,
            region: region ?? null,
            category: category ?? null,
            difficulty: difficulty ?? null,
            search: search ?? null,
          },
        },
      },
    );
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load FITB questions.",
      { status: 500 },
    );
  }
}
