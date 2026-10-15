/**
 * The gap-vs-slip read for the mastery loop: every WRONG first response a
 * student gave on a topic, judged by Jev with the same questions the why-wrong
 * prototype uses on the diagnostic ladder.
 *
 * This produces evidence only. `lib/mastery/rules.ts` does not read it; the
 * summary in `gap.ts` sits next to the decision so the two can be compared,
 * and `scripts/mastery-analysis/backtest-gap-share.ts` checks whether it
 * predicts anything before any rule is allowed to use it.
 *
 * A first response never changes once submitted, so each judgement is cached
 * on disk by its served-question id (`output/` is gitignored) and Jev is only
 * asked about answers it has not seen.
 */
import fs from "node:fs/promises";
import path from "node:path";

import { Pool } from "pg";

import { classifyOne, type Judgement } from "../why-wrong/classify";
import type { AnsweredQuestion, QuestionOption } from "../why-wrong/evidence";
import { mapLimit } from "../why-wrong/jev";
import type { Verdict } from "../why-wrong/ladder";
import type { MasteryMode } from "./rules";

const globalForPool = global as unknown as { masteryErrorsPool?: Pool };

function prodPool() {
  if (globalForPool.masteryErrorsPool) return globalForPool.masteryErrorsPool;
  const url = process.env.MAIN_DATABASE_READ_ONLY_URL;
  if (!url) throw new Error("MAIN_DATABASE_READ_ONLY_URL is not set");
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForPool.masteryErrorsPool = pool;
  return pool;
}

export interface WrongAnswer extends AnsweredQuestion {
  /** test_session_questions.id — the cache key. */
  tsq: number;
  sessionId: number;
  mode: MasteryMode;
  at: string;
  loId: number;
}

function parseOptions(raw: unknown): QuestionOption[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (typeof entry === "string") return [{ text: entry, correct: false }];
    if (entry && typeof entry === "object") {
      const o = entry as { text?: unknown; correct?: unknown };
      if (typeof o.text === "string") {
        return [{ text: o.text, correct: o.correct === true }];
      }
    }
    return [];
  });
}

/**
 * Columns for one wrong first response. Pair with `WRONG_ANSWER_FROM` and an
 * `fa` CTE of first attempts. Shared by the per-student loader and the back-test.
 */
export const WRONG_ANSWER_COLUMNS = `
  sq.id tsq, ts.id "sessionId", tc.mode, ts.started_at at,
  sq.learning_objective_id "loId", sq.ordinal,
  sq.difficulty_band band, sq.bloom_level bloom, q.question_type "questionType",
  qv.prompt, qv.options, qv.correct_answer "correctAnswer",
  qv.model_answer "modelAnswer", qv.explanation,
  fa.verdict, fa.student_answer "studentAnswer", fa.time_taken_ms "timeTakenMs",
  t.name topic, t.grade,
  coalesce(lo.display_name, lo.description, lo.code) "objectiveName"
`;

export function toWrongAnswer(r: Record<string, unknown>): WrongAnswer {
  const tsq = Number(r.tsq);
  return {
    tsq,
    sessionId: Number(r.sessionId),
    mode: String(r.mode) as MasteryMode,
    at: new Date(r.at as string).toISOString(),
    loId: Number(r.loId),
    // classifyOne keys its judgement by ordinal; the served-question id is unique.
    ordinal: tsq,
    questionType: String(r.questionType),
    band: String(r.band),
    bloom: String(r.bloom ?? ""),
    topic: String(r.topic),
    grade: String(r.grade ?? ""),
    objectiveName: String(r.objectiveName ?? "—"),
    prompt: String(r.prompt),
    options: parseOptions(r.options),
    correctAnswer: String(r.correctAnswer ?? ""),
    modelAnswer: r.modelAnswer === null ? null : String(r.modelAnswer),
    explanation: String(r.explanation ?? ""),
    studentAnswer: String(r.studentAnswer ?? ""),
    timeTakenMs: r.timeTakenMs === null ? null : Number(r.timeTakenMs),
    verdict: String(r.verdict) as Verdict,
  };
}

