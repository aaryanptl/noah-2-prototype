import { NextResponse } from "next/server";
import pool from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Topic-level prefixed data for one grade, for the review screen. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const grade = searchParams.get("grade");
  if (!grade) {
    return NextResponse.json({ error: "grade is required" }, { status: 400 });
  }

  const rows = await pool.query(
    `SELECT d.id::text,
            d.topic_id::text,
            t.name AS topic_name,
            t.grade,
            d.ideal_classes,
            d.ideal_activities,
            d.grade_priority,
            d.review_status,
            d.source,
            COUNT(lo.id)::int AS objective_count
     FROM curriculum_plan_defaults d
     JOIN topics t ON t.id = d.topic_id
     LEFT JOIN learning_objectives lo ON lo.topic_id = t.id
     WHERE d.learning_objective_id IS NULL
       AND t.grade::text = $1
     -- t.id is grouped as well as ordered on: grouping by both primary keys
     -- lets the non-aggregated d.* and t.* columns come along.
     GROUP BY d.id, t.id
     ORDER BY d.grade_priority NULLS LAST, t.id`,
    [grade],
  );

  return NextResponse.json({ rows: rows.rows });
}

/**
 * Approves every topic-level default for a grade in one action — the
 * "approve all" button on the review screen. Rows already approved are left
 * untouched; the numbers themselves are not changed, only signed off.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const grade = body.grade;
  if (typeof grade !== "string" || grade.length === 0) {
    return NextResponse.json({ error: "grade is required" }, { status: 400 });
  }

  try {
    const result = await pool.query(
      `UPDATE curriculum_plan_defaults d
       SET review_status = 'approved',
           reviewed_by   = $2,
           reviewed_at   = now()
       FROM topics t
       WHERE d.topic_id = t.id
         AND d.learning_objective_id IS NULL
         AND t.grade::text = $1
         AND d.review_status <> 'approved'`,
      [grade, typeof body.reviewedBy === "string" ? body.reviewedBy : "reviewer"],
    );
    return NextResponse.json({ approved: result.rowCount ?? 0 });
  } catch (error) {
    console.error("Failed to bulk-approve curriculum defaults:", error);
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}

/**
 * Applies a reviewer's decision. Editing the numbers and approving are the same
 * call, because in practice a reviewer adjusts and approves in one action.
 */
export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = body.id;
  if (typeof id !== "string" || !/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const reviewStatus = body.reviewStatus;
  if (
    reviewStatus !== undefined &&
    reviewStatus !== "proposed" &&
    reviewStatus !== "approved" &&
    reviewStatus !== "rejected"
  ) {
    return NextResponse.json(
      { error: "Invalid reviewStatus" },
      { status: 400 },
    );
  }

  const idealClasses =
    typeof body.idealClasses === "number" && body.idealClasses >= 1
      ? body.idealClasses
      : null;
  const idealActivities =
    typeof body.idealActivities === "number" && body.idealActivities >= 1
      ? body.idealActivities
      : null;
  const gradePriority =
    typeof body.gradePriority === "number" && body.gradePriority >= 1
      ? body.gradePriority
      : null;

  try {
    const result = await pool.query(
      `UPDATE curriculum_plan_defaults
       SET ideal_classes    = COALESCE($2, ideal_classes),
           ideal_activities = COALESCE($3, ideal_activities),
           grade_priority   = COALESCE($4, grade_priority),
           review_status    = COALESCE($5, review_status),
           reviewed_by      = COALESCE($6, reviewed_by),
           reviewed_at      = CASE WHEN $5 IS NULL THEN reviewed_at ELSE now() END,
           -- A reviewer's edit is no longer the seeded formula's output.
           source           = CASE
                                WHEN $2 IS NULL AND $3 IS NULL AND $4 IS NULL
                                THEN source ELSE 'reviewed'
                              END
       WHERE id = $1
       RETURNING id::text, ideal_classes, ideal_activities, grade_priority,
                 review_status, source`,
      [
        id,
        idealClasses,
        idealActivities,
        gradePriority,
        reviewStatus ?? null,
        typeof body.reviewedBy === "string" ? body.reviewedBy : "reviewer",
      ],
    );
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }
    return NextResponse.json({ row: result.rows[0] });
  } catch (error) {
    console.error("Failed to update curriculum default:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
