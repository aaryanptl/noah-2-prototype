// Builds a plan input from REAL diagnostic and placement results.
//
// Until now the plan builder read hand-authored profiles from lib/demo-students.ts,
// so "personalised" plans were personalised to fiction. The spec is explicit that
// the input is the placement test result plus later test data — this module is
// that input.
//
// It deliberately produces the same shape as DemoStudentProfile so it drops into
// the existing pipeline. When the demo profiles are finally deleted, this becomes
// the only source and the shape can be renamed.

import pool from "@/lib/db";
import type {
  DemoMastery,
  DemoStudentProfile,
  DemoTopicSignal,
} from "@/lib/demo-students";

/** Topics that are test containers rather than curriculum topics. */
const NON_CURRICULUM_TOPICS = new Set([
  "Placement Test",
  "Recurring Test",
  "Diagnostic",
]);

/** Below this a topic is a gap; at or above it is a strength. */
const STRENGTH_THRESHOLD = 70;

interface ObjectiveResult {
  learningObjective?: string;
  score?: number;
  overallScore?: number;
  masteryState?: string;
  diagnosticSummary?: string;
  teacherFocus?: string[];
  nextSteps?: string[];
}

function toMastery(state: string | undefined, score: number): DemoMastery {
  switch (state) {
    case "not_started":
    case "emerging":
    case "developing":
    case "secure":
    case "advanced":
      return state;
    default:
      break;
  }
  // Assessments don't always carry a mastery state, so derive one from the score
  // rather than dropping the objective.
  if (score < 25) return "not_started";
  if (score < 45) return "emerging";
  if (score < 70) return "developing";
  if (score < 88) return "secure";
  return "advanced";
}

export interface StudentEvidenceSummary {
  studentId: string;
  displayName: string;
  classLevel: string;
  /** How many assessments the profile is built from. */
  assessments: number;
  /** Most recent submission date, YYYY-MM-DD. */
  lastAssessedOn: string | null;
  /** Whether a placement test is among the evidence. */
  hasPlacementTest: boolean;
  topicsWithEvidence: number;
}

export interface StudentEvidence {
  profile: DemoStudentProfile;
  summary: StudentEvidenceSummary;
}

/**
 * Assembles a student's evidence into a plan input.
 *
 * Scores come from the MOST RECENT assessment per topic, not an average across
 * all of them — a student who scored 30% in April and 75% in July is a 75%
 * student, and averaging would keep re-teaching what they already fixed.
 *
 * Returns null when the student has no usable assessment, so callers can fall
 * back rather than generate a plan from nothing.
 */