/** Joins every wrong-answer query needs, given a `fa` CTE of first attempts. */
export const WRONG_ANSWER_FROM = `
  from test_sessions ts
  join test_configs tc on tc.id = ts.test_id
  join test_session_questions sq on sq.test_session_id = ts.id
  join fa on fa.tsq = sq.id
  join questions q on q.id = sq.question_id
  join question_versions qv on qv.id = sq.question_version_id
  join topics t on t.id = sq.topic_id
  join learning_objectives lo on lo.id = sq.learning_objective_id
`;

/**
 * Every wrong first response the student gave on the topic, oldest first.
 * Placement is left out, as it is from the scorecard (it seeds the topic only).
 */
export async function loadWrongAnswers(
  studentId: string,
  topicId: number,
  /** Ignore sessions started after this ISO time — freezes a story as data grows. */
  until?: string,
): Promise<WrongAnswer[]> {
  const { rows } = await prodPool().query(
    `
    with fa as (
      select distinct on (a.test_session_question_id)
        a.test_session_question_id tsq, a.verdict, a.student_answer, a.time_taken_ms
      from attempts a
      where a.student_id = $1
      order by a.test_session_question_id, a.attempt_number, a.submitted_at, a.id
    )
    select ${WRONG_ANSWER_COLUMNS}
    ${WRONG_ANSWER_FROM}
    where ts.student_id = $1 and sq.topic_id = $2 and ts.completed_at is not null
      and ($3::timestamptz is null or ts.started_at <= $3)
      and tc.mode <> 'placement' and fa.verdict in ('incorrect', 'partial')
    order by ts.started_at, ts.id, sq.ordinal
    `,
    [studentId, topicId, until ?? null],
  );
  return rows.map(toWrongAnswer);
}

/* ------------------------------------------------------------------ */
/* Cached judgements                                                   */
/* ------------------------------------------------------------------ */

const CACHE_DIR = path.join(process.cwd(), "output", "jev-cache", "wrong");

export type CachedJudgement = Omit<Judgement, "ordinal"> & {
  model: string | null;
};

async function readCached(tsq: number): Promise<CachedJudgement | null> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(CACHE_DIR, `${tsq}.json`), "utf8"),
    ) as CachedJudgement;
  } catch {
    return null;
  }
}

async function writeCached(tsq: number, value: CachedJudgement) {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(
    path.join(CACHE_DIR, `${tsq}.json`),
    JSON.stringify(value),
  );
}

export interface JudgeUsage {
  answers: number;
  cached: number;
  fresh: number;
  failed: number;
  inputTokens: number;
  outputTokens: number;
  ms: number;
}

/**
 * Judge each wrong answer, from cache where possible. A failed call comes back
 * as `null` and is not cached, so the next read retries it.
 */
export async function judgeWrongAnswers(
  answers: WrongAnswer[],
  concurrency = 6,
): Promise<{
  judgements: Map<number, CachedJudgement>;
  usage: JudgeUsage;
}> {
  const started = Date.now();
  const usage: JudgeUsage = {
    answers: answers.length,
    cached: 0,
    fresh: 0,
    failed: 0,
    inputTokens: 0,
    outputTokens: 0,
    ms: 0,
  };
  const judgements = new Map<number, CachedJudgement>();

  await mapLimit(answers, concurrency, async (answer) => {
    const hit = await readCached(answer.tsq);
    if (hit) {
      usage.cached += 1;
      judgements.set(answer.tsq, hit);
      return;
    }
    const res = await classifyOne(answer);
    usage.inputTokens += res.inputTokens;
    usage.outputTokens += res.outputTokens;
    if (res.judgement.error) {
      usage.failed += 1;
      return;
    }
    const { ordinal: _ordinal, ...rest } = res.judgement;
    const value: CachedJudgement = { ...rest, model: res.model };
    await writeCached(answer.tsq, value);
    usage.fresh += 1;
    judgements.set(answer.tsq, value);
  });

  usage.ms = Date.now() - started;
  return { judgements, usage };
}
