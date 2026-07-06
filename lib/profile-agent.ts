import { query } from "@/lib/db";
import type { DiagnosticReport, LearningObjectiveResult } from "@/agents/diagnostic/types";
import OpenAI from "openai";

export function extractConfidence(markdown: string): number {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const confidencePatterns = [
    /\*\*Confidence:\*\*\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Overall Confidence:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
    /Confidence Level:\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of confidencePatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        return Math.max(0, Math.min(10, Math.round(value)));
      }
    }
  }

  return 0;
}

export function extractSectionBullets(markdown: string, heading: string): string[] {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionRegex = new RegExp(
    `(?:^|\\n)#{1,6}\\s*${escapedHeading}[^\\n]*\\n([\\s\\S]*?)(?=\\n#{1,6}\\s|$)`,
    "i"
  );
  const match = normalized.match(sectionRegex);

  if (!match) {
    return [];
  }

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

export function extractSummary(markdown: string): string {
  const headingFirst = extractSectionBullets(markdown, "Summary");
  if (headingFirst.length > 0) {
    return headingFirst.join(" ");
  }

  const lineMatch = markdown.match(/summary\s*:\s*(.+)$/im);
  return lineMatch?.[1]?.trim() ?? "";
}

const PROFILE_PROMPT = `You are an AI student profiling system that maintains a structured, evolving student profile.

You will receive:
1) Existing profile (if any)
2) Recent assessment history

Your job:
- Update the existing profile with recency-aware evidence
- Keep it clean, consistent, and non-redundant
- Make strengths and weaknesses align with the supplied learning objective analysis
- Mention concrete learning objectives or topic patterns instead of vague statements

CRITICAL OUTPUT RULES:
- Output ONLY the final profile markdown.
- Do NOT output any instructional phrases or placeholders.
- Do NOT include empty bullets like "-" or "- ".
- If a list has no valid item, write exactly: "- None yet."

Return EXACTLY this structure:

# Student Profile

## Academic Snapshot
- Subjects
  - <Subject name>
- Current Level by Subject
  - <Subject> - <beginner|intermediate|advanced>
- Strengths
  - <specific recurring strength or strong learning objective>
- Weaknesses
  - <specific recurring weakness or weak learning objective>
- Overall Confidence: <0-10>/10

## Progress Memory
- Topics Tried
  - <topic>
- Strong Areas
  - <topic or learning objective>
- Weak Areas
  - <topic or learning objective>
- Current Problems
  - <skill> - <short concrete reason>
- Common Mistake Patterns
  - <recurring mistake pattern>
- Confidence by Topic
  - <topic>: <0-10>/10

## Summary
- <point 1>
- <point 2>
- <point 3>
- <point 4>`;

async function generateDynamicProfile(studentName: string, history: any[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "";

  const client = new OpenAI({ apiKey });
  
  try {
    const existingProfileRes = await query(`SELECT profile_markdown FROM diagnostic_ai_profiles WHERE normalized_name = $1`, [studentName]);
    const existingProfile = existingProfileRes.rows[0]?.profile_markdown || "";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: PROFILE_PROMPT
        },
        {
          role: "user",
          content: `Existing profile:\n${existingProfile || "(empty)"}\n\nRecent assessment history:\n${JSON.stringify(history.slice(0, 5).map((h: any) => ({
            subject: h.subject,
            topic: h.topic,
            score: h.score,
            learningObjectives: h.learningObjectives?.map((lo: any) => ({
              objective: lo.learningObjective,
              score: lo.score,
              masteryState: lo.masteryState
            }))
          })), null, 2)}`
        }
      ],
      temperature: 0.2
    });
    return response.choices[0]?.message?.content?.trim() || "";
  } catch (error) {
    console.error("OpenAI Generation Error:", error);
    return "";
  }
}

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
    // Attempt to load the real profile from PostgreSQL
    const res = await query(`SELECT profile_markdown, updated_at FROM diagnostic_ai_profiles WHERE student_id = $1`, [student.id]);
    let markdown = res.rows[0]?.profile_markdown || "";
    const profileUpdatedAt = res.rows[0]?.updated_at ? new Date(res.rows[0].updated_at).getTime() : 0;
    
    // Check if the student has taken a new test since the profile was last generated
    const latestTestTime = history.length > 0 ? new Date(history[0].submittedAt).getTime() : 0;
    const isOutdated = latestTestTime > profileUpdatedAt;

    // If it's empty OR outdated, generate it!
    if (!markdown || markdown.trim() === "" || isOutdated) {
      console.log(`Generating (or updating) AI Profile for ${student.normalized_name}...`);
      markdown = await generateDynamicProfile(student.normalized_name, history);
      if (markdown) {
        await query(
          `INSERT INTO diagnostic_ai_profiles (student_id, profile_markdown) 
           VALUES ($1, $2)
           ON CONFLICT (student_id) DO UPDATE SET profile_markdown = $2, updated_at = CURRENT_TIMESTAMP`,
          [student.id, markdown]
        );
      }
    }

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
