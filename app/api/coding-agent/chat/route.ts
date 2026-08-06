import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const { messages, html, css, js, selectedCode, challengeInfo } =
      await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid messages format" },
        { status: 400 },
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ reply: "OpenAI API key not configured." });
    }

    const client = new OpenAI({ apiKey });

    // Build the system prompt with context
    let systemPrompt = `You are Noah, an intelligent, encouraging AI coding tutor for kids and teens learning web development.
Your goal is to help the student solve the current web layout challenge.

Challenge Context:
- Title: ${challengeInfo?.title}
- Description: ${challengeInfo?.description}
- Key Concepts: ${challengeInfo?.hintContext}

Current Code Files:
HTML:
\`\`\`html
${html || "(empty)"}
\`\`\`

CSS:
\`\`\`css
${css || "(empty)"}
\`\`\`

JS:
\`\`\`javascript
${js || "(empty)"}
\`\`\`
`;

    if (selectedCode) {
      systemPrompt += `\nThe student has currently highlighted the following specific lines of code in their editor. Focus heavily on this selection if their question relates to it:
\`\`\`
${selectedCode}
\`\`\`
`;
    }

    systemPrompt += `
Rules for your response:
1. Be extremely encouraging and friendly. Use emojis occasionally.
2. NEVER give the exact full solution code. Instead, guide them with pseudocode, hints, or by pointing out bugs.
3. Keep answers relatively short and concise (under 4-5 sentences unless explaining a complex concept).
4. Use markdown formatting for code blocks.
5. If the user asks about something unrelated to coding, gently steer them back to the challenge.`;

    const openAiMessages = [
      { role: "system", content: systemPrompt },
      // Map the incoming messages to OpenAI format (strip out UI-specific context)
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      messages: openAiMessages as any,
      temperature: 0.7,
      max_tokens: 400,
    });

    const reply =
      response.choices[0]?.message.content ??
      "I'm not sure how to respond to that.";

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        reply: "Oops, something went wrong on my end. Try asking again!",
      },
      { status: 500 },
    );
  }
}
