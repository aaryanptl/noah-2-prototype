import "server-only";

import { ACCEPT_AT, judgeEquivalence, MissingKeyError, REJECT_AT } from "./jev";
import {
  bothNumeric,
  type DeterministicBasis,
  deterministicMatch,
  legacyMatch,
  type NormalizedAnswer,
  normalizeAnswer,
} from "./normalize";

// ─────────────────────────────────────────────────────────────────────────────
// The cascade.
//
//   1. deterministic  formatting only — instant, free, always the same answer
//   2. accepted       variants already confirmed for this question — instant
//   3. jev            semantic equivalence — one network call, only when needed
//
// Most answers never reach tier 3, which is the point: grading stays fast and
// reproducible, and the model is spent only on the cases code cannot settle.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * How much variation a blank may forgive.
 *  - `semantic`          wording and spelling may differ (maths, science)
 *  - `spelling-sensitive` wording may differ, spelling may not (English vocab)
 *  - `exact`             formatting only (spelling tests, "write the symbol")
 */
export type Strictness = "semantic" | "spelling-sensitive" | "exact";

export type Verdict = "correct" | "incorrect" | "review";

export type Tier = "blank" | "deterministic" | "accepted" | "jev" | "exhausted";

export interface FitbMatchResult {
  verdict: Verdict;
  tier: Tier;
  /** Which deterministic form agreed, when tier 1 settled it. */
  basis: DeterministicBasis | null;
  /** One line, safe to show a teacher. */
  reason: string;
  strictness: Strictness;
  /** Jev's equivalence probability, when tier 3 ran. */
  probability: number | null;
  spellingSlip: number | null;
  /** What today's grader in lib/prototype-homework.ts would have said. */
  legacyCorrect: boolean;
  normalized: {
    student: NormalizedAnswer;
    reference: NormalizedAnswer;
  };
  jevUsed: boolean;
  jevLatencyMs: number | null;
  jevModel: string | null;
  /** Set when tier 3 was wanted but could not run. */
  jevError: string | null;
  totalLatencyMs: number;
}

export interface FitbMatchInput {
  questionId: string;
  question: string;
  referenceAnswer: string;
  acceptableAnswers?: string[];
  studentAnswer: unknown;
  subject?: string;
  grade?: string;
  topic?: string;
  strictness?: Strictness;
}

/**
 * Variants confirmed by Jev. In production this belongs in
 * `payload.acceptableAnswers` so a confirmed variant is never paid for twice —
 * and so authors can see and edit what the bank has learned to accept. A module
 * Map is enough to show the behaviour in the prototype.
 *
 * Keyed by question *and* strictness: a spelling slip that `semantic` forgives
 * must still fail on a `spelling-sensitive` blank, so a cache hit from the looser
 * mode can never be allowed to answer for the stricter one.
 */
const confirmedVariants = new Map<string, Set<string>>();

function cacheKey(questionId: string, strictness: Strictness): string {
  return `${strictness}::${questionId}`;
}

export function getConfirmedVariants(
  questionId: string,
  strictness: Strictness,
): string[] {
  return [...(confirmedVariants.get(cacheKey(questionId, strictness)) ?? [])];
}

export function clearConfirmedVariants(): void {
  confirmedVariants.clear();
}

function remember(
  questionId: string,
  strictness: Strictness,
  variant: string,
): void {
  const key = cacheKey(questionId, strictness);
  const set = confirmedVariants.get(key) ?? new Set<string>();
  set.add(variant);
  confirmedVariants.set(key, set);
}

/** English blanks are usually testing the word itself, so spelling counts. */
export function defaultStrictness(subject?: string): Strictness {
  return (subject ?? "").trim().toLowerCase() === "english"
    ? "spelling-sensitive"
    : "semantic";
}

