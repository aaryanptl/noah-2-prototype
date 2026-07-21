import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "pg";
import {
  DEMO_STUDENT_PROFILES,
  type DemoStudentProfile,
  type DemoTopicSignal,
} from "../lib/demo-students";

// Manually parse .env.local because dotenv may not be globally available in all environments
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      process.env[key] = value;
    });
  }
}

loadEnvLocal();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  ssl: {
    rejectUnauthorized: false, // Required for RDS
  },
});

// The learning-plan builder reads these same profiles at runtime; seeding them
// into diagnostic_students is what lets a generated plan satisfy the
// learning_plans.student_id foreign key. lib/demo-students.ts is the single
// source of truth for ids, names and evidence.
const DEMO_STUDENTS = DEMO_STUDENT_PROFILES.map((profile) => ({
  id: profile.id,
  name: profile.displayName,
  classLevel: profile.classLevel,
}));

interface DemoObjective {
  learningObjective: string;
  masteryState:
    | "not_started"
    | "emerging"
    | "developing"
    | "secure"
    | "advanced";
  score: number;
  teacherFocus: string[];
  nextSteps: string[];
}

interface DemoAssessment {
  subject: string;
  topic: string;
  daysAgo: number;
  score: number;
  objectives: DemoObjective[];
  /** question results: [verdict, timeSeconds][] */
  questions: [string, number][];
}

function loResult(objective: DemoObjective) {
  const status =
    objective.masteryState === "secure" || objective.masteryState === "advanced"
      ? "mastered"
      : objective.masteryState === "developing"
        ? "needs_practice"
        : "needs_teaching";
  return {
    learningObjective: objective.learningObjective,
    status,
    masteryState: objective.masteryState,
    highestBloomReached: "understand",
    questionsAsked: 4,
    attemptedCount: 4,
    nonAttemptCount: 0,
    correctCount: Math.round((objective.score / 100) * 4),
    partialCount: 0,
    incorrectCount: 4 - Math.round((objective.score / 100) * 4),
    score: objective.score,
    overallScore: objective.score,
    bloomStatuses: [],
    diagnosticSummary: `Evidence gathered across 4 questions on "${objective.learningObjective}".`,
    likelyIssues: [],
    teacherFocus: objective.teacherFocus,
    evidenceExamples: [],
    distractorPatterns: [],
    nextSteps: objective.nextSteps,
    reliabilityCheck: { level: "medium", reasons: [] },
  };
}

/**
 * Turns a profile's evidence into one diagnostic per topic, so the teacher
 * dashboard and diagnostic history line up with what the plan builder shows.
 */
function assessmentsFor(profile: DemoStudentProfile): DemoAssessment[] {
  const byTopic = new Map<string, DemoTopicSignal[]>();
  for (const signal of [...profile.weakAreas, ...profile.strongAreas]) {
    const list = byTopic.get(signal.topic) ?? [];
    list.push(signal);
    byTopic.set(signal.topic, list);
  }

  return Array.from(byTopic.entries()).map(([topic, signals], index) => {
    const objectives: DemoObjective[] = signals.map((signal) => ({
      learningObjective: signal.learningObjective,
      masteryState: signal.masteryState,
      score: signal.score,
      teacherFocus: signal.score < 70 ? [signal.note] : [],
      nextSteps:
        signal.score < 70
          ? [`Re-teach "${signal.learningObjective}", then practise it.`]
          : [],
    }));

    const score = Math.round(
      signals.reduce((sum, signal) => sum + signal.score, 0) / signals.length,
    );
    // Two questions per objective, with verdicts weighted by its score.
    const questions: [string, number][] = objectives.flatMap(
      (objective, position) => {
        const verdicts: [string, number][] = [
          [
            objective.score >= 70
              ? "correct"
              : objective.score >= 45
                ? "partial"
                : "incorrect",
            40 + position * 3,
          ],
          [objective.score >= 55 ? "correct" : "incorrect", 47 + position * 3],
        ];
        return verdicts;
      },
    );

    return {
      subject: profile.subject,
      topic,
      // Spread the diagnostics backwards from the profile's last-active day.
      daysAgo: profile.lastActiveDaysAgo + index * 6,
      score,
      objectives,
      questions,
    };
  });
}

