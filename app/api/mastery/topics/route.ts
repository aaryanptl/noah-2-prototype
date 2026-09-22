import type { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/lib/api-response";
import { listStudentTopics } from "@/lib/mastery/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/mastery/topics?student=ID — topics this student has completed sessions on. */
export async function GET(request: NextRequest) {
  const student = request.nextUrl.searchParams.get("student")?.trim();
  if (!student) {
    return apiError("VALIDATION_ERROR", "student is required.", {
      status: 400,
    });
  }
  try {
    const topics = await listStudentTopics(student);
    return apiSuccess({ student, topics });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load topics.",
      { status: 500 },
    );
  }
}
