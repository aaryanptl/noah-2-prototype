import { NextResponse } from "next/server";
import {
  deleteLearningPlan,
  getLearningPlan,
  isPlanStatus,
  updatePlanStatus,
} from "@/lib/learning-plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }
  const plan = await getLearningPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json(plan);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlanStatus(body.status)) {
    return NextResponse.json(
      { error: "status must be one of draft, active, completed, archived" },
      { status: 400 },
    );
  }

  const updated = await updatePlanStatus(planId, body.status);
  if (!updated) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params;
  if (!UUID_PATTERN.test(planId)) {
    return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
  }
  const deleted = await deleteLearningPlan(planId);
  if (!deleted) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
