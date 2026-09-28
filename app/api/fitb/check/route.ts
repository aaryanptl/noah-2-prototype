import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { getFitbQuestion } from "@/lib/fitb/csv-source";
import { resolveApiKey } from "@/lib/fitb/jev";
import {
  defaultStrictness,
  type FitbMatchResult,
  matchFitb,
  type Strictness,
} from "@/lib/fitb/match";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRICTNESS: Strictness[] = ["semantic", "spelling-sensitive", "exact"];
const MAX_ANSWERS = 12;

interface CheckBody {
  questionId?: unknown;
  /** Optional overrides so an ad-hoc pair can be tried without a bank question. */
  question?: unknown;
  referenceAnswer?: unknown;
  acceptableAnswers?: unknown;
  subject?: unknown;
  grade?: unknown;
  topic?: unknown;
  strictness?: unknown;
  answers?: unknown;
}

/**
 * POST /api/fitb/check
 *
 * Grades one or more candidate student answers for a single blank through the
 * three-tier cascade, and reports what today's grader would have said for each.
 * Answers are graded in parallel; only the ones that reach tier 3 cost a call.
 *
 * The question (and its key) is read from the in-memory CSV bank by id, so this
 * costs nothing before the model call.
 */
export async function POST(request: NextRequest) {
  let body: CheckBody;
  try {
    body = (await request.json()) as CheckBody;
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.", {
      status: 400,
    });
  }

  const answers = Array.isArray(body.answers)
    ? body.answers.map((a) => String(a ?? "")).slice(0, MAX_ANSWERS)
    : [];
  if (answers.length === 0) {
    return apiError(
      "VALIDATION_ERROR",
      "`answers` must be a non-empty array.",
      {
        status: 400,
      },
    );
  }

  const questionId = typeof body.questionId === "string" ? body.questionId : "";
  let question = typeof body.question === "string" ? body.question : "";
  let referenceAnswer =
    typeof body.referenceAnswer === "string" ? body.referenceAnswer : "";
  let acceptableAnswers = Array.isArray(body.acceptableAnswers)
    ? body.acceptableAnswers.map((a) => String(a ?? ""))
    : [];
  let subject = typeof body.subject === "string" ? body.subject : undefined;
  let grade = typeof body.grade === "string" ? body.grade : undefined;
  let topic = typeof body.topic === "string" ? body.topic : undefined;
  let category: string | undefined;
  let explanation: string | undefined;

  // With an id and no overrides, read the blank (and its key) server-side.
  if (questionId && (!question || !referenceAnswer)) {
    const row = getFitbQuestion(questionId);
    if (!row) {
      return apiError("NOT_FOUND", `No question with id ${questionId}.`, {
        status: 404,
      });
    }
    question = question || row.question;
    referenceAnswer = referenceAnswer || row.answer;
    if (acceptableAnswers.length === 0) {
      acceptableAnswers = row.acceptableAnswers;
    }
    subject = subject ?? row.subject;
    grade = grade ?? row.grade;
    topic = topic ?? row.topic;
    category = row.category;
    explanation = row.explanation;
  }

  if (!referenceAnswer.trim()) {
    return apiError(
      "VALIDATION_ERROR",
      "This blank has no answer key, so nothing can be graded against it.",
      { status: 400 },
    );
  }

  const strictness = STRICTNESS.includes(body.strictness as Strictness)
    ? (body.strictness as Strictness)
    : defaultStrictness(subject);

  try {
    const results: FitbMatchResult[] = await Promise.all(
      answers.map((studentAnswer) =>
        matchFitb({
          questionId: questionId || "adhoc",
          question,
          referenceAnswer,
          acceptableAnswers,
          studentAnswer,
          subject,
          grade,
          topic,
          strictness,
        }),
      ),
    );

    const jevCalls = results.filter((r) => r.jevUsed).length;
    const rescued = results.filter(
      (r) => r.verdict === "correct" && !r.legacyCorrect,
    ).length;

    return apiSuccess(
      {
        question,
        referenceAnswer,
        acceptableAnswers,
        strictness,
        results,
        ...(category ? { category } : {}),
        ...(explanation ? { explanation } : {}),
      },
      {
        meta: {
          graded: results.length,
          jevCalls,
          rescued,
          keyConfigured: resolveApiKey().name !== null,
        },
      },
    );
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to grade the answers.",
      { status: 500 },
    );
  }
}
