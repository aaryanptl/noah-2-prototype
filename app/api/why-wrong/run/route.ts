import { apiError, apiSuccess } from "@/lib/api-response";
import { classifyRun } from "@/lib/why-wrong/classify";
import { loadSession } from "@/lib/why-wrong/evidence";
import { jevConfigured } from "@/lib/why-wrong/jev";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * GET /api/why-wrong/run?session=123
 *
 * The session's real first responses, plus one Jev judgement per answered
 * question. The replay itself is done in the browser from `lib/why-wrong/ladder`
 * so the policy can be retuned without another model call — the judgements are
 * evidence, the policy is a setting.
 */
export async function GET(request: Request) {
  const sessionId = Number(
    new URL(request.url).searchParams.get("session") ?? "",
  );
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    return apiError("VALIDATION_ERROR", "A numeric `session` is required.");
  }

  try {
    const run = await loadSession(sessionId);
    if (run === null) {
      return apiError("NOT_FOUND", `Session ${sessionId} was not found.`, {
        status: 404,
      });
    }
    if (run.questions.length === 0) {
      return apiError(
        "NOT_FOUND",
        `Session ${sessionId} has no answered questions.`,
        { status: 404 },
      );
    }

    if (!jevConfigured()) {
      return apiError(
        "INTERNAL_ERROR",
        "TYPESAFE_API_KEY is not set, so no judgements can be made.",
        { status: 503 },
      );
    }

    const classified = await classifyRun(run.questions);
    return apiSuccess({
      session: run.session,
      questions: run.questions,
      judgements: classified.judgements,
      usage: {
        model: classified.model,
        inputTokens: classified.inputTokens,
        outputTokens: classified.outputTokens,
        requests: classified.requests,
        ms: classified.ms,
      },
    });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to build the replay.",
      { status: 500 },
    );
  }
}
