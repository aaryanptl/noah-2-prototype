/**
 * The judgement this prototype is about: given a wrong answer, WHY was it wrong?
 *
 * One Jev request per answered question. Every question in a request sees the
 * same state and runs in parallel, so each request asks for everything the page
 * needs about that one answer at once.
 *
 * Nothing here decides anything. It produces judgements; `ladder.ts` owns the
 * policy that turns them into a difficulty decision.
 */

import type { AnsweredQuestion } from "./evidence";
import {
  type ChoiceAnswer,
  type JevQuestion,
  mapLimit,
  type NoulAnswer,
  type ScoreAnswer,
  systemOne,
} from "./jev";
import { WRONG_REASONS, type WrongReason } from "./ladder";

/** Expected time per band — `DIFFICULTY_TIME_LIMITS_MS` in the production scorer. */
export const BAND_SECONDS: Record<string, number> = {
  easy: 45,
  medium: 55,
  hard: 70,
};

/* ------------------------------------------------------------------ */
/* The questions                                                       */
/* ------------------------------------------------------------------ */

const REASON_CRITERIA: Record<WrongReason, string> = {
  conceptual_gap:
    "The student does not understand the idea or the method this question is built on. The answer they gave does not come from a correct method applied badly — it comes from not knowing what to do.",
  procedural_slip:
    "The student used the right method but made a small execution error along the way, such as a carrying, place-value, sign or arithmetic mistake. The answer they gave is what that method produces with one slip in it.",
  misread_prompt:
    "The student solved a different question from the one actually asked — they missed a step, a condition or a word in the wording. Their answer is the correct answer to that misread version.",
  likely_guess:
    "The answer together with the time taken shows the student did not genuinely attempt the question and picked something to move on.",
  careless:
    "The student almost certainly knows this material and the mistake looks like inattention rather than misunderstanding.",
};

export const WRONG_QUESTIONS: Record<string, JevQuestion> = {
  /**
   * THE decision signal. The ladder's choice is binary — make the next
   * questions easier, or hold — so this asks that binary directly rather than
   * inferring it from a five-way label. It separates far better in practice:
   * on a 52-answer sample, answers Jev called execution slips averaged 0.26
   * here while genuine gaps averaged 0.52.
   */
  realGap: {
    type: "noul",
    instructions:
      "Is this student's error caused by not knowing the method this question needs, rather than by mishandling a method they do know?",
    criteria: {
      true: "They do not have the method. Serving them an easier question is the right response.",
      false:
        "They have the method and something else went wrong — execution, reading the question, or not really attempting it. An easier question would not teach them anything.",
    },
  },
  /** The human-readable label. Explains the decision; does not make it. */
  reason: {
    type: "choice",
    instructions:
      "A student answered this question wrongly. Using the specific wrong answer they gave, what the worked solution says the wrong options mean, and how long they took, judge what most likely went wrong.",
    criteria: REASON_CRITERIA,
  },
  severity: {
    type: "score",
    instructions:
      "Based on this error alone, how much does this student need the objective taught again, rather than just more practice at it?",
    criteria: [
      "No re-teaching at all — the method is clearly there and this was an execution error",
      "Mostly there — practice would firm up the execution",
      "Shaky — they need guided practice with someone watching",
      "Not there — the objective needs teaching again from the start",
    ],
  },
  tooFast: {
    type: "noul",
    instructions:
      "Did the student spend too little time on this question to have genuinely worked it out?",
    criteria: {
      true: "The time taken is far too short for the work this question actually requires.",
      false:
        "The time taken is consistent with a real attempt at the question.",
    },
  },
};

export const CORRECT_QUESTIONS: Record<string, JevQuestion> = {
  luckyGuess: {
    type: "noul",
    instructions:
      "The student got this question right. Judging by how long they took relative to the work the question requires, and by how easily the right option could be reached without doing the work, is this more likely a guess that happened to land than a genuine solve?",
    criteria: {
      true: "The speed or the shape of the question means they probably did not actually work it out.",
      false: "This looks like a genuine solve.",
    },
  },
};

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export function buildState(q: AnsweredQuestion) {
  const expected = BAND_SECONDS[q.band] ?? 55;
  return {
    grade: q.grade,
    topic: q.topic,
    objective: q.objectiveName,
    questionType: q.questionType,
    difficulty: q.band,
    question: q.prompt,
    ...(q.options.length > 0
      ? {
          options: q.options.map((o) => ({
            text: o.text,
            isCorrect: o.correct,
            studentPickedThis: o.text.trim() === q.studentAnswer.trim(),
          })),
        }
      : {}),
    correctAnswer: q.correctAnswer,
    studentAnswer: q.studentAnswer,
    workedSolution: q.explanation,
    ...(q.modelAnswer ? { modelAnswer: q.modelAnswer } : {}),
    secondsTaken:
      q.timeTakenMs === null ? null : Math.round(q.timeTakenMs / 1000),
    secondsATypicalStudentTakes: expected,
  };
}

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

