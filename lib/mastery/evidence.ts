/**
 * Reads a real student's evidence on one topic from the production read-only
 * replica (`MAIN_DATABASE_READ_ONLY_URL`) and shapes it for `rules.ts`.
 *
 * Only first responses count. Non-attempts are excluded. Practice is included
 * (first response only) because hints never fire before the first answer.
 */
import { Pool } from "pg";

import type { MasteryMode, MasteryObjective, Measurement } from "./rules";

const globalForPool = global as unknown as { masteryProdPool?: Pool };

function prodPool() {
  if (globalForPool.masteryProdPool) return globalForPool.masteryProdPool;
  const url = process.env.MAIN_DATABASE_READ_ONLY_URL;
  if (!url) throw new Error("MAIN_DATABASE_READ_ONLY_URL is not set");
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  globalForPool.masteryProdPool = pool;
  return pool;
}

export interface CandidateStudent {
  studentId: string;
  topicId: number;
  topicName: string;
  grade: string;
  sessions: number;
  diagnostics: number;
  homeworks: number;
  practices: number;
  firstAt: string;
  lastAt: string;
  /** First-response accuracy across every session on the topic. */
  accuracy: number | null;
}

/**
 * Student × topic pairs worth looking at: the richest histories first.
 */
export async function listCandidates(limit = 24): Promise<CandidateStudent[]> {
  const { rows } = await prodPool().query<Record<string, unknown>>(
    `
    with q as (
      select ts.id sid, ts.student_id, tc.mode, ts.started_at, sq.topic_id, sq.id tsq
      from test_sessions ts
      join test_configs tc on tc.id = ts.test_id
      join test_session_questions sq on sq.test_session_id = ts.id
      join subjects s on s.id = tc.subject_id
      where ts.completed_at is not null and tc.scope <> 'grade' and s.name = 'math'
    ),
    first_attempt as (
      select test_session_question_id tsq,
        (array_agg(verdict order by attempt_number, submitted_at, id))[1] verdict
      from attempts group by 1
    ),
    agg as (
      select q.student_id, q.topic_id,
        count(distinct q.sid) sessions,
        count(distinct q.sid) filter (where q.mode = 'diagnostic') diagnostics,
        count(distinct q.sid) filter (where q.mode = 'homework') homeworks,
        count(distinct q.sid) filter (where q.mode = 'practice') practices,
        min(q.started_at) first_at, max(q.started_at) last_at,
        count(*) filter (where fa.verdict is not null and fa.verdict <> 'non_attempt') answered,
        count(*) filter (where fa.verdict = 'correct') correct
      from q left join first_attempt fa on fa.tsq = q.tsq
      group by 1, 2
    )
    select a.student_id "studentId", a.topic_id "topicId", t.name "topicName", t.grade,
      a.sessions, a.diagnostics, a.homeworks, a.practices,
      a.first_at "firstAt", a.last_at "lastAt",
      case when a.answered > 0 then round(100.0 * a.correct / a.answered) end accuracy
    from agg a join topics t on t.id = a.topic_id
    where a.sessions >= 4 and a.diagnostics >= 1
    order by a.sessions desc, a.last_at desc
    limit $1
    `,
    [limit],
  );
  // Most sessions first; on a tie, the one with more topic tests.
  return rows
    .map(normalizeCandidate)
    .sort(
      (a, b) =>
        b.sessions - a.sessions ||
        b.diagnostics - a.diagnostics ||
        b.lastAt.localeCompare(a.lastAt),
    )
    .slice(0, limit);
}

function normalizeCandidate(r: Record<string, unknown>): CandidateStudent {
  return {
    studentId: String(r.studentId),
    topicId: Number(r.topicId),
    topicName: String(r.topicName),
    grade: String(r.grade ?? ""),
    sessions: Number(r.sessions),
    diagnostics: Number(r.diagnostics),
    homeworks: Number(r.homeworks),
    practices: Number(r.practices),
    firstAt: new Date(r.firstAt as string).toISOString(),
    lastAt: new Date(r.lastAt as string).toISOString(),
    accuracy:
      r.accuracy === null || r.accuracy === undefined
        ? null
        : Number(r.accuracy),
  };
}

export interface StudentTopic {
  topicId: number;
  topicName: string;
  grade: string;
  sessions: number;
  lastAt: string;
}

/** Topics a student has completed sessions on, most recent first. */
export async function listStudentTopics(
  studentId: string,
): Promise<StudentTopic[]> {
  const { rows } = await prodPool().query(
    `
    select sq.topic_id "topicId", t.name "topicName", t.grade,
      count(distinct ts.id) sessions, max(ts.started_at) "lastAt"
    from test_sessions ts
    join test_configs tc on tc.id = ts.test_id
    join test_session_questions sq on sq.test_session_id = ts.id
    join topics t on t.id = sq.topic_id
    where ts.student_id = $1 and ts.completed_at is not null and tc.scope <> 'grade'
    group by 1, 2, 3
    order by max(ts.started_at) desc
    `,
    [studentId],
  );
  return rows.map((r) => ({
    topicId: Number(r.topicId),
    topicName: String(r.topicName),
    grade: String(r.grade ?? ""),
    sessions: Number(r.sessions),
    lastAt: new Date(r.lastAt).toISOString(),
  }));
}

