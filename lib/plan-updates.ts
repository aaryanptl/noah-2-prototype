// The one entry point for changing a learning plan after it exists.
//
// Three kinds of update reach a plan — a mentor's manual override, the data
// captured after a class, and the nightly automatic pass — and they must not
// fight each other. Routing all three through `applyPlanUpdate` is what makes
// the precedence rule enforceable: it lives here, not in each caller.
//
// Every application writes a row to learning_plan_revisions, which is both the
// audit trail and the input to the precedence check on the next update.

import { getTopicDefaultsForGrade } from "@/lib/curriculum-defaults";
import pool from "@/lib/db";
import {
  autoAdjustTopic,
  canApplyUpdate,
  MIN_CLASSES_PER_TOPIC,
  type UpdateKind,
} from "@/lib/plan-allocator";

export interface PlanTopicRow {
  id: string;
  topicId: string | null;
  topicName: string;
  sequence: number;
  plannedClasses: number;
  plannedActivities: number;
  classesDone: number;
  activitiesDone: number;
  masteryScore: number | null;
  priority: number | null;
  status: "planned" | "in_progress" | "done" | "dropped";
  source: "ai" | "manual" | "class" | "auto";
  reason: string | null;
}

export interface PlanState {
  planId: string;
  studentId: string;
  grade: string | null;
  subject: string | null;
  classesRemaining: number | null;
  lastUpdateKind: UpdateKind | "initial" | null;
  topics: PlanTopicRow[];
}

/** A mentor editing the plan by hand. */
export interface ManualUpdate {
  kind: "manual";
  actor?: string;
  /** Topic ids to add at their prefixed budget. */
  addTopicIds?: string[];
  /** Topic ids to drop from the plan. */
  removeTopicIds?: string[];
  /** Explicit class/activity overrides per topic. */
  setClasses?: { topicId: string; classes: number }[];
  setActivities?: { topicId: string; activities: number }[];
}

/** What actually happened in a completed class. */
export interface ClassUpdate {
  kind: "class";
  actor?: string;
  /** Topics taught in this class — several may share one class. */
  topicsCovered?: {
    topicId: string;
    /** Activities the student worked through on this topic. */
    activitiesDone?: number;
    /** Fresh mastery reading, 0-100. */
    masteryScore?: number;
  }[];
  /** Topics the mentor marked finished. */
  completedTopicIds?: string[];
  addTopicIds?: string[];
  removeTopicIds?: string[];
  /** Classes consumed from the package by this session. Defaults to 1. */
  classesConsumed?: number;
}

/** The nightly pass. Carries no instructions — it derives everything. */
export interface AutoUpdate {
  kind: "auto";
  actor?: string;
}

export type PlanUpdate = ManualUpdate | ClassUpdate | AutoUpdate;

export interface PlanUpdateResult {
  applied: boolean;
  /** Set when the precedence rule blocked the update. */
  blockedReason?: string;
  revisionId?: string;
  changes: string[];
  warnings: string[];
  state?: PlanState;
}

export async function getPlanState(planId: string): Promise<PlanState | null> {
  const planResult = await pool.query(
    `SELECT id::text, student_id::text, grade, subject,
            classes_remaining, last_update_kind
     FROM learning_plans WHERE id = $1`,
    [planId],
  );
  const plan = planResult.rows[0];
  if (!plan) return null;

  const topics = await pool.query(
    `SELECT id::text, topic_id::text, topic_name, sequence,
            planned_classes, planned_activities, classes_done, activities_done,
            mastery_score, priority, status, source, reason
     FROM learning_plan_topics
     WHERE plan_id = $1
     ORDER BY sequence, id`,
    [planId],
  );

  return {
    planId: plan.id,
    studentId: plan.student_id,
    grade: plan.grade,
    subject: plan.subject,
    classesRemaining: plan.classes_remaining,
    lastUpdateKind: plan.last_update_kind,
    topics: topics.rows.map((r) => ({
      id: r.id,
      topicId: r.topic_id,
      topicName: r.topic_name,
      sequence: r.sequence,
      plannedClasses: r.planned_classes,
      plannedActivities: r.planned_activities,
      classesDone: r.classes_done,
      activitiesDone: r.activities_done,
      masteryScore: r.mastery_score,
      priority: r.priority,
      status: r.status,
      source: r.source,
      reason: r.reason,
    })),
  };
}

/**
 * Applies an update to a plan, or refuses it.
 *
 * Refusal is a normal outcome, not an error: the nightly auto pass is expected
 * to bounce off any plan a mentor touched last. Callers should surface
 * `blockedReason` rather than retrying.
 */
