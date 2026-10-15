/**
 * The Streak Ladder, and the one change this prototype proposes.
 *
 * Ported verbatim (bands, thresholds, seed rules) from the production engine at
 * `apps/diagnostic-test-agent/src/services/adaptive-engine.ts` so the "today"
 * column is the real behaviour, not a strawman.
 *
 * THE POINT OF THIS FILE: `step()` and `replayPath()` are UNCHANGED. The only
 * thing the proposal touches is `signalFor()` — what each answer is worth to the
 * ladder. Today that is a direct read of the verdict. The proposal lets a reason
 * soften it. The ladder itself, its determinism, and its resume-safety all stay
 * exactly as they are.
 */

export type DifficultyBand = "easy" | "medium" | "hard";
export type Verdict = "correct" | "partial" | "incorrect" | "non_attempt";

/** What one answered question is worth to the ladder. Severity: correct < partial < incorrect. */
export type LadderSignal = "correct" | "partial" | "incorrect";

export const BANDS: DifficultyBand[] = ["easy", "medium", "hard"];

/** Engine constants — ADAPTIVE in adaptive-engine.ts. */
export const SEED_BAND: DifficultyBand = "medium";
export const SEED_COUNT = 3; // first N questions are always the seed band
export const PROMOTE_STREAK = 2; // consecutive correct signals to move up

export const BAND_LABEL: Record<DifficultyBand, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/* ------------------------------------------------------------------ */
/* The ladder — unchanged from production                              */
/* ------------------------------------------------------------------ */

export interface LadderState {
  band: DifficultyBand;
  streak: number;
}

const bandIndex = (b: DifficultyBand) => BANDS.indexOf(b);
const clampBand = (i: number): DifficultyBand =>
  BANDS[Math.max(0, Math.min(BANDS.length - 1, i))] ?? SEED_BAND;
const up = (b: DifficultyBand) => clampBand(bandIndex(b) + 1);
const down = (b: DifficultyBand) => clampBand(bandIndex(b) - 1);

/** Apply one signal to the ladder. Pure. */
export function step(state: LadderState, signal: LadderSignal): LadderState {
  if (signal === "correct") {
    const streak = state.streak + 1;
    return streak >= PROMOTE_STREAK
      ? { band: up(state.band), streak: 0 }
      : { band: state.band, streak };
  }
  if (signal === "partial") return { band: state.band, streak: 0 };
  return { band: down(state.band), streak: 0 };
}

/**
 * The band each question in the run would be served at, given the signals the
 * earlier questions produced. The first `SEED_COUNT` sit at the seed band; after
 * that the ladder is replayed from scratch every time, which is what makes it
 * deterministic and resume-safe.
 *
 * Simplification vs production: the real engine materialises `bufferAhead` (2)
 * questions ahead, so a band lands ~2 questions later than shown here. Left out
 * on purpose — it shifts both columns identically and would only blur the
 * comparison.
 */
export function replayPath(
  signals: Array<LadderSignal | null>,
  seed: DifficultyBand = SEED_BAND,
): DifficultyBand[] {
  const path: DifficultyBand[] = [];
  let state: LadderState = { band: seed, streak: 0 };
  signals.forEach((signal, index) => {
    path.push(index < SEED_COUNT ? seed : state.band);
    if (signal !== null) state = step(state, signal);
  });
  return path;
}

/** How many times the ladder is pushed down across a run. */
export function drops(signals: Array<LadderSignal | null>): number {
  return signals.filter((s) => s === "incorrect").length;
}

/* ------------------------------------------------------------------ */
/* Today: the verdict IS the signal                                    */
/* ------------------------------------------------------------------ */

/**
 * What production does now. A skip counts as a wrong answer, exactly as in
 * `deriveLadderSignal`. (Hints and reveals also feed this in production; they
 * do not exist in the diagnostic/homework data this page replays, so they are
 * not modelled.)
 */
export function todaySignal(verdict: Verdict): LadderSignal | null {
  if (verdict === "correct") return "correct";
  if (verdict === "partial") return "partial";
  if (verdict === "incorrect" || verdict === "non_attempt") return "incorrect";
  return null;
}

