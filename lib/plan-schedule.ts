// Turns a topic allocation into a dated session schedule.
//
// The allocation says "Fractions gets 5 classes"; this decides which calendar
// dates those 5 classes land on and what each one is for. Keeping it separate
// and pure means the schedule can be regenerated whenever the allocation changes
// — after a class, a manual edit, or the nightly pass — without touching the
// allocator or calling a model.

import type { TopicDefaults } from "@/lib/curriculum-defaults";
import type { PlanFocus } from "@/lib/learning-plans";
import type { AllocatedTopic } from "@/lib/plan-allocator";

export interface ScheduledSession {
  sessionDate: string;
  topicId: string;
  topic: string;
  /** Which class this is within the topic's block, 1-based. */
  classNumber: number;
  classesInTopic: number;
  focus: PlanFocus;
  /** Objective this session leads on, cycled across the topic's block. */
  learningObjective: string | null;
  /** Practice questions allotted to this session. */
  activities: number;
}

/**
 * Spreads a topic's activity budget across its classes, giving the remainder to
 * the earliest sessions so a 2-class/7-activity topic reads 4 then 3, not 3/3/1.
 */
function splitActivities(total: number, classes: number): number[] {
  if (classes <= 0) return [];
  const base = Math.floor(total / classes);
  const remainder = total % classes;
  return Array.from(
    { length: classes },
    (_, i) => base + (i < remainder ? 1 : 0),
  );
}

/**
 * Focus for one class within a topic block:
 * first is instruction, last is consolidation, the middle is practice.
 * A single-class topic is still a teach.
 */
function focusFor(classNumber: number, classesInTopic: number): PlanFocus {
  if (classNumber === 1) return "teach";
  if (classesInTopic >= 3 && classNumber === classesInTopic) return "review";
  return "practice";
}

export interface BuildScheduleInput {
  allocated: AllocatedTopic[];
  /** Teacher-picked dates, ascending. One date = one class. */
  dates: string[];
  /** Objectives per topic, for cycling through a topic's block. */
  defaults: TopicDefaults[];
  /** Reserve the final session as a check-in when the plan is long enough. */
  assessAtEnd?: boolean;
}

/**
 * Lays allocated topics onto dates in sequence order.
 *
 * Topics are taught in blocks rather than interleaved: the allocation's sequence
 * follows curriculum priority, which respects prerequisites, so teaching a topic
 * to completion before moving on is the safe default. Spaced review is handled
 * by the final `review` class in each block.
 */
export function buildSchedule(input: BuildScheduleInput): ScheduledSession[] {
  const { allocated, dates, defaults, assessAtEnd = true } = input;
  const objectivesByTopic = new Map(
    defaults.map((d) => [d.topicId, d.objectives.map((o) => o.name)]),
  );

  const sessions: ScheduledSession[] = [];
  let dateIndex = 0;

  for (const topic of allocated) {
    const activitySplit = splitActivities(
      topic.plannedActivities,
      topic.plannedClasses,
    );
    const objectives = objectivesByTopic.get(topic.topicId) ?? [];

    for (let n = 1; n <= topic.plannedClasses; n++) {
      if (dateIndex >= dates.length) break;
      sessions.push({
        sessionDate: dates[dateIndex],
        topicId: topic.topicId,
        topic: topic.topicName,
        classNumber: n,
        classesInTopic: topic.plannedClasses,
        focus: focusFor(n, topic.plannedClasses),
        // Cycle objectives so a 5-class / 3-objective topic revisits rather than
        // running out and leaving later sessions unanchored.
        learningObjective:
          objectives.length > 0
            ? objectives[(n - 1) % objectives.length]
            : null,
        activities: activitySplit[n - 1] ?? 0,
      });
      dateIndex++;
    }
    if (dateIndex >= dates.length) break;
  }

  // Any date the allocation didn't reach becomes consolidation rather than being
  // dropped — the teacher picked it, so it must produce a session.
  while (dateIndex < dates.length) {
    const previous = sessions[sessions.length - 1];
    sessions.push({
      sessionDate: dates[dateIndex],
      topicId: previous?.topicId ?? "",
      topic: previous?.topic ?? "Revision",
      classNumber: 1,
      classesInTopic: 1,
      focus: "review",
      learningObjective: previous?.learningObjective ?? null,
      activities: 0,
    });
    dateIndex++;
  }

  if (assessAtEnd && sessions.length >= 4) {
    sessions[sessions.length - 1].focus = "assess";
  }

  return sessions;
}
