// The deterministic core of the learning plan builder.
//
// A plan is an allocation over TOPICS — how many classes and how many practice
// activities each topic gets — not a list of calendar dates. The schedule is
// derived from this allocation later; this module decides the shape.
//
// Everything here is pure: no DB, no model, no dates. That matters because the
// same functions run in three places — first plan, manual override refit, and the
// daily auto-update — and all three must agree. Model involvement is limited to
// writing prose about an allocation this module has already fixed.

import type { TopicDefaults } from "@/lib/curriculum-defaults";

export type MasteryState =
  | "not_started"
  | "emerging"
  | "developing"
  | "secure"
  | "advanced";

/** What we know about a student's standing on one topic. */
export interface StudentTopicSignal {
  topicId: string;
  /** 0–100 from placement test, homework, practice or class tests. */
  masteryScore?: number | null;
  masteryState?: MasteryState | null;
  classesDone?: number;
  activitiesDone?: number;
}

export interface AllocationInput {
  /** Candidate topics with their prefixed budgets, any order. */
  topics: TopicDefaults[];
  /** Classes left in the student's package. The hard ceiling for the plan. */
  classesRemaining: number;
  /** Evidence per topic; absent means "no evidence, teach it in full". */
  signals?: StudentTopicSignal[];
  /** Topics already finished — never re-planned. */
  completedTopicIds?: string[];
  /** Teacher-pinned topics: kept even if priority would drop them. */
  requiredTopicIds?: string[];
  /**
   * Beyond this many classes, stop planning topic-by-topic and park the surplus
   * as revision / school-help time. The spec's "max fit" rule.
   */
  maxPlannedClasses?: number;
}

export interface AllocatedTopic {
  topicId: string;
  topicName: string;
  sequence: number;
  plannedClasses: number;
  plannedActivities: number;
  priority: number;
  /** Why this topic got this budget — surfaced to the mentor, not just logged. */
  reason: string;
}

export interface DeferredTopic {
  topicId: string;
  topicName: string;
  priority: number;
  reason: string;
}

export interface AllocationResult {
  allocated: AllocatedTopic[];
  /** Dropped because the classes ran out; lowest priority goes first. */
  deferred: DeferredTopic[];
  classesPlanned: number;
  activitiesPlanned: number;
  /** Classes left over after every topic is covered — revision / school help. */
  revisionClasses: number;
  warnings: string[];
}

/** Below this, a topic is treated as not yet learnt and gets its full budget. */
const WEAK_SCORE = 40;
const PARTIAL_SCORE = 60;
const STRONG_SCORE = 80;

/** A planned topic never drops below one class — only a human marks it off. */
export const MIN_CLASSES_PER_TOPIC = 1;

/** Auto-updates may add at most this many classes at once, to avoid disruption. */
export const MAX_AUTO_INCREASE = 2;

/** Mastery is assumed once this share of the allocated classes is done. */
export const MASTERY_CLASS_FRACTION = 0.75;

function effectiveScore(signal?: StudentTopicSignal): number | null {
  if (!signal) return null;
  if (typeof signal.masteryScore === "number") return signal.masteryScore;
  switch (signal.masteryState) {
    case "not_started":
      return 0;
    case "emerging":
      return 30;
    case "developing":
      return 55;
    case "secure":
      return 80;
    case "advanced":
      return 95;
    default:
      return null;
  }
}

/**
 * Scales a topic's prefixed budget by what the student already shows.
 *
 * Activities scale with classes so the practice-per-class rate stays constant —
 * a student who needs half the teaching also needs proportionally less drill.
 */