/* ------------------------------------------------------------------ */
/* The proposal: the reason softens the signal                         */
/* ------------------------------------------------------------------ */

export const WRONG_REASONS = [
  "conceptual_gap",
  "procedural_slip",
  "misread_prompt",
  "likely_guess",
  "careless",
] as const;

export type WrongReason = (typeof WRONG_REASONS)[number];

export const REASON_LABEL: Record<WrongReason, string> = {
  conceptual_gap: "Doesn't understand it",
  procedural_slip: "Knows it, slipped",
  misread_prompt: "Misread the question",
  likely_guess: "Guessed",
  careless: "Careless",
};

export const REASON_BLURB: Record<WrongReason, string> = {
  conceptual_gap:
    "The method isn't there yet. This is the one that should make questions easier.",
  procedural_slip:
    "Right method, wrong arithmetic. Easier questions teach them nothing.",
  misread_prompt:
    "They solved a different question. A reading problem, not a difficulty problem.",
  likely_guess: "No real attempt. This answer measures nothing at all.",
  careless: "They know this. Slowing down would fix it.",
};

/**
 * What each reason TYPICALLY means for the ladder. This table explains the
 * decision to a human; it does not make it. The decision is made from the
 * `realGap` probability below, because that is the binary the ladder actually
 * faces and it separates far better than a five-way label's confidence.
 */
export const REASON_POLICY: Record<WrongReason, LadderSignal> = {
  conceptual_gap: "incorrect", // step down — same as today, and correct
  procedural_slip: "partial", // hold the band
  misread_prompt: "partial", // hold the band
  likely_guess: "partial", // hold — it is not evidence of anything
  careless: "partial", // hold the band
};

/** A correct answer Jev thinks was a lucky guess holds instead of promoting. */
export const LUCKY_GUESS_SIGNAL: LadderSignal = "partial";

/**
 * The single seam the proposal changes.
 *
 * Reads the verdict exactly as today, then lets Jev's `realGap` probability
 * soften it: only an error that is more likely than not a MISSING METHOD makes
 * the next questions easier. Everything else holds — which still breaks the
 * student's correct-answer streak, so it is a pause, not a free pass.
 *
 * With no judgement at all it falls straight back to today's rule, so the
 * system can only ever get more careful, never less.
 */
export function reasonAwareSignal(
  verdict: Verdict,
  judgement: {
    realGap?: number; // probability the error is a missing method
    luckyGuess?: number; // probability a correct answer was really a guess
  } | null,
  policy: { gapThreshold: number; guessThreshold: number },
): { signal: LadderSignal | null; changed: boolean; fellBack: boolean } {
  const today = todaySignal(verdict);

  if (verdict === "correct") {
    const guess = judgement?.luckyGuess;
    if (guess !== undefined && guess >= policy.guessThreshold) {
      return { signal: LUCKY_GUESS_SIGNAL, changed: true, fellBack: false };
    }
    return { signal: today, changed: false, fellBack: false };
  }

  // A skip is a skip. There is no answer to read a reason from.
  if (verdict === "non_attempt") {
    return { signal: today, changed: false, fellBack: false };
  }

  const gap = judgement?.realGap;
  if (gap === undefined) {
    return { signal: today, changed: false, fellBack: true };
  }

  const signal: LadderSignal =
    gap >= policy.gapThreshold ? "incorrect" : "partial";
  return { signal, changed: signal !== today, fellBack: false };
}

export const DEFAULT_POLICY = {
  /**
   * Only make the questions easier when a wrong answer is at least this likely
   * to be a missing method. At 0 the page behaves exactly as production does
   * today; raising it makes the system more forgiving.
   *
   * 0.5 is a starting point, not a validated number — it needs testing against
   * what actually happened to these students next.
   */
  gapThreshold: 0.5,
  /** A correct answer this likely to be a guess stops counting toward promotion. */
  guessThreshold: 0.7,
};
