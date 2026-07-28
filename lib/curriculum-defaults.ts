// Reads the prefixed dimensional data the plan allocator works from:
// per-topic teaching/practice budgets and grade priority, plus the per-objective
// starter/master question guideline shown to mentors.
//
// Seeded by scripts/seed-curriculum-plan-defaults.ts into curriculum_plan_defaults.

import pool from "@/lib/db";
import { gradeMatchVariants, subjectMatchVariants } from "@/lib/syllabus";

/** The question range a student should manage if they've learnt an objective. */
export interface ObjectiveGuideline {
  objectiveId: string;
  name: string;
  /** Easiest bank question — the floor for "has started to get it". */
  starterQuestion: string | null;
  /** Hardest bank question — the ceiling for "has mastered it". */
  masterQuestion: string | null;
}

export interface TopicDefaults {
  topicId: string;
  topicName: string;
  grade: string;
  subject: string;
  /** Ideal lectures to teach the topic. */
  idealClasses: number;
  /** Ideal practice questions across homework, tests and practice. */
  idealActivities: number;
  /** 1 = pick first for this grade. Drives topic dropping when classes run short. */
  gradePriority: number;
  objectives: ObjectiveGuideline[];
}

interface DefaultsRow {
  topic_id: string;
  topic_name: string;
  grade: string;
  subject: string;
  ideal_classes: number | null;
  ideal_activities: number | null;
  grade_priority: number | null;
  objective_id: string | null;
  objective_name: string | null;
  starter_question: string | null;
  master_question: string | null;
}

/**
 * Topic defaults for one grade, ordered by priority.
 *
 * Only rows a reviewer has approved are returned when `approvedOnly` is set —
 * that's the intended production behaviour, so freshly seeded numbers can't
 * silently drive real student plans. Pass false while the review backlog is
 * being worked through.
 */
export async function getTopicDefaultsForGrade(
  grade: string,
  subject: string,
  { approvedOnly = false }: { approvedOnly?: boolean } = {},
): Promise<TopicDefaults[]> {
  const reviewFilter = approvedOnly
    ? "AND topic_defaults.review_status = 'approved'"
    : "AND topic_defaults.review_status <> 'rejected'";

  const result = await pool.query<DefaultsRow>(
    `SELECT t.id::text                AS topic_id,
            t.name                    AS topic_name,
            t.grade::text             AS grade,
            initcap(s.name)           AS subject,
            topic_defaults.ideal_classes,
            topic_defaults.ideal_activities,
            topic_defaults.grade_priority,
            lo.id::text               AS objective_id,
            COALESCE(NULLIF(lo.display_name, ''), lo.description, lo.code)
                                      AS objective_name,
            COALESCE(starter_v.prompt, lo_defaults.starter_question) AS starter_question,
            COALESCE(master_v.prompt,  lo_defaults.master_question)  AS master_question
     FROM topics t
     JOIN subjects s ON s.id = t.subject_id
     JOIN curriculum_plan_defaults topic_defaults
       ON topic_defaults.topic_id = t.id
      AND topic_defaults.learning_objective_id IS NULL
     LEFT JOIN learning_objectives lo ON lo.topic_id = t.id
     LEFT JOIN curriculum_plan_defaults lo_defaults
       ON lo_defaults.learning_objective_id = lo.id
      AND lo_defaults.review_status <> 'rejected'
     LEFT JOIN questions starter_q ON starter_q.id = lo_defaults.starter_question_id
     LEFT JOIN question_versions starter_v ON starter_v.id = starter_q.current_version_id
     LEFT JOIN questions master_q ON master_q.id = lo_defaults.master_question_id
     LEFT JOIN question_versions master_v ON master_v.id = master_q.current_version_id
     WHERE (t.grade::text = ANY($1) OR t.class_level = ANY($1))
       AND lower(s.name) = ANY(SELECT lower(x) FROM unnest($2::text[]) AS x)
       AND t.status = 'active'
       ${reviewFilter}
     ORDER BY topic_defaults.grade_priority NULLS LAST, t.id, lo.code, lo.id`,
    [gradeMatchVariants(grade), subjectMatchVariants(subject)],
  );

  const byTopic = new Map<string, TopicDefaults>();
  for (const row of result.rows) {
    let topic = byTopic.get(row.topic_id);
    if (!topic) {
      topic = {
        topicId: row.topic_id,
        topicName: row.topic_name,
        grade: row.grade,
        subject: row.subject,
        // Defensive floors: a NULL budget would otherwise allocate zero classes
        // and silently drop the topic from every plan.
        idealClasses: row.ideal_classes ?? 3,
        idealActivities: row.ideal_activities ?? 20,
        gradePriority: row.grade_priority ?? 999,
        objectives: [],
      };
      byTopic.set(row.topic_id, topic);
    }
    if (row.objective_id && row.objective_name) {
      topic.objectives.push({
        objectiveId: row.objective_id,
        name: row.objective_name,
        starterQuestion: row.starter_question,
        masterQuestion: row.master_question,
      });
    }
  }

  return Array.from(byTopic.values());
}