function scaleForMastery(
  topic: TopicDefaults,
  signal: StudentTopicSignal | undefined,
): { classes: number; activities: number; reason: string } {
  const score = effectiveScore(signal);

  if (score === null) {
    return {
      classes: topic.idealClasses,
      activities: topic.idealActivities,
      reason: "No evidence yet — full teaching budget.",
    };
  }

  let factor = 1;
  let reason = `Weak (${Math.round(score)}%) — full teaching budget.`;
  if (score >= STRONG_SCORE) {
    factor = 0.5;
    reason = `Strong (${Math.round(score)}%) — halved, kept for consolidation.`;
  } else if (score >= PARTIAL_SCORE) {
    factor = 0.75;
    reason = `Partly secure (${Math.round(score)}%) — trimmed to close the gap.`;
  } else if (score >= WEAK_SCORE) {
    factor = 1;
    reason = `Developing (${Math.round(score)}%) — full teaching budget.`;
  }

  return {
    classes: Math.max(
      MIN_CLASSES_PER_TOPIC,
      Math.round(topic.idealClasses * factor),
    ),
    activities: Math.max(1, Math.round(topic.idealActivities * factor)),
    reason,
  };
}

/**
 * Builds the topic allocation for a plan.
 *
 * Order of operations matters and follows the spec's validation rules:
 *   1. drop completed topics
 *   2. scale each remaining topic by mastery
 *   3. take topics in priority order until the class budget is exhausted
 *   4. anything that doesn't fit is deferred, lowest priority first
 *   5. leftover classes become revision time
 */
export function allocatePlan(input: AllocationInput): AllocationResult {
  const {
    topics,
    classesRemaining,
    signals = [],
    completedTopicIds = [],
    requiredTopicIds = [],
    maxPlannedClasses,
  } = input;

  const warnings: string[] = [];
  const signalByTopic = new Map(signals.map((s) => [s.topicId, s]));
  const completed = new Set(completedTopicIds);
  const required = new Set(requiredTopicIds);

  if (classesRemaining <= 0) {
    return {
      allocated: [],
      deferred: [],
      classesPlanned: 0,
      activitiesPlanned: 0,
      revisionClasses: 0,
      warnings: ["No classes remaining — nothing to plan."],
    };
  }

  const budget = Math.min(
    classesRemaining,
    maxPlannedClasses ?? classesRemaining,
  );

  const candidates = topics
    .filter((t) => !completed.has(t.topicId))
    .map((t) => ({
      topic: t,
      scaled: scaleForMastery(t, signalByTopic.get(t.topicId)),
    }));

  // Ordering decides both teaching sequence and — because the budget is spent
  // top-down — which topics survive a squeeze. Three tiers:
  //   1. teacher-pinned, which must never be dropped
  //   2. evidence band, so a topic the student is demonstrably weak at outranks
  //      one with no evidence. Sorting on curriculum priority alone gave the
  //      weakest topic whatever classes happened to be left over.
  //   3. curriculum priority, which respects prerequisites among equals
  const evidenceBand = (topicId: string): number => {
    const score = effectiveScore(signalByTopic.get(topicId));
    if (score === null) return 1; // unknown: after known gaps, before known strengths
    if (score < PARTIAL_SCORE) return 0; // demonstrated gap: teach first
    return 2; // already secure: consolidate last
  };

  candidates.sort((a, b) => {
    const aPinned = required.has(a.topic.topicId) ? 0 : 1;
    const bPinned = required.has(b.topic.topicId) ? 0 : 1;
    if (aPinned !== bPinned) return aPinned - bPinned;

    const aBand = evidenceBand(a.topic.topicId);
    const bBand = evidenceBand(b.topic.topicId);
    if (aBand !== bBand) return aBand - bBand;

    return a.topic.gradePriority - b.topic.gradePriority;
  });

  const allocated: AllocatedTopic[] = [];
  const deferred: DeferredTopic[] = [];
  let used = 0;

  for (const { topic, scaled } of candidates) {
    const remaining = budget - used;

    if (remaining < MIN_CLASSES_PER_TOPIC) {
      deferred.push({
        topicId: topic.topicId,
        topicName: topic.topicName,
        priority: topic.gradePriority,
        reason: "No classes left in the package.",
      });
      continue;
    }

    // Partial fit: give the topic what's left rather than dropping it entirely,
    // and scale its activities down to match so the ratio holds.
    const classes = Math.min(scaled.classes, remaining);
    const activities =
      classes === scaled.classes
        ? scaled.activities
        : Math.max(
            1,
            Math.round((scaled.activities * classes) / scaled.classes),
          );

    if (classes < scaled.classes) {
      warnings.push(
        `${topic.topicName}: trimmed to ${classes} of ${scaled.classes} classes to fit the package.`,
      );
    }

    allocated.push({
      topicId: topic.topicId,
      topicName: topic.topicName,
      sequence: allocated.length + 1,
      plannedClasses: classes,
      plannedActivities: activities,
      priority: topic.gradePriority,
      reason: scaled.reason,
    });
    used += classes;
  }

  if (deferred.length > 0) {
    warnings.push(
      `${deferred.length} topic(s) dropped by priority — ${classesRemaining} classes cannot cover ${candidates.length} topics.`,
    );
  }

  const revisionClasses = Math.max(0, classesRemaining - used);
  if (revisionClasses > 0 && deferred.length === 0) {
    warnings.push(
      `${revisionClasses} class(es) beyond the syllabus — reserved for revision and school help.`,
    );
  }

  return {
    allocated,
    deferred,
    classesPlanned: used,
    activitiesPlanned: allocated.reduce((n, a) => n + a.plannedActivities, 0),
    revisionClasses,
    warnings,
  };
}

