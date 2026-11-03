/**
 * The presenter's version of the mastery loop: every rule in plain words, and
 * a deterministic made-up student for `/mastery/story`.
 *
 * Nothing here changes a decision. The decisions are `routeNext` from
 * `rules.ts`; this file only says them in words a non-engineer can follow and
 * plays out sessions for a student who does not exist.
 */
import {
  type Activity,
  type Decision,
  LO_FLOOR,
  type LoRow,
  MASTERY_BAR,
  type Measurement,
  modeForActivity,
  type Scorecard,
} from "./rules";

export const PLAIN_STEP: Record<
  Activity,
  { title: string; why: string; human: boolean }
> = {
  close: {
    title: "Master badge — topic closed",
    why: `A test at ${MASTERY_BAR}%+, every objective at ${LO_FLOOR}+, at a normal speed. The classes left on this topic go back to the plan.`,
    human: false,
  },
  escalate: {
    title: "Flag to the teacher: at risk",
    why: "Three rounds of fixing the gaps and still no mastery. The loop stops rather than cycling silently.",
    human: true,
  },
  reteach: {
    title: "The teacher re-teaches the topic",
    why: "The last test was under 60%. That usually means the concept never landed in class, so more practice will not fix it.",
    human: true,
  },
  micro_homework: {
    title: "Micro-homework on the weak objectives",
    why: `Close to mastery but not there. Six questions aimed at exactly what the test exposed.`,
    human: false,
  },
  practice: {
    title: "Practice with hints, on the weakest objective",
    why: "One round of micro-homework did not move it. Practise the method before the next re-test.",
    human: false,
  },
  recurring_test: {
    title: "Recurring test, weighted to the weak spots",
    why: "The gaps have had their work. Re-test, mostly on the objectives that were short.",
    human: false,
  },
  topic_test: {
    title: "The topic test",
    why: "Enough homework since the start. Time to measure the whole topic under test conditions.",
    human: false,
  },
  homework: {
    title: "Homework: weak spots, the next objective, a review",
    why: "60% on the weakest objectives, 25% on the next one to learn, 15% to keep strong ones fresh.",
    human: false,
  },
};

/** Questions per objective the activity would serve. */
export function questionsFor(decision: Decision): Map<number, number> {
  return new Map(decision.plan.map((item) => [item.loId, item.questions]));
}

/**
 * Play one session for a made-up student. Deterministic: with chance p of a
 * right answer on n questions she gets round(n·p) right, so the presenter gets
 * the same story every time.
 */
export function playSession(
  decision: Decision,
  chance: (loId: number) => number,
  sessionId: number,
  at: string,
  /** Her typical time ÷ the cohort median. */
  speedRatio = 1,
): Measurement[] {
  const mode = modeForActivity(decision.activity);
  if (!mode) return [];
  if (mode === "class")
    return decision.targetLoIds.map((loId) => ({
      sessionId,
      mode,
      at,
      loId,
      answered: 0,
      correct: 0,
    }));
  return [...questionsFor(decision)].map(([loId, n]) => ({
    sessionId,
    mode,
    at,
    loId,
    answered: n,
    correct: Math.round(n * chance(loId)),
    speedRatio,
  }));
}

/**
 * §4 Progress Narration — the result page in deltas, not just a score.
 * Plain lines from the map: the biggest gain since point A, the objective
 * holding the student back, and the distance to the Master badge.
 */
export function progressNotes(card: Scorecard): string[] {
  const notes: string[] = [];
  const rows = card.rows.filter((row) => row.score !== null);
  if (rows.length === 0) return notes;
  const gain = (row: LoRow) => (row.score ?? 0) - (row.firstScore ?? 0);
  const best = [...rows]
    .filter((row) => row.firstScore !== null && row.history.length > 1)
    .sort((a, b) => gain(b) - gain(a))[0];
  if (best && gain(best) >= 5)
    notes.push(
      `${best.name}: ${Math.round(best.firstScore ?? 0)} → ${Math.round(best.score ?? 0)} since the first session, the biggest jump.`,
    );
  if (card.phase === "mastered") {
    notes.push("Master badge earned. The topic is closed.");
    return notes;
  }
  const short = card.rows
    .filter((row) => row.score === null || row.score < LO_FLOOR)
    .sort((a, b) => (a.score ?? -1) - (b.score ?? -1));
  if (short.length > 0) {
    const worst = short[0];
    const test = card.lastTest;
    notes.push(
      worst.score === null
        ? `${worst.name} has no answers yet.`
        : `Holding the student back: ${worst.name} at ${Math.round(worst.score)}${test && worst.lastMode === "diagnostic" ? " under test conditions" : ""}.`,
    );
    notes.push(
      `${short.length} objective${short.length === 1 ? "" : "s"} away from the ${LO_FLOOR} floor every objective needs for the Master badge.`,
    );
  } else if (card.lastTest && card.lastTest.gate.speed === false) {
    notes.push(
      `Every objective is at ${LO_FLOOR}+, but the last test took ${card.lastTest.speedRatio}× the usual time.`,
    );
  } else {
    notes.push(
      `Every objective is at ${LO_FLOOR}+. A test at ${MASTERY_BAR}%+ earns the Master badge.`,
    );
  }
  return notes;
}
