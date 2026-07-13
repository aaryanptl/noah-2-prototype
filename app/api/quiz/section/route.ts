import { NextResponse } from "next/server";

import {
  DEFAULT_DIAGNOSTIC_REGION,
  DIAGNOSTIC_REGIONS,
  getDiagnosticQuizCatalog,
  getGradeQuizForClient,
  getMultiTopicQuizForClient,
  getPlacementQuizForClient,
  getTopicQuizForClient,
} from "@/agents/diagnostic/tools/contentQuiz";
import type {
  ClassLevel,
  DiagnosticRegion,
  Subject,
} from "@/agents/diagnostic/types/index";
import { getTopicTestQuestionCount } from "@/lib/quiz-counts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      studentId?: string;
      subject?: string;
      classLevel?: string;
      topic?: string;
      topics?: string[];
      testMode?: string;
      maxQuestions?: number;
      region?: string;
    };

    const studentId = body.studentId?.trim() || "Riya Sharma";
    const testMode =
      body.testMode === "placement"
        ? "placement"
        : body.testMode === "multi_topic"
          ? "multi_topic"
          : body.testMode === "grade"
            ? "grade"
            : "topic";
    const region = DIAGNOSTIC_REGIONS.includes(body.region as DiagnosticRegion)
      ? (body.region as DiagnosticRegion)
      : DEFAULT_DIAGNOSTIC_REGION;

    if (testMode === "placement") {
      if (!body.subject || !body.classLevel) {
        return NextResponse.json(
          { error: "subject and classLevel are required for placement test." },
          { status: 400 },
        );
      }

      const quiz = await getPlacementQuizForClient({
        studentId,
        subject: body.subject as Subject,
        classLevel: body.classLevel as ClassLevel,
      });

      return NextResponse.json({ quiz });
    }

    if (testMode === "grade") {
      if (!body.subject || !body.classLevel) {
        return NextResponse.json(
          { error: "subject and classLevel are required for grade test." },
          { status: 400 },
        );
      }

      const quiz = await getGradeQuizForClient({
        studentId,
        subject: body.subject as Subject,
        classLevel: body.classLevel as ClassLevel,
        region,
      });

      return NextResponse.json({ quiz });
    }

    if (testMode === "multi_topic") {
      if (!body.subject || !body.classLevel) {
        return NextResponse.json(
          {
            error:
              "subject and classLevel are required for a multi-topic test.",
          },
          { status: 400 },
        );
      }

      const quiz = await getMultiTopicQuizForClient({
        studentId,
        subject: body.subject as Subject,
        classLevel: body.classLevel as ClassLevel,
        topics: Array.isArray(body.topics) ? body.topics : [],
        maxQuestions: Number(body.maxQuestions) || 0,
        region,
      });

      return NextResponse.json({ quiz });
    }

    const catalog = await getDiagnosticQuizCatalog();
    const entry = catalog.entries.find(
      (item) =>
        item.subject === body.subject &&
        item.classLevel === body.classLevel &&
        item.topic === body.topic,
    );

    if (!entry) {
      return NextResponse.json(
        { error: "The selected diagnostic quiz was not found." },
        { status: 400 },
      );
    }

    const quiz = await getTopicQuizForClient({
      studentId,
      subject: entry.subject,
      classLevel: entry.classLevel,
      topic: entry.topic,
      maxQuestions: getTopicTestQuestionCount(entry.learningObjectives.length),
      region,
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load quiz.",
      },
      { status: 400 },
    );
  }
}
