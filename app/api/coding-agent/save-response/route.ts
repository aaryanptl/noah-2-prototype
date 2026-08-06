import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeStudentName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function displayStudentName(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "Student";
}

function mapClassLevel(level: string): string {
  const cleaned = level.toLowerCase().trim();
  if (cleaned.includes("kg") || cleaned === "classkg") return "kg";
  const numMatch = cleaned.match(/\d+/);
  if (numMatch) return numMatch[0];
  return "1"; // default fallback
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      studentName = "Riya Sharma",
      classLevel = "1",
      challengeId,
      challengeTitle,
      buffers,
      goalsMet = {},
      matchPct = 0,
      stoppedBecause = "updating",
      topic = "HTML",
    } = body;

    const studentDisplayName = displayStudentName(studentName);
    const normalizedName = normalizeStudentName(studentDisplayName);
    const grade = mapClassLevel(classLevel);

    // 1. Ensure student exists in public.diagnostic_students
    const studentResult = await query(
      `
      INSERT INTO public.diagnostic_students (
        display_name,
        normalized_name,
        current_class_level,
        updated_at
      )
      VALUES ($1, $2, $3, now())
      ON CONFLICT (normalized_name)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        current_class_level = EXCLUDED.current_class_level,
        updated_at = now()
      RETURNING id
      `,
      [studentDisplayName, normalizedName, grade]
    );

    const studentDbId = studentResult.rows[0].id;

    // 2. Insert record in public.diagnostic_assessments
    const assessmentResult = await query(
      `
      INSERT INTO public.diagnostic_assessments (
        student_id,
        student_display_name,
        test_mode,
        subject,
        class_level,
        region,
        topic,
        readiness_score,
        attempted_readiness_score,
        overall_readiness_score,
        non_attempt_count,
        max_questions,
        total_questions_shown,
        question_bank_size,
        stopped_because,
        expected_learning_objectives,
        topic_results,
        learning_objective_results,
        subtopic_results,
        bloom_results,
        lesson_plan,
        distractor_insights,
        next_steps,
        engagement_gaps,
        behavioral_patterns,
        report_json,
        ai_summary
      )
      VALUES (
        $1, $2, 'solo', 'coding', $3, 'US', $4, $5, $6, $7, 
        0, 1, 1, 1, $8, 
        '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 
        '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
        $9::jsonb, $10
      )
      RETURNING id
      `,
      [
        studentDbId,
        studentDisplayName,
        grade,
        topic,
        matchPct,
        matchPct, // attempted_readiness_score
        matchPct, // overall_readiness_score
        stoppedBecause,
        JSON.stringify({
          challengeId,
          challengeTitle,
          buffers,
          goalsMet,
          matchPct,
          submittedAt: new Date().toISOString()
        }),
        `Solo coding challenge "${challengeTitle}" updated with ${matchPct}% similarity.`
      ]
    );

    return NextResponse.json({
      success: true,
      assessmentId: assessmentResult.rows[0].id,
      studentId: studentDbId,
    });
  } catch (error: any) {
    console.error("Failed to save solo response:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