export async function getStudentEvidence(
  studentId: string,
  subject = "Maths",
): Promise<StudentEvidence | null> {
  const studentResult = await pool.query(
    `SELECT id::text, display_name, current_class_level
     FROM diagnostic_students WHERE id = $1`,
    [studentId],
  );
  const student = studentResult.rows[0];
  if (!student) return null;

  // One row per topic: the newest assessment wins.
  const topicResult = await pool.query(
    `SELECT DISTINCT ON (a.topic)
            a.id::text            AS assessment_id,
            a.topic,
            a.readiness_score,
            a.learning_objective_results,
            a.submitted_at,
            a.test_mode
     FROM diagnostic_assessments a
     WHERE a.student_id = $1
       AND a.topic IS NOT NULL
       AND lower(a.subject) = lower($2)
       AND a.readiness_score IS NOT NULL
     ORDER BY a.topic, a.submitted_at DESC NULLS LAST, a.created_at DESC`,
    [studentId, subject],
  );

  const usable = topicResult.rows.filter(
    (r) => !NON_CURRICULUM_TOPICS.has(r.topic),
  );
  if (usable.length === 0) return null;

  // The observed misconception per objective — the single highest-value field
  // for the model, and the thing a synthetic profile can never supply.
  const assessmentIds = topicResult.rows.map((r) => r.assessment_id);
  const misconceptionResult = await pool.query(
    `SELECT DISTINCT ON (learning_objective)
            learning_objective, topic, why_wrong
     FROM diagnostic_question_results
     WHERE assessment_id = ANY($1::uuid[])
       AND verdict = 'incorrect'
       AND why_wrong IS NOT NULL
       AND learning_objective IS NOT NULL
     ORDER BY learning_objective, id`,
    [assessmentIds],
  );
  const misconceptionByObjective = new Map<string, string>(
    misconceptionResult.rows.map((r) => [r.learning_objective, r.why_wrong]),
  );

  const weakAreas: DemoTopicSignal[] = [];
  const strongAreas: DemoTopicSignal[] = [];

  for (const row of usable) {
    const objectives: ObjectiveResult[] = Array.isArray(
      row.learning_objective_results,
    )
      ? row.learning_objective_results
      : [];

    if (objectives.length === 0) {
      // No per-objective breakdown: still use the topic-level readiness so the
      // topic isn't invisible to the allocator.
      const score = Number(row.readiness_score);
      const signal: DemoTopicSignal = {
        topic: row.topic,
        learningObjective: `${row.topic} — overall`,
        masteryState: toMastery(undefined, score),
        score,
        note: `Topic readiness ${score}% from the assessment on ${String(row.submitted_at).slice(0, 10)}.`,
      };
      (score < STRENGTH_THRESHOLD ? weakAreas : strongAreas).push(signal);
      continue;
    }

    for (const objective of objectives) {
      const name = objective.learningObjective;
      if (!name) continue;
      const score = Number(objective.score ?? objective.overallScore ?? 0);
      const misconception = misconceptionByObjective.get(name);
      const note =
        misconception ??
        objective.teacherFocus?.[0] ??
        objective.nextSteps?.[0] ??
        objective.diagnosticSummary ??
        `Scored ${score}% on this objective.`;

      const signal: DemoTopicSignal = {
        topic: row.topic,
        learningObjective: name,
        masteryState: toMastery(objective.masteryState, score),
        score,
        note,
      };
      (score < STRENGTH_THRESHOLD ? weakAreas : strongAreas).push(signal);
    }
  }

  // Weakest first — plan-generate and the prompt both assume this ordering.
  weakAreas.sort((a, b) => a.score - b.score);
  strongAreas.sort((a, b) => b.score - a.score);

  const allScores = [...weakAreas, ...strongAreas].map((s) => s.score);
  const avgScore = allScores.length
    ? Math.round(allScores.reduce((n, s) => n + s, 0) / allScores.length)
    : 0;

  // Trend: compare the two most recent assessments against the two before them.
  const trendResult = await pool.query(
    `SELECT readiness_score
     FROM diagnostic_assessments
     WHERE student_id = $1 AND readiness_score IS NOT NULL
     ORDER BY submitted_at DESC NULLS LAST, created_at DESC
     LIMIT 6`,
    [studentId],
  );
  const scores = trendResult.rows.map((r) => Number(r.readiness_score));
  const recent = scores.slice(0, 3);
  const earlier = scores.slice(3);
  const mean = (list: number[]) =>
    list.length ? list.reduce((n, s) => n + s, 0) / list.length : 0;
  const delta = mean(recent) - mean(earlier);
  const trend: DemoStudentProfile["trend"] =
    earlier.length === 0
      ? "flat"
      : delta > 5
        ? "up"
        : delta < -5
          ? "down"
          : "flat";

  const pace: DemoStudentProfile["pace"] =
    avgScore < 45 ? "needs support" : avgScore >= 75 ? "fast" : "steady";

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS assessments,
            MAX(submitted_at)::date::text AS last_assessed,
            BOOL_OR(topic = 'Placement Test' OR test_mode = 'placement') AS has_placement
     FROM diagnostic_assessments
     WHERE student_id = $1`,
    [studentId],
  );
  const counts = countResult.rows[0];

  const profile: DemoStudentProfile = {
    id: student.id,
    displayName: student.display_name,
    classLevel: student.current_class_level,
    subject,
    avgScore,
    testsTaken: counts.assessments,
    lastActiveDaysAgo: 0,
    // Not tracked in the diagnostic tables; the allocator ignores it and the
    // prompt only uses it as soft context.
    attendance: 100,
    trend,
    pace,
    teacherNote: `Built from ${counts.assessments} assessment(s) across ${usable.length} topic(s).${
      counts.has_placement ? " Includes a placement test." : ""
    }`,
    weakAreas,
    strongAreas,
  };

  return {
    profile,
    summary: {
      studentId: student.id,
      displayName: student.display_name,
      classLevel: student.current_class_level,
      assessments: counts.assessments,
      lastAssessedOn: counts.last_assessed,
      hasPlacementTest: Boolean(counts.has_placement),
      topicsWithEvidence: usable.length,
    },
  };
}

/** Students who have enough evidence for a plan to be built from real data. */
export async function listStudentsWithEvidence(
  subject = "Maths",
): Promise<StudentEvidenceSummary[]> {
  const result = await pool.query(
    `SELECT s.id::text,
            s.display_name,
            s.current_class_level,
            COUNT(a.id)::int AS assessments,
            MAX(a.submitted_at)::date::text AS last_assessed,
            BOOL_OR(a.topic = 'Placement Test' OR a.test_mode = 'placement') AS has_placement,
            COUNT(DISTINCT a.topic) FILTER (
              WHERE a.topic IS NOT NULL AND a.topic <> ALL($2::text[])
            )::int AS topics_with_evidence
     FROM diagnostic_students s
     JOIN diagnostic_assessments a ON a.student_id = s.id
     WHERE a.readiness_score IS NOT NULL
       AND lower(a.subject) = lower($1)
     GROUP BY s.id, s.display_name, s.current_class_level
     HAVING COUNT(DISTINCT a.topic) FILTER (
       WHERE a.topic IS NOT NULL AND a.topic <> ALL($2::text[])
     ) > 0
     ORDER BY assessments DESC`,
    [subject, Array.from(NON_CURRICULUM_TOPICS)],
  );

  return result.rows.map((r) => ({
    studentId: r.id,
    displayName: r.display_name,
    classLevel: r.current_class_level,
    assessments: r.assessments,
    lastAssessedOn: r.last_assessed,
    hasPlacementTest: Boolean(r.has_placement),
    topicsWithEvidence: r.topics_with_evidence,
  }));
}
