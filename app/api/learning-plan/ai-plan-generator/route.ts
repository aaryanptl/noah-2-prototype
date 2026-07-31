import { NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { student, topics } = body

    if (!student || !topics || !Array.isArray(topics)) {
      return NextResponse.json(
        { error: "student and topics are required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        strategy: "Standard curriculum allocation based on available package capacity.",
        evidenceSummary: [
          `Package capacity: ${student.classesRemaining || 40} classes`,
          `${student.completedTopics?.length || 0} completed topics excluded`,
        ],
        recommendations: [],
        provider: "fallback-local",
      })
    }

    const openai = new OpenAI({ apiKey })
    const prompt = `
You are an expert AI Maths Curriculum Strategist for Grade 5 Mathematics.
Analyze this student profile and live Grade 5 DB curriculum:

Student Name: ${student.name}
Grade: Grade 5
Classes Remaining: ${student.classesRemaining}
Placement Status: ${student.placementStatus}
Placement Scores: ${JSON.stringify(student.placementResults || [])}
Mastery Evidence: ${JSON.stringify(student.objectiveEvidence || [])}
Parent Requested Topic ID: ${student.parentRequestedTopicId || "None"}

Live DB Curriculum Topics:
${JSON.stringify(
  topics.map((t: any) => ({
    id: t.id,
    name: t.name,
    priority: t.priority,
    idealClasses: t.idealClasses,
    idealActivities: t.idealActivities,
  }))
)}

Instructions:
1. Provide a 2-3 sentence AI learning strategy summary explaining how topics are scoped for ${student.name} based on capacity (${student.classesRemaining} classes) and evidence.
2. For each topic, indicate if it should be included, skipped (due to prior mastery), or deferred (due to capacity).
Return ONLY a valid JSON object in this exact format:
{
  "strategy": "AI strategy prose here...",
  "evidenceSummary": ["Summary point 1", "Summary point 2", "Summary point 3"],
  "recommendations": [
    {
      "topicId": 313,
      "decision": "include",
      "reason": "High priority topic required for Grade 5."
    }
  ]
}
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly, expert AI Education Assistant for Noah 2.0. Always return strictly valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    })

    const content = response.choices[0]?.message?.content || "{}"
    const parsedData = JSON.parse(content)

    return NextResponse.json({
      strategy: parsedData.strategy || "AI learning plan strategy generated.",
      evidenceSummary: parsedData.evidenceSummary || [
        `${student.placementResults?.length || 0} placement topic scores evaluated`,
        `${student.objectiveEvidence?.length || 0} mastery observations analyzed`,
      ],
      recommendations: parsedData.recommendations || [],
      provider: "openai-gpt-4o-mini",
    })
  } catch (error) {
    console.error("AI Plan Generator API error:", error)
    return NextResponse.json(
      { error: "AI call failed", strategy: "Fallback strategy applied." },
      { status: 500 }
    )
  }
}
