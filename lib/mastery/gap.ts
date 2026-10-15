/**
 * Gap vs slip, per objective — the summary of Jev's judgements on a student's
 * wrong answers (`errors.ts`). Pure, so the page and the back-test share it.
 *
 * NOT a rule. `rules.ts` does not read this. It sits next to the loop's
 * decision so a reader can see when the two disagree, and the back-test
 * (`scripts/mastery-analysis/backtest-gap-share.ts`) decides whether it is
 * allowed to become one.
 */
import type { WrongReason } from "../why-wrong/ladder";
import { WRONG_REASONS } from "../why-wrong/ladder";
import type { MasteryMode } from "./rules";

/** The most recent wrong answers per objective that the read looks at. */
export const ERROR_WINDOW = 8;
/** Fewer judged wrong answers than this and there is no read. */
export const ERROR_MIN = 3;
/**
 * Where the mean gap probability tips the read: the tertiles of gap share over
 * 812 real student × objective snapshots. Descriptive only — the back-test found
 * gap share does not predict the outcome (docs/mastery-analysis/gap-share-backtest.md).
 */
export const GAP_LEAN = 0.43;
export const SLIP_LEAN = 0.31;
/** Share of wrong answers that were guesses before the read says "guessing". */
export const GUESS_LEAN = 0.4;
/** Jev's too-fast probability above which a wrong answer counts as a guess. */
export const TOO_FAST = 0.5;

export interface ErrorJudgement {
  tsq: number;
  loId: number;
  sessionId: number;
  mode: MasteryMode;
  at: string;
  /** Probability the error is a missing method rather than a mishandled one. */
  realGap: number | null;
  reason: WrongReason | null;
  tooFast: number | null;
  /** 0–3 on the re-teaching scale. */
  severity: number | null;
}

export type ErrorReading = "too_few" | "gap" | "mixed" | "slip" | "guessing";

export const READING_LABEL: Record<ErrorReading, string> = {
  too_few: "Too few errors",
  gap: "Missing the method",
  mixed: "Mixed",
  slip: "Has it, slipping",
  guessing: "Guessing",
};

export interface LoErrorRead {
  loId: number;
  /** Every wrong first response on the objective. */
  wrong: number;
  /** Judged answers inside the window. */
  judged: number;
  /** Mean `realGap` over the window. */
  gapShare: number | null;
  /** Share of the window that is a guess (labelled one, or too fast). */
  guessShare: number | null;
  /** Mean severity, 0–3. */
  severity: number | null;
  reasons: Record<WrongReason, number>;
  reading: ErrorReading;
}

const mean = (values: number[]) =>
  values.length === 0
    ? null
    : values.reduce((sum, v) => sum + v, 0) / values.length;

export const isGuess = (j: Pick<ErrorJudgement, "reason" | "tooFast">) =>
  j.reason === "likely_guess" || (j.tooFast ?? 0) >= TOO_FAST;

export function readErrors(
  judged: ErrorJudgement[],
): Omit<LoErrorRead, "loId" | "wrong"> {
  const window = [...judged]
    .sort((a, b) => a.at.localeCompare(b.at) || a.tsq - b.tsq)
    .slice(-ERROR_WINDOW);
  const reasons = Object.fromEntries(
    WRONG_REASONS.map((r) => [r, 0]),
  ) as Record<WrongReason, number>;
  for (const j of window) if (j.reason) reasons[j.reason] += 1;

  const gapShare = mean(
    window.flatMap((j) => (j.realGap === null ? [] : [j.realGap])),
  );
  const guessShare =
    window.length === 0 ? null : window.filter(isGuess).length / window.length;
  const severity = mean(
    window.flatMap((j) => (j.severity === null ? [] : [j.severity])),
  );

  let reading: ErrorReading = "too_few";
  if (window.length >= ERROR_MIN && gapShare !== null) {
    if ((guessShare ?? 0) >= GUESS_LEAN) reading = "guessing";
    else if (gapShare >= GAP_LEAN) reading = "gap";
    else if (gapShare <= SLIP_LEAN) reading = "slip";
    else reading = "mixed";
  }
  return {
    judged: window.length,
    gapShare,
    guessShare,
    severity,
    reasons,
    reading,
  };
}

/** One read per objective, in the order given. */
export function readErrorsByLo(
  loIds: number[],
  judgements: ErrorJudgement[],
  wrongByLo: Map<number, number>,
): LoErrorRead[] {
  return loIds.map((loId) => ({
    loId,
    wrong: wrongByLo.get(loId) ?? 0,
    ...readErrors(judgements.filter((j) => j.loId === loId)),
  }));
}
