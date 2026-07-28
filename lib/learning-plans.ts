import type { LearningObjectiveResult } from "@/agents/diagnostic/types";
import pool, { query } from "@/lib/db";

// A learning plan is scheduled on teacher-picked calendar dates; sessions are
// bucketed into weeks (7-day windows from the first date) for display, and the
// last session of any week with 3+ sessions is reserved for a check-in.

export type PlanFocus = "teach" | "practice" | "review" | "assess";
export type PlanStatus = "draft" | "active" | "completed" | "archived";
export type PlanItemStatus = "pending" | "in_progress" | "done" | "skipped";

export interface PlanStudentOption {
  id: string;
  displayName: string;
  classLevel: string;
}

export interface LearningPlanItem {
  id: string;
  week: number;
  day: number;
  sessionDate: string | null;
  sortOrder: number;
  focus: PlanFocus;
  topic: string;
  subject: string | null;
  learningObjective: string | null;
  activity: string;
  masteryState: string | null;
  baselineScore: number | null;
  status: PlanItemStatus;
  completedAt: string | null;
}

export interface LearningPlanSummary {
  id: string;
  studentId: string;
  studentName: string;
  classLevel: string;
  title: string;
  subject: string | null;
  durationWeeks: number;
  startDate: string;
  status: PlanStatus;
  endDate: string | null;
  totalItems: number;
  doneItems: number;
  createdAt: string;
}

export interface LearningPlanDetail {
  id: string;
  student: PlanStudentOption;
  title: string;
  subject: string | null;
  durationWeeks: number;
  startDate: string;
  status: PlanStatus;
  notes: string | null;
  createdAt: string;
  items: LearningPlanItem[];
}

export interface PlanItemInput {
  week: number;
  day: number;
  sessionDate: string;
  sortOrder: number;
  focus: PlanFocus;
  topic: string;
  subject?: string | null;
  learningObjective?: string | null;
  activity: string;
  masteryState?: string | null;
  baselineScore?: number | null;
}

/**
 * A topic's budget within the plan. This is what the plan actually IS — the
 * dated items are a schedule derived from it — so a plan saved without these
 * cannot be updated after a class or by the nightly pass.
 */
export interface PlanTopicInput {
  topicId: string | null;
  topicName: string;
  sequence: number;
  plannedClasses: number;
  plannedActivities: number;
  priority?: number | null;
  reason?: string | null;
}

export interface CreatePlanInput {
  studentId: string;
  title: string;
  subject?: string | null;
  grade?: string | null;
  durationWeeks: number;
  startDate: string;
  notes?: string | null;
  /** Classes left in the student's package; the ceiling the allocator respects. */
  classesRemaining?: number | null;
  items: PlanItemInput[];
  topics?: PlanTopicInput[];
}

export interface SuggestedPlanItem {
  week: number;
  day: number;
  sessionDate: string;
  sortOrder: number;
  focus: PlanFocus;
  topic: string;
  subject: string | null;
  learningObjective: string | null;
  /** Flat text persisted to learning_plan_items.activity — see lib/plan-activity.ts. */
  activity: string;
  masteryState: string | null;
  baselineScore: number | null;
  /**
   * Structured view of `activity`, used to render the session as bullets in the
   * builder. Persisted only through `activity`, never as separate columns.
   */
  goal?: string;
  teachingPoints?: string[];
  practice?: string;
  successCriteria?: string;
  /** Why the planner placed this session here. Shown in the builder, not persisted. */
  rationale?: string;
}

export interface SnapshotArea {
  learningObjective: string;
  topic: string | null;
  masteryState: string;
  score: number;
}

export interface PlanSnapshot {
  totalTests: number;
  avgScore: number | null;
  lastActive: string | null;
  weakAreas: SnapshotArea[];
  strongAreas: SnapshotArea[];
}

export interface PlanSuggestion {
  student: PlanStudentOption;
  suggestedTitle: string;
  subject: string | null;
  items: SuggestedPlanItem[];
  snapshot: PlanSnapshot;
  /** True when the student has no diagnostic evidence yet. */
  hasEvidence: boolean;
}

const FOCUS_VALUES: PlanFocus[] = ["teach", "practice", "review", "assess"];
const PLAN_STATUS_VALUES: PlanStatus[] = [
  "draft",
  "active",
  "completed",
  "archived",
];
const ITEM_STATUS_VALUES: PlanItemStatus[] = [
  "pending",
  "in_progress",
  "done",
  "skipped",
];

