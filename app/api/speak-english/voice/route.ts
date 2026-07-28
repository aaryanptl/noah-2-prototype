import OpenAI from "openai";

const openai = new OpenAI();
const MAX_TEXT_LENGTH = 4_000;

export async function POST(request: Request) {
  const { text } = await request.json().catch(() => ({}));
  const input = String(text ?? "").trim();

  if (!input || input.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { error: "The practice text is missing or too long." },
      { status: 400 },
    );
  }

  try {
    const speech = await openai.audio.speech.create({
      model: "tts-1",
      voice: "nova",
      input,
      response_format: "mp3",
    });

    return new Response(await speech.arrayBuffer(), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json(
      { error: "Noah could not prepare the audio. Please try again." },
      { status: 502 },
    );
  }
}
