import { NextResponse } from "next/server";

import { runDiagnostic } from "@/agents/diagnostic/diagnosticAgent";
import { generatePlacementAIInsights } from "@/agents/diagnostic/placementTopicInsights";
import { generateResultNarrative } from "@/agents/diagnostic/resultNarrative";
import {
  DEFAULT_DIAGNOSTIC_REGION,
  DIAGNOSTIC_REGIONS,
} from "@/agents/diagnostic/tools/contentQuiz";
import type { DiagnosticRegion } from "@/agents/diagnostic/types/index";
import { saveDiagnosticResult } from "@/lib/diagnostic-results-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string;
      testMode?: string;
      subject?: string;
      classLevel?: string;
      topic?: string | null;
      topics?: string[];
      maxQuestions?: number;
      region?: string;
      parentAssessmentId?: string;
      answers?: Array<{
        questionId?: string;
        answer?: string;
        timeTakenMs?: number;
        allocatedTimeMs?: number;
        wasAutoSkipped?: boolean;
      }>;
    };

    const answerMap = new Map(
      (body.answers ?? []).map((item) => [
        String(item.questionId ?? ""),
        {
          answer: String(item.answer ?? ""),
          timeTakenMs: Number(item.timeTakenMs) || 0,
          allocatedTimeMs: Number(item.allocatedTimeMs) || 0,
          wasAutoSkipped: item.wasAutoSkipped === true,
        },
      ]),
    );

    const testMode =
      body.testMode === "placement"
        ? "placement"
        : body.testMode === "multi_topic"
          ? "multi_topic"
          : body.testMode === "grade"
            ? "grade"
            : body.testMode === "recurring"
              ? "recurring"
              : "topic";
    const region = DIAGNOSTIC_REGIONS.includes(body.region as DiagnosticRegion)
      ? (body.region as DiagnosticRegion)
      : DEFAULT_DIAGNOSTIC_REGION;

    const diagnosticReport = await runDiagnostic({
      studentId: body.studentId?.trim() || "Riya Sharma",
      testMode,
      region: testMode === "placement" ? undefined : region,
      subject: body.subject as never,
      classLevel: body.classLevel as never,
      topic: body.topic ?? "",
      topics: Array.isArray(body.topics) ? body.topics : undefined,
      maxQuestions: Number(body.maxQuestions) || 1,
      questionIds: (body.answers ?? [])
        .map((item) => String(item.questionId ?? ""))
        .filter(Boolean),
      onQuestion: async (question) =>
        answerMap.get(question.id) ?? {
          answer: "",
          timeTakenMs: 0,
          allocatedTimeMs: 0,
          wasAutoSkipped: false,
        },
    });

    // Override mode to 'recurring' so it's stored correctly in the DB
    const reportToSave =
      testMode === "recurring"
        ? { ...diagnosticReport, mode: "recurring" as never }
        : diagnosticReport;

    const [resultNarrative, placementAIInsights] = await Promise.all([
      testMode === "placement"
        ? Promise.resolve(undefined)
        : generateResultNarrative(diagnosticReport).catch((error) => {
            console.error("generateResultNarrative failed", error);
            return undefined;
          }),
      testMode === "placement"
        ? generatePlacementAIInsights(diagnosticReport).catch((error) => {
            console.error("generatePlacementAIInsights failed", error);
            return undefined;
          })
        : Promise.resolve(undefined),
    ]);
    const report = {
      ...reportToSave,
      ...(resultNarrative ? { resultNarrative } : {}),
      ...(placementAIInsights
        ? {
            placementTopicInsights: placementAIInsights.topics,
            placementPlanInsights: placementAIInsights.placementPlanInsights,
          }
        : {}),
    };
    const { progressComparison, ...storedResult } = await saveDiagnosticResult(
      report,
      { parentAssessmentId: body.parentAssessmentId },
    );

    return NextResponse.json({
      report: { ...report, progressComparison },
      ...storedResult,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to submit quiz.",
      },
      { status: 400 },
    );
  }
}
