import { NextResponse } from "next/server";
import { moderateTranscript, sanitizeTranscript } from "@/lib/speech-guardrails";
import { query } from "@/lib/db";

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS public.speaking_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      child_name text NOT NULL DEFAULT 'anonymous',
      practice_id text NOT NULL,
      transcript text NOT NULL,
      was_moderated boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawTranscript = String(body?.transcript ?? "").trim();
    const practiceId = String(body?.practiceId ?? "story");
    const childName = String(body?.childName ?? "anonymous");

    if (!rawTranscript) {
      return NextResponse.json(
        { ok: false, error: "No transcript provided." },
        { status: 400 },
      );
    }

    const sanitized = sanitizeTranscript(rawTranscript);
    if (sanitized.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Transcript was empty after sanitization." },
        { status: 400 },
      );
    }

    const { approved, flagged, categories } =
      await moderateTranscript(sanitized);

    if (!approved) {
      return NextResponse.json(
        {
          ok: false,
          error: "Transcript was rejected by content safety checks.",
          flagged,
          categories,
        },
        { status: 422 },
      );
    }

    await ensureTable();

    await query(
      `INSERT INTO public.speaking_attempts (child_name, practice_id, transcript, was_moderated, created_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [childName, practiceId, sanitized],
    );

    return NextResponse.json({
      ok: true,
      transcript: sanitized,
      moderated: true,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not save transcript.";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
