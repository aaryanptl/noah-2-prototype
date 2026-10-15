import type { NextRequest } from "next/server";

import { apiError } from "@/lib/api-response";
import { matchFitb } from "@/lib/fitb/match";
import {
  buildState,
  CORRECT_QUESTIONS,
  classifyOne,
  WRONG_QUESTIONS,
} from "@/lib/why-wrong/classify";
import { getPracticeRow } from "@/lib/why-wrong/csv-source";
import type { AnsweredQuestion } from "@/lib/why-wrong/evidence";
import { jevConfigured } from "@/lib/why-wrong/jev";
import type { Verdict } from "@/lib/why-wrong/ladder";
import type { GradeDetail, PracticeEvent } from "@/lib/why-wrong/practice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AnswerBody {
  id?: unknown;
  /** null or "" is a skip. */
  answer?: unknown;
  timeTakenMs?: unknown;
  ordinal?: unknown;
}

const FITB_VERDICT: Record<string, Verdict> = {
  correct: "correct",
  // Too close to call: neither a clean right nor a clean wrong.
  review: "partial",
  incorrect: "incorrect",
};

/**
 * POST /api/why-wrong/practice/answer
 *   { id, answer, timeTakenMs, ordinal }
 *
 * Grades one live answer and asks Jev why it went the way it did, streaming
 * each step as NDJSON so the page can show the working. The ladder decision is
 * made in the browser from `lib/why-wrong/ladder`, exactly as the replay page
 * does — the judgement is evidence, the policy is a setting.
 */
export async function POST(request: NextRequest) {
  let body: AnswerBody;
  try {
    body = (await request.json()) as AnswerBody;
  } catch {
    return apiError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }

  const id = typeof body.id === "string" ? body.id : "";
  const row = id ? getPracticeRow(id) : null;
  if (!row) {
    return apiError("NOT_FOUND", `No question with id ${id || "(none)"}.`, {
      status: 404,
    });
  }
  const studentAnswer = typeof body.answer === "string" ? body.answer : "";
  const timeTakenMs =
    typeof body.timeTakenMs === "number" && Number.isFinite(body.timeTakenMs)
      ? Math.max(0, Math.round(body.timeTakenMs))
      : null;
  const ordinal =
    typeof body.ordinal === "number" && Number.isInteger(body.ordinal)
      ? body.ordinal
      : 1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PracticeEvent) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      const started = Date.now();

      try {
        /* 1 — grade ------------------------------------------------------ */
        send({ kind: "step", step: "grade", status: "running" });
        const gradeStarted = Date.now();
        let grade: GradeDetail;

        if (studentAnswer.trim() === "") {
          grade = {
            type: row.type,
            verdict: "non_attempt",
            how: "Nothing was given, so this counts as a skip.",
          };
        } else if (row.type === "mcq") {
          const picked = row.options.find(
            (o) => o.text.trim() === studentAnswer.trim(),
          );
          grade = {
            type: "mcq",
            verdict: picked?.correct ? "correct" : "incorrect",
            how: picked?.correct
              ? "The option picked is the one marked correct."
              : "The option picked is one of the distractors.",
          };
        } else {
          const match = await matchFitb({
            questionId: row.id,
            question: row.question,
            referenceAnswer: row.answer,
            acceptableAnswers: row.acceptableAnswers,
            studentAnswer,
            subject: row.subject,
            grade: row.grade,
            topic: row.topic,
          });
          grade = {
            type: "fitb",
            verdict: FITB_VERDICT[match.verdict] ?? "incorrect",
            how: match.reason,
            tier: match.tier,
            probability: match.probability,
          };
        }
        send({
          kind: "step",
          step: "grade",
          status: "done",
          ms: Date.now() - gradeStarted,
          grade,
        });

        /* 2 — evidence --------------------------------------------------- */
        const answered: AnsweredQuestion = {
          ordinal,
          questionType: row.type,
          band: row.band,
          bloom: row.bloom,
          topic: row.topic,
          grade: row.grade,
          objectiveName: row.learningObjective || row.subtopic || "—",
          prompt: row.question,
          options: row.options,
          correctAnswer: row.answer,
          modelAnswer: null,
          explanation: row.explanation,
          studentAnswer,
          timeTakenMs,
          verdict: grade.verdict,
        };
        send({
          kind: "step",
          step: "evidence",
          status: "done",
          ms: 0,
          state: buildState(answered),
        });

        /* 3 — Jev -------------------------------------------------------- */
        let judgement = null;
        if (grade.verdict === "non_attempt") {
          send({
            kind: "step",
            step: "jev",
            status: "skipped",
            note: "A skip has no answer to read a reason from, so Jev is not asked.",
          });
        } else if (!jevConfigured()) {
          send({
            kind: "step",
            step: "jev",
            status: "error",
            note: "TYPESAFE_API_KEY is not set, so today's rule is used.",
          });
        } else {
          const wrong = grade.verdict !== "correct";
          const asked = Object.entries(
            wrong ? WRONG_QUESTIONS : CORRECT_QUESTIONS,
          ).map(([key, q]) => ({
            key,
            type: q.type,
            instructions: q.instructions,
          }));
          send({
            kind: "step",
            step: "jev",
            status: "running",
            ask: { asked },
          });

          const jevStarted = Date.now();
          const res = await classifyOne(answered);
          judgement = res.judgement;
          send({
            kind: "step",
            step: "jev",
            status: res.judgement.error ? "error" : "done",
            ms: Date.now() - jevStarted,
            note: res.judgement.error ?? undefined,
            jev: {
              model: res.model,
              inputTokens: res.inputTokens,
              outputTokens: res.outputTokens,
            },
          });
        }

        /* result --------------------------------------------------------- */
        send({
          kind: "result",
          verdict: grade.verdict,
          studentAnswer,
          correctAnswer: row.answer,
          explanation: row.explanation,
          options: row.options,
          judgement,
          totalMs: Date.now() - started,
        });
      } catch (error) {
        send({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Unable to read the answer.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
