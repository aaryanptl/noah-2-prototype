import { NextResponse } from "next/server"
import { getTopicDefaultsForGrade } from "@/lib/curriculum-defaults"
import pool from "@/lib/db"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const topicDefaults = await getTopicDefaultsForGrade("Grade 5", "Mathematics", {
      approvedOnly: false,
    })

    if (!topicDefaults || topicDefaults.length === 0) {
      return NextResponse.json({ topics: [], source: "none" })
    }

    const dbTopics = topicDefaults.map((topic, index) => {
      const numericId = parseInt(topic.topicId, 10) || 300 + index
      const priority =
        topic.gradePriority <= 1
          ? "high"
          : topic.gradePriority === 2
            ? "medium"
            : "low"

      return {
        id: numericId,
        sequence: index + 1,
        name: topic.topicName,
        family: topic.subject || "Mathematics",
        priority,
        prerequisiteIds: index > 0 ? [parseInt(topicDefaults[index - 1].topicId, 10) || 300 + index - 1] : [],
        idealClasses: topic.idealClasses || 5,
        idealActivities: topic.idealActivities || 20,
        easyPercent: 60,
        practicePercent: 40,
        reason: `Grade 5 DB topic (Priority ${topic.gradePriority}).`,
        learningObjectives: topic.objectives.map((obj, objIdx) => ({
          id: obj.objectiveId || `${numericId}-${objIdx + 1}`,
          subtopic: topic.topicName,
          text: obj.name,
        })),
        questionGuidelines: topic.objectives
          .filter((obj) => obj.starterQuestion || obj.masterQuestion)
          .map((obj) => ({
            topicId: numericId,
            learningObjectiveId: obj.objectiveId,
            starter: obj.starterQuestion || "Starter sample question",
            master: obj.masterQuestion || "Master sample question",
          })),
      }
    })

    return NextResponse.json({ topics: dbTopics, source: "database" })
  } catch (error) {
    console.error("Failed to fetch Grade 5 topics from DB:", error)
    return NextResponse.json(
      { error: "Database query failed", source: "fallback" },
      { status: 500 }
    )
  }
}
