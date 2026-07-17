import pool from "@/lib/db";

export interface SyllabusSubject {
  id: string;
  code: string;
  name: string;
  grades: string[];
  topicCount: number;
}

export interface SyllabusTopicSummary {
  id: string;
  subjectId: string;
  name: string;
  grade: string;
  classLevel: string | null;
  family: string | null;
  status: string;
  subtopicCount: number;
  objectiveCount: number;
  questionCount: number;
  activeQuestionCount: number;
}

export interface SyllabusOverview {
  subjects: SyllabusSubject[];
  topics: SyllabusTopicSummary[];
}

export interface LearningObjectiveDetail {
  id: string;
  subtopicId: string | null;
  code: string;
  name: string;
  description: string;
  questionCount: number;
  activeQuestionCount: number;
}

export interface SubtopicDetail {
  id: string;
  code: string;
  name: string;
  objectives: LearningObjectiveDetail[];
}

export interface TopicDetail {
  id: string;
  name: string;
  grade: string;
  subjectName: string;
  status: string;
  subtopics: SubtopicDetail[];
  ungroupedObjectives: LearningObjectiveDetail[];
}

export interface QuestionVersionPreview {
  id: string;
  versionId: string;
  versionNumber: number;
  prompt: string;
  type: string;
  difficulty: string;
  bloomLevel: string | null;
  isVisual: boolean;
  lifecycleStatus: string;
  usageType: string;
  gradeLevel: string | null;
  externalId: string | null;
  keywords: string[];
  difficultyRating: number | null;
  options: unknown;
  correctAnswer: string | null;
  modelAnswer: string | null;
  explanation: string | null;
  payload: unknown;
  timeAllocatedMs: number | null;
  createdAt: string;
}

export interface QuestionPage {
  items: QuestionVersionPreview[];
  total: number;
  page: number;
  pageSize: number;
}

interface SubjectRow {
  id: string;
  code: string;
  name: string;
  grades: string[] | null;
  topic_count: number;
}

interface TopicRow {
  id: string;
  subject_id: string;
  name: string;
  grade: string;
  class_level: string | null;
  topic_family: string | null;
  status: string;
  subtopic_count: number;
  objective_count: number;
  question_count: number;
  active_question_count: number;
}

export async function getSyllabusOverview(): Promise<SyllabusOverview> {
  const [subjectResult, topicResult] = await Promise.all([
    pool.query<SubjectRow>(
      `SELECT s.id::text, s.code, initcap(s.name) AS name,
              array_agg(DISTINCT t.grade ORDER BY t.grade)
                FILTER (WHERE t.grade IS NOT NULL) AS grades,
              COUNT(DISTINCT t.id)::int AS topic_count
       FROM subjects s
       LEFT JOIN topics t ON t.subject_id = s.id
       GROUP BY s.id, s.code, s.name
       ORDER BY s.name`,
    ),
    pool.query<TopicRow>(
      `WITH subtopic_counts AS (
         SELECT topic_id, COUNT(*)::int AS count
         FROM subtopics GROUP BY topic_id
       ), objective_counts AS (
         SELECT topic_id, COUNT(*)::int AS count
         FROM learning_objectives GROUP BY topic_id
       ), question_counts AS (
         SELECT topic_id,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE lifecycle_status::text = 'active')::int AS active
         FROM questions GROUP BY topic_id
       )
       SELECT t.id::text, t.subject_id::text, t.name, t.grade, t.class_level,
              t.topic_family, t.status::text,
              COALESCE(st.count, 0)::int AS subtopic_count,
              COALESCE(lo.count, 0)::int AS objective_count,
              COALESCE(q.total, 0)::int AS question_count,
              COALESCE(q.active, 0)::int AS active_question_count
       FROM topics t
       LEFT JOIN subtopic_counts st ON st.topic_id = t.id
       LEFT JOIN objective_counts lo ON lo.topic_id = t.id
       LEFT JOIN question_counts q ON q.topic_id = t.id
       ORDER BY t.subject_id, t.grade, t.name`,
    ),
  ]);

  return {
    subjects: subjectResult.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      grades: row.grades ?? [],
      topicCount: row.topic_count,
    })),
    topics: topicResult.rows.map((row) => ({
      id: row.id,
      subjectId: row.subject_id,
      name: row.name,
      grade: row.grade,
      classLevel: row.class_level,
      family: row.topic_family,
      status: row.status,
      subtopicCount: row.subtopic_count,
      objectiveCount: row.objective_count,
      questionCount: row.question_count,
      activeQuestionCount: row.active_question_count,
    })),
  };
}

interface TopicDetailRow {
  id: string;
  name: string;
  grade: string;
  subject_name: string;
  status: string;
}

interface SubtopicRow {
  id: string;
  code: string;
  name: string;
}

interface ObjectiveRow {
  id: string;
  subtopic_id: string | null;
  code: string;
  name: string;
  description: string;
  question_count: number;
  active_question_count: number;
}