export async function applyPlanUpdate(
  planId: string,
  update: PlanUpdate,
): Promise<PlanUpdateResult> {
  const state = await getPlanState(planId);
  if (!state) {
    return {
      applied: false,
      changes: [],
      warnings: [],
      blockedReason: "Plan not found.",
    };
  }

  const last = state.lastUpdateKind === "initial" ? null : state.lastUpdateKind;
  if (!canApplyUpdate(last, update.kind)) {
    return {
      applied: false,
      changes: [],
      warnings: [],
      blockedReason:
        "A mentor edited this plan by hand — automatic updates are paused until the next class.",
    };
  }

  const changes: string[] = [];
  const warnings: string[] = [];
  const before = structuredClone(state.topics);
  const byTopicId = new Map(
    state.topics.filter((t) => t.topicId).map((t) => [t.topicId as string, t]),
  );

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (update.kind === "manual" || update.kind === "class") {
      for (const topicId of update.addTopicIds ?? []) {
        if (byTopicId.has(topicId)) {
          warnings.push(`Topic ${topicId} is already in the plan.`);
          continue;
        }
        const added = await addTopicToPlan(client, state, topicId, update.kind);
        if (added) changes.push(`Added ${added}.`);
        else
          warnings.push(`No curriculum defaults found for topic ${topicId}.`);
      }

      for (const topicId of update.removeTopicIds ?? []) {
        const topic = byTopicId.get(topicId);
        if (!topic) continue;
        await client.query(
          `UPDATE learning_plan_topics SET status = 'dropped' WHERE id = $1`,
          [topic.id],
        );
        changes.push(`Removed ${topic.topicName}.`);
      }
    }

    if (update.kind === "manual") {
      for (const { topicId, classes } of update.setClasses ?? []) {
        const topic = byTopicId.get(topicId);
        if (!topic) continue;
        const next = Math.max(MIN_CLASSES_PER_TOPIC, classes);
        if (next < topic.classesDone) {
          warnings.push(
            `${topic.topicName}: ${next} classes is fewer than the ${topic.classesDone} already taught — kept at ${topic.classesDone}.`,
          );
          continue;
        }
        await client.query(
          `UPDATE learning_plan_topics
           SET planned_classes = $2, source = 'manual'
           WHERE id = $1`,
          [topic.id, next],
        );
        changes.push(
          `${topic.topicName}: classes ${topic.plannedClasses} → ${next}.`,
        );
      }

      for (const { topicId, activities } of update.setActivities ?? []) {
        const topic = byTopicId.get(topicId);
        if (!topic) continue;
        const next = Math.max(0, activities);
        await client.query(
          `UPDATE learning_plan_topics
           SET planned_activities = $2, source = 'manual'
           WHERE id = $1`,
          [topic.id, next],
        );
        changes.push(
          `${topic.topicName}: activities ${topic.plannedActivities} → ${next}.`,
        );
      }
    }

    if (update.kind === "class") {
      for (const covered of update.topicsCovered ?? []) {
        const topic = byTopicId.get(covered.topicId);
        if (!topic) {
          warnings.push(
            `Topic ${covered.topicId} was taught but is not in the plan.`,
          );
          continue;
        }
        // Several topics can be covered in one class, so each gets its own
        // class increment — the package counter is decremented once, below.
        const classesDone = topic.classesDone + 1;
        const activitiesDone =
          topic.activitiesDone + (covered.activitiesDone ?? 0);
        await client.query(
          `UPDATE learning_plan_topics
           SET classes_done = $2, activities_done = $3,
               mastery_score = COALESCE($4, mastery_score),
               status = CASE WHEN status = 'planned' THEN 'in_progress' ELSE status END
           WHERE id = $1`,
          [topic.id, classesDone, activitiesDone, covered.masteryScore ?? null],
        );
        changes.push(
          `${topic.topicName}: ${classesDone}/${topic.plannedClasses} classes, ${activitiesDone}/${topic.plannedActivities} activities.`,
        );
      }

      for (const topicId of update.completedTopicIds ?? []) {
        const topic = byTopicId.get(topicId);
        if (!topic) continue;
        await client.query(
          `UPDATE learning_plan_topics SET status = 'done' WHERE id = $1`,
          [topic.id],
        );
        changes.push(`${topic.topicName} marked complete.`);
      }

      const consumed = update.classesConsumed ?? 1;
      if (state.classesRemaining !== null) {
        const next = Math.max(0, state.classesRemaining - consumed);
        await client.query(
          `UPDATE learning_plans SET classes_remaining = $2 WHERE id = $1`,
          [planId, next],
        );
        changes.push(`Classes remaining: ${state.classesRemaining} → ${next}.`);
      }
    }

    if (update.kind === "auto") {
      for (const topic of state.topics) {
        if (topic.status === "done" || topic.status === "dropped") continue;
        if (topic.masteryScore === null) continue;

        const result = autoAdjustTopic({
          plannedClasses: topic.plannedClasses,
          classesDone: topic.classesDone,
          plannedActivities: topic.plannedActivities,
          activitiesDone: topic.activitiesDone,
          masteryScore: topic.masteryScore,
        });
        if (!result.changed) continue;

        await client.query(
          `UPDATE learning_plan_topics
           SET planned_classes = $2, source = 'auto', reason = $3
           WHERE id = $1`,
          [topic.id, result.plannedClasses, result.reason],
        );
        changes.push(`${topic.topicName}: ${result.reason}`);
      }
    }

    // Refit: the plan must still fit the package after any of the above.
    const refitWarnings = await refitToRemainingClasses(client, planId);
    warnings.push(...refitWarnings);

    if (changes.length === 0) {
      await client.query("ROLLBACK");
      return {
        applied: false,
        changes: [],
        warnings,
        blockedReason: "Nothing to change.",
        state,
      };
    }

    const after = await client.query(
      `SELECT id::text, topic_name, planned_classes, planned_activities,
              classes_done, status
       FROM learning_plan_topics WHERE plan_id = $1 ORDER BY sequence`,
      [planId],
    );

    const revision = await client.query(
      `INSERT INTO learning_plan_revisions (plan_id, kind, actor, summary, diff)
       VALUES ($1, $2, $3, $4, $5) RETURNING id::text`,
      [
        planId,
        update.kind,
        update.actor ?? null,
        changes.join(" "),
        JSON.stringify({ before, after: after.rows }),
      ],
    );

    await client.query(
      `UPDATE learning_plans SET last_update_kind = $2 WHERE id = $1`,
      [planId, update.kind],
    );

    await client.query("COMMIT");

    return {
      applied: true,
      revisionId: revision.rows[0].id,
      changes,
      warnings,
      state: (await getPlanState(planId)) ?? undefined,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** Pulls a topic's prefixed budget from the curriculum and inserts it. */
async function addTopicToPlan(
  client: { query: typeof pool.query },
  state: PlanState,
  topicId: string,
  source: "manual" | "class",
): Promise<string | null> {
  if (!state.grade || !state.subject) return null;
  const defaults = await getTopicDefaultsForGrade(state.grade, state.subject);
  const match = defaults.find((d) => d.topicId === topicId);
  if (!match) return null;

  const nextSequence =
    state.topics.reduce((max, t) => Math.max(max, t.sequence), 0) + 1;

  await client.query(
    `INSERT INTO learning_plan_topics
       (plan_id, topic_id, topic_name, sequence, planned_classes,
        planned_activities, priority, source, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (plan_id, topic_id) WHERE topic_id IS NOT NULL DO NOTHING`,
    [
      state.planId,
      topicId,
      match.topicName,
      nextSequence,
      match.idealClasses,
      match.idealActivities,
      match.gradePriority,
      source,
      "Added after the plan was created.",
    ],
  );
  return match.topicName;
}

/**
 * Enforces the spec's headline validation: planned classes still to be taught
 * must not exceed the classes left in the package. Overflow is dropped from the
 * lowest priority upward — the same rule the initial allocator uses.
 */
async function refitToRemainingClasses(
  client: { query: typeof pool.query },
  planId: string,
): Promise<string[]> {
  const warnings: string[] = [];

  const planResult = await client.query(
    `SELECT classes_remaining FROM learning_plans WHERE id = $1`,
    [planId],
  );
  const classesRemaining: number | null =
    planResult.rows[0]?.classes_remaining ?? null;
  if (classesRemaining === null) return warnings;

  const topics = await client.query(
    `SELECT id::text, topic_name, planned_classes, classes_done, priority
     FROM learning_plan_topics
     WHERE plan_id = $1 AND status IN ('planned','in_progress')
     ORDER BY priority NULLS LAST, sequence`,
    [planId],
  );

  const outstanding = (r: { planned_classes: number; classes_done: number }) =>
    Math.max(0, r.planned_classes - r.classes_done);

  let total = topics.rows.reduce((n, r) => n + outstanding(r), 0);

  if (total < classesRemaining) {
    // The package grew (extra classes bought, or a topic finished early), so
    // bring back the highest-priority topics that were previously squeezed out.
    // Without this a topic dropped during a lean spell would stay dropped
    // forever, even once there was room for it again.
    const dropped = await client.query(
      `SELECT id::text, topic_name, planned_classes, classes_done, priority
       FROM learning_plan_topics
       WHERE plan_id = $1 AND status = 'dropped'
       ORDER BY priority NULLS LAST, sequence`,
      [planId],
    );
    for (const row of dropped.rows) {
      const needed = outstanding(row);
      if (needed === 0 || total + needed > classesRemaining) continue;
      await client.query(
        `UPDATE learning_plan_topics
         SET status = 'planned', reason = $2
         WHERE id = $1`,
        [row.id, "Restored — classes freed up in the package."],
      );
      total += needed;
      warnings.push(`${row.topic_name} restored — there is room for it again.`);
    }
    return warnings;
  }

  if (total <= classesRemaining) return warnings;

  // Drop from the bottom of the priority list until it fits.
  for (const row of [...topics.rows].reverse()) {
    if (total <= classesRemaining) break;
    const freed = outstanding(row);
    if (freed === 0) continue;
    await client.query(
      `UPDATE learning_plan_topics
       SET status = 'dropped', reason = $2
       WHERE id = $1`,
      [row.id, "Dropped by priority — not enough classes left in the package."],
    );
    total -= freed;
    warnings.push(
      `${row.topic_name} dropped — plan exceeded the remaining classes.`,
    );
  }

  return warnings;
}
