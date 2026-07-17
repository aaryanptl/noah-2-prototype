import type { LearningObjectiveResult } from "@/agents/diagnostic/types";
import { query } from "@/lib/db";

// A teacher handles up to five students, so the roster is capped at the
// five most recently active students.
const ROSTER_LIMIT = 5;

export interface ScorePoint {
  assessmentId: string;
  submittedAt: string;
  score: number;
  subject: string;
  topic: string | null;
}

export interface SubjectAverage {
  subject: string;
  tests: number;
  avgScore: number;
}

export interface RosterStudent {
  id: string;
  displayName: string;
  classLevel: string;
  totalTests: number;
  avgScore: number | null;
  latestScore: number | null;
  trend: number | null;
  avgTimeSeconds: number | null;
  lastActive: string | null;
  subjects: string[];
  subjectAverages: SubjectAverage[];
  scoreHistory: ScorePoint[];
}

export interface AssessmentSummary {
  id: string;
  testMode: string;
  subject: string;
  topic: string | null;
  score: number;
  submittedAt: string;
  questionCount: number;
  avgTimeSeconds: number | null;
}

export interface TopicPerformance {
  topic: string;
  subject: string;
  questions: number;
  correct: number;
  partial: number;
  incorrect: number;
  nonAttempt: number;
  accuracy: number;
  avgTimeSeconds: number | null;
}

export interface SkillArea {
  learningObjective: string;
  score: number;
  masteryState: string;
}

