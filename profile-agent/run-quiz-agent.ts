import OpenAI from "openai"

import type {
  AgentFinalResponse,
  LearningObjectivePerformance,
  LearningObjectiveStatus,
  LearningStatus,
  QuizAnswer,
  QuizQuestion,
} from "@/profile-agent/types"
import {
  extractConfidence,
  extractSectionBullets,
  extractSummary,
  readExistingProfile,
  writeProfile,
} from "@/profile-agent/profile-tools"

type RunQuizAgentInput = {
  studentId: string
  answers: QuizAnswer[]
  questions: QuizQuestion[]
  previousConfidence?: number | null
}

type QuizResultRow = {
  questionId: string
  topic: string
  subtopic: string
  skill: string
  selectedAnswer: string
  correctAnswer: string
  isCorrect: boolean
}

type QuizPayload = {
  scorePercent: number
  correctCount: number
  totalQuestions: number
  results: QuizResultRow[]
}

const PROFILE_PROMPT = `You are an AI student profiling system that maintains a structured, evolving student profile.

You will receive:
1) Existing profile
2) New quiz results
3) Deterministic learning objective performance analysis

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
- <point 4>`

function resolveLearningStatus(confidence: number): LearningStatus {
  if (confidence <= 3) return "weak"
  if (confidence <= 6) return "developing"
  if (confidence <= 8) return "exploring"
  return "progressing"
}

function resolveObjectiveStatus(scorePercent: number): LearningObjectiveStatus {
  if (scorePercent >= 80) return "strong"
  if (scorePercent >= 50) return "developing"
  return "needs_practice"
}

function buildQuizPayload(questions: QuizQuestion[], answers: QuizAnswer[]): QuizPayload {
  const answerMap = new Map(
    answers.map((answer) => [answer.questionId, answer.selectedAnswer])
  )

  const rows = questions.map((question) => {
    const selectedAnswer = answerMap.get(question.id) ?? ""
    const isCorrect = selectedAnswer === question.correctAnswer
    return {
      questionId: question.id,
      topic: question.topic,
      subtopic: question.subtopic,
      skill: question.learningObjective,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
    }
  })

  const totalQuestions = rows.length
  const correctCount = rows.filter((row) => row.isCorrect).length
  const scorePercent =
    totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 100)

  return {
    scorePercent,
    correctCount,
    totalQuestions,
    results: rows,
  }
}

function buildLearningObjectivePerformance(
  quizPayload: QuizPayload
): LearningObjectivePerformance[] {
  const grouped = new Map<
    string,
    { totalQuestions: number; correctAnswers: number }
  >()

  for (const row of quizPayload.results) {
    const current = grouped.get(row.skill) ?? {
      totalQuestions: 0,
      correctAnswers: 0,
    }
    current.totalQuestions += 1
    if (row.isCorrect) {
      current.correctAnswers += 1
    }
    grouped.set(row.skill, current)
  }

  return Array.from(grouped.entries())
    .map(([learningObjective, stats]) => {
      const incorrectAnswers = stats.totalQuestions - stats.correctAnswers
      const scorePercent =
        stats.totalQuestions === 0
          ? 0
          : Math.round((stats.correctAnswers / stats.totalQuestions) * 100)

      return {
        learningObjective,
        totalQuestions: stats.totalQuestions,
        correctAnswers: stats.correctAnswers,
        incorrectAnswers,
        scorePercent,
        status: resolveObjectiveStatus(scorePercent),
      }
    })
    .sort((left, right) => {
      if (left.scorePercent !== right.scorePercent) {
        return right.scorePercent - left.scorePercent
      }
      return left.learningObjective.localeCompare(right.learningObjective)
    })
}

function buildDeterministicSummary(args: {
  scorePercent: number
  strongLearningObjectives: string[]
  practiceLearningObjectives: string[]
  learningObjectivePerformance: LearningObjectivePerformance[]
}) {
  const { scorePercent, strongLearningObjectives, practiceLearningObjectives } =
    args

  const parts = [`The student scored ${scorePercent}% overall.`]

  if (strongLearningObjectives.length > 0) {
    parts.push(`Strongest learning objectives: ${strongLearningObjectives.join(", ")}.`)
  }

  if (practiceLearningObjectives.length > 0) {
    parts.push(
      `Needs more practice in: ${practiceLearningObjectives.join(", ")}.`
    )
  }

  if (
    strongLearningObjectives.length === 0 &&
    practiceLearningObjectives.length === 0 &&
    args.learningObjectivePerformance.length > 0
  ) {
    parts.push("Performance was mixed across the selected learning objectives.")
  }

  return parts.join(" ")
}

async function buildProfileMarkdown(args: {
  existingProfile: string
  quizPayload: QuizPayload
  learningObjectivePerformance: LearningObjectivePerformance[]
  subjects: string[]
  topics: string[]
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return ""
  }

  const client = new OpenAI({ apiKey })
  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
    input: `${PROFILE_PROMPT}

Existing profile:
${args.existingProfile || "(empty)"}

Quiz results:
${JSON.stringify(args.quizPayload, null, 2)}

Learning objective performance:
${JSON.stringify(args.learningObjectivePerformance, null, 2)}

Subjects:
${JSON.stringify(args.subjects)}

Topics:
${JSON.stringify(args.topics)}`,
  })

  return response.output_text?.trim() ?? ""
}

export async function runQuizAgent(
  input: RunQuizAgentInput
): Promise<AgentFinalResponse> {
  const latestQuiz = buildQuizPayload(input.questions, input.answers)
  const learningObjectivePerformance =
    buildLearningObjectivePerformance(latestQuiz)
  const existingProfile = await readExistingProfile(input.studentId)
  const subjects = Array.from(new Set(input.questions.map((question) => question.subject)))
  const topics = Array.from(new Set(input.questions.map((question) => question.topic)))

  const strongLearningObjectives = learningObjectivePerformance
    .filter((item) => item.status === "strong")
    .map((item) => item.learningObjective)
    .slice(0, 5)

  const practiceLearningObjectives = learningObjectivePerformance
    .filter((item) => item.status === "needs_practice")
    .map((item) => item.learningObjective)
    .slice(0, 5)

  const deterministicSummary = buildDeterministicSummary({
    scorePercent: latestQuiz.scorePercent,
    strongLearningObjectives,
    practiceLearningObjectives,
    learningObjectivePerformance,
  })

  let markdown = ""
  try {
    markdown = await buildProfileMarkdown({
      existingProfile,
      quizPayload: latestQuiz,
      learningObjectivePerformance,
      subjects,
      topics,
    })
  } catch {
    markdown = ""
  }

  if (markdown) {
    await writeProfile(input.studentId, markdown)
  }

  const extractedConfidence = markdown ? extractConfidence(markdown) : 0
  const confidence =
    extractedConfidence ||
    Math.max(1, Math.min(10, Math.round(latestQuiz.scorePercent / 10)))

  const strengths = markdown
    ? extractSectionBullets(markdown, "Strengths").slice(0, 5)
    : strongLearningObjectives
  const weakAreas = markdown
    ? [
        ...extractSectionBullets(markdown, "Weak Areas"),
        ...extractSectionBullets(markdown, "Weaknesses"),
      ].slice(0, 5)
    : practiceLearningObjectives

  return {
    score: latestQuiz.scorePercent,
    confidence,
    strengths,
    weaknesses: weakAreas,
    learning_status: resolveLearningStatus(confidence),
    summary: markdown ? extractSummary(markdown) || deterministicSummary : deterministicSummary,
    learningObjectivePerformance,
    strongLearningObjectives,
    practiceLearningObjectives,
  }
}