export async function getTopicDetail(
  topicId: string,
): Promise<TopicDetail | null> {
  const topicResult = await pool.query<TopicDetailRow>(
    `SELECT t.id::text, t.name, t.grade, initcap(s.name) AS subject_name, t.status::text
     FROM topics t JOIN subjects s ON s.id = t.subject_id
     WHERE t.id = $1`,
    [topicId],
  );

  const topic = topicResult.rows[0];
  if (!topic) return null;

  const [subtopicResult, objectiveResult] = await Promise.all([
    pool.query<SubtopicRow>(
      `SELECT id::text, code, name FROM subtopics WHERE topic_id = $1 ORDER BY name`,
      [topicId],
    ),
    pool.query<ObjectiveRow>(
      `SELECT lo.id::text, lo.subtopic_id::text, lo.code,
              COALESCE(NULLIF(lo.display_name, ''), lo.description, lo.code) AS name,
              COALESCE(lo.description, '') AS description,
              COUNT(q.id)::int AS question_count,
              COUNT(q.id) FILTER (WHERE q.lifecycle_status::text = 'active')::int
                AS active_question_count
       FROM learning_objectives lo
       LEFT JOIN questions q ON q.learning_objective_id = lo.id
       WHERE lo.topic_id = $1
       GROUP BY lo.id, lo.subtopic_id, lo.code, lo.display_name, lo.description
       ORDER BY lo.code, lo.id`,
      [topicId],
    ),
  ]);

  const objectives = objectiveResult.rows.map((row) => ({
    id: row.id,
    subtopicId: row.subtopic_id,
    code: row.code,
    name: row.name,
    description: row.description,
    questionCount: row.question_count,
    activeQuestionCount: row.active_question_count,
  }));

  return {
    id: topic.id,
    name: topic.name,
    grade: topic.grade,
    subjectName: topic.subject_name,
    status: topic.status,
    subtopics: subtopicResult.rows.map((subtopic) => ({
      id: subtopic.id,
      code: subtopic.code,
      name: subtopic.name,
      objectives: objectives.filter(
        (objective) => objective.subtopicId === subtopic.id,
      ),
    })),
    ungroupedObjectives: objectives.filter(
      (objective) => objective.subtopicId === null,
    ),
  };
}

interface QuestionRow {
  id: string;
  version_id: string;
  version_number: number;
  prompt: string;
  type: string;
  difficulty: string;
  bloom_level: string | null;
  is_visual: boolean;
  lifecycle_status: string;
  usage_type: string;
  grade_level: string | null;
  external_id: string | null;
  keywords: string[] | null;
  difficulty_rating: number | null;
  options: unknown;
  correct_answer: string | null;
  model_answer: string | null;
  explanation: string | null;
  payload: unknown;
  time_allocated_ms: number | null;
  created_at: Date;
}

export async function getObjectiveQuestions(
  objectiveId: string,
  page: number,
  pageSize = 5,
): Promise<QuestionPage> {
  const offset = (page - 1) * pageSize;
  const [itemsResult, countResult] = await Promise.all([
    pool.query<QuestionRow>(
      `SELECT q.id::text, qv.id::text AS version_id, qv.version_number, qv.prompt,
              q.question_type::text AS type, q.difficulty_band::text AS difficulty,
              q.bloom_level::text, q.is_visual, q.lifecycle_status::text,
              q.usage_type::text, q.grade_level, q.external_id, q.keywords,
              q.difficulty_rating::float8, qv.options, qv.correct_answer,
              qv.model_answer, qv.explanation, qv.payload, qv.time_allocated_ms,
              qv.created_at
       FROM questions q
       JOIN question_versions qv ON qv.id = q.current_version_id
       WHERE q.learning_objective_id = $1 AND q.lifecycle_status::text = 'active'
       ORDER BY q.id
       LIMIT $2 OFFSET $3`,
      [objectiveId, pageSize, offset],
    ),
    pool.query<{ count: number }>(
      `SELECT COUNT(*)::int AS count FROM questions
       WHERE learning_objective_id = $1 AND lifecycle_status::text = 'active'`,
      [objectiveId],
    ),
  ]);

  return {
    items: itemsResult.rows.map((row) => ({
      id: row.id,
      versionId: row.version_id,
      versionNumber: row.version_number,
      prompt: row.prompt,
      type: row.type,
      difficulty: row.difficulty,
      bloomLevel: row.bloom_level,
      isVisual: row.is_visual,
      lifecycleStatus: row.lifecycle_status,
      usageType: row.usage_type,
      gradeLevel: row.grade_level,
      externalId: row.external_id,
      keywords: row.keywords ?? [],
      difficultyRating: row.difficulty_rating,
      options: row.options,
      correctAnswer: row.correct_answer,
      modelAnswer: row.model_answer,
      explanation: row.explanation,
      payload: row.payload,
      timeAllocatedMs: row.time_allocated_ms,
      createdAt: row.created_at.toISOString(),
    })),
    total: countResult.rows[0]?.count ?? 0,
    page,
    pageSize,
  };
}
