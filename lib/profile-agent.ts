import { query } from "@/lib/db";
import type { DiagnosticReport, LearningObjectiveResult } from "@/agents/diagnostic/types";
import { readExistingProfile, extractConfidence, extractSectionBullets, extractSummary } from "@/profile-agent/profile-tools";

export interface StudentSummary {
  id: string;
  displayName: string;
  normalizedName: string;
  currentClassLevel: string;
  lastActive: string;
  totalAssessments: number;
}

export interface ProfileActionPlan {
  teacherFocus: string[];
  parentSupport: string[];
  studentNextSteps: string[];
}

export interface ProfileArea {
  learningObjective: string;
  score: number;
  masteryState: "mastered" | "secure" | "emerging" | "needs_teaching";
  recentIssues: string[];
}

export interface StudentProfile {
  student: StudentSummary;
  strongAreas: ProfileArea[];
  weakAreas: ProfileArea[];
  actionPlan: ProfileActionPlan;
  assessmentHistory: {
    id: string;
    testMode: string;
    subject: string;
    topic: string | null;
    score: number;
    submittedAt: string;
    learningObjectives: {
      learningObjective: string;
      score: number;
      masteryState: string;
    }[];
  }[];
  aiSummary: string;
  aiStrengths: string[];
  aiWeaknesses: string[];
  aiConfidence: number;
}

export async function getStudentList(): Promise<StudentSummary[]> {
  const result = await query(`
    SELECT 
      s.id, 
      s.display_name, 
      s.normalized_name, 
      s.current_class_level,
      MAX(a.submitted_at) as last_active,
      COUNT(a.id) as total_assessments
    FROM diagnostic_students s
    LEFT JOIN diagnostic_assessments a ON a.student_id = s.id
    GROUP BY s.id
    ORDER BY last_active DESC NULLS LAST
  `);

  return result.rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    normalizedName: row.normalized_name,
    currentClassLevel: row.current_class_level,
    lastActive: row.last_active?.toISOString() ?? "",
    totalAssessments: Number(row.total_assessments),
  }));
}

export async function getStudentProfile(studentId: string): Promise<StudentProfile | null> {
  const studentRes = await query(`
    SELECT id, display_name, normalized_name, current_class_level
    FROM diagnostic_students
    WHERE id = $1
  `, [studentId]);

  if (studentRes.rowCount === 0) return null;
  const student = studentRes.rows[0];

  const assessmentsRes = await query(`
    SELECT 
      id, test_mode, subject, topic, overall_readiness_score, attempted_readiness_score,
      submitted_at, learning_objective_results
    FROM diagnostic_assessments
    WHERE student_id = $1
    ORDER BY submitted_at DESC
  `, [studentId]);

  const history = assessmentsRes.rows.slice(0, 50).map((r) => ({
    id: r.id,
    testMode: r.test_mode,
    subject: r.subject,
    topic: r.topic,
    score: r.overall_readiness_score ?? r.attempted_readiness_score ?? 0,
    submittedAt: r.submitted_at.toISOString(),
    learningObjectives: (r.learning_objective_results || []) as LearningObjectiveResult[],
  }));

  // Aggregate LO results
  const latestLoResults = new Map<string, LearningObjectiveResult>();

  // Process from oldest to newest so newest overwrites
  const reversedAssessments = [...assessmentsRes.rows].reverse();
  for (const row of reversedAssessments) {
    if (!row.learning_objective_results) continue;
    const los = row.learning_objective_results as LearningObjectiveResult[];
    for (const lo of los) {
      latestLoResults.set(lo.learningObjective, lo);
    }
  }

  const strongAreas: ProfileArea[] = [];
  const weakAreas: ProfileArea[] = [];
  const teacherFocus = new Set<string>();
  const parentSupport = new Set<string>();
  const studentSteps = new Set<string>();

  for (const lo of Array.from(latestLoResults.values())) {
    const area: ProfileArea = {
      learningObjective: lo.learningObjective,
      score: lo.score,
      masteryState: lo.masteryState as any,
      recentIssues: lo.likelyIssues ?? [],
    };

    if (["mastered", "secure"].includes(lo.masteryState)) {
      strongAreas.push(area);
      parentSupport.add(`Celebrate mastery in: ${lo.learningObjective}`);
    } else {
      weakAreas.push(area);
      if (lo.teacherFocus) lo.teacherFocus.forEach(t => teacherFocus.add(t));
      if (lo.nextSteps) lo.nextSteps.forEach(n => studentSteps.add(n));
      parentSupport.add(`Encourage review of: ${lo.learningObjective}`);
    }
  }

  // Sort areas by score
  strongAreas.sort((a, b) => b.score - a.score);
  weakAreas.sort((a, b) => a.score - b.score);

  // Read AI Profile from file
  let aiSummary = "";
  let aiStrengths: string[] = [];
  let aiWeaknesses: string[] = [];
  let aiConfidence = 0;

  try {
    // We hardcode student-001 to load the specific prototype AI profile 
    const markdown = await readExistingProfile("student-001");
    if (markdown) {
      aiSummary = extractSummary(markdown);
      aiConfidence = extractConfidence(markdown);
      
      const strongTopics = extractSectionBullets(markdown, "Strong Areas");
      const strengthsList = extractSectionBullets(markdown, "Strengths");
      aiStrengths = [...strengthsList, ...strongTopics].slice(0, 5);

      const weakTopics = extractSectionBullets(markdown, "Weak Areas");
      const weaknessesList = extractSectionBullets(markdown, "Weaknesses");
      const currentProblems = extractSectionBullets(markdown, "Current Problems");
      aiWeaknesses = [...weaknessesList, ...weakTopics, ...currentProblems].slice(0, 5);
    }
  } catch (error) {
    console.error("Failed to load AI profile:", error);
  }

  return {
    student: {
      id: student.id,
      displayName: student.display_name,
      normalizedName: student.normalized_name,
      currentClassLevel: student.current_class_level,
      lastActive: history[0]?.submittedAt ?? "",
      totalAssessments: history.length,
    },
    strongAreas,
    weakAreas,
    actionPlan: {
      teacherFocus: Array.from(teacherFocus).slice(0, 5),
      parentSupport: Array.from(parentSupport).slice(0, 5),
      studentNextSteps: Array.from(studentSteps).slice(0, 5),
    },
    assessmentHistory: history,
    aiSummary,
    aiStrengths,
    aiWeaknesses,
    aiConfidence
  };
}
