import { apiError, apiSuccess } from "@/lib/api-response";
import { listCandidates } from "@/lib/mastery/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: {
  at: number;
  data: Awaited<ReturnType<typeof listCandidates>>;
} | null = null;
const TTL_MS = 10 * 60 * 1000;

/** GET /api/mastery/candidates — student × topic pairs with rich real histories. */
export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      cache = { at: Date.now(), data: await listCandidates(30) };
    }
    return apiSuccess({ candidates: cache.data });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load candidates.",
      { status: 500 },
    );
  }
}