// ── Auto-scaling ─────────────────────────────────────────────────────────────

export interface AutoAdjustInput {
  plannedClasses: number;
  classesDone: number;
  plannedActivities: number;
  activitiesDone: number;
  /** Current mastery on the topic, 0–100. */
  masteryScore: number;
}

export interface AutoAdjustResult {
  plannedClasses: number;
  changed: boolean;
  reason: string;
}

/**
 * The daily automatic adjustment for one topic.
 *
 * Two rules from the spec, deliberately conservative:
 *  - cut when mastery is reached at ~75% of the allocated classes, never to zero
 *  - add up to 2 classes when fewer than 2 remain and the student is struggling
 */
export function autoAdjustTopic(input: AutoAdjustInput): AutoAdjustResult {
  const { plannedClasses, classesDone, masteryScore } = input;
  const classesLeft = plannedClasses - classesDone;
  const noChange = { plannedClasses, changed: false, reason: "" };

  if (classesLeft <= 0)
    return { ...noChange, reason: "Topic already fully taught." };

  const masteryThreshold = plannedClasses * MASTERY_CLASS_FRACTION;

  if (
    masteryScore >= STRONG_SCORE &&
    classesDone >= 1 &&
    classesDone < masteryThreshold
  ) {
    // Mastery reached early — keep one class to consolidate and hand the rest back.
    const next = Math.max(MIN_CLASSES_PER_TOPIC, classesDone + 1);
    if (next >= plannedClasses)
      return { ...noChange, reason: "Already minimal." };
    return {
      plannedClasses: next,
      changed: true,
      reason: `Mastery at ${Math.round(masteryScore)}% after ${classesDone} of ${plannedClasses} classes — cut to ${next}.`,
    };
  }

  if (classesLeft < 2 && masteryScore < WEAK_SCORE) {
    const next = plannedClasses + MAX_AUTO_INCREASE;
    return {
      plannedClasses: next,
      changed: true,
      reason: `Still at ${Math.round(masteryScore)}% with ${classesLeft} class(es) left — extended by ${MAX_AUTO_INCREASE}.`,
    };
  }

  return { ...noChange, reason: "Within expected range." };
}

// ── Update precedence ────────────────────────────────────────────────────────

export type UpdateKind = "manual" | "class" | "auto";

/**
 * Whether an update of `incoming` kind may modify a plan whose last change was
 * `last`. The spec's one hard rule: a manual override is protected from the
 * automatic pass until a class happens.
 */
export function canApplyUpdate(
  last: UpdateKind | null,
  incoming: UpdateKind,
): boolean {
  if (last === "manual" && incoming === "auto") return false;
  return true;
}
