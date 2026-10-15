import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { judgeWrongAnswers, loadWrongAnswers } from "@/lib/mastery/errors";
import {
  ERROR_WINDOW,
  type ErrorJudgement,
  readErrorsByLo,
} from "@/lib/mastery/gap";
import { BAND_SECONDS } from "@/lib/why-wrong/classify";
import { jevConfigured } from "@/lib/why-wrong/jev";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/mastery/errors?student=ID&topic=57[&until=2026-10-15]
 *
 * Jev's read of the student's recent wrong answers on each objective of the
 * topic. Evidence beside the loop's decision — `rules.ts` does not read it.
 * Only the last `ERROR_WINDOW` wrong answers per objective are judged, and
 * judgements are cached, so a reload costs nothing.
 */
export async function GET(request: NextRequest) {
  const student = request.nextUrl.searchParams.get("student")?.trim();
  const topic = Number(request.nextUrl.searchParams.get("topic"));
  const until = request.nextUrl.searchParams.get("until") ?? undefined;
  if (
    !student ||
    !Number.isInteger(topic) ||
    (until !== undefined && Number.isNaN(Date.parse(until)))
  ) {
    return apiError(
      "VALIDATION_ERROR",
      "student and an integer topic are required; until, if given, must be a date.",
      { status: 400 },
    );
  }
  if (!jevConfigured()) {
    return apiError(
      "INTERNAL_ERROR",
      "TYPESAFE_API_KEY is not set, so the wrong answers cannot be read.",
      { status: 503 },
    );
  }

  try {
    const all = await loadWrongAnswers(student, topic, until);
    const wrongByLo = new Map<number, number>();
    const windowByLo = new Map<number, typeof all>();
    for (const answer of all) {
      wrongByLo.set(answer.loId, (wrongByLo.get(answer.loId) ?? 0) + 1);
      const list = windowByLo.get(answer.loId) ?? [];
      list.push(answer);
      windowByLo.set(answer.loId, list.slice(-ERROR_WINDOW));
    }
    const window = [...windowByLo.values()].flat();
    const { judgements, usage } = await judgeWrongAnswers(window);

    const judged: ErrorJudgement[] = window.flatMap((a) => {
      const j = judgements.get(a.tsq);
      if (!j) return [];
      return [
        {
          tsq: a.tsq,
          loId: a.loId,
          sessionId: a.sessionId,
          mode: a.mode,
          at: a.at,
          realGap: j.realGap,
          reason: j.reason,
          tooFast: j.tooFast,
          severity: j.severity,
        },
      ];
    });

    return apiSuccess({
      reads: readErrorsByLo([...wrongByLo.keys()], judged, wrongByLo),
      answers: window.map((a) => ({
        tsq: a.tsq,
        loId: a.loId,
        at: a.at,
        mode: a.mode,
        prompt: a.prompt,
        studentAnswer: a.studentAnswer,
        correctAnswer: a.correctAnswer,
        options: a.options,
        explanation: a.explanation,
        timeTakenMs: a.timeTakenMs,
        // What Jev is told a typical student takes on this difficulty.
        typicalSeconds: BAND_SECONDS[a.band] ?? 55,
        judgement: judgements.get(a.tsq) ?? null,
      })),
      usage,
    });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to read the errors.",
      { status: 500 },
    );
  }
}