export async function matchFitb(
  input: FitbMatchInput,
  signal?: AbortSignal,
): Promise<FitbMatchResult> {
  const startedAt = Date.now();
  const strictness = input.strictness ?? defaultStrictness(input.subject);
  const acceptable = input.acceptableAnswers ?? [];

  const student = normalizeAnswer(input.studentAnswer);
  const reference = normalizeAnswer(input.referenceAnswer);

  const legacyCorrect = legacyMatch(
    input.studentAnswer,
    input.referenceAnswer,
    acceptable,
  );

  const base = {
    basis: null as DeterministicBasis | null,
    strictness,
    probability: null,
    spellingSlip: null,
    legacyCorrect,
    normalized: { student, reference },
    jevUsed: false,
    jevLatencyMs: null,
    jevModel: null,
    jevError: null,
  } satisfies Omit<
    FitbMatchResult,
    "verdict" | "tier" | "reason" | "totalLatencyMs"
  >;

  const done = (
    verdict: Verdict,
    tier: Tier,
    reason: string,
    extra: Partial<FitbMatchResult> = {},
  ): FitbMatchResult => ({
    ...base,
    verdict,
    tier,
    reason,
    totalLatencyMs: Date.now() - startedAt,
    ...extra,
  });

  // ── 0. Nothing typed ──────────────────────────────────────────────────────
  if (student.raw.trim() === "") {
    return done("incorrect", "blank", "No answer given.");
  }

  // ── 1. Deterministic: the model answer, then every authored variant ───────
  const candidates: Array<{ label: string; norm: NormalizedAnswer }> = [
    { label: "answer key", norm: reference },
    ...acceptable.map((a) => ({
      label: "accepted variant",
      norm: normalizeAnswer(a),
    })),
  ];

  const AGAINST_KEY: Record<DeterministicBasis, string> = {
    exact: "Matches the answer key exactly.",
    "case-space": "Matches the answer key after trimming case and spacing.",
    symbol: "Matches the answer key once symbols and notation are normalized.",
    numeric: "Same numeric value as the answer key, written differently.",
    "unit-omitted": "Same value as the answer key; unit not written out.",
  };
  const AGAINST_VARIANT: Record<DeterministicBasis, string> = {
    exact: "Matches an answer the question already accepts.",
    "case-space": "Matches an accepted answer after trimming case and spacing.",
    symbol: "Matches an accepted answer once symbols are normalized.",
    numeric: "Same numeric value as an accepted answer.",
    "unit-omitted": "Same value as an accepted answer; unit not written out.",
  };

  for (const candidate of candidates) {
    const hit = deterministicMatch(student, candidate.norm);
    if (hit.match) {
      const basis = hit.on as DeterministicBasis;
      const isKey = candidate.label === "answer key";
      return done(
        "correct",
        isKey ? "deterministic" : "accepted",
        // `unit-omitted` carries its own sentence naming the unit.
        hit.note ?? (isKey ? AGAINST_KEY[basis] : AGAINST_VARIANT[basis]),
        { basis },
      );
    }
  }

  // ── 2. Variants this question has already confirmed ───────────────────────
  if (
    confirmedVariants
      .get(cacheKey(input.questionId, strictness))
      ?.has(student.strict)
  ) {
    return done(
      "correct",
      "accepted",
      "Confirmed earlier for this question — no model call needed.",
    );
  }

  // ── 3. Should the semantic tier run at all? ───────────────────────────────
  if (strictness === "exact") {
    return done(
      "incorrect",
      "exhausted",
      "This blank is graded exactly; only formatting is forgiven.",
    );
  }

  // Two numbers that differ are just a wrong number — no wording judgment can
  // rescue that, and asking would burn a call on a certain answer.
  if (bothNumeric(student, reference)) {
    return done(
      "incorrect",
      "exhausted",
      "Both answers are numbers and the values differ.",
    );
  }

  // ── 4. Jev ────────────────────────────────────────────────────────────────
  try {
    const jev = await judgeEquivalence(
      {
        question: input.question,
        referenceAnswer: input.referenceAnswer,
        studentAnswer: student.raw,
        subject: input.subject,
        grade: input.grade,
        topic: input.topic,
      },
      signal,
    );

    const shared = {
      probability: jev.equivalent,
      spellingSlip: jev.spellingSlip,
      jevUsed: true,
      jevLatencyMs: jev.latencyMs,
      jevModel: jev.model,
    };
    const pct = Math.round(jev.equivalent * 100);

    // On a spelling-sensitive blank, a recognisable misspelling is the mistake
    // the question is looking for — it must not be forgiven even when the
    // meaning is obviously right.
    if (strictness === "spelling-sensitive" && jev.spellingSlip >= 0.5) {
      return done(
        "incorrect",
        "jev",
        `Right word, but spelled wrongly (${Math.round(jev.spellingSlip * 100)}% a spelling slip) — and spelling counts on this blank.`,
        shared,
      );
    }

    if (jev.equivalent >= ACCEPT_AT) {
      remember(input.questionId, strictness, student.strict);
      return done(
        "correct",
        "jev",
        `Same answer, different wording (${pct}% equivalent).`,
        shared,
      );
    }

    if (jev.equivalent <= REJECT_AT) {
      return done(
        "incorrect",
        "jev",
        `Different answer from the key (${pct}% equivalent).`,
        shared,
      );
    }

    return done(
      "review",
      "jev",
      `Too close to call (${pct}% equivalent) — graded wrong for now and flagged for a teacher.`,
      shared,
    );
  } catch (error) {
    const message =
      error instanceof MissingKeyError
        ? error.message
        : error instanceof Error
          ? error.message
          : "TypeSafe call failed.";
    // Tier 3 failing must never turn into a silent pass; fall back to what the
    // deterministic tiers decided, and say so.
    return done(
      "incorrect",
      "exhausted",
      "Could not reach the semantic check — graded on formatting alone.",
      { jevError: message },
    );
  }
}
