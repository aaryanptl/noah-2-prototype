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
  CHECK_QUESTIONS,
  type Decision,
  type MasteryMode,
  type Measurement,
  SURVEY_CAP,
  SURVEY_PER_LO,
} from "./rules";

export const PLAIN_STEP: Record<
  Activity,
  { title: string; why: string; human: boolean }
> = {
  close: {
    title: "Topic done — move on",
    why: "Every objective has been proven with a check.",
    human: false,
  },
  topic_class: {
    title: "A mentor re-teaches the whole topic",
    why: "Every objective is weak, on plenty of questions. More homework will not fix a topic that never landed.",
    human: true,
  },
  escalate: {
    title: "Tell the teacher",
    why: "Several sessions in a row and nothing is improving. Working alone is not helping.",
    human: true,
  },
  survey: {
    title: "A short test on each objective",
    why: "We do not know enough yet to decide anything.",
    human: false,
  },
  class: {
    title: "A mentor class",
    why: "One objective has been stuck in the middle for several sessions. Homework is not moving it; a person will.",
    human: true,
  },
  check: {
    title: "Prove it: a 5-question check",
    why: "Strong on enough questions. A short check signs it off, so the student stops repeating what they know.",
    human: false,
  },
  practice: {
    title: "Practice with hints, on the weak objective only",
    why: "One objective is clearly weak. Practice the method there, not the whole topic again.",
    human: false,
  },
  topic_test: {
    title: "Measure again: a short re-test",
    why: "Two sessions of homework since the last test. Time to see what changed.",
    human: false,
  },
  homework: {
    title: "Homework, aimed at the weak spots",
    why: "Mostly the weakest objectives, one we know little about, and one strong one to keep fresh.",
    human: false,
  },
};

/** Which recorded session an activity produces, or null for "close". */
export function modeFor(activity: Activity): MasteryMode | null {
  switch (activity) {
    case "survey":
    case "topic_test":
      return "diagnostic";
    case "homework":
      return "homework";
    case "practice":
      return "practice";
    case "check":
      return "check";
    case "class":
    case "topic_class":
    case "escalate":
      return "class";
    default:
      return null;
  }
}

const PRACTICE_QUESTIONS = 5;

/** Questions per objective the activity would serve. */
export function questionsFor(decision: Decision): Map<number, number> {
  const out = new Map<number, number>();
  switch (decision.activity) {
    case "survey": {
      const per = Math.max(
        1,
        Math.min(
          SURVEY_PER_LO,
          Math.floor(SURVEY_CAP / Math.max(1, decision.targetLoIds.length)),
        ),
      );
      for (const id of decision.targetLoIds) out.set(id, per);
      break;
    }
    case "topic_test":
      for (const item of decision.testPlan ?? [])
        out.set(item.loId, item.questions);
      break;
    case "homework":
      for (const item of decision.homeworkPlan ?? [])
        out.set(item.loId, item.questions);
      break;
    case "practice":
      for (const id of decision.targetLoIds) out.set(id, PRACTICE_QUESTIONS);
      break;
    case "check":
      for (const id of decision.targetLoIds) out.set(id, CHECK_QUESTIONS);
      break;
    default:
      break;
  }
  return out;
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
): Measurement[] {
  const mode = modeFor(decision.activity);
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
  }));
}