export interface TopicEvidence {
  studentId: string;
  topic: { id: number; name: string; grade: string };
  objectives: MasteryObjective[];
  measurements: Measurement[];
  /** First-response accuracy on this topic's questions inside the placement test, if any. */
  placement: { answered: number; correct: number; at: string } | null;
}

export async function loadTopicEvidence(
  studentId: string,
  topicId: number,
): Promise<TopicEvidence | null> {
  const pool = prodPool();
  const topicRes = await pool.query(
    `select id, name, grade from topics where id = $1`,
    [topicId],
  );
  if (topicRes.rowCount === 0) return null;
  const topic = {
    id: Number(topicRes.rows[0].id),
    name: String(topicRes.rows[0].name),
    grade: String(topicRes.rows[0].grade ?? ""),
  };

  const loRes = await pool.query(
    `select id, coalesce(display_name, description, code) name, sequence from learning_objectives where topic_id = $1 order by sequence, id`,
    [topicId],
  );
  const objectives: MasteryObjective[] = loRes.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    sequence: Number(r.sequence ?? 0),
  }));

  const { rows } = await pool.query(
    `
    with first_attempt as (
      select a.test_session_question_id tsq,
        (array_agg(a.verdict order by a.attempt_number, a.submitted_at, a.id))[1] verdict
      from attempts a where a.student_id = $1 group by 1
    )
    select ts.id sid, tc.mode, tc.scope, ts.started_at at, sq.learning_objective_id lo,
      count(*) filter (where fa.verdict is not null and fa.verdict <> 'non_attempt') answered,
      count(*) filter (where fa.verdict = 'correct') correct
    from test_sessions ts
    join test_configs tc on tc.id = ts.test_id
    join test_session_questions sq on sq.test_session_id = ts.id
    left join first_attempt fa on fa.tsq = sq.id
    where ts.student_id = $1 and sq.topic_id = $2 and ts.completed_at is not null
    group by 1, 2, 3, 4, 5
    order by ts.started_at, ts.id
    `,
    [studentId, topicId],
  );

  const measurements: Measurement[] = [];
  let placement: TopicEvidence["placement"] = null;
  for (const r of rows) {
    const mode = String(r.mode) as MasteryMode;
    const at = new Date(r.at).toISOString();
    if (mode === "placement") {
      placement = placement ?? { answered: 0, correct: 0, at };
      placement.answered += Number(r.answered);
      placement.correct += Number(r.correct);
      continue;
    }
    if (!r.lo) continue;
    measurements.push({
      sessionId: Number(r.sid),
      mode,
      at,
      loId: Number(r.lo),
      answered: Number(r.answered),
      correct: Number(r.correct),
    });
  }
  return { studentId, topic, objectives, measurements, placement };
}

export interface CatalogTopic {
  topicId: number;
  topicName: string;
  grade: string;
  objectives: number;
}

/** Every maths topic with at least one objective, for the sandbox picker. */
export async function listCatalog(): Promise<CatalogTopic[]> {
  const { rows } = await prodPool().query(
    `
    select t.id "topicId", t.name "topicName", t.grade, count(l.id) objectives, t.sequence
    from topics t join learning_objectives l on l.topic_id = t.id
    where t.subject_label = 'math'
    group by t.id, t.name, t.grade, t.sequence
    order by t.sequence, t.id
    `,
  );
  const gradeRank = (grade: string) => {
    const g = grade
      .replace(/^grade\s*/i, "")
      .trim()
      .toLowerCase();
    return g === "kg" ? 0 : Number(g) || 99;
  };
  return rows
    .map((r) => ({
      topicId: Number(r.topicId),
      topicName: String(r.topicName),
      grade: String(r.grade ?? ""),
      objectives: Number(r.objectives),
    }))
    .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade));
}

export async function loadObjectives(topicId: number): Promise<{
  topic: { id: number; name: string; grade: string };
  objectives: MasteryObjective[];
} | null> {
  const pool = prodPool();
  const topicRes = await pool.query(
    `select id, name, grade from topics where id = $1`,
    [topicId],
  );
  if (topicRes.rowCount === 0) return null;
  const loRes = await pool.query(
    `select id, coalesce(display_name, description, code) name, sequence from learning_objectives where topic_id = $1 order by sequence, id`,
    [topicId],
  );
  return {
    topic: {
      id: Number(topicRes.rows[0].id),
      name: String(topicRes.rows[0].name),
      grade: String(topicRes.rows[0].grade ?? ""),
    },
    objectives: loRes.rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      sequence: Number(r.sequence ?? 0),
    })),
  };
}
