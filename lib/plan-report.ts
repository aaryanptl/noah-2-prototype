// Read projections of a plan for the product surfaces.
//
// All four surfaces — the glimpse form, the student progress report, the SPR
// edit flow and the mentor's detailed viewer — are views of the same
// learning_plan_topics rows. Building them here rather than in each page keeps
// one definition of "what is coming up" and "what is left".

import { getTopicDefaultsForGrade } from "@/lib/curriculum-defaults";
import pool from "@/lib/db";
import type { PlanFocus } from "@/lib/learning-plans";
import { parseActivity, type SessionContent } from "@/lib/plan-activity";
import { getPlanState, type PlanTopicRow } from "@/lib/plan-updates";

/** A topic in the plan, with the question range that defines mastery of it. */
export interface TopicGuideline {
  topicId: string | null;
  topicName: string;
  plannedClasses: number;
  classesDone: number;
  plannedActivities: number;
  activitiesDone: number;
  masteryScore: number | null;
  status: PlanTopicRow["status"];
  objectives: {
    objectiveId: string;
    name: string;
    starterQuestion: string | null;
    masterQuestion: string | null;
  }[];
}

export interface UpcomingSession {
  itemId: string;
  sessionDate: string;
  focus: PlanFocus;
  topic: string;
  learningObjective: string | null;
  content: SessionContent;
  status: string;
}

export interface PlanReport {
  planId: string;
  title: string;
  studentName: string;
  grade: string | null;
  subject: string | null;
  classesRemaining: number | null;
  lastUpdateKind: string | null;
  /** The descriptive two-week view: what is actually happening next. */
  nextTwoWeeks: UpcomingSession[];
  /**
   * Topics whose remaining classes are running out, so a check on the topic is
   * due. The spec asks the SPR to say a test is coming when fewer than two
   * classes are left.
   */
  testsDue: { topicName: string; classesLeft: number }[];
  /**
   * The longer arc, shown only when there is enough runway to be worth
   * describing — the spec's "more than 5 classes remaining" rule.
   */
  futurePlan: {
    topicName: string;
    plannedClasses: number;
    plannedActivities: number;
  }[];
  showFuturePlan: boolean;
  topics: TopicGuideline[];
}

const TWO_WEEKS_DAYS = 14;
/** Below this many classes left on a topic, a check-in is due. */
const TEST_DUE_THRESHOLD = 2;
/** Below this many classes remaining, the long-range plan isn't worth drawing. */
const FUTURE_PLAN_MIN_CLASSES = 5;

function dayNumber(date: string): number {
  return Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
}

/**
 * Builds every projection in one pass.
 *
 * `today` is injectable so the two-week window can be tested and so a report
 * rendered for a past date stays stable.
 */
export async function getPlanReport(
  planId: string,
  today = new Date().toISOString().slice(0, 10),
): Promise<PlanReport | null> {
  const state = await getPlanState(planId);
  if (!state) return null;

  const planRow = await pool.query(
    `SELECT p.title, s.display_name AS student_name
     FROM learning_plans p
     JOIN diagnostic_students s ON s.id = p.student_id
     WHERE p.id = $1`,
    [planId],
  );
  if (planRow.rows.length === 0) return null;

  const items = await pool.query(
    `SELECT id::text, session_date::text, focus, topic, learning_objective,
            activity, status
     FROM learning_plan_items
     WHERE plan_id = $1 AND session_date IS NOT NULL
     ORDER BY session_date, sort_order`,
    [planId],
  );

  const from = dayNumber(today);
  const to = from + TWO_WEEKS_DAYS;
  const nextTwoWeeks: UpcomingSession[] = items.rows
    .filter((r) => {
      const day = dayNumber(r.session_date);
      return day >= from && day <= to && r.status !== "done";
    })
    .map((r) => ({
      itemId: r.id,
      sessionDate: r.session_date,
      focus: r.focus as PlanFocus,
      topic: r.topic,
      learningObjective: r.learning_objective,
      content: parseActivity(r.activity),
      status: r.status,
    }));

  const active = state.topics.filter(
    (t) => t.status === "planned" || t.status === "in_progress",
  );

  const testsDue = active
    .map((t) => ({
      topicName: t.topicName,
      classesLeft: Math.max(0, t.plannedClasses - t.classesDone),
    }))
    // A topic with zero classes left is finished in all but name; one with a
    // class or two left is where a check-in belongs.
    .filter((t) => t.classesLeft > 0 && t.classesLeft < TEST_DUE_THRESHOLD);

  const topicsInNextTwoWeeks = new Set(nextTwoWeeks.map((s) => s.topic));
  const futurePlan = active
    .filter((t) => !topicsInNextTwoWeeks.has(t.topicName))
    .map((t) => ({
      topicName: t.topicName,
      plannedClasses: Math.max(0, t.plannedClasses - t.classesDone),
      plannedActivities: Math.max(0, t.plannedActivities - t.activitiesDone),
    }));

  // Question guidelines come from the curriculum, keyed by topic id.
  let guidelinesByTopicId = new Map<string, TopicGuideline["objectives"]>();
  if (state.grade && state.subject) {
    try {
      const defaults = await getTopicDefaultsForGrade(
        state.grade,
        state.subject,
      );
      guidelinesByTopicId = new Map(
        defaults.map((d) => [d.topicId, d.objectives]),
      );
    } catch (error) {
      // The mentor viewer degrades to topics without question ranges rather
      // than failing the whole report.
      console.error("[PLAN REPORT] Guideline lookup failed:", error);
    }
  }

  const topics: TopicGuideline[] = state.topics.map((t) => ({
    topicId: t.topicId,
    topicName: t.topicName,
    plannedClasses: t.plannedClasses,
    classesDone: t.classesDone,
    plannedActivities: t.plannedActivities,
    activitiesDone: t.activitiesDone,
    masteryScore: t.masteryScore,
    status: t.status,
    objectives: (t.topicId && guidelinesByTopicId.get(t.topicId)) || [],
  }));

  return {
    planId,
    title: planRow.rows[0].title,
    studentName: planRow.rows[0].student_name,
    grade: state.grade,
    subject: state.subject,
    classesRemaining: state.classesRemaining,
    lastUpdateKind: state.lastUpdateKind,
    nextTwoWeeks,
    testsDue,
    futurePlan,
    showFuturePlan:
      (state.classesRemaining ?? 0) > FUTURE_PLAN_MIN_CLASSES &&
      futurePlan.length > 0,
    topics,
  };
}
