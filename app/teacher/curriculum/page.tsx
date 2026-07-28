import {
  CurriculumDefaultsReview,
  type DefaultRow,
} from "@/components/teacher/CurriculumDefaultsReview";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CurriculumDefaultsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string }>;
}) {
  const { grade: requested } = await searchParams;

  const gradesResult = await pool.query<{ grade: string }>(
    `SELECT DISTINCT t.grade::text AS grade
     FROM topics t
     WHERE t.status = 'active'
     ORDER BY grade`,
  );
  const grades = gradesResult.rows.map((r) => r.grade);
  const grade = requested && grades.includes(requested) ? requested : grades[0];

  const rows = grade
    ? (
        await pool.query<DefaultRow>(
          `SELECT d.id::text,
                  d.topic_id::text,
                  t.name AS topic_name,
                  t.grade::text AS grade,
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
           -- t.id is grouped as well as ordered on: grouping by both primary
           -- keys lets the non-aggregated d.* and t.* columns come along.
           GROUP BY d.id, t.id
           ORDER BY d.grade_priority NULLS LAST, t.id`,
          [grade],
        )
      ).rows
    : [];

  return (
    <CurriculumDefaultsReview grades={grades} grade={grade ?? ""} rows={rows} />
  );
}
