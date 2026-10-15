/**
 * Minimal TypeSafe (Jev) client — the System One HTTP endpoint, nothing else.
 *
 * Deliberately a `fetch` wrapper rather than the SDK: one endpoint, one shape,
 * no dependency to keep in step. Server-side only — the key never reaches the
 * browser.
 *
 * https://docs.typesafe.ai/api
 */

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";

/* ---------- questions ---------- */

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  /** option id → what that option means */
  criteria: Record<string, string>;
}

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: { true: string; false: string };
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  /** ordered levels, lowest first */
  criteria: string[];
}

export type JevQuestion = ChoiceQuestion | NoulQuestion | ScoreQuestion;

/* ---------- answers ---------- */

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  confidence: number;
  probabilities: Record<string, number>;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  confidence: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
}

export type JevAnswer = ChoiceAnswer | NoulAnswer | ScoreAnswer;

export interface JevUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface JevResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: JevUsage;
}

export class JevError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "JevError";
  }
}

export function jevConfigured(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

/**
 * One request = one piece of state + every question you want asked about it.
 * The questions run in parallel and cannot see each other's answers, so ask
 * everything the code might need in one go.
 */
export async function systemOne(
  state: unknown,
  questions: Record<string, JevQuestion>,
  options: { signal?: AbortSignal } = {},
): Promise<JevResponse> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new JevError("TYPESAFE_API_KEY is not set");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, state, questions }),
    signal: options.signal,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new JevError(
      `Jev returned ${res.status}${body ? `: ${body.slice(0, 300)}` : ""}`,
      res.status,
    );
  }
  return (await res.json()) as JevResponse;
}

/** Run `work` over `items` with a bounded number in flight. Order is preserved. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  work: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      for (;;) {
        const index = cursor++;
        if (index >= items.length) return;
        out[index] = await work(items[index] as T, index);
      }
    },
  );
  await Promise.all(runners);
  return out;
}
