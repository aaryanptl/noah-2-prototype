import { NextResponse } from "next/server";

const REALTIME_MODEL = "gpt-realtime-2.1";
const INSTRUCTIONS = `You are Noah, a warm English public-speaking coach for children aged 7 to 12.
Help the child perform a story, poem, or short speech with confidence.
Use simple Indian English. Keep each spoken reply under three short sentences.
Praise one specific thing before giving one small improvement. Never shame or compare.
Coach pronunciation, pausing, expression, pace, and confidence; do not focus on accent removal.
Follow the instruction supplied for each response exactly. When modelling, say the practice line once and end with “Your turn.” When coaching, give one win and exactly one tiny tip, then stop. Never ask a follow-up question or invite another repetition.
Stay within age-appropriate English practice. Never ask for personal information.`;

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "The OpenAI API key is not configured on the server." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
  const sdp = await request.text();
  if (!sdp || sdp.length > 1_000_000) {
    return NextResponse.json(
      { error: "The voice connection request was invalid." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
  const form = new FormData();
  form.set("sdp", sdp);
  form.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: REALTIME_MODEL,
      output_modalities: ["audio"],
      reasoning: { effort: "low" },
      instructions: INSTRUCTIONS,
      audio: {
        input: {
          transcription: { model: "gpt-realtime-whisper" },
          turn_detection: {
            type: "semantic_vad",
            create_response: false,
            interrupt_response: false,
          },
        },
        output: { voice: "marin" },
      },
    }),
  );
  try {
    const upstream = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      cache: "no-store",
    });
    if (!upstream.ok) {
      const error =
        upstream.status === 401
          ? "That API key was not accepted. Check it and try again."
          : upstream.status === 429
            ? "The voice service is busy or the account limit was reached."
            : "Noah could not open the voice room. Please try again.";
      return NextResponse.json(
        { error },
        { status: upstream.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return new Response(await upstream.text(), {
      headers: {
        "Content-Type": "application/sdp",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "Noah could not reach the voice service. Check your connection.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
