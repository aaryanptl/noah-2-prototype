import { NextResponse } from "next/server"
import { enrichPlanItemsWithTeachingContent } from "@/lib/learning-plan/content"
import type { DemoStudent, PlanItem, QuestionGuideline } from "@/lib/learning-plan/types"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Structured generation over many classes can take 20–60s.
export const maxDuration = 300

export async function POST(request: Request) {
  let body: {
    student?: DemoStudent
    items?: PlanItem[]
    guidelines?: QuestionGuideline[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.student || !Array.isArray(body.items)) {
    return NextResponse.json(
      { error: "student and items are required" },
      { status: 400 }
    )
  }

  try {
    const result = await enrichPlanItemsWithTeachingContent({
      student: body.student,
      items: body.items,
      guidelines: Array.isArray(body.guidelines) ? body.guidelines : [],
    })

    return NextResponse.json({
      items: result.items,
      source: result.source,
    })
  } catch (error) {
    console.error("[LPB generate-content] failed:", error)
    return NextResponse.json(
      { error: "Failed to generate teaching content" },
      { status: 500 }
    )
  }
}
