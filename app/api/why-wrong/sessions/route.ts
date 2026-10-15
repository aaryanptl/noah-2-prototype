import { apiError, apiSuccess } from "@/lib/api-response";
import { listSessions } from "@/lib/why-wrong/evidence";
import { jevConfigured } from "@/lib/why-wrong/jev";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: {
  at: number;
  data: Awaited<ReturnType<typeof listSessions>>;
} | null = null;
const TTL_MS = 10 * 60 * 1000;

/** GET /api/why-wrong/sessions — real sessions worth replaying. */
export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      cache = { at: Date.now(), data: await listSessions(24) };
    }
    return apiSuccess({ sessions: cache.data, jevConfigured: jevConfigured() });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load sessions.",
      { status: 500 },
    );
  }
}
