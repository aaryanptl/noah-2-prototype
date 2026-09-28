import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// FITB tier 3 — TypeSafe (Jev) semantic equivalence.
//
// The judgment asked here is deliberately narrow: *is the student's answer
// another way of writing the reference answer?* — never "is the student right?".
// Asking for correctness would let the model re-solve the question and overrule
// the answer key, which is exactly the authority we do not want to hand over.
//
// Two independent nouls go in one request (they cannot see each other's answers,
// which is what we want — the spelling read must not be swayed by the
// equivalence read):
//   equivalent   — same meaning / same value, written differently
//   spelling_slip — the only difference is a misspelling of the intended word
//
// Policy then differs by subject: on a maths blank a spelling slip is still the
// right answer; on an English spelling blank it is the whole point of the
// question, so it must stay wrong.
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

// A stalled grade is worse than a failed one: without this the student stares at
// a spinner forever. The cascade treats a timeout like any other tier-3 failure.
const TIMEOUT_MS = 10_000;

/** Accept the usual spellings so the prototype finds whatever is in .env.local. */
const KEY_NAMES = [
  "TYPESAFE_API_KEY",
  "TYPESAFE_AI_API_KEY",
  "TYPESAFE_KEY",
  "TYPESAFE_SECRET_KEY",
] as const;

export function resolveApiKey(): { key: string | null; name: string | null } {
  for (const name of KEY_NAMES) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return { key: value.trim(), name };
    }
  }
  return { key: null, name: null };
}

export class MissingKeyError extends Error {
  constructor() {
    super(
      `No TypeSafe key found. Add one of ${KEY_NAMES.join(", ")} to .env.local.`,
    );
    this.name = "MissingKeyError";
  }
}

// Thresholds. Acting on a false "yes" here means telling a student they were
// right when they were not, which corrupts the mastery scorecard — so the
// accept bar sits high and the middle band goes to review rather than passing.
export const ACCEPT_AT = 0.85;
export const REJECT_AT = 0.35;

export interface JevEquivalenceInput {
  question: string;
  referenceAnswer: string;
  studentAnswer: string;
  subject?: string;
  grade?: string;
  topic?: string;
}

export interface JevEquivalenceResult {
  equivalent: number;
  spellingSlip: number;
  model: string;
  latencyMs: number;
  usage?: { input_tokens?: number; output_tokens?: number };
}

interface JevResponse {
  model?: string;
  answers?: Record<string, { type?: string; noul?: number }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Ask Jev whether two answers say the same thing. Both questions run in one
 * request against one state object.
 */
export async function judgeEquivalence(
  input: JevEquivalenceInput,
  signal?: AbortSignal,
): Promise<JevEquivalenceResult> {
  const { key } = resolveApiKey();
  if (!key) throw new MissingKeyError();

  const state = {
    question_text: input.question,
    reference_answer: input.referenceAnswer,
    student_answer: input.studentAnswer,
    subject: input.subject ?? "unknown",
    grade: input.grade ?? "unknown",
    topic: input.topic ?? "unknown",
  };

  const body = {
    model: MODEL,
    state,
    questions: {
      equivalent: {
        type: "noul",
        instructions: {
          judgment:
            "Read the fill-in-the-blank question in `question_text`. `reference_answer` is the answer key and is assumed correct. Decide whether `student_answer` expresses the same answer as `reference_answer` for this blank.",
          important:
            "Do not work out the answer yourself and do not judge whether the student is right about the maths. Judge only whether the two answers mean the same thing in this blank. If `reference_answer` were wrong, a student who matched it would still count as equivalent.",
          audience:
            "The student is in grade `grade` and is answering a `subject` question, so allow informal phrasing a child of that age would use.",
        },
        criteria: {
          true: "The two answers name the same value, object, word or idea, differing only in wording, notation, word order, verbosity, abbreviation, or a spelling slip. Examples of yes: 'one fourth' vs '1/4'; 'a quarter' vs '0.25'; 'because all four sides are equal' vs 'all sides are the same length'; 'triangle' vs 'a triangle'.",
          false:
            "The answers name different values, different objects, or different ideas; or the student's answer is blank, a guess unrelated to the question, restates the question, or is only partly the answer when the blank needs all of it. Examples of no: '1/4' vs '1/2'; 'square' vs 'rectangle' when the key says square; 'I don't know'.",
        },
      },
      spelling_slip: {
        type: "noul",
        instructions:
          "Ignoring meaning, is `student_answer` a misspelling, typo or phonetic attempt at the exact word or words in `reference_answer`?",
        criteria: {
          true: "It is recognisably the same word written wrongly — 'recieve' for 'receive', 'triangel' for 'triangle', 'perimiter' for 'perimeter'.",
          false:
            "It is a different word, a correctly spelled synonym, a number, or a phrase that is not an attempt at spelling the reference word.",
        },
      },
    },
  };

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  // Honour the caller's signal too, when there is one.
  const abort = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: abort,
    });
  } catch (error) {
    if (timeout.aborted) {
      throw new Error(`TypeSafe did not answer within ${TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  }
  const latencyMs = Date.now() - startedAt;

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `TypeSafe returned ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const json = (await response.json()) as JevResponse;
  const equivalent = json.answers?.equivalent?.noul;
  const spellingSlip = json.answers?.spelling_slip?.noul;

  if (typeof equivalent !== "number") {
    throw new Error("TypeSafe response did not include an `equivalent` noul.");
  }

  return {
    equivalent,
    spellingSlip: typeof spellingSlip === "number" ? spellingSlip : 0,
    model: json.model ?? MODEL,
    latencyMs,
    usage: json.usage,
  };
}
