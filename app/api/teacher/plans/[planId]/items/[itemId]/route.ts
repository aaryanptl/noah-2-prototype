import { NextResponse } from "next/server";
import { isPlanItemStatus, updatePlanItemStatus } from "@/lib/learning-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string; itemId: string }> },
) {
  const { planId, itemId } = await params;
  if (!UUID_PATTERN.test(planId) || !UUID_PATTERN.test(itemId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlanItemStatus(body.status)) {
    return NextResponse.json(
      { error: "status must be one of pending, in_progress, done, skipped" },
      { status: 400 },
    );
  }

  const item = await updatePlanItemStatus(planId, itemId, body.status);
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