export interface Judgement {
  ordinal: number;
  /**
   * Probability the error is a missing method rather than a mishandled one.
   * This is what the ladder policy reads. null for correct answers.
   */
  realGap: number | null;
  /** null for correct answers — the reason questions are only asked about wrong ones. */
  reason: WrongReason | null;
  reasonConfidence: number | null;
  reasonProbabilities: Record<string, number> | null;
  /** 0–3 on the re-teaching scale, null for correct answers. */
  severity: number | null;
  severityLegend: Record<string, string> | null;
  tooFast: number | null;
  /** Probability a CORRECT answer was really a guess. null for wrong answers. */
  luckyGuess: number | null;
  error: string | null;
}

export interface ClassifyResult {
  judgements: Judgement[];
  model: string | null;
  inputTokens: number;
  outputTokens: number;
  requests: number;
  ms: number;
}

const isChoice = (a: unknown): a is ChoiceAnswer =>
  typeof a === "object" && a !== null && (a as ChoiceAnswer).type === "choice";
const isNoul = (a: unknown): a is NoulAnswer =>
  typeof a === "object" && a !== null && (a as NoulAnswer).type === "noul";
const isScore = (a: unknown): a is ScoreAnswer =>
  typeof a === "object" && a !== null && (a as ScoreAnswer).type === "score";

const emptyJudgement = (
  ordinal: number,
  error: string | null = null,
): Judgement => ({
  ordinal,
  realGap: null,
  reason: null,
  reasonConfidence: null,
  reasonProbabilities: null,
  severity: null,
  severityLegend: null,
  tooFast: null,
  luckyGuess: null,
  error,
});

export interface ClassifyOneResult {
  judgement: Judgement;
  model: string | null;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Ask Jev about one answered question. Wrong answers get the reason questions,
 * right ones only the lucky-guess check. Never throws — a failed call comes
 * back as an empty judgement carrying the error, and the ladder falls back to
 * today's rule for it.
 */
export async function classifyOne(
  q: AnsweredQuestion,
): Promise<ClassifyOneResult> {
  const wrong = q.verdict === "incorrect" || q.verdict === "partial";
  try {
    const res = await systemOne(
      buildState(q),
      wrong ? WRONG_QUESTIONS : CORRECT_QUESTIONS,
    );

    const judgement = emptyJudgement(q.ordinal);
    const realGap = res.answers.realGap;
    if (isNoul(realGap)) judgement.realGap = realGap.noul;
    const reason = res.answers.reason;
    if (isChoice(reason)) {
      judgement.reason = (WRONG_REASONS as readonly string[]).includes(
        reason.choice,
      )
        ? (reason.choice as WrongReason)
        : null;
      judgement.reasonConfidence = reason.confidence;
      judgement.reasonProbabilities = reason.probabilities;
    }
    const severity = res.answers.severity;
    if (isScore(severity)) {
      judgement.severity = severity.score;
      judgement.severityLegend = severity.legend;
    }
    const tooFast = res.answers.tooFast;
    if (isNoul(tooFast)) judgement.tooFast = tooFast.noul;
    const luckyGuess = res.answers.luckyGuess;
    if (isNoul(luckyGuess)) judgement.luckyGuess = luckyGuess.noul;
    return {
      judgement,
      model: res.model,
      inputTokens: res.usage?.input_tokens ?? 0,
      outputTokens: res.usage?.output_tokens ?? 0,
    };
  } catch (error) {
    return {
      judgement: emptyJudgement(
        q.ordinal,
        error instanceof Error ? error.message : "Jev call failed",
      ),
      model: null,
      inputTokens: 0,
      outputTokens: 0,
    };
  }
}

/**
 * Ask Jev about every answered question in the run.
 *
 * Skips non-attempts — a skip has no answer to read a reason from, and the
 * ladder treats it the same either way.
 */
export async function classifyRun(
  questions: AnsweredQuestion[],
  concurrency = 6,
): Promise<ClassifyResult> {
  const started = Date.now();
  const askable = questions.filter((q) => q.verdict !== "non_attempt");

  let model: string | null = null;
  let inputTokens = 0;
  let outputTokens = 0;

  const results = await mapLimit(askable, concurrency, async (q) => {
    const res = await classifyOne(q);
    model ??= res.model;
    inputTokens += res.inputTokens;
    outputTokens += res.outputTokens;
    return res.judgement;
  });

  const byOrdinal = new Map(results.map((j) => [j.ordinal, j]));
  return {
    judgements: questions.map(
      (q) => byOrdinal.get(q.ordinal) ?? emptyJudgement(q.ordinal),
    ),
    model,
    inputTokens,
    outputTokens,
    requests: askable.length,
    ms: Date.now() - started,
  };
}
