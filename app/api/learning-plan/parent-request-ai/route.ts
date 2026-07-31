import { NextResponse } from "next/server"
import OpenAI from "openai"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { requestedTopicName, prerequisites, studentName } = body

    if (!requestedTopicName) {
      return NextResponse.json(
        { error: "requestedTopicName is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        requestedTopicName,
        hasPrerequisites: prerequisites && prerequisites.length > 0,
        prerequisiteNames: prerequisites || [],
        aiExplanation: `To ensure ${studentName || "the student"} succeeds in ${requestedTopicName}, foundational prerequisites (${(prerequisites || []).join(", ")}) are scheduled first as compressed refreshers before starting ${requestedTopicName}.`,
        provider: "fallback-local",
      })
    }

    const openai = new OpenAI({ apiKey })
    const prompt = `
You are an expert AI Curriculum Strategist for Grade 5 Mathematics.
A parent has requested that student "${studentName || "the student"}" start their learning plan with the topic "${requestedTopicName}".
However, the student has unmet prerequisite topics: ${JSON.stringify(prerequisites || [])}.

Provide a clear, professional 2-3 sentence AI curriculum explanation to the parent and teacher explaining:
1. Acknowledging the requested starting topic "${requestedTopicName}".
2. Explaining why prerequisite topics (${(prerequisites || []).join(", ")}) must be covered first as compressed refreshers.
3. Reassuring that ${requestedTopicName} will start immediately after these quick refreshers, followed by the rest of the curriculum sequence.
`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a friendly, highly competent AI Education Assistant for Noah 2.0.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 250,
    })

    const aiExplanation =
      response.choices[0]?.message?.content?.trim() ||
      `Prerequisites (${(prerequisites || []).join(", ")}) are scheduled first as compressed refreshers before starting ${requestedTopicName}.`

    return NextResponse.json({
      requestedTopicName,
      hasPrerequisites: prerequisites && prerequisites.length > 0,
      prerequisiteNames: prerequisites || [],
      aiExplanation,
      provider: "openai-gpt-4o-mini",
    })
  } catch (error) {
    console.error("Parent Request AI API error:", error)
    return NextResponse.json(
      {
        error: "AI call failed",
        aiExplanation:
          "Prerequisite refreshers have been automatically scheduled before the requested topic.",
      },
      { status: 500 }
    )
  }
}