export function isPlanFocus(value: unknown): value is PlanFocus {
  return FOCUS_VALUES.includes(value as PlanFocus);
}

export function isPlanStatus(value: unknown): value is PlanStatus {
  return PLAN_STATUS_VALUES.includes(value as PlanStatus);
}

export function isPlanItemStatus(value: unknown): value is PlanItemStatus {
  return ITEM_STATUS_VALUES.includes(value as PlanItemStatus);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function mapItemRow(row: Record<string, unknown>): LearningPlanItem {
  return {
    id: row.id as string,
    week: row.week as number,
    day: row.day as number,
    sessionDate: (row.session_date as string | null) ?? null,
    sortOrder: row.sort_order as number,
    focus: row.focus as PlanFocus,
    topic: row.topic as string,
    subject: (row.subject as string | null) ?? null,
    learningObjective: (row.learning_objective as string | null) ?? null,
    activity: row.activity as string,
    masteryState: (row.mastery_state as string | null) ?? null,
    baselineScore:
      row.baseline_score == null ? null : round1(row.baseline_score as number),
    status: row.status as PlanItemStatus,
    completedAt:
      row.completed_at == null
        ? null
        : (row.completed_at as Date).toISOString(),
  };
}

export async function listLearningPlans(
  studentId?: string,
): Promise<LearningPlanSummary[]> {
  const params: string[] = [];
  let where = "";
  if (studentId) {
    params.push(studentId);
    where = "WHERE p.student_id = $1";
  }
  const result = await query(
    `SELECT p.id::text AS id, p.student_id::text AS student_id, p.title,
            p.subject, p.duration_weeks, p.start_date::text AS start_date,
            p.status, p.created_at,
            s.display_name, s.current_class_level,
            COUNT(i.id)::int AS total_items,
            COUNT(i.id) FILTER (WHERE i.status = 'done')::int AS done_items,
            MAX(i.session_date)::text AS end_date
     FROM learning_plans p
     JOIN diagnostic_students s ON s.id = p.student_id
     LEFT JOIN learning_plan_items i ON i.plan_id = p.id
     ${where}
     GROUP BY p.id, s.display_name, s.current_class_level
     ORDER BY p.created_at DESC`,
    params,
  );
  return result.rows.map((row) => ({
    id: row.id,
    studentId: row.student_id,
    studentName: row.display_name,
    classLevel: row.current_class_level,
    title: row.title,
    subject: row.subject,
    durationWeeks: row.duration_weeks,
    startDate: row.start_date,
    status: row.status,
    endDate: row.end_date,
    totalItems: row.total_items,
    doneItems: row.done_items,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function getLearningPlan(
  planId: string,
): Promise<LearningPlanDetail | null> {
  const planResult = await query(
    `SELECT p.id::text AS id, p.student_id::text AS student_id, p.title,
            p.subject, p.duration_weeks, p.start_date::text AS start_date,
            p.status, p.notes, p.created_at,
            s.display_name, s.current_class_level
     FROM learning_plans p
     JOIN diagnostic_students s ON s.id = p.student_id
     WHERE p.id = $1`,
    [planId],
  );
  const plan = planResult.rows[0];
  if (!plan) return null;

  const itemsResult = await query(
    `SELECT id::text AS id, week, day, session_date::text AS session_date,
            sort_order, focus, topic, subject,
            learning_objective, activity, mastery_state, baseline_score,
            status, completed_at
     FROM learning_plan_items
     WHERE plan_id = $1
     ORDER BY session_date ASC NULLS LAST, week ASC, day ASC, sort_order ASC`,
    [planId],
  );

  return {
    id: plan.id,
    student: {
      id: plan.student_id,
      displayName: plan.display_name,
      classLevel: plan.current_class_level,
    },
    title: plan.title,
    subject: plan.subject,
    durationWeeks: plan.duration_weeks,
    startDate: plan.start_date,
    status: plan.status,
    notes: plan.notes,
    createdAt: plan.created_at.toISOString(),
    items: itemsResult.rows.map(mapItemRow),
  };
}

export async function createLearningPlan(
  input: CreatePlanInput,
): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const totalClasses = input.classesRemaining ?? input.items.length;
    const planResult = await client.query(
      `INSERT INTO learning_plans
         (student_id, title, subject, grade, duration_weeks, start_date, notes,
          total_classes, classes_remaining, last_update_kind)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'initial')
       RETURNING id::text AS id`,
      [
        input.studentId,
        input.title,
        input.subject ?? null,
        input.grade ?? null,
        input.durationWeeks,
        input.startDate,
        input.notes ?? null,
        totalClasses,
        totalClasses,
      ],
    );
    const planId: string = planResult.rows[0].id;

    for (const topic of input.topics ?? []) {
      await client.query(
        `INSERT INTO learning_plan_topics
           (plan_id, topic_id, topic_name, sequence, planned_classes,
            planned_activities, priority, source, reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai', $8)
         ON CONFLICT (plan_id, topic_id) WHERE topic_id IS NOT NULL DO NOTHING`,
        [
          planId,
          topic.topicId,
          topic.topicName,
          topic.sequence,
          topic.plannedClasses,
          topic.plannedActivities,
          topic.priority ?? null,
          topic.reason ?? null,
        ],
      );
    }

    for (const item of input.items) {
      await client.query(
        `INSERT INTO learning_plan_items
           (plan_id, week, day, session_date, sort_order, focus, topic, subject,
            learning_objective, activity, mastery_state, baseline_score)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          planId,
          item.week,
          item.day,
          item.sessionDate,
          item.sortOrder,
          item.focus,
          item.topic,
          item.subject ?? null,
          item.learningObjective ?? null,
          item.activity,
          item.masteryState ?? null,
          item.baselineScore ?? null,
        ],
      );
    }

    await client.query("COMMIT");
    return planId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePlanStatus(
  planId: string,
  status: PlanStatus,
): Promise<boolean> {
  const result = await query(
    `UPDATE learning_plans SET status = $2 WHERE id = $1`,
    [planId, status],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteLearningPlan(planId: string): Promise<boolean> {
  const result = await query(`DELETE FROM learning_plans WHERE id = $1`, [
    planId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function updatePlanItemStatus(
  planId: string,
  itemId: string,
  status: PlanItemStatus,
): Promise<LearningPlanItem | null> {
  const result = await query(
    `UPDATE learning_plan_items
     SET status = $3,
         completed_at = CASE WHEN $3 = 'done' THEN now() ELSE NULL END
     WHERE id = $2 AND plan_id = $1
     RETURNING id::text AS id, week, day, session_date::text AS session_date,
               sort_order, focus, topic, subject,
               learning_objective, activity, mastery_state, baseline_score,
               status, completed_at`,
    [planId, itemId, status],
  );
  const row = result.rows[0];
  return row ? mapItemRow(row) : null;
}

// ---------------------------------------------------------------------------
// Suggestion engine
// ---------------------------------------------------------------------------

interface ObjectiveEvidence {
  learningObjective: string;
  masteryState: string;
  score: number;
  topic: string | null;
  subject: string | null;
  teacherFocus: string[];
  nextSteps: string[];
}

const WEAK_MASTERY_ORDER: Record<string, number> = {
  not_started: 0,
  emerging: 1,
  developing: 2,
};

function isStrongMastery(masteryState: string): boolean {
  return ["mastered", "secure", "advanced"].includes(masteryState);
}

function defaultActivity(focus: PlanFocus, topic: string): string {
  switch (focus) {
    case "teach":
      return `Re-teach the core idea with worked examples, then try two guided questions on ${topic}.`;
    case "practice":
      return `Independent practice set on ${topic} — start easy, finish with one stretch question.`;
    case "review":
      return `Quick spaced-recall review of ${topic} to keep this strength secure.`;
    case "assess":
      return "Mini check-in quiz covering this week's focus areas.";
  }
}

function parseDay(dateString: string): number {
  return Math.floor(new Date(`${dateString}T00:00:00Z`).getTime() / 86_400_000);
}

/**
 * Builds a suggested plan across the teacher-picked session dates from the
 * student's latest diagnostic evidence. Priority order: weakest learning
 * objectives (teach/practice), then low-accuracy topics without
 * objective-level evidence, then one review of the strongest area. Dates are
 * bucketed into 7-day weeks from the first date; the last session of any week
 * with 3+ sessions is a check-in.
 */
export async function buildPlanSuggestion(
  studentId: string,
  sessionDates: string[],
): Promise<PlanSuggestion | null> {
  const dates = Array.from(new Set(sessionDates)).sort();
  const studentResult = await query(
    `SELECT id::text AS id, display_name, current_class_level
     FROM diagnostic_students WHERE id = $1`,
    [studentId],
  );
  const studentRow = studentResult.rows[0];
  if (!studentRow) return null;
  const student: PlanStudentOption = {
    id: studentRow.id,
    displayName: studentRow.display_name,
    classLevel: studentRow.current_class_level,
  };

  const [assessmentResult, topicResult] = await Promise.all([
    query(
      `SELECT subject, topic, learning_objective_results, submitted_at,
              COALESCE(overall_readiness_score, attempted_readiness_score, 0)::float8 AS score
       FROM diagnostic_assessments
       WHERE student_id = $1 AND submitted_at IS NOT NULL
       ORDER BY submitted_at ASC`,
      [studentId],
    ),
    query(
      `SELECT q.topic,
              MAX(a.subject) AS subject,
              COUNT(*)::int AS questions,
              COUNT(*) FILTER (WHERE q.verdict = 'correct')::int AS correct,
              COUNT(*) FILTER (WHERE q.verdict = 'partial')::int AS partial,
              COUNT(*) FILTER (WHERE q.verdict = 'non_attempt')::int AS non_attempt
       FROM diagnostic_question_results q
       JOIN diagnostic_assessments a ON a.id = q.assessment_id
       WHERE a.student_id = $1 AND q.topic IS NOT NULL AND q.topic <> ''
       GROUP BY q.topic`,
      [studentId],
    ),
  ]);

  // Latest evidence per learning objective (oldest → newest so the most
  // recent assessment wins) — same approach as lib/teacher-dashboard.ts,
  // but keeping the assessment's topic/subject for plan context.
  const latestByObjective = new Map<string, ObjectiveEvidence>();
  for (const row of assessmentResult.rows) {
    if (!row.learning_objective_results) continue;
    for (const lo of row.learning_objective_results as LearningObjectiveResult[]) {
      latestByObjective.set(lo.learningObjective, {
        learningObjective: lo.learningObjective,
        masteryState: lo.masteryState,
        score: round1(lo.score),
        topic: row.topic,
        subject: row.subject,
        teacherFocus: lo.teacherFocus ?? [],
        nextSteps: lo.nextSteps ?? [],
      });
    }
  }
  const evidence = Array.from(latestByObjective.values());

  const weakObjectives = evidence
    .filter((item) => !isStrongMastery(item.masteryState))
    .sort((a, b) => {
      const orderA = WEAK_MASTERY_ORDER[a.masteryState] ?? 3;
      const orderB = WEAK_MASTERY_ORDER[b.masteryState] ?? 3;
      if (orderA !== orderB) return orderA - orderB;
      return a.score - b.score;
    });
  const strongObjectives = evidence
    .filter((item) => isStrongMastery(item.masteryState))
    .sort((a, b) => b.score - a.score);

  const coveredTopics = new Set(
    weakObjectives.map((item) => (item.topic ?? "").toLowerCase()),
  );
  const weakTopics = topicResult.rows
    .map((row) => {
      const attempted = row.questions - row.non_attempt;
      const accuracy =
        attempted > 0
          ? round1(((row.correct + row.partial * 0.5) / attempted) * 100)
          : 0;
      return {
        topic: row.topic as string,
        subject: row.subject as string | null,
        accuracy,
      };
    })
    .filter(
      (row) => row.accuracy < 60 && !coveredTopics.has(row.topic.toLowerCase()),
    )
    .sort((a, b) => a.accuracy - b.accuracy);

  // Build the prioritized candidate queue.
  type Candidate = Omit<
    SuggestedPlanItem,
    "week" | "day" | "sessionDate" | "sortOrder"
  >;
  const candidates: Candidate[] = [];

  for (const lo of weakObjectives) {
    const focus: PlanFocus = ["not_started", "emerging"].includes(
      lo.masteryState,
    )
      ? "teach"
      : "practice";
    candidates.push({
      focus,
      topic: lo.topic ?? lo.learningObjective,
      subject: lo.subject,
      learningObjective: lo.learningObjective,
      activity:
        lo.nextSteps[0] ??
        lo.teacherFocus[0] ??
        defaultActivity(focus, lo.topic ?? lo.learningObjective),
      masteryState: lo.masteryState,
      baselineScore: lo.score,
    });
  }

  for (const topic of weakTopics) {
    candidates.push({
      focus: "practice",
      topic: topic.topic,
      subject: topic.subject,
      learningObjective: null,
      activity: `Targeted practice on ${topic.topic} — accuracy is currently ${topic.accuracy}%.`,
      masteryState: null,
      baselineScore: topic.accuracy,
    });
  }

  const strongest = strongObjectives[0];
  if (strongest) {
    candidates.push({
      focus: "review",
      topic: strongest.topic ?? strongest.learningObjective,
      subject: strongest.subject,
      learningObjective: strongest.learningObjective,
      activity: defaultActivity(
        "review",
        strongest.topic ?? strongest.learningObjective,
      ),
      masteryState: strongest.masteryState,
      baselineScore: strongest.score,
    });
  }

  const hasEvidence = candidates.length > 0;
  const primarySubject =
    candidates.find((item) => item.subject)?.subject ?? null;

  const toSnapshotArea = (item: ObjectiveEvidence): SnapshotArea => ({
    learningObjective: item.learningObjective,
    topic: item.topic,
    masteryState: item.masteryState,
    score: item.score,
  });
  const scores = assessmentResult.rows.map((row) => row.score as number);
  const lastSubmitted =
    assessmentResult.rows[assessmentResult.rows.length - 1]?.submitted_at;
  const snapshot: PlanSnapshot = {
    totalTests: assessmentResult.rows.length,
    avgScore:
      scores.length > 0
        ? round1(scores.reduce((sum, score) => sum + score, 0) / scores.length)
        : null,
    lastActive: lastSubmitted ? lastSubmitted.toISOString() : null,
    weakAreas: weakObjectives.slice(0, 6).map(toSnapshotArea),
    strongAreas: strongObjectives.slice(0, 4).map(toSnapshotArea),
  };

  // Bucket the picked dates into 7-day weeks from the first date, then fill
  // each date with the next candidate. The last date of any week with 3+
  // sessions becomes a check-in (the very last one wraps up the whole plan).
  const firstDay = dates.length > 0 ? parseDay(dates[0]) : 0;
  const weekOf = (date: string) =>
    Math.floor((parseDay(date) - firstDay) / 7) + 1;
  const weekCounts = new Map<number, number>();
  const lastDateOfWeek = new Map<number, string>();
  for (const date of dates) {
    const week = weekOf(date);
    weekCounts.set(week, (weekCounts.get(week) ?? 0) + 1);
    lastDateOfWeek.set(week, date);
  }

  const items: SuggestedPlanItem[] = [];
  let candidateIndex = 0;
  const dayWithinWeek = new Map<number, number>();
  for (const date of dates) {
    const week = weekOf(date);
    const day = (dayWithinWeek.get(week) ?? 0) + 1;
    dayWithinWeek.set(week, day);

    const isCheckIn =
      lastDateOfWeek.get(week) === date && (weekCounts.get(week) ?? 0) >= 3;
    if (isCheckIn) {
      const isFinal = date === dates[dates.length - 1];
      items.push({
        week,
        day,
        sessionDate: date,
        sortOrder: 0,
        focus: "assess",
        topic: isFinal ? "Full plan check-in" : "Weekly check-in",
        subject: primarySubject,
        learningObjective: null,
        activity: isFinal
          ? "Wrap-up quiz across every focus area in this plan, then compare against baseline scores."
          : defaultActivity("assess", ""),
        masteryState: null,
        baselineScore: null,
      });
      continue;
    }

    const candidate = candidates[candidateIndex];
    if (candidate) {
      candidateIndex += 1;
      items.push({ ...candidate, week, day, sessionDate: date, sortOrder: 0 });
    } else {
      // Ran out of evidence-backed work: recycle the weakest area as
      // consolidation practice so every picked date still has a session.
      const recycled = candidates[0];
      items.push({
        week,
        day,
        sessionDate: date,
        sortOrder: 0,
        focus: recycled ? "practice" : "teach",
        topic: recycled?.topic ?? "Foundations",
        subject: recycled?.subject ?? null,
        learningObjective: recycled?.learningObjective ?? null,
        activity: recycled
          ? `Consolidation: mixed practice revisiting ${recycled.topic}.`
          : "Introductory session — run a short diagnostic to gather evidence, then teach the first gap it reveals.",
        masteryState: recycled?.masteryState ?? null,
        baselineScore: recycled?.baselineScore ?? null,
      });
    }
  }

  const firstName = student.displayName.split(" ")[0];
  const weekCount = Math.max(1, weekCounts.size);
  return {
    student,
    suggestedTitle:
      weekCount === 1
        ? `1-week learning plan for ${firstName}`
        : `${weekCount}-week learning plan for ${firstName}`,
    subject: primarySubject,
    items,
    snapshot,
    hasEvidence,
  };
}
