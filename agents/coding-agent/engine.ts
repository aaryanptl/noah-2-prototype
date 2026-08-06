import OpenAI from "openai";

import {
  type CodingChallenge,
  getCodingChallengeById,
} from "@/agents/coding-agent/challenges";

export type DebuggerHintPayload = {
  sessionId?: string;
  challengeId?: number;
  age?: number;
  code?: string;
  html?: string;
  css?: string;
  js?: string;
  question?: string;
  hintHistory?: string[];
  pairNudge?: boolean; // flag for sharper prompt in editor bubble
};

export type DebuggerHintResult = {
  hint: string | null;
};

export type DebuggerRunPayload = {
  challengeId?: number;
  html?: string;
  css?: string;
  js?: string;
};

export type DebuggerRunResult = {
  ok: boolean;
  output: string;
  error: string;
  passedCount: number;
  totalCount: number;
};

// Memory cache for generated AI scaffolds if needed
const scaffoldCache: Record<string, any> = {};

export async function runDebuggerHint(
  payload: DebuggerHintPayload,
): Promise<DebuggerHintResult> {
  const challenge = getCodingChallengeById(Number(payload.challengeId ?? 0));
  if (!challenge) {
    return { hint: "Pick a challenge first." };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback static hint from database
    const fallback =
      challenge.hints[payload.hintHistory?.length ?? 0] ?? challenge.hints[0];
    return {
      hint: fallback ? fallback.text : "Double check the goals on the left!",
    };
  }

  const client = new OpenAI({ apiKey });
  const html =
    payload.html ??
    (payload.code && payload.code.includes("<html>") ? payload.code : "");
  const css = payload.css ?? "";
  const js = payload.js ?? "";
  const age = payload.age ?? 13;

  // For silent/short in-editor nudges (Pair Mode Fox Bubble)
  if (payload.pairNudge) {
    try {
      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `You are an encouraging AI coding partner giving a tiny, friendly in-editor suggestion to a student.
Challenge: ${challenge.title} (${challenge.difficulty})
Lesson: ${challenge.lesson}
Goal: ${challenge.desc}
Goals list: ${challenge.goals.map((g) => g.label).join(", ")}

Current code buffers:
HTML:
${html || "(empty)"}
CSS:
${css || "(empty)"}
JS:
${js || "(empty)"}

Previous hints given: ${(payload.hintHistory ?? []).join("; ")}

Rules:
1. Suggest the next tiny thing the student needs to write in one of their file tabs.
2. Reply with EXACTLY ONE short sentence, max 12 words.
3. Do NOT give the full solution.
4. Plain text only — no markdown, no quotes.`,
          },
        ],
        max_tokens: 35,
        temperature: 0.3,
      });
      return { hint: resp.choices[0]?.message.content?.trim() ?? null };
    } catch {
      return { hint: challenge.hints[0]?.text ?? null };
    }
  }

  // General hint popup (Hint Button)
  try {
    const prompt = `You are Noah, an intelligent, encouraging AI web tutor helping a student of age ${age}.
Challenge: "${challenge.title}"
Goal: ${challenge.desc}
Goals checklist:
${challenge.goals.map((g) => `- ${g.label}`).join("\n")}

Student current files:
- HTML:
${html || "(empty)"}
- CSS:
${css || "(empty)"}
- JS:
${js || "(empty)"}

Previous hints:
${(payload.hintHistory ?? []).map((h) => `- ${h}`).join("\n") || "- none"}

Student question: ${payload.question || "Give me a hint"}

Rules:
1. Point to the next logical step in HTML, CSS, or JS.
2. Do not write full solutions.
3. Be encouraging, short, and friendly (max 25 words).
4. No markdown blocks.`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.6,
    });

    return { hint: response.choices[0]?.message.content?.trim() ?? null };
  } catch (error) {
    const fallback =
      challenge.hints[payload.hintHistory?.length ?? 0] ?? challenge.hints[0];
    return { hint: fallback ? fallback.text : "Try checking your syntax!" };
  }
}

export async function runStudentCode(
  payload: DebuggerRunPayload,
): Promise<DebuggerRunResult> {
  // Client side evaluates the actual matching, this endpoint acts as a validation stub
  return {
    ok: true,
    output: "Compilation successful. Render complete.",
    error: "",
    passedCount: 0,
    totalCount: 0,
  };
}

export async function generateCodeLabScaffold(
  challenge: CodingChallenge,
  mode: "pair" | "guide",
) {
  // Web Lab uses static files & steps defined directly inside challenges.ts.
  // We keep this stub if the api ever requests it.
  if (mode === "guide") {
    return { steps: challenge.demo?.guide ?? [] };
  }
  return { scaffold: challenge.files[mode] };
}