export interface StudentPerformanceDetail {
  student: {
    id: string;
    displayName: string;
    classLevel: string;
    totalTests: number;
    avgScore: number | null;
    avgTimeSeconds: number | null;
    lastActive: string | null;
  };
  assessments: AssessmentSummary[];
  scoreHistory: ScorePoint[];
  subjectAverages: SubjectAverage[];
  topicPerformance: TopicPerformance[];
  strongAreas: SkillArea[];
  weakAreas: SkillArea[];
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toSeconds(avgTimeMs: number | null): number | null {
  if (avgTimeMs == null) return null;
  return round1(avgTimeMs / 1000);
}

function buildSubjectAverages(history: ScorePoint[]): SubjectAverage[] {
  const bySubject = new Map<string, { total: number; count: number }>();
  for (const point of history) {
    const entry = bySubject.get(point.subject) ?? { total: 0, count: 0 };
    entry.total += point.score;
    entry.count += 1;
    bySubject.set(point.subject, entry);
  }
  return Array.from(bySubject.entries()).map(([subject, { total, count }]) => ({
    subject,
    tests: count,
    avgScore: round1(total / count),
  }));
}

export async function getTeacherRoster(): Promise<RosterStudent[]> {
  const rosterResult = await query(
    `SELECT s.id::text AS id, s.display_name, s.current_class_level,
            COUNT(a.id)::int AS total_tests,
            MAX(a.submitted_at) AS last_active,
            AVG(COALESCE(a.overall_readiness_score, a.attempted_readiness_score))::float8 AS avg_score,
            array_agg(DISTINCT a.subject) FILTER (WHERE a.subject IS NOT NULL) AS subjects
     FROM diagnostic_students s
     LEFT JOIN diagnostic_assessments a
       ON a.student_id = s.id AND a.submitted_at IS NOT NULL
     GROUP BY s.id, s.display_name, s.current_class_level
     ORDER BY MAX(a.submitted_at) DESC NULLS LAST, s.display_name ASC
     LIMIT $1`,
    [ROSTER_LIMIT],
  );

  if (rosterResult.rows.length === 0) return [];
  const studentIds = rosterResult.rows.map((row) => row.id);

  const [historyResult, timingResult] = await Promise.all([
    query(
      `SELECT student_id::text AS student_id, id::text AS id, submitted_at, subject, topic,
              COALESCE(overall_readiness_score, attempted_readiness_score, 0)::float8 AS score
       FROM diagnostic_assessments
       WHERE student_id = ANY($1::uuid[]) AND submitted_at IS NOT NULL
       ORDER BY submitted_at ASC`,
      [studentIds],
    ),
    query(
      `SELECT a.student_id::text AS student_id,
              AVG(q.time_taken_ms) FILTER (WHERE q.time_taken_ms > 0)::float8 AS avg_time_ms
       FROM diagnostic_question_results q
       JOIN diagnostic_assessments a ON a.id = q.assessment_id
       WHERE a.student_id = ANY($1::uuid[])
       GROUP BY a.student_id`,
      [studentIds],
    ),
  ]);

  const historyByStudent = new Map<string, ScorePoint[]>();
  for (const row of historyResult.rows) {
    const list = historyByStudent.get(row.student_id) ?? [];
    list.push({
      assessmentId: row.id,
      submittedAt: row.submitted_at.toISOString(),
      score: round1(row.score),
      subject: row.subject,
      topic: row.topic,
    });
    historyByStudent.set(row.student_id, list);
  }

  const avgTimeByStudent = new Map<string, number | null>(
    timingResult.rows.map((row) => [row.student_id, row.avg_time_ms]),
  );

  return rosterResult.rows.map((row) => {
    const history = historyByStudent.get(row.id) ?? [];
    const latest = history[history.length - 1]?.score ?? null;
    const previous = history[history.length - 2]?.score ?? null;
    return {
      id: row.id,
      displayName: row.display_name,
      classLevel: row.current_class_level,
      totalTests: row.total_tests,
      avgScore: row.avg_score == null ? null : round1(row.avg_score),
      latestScore: latest,
      trend:
        latest != null && previous != null ? round1(latest - previous) : null,
      avgTimeSeconds: toSeconds(avgTimeByStudent.get(row.id) ?? null),
      lastActive: row.last_active?.toISOString() ?? null,
      subjects: row.subjects ?? [],
      subjectAverages: buildSubjectAverages(history),
      scoreHistory: history,
    };
  });
}

export async function getStudentPerformanceDetail(
  studentId: string,
): Promise<StudentPerformanceDetail | null> {
  const studentResult = await query(
    `SELECT id::text AS id, display_name, current_class_level
     FROM diagnostic_students WHERE id = $1`,
    [studentId],
  );
  const student = studentResult.rows[0];
  if (!student) return null;

  const [assessmentResult, topicResult] = await Promise.all([
    query(
      `SELECT a.id::text AS id, a.test_mode, a.subject, a.topic, a.submitted_at,
              a.learning_objective_results,
              COALESCE(a.overall_readiness_score, a.attempted_readiness_score, 0)::float8 AS score,
              COUNT(q.id)::int AS question_count,
              AVG(q.time_taken_ms) FILTER (WHERE q.time_taken_ms > 0)::float8 AS avg_time_ms
       FROM diagnostic_assessments a
       LEFT JOIN diagnostic_question_results q ON q.assessment_id = a.id
       WHERE a.student_id = $1 AND a.submitted_at IS NOT NULL
       GROUP BY a.id
       ORDER BY a.submitted_at DESC`,
      [studentId],
    ),
    query(
      `SELECT q.topic,
              MAX(a.subject) AS subject,
              COUNT(*)::int AS questions,
              COUNT(*) FILTER (WHERE q.verdict = 'correct')::int AS correct,
              COUNT(*) FILTER (WHERE q.verdict = 'partial')::int AS partial,
              COUNT(*) FILTER (WHERE q.verdict = 'incorrect')::int AS incorrect,
              COUNT(*) FILTER (WHERE q.verdict = 'non_attempt')::int AS non_attempt,
              AVG(q.time_taken_ms) FILTER (WHERE q.time_taken_ms > 0)::float8 AS avg_time_ms
       FROM diagnostic_question_results q
       JOIN diagnostic_assessments a ON a.id = q.assessment_id
       WHERE a.student_id = $1 AND q.topic IS NOT NULL AND q.topic <> ''
       GROUP BY q.topic
       ORDER BY COUNT(*) DESC`,
      [studentId],
    ),
  ]);

  const assessments: AssessmentSummary[] = assessmentResult.rows.map((row) => ({
    id: row.id,
    testMode: row.test_mode,
    subject: row.subject,
    topic: row.topic,
    score: round1(row.score),
    submittedAt: row.submitted_at.toISOString(),
    questionCount: row.question_count,
    avgTimeSeconds: toSeconds(row.avg_time_ms),
  }));

  const scoreHistory: ScorePoint[] = [...assessments]
    .reverse()
    .map((assessment) => ({
      assessmentId: assessment.id,
      submittedAt: assessment.submittedAt,
      score: assessment.score,
      subject: assessment.subject,
      topic: assessment.topic,
    }));

  // Keep only the latest result per learning objective (oldest → newest so
  // the most recent assessment wins), same approach as lib/profile-agent.ts.
  const latestLoResults = new Map<string, LearningObjectiveResult>();
  for (const row of [...assessmentResult.rows].reverse()) {
    if (!row.learning_objective_results) continue;
    for (const lo of row.learning_objective_results as LearningObjectiveResult[]) {
      latestLoResults.set(lo.learningObjective, lo);
    }
  }

  const strongAreas: SkillArea[] = [];
  const weakAreas: SkillArea[] = [];
  for (const lo of Array.from(latestLoResults.values())) {
    const area: SkillArea = {
      learningObjective: lo.learningObjective,
      score: round1(lo.score),
      masteryState: lo.masteryState,
    };
    if (["mastered", "secure"].includes(lo.masteryState)) {
      strongAreas.push(area);
    } else {
      weakAreas.push(area);
    }
  }
  strongAreas.sort((a, b) => b.score - a.score);
  weakAreas.sort((a, b) => a.score - b.score);

  const topicPerformance: TopicPerformance[] = topicResult.rows.map((row) => {
    const attempted = row.questions - row.non_attempt;
    const accuracy =
      attempted > 0
        ? round1(((row.correct + row.partial * 0.5) / attempted) * 100)
        : 0;
    return {
      topic: row.topic,
      subject: row.subject,
      questions: row.questions,
      correct: row.correct,
      partial: row.partial,
      incorrect: row.incorrect,
      nonAttempt: row.non_attempt,
      accuracy,
      avgTimeSeconds: toSeconds(row.avg_time_ms),
    };
  });

  const timedAssessments = assessments.filter(
    (assessment) => assessment.avgTimeSeconds != null,
  );
  const avgTimeSeconds =
    timedAssessments.length > 0
      ? round1(
          timedAssessments.reduce(
            (sum, assessment) => sum + (assessment.avgTimeSeconds ?? 0),
            0,
          ) / timedAssessments.length,
        )
      : null;

  return {
    student: {
      id: student.id,
      displayName: student.display_name,
      classLevel: student.current_class_level,
      totalTests: assessments.length,
      avgScore:
        assessments.length > 0
          ? round1(
              assessments.reduce((sum, item) => sum + item.score, 0) /
                assessments.length,
            )
          : null,
      avgTimeSeconds,
      lastActive: assessments[0]?.submittedAt ?? null,
    },
    assessments,
    scoreHistory,
    subjectAverages: buildSubjectAverages(scoreHistory),
    topicPerformance,
    strongAreas,
    weakAreas,
  };
}
