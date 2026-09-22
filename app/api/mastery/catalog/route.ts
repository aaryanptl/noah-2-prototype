import { apiError, apiSuccess } from "@/lib/api-response";
import { listCatalog } from "@/lib/mastery/evidence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let cache: {
  at: number;
  data: Awaited<ReturnType<typeof listCatalog>>;
} | null = null;
const TTL_MS = 60 * 60 * 1000;

/** GET /api/mastery/catalog — maths topics with objective counts, by grade. */
export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      cache = { at: Date.now(), data: await listCatalog() };
    }
    return apiSuccess({ topics: cache.data });
  } catch (error) {
    return apiError(
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to load the catalog.",
      { status: 500 },
    );
  }
}
