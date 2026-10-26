import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { html, css, js, ok, challengeTitle, challengeDesc } =
      await request.json();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        explanation:
          "Noah is offline right now. Try examining your preview and comparing it with the target!",
      });
    }

    const client = new OpenAI({ apiKey });

    const prompt = `You are Noah, a friendly coding tutor for school students.
A student is working on the web challenge: "${challengeTitle}"
Challenge Goal: ${challengeDesc}

Student files:
- HTML:
${html || "(empty)"}
- CSS:
${css || "(empty)"}
- JS:
${js || "(empty)"}

Status: ${ok ? "All goals matched! ✅" : "Some goals are not yet met. ❌"}

Explain in exactly 2 short, simple sentences what is happening.
${ok ? "Briefly congratulate them and explain what their webpage achieved." : "Identify what's missing and suggest exactly what they should do next."}
Keep it under 30 words. Use friendly language suitable for a 12-year-old.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.4,
    });

    const explanation =
      response.choices[0]?.message.content?.trim() ??
      "Looks good! Keep experimenting.";
    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("Explain error:", error);
    return NextResponse.json({
      explanation:
        "Try reading your tags and styles out loud — that helps catch bugs!",
    });
  }
}
