/**
 * Reads real, completed sessions off the production read-only replica
 * (`MAIN_DATABASE_READ_ONLY_URL`) — the same source `lib/mastery/evidence.ts`
 * uses.
 *
 * First responses only, in the order the student actually saw them, because
 * that order is what the ladder replays.
 */
import { Pool } from "pg";

import type { Verdict } from "./ladder";

const globalForPool = global as unknown as { whyWrongProdPool?: Pool };

function prodPool() {
  if (globalForPool.whyWrongProdPool) return globalForPool.whyWrongProdPool;
  const url = process.env.MAIN_DATABASE_READ_ONLY_URL;
  if (!url) throw new Error("MAIN_DATABASE_READ_ONLY_URL is not set");
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForPool.whyWrongProdPool = pool;
  return pool;
}

/** First attempt per served question — the only response the ladder reads. */
const FIRST_ATTEMPT = `
  select distinct on (a.test_session_question_id)
    a.test_session_question_id tsq, a.verdict, a.student_answer, a.time_taken_ms
  from attempts a
  order by a.test_session_question_id, a.attempt_number, a.submitted_at, a.id
`;

export interface SessionCandidate {
  sessionId: number;
  studentId: string;
  mode: string;
  topic: string;
  grade: string;
  startedAt: string;
  questions: number;
  correct: number;
  wrong: number;
  skipped: number;
}

/**
 * Sessions worth replaying: long enough for the ladder to move, and with enough
 * of both right and wrong answers that the two columns can actually differ.
 */
export async function listSessions(limit = 24): Promise<SessionCandidate[]> {
  const { rows } = await prodPool().query(
    `
    with fa as (${FIRST_ATTEMPT})
    select ts.id "sessionId", ts.student_id "studentId", tc.mode, t.name topic, t.grade,
      ts.started_at "startedAt",
      count(*) questions,
      count(*) filter (where fa.verdict = 'correct') correct,
      count(*) filter (where fa.verdict in ('incorrect','partial')) wrong,
      count(*) filter (where fa.verdict = 'non_attempt') skipped
    from test_sessions ts
    join test_configs tc on tc.id = ts.test_id
    join subjects s on s.id = tc.subject_id
    join test_session_questions sq on sq.test_session_id = ts.id
    join topics t on t.id = sq.topic_id
    join fa on fa.tsq = sq.id
    where ts.completed_at is not null and s.name = 'math' and tc.scope <> 'grade'
    group by 1, 2, 3, 4, 5, 6
    having count(*) between 10 and 30
       and count(*) filter (where fa.verdict in ('incorrect','partial')) >= 4
       and count(*) filter (where fa.verdict = 'correct') >= 4
    order by ts.started_at desc
    limit $1
    `,
    [limit],
  );
  return rows.map((r) => ({
    sessionId: Number(r.sessionId),
    studentId: String(r.studentId),
    mode: String(r.mode),
    topic: String(r.topic),
    grade: String(r.grade ?? ""),
    startedAt: new Date(r.startedAt).toISOString(),
    questions: Number(r.questions),
    correct: Number(r.correct),
    wrong: Number(r.wrong),
    skipped: Number(r.skipped),
  }));
}

export interface QuestionOption {
  text: string;
  correct: boolean;
}

export interface AnsweredQuestion {
  ordinal: number;
  questionType: string;
  band: string;
  bloom: string;
  topic: string;
  grade: string;
  objectiveName: string;
  prompt: string;
  options: QuestionOption[];
  correctAnswer: string;
  modelAnswer: string | null;
  explanation: string;
  studentAnswer: string;
  timeTakenMs: number | null;
  verdict: Verdict;
}

export interface SessionRun {
  session: {
    id: number;
    studentId: string;
    mode: string;
    topic: string;
    grade: string;
    startedAt: string;
  };
  questions: AnsweredQuestion[];
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

/** One session's served questions, in serve order, with everything Jev needs. */
export async function loadSession(
  sessionId: number,
): Promise<SessionRun | null> {
  const pool = prodPool();

  const head = await pool.query(
    `
    select ts.id, ts.student_id "studentId", tc.mode, ts.started_at "startedAt",
      t.name topic, t.grade
    from test_sessions ts
    join test_configs tc on tc.id = ts.test_id
    join test_session_questions sq on sq.test_session_id = ts.id
    join topics t on t.id = sq.topic_id
    where ts.id = $1
    limit 1
    `,
    [sessionId],
  );
  if (head.rowCount === 0) return null;
  const h = head.rows[0];

  const { rows } = await pool.query(
    `
    with fa as (${FIRST_ATTEMPT})
    select sq.ordinal, sq.difficulty_band band, sq.bloom_level bloom,
      q.question_type "questionType",
      qv.prompt, qv.options, qv.correct_answer "correctAnswer",
      qv.model_answer "modelAnswer", qv.explanation,
      fa.verdict, fa.student_answer "studentAnswer", fa.time_taken_ms "timeTakenMs",
      t.name topic, t.grade,
      coalesce(lo.display_name, lo.description, lo.code) "objectiveName"
    from test_session_questions sq
    join fa on fa.tsq = sq.id
    join questions q on q.id = sq.question_id
    join question_versions qv on qv.id = sq.question_version_id
    join topics t on t.id = sq.topic_id
    left join learning_objectives lo on lo.id = sq.learning_objective_id
    where sq.test_session_id = $1
    order by sq.ordinal
    `,
    [sessionId],
  );

  return {
    session: {
      id: Number(h.id),
      studentId: String(h.studentId),
      mode: String(h.mode),
      topic: String(h.topic),
      grade: String(h.grade ?? ""),
      startedAt: new Date(h.startedAt).toISOString(),
    },
    questions: rows.map((r) => ({
      ordinal: Number(r.ordinal),
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
    })),
  };
}