const DEMO_ASSESSMENTS: Record<string, DemoAssessment[]> = Object.fromEntries(
  DEMO_STUDENT_PROFILES.map((profile) => [profile.id, assessmentsFor(profile)]),
);

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studentIds = DEMO_STUDENTS.map((student) => student.id);

    // Clear previous demo data (learning plans first — they reference students).
    console.log("Removing any existing demo data...");
    await client.query(
      `DELETE FROM learning_plans WHERE student_id = ANY($1::uuid[])`,
      [studentIds],
    );
    await client.query(
      `DELETE FROM diagnostic_question_results
       WHERE assessment_id IN (
         SELECT id FROM diagnostic_assessments WHERE student_id = ANY($1::uuid[])
       )`,
      [studentIds],
    );
    await client.query(
      `DELETE FROM diagnostic_assessments WHERE student_id = ANY($1::uuid[])`,
      [studentIds],
    );
    await client.query(
      `DELETE FROM diagnostic_students WHERE id = ANY($1::uuid[])`,
      [studentIds],
    );

    for (const student of DEMO_STUDENTS) {
      console.log(`Seeding ${student.name}...`);
      await client.query(
        `INSERT INTO diagnostic_students (id, display_name, normalized_name, current_class_level)
         VALUES ($1, $2, $3, $4)`,
        [
          student.id,
          student.name,
          student.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim(),
          student.classLevel,
        ],
      );

      for (const assessment of DEMO_ASSESSMENTS[student.id]) {
        const loResults = assessment.objectives.map(loResult);
        const assessmentRes = await client.query(
          `INSERT INTO diagnostic_assessments
             (student_id, student_display_name, test_mode, subject, class_level,
              topic, readiness_score, attempted_readiness_score, overall_readiness_score,
              non_attempt_count, max_questions, total_questions_shown, question_bank_size,
              stopped_because, learning_objective_results, report_json, ai_summary,
              started_at, submitted_at, region)
           VALUES ($1, $2, 'topic', $3, $4, $5, $6, $6, $6,
                   $7, 20, $8, 120, 'question_limit', $9::jsonb, '{}'::jsonb, $10,
                   now() - ($11 || ' days')::interval - interval '25 minutes',
                   now() - ($11 || ' days')::interval, 'IN')
           RETURNING id`,
          [
            student.id,
            student.name,
            assessment.subject,
            student.classLevel,
            assessment.topic,
            assessment.score,
            assessment.questions.filter(
              ([verdict]) => verdict === "non_attempt",
            ).length,
            assessment.questions.length,
            JSON.stringify(loResults),
            `Demo diagnostic for ${student.name} on ${assessment.topic}.`,
            String(assessment.daysAgo),
          ],
        );
        const assessmentId = assessmentRes.rows[0].id;

        let order = 1;
        for (const [verdict, seconds] of assessment.questions) {
          const objective =
            assessment.objectives[(order - 1) % assessment.objectives.length];
          await client.query(
            `INSERT INTO diagnostic_question_results
               (assessment_id, question_id, question_order, question_text, question_type,
                topic, subtopic, learning_objective, bloom_level, difficulty_level,
                student_answer, verdict, feedback, time_taken_ms, allocated_time_ms,
                was_auto_skipped, question_snapshot)
             VALUES ($1, $2, $3, $4, 'mcq', $5, NULL, $6, 'understand', 'medium',
                     $7, $8, $9, $10, 90000, $11, '{}'::jsonb)`,
            [
              assessmentId,
              `demo-${assessmentId}-${order}`,
              order,
              `Demo question ${order} on ${assessment.topic}`,
              assessment.topic,
              objective.learningObjective,
              verdict === "non_attempt" ? "" : "Demo answer",
              verdict,
              verdict === "correct"
                ? "Correct — demo feedback."
                : "Demo feedback for review.",
              verdict === "non_attempt" ? null : seconds * 1000,
              verdict === "non_attempt",
            ],
          );
          order += 1;
        }
      }
    }

    await client.query("COMMIT");
    console.log("\n✅ Demo students seeded successfully!");

    const check = await pool.query(
      `SELECT s.display_name, COUNT(a.id)::int AS assessments
       FROM diagnostic_students s
       LEFT JOIN diagnostic_assessments a ON a.student_id = s.id
       WHERE s.id = ANY($1::uuid[])
       GROUP BY s.display_name ORDER BY s.display_name`,
      [DEMO_STUDENTS.map((student) => student.id)],
    );
    for (const row of check.rows) {
      console.log(`- ${row.display_name}: ${row.assessments} assessments`);
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error seeding demo students:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
