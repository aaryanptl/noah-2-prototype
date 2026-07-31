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

    const hasPrereqs = prerequisites && prerequisites.length > 0
    const fallbackText = hasPrereqs
      ? `Starting with ${requestedTopicName} as requested. Prerequisites (${prerequisites.join(", ")}) are scheduled first as 3-class compressed refreshers.`
      : `Starting directly with ${requestedTopicName} as requested, followed by the remaining Grade 5 curriculum sequence.`

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        requestedTopicName,
        hasPrerequisites: hasPrereqs,
        prerequisiteNames: prerequisites || [],
        aiExplanation: fallbackText,
        provider: "fallback-local",
      })
    }

    const openai = new OpenAI({ apiKey })
    const prompt = `
You are a direct, concise AI Curriculum Engine for Grade 5 Mathematics.
Generate a single, direct 1-2 sentence curriculum note for student "${studentName || "the student"}".
Requested starting topic: "${requestedTopicName}".
Prerequisite topics: ${JSON.stringify(prerequisites || [])}.

CRITICAL RULES:
- DO NOT include any greetings like "Dear Parent", "Dear Teacher", or "Thank you for your request".
- DO NOT include conversational filler like "Rest assured", "We are pleased to inform", or "To ensure success".
- Be 100% direct and factual. State what topic starts first and what prerequisites (if any) are scheduled before it.
- Keep the response strictly under 30 words.
`

    const response = await openai.chat.completions.create({
      model: "gpt-5.6-luna",
      messages: [
        {
          role: "system",
          content: "You are a concise AI engine. Output only direct, clear curriculum facts without greetings or pleasantries.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 100,
    })

    const aiExplanation =
      response.choices[0]?.message?.content?.trim() || fallbackText

    return NextResponse.json({
      requestedTopicName,
      hasPrerequisites: prerequisites && prerequisites.length > 0,
      prerequisiteNames: prerequisites || [],
      aiExplanation,
      provider: "openai-gpt-5.6-luna",
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
